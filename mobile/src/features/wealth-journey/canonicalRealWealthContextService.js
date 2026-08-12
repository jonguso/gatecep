import { loadInvestorContext } from "../investor/investorContextStore";
import { loadUnifiedPortfolio } from "../../portfolio/unifiedPortfolioApi";
import { buildSyncStatus } from "../../portfolio/syncStatus";

import {
  loadCanonicalRealAvailableCash
} from "../portfolio-cash/canonicalPortfolioCashService";

import {
  PORTFOLIO_SOURCE_TYPES,
  buildPortfolioSourceCatalog,
  determineDefaultPortfolioSource,
  classifyWealthActivation
} from "../portfolio-source/portfolioSourcePolicy";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value
      : {};
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function n(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function adaptUnifiedPortfolioToSources(portfolio = {}) {
  const holdings = safeArray(portfolio?.holdings);
  const groups = new Map();

  holdings.forEach((holding) => {
    const sourceType = String(
      holding?.portfolioSource ??
      holding?.source ??
      holding?.origin ??
      ""
    ).toUpperCase();

    const brokerId = clean(holding?.brokerId ?? holding?.broker);
    const brokerAccountId =
      clean(holding?.brokerAccountId ?? holding?.accountId);

    let key;
    let type;
    let name;

    if (brokerId || brokerAccountId) {
      key = `BROKER|${brokerId || "UNKNOWN"}|${brokerAccountId || "DEFAULT"}`;
      type = PORTFOLIO_SOURCE_TYPES.BROKER;
      name =
        clean(holding?.brokerName ?? holding?.broker) ||
        "Broker Account";
    } else if (sourceType.includes("IMPORT")) {
      key = "IMPORTED_PORTFOLIO";
      type = PORTFOLIO_SOURCE_TYPES.IMPORTED;
      name = "Imported Portfolio";
    } else {
      key = "IMPORTED_PORTFOLIO";
      type = PORTFOLIO_SOURCE_TYPES.IMPORTED;
      name = "Imported Portfolio";
    }

    if (!groups.has(key)) {
      groups.set(key, {
        id:
          brokerAccountId ||
          (type === PORTFOLIO_SOURCE_TYPES.IMPORTED
            ? "IMPORTED_PORTFOLIO"
            : key),
        type,
        name,
        brokerId,
        brokerAccountId,
        holdings: []
      });
    }

    groups.get(key).holdings.push(holding);
  });

  const sources = Array.from(groups.values());

  if (!sources.length && holdings.length) {
    sources.push({
      id: "IMPORTED_PORTFOLIO",
      type: PORTFOLIO_SOURCE_TYPES.IMPORTED,
      name: "Imported Portfolio",
      holdings,
      availableCash: n(portfolio?.availableCash) ?? 0
    });
  }

  if (sources.length === 1 && sources[0].type === PORTFOLIO_SOURCE_TYPES.IMPORTED) {
    sources[0].availableCash = n(portfolio?.availableCash) ?? 0;
  }

  return sources;
}

export function buildInitialInvestorIdentity(investorContext = {}) {
  const dna = safeObject(investorContext?.investorDNA);
  const investor = safeObject(investorContext?.investor);

  return {
    investorDNA: dna,
    goalIntent:
      clean(
        investor?.goal ??
        dna?.goal ??
        investorContext?.profile?.goal
      ),
    investorType:
      clean(investor?.investorType ?? dna?.investorType),
    riskProfile:
      clean(investor?.riskProfile ?? dna?.riskProfile)
  };
}

export function buildPracticeSandbox(investorContext = {}) {
  const practice = safeObject(investorContext?.practicePortfolio);

  return {
    id: PORTFOLIO_SOURCE_TYPES.PRACTICE,
    type: PORTFOLIO_SOURCE_TYPES.PRACTICE,
    name: "Practice Portfolio",
    holdings: safeArray(practice?.holdings),
    availableCash: n(practice?.availableCash) ?? 0,
    totalValue: n(practice?.totalValue),
    sandboxOnly: true,
    dnaEvidence: false,
    wealthJourneyEvidence: false
  };
}

export async function buildCanonicalRealWealthContext({
  broker = "ALL"
} = {}) {
  const [
    investorContext,
    unifiedPortfolio,
    syncStatus,
    canonicalRealCash
  ] =
    await Promise.all([
      loadInvestorContext(),
      loadUnifiedPortfolio({ broker }),
      buildSyncStatus(),
      loadCanonicalRealAvailableCash()
    ]);

  const identity = buildInitialInvestorIdentity(investorContext);
  const practice = buildPracticeSandbox(investorContext);
  const realSources = adaptUnifiedPortfolioToSources(unifiedPortfolio);

  const catalog = buildPortfolioSourceCatalog({
    realSources,
    practicePortfolio: practice
  });

  /*
   * PC-028S:
   * Canonical real Wealth Journey always uses aggregate All-Accounts cash.
   * Individual account cash is view-scoped and must not replace aggregate
   * real wealth cash.
   */
  const syncedAvailableCash =
    n(canonicalRealCash);

  if (
    catalog?.allAccounts &&
    syncedAvailableCash !== null
  ) {
    catalog.allAccounts.availableCash =
      syncedAvailableCash;

    catalog.allAccounts.totalValue =
      Number(
        catalog.allAccounts.holdingsValue ||
        0
      ) +
      syncedAvailableCash;
  }

  const activation = classifyWealthActivation(catalog);
  const defaultSourceId = determineDefaultPortfolioSource(catalog);

  return {
    generatedAt: new Date().toISOString(),

    investor: {
      firstName: investorContext?.identity?.firstName || null,
      lastName: investorContext?.identity?.lastName || null,
      investorDNA: identity?.investorDNA || {},
      goalIntent: identity?.goalIntent || null,
      investorType: identity?.investorType || null,
      riskProfile: identity?.riskProfile || null
    },

    portfolioSources: catalog,
    defaultPortfolioSourceId: defaultSourceId,
    wealthActivation: activation,
    syncStatus,

    safeguards: {
      practiceIncludedInAllAccounts: false,
      practiceUsedForDNA: false,
      practiceUsedForWealthJourney: false,
      initialDNAReplacedByUpload: false,
      actualDataReconcilesAgainstInitialDNA: true
    }
  };
}
