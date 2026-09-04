const numeric = (value) => { if (value === null || value === undefined || value === "") return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; };
const first = (...values) => values.find((value) => value !== null && value !== undefined && value !== "") ?? null;

export function buildSecurityEducationModel(security = {}, fundamentals = null) {
  const periods = Array.isArray(fundamentals?.periods) ? fundamentals.periods : [];
  const latest = fundamentals?.latestPeriod || periods[periods.length - 1] || {};
  const ratios = fundamentals?.ratios || fundamentals?.valuation || {};
  const profile = fundamentals?.profile || fundamentals?.company || {};
  const source = fundamentals?.source || fundamentals?.metadata?.source || {};
  const metric = (...values) => numeric(first(...values));
  const fields = {
    marketCap: metric(fundamentals?.marketCapitalization, ratios?.marketCapitalization, latest?.marketCapitalization),
    pe: metric(fundamentals?.peRatio, ratios?.peRatio, latest?.peRatio),
    pb: metric(fundamentals?.priceToBookRatio, ratios?.priceToBookRatio, latest?.priceToBookRatio),
    eps: metric(latest?.earningsPerShare, fundamentals?.earningsPerShare),
    dps: metric(latest?.dividendPerShare, fundamentals?.dividendPerShare),
    dividendYield: metric(fundamentals?.dividendYieldPercentage, ratios?.dividendYieldPercentage, latest?.dividendYieldPercentage),
    revenue: metric(latest?.revenue, latest?.totalRevenue),
    netIncome: metric(latest?.netIncome, latest?.profitAfterTax),
    assets: metric(latest?.totalAssets),
    equity: metric(latest?.totalEquity, latest?.shareholdersEquity),
    debt: metric(latest?.totalDebt, latest?.borrowings)
  };
  const evidenceCount = Object.values(fields).filter((value) => value !== null).length;
  return {
    profile: { description: first(profile?.description, fundamentals?.businessDescription, fundamentals?.description), website: first(profile?.website, fundamentals?.website), sector: first(security?.sector, profile?.sector, fundamentals?.sector, "NSE"), industry: first(profile?.industry, fundamentals?.industry), logoUrl: first(security?.logoUrl, profile?.logoUrl, fundamentals?.logoUrl) },
    fields,
    fiscalPeriod: first(latest?.periodEnd, latest?.fiscalYear, fundamentals?.latestFiscalYear),
    evidence: { available: evidenceCount > 0, count: evidenceCount, provider: first(source?.provider, source?.name, fundamentals?.provider), reference: first(source?.reference, fundamentals?.sourceReference), verifiedAt: first(fundamentals?.verifiedAt, fundamentals?.updatedAt, source?.retrievedAt) }
  };
}

export function explainMetric(key) {
  return ({ pe: "Price-to-earnings shows how much investors pay for each shilling of annual earnings. Compare it with peers and growth, not in isolation.", pb: "Price-to-book compares market price with accounting net assets. It is often most useful for banks and asset-heavy companies.", eps: "Earnings per share is profit attributable to each ordinary share. A multi-year trend matters more than one period.", dividendYield: "Dividend yield compares annual dividend per share with market price. A high yield can also signal elevated risk.", debt: "Debt should be judged against cash flow, assets and the norms of the company’s sector." })[key] || "Use this metric together with the company’s history, peers and source evidence.";
}
