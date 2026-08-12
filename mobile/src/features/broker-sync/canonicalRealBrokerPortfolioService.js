import {
  loadPortfolio,
  savePortfolio
} from "../../services/portfolio/portfolioStore";
import {
  loadCanonicalRealAvailableCash
} from "../portfolio-cash/canonicalPortfolioCashService";
import {
  buildSyncStatus
} from "../../services/portfolio/syncStatus";
import {
  refreshCanonicalRealPortfolioSnapshot
} from "../../services/portfolio/portfolioSnapshotTrigger";

function n(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function holdingsValue(holdings = []) {
  return holdings.reduce(
    (total, holding) =>
      total +
      n(
        holding?.marketValue ??
          holding?.value ??
          n(holding?.quantity) *
            n(holding?.marketPrice ?? holding?.price)
      ),
    0
  );
}

export async function loadCanonicalRealBrokerPortfolio() {
  const [holdings, availableCash] = await Promise.all([
    loadPortfolio({ revalue: false }),
    loadCanonicalRealAvailableCash()
  ]);
  const value = holdingsValue(holdings);

  return {
    id: "ALL",
    type: "ALL",
    name: "All Accounts",
    isReal: true,
    isPractice: false,
    holdings,
    holdingsCount: holdings.length,
    holdingsValue: value,
    investedAmount: value,
    availableCash: n(availableCash),
    totalValue: value + n(availableCash)
  };
}

export async function saveCanonicalRealBrokerPortfolio(
  holdings = [],
  { reason = "BROKER_RECONCILIATION_IMPORT" } = {}
) {
  const savedHoldings = await savePortfolio(holdings);

  try {
    await buildSyncStatus();
  } catch (error) {
    console.warn(
      "[BROKER_RECONCILIATION] Sync-status refresh deferred:",
      error?.message || error
    );
  }

  await refreshCanonicalRealPortfolioSnapshot({ reason });

  const availableCash = await loadCanonicalRealAvailableCash();
  const value = holdingsValue(savedHoldings);

  return {
    id: "ALL",
    type: "ALL",
    name: "All Accounts",
    isReal: true,
    isPractice: false,
    holdings: savedHoldings,
    holdingsCount: savedHoldings.length,
    holdingsValue: value,
    investedAmount: value,
    availableCash: n(availableCash),
    totalValue: value + n(availableCash)
  };
}
