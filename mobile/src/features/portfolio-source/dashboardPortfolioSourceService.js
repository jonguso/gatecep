import {
  buildCanonicalPortfolioView,
  buildDashboardPortfolioSourceLabel
} from "./canonicalPortfolioViewService";

/*
 * ============================================================
 * PC-028M
 * DASHBOARD PORTFOLIO SOURCE SERVICE
 * ============================================================
 *
 * One source of truth for Dashboard:
 *
 * REAL DATA EXISTS
 *   -> default = ALL
 *
 * NO REAL DATA
 *   -> default = PRACTICE
 *
 * IMPORTANT:
 * Practice is allowed as a visible demo portfolio, but does not drive:
 * - real net worth
 * - real Wealth Journey
 * - DNA reconciliation
 * - recommendation-compliance tracking
 * ============================================================
 */

function n(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function buildDashboardPortfolioSourceState({
  selectedSourceId = null
} = {}) {
  const view =
    await buildCanonicalPortfolioView({
      selectedSourceId
    });

  const selected =
    view?.selectedPortfolio ||
    null;

  const label =
    buildDashboardPortfolioSourceLabel(
      view
    );

  const isPractice =
    selected?.type ===
    "PRACTICE";

  const isReal =
    Boolean(
      selected &&
      !isPractice
    );

  return {
    generatedAt:
      new Date().toISOString(),

    selectedSourceId:
      view
        ?.selection
        ?.selectedSourceId ||
      null,

    defaultSourceId:
      view
        ?.selection
        ?.defaultSourceId ||
      null,

    sourceOptions:
      view?.sourceOptions ||
      [],

    label,

    selectedPortfolio:
      selected,

    metrics: {
      portfolioValue:
        n(
          selected?.totalValue ??
          selected?.portfolioValue
        ),

      holdingsValue:
        n(
          selected?.holdingsValue ??
          selected?.totalMarketValue
        ),

      availableCash:
        n(
          selected?.availableCash
        ),

      holdingsCount:
        Array.isArray(
          selected?.holdings
        )
          ? selected.holdings.length
          : 0
    },

    presentation: {
      isPractice,
      isReal,

      showSimulationBanner:
        isPractice,

      simulationBannerText:
        isPractice
          ? "Practice Portfolio · Simulated learning environment · No real money"
          : null
    },

    wealthPolicy: {
      mayDriveRealNetWorth:
        isReal,

      mayDriveWealthJourney:
        isReal,

      mayDriveDNAReconciliation:
        isReal,

      mayDriveRecommendationTracking:
        isReal
    },

    wealthActivation:
      view?.wealthActivation ||
      null
  };
}

export async function loadDashboardDefaultPortfolioSourceState() {
  return buildDashboardPortfolioSourceState();
}
