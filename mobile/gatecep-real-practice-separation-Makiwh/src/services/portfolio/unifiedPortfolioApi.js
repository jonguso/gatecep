import { API_URL } from "../../config/apiConfig";
import { getStoredAccessToken } from "../../features/auth/storage/authStorage";
import { userGetItem, userSetItem } from "../auth/userStorage";

const REAL_PORTFOLIO_CACHE_KEY = "lastVerifiedRealPortfolio";

function realPortfolioCacheKey(options = {}) {
  const broker = String(options?.broker || "ALL")
    .trim()
    .toUpperCase();
  return `${REAL_PORTFOLIO_CACHE_KEY}:${broker || "ALL"}`;
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

  const result = {
    ok: true,
    source: broker,
    priceSource: "USER_PORTFOLIO",
    holdings: data.holdings || [],
    totalValue: data.summary?.totalValue || 0,
    totalMarketValue: data.summary?.totalValue || 0,
    totalProfitLoss: data.summary?.totalProfitLoss || 0,
    summary: data.summary || {
      totalHoldings: 0,
      totalValue: 0,
      totalProfitLoss: 0
    },
    runtimeStatus: "LIVE",
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
