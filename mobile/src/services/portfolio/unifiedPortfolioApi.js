import { API_URL } from "../../config/apiConfig";
import { getStoredAccessToken } from "../../features/auth/storage/authStorage";
import { userGetItem, userSetItem } from "../auth/userStorage";
import { loadCanonicalNseQuotes, overlayCanonicalNseQuotes } from "../markets/canonicalNseQuoteService";
import { calculatePortfolioSummary } from "../../shared/portfolio/engine";

const REAL_PORTFOLIO_CACHE_KEY = "lastVerifiedRealPortfolio";

function realPortfolioCacheKey(options = {}) {
  const broker = String(options?.broker || "ALL")
    .trim()
    .toUpperCase();
  return `${REAL_PORTFOLIO_CACHE_KEY}:${broker || "ALL"}`;
}


export function aggregateUnifiedHoldingsBySymbol(holdings = []) {
  const groups = new Map();

  for (const holding of Array.isArray(holdings) ? holdings : []) {
    const symbol = String(holding?.symbol || "")
      .trim()
      .toUpperCase();

    const quantity = Number(
      holding?.quantity ??
      holding?.shares ??
      0
    );

    if (!symbol || !(quantity > 0)) continue;

    if (!groups.has(symbol)) {
      groups.set(symbol, []);
    }

    groups.get(symbol).push({
      ...holding,
      symbol,
      quantity
    });
  }

  return [...groups.entries()].map(([symbol, rows]) => {
    const first = rows[0] || {};

    const quantity = rows.reduce(
      (sum, row) => sum + Number(row.quantity || 0),
      0
    );

    const hasSettlementEvidence = rows.every(
      (row) =>
        row?.settledQuantity != null ||
        row?.sellableQuantity != null
    );

    const settledQuantity = hasSettlementEvidence
      ? rows.reduce(
          (sum, row) =>
            sum +
            Number(
              row.settledQuantity ??
              row.sellableQuantity ??
              0
            ),
          0
        )
      : null;

    const costValue = rows.reduce((sum, row) => {
      const rowQuantity = Number(row.quantity || 0);
      const explicitCost = Number(
        row.costValue ??
        row.investedValue ??
        0
      );

      if (explicitCost > 0) {
        return sum + explicitCost;
      }

      const averagePrice = Number(
        row.averagePrice ??
        row.averageCost ??
        row.weightedAveragePrice ??
        0
      );

      return sum + rowQuantity * averagePrice;
    }, 0);

    const marketValue = rows.reduce((sum, row) => {
      const explicitValue = Number(
        row.marketValue ??
        row.value ??
        0
      );

      if (explicitValue > 0) {
        return sum + explicitValue;
      }

      return (
        sum +
        Number(row.quantity || 0) *
          Number(
            row.marketPrice ??
            row.price ??
            row.lastPrice ??
            0
          )
      );
    }, 0);

    const averagePrice =
      quantity > 0 && costValue > 0
        ? costValue / quantity
        : 0;

    const marketPrice =
      quantity > 0 && marketValue > 0
        ? marketValue / quantity
        : Number(
            first.marketPrice ??
            first.price ??
            first.lastPrice ??
            0
          );

    const profitLoss = marketValue - costValue;
    const profitLossPct =
      costValue > 0
        ? (profitLoss / costValue) * 100
        : 0;

    const brokerAccounts = [
      ...new Set(
        rows
          .map((row) =>
            String(
              row.brokerAccountKey ??
              row.broker ??
              ""
            ).trim()
          )
          .filter(Boolean)
      )
    ];

    return {
      ...first,
      symbol,
      broker:
        brokerAccounts.length === 1
          ? brokerAccounts[0]
          : "MULTI_BROKER",
      brokerAccountKey:
        brokerAccounts.length === 1
          ? brokerAccounts[0]
          : null,
      brokerAccounts,
      sourceRows: rows,
      sourceAccountCount: brokerAccounts.length,
      quantity,
      settledQuantity,
      sellableQuantity: settledQuantity,
      averagePrice,
      averageCost: averagePrice,
      weightedAveragePrice: averagePrice,
      costValue,
      investedValue: costValue,
      marketPrice,
      price: marketPrice,
      lastPrice: marketPrice,
      marketValue,
      value: marketValue,
      profitLoss,
      profitLossPct,
      changePct: profitLossPct
    };
  });
}

export class PortfolioAuthenticationError extends Error {
  constructor(message, code = "AUTH_REQUIRED", status = 401) {
    super(message);
    this.name = "PortfolioAuthenticationError";
    this.code = code;
    this.status = status;
    this.isAuthenticationError = true;
  }
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, error: text || "Invalid portfolio response" };
  }
}

