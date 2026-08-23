export const PORTFOLIO_SOURCE_TYPES = Object.freeze({
  ALL: "ALL",
  BROKER: "BROKER",
  IMPORTED: "IMPORTED",
  PRACTICE: "PRACTICE"
});

export const WEALTH_ACTIVATION_STATUSES = Object.freeze({
  ACTIVE: "ACTIVE",
  PRACTICE_ONLY: "PRACTICE_ONLY",
  NO_DATA: "NO_DATA"
});

function safeArray(value) {
  return Array.isArray(value) ? value : [];
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

function sumHoldingsValue(holdings = []) {
  return safeArray(holdings).reduce(
    (total, holding) =>
      total +
      (
        n(holding?.marketValue) ??
        ((n(holding?.quantity) || 0) *
          (n(holding?.marketPrice ?? holding?.price ?? holding?.lastPrice) || 0))
      ),
    0
  );
}

export function normalizePortfolioSourceRecord(source = {}) {
  const type =
    clean(source?.type)?.toUpperCase() ||
    PORTFOLIO_SOURCE_TYPES.IMPORTED;

  const holdings = safeArray(source?.holdings);

  const holdingsValue =
    n(source?.holdingsValue ?? source?.totalMarketValue) ??
    sumHoldingsValue(holdings);

  const availableCash = n(source?.availableCash) ?? 0;

  const totalValue =
    n(source?.totalValue ?? source?.portfolioValue) ??
    (holdingsValue + availableCash);

  return {
    ...source,
    id:
      clean(
        source?.id ??
        source?.sourceId ??
        source?.brokerAccountId ??
        source?.accountId
      ) ||
      `${type}-${clean(source?.name) || "PORTFOLIO"}`,
    type,
    name:
      clean(source?.name ?? source?.brokerName ?? source?.label) ||
      (
        type === PORTFOLIO_SOURCE_TYPES.PRACTICE
          ? "Practice Portfolio"
          : type === PORTFOLIO_SOURCE_TYPES.IMPORTED
            ? "Imported Portfolio"
            : "Portfolio"
      ),
    brokerId: clean(source?.brokerId ?? source?.broker),
    brokerAccountId: clean(source?.brokerAccountId ?? source?.accountId),
    holdings,
    holdingsValue,
    availableCash,
    totalValue,
    isPractice: type === PORTFOLIO_SOURCE_TYPES.PRACTICE,
    isReal: type !== PORTFOLIO_SOURCE_TYPES.PRACTICE
  };
}

export function splitRealAndPracticeSources(sources = []) {
  const normalized = safeArray(sources).map(normalizePortfolioSourceRecord);

  return {
    realSources: normalized.filter((source) => source.isReal),
    practiceSources: normalized.filter((source) => source.isPractice)
  };
}

export function buildAllAccountsPortfolio(sources = []) {
  const { realSources, practiceSources } =
    splitRealAndPracticeSources(sources);

  const holdings = realSources.flatMap((source) =>
    source.holdings.map((holding) => ({
      ...holding,
      sourceId: source.id,
      sourceName: source.name,
      brokerId: source.brokerId ?? holding?.brokerId ?? null,
      brokerAccountId:
        source.brokerAccountId ?? holding?.brokerAccountId ?? null
    }))
  );

  const holdingsValue = realSources.reduce(
    (total, source) => total + (n(source?.holdingsValue) || 0),
    0
  );

  const availableCash = realSources.reduce(
    (total, source) => total + (n(source?.availableCash) || 0),
    0
  );

  return {
    id: PORTFOLIO_SOURCE_TYPES.ALL,
    type: PORTFOLIO_SOURCE_TYPES.ALL,
    name: "All Accounts",
    isPractice: false,
    isReal: true,
    holdings,
    holdingsCount: holdings.length,
    holdingsValue,
    availableCash,
    totalValue: holdingsValue + availableCash,
    includedSourceIds: realSources.map((source) => source.id),
    excludedPracticeSourceCount: practiceSources.length
  };
}

export function buildPortfolioSourceCatalog({
  realSources = [],
  practicePortfolio = null
} = {}) {
  const normalizedReal = safeArray(realSources)
    .map(normalizePortfolioSourceRecord)
    .filter((source) => source.isReal);

  const practice = practicePortfolio
    ? normalizePortfolioSourceRecord({
        ...practicePortfolio,
        type: PORTFOLIO_SOURCE_TYPES.PRACTICE,
        name: practicePortfolio?.name || "Practice Portfolio"
      })
    : null;

  const allAccounts = normalizedReal.length
    ? buildAllAccountsPortfolio([
        ...normalizedReal,
        ...(practice ? [practice] : [])
      ])
    : null;

  return {
    hasRealSources: normalizedReal.length > 0,
    hasPractice: Boolean(practice),
    allAccounts,
    realSources: normalizedReal,
    practice,
    selectableSources: [
      ...(allAccounts ? [allAccounts] : []),
      ...normalizedReal,
      ...(practice ? [practice] : [])
    ]
  };
}

export function determineDefaultPortfolioSource(catalog = {}) {
  if (catalog?.hasRealSources) return PORTFOLIO_SOURCE_TYPES.ALL;
  if (catalog?.hasPractice) return PORTFOLIO_SOURCE_TYPES.PRACTICE;
  return null;
}

export function resolvePortfolioSourceSelection({
  catalog = {},
  selectedSourceId = null
} = {}) {
  const defaultSourceId = determineDefaultPortfolioSource(catalog);
  const requested = clean(selectedSourceId) || defaultSourceId;

  const selected =
    safeArray(catalog?.selectableSources).find(
      (source) => source.id === requested
    ) ||
    safeArray(catalog?.selectableSources).find(
      (source) => source.id === defaultSourceId
    ) ||
    null;

  return {
    selectedSourceId: selected?.id || null,
    selected,
    defaultSourceId,
    isDefault: selected?.id === defaultSourceId
  };
}

export function classifyWealthActivation(catalog = {}) {
  if (catalog?.hasRealSources) {
    return {
      status: WEALTH_ACTIVATION_STATUSES.ACTIVE,
      active: true,
      reason: "Real broker or imported portfolio data is available."
    };
  }

  if (catalog?.hasPractice) {
    return {
      status: WEALTH_ACTIVATION_STATUSES.PRACTICE_ONLY,
      active: false,
      reason:
        "Only Practice Portfolio data is available. Practice is simulation only and does not activate the real Wealth Journey."
    };
  }

  return {
    status: WEALTH_ACTIVATION_STATUSES.NO_DATA,
    active: false,
    reason: "No real or practice portfolio source is currently available."
  };
}

export function isRealPortfolioSource(source = {}) {
  return normalizePortfolioSourceRecord(source).isReal;
}

export function canUseSourceForWealthJourney(source = {}) {
  return normalizePortfolioSourceRecord(source).isReal;
}

export function canUseSourceForDNAReconciliation(source = {}) {
  return normalizePortfolioSourceRecord(source).isReal;
}