function throwIfAuthenticationFailed(response, data = {}) {
  if (response.status === 401 || response.status === 403) {
    throw new PortfolioAuthenticationError(
      data?.error || "Your session has expired. Please sign in again.",
      "AUTH_EXPIRED",
      response.status
    );
  }
}

export async function loadLastVerifiedRealPortfolio(options = {}) {
  const raw = await userGetItem(realPortfolioCacheKey(options));
  return raw ? JSON.parse(raw) : null;
}

export async function loadUnifiedPortfolio(options = {}) {
  const token = await getStoredAccessToken();
  const broker = options?.broker || "ALL";

  if (!token) {
    throw new PortfolioAuthenticationError(
      "Sign in to load your REAL portfolio.",
      "AUTH_REQUIRED"
    );
  }

  const brokerQuery =
    broker && broker !== "ALL" ? `&broker=${encodeURIComponent(broker)}` : "";

  const response = await fetch(
    `${API_URL}/user-portfolio?t=${Date.now()}${brokerQuery}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const data = await readJson(response);

  throwIfAuthenticationFailed(response, data);

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Unable to load user portfolio");
  }

  const quoteSnapshot = await loadCanonicalNseQuotes().catch(() => ({ status: "UNAVAILABLE", quotes: [] }));
  const quoteOverlay = overlayCanonicalNseQuotes(data.holdings || [], quoteSnapshot);
  const availableCash = Number(
    data?.availableCash ?? data?.summary?.availableCash ?? 0
  );
  const recalculated = calculatePortfolioSummary({
    holdings: quoteOverlay.holdings,
    cash: availableCash
  });
  const refreshedSummary = {
    ...(data.summary || {}),
    totalHoldings: quoteOverlay.totalCount,
    holdingsCount: quoteOverlay.totalCount,
    totalValue: recalculated.summary.totalValue,
    investedValue: recalculated.summary.investedValue,
    totalProfitLoss: recalculated.summary.totalGain,
    totalGain: recalculated.summary.totalGain,
    totalGainPct: recalculated.summary.totalGainPct,
    availableCash,
    netWorth: recalculated.summary.netWorth
  };
  const result = {
    ok: true,
    source: broker,
    priceSource: "USER_PORTFOLIO",
    holdings: quoteOverlay.holdings,
    cashBalances: Array.isArray(data?.cashBalances) ? data.cashBalances : [],
    availableCash,
    totalValue: quoteOverlay.holdings.reduce((sum, holding) => sum + Number(holding?.marketValue || 0), 0),
    totalMarketValue: quoteOverlay.holdings.reduce((sum, holding) => sum + Number(holding?.marketValue || 0), 0),
    netWorth: quoteOverlay.holdings.reduce((sum, holding) => sum + Number(holding?.marketValue || 0), 0) + availableCash,
    totalProfitLoss: recalculated.summary.totalGain,
    summary: refreshedSummary,
    runtimeStatus: "LIVE",
    marketDataStatus: quoteSnapshot.status,
    marketDataSource: quoteSnapshot.source,
    marketDataUpdatedAt: quoteSnapshot.generatedAt,
    marketPriceCoverage: { updated: quoteOverlay.updatedCount, total: quoteOverlay.totalCount },
    verifiedAt: new Date().toISOString()
  };

  await userSetItem(realPortfolioCacheKey(options), JSON.stringify(result));
  return result;
}

export async function loadUnifiedPortfolioRuntime(options = {}) {
  try {
    return await loadUnifiedPortfolio(options);
  } catch (error) {
    const cached = await loadLastVerifiedRealPortfolio(options).catch(() => null);

    if (cached) {
      return {
        ...cached,
        ok: false,
        runtimeStatus: error?.isAuthenticationError
          ? error.code
          : "REAL_DATA_UNAVAILABLE",
        runtimeMessage: error?.message || "REAL portfolio is unavailable.",
        stale: true
      };
    }

    throw error;
  }
}

export async function loadPortfolioAccounts() {
  const token = await getStoredAccessToken();

  if (!token) {
    throw new PortfolioAuthenticationError(
      "Sign in to load your REAL portfolio accounts.",
      "AUTH_REQUIRED"
    );
  }

  const response = await fetch(`${API_URL}/user-portfolio/accounts`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await readJson(response);

  throwIfAuthenticationFailed(response, data);

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Unable to load portfolio accounts");
  }

  return data;
}
