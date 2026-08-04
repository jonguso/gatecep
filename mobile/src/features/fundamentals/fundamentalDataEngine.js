/*
 * ============================================================
 * PC-024A
 * FUNDAMENTAL DATA ENGINE
 * ============================================================
 *
 * Purpose:
 *
 * - normalize company fundamentals from any provider,
 * - preserve missing values as null,
 * - validate financial statements and per-share data,
 * - derive ratios and growth metrics,
 * - build annual historical series,
 * - calculate EPS, revenue, FCF, book-value, and dividend CAGRs,
 * - calculate valuation multiples from current price,
 * - calculate profitability, leverage, liquidity, and payout metrics,
 * - expose research-ready records for PC-023B,
 * - support in-memory caching and provider adapters,
 * - never fabricate missing fundamentals.
 *
 * This module does not fetch data by itself. It accepts provider,
 * broker, API, file-import, or manually maintained fundamentals.
 * ============================================================
 */

export const FUNDAMENTAL_DATA_STATUSES = {
  AVAILABLE: "AVAILABLE",
  PARTIAL: "PARTIAL",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  INVALID_DATA: "INVALID_DATA",
  STALE_DATA: "STALE_DATA",
  NOT_FOUND: "NOT_FOUND"
};

export const FUNDAMENTAL_DATA_QUALITY_LEVELS = {
  EXCELLENT: "EXCELLENT",
  STRONG: "STRONG",
  GOOD: "GOOD",
  FAIR: "FAIR",
  WEAK: "WEAK",
  POOR: "POOR",
  NOT_RATED: "NOT_RATED"
};

export const FUNDAMENTAL_DATA_SOURCE_TYPES = {
  EXCHANGE: "EXCHANGE",
  COMPANY_FILING: "COMPANY_FILING",
  REGULATOR: "REGULATOR",
  BROKER: "BROKER",
  MARKET_DATA_VENDOR: "MARKET_DATA_VENDOR",
  FINANCIAL_DATA_VENDOR: "FINANCIAL_DATA_VENDOR",
  MANUAL: "MANUAL",
  IMPORT: "IMPORT",
  UNKNOWN: "UNKNOWN"
};

export const FUNDAMENTAL_PERIOD_TYPES = {
  ANNUAL: "ANNUAL",
  INTERIM: "INTERIM",
  QUARTERLY: "QUARTERLY",
  TTM: "TTM"
};

export const FUNDAMENTAL_WARNING_SEVERITIES = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFO: "INFO"
};

export const DEFAULT_FUNDAMENTAL_DATA_POLICY = {
  minimumAnnualPeriods: 2,
  preferredAnnualPeriods: 5,
  maximumAnnualPeriods: 15,
  maximumFinancialDataAgeDays: 550,
  maximumMarketDataAgeHours: 24,
  minimumCompletenessPercentage: 30,
  preferredCompletenessPercentage: 70,
  maximumPayoutRatioPercentage: 150,
  maximumDebtToEquityRatio: 10,
  maximumCurrentRatio: 20,
  maximumGrowthPercentage: 300,
  minimumGrowthPercentage: -100,
  requirePositiveSharesOutstanding: true
};

const FUNDAMENTAL_FIELDS = {
  MARKET: [
    "currentPrice",
    "marketCapitalization",
    "sharesOutstanding"
  ],

  INCOME_STATEMENT: [
    "revenue",
    "grossProfit",
    "operatingIncome",
    "ebitda",
    "netIncome"
  ],

  BALANCE_SHEET: [
    "totalAssets",
    "totalLiabilities",
    "totalEquity",
    "cashAndEquivalents",
    "totalDebt",
    "currentAssets",
    "currentLiabilities"
  ],

  CASH_FLOW: [
    "operatingCashFlow",
    "capitalExpenditure",
    "freeCashFlow"
  ],

  PER_SHARE: [
    "earningsPerShare",
    "bookValuePerShare",
    "revenuePerShare",
    "freeCashFlowPerShare",
    "dividendPerShare"
  ],

  DIVIDENDS: [
    "dividendPerShare",
    "dividendsPaid",
    "payoutRatioPercentage"
  ],

  PROFITABILITY: [
    "grossMarginPercentage",
    "operatingMarginPercentage",
    "netMarginPercentage",
    "returnOnEquityPercentage",
    "returnOnAssetsPercentage"
  ],

  LEVERAGE: [
    "debtToEquityRatio",
    "debtToAssetsRatio",
    "netDebtToEbitdaRatio",
    "interestCoverageRatio"
  ],

  VALUATION: [
    "peRatio",
    "priceToBookRatio",
    "priceToSalesRatio",
    "evToEbitdaRatio",
    "dividendYieldPercentage",
    "freeCashFlowYieldPercentage"
  ]
};

/*
 * ============================================================
 * GENERAL HELPERS
 * ============================================================
 */

function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function nullableNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function positiveNumber(value) {
  const parsed = nullableNumber(value);

  return parsed !== null &&
    parsed > 0
    ? parsed
    : null;
}

function nonNegativeNumber(value) {
  const parsed = nullableNumber(value);

  return parsed !== null &&
    parsed >= 0
    ? parsed
    : null;
}

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    Math.max(
      number(value),
      minimum
    ),
    maximum
  );
}

function safeDivide(
  numerator,
  denominator
) {
  const top = nullableNumber(numerator);
  const bottom = nullableNumber(denominator);

  if (
    top === null ||
    bottom === null ||
    bottom === 0
  ) {
    return null;
  }

  return top / bottom;
}

function roundMoney(value) {
  const parsed = nullableNumber(value);

  return parsed === null
    ? null
    : Number(parsed.toFixed(2));
}

function roundPercent(value) {
  const parsed = nullableNumber(value);

  return parsed === null
    ? null
    : Number(parsed.toFixed(2));
}

function roundMetric(
  value,
  decimals = 6
) {
  const parsed = nullableNumber(value);

  return parsed === null
    ? null
    : Number(
        parsed.toFixed(decimals)
      );
}

function roundScore(value) {
  return Math.round(
    clamp(
      value,
      0,
      100
    )
  );
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeText(value) {
  return String(value || "")
    .trim();
}

function normalizeCode(value) {
  return String(value || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function toIsoDate(value) {
  const date = normalizeDate(value);

  return date
    ? date.toISOString()
    : null;
}

function ageInHours(value) {
  const date = normalizeDate(value);

  if (!date) {
    return null;
  }

  return (
    Date.now() -
    date.getTime()
  ) /
  3600000;
}

function ageInDays(value) {
  const hours = ageInHours(value);

  return hours === null
    ? null
    : hours / 24;
}

function sum(values = []) {
  return safeArray(values).reduce(
    (total, value) =>
      total + number(value),
    0
  );
}

function average(values = []) {
  const valid = safeArray(values)
    .map(nullableNumber)
    .filter(
      (value) =>
        value !== null
    );

  return valid.length
    ? sum(valid) /
      valid.length
    : null;
}

function median(values = []) {
  const valid = safeArray(values)
    .map(nullableNumber)
    .filter(
      (value) =>
        value !== null
    )
    .sort(
      (first, second) =>
        first - second
    );

  if (!valid.length) {
    return null;
  }

  const middle =
    Math.floor(
      valid.length / 2
    );

  return valid.length % 2 === 0
    ? (
        valid[middle - 1] +
        valid[middle]
      ) / 2
    : valid[middle];
}

function calculateCagr({
  beginningValue,
  endingValue,
  years
}) {
  const beginning =
    positiveNumber(beginningValue);

  const ending =
    positiveNumber(endingValue);

  const period =
    positiveNumber(years);

  if (
    beginning === null ||
    ending === null ||
    period === null
  ) {
    return null;
  }

  return (
    Math.pow(
      ending / beginning,
      1 / period
    ) - 1
  ) * 100;
}

function normalizePolicy(policy = {}) {
  return {
    minimumAnnualPeriods:
      Math.max(
        Math.floor(
          number(
            policy?.minimumAnnualPeriods ??
            DEFAULT_FUNDAMENTAL_DATA_POLICY
              .minimumAnnualPeriods
          )
        ),
        1
      ),

    preferredAnnualPeriods:
      Math.max(
        Math.floor(
          number(
            policy?.preferredAnnualPeriods ??
            DEFAULT_FUNDAMENTAL_DATA_POLICY
              .preferredAnnualPeriods
          )
        ),
        1
      ),

    maximumAnnualPeriods:
      Math.max(
        Math.floor(
          number(
            policy?.maximumAnnualPeriods ??
            DEFAULT_FUNDAMENTAL_DATA_POLICY
              .maximumAnnualPeriods
          )
        ),
        1
      ),

    maximumFinancialDataAgeDays:
      Math.max(
        number(
          policy
            ?.maximumFinancialDataAgeDays ??
          DEFAULT_FUNDAMENTAL_DATA_POLICY
            .maximumFinancialDataAgeDays
        ),
        0
      ),

    maximumMarketDataAgeHours:
      Math.max(
        number(
          policy
            ?.maximumMarketDataAgeHours ??
          DEFAULT_FUNDAMENTAL_DATA_POLICY
            .maximumMarketDataAgeHours
        ),
        0
      ),

    minimumCompletenessPercentage:
      clamp(
        policy
          ?.minimumCompletenessPercentage ??
        DEFAULT_FUNDAMENTAL_DATA_POLICY
          .minimumCompletenessPercentage,
        0,
        100
      ),

    preferredCompletenessPercentage:
      clamp(
        policy
          ?.preferredCompletenessPercentage ??
        DEFAULT_FUNDAMENTAL_DATA_POLICY
          .preferredCompletenessPercentage,
        0,
        100
      ),

    maximumPayoutRatioPercentage:
      Math.max(
        number(
          policy
            ?.maximumPayoutRatioPercentage ??
          DEFAULT_FUNDAMENTAL_DATA_POLICY
            .maximumPayoutRatioPercentage
        ),
        0
      ),

    maximumDebtToEquityRatio:
      Math.max(
        number(
          policy
            ?.maximumDebtToEquityRatio ??
          DEFAULT_FUNDAMENTAL_DATA_POLICY
            .maximumDebtToEquityRatio
        ),
        0
      ),

    maximumCurrentRatio:
      Math.max(
        number(
          policy
            ?.maximumCurrentRatio ??
          DEFAULT_FUNDAMENTAL_DATA_POLICY
            .maximumCurrentRatio
        ),
        0
      ),

    maximumGrowthPercentage:
      number(
        policy
          ?.maximumGrowthPercentage ??
        DEFAULT_FUNDAMENTAL_DATA_POLICY
          .maximumGrowthPercentage
      ),

    minimumGrowthPercentage:
      number(
        policy
          ?.minimumGrowthPercentage ??
        DEFAULT_FUNDAMENTAL_DATA_POLICY
          .minimumGrowthPercentage
      ),

    requirePositiveSharesOutstanding:
      policy
        ?.requirePositiveSharesOutstanding !==
      false
  };
}

/*
 * ============================================================
 * SOURCE NORMALIZATION
 * ============================================================
 */

export function normalizeFundamentalDataSource(
  source = {}
) {
  return {
    id:
      source?.id ||
      null,

    name:
      normalizeText(
        source?.name ||
        source?.provider ||
        "Unknown"
      ),

    type:
      normalizeCode(
        source?.type ||
        FUNDAMENTAL_DATA_SOURCE_TYPES
          .UNKNOWN
      ),

    authoritative:
      Boolean(
        source?.authoritative
      ),

    verified:
      Boolean(
        source?.verified
      ),

    url:
      source?.url ||
      null,

    publishedAt:
      toIsoDate(
        source?.publishedAt
      ),

    retrievedAt:
      toIsoDate(
        source?.retrievedAt ||
        new Date()
      ),

    fields:
      safeArray(
        source?.fields
      )
  };
}

/*
 * ============================================================
 * PERIOD NORMALIZATION
 * ============================================================
 */

export function normalizeFundamentalPeriod(
  period = {}
) {
  const revenue =
    nullableNumber(
      period?.revenue
    );

  const grossProfit =
    nullableNumber(
      period?.grossProfit
    );

  const operatingIncome =
    nullableNumber(
      period?.operatingIncome ??
      period?.ebit
    );

  const ebitda =
    nullableNumber(
      period?.ebitda
    );

  const netIncome =
    nullableNumber(
      period?.netIncome ??
      period?.profitAfterTax
    );

  const totalAssets =
    nullableNumber(
      period?.totalAssets
    );

  const totalLiabilities =
    nullableNumber(
      period?.totalLiabilities
    );

  const totalEquity =
    nullableNumber(
      period?.totalEquity ??
      period?.shareholdersEquity ??
      (
        totalAssets !== null &&
        totalLiabilities !== null
          ? totalAssets -
            totalLiabilities
          : null
      )
    );

  const cashAndEquivalents =
    nullableNumber(
      period?.cashAndEquivalents ??
      period?.cash
    );

  const totalDebt =
    nullableNumber(
      period?.totalDebt
    );

  const currentAssets =
    nullableNumber(
      period?.currentAssets
    );

  const currentLiabilities =
    nullableNumber(
      period?.currentLiabilities
    );

  const operatingCashFlow =
    nullableNumber(
      period?.operatingCashFlow
    );

  const capitalExpenditure =
    nullableNumber(
      period?.capitalExpenditure ??
      period?.capex
    );

  const freeCashFlow =
    nullableNumber(
      period?.freeCashFlow ??
      (
        operatingCashFlow !== null &&
        capitalExpenditure !== null
          ? operatingCashFlow -
            Math.abs(
              capitalExpenditure
            )
          : null
      )
    );

  const sharesOutstanding =
    positiveNumber(
      period?.sharesOutstanding
    );

  const earningsPerShare =
    nullableNumber(
      period?.earningsPerShare ??
      period?.eps ??
      (
        netIncome !== null &&
        sharesOutstanding !== null
          ? netIncome /
            sharesOutstanding
          : null
      )
    );

  const bookValuePerShare =
    nullableNumber(
      period?.bookValuePerShare ??
      (
        totalEquity !== null &&
        sharesOutstanding !== null
          ? totalEquity /
            sharesOutstanding
          : null
      )
    );

  const revenuePerShare =
    nullableNumber(
      period?.revenuePerShare ??
      (
        revenue !== null &&
        sharesOutstanding !== null
          ? revenue /
            sharesOutstanding
          : null
      )
    );

  const freeCashFlowPerShare =
    nullableNumber(
      period?.freeCashFlowPerShare ??
      (
        freeCashFlow !== null &&
        sharesOutstanding !== null
          ? freeCashFlow /
            sharesOutstanding
          : null
      )
    );

  const dividendPerShare =
    nullableNumber(
      period?.dividendPerShare ??
      period?.dps
    );

  const dividendsPaid =
    nullableNumber(
      period?.dividendsPaid ??
      (
        dividendPerShare !== null &&
        sharesOutstanding !== null
          ? dividendPerShare *
            sharesOutstanding
          : null
      )
    );

  const payoutRatioPercentage =
    nullableNumber(
      period?.payoutRatioPercentage ??
      (
        dividendPerShare !== null &&
        earningsPerShare !== null &&
        earningsPerShare !== 0
          ? (
              dividendPerShare /
              earningsPerShare
            ) *
            100
          : null
      )
    );

  return {
    fiscalYear:
      period?.fiscalYear ??
      period?.year ??
      null,

    periodType:
      normalizeCode(
        period?.periodType ||
        FUNDAMENTAL_PERIOD_TYPES
          .ANNUAL
      ),

    periodStart:
      toIsoDate(
        period?.periodStart
      ),

    periodEnd:
      toIsoDate(
        period?.periodEnd ??
        period?.reportingDate
      ),

    currency:
      normalizeCode(
        period?.currency ||
        "KES"
      ),

    revenue,
    grossProfit,
    operatingIncome,
    ebitda,
    netIncome,

    totalAssets,
    totalLiabilities,
    totalEquity,
    cashAndEquivalents,
    totalDebt,
    currentAssets,
    currentLiabilities,

    operatingCashFlow,
    capitalExpenditure,
    freeCashFlow,

    sharesOutstanding,
    earningsPerShare,
    bookValuePerShare,
    revenuePerShare,
    freeCashFlowPerShare,
    dividendPerShare,
    dividendsPaid,
    payoutRatioPercentage,

    grossMarginPercentage:
      nullableNumber(
        period
          ?.grossMarginPercentage ??
        (
          grossProfit !== null &&
          revenue !== null &&
          revenue !== 0
            ? (
                grossProfit /
                revenue
              ) *
              100
            : null
        )
      ),

    operatingMarginPercentage:
      nullableNumber(
        period
          ?.operatingMarginPercentage ??
        (
          operatingIncome !== null &&
          revenue !== null &&
          revenue !== 0
            ? (
                operatingIncome /
                revenue
              ) *
              100
            : null
        )
      ),

    netMarginPercentage:
      nullableNumber(
        period
          ?.netMarginPercentage ??
        (
          netIncome !== null &&
          revenue !== null &&
          revenue !== 0
            ? (
                netIncome /
                revenue
              ) *
              100
            : null
        )
      ),

    returnOnEquityPercentage:
      nullableNumber(
        period
          ?.returnOnEquityPercentage ??
        period?.roePercentage ??
        (
          netIncome !== null &&
          totalEquity !== null &&
          totalEquity !== 0
            ? (
                netIncome /
                totalEquity
              ) *
              100
            : null
        )
      ),

    returnOnAssetsPercentage:
      nullableNumber(
        period
          ?.returnOnAssetsPercentage ??
        period?.roaPercentage ??
        (
          netIncome !== null &&
          totalAssets !== null &&
          totalAssets !== 0
            ? (
                netIncome /
                totalAssets
              ) *
              100
            : null
        )
      ),

    debtToEquityRatio:
      nullableNumber(
        period
          ?.debtToEquityRatio ??
        safeDivide(
          totalDebt,
          totalEquity
        )
      ),

    debtToAssetsRatio:
      nullableNumber(
        period
          ?.debtToAssetsRatio ??
        safeDivide(
          totalDebt,
          totalAssets
        )
      ),

    currentRatio:
      nullableNumber(
        period
          ?.currentRatio ??
        safeDivide(
          currentAssets,
          currentLiabilities
        )
      ),

    interestCoverageRatio:
      nullableNumber(
        period
          ?.interestCoverageRatio
      ),

    source:
      normalizeFundamentalDataSource(
        period?.source ||
        {}
      )
  };
}

/*
 * ============================================================
 * COMPANY FUNDAMENTAL NORMALIZATION
 * ============================================================
 */

export function normalizeCompanyFundamentals(
  input = {}
) {
  const periods =
    safeArray(
      input?.periods ??
      input?.history ??
      input?.annualPeriods
    )
      .map(
        normalizeFundamentalPeriod
      )
      .filter(
        (period) =>
          period.fiscalYear !==
            null ||
          period.periodEnd
      )
      .sort(
        (first, second) => {
          const firstYear =
            Number(
              first.fiscalYear ??
              0
            );

          const secondYear =
            Number(
              second.fiscalYear ??
              0
            );

          return firstYear -
            secondYear;
        }
      );

  const latestPeriod =
    periods[
      periods.length - 1
    ] ||
    null;

  const currentPrice =
    positiveNumber(
      input?.currentPrice ??
      input?.price ??
      input?.marketPrice
    );

  const sharesOutstanding =
    positiveNumber(
      input?.sharesOutstanding ??
      latestPeriod
        ?.sharesOutstanding
    );

  const marketCapitalization =
    positiveNumber(
      input?.marketCapitalization ??
      input?.marketCap ??
      (
        currentPrice !== null &&
        sharesOutstanding !== null
          ? currentPrice *
            sharesOutstanding
          : null
      )
    );

  return {
    symbol:
      normalizeSymbol(
        input?.symbol
      ),

    name:
      normalizeText(
        input?.name ||
        input?.companyName ||
        input?.symbol ||
        "Unknown"
      ),

    sector:
      normalizeText(
        input?.sector ||
        "Unknown"
      ),

    industry:
      normalizeText(
        input?.industry ||
        input?.subsector ||
        "Unknown"
      ),

    exchange:
      normalizeCode(
        input?.exchange ||
        "NSE"
      ),

    currency:
      normalizeCode(
        input?.currency ||
        latestPeriod
          ?.currency ||
        "KES"
      ),

    currentPrice,

    previousClose:
      positiveNumber(
        input?.previousClose
      ),

    marketCapitalization,

    sharesOutstanding,

    enterpriseValue:
      positiveNumber(
        input?.enterpriseValue
      ),

    priceUpdatedAt:
      toIsoDate(
        input?.priceUpdatedAt ??
        input?.marketDataUpdatedAt
      ),

    financialDataUpdatedAt:
      toIsoDate(
        input
          ?.financialDataUpdatedAt ??
        latestPeriod
          ?.periodEnd
      ),

    dividendDataUpdatedAt:
      toIsoDate(
        input
          ?.dividendDataUpdatedAt
      ),

    latestPeriod,

    periods,

    sources:
      safeArray(
        input?.sources
      ).map(
        normalizeFundamentalDataSource
      ),

    metadata:
      input?.metadata &&
      typeof input.metadata ===
        "object"
        ? input.metadata
        : {}
  };
}

/*
 * ============================================================
 * GROWTH SERIES
 * ============================================================
 */

function buildMetricSeries(
  periods,
  field
) {
  return safeArray(periods)
    .map(
      (period) => ({
        year:
          period?.fiscalYear,

        value:
          nullableNumber(
            period?.[field]
          )
      })
    )
    .filter(
      (item) =>
        item.year !==
          null &&
        item.year !==
          undefined &&
        item.value !==
          null
    );
}

export function buildFundamentalGrowthSeries({
  periods = [],
  field
} = {}) {
  const series =
    buildMetricSeries(
      periods,
      field
    );

  const annualGrowth = [];

  for (
    let index = 1;
    index < series.length;
    index += 1
  ) {
    const previous =
      series[index - 1];

    const current =
      series[index];

    if (
      previous.value === 0
    ) {
      continue;
    }

    annualGrowth.push({
      year:
        current.year,

      growthPercentage:
        roundPercent(
          (
            (
              current.value -
              previous.value
            ) /
            Math.abs(
              previous.value
            )
          ) *
          100
        )
    });
  }

  const first =
    series[0];

  const last =
    series[
      series.length - 1
    ];

  const yearSpan =
    first &&
    last
      ? Math.max(
          Number(
            last.year
          ) -
          Number(
            first.year
          ),
          series.length - 1
        )
      : null;

  return {
    field,

    observations:
      series.length,

    beginningValue:
      first?.value ??
      null,

    endingValue:
      last?.value ??
      null,

    years:
      yearSpan,

    cagrPercentage:
      roundPercent(
        calculateCagr({
          beginningValue:
            first?.value,

          endingValue:
            last?.value,

          years:
            yearSpan
        })
      ),

    averageGrowthPercentage:
      roundPercent(
        average(
          annualGrowth.map(
            (item) =>
              item
                .growthPercentage
          )
        )
      ),

    medianGrowthPercentage:
      roundPercent(
        median(
          annualGrowth.map(
            (item) =>
              item
                .growthPercentage
          )
        )
      ),

    annualGrowth,

    series
  };
}

export function buildFundamentalGrowthAnalysis({
  periods = []
} = {}) {
  return {
    revenue:
      buildFundamentalGrowthSeries({
        periods,

        field:
          "revenue"
      }),

    earnings:
      buildFundamentalGrowthSeries({
        periods,

        field:
          "netIncome"
      }),

    earningsPerShare:
      buildFundamentalGrowthSeries({
        periods,

        field:
          "earningsPerShare"
      }),

    bookValuePerShare:
      buildFundamentalGrowthSeries({
        periods,

        field:
          "bookValuePerShare"
      }),

    freeCashFlow:
      buildFundamentalGrowthSeries({
        periods,

        field:
          "freeCashFlow"
      }),

    freeCashFlowPerShare:
      buildFundamentalGrowthSeries({
        periods,

        field:
          "freeCashFlowPerShare"
      }),

    dividends:
      buildFundamentalGrowthSeries({
        periods,

        field:
          "dividendPerShare"
      })
  };
}

/*
 * ============================================================
 * DERIVED FUNDAMENTAL METRICS
 * ============================================================
 */

export function buildDerivedFundamentalMetrics({
  company
} = {}) {
  const normalized =
    normalizeCompanyFundamentals(
      company
    );

  const latest =
    normalized.latestPeriod ||
    {};

  const currentPrice =
    positiveNumber(
      normalized.currentPrice
    );

  const marketCap =
    positiveNumber(
      normalized.marketCapitalization
    );

  const totalDebt =
    nullableNumber(
      latest.totalDebt
    );

  const cash =
    nullableNumber(
      latest.cashAndEquivalents
    );

  const enterpriseValue =
    positiveNumber(
      normalized.enterpriseValue ??
      (
        marketCap !== null &&
        totalDebt !== null &&
        cash !== null
          ? marketCap +
            totalDebt -
            cash
          : null
      )
    );

  const earningsPerShare =
    nullableNumber(
      latest.earningsPerShare
    );

  const bookValuePerShare =
    nullableNumber(
      latest.bookValuePerShare
    );

  const revenuePerShare =
    nullableNumber(
      latest.revenuePerShare
    );

  const freeCashFlowPerShare =
    nullableNumber(
      latest.freeCashFlowPerShare
    );

  const dividendPerShare =
    nullableNumber(
      latest.dividendPerShare
    );

  const ebitda =
    nullableNumber(
      latest.ebitda
    );

  const netDebt =
    totalDebt !== null &&
    cash !== null
      ? totalDebt -
        cash
      : null;

  const peRatio =
    currentPrice !== null &&
    earningsPerShare !== null &&
    earningsPerShare > 0
      ? currentPrice /
        earningsPerShare
      : null;

  const priceToBookRatio =
    currentPrice !== null &&
    bookValuePerShare !== null &&
    bookValuePerShare > 0
      ? currentPrice /
        bookValuePerShare
      : null;

  const priceToSalesRatio =
    currentPrice !== null &&
    revenuePerShare !== null &&
    revenuePerShare > 0
      ? currentPrice /
        revenuePerShare
      : null;

  const evToEbitdaRatio =
    enterpriseValue !== null &&
    ebitda !== null &&
    ebitda > 0
      ? enterpriseValue /
        ebitda
      : null;

  const dividendYieldPercentage =
    currentPrice !== null &&
    dividendPerShare !== null &&
    dividendPerShare >= 0
      ? (
          dividendPerShare /
          currentPrice
        ) *
        100
      : null;

  const freeCashFlowYieldPercentage =
    currentPrice !== null &&
    freeCashFlowPerShare !== null
      ? (
          freeCashFlowPerShare /
          currentPrice
        ) *
        100
      : null;

  const payoutRatioPercentage =
    nullableNumber(
      latest
        .payoutRatioPercentage ??
      (
        dividendPerShare !== null &&
        earningsPerShare !== null &&
        earningsPerShare !== 0
          ? (
              dividendPerShare /
              earningsPerShare
            ) *
            100
          : null
      )
    );

  const dividendCoverageRatio =
    dividendPerShare !== null &&
    dividendPerShare > 0 &&
    earningsPerShare !== null
      ? earningsPerShare /
        dividendPerShare
      : null;

  const freeCashFlowCoverageRatio =
    dividendPerShare !== null &&
    dividendPerShare > 0 &&
    freeCashFlowPerShare !== null
      ? freeCashFlowPerShare /
        dividendPerShare
      : null;

  const netDebtToEbitdaRatio =
    netDebt !== null &&
    ebitda !== null &&
    ebitda !== 0
      ? netDebt /
        ebitda
      : null;

  return {
    currentPrice:
      roundMoney(
        currentPrice
      ),

    marketCapitalization:
      roundMoney(
        marketCap
      ),

    enterpriseValue:
      roundMoney(
        enterpriseValue
      ),

    netDebt:
      roundMoney(
        netDebt
      ),

    sharesOutstanding:
      normalized
        .sharesOutstanding,

    revenue:
      roundMoney(
        latest.revenue
      ),

    netIncome:
      roundMoney(
        latest.netIncome
      ),

    freeCashFlow:
      roundMoney(
        latest.freeCashFlow
      ),

    totalAssets:
      roundMoney(
        latest.totalAssets
      ),

    totalLiabilities:
      roundMoney(
        latest.totalLiabilities
      ),

    totalEquity:
      roundMoney(
        latest.totalEquity
      ),

    totalDebt:
      roundMoney(
        latest.totalDebt
      ),

    cashAndEquivalents:
      roundMoney(
        latest.cashAndEquivalents
      ),

    earningsPerShare:
      roundMetric(
        earningsPerShare
      ),

    bookValuePerShare:
      roundMetric(
        bookValuePerShare
      ),

    revenuePerShare:
      roundMetric(
        revenuePerShare
      ),

    freeCashFlowPerShare:
      roundMetric(
        freeCashFlowPerShare
      ),

    dividendPerShare:
      roundMetric(
        dividendPerShare
      ),

    peRatio:
      roundMetric(
        peRatio
      ),

    priceToBookRatio:
      roundMetric(
        priceToBookRatio
      ),

    priceToSalesRatio:
      roundMetric(
        priceToSalesRatio
      ),

    evToEbitdaRatio:
      roundMetric(
        evToEbitdaRatio
      ),

    dividendYieldPercentage:
      roundPercent(
        dividendYieldPercentage
      ),

    freeCashFlowYieldPercentage:
      roundPercent(
        freeCashFlowYieldPercentage
      ),

    grossMarginPercentage:
      roundPercent(
        latest
          .grossMarginPercentage
      ),

    operatingMarginPercentage:
      roundPercent(
        latest
          .operatingMarginPercentage
      ),

    netMarginPercentage:
      roundPercent(
        latest
          .netMarginPercentage
      ),

    returnOnEquityPercentage:
      roundPercent(
        latest
          .returnOnEquityPercentage
      ),

    returnOnAssetsPercentage:
      roundPercent(
        latest
          .returnOnAssetsPercentage
      ),

    debtToEquityRatio:
      roundMetric(
        latest
          .debtToEquityRatio
      ),

    debtToAssetsRatio:
      roundMetric(
        latest
          .debtToAssetsRatio
      ),

    currentRatio:
      roundMetric(
        latest
          .currentRatio
      ),

    interestCoverageRatio:
      roundMetric(
        latest
          .interestCoverageRatio
      ),

    netDebtToEbitdaRatio:
      roundMetric(
        netDebtToEbitdaRatio
      ),

    payoutRatioPercentage:
      roundPercent(
        payoutRatioPercentage
      ),

    dividendCoverageRatio:
      roundMetric(
        dividendCoverageRatio
      ),

    freeCashFlowCoverageRatio:
      roundMetric(
        freeCashFlowCoverageRatio
      )
  };
}

/*
 * ============================================================
 * DATA QUALITY
 * ============================================================
 */

export function classifyFundamentalDataQuality(
  score
) {
  const value =
    nullableNumber(score);

  if (value === null) {
    return {
      code:
        FUNDAMENTAL_DATA_QUALITY_LEVELS
          .NOT_RATED,

      label:
        "Not Rated"
    };
  }

  if (value >= 90) {
    return {
      code:
        FUNDAMENTAL_DATA_QUALITY_LEVELS
          .EXCELLENT,

      label:
        "Excellent"
    };
  }

  if (value >= 80) {
    return {
      code:
        FUNDAMENTAL_DATA_QUALITY_LEVELS
          .STRONG,

      label:
        "Strong"
    };
  }

  if (value >= 70) {
    return {
      code:
        FUNDAMENTAL_DATA_QUALITY_LEVELS
          .GOOD,

      label:
        "Good"
    };
  }

  if (value >= 55) {
    return {
      code:
        FUNDAMENTAL_DATA_QUALITY_LEVELS
          .FAIR,

      label:
        "Fair"
    };
  }

  if (value >= 40) {
    return {
      code:
        FUNDAMENTAL_DATA_QUALITY_LEVELS
          .WEAK,

      label:
        "Weak"
    };
  }

  return {
    code:
      FUNDAMENTAL_DATA_QUALITY_LEVELS
        .POOR,

    label:
      "Poor"
  };
}

function buildFieldCoverage({
  code,
  label,
  data,
  fields
}) {
  const available =
    fields.filter(
      (field) =>
        data?.[field] !==
          null &&
        data?.[field] !==
          undefined &&
        data?.[field] !==
          ""
    );

  const coverage =
    fields.length
      ? (
          available.length /
          fields.length
        ) *
        100
      : 0;

  return {
    code,

    label,

    score:
      roundScore(
        coverage
      ),

    coveragePercentage:
      roundPercent(
        coverage
      ),

    availableFields:
      available,

    missingFields:
      fields.filter(
        (field) =>
          !available.includes(
            field
          )
      ),

    availableCount:
      available.length,

    totalCount:
      fields.length
  };
}

export function buildFundamentalDataQualityAnalysis({
  company,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const normalized =
    normalizeCompanyFundamentals(
      company
    );

  const metrics =
    buildDerivedFundamentalMetrics({
      company:
        normalized
    });

  const components = [
    buildFieldCoverage({
      code:
        "MARKET_DATA",

      label:
        "Market Data",

      data:
        metrics,

      fields:
        FUNDAMENTAL_FIELDS
          .MARKET
    }),

    buildFieldCoverage({
      code:
        "INCOME_STATEMENT",

      label:
        "Income Statement",

      data:
        normalized.latestPeriod ||
        {},

      fields:
        FUNDAMENTAL_FIELDS
          .INCOME_STATEMENT
    }),

    buildFieldCoverage({
      code:
        "BALANCE_SHEET",

      label:
        "Balance Sheet",

      data:
        normalized.latestPeriod ||
        {},

      fields:
        FUNDAMENTAL_FIELDS
          .BALANCE_SHEET
    }),

    buildFieldCoverage({
      code:
        "CASH_FLOW",

      label:
        "Cash Flow",

      data:
        normalized.latestPeriod ||
        {},

      fields:
        FUNDAMENTAL_FIELDS
          .CASH_FLOW
    }),

    buildFieldCoverage({
      code:
        "PER_SHARE",

      label:
        "Per-Share Metrics",

      data:
        metrics,

      fields:
        FUNDAMENTAL_FIELDS
          .PER_SHARE
    }),

    buildFieldCoverage({
      code:
        "DIVIDENDS",

      label:
        "Dividend Data",

      data:
        metrics,

      fields:
        FUNDAMENTAL_FIELDS
          .DIVIDENDS
    }),

    buildFieldCoverage({
      code:
        "PROFITABILITY",

      label:
        "Profitability",

      data:
        metrics,

      fields:
        FUNDAMENTAL_FIELDS
          .PROFITABILITY
    }),

    buildFieldCoverage({
      code:
        "LEVERAGE",

      label:
        "Leverage",

      data:
        metrics,

      fields:
        FUNDAMENTAL_FIELDS
          .LEVERAGE
    }),

    buildFieldCoverage({
      code:
        "VALUATION",

      label:
        "Valuation Multiples",

      data:
        metrics,

      fields:
        FUNDAMENTAL_FIELDS
          .VALUATION
    })
  ];

  const completenessScore =
    average(
      components.map(
        (component) =>
          component.score
      )
    );

  const periodCount =
    normalized.periods.length;

  const historyScore =
    periodCount >=
      normalizedPolicy
        .preferredAnnualPeriods
      ? 100
      : periodCount >=
          normalizedPolicy
            .minimumAnnualPeriods
        ? 70
        : periodCount === 1
          ? 35
          : 0;

  const authoritativeSources =
    normalized.sources.filter(
      (source) =>
        source.authoritative
    ).length;

  const verifiedSources =
    normalized.sources.filter(
      (source) =>
        source.verified
    ).length;

  const sourceScore =
    normalized.sources.length
      ? Math.min(
          100,
          35 +
          authoritativeSources * 25 +
          verifiedSources * 15
        )
      : 20;

  const marketAgeHours =
    ageInHours(
      normalized
        .priceUpdatedAt
    );

  const financialAgeDays =
    ageInDays(
      normalized
        .financialDataUpdatedAt
    );

  const marketFreshnessScore =
    marketAgeHours === null
      ? 40
      : marketAgeHours <=
          normalizedPolicy
            .maximumMarketDataAgeHours
        ? 100
        : marketAgeHours <=
            normalizedPolicy
              .maximumMarketDataAgeHours *
            3
          ? 60
          : 20;

  const financialFreshnessScore =
    financialAgeDays === null
      ? 40
      : financialAgeDays <=
          normalizedPolicy
            .maximumFinancialDataAgeDays
        ? 100
        : financialAgeDays <=
            normalizedPolicy
              .maximumFinancialDataAgeDays *
            1.5
          ? 60
          : 20;

  const freshnessScore =
    average([
      marketFreshnessScore,
      financialFreshnessScore
    ]);

  const score =
    (
      number(
        completenessScore
      ) *
      0.5
    ) +
    (
      historyScore *
      0.2
    ) +
    (
      sourceScore *
      0.15
    ) +
    (
      number(
        freshnessScore
      ) *
      0.15
    );

  const warnings = [];

  components
    .filter(
      (component) =>
        component.score < 50
    )
    .forEach(
      (component) => {
        warnings.push({
          code:
            `${component.code}_INCOMPLETE`,

          severity:
            FUNDAMENTAL_WARNING_SEVERITIES
              .HIGH,

          title:
            `${component.label} is incomplete`,

          message:
            `${component.missingFields.length} expected field(s) are missing.`,

          source:
            component.code
        });
      }
    );

  if (
    periodCount <
    normalizedPolicy
      .minimumAnnualPeriods
  ) {
    warnings.push({
      code:
        "INSUFFICIENT_HISTORY",

      severity:
        FUNDAMENTAL_WARNING_SEVERITIES
          .HIGH,

      title:
        "Insufficient financial history",

      message:
        `Only ${periodCount} financial period(s) are available.`,

      source:
        "HISTORY"
    });
  }

  if (
    marketAgeHours !== null &&
    marketAgeHours >
      normalizedPolicy
        .maximumMarketDataAgeHours
  ) {
    warnings.push({
      code:
        "STALE_MARKET_DATA",

      severity:
        FUNDAMENTAL_WARNING_SEVERITIES
          .MEDIUM,

      title:
        "Market data may be stale",

      message:
        `Market data is approximately ${roundPercent(
          marketAgeHours
        )} hours old.`,

      source:
        "MARKET_DATA"
    });
  }

  if (
    financialAgeDays !== null &&
    financialAgeDays >
      normalizedPolicy
        .maximumFinancialDataAgeDays
  ) {
    warnings.push({
      code:
        "STALE_FINANCIAL_DATA",

      severity:
        FUNDAMENTAL_WARNING_SEVERITIES
          .HIGH,

      title:
        "Financial data may be stale",

      message:
        `Financial data is approximately ${roundPercent(
          financialAgeDays
        )} days old.`,

      source:
        "FINANCIAL_DATA"
    });
  }

  const quality =
    classifyFundamentalDataQuality(
      score
    );

  let status =
    FUNDAMENTAL_DATA_STATUSES
      .AVAILABLE;

  if (
    completenessScore <
    normalizedPolicy
      .minimumCompletenessPercentage
  ) {
    status =
      FUNDAMENTAL_DATA_STATUSES
        .INSUFFICIENT_DATA;
  } else if (
    marketAgeHours !== null &&
    marketAgeHours >
      normalizedPolicy
        .maximumMarketDataAgeHours ||
    financialAgeDays !== null &&
    financialAgeDays >
      normalizedPolicy
        .maximumFinancialDataAgeDays
  ) {
    status =
      FUNDAMENTAL_DATA_STATUSES
        .STALE_DATA;
  } else if (
    completenessScore <
      normalizedPolicy
        .preferredCompletenessPercentage ||
    periodCount <
      normalizedPolicy
        .preferredAnnualPeriods
  ) {
    status =
      FUNDAMENTAL_DATA_STATUSES
        .PARTIAL;
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    symbol:
      normalized.symbol ||
      null,

    status,

    score:
      roundScore(score),

    classification:
      quality,

    completenessScore:
      roundScore(
        completenessScore
      ),

    historyScore,

    sourceScore:
      roundScore(
        sourceScore
      ),

    freshnessScore:
      roundScore(
        freshnessScore
      ),

    periodCount,

    authoritativeSources,

    verifiedSources,

    marketDataAgeHours:
      roundPercent(
        marketAgeHours
      ),

    financialDataAgeDays:
      roundPercent(
        financialAgeDays
      ),

    components,

    warnings
  };
}

/*
 * ============================================================
 * VALIDATION
 * ============================================================
 */

export function validateCompanyFundamentals({
  company,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const normalized =
    normalizeCompanyFundamentals(
      company
    );

  const latest =
    normalized.latestPeriod ||
    {};

  const errors = [];
  const warnings = [];

  if (!normalized.symbol) {
    errors.push({
      code:
        "MISSING_SYMBOL",

      message:
        "A company symbol is required."
    });
  }

  if (
    normalizedPolicy
      .requirePositiveSharesOutstanding &&
    normalized.sharesOutstanding !==
      null &&
    normalized.sharesOutstanding <= 0
  ) {
    errors.push({
      code:
        "INVALID_SHARES_OUTSTANDING",

      message:
        "Shares outstanding must be positive."
    });
  }

  if (
    latest.totalAssets !==
      null &&
    latest.totalLiabilities !==
      null &&
    latest.totalAssets <
      latest.totalLiabilities
  ) {
    warnings.push({
      code:
        "NEGATIVE_EQUITY",

      severity:
        FUNDAMENTAL_WARNING_SEVERITIES
          .HIGH,

      message:
        "Total liabilities exceed total assets."
    });
  }

  if (
    latest
      .payoutRatioPercentage !==
      null &&
    latest
      .payoutRatioPercentage >
      normalizedPolicy
        .maximumPayoutRatioPercentage
  ) {
    warnings.push({
      code:
        "EXTREME_PAYOUT_RATIO",

      severity:
        FUNDAMENTAL_WARNING_SEVERITIES
          .HIGH,

      message:
        `Payout ratio exceeds ${normalizedPolicy.maximumPayoutRatioPercentage}%.`
    });
  }

  if (
    latest
      .debtToEquityRatio !==
      null &&
    Math.abs(
      latest
        .debtToEquityRatio
    ) >
      normalizedPolicy
        .maximumDebtToEquityRatio
  ) {
    warnings.push({
      code:
        "EXTREME_DEBT_TO_EQUITY",

      severity:
        FUNDAMENTAL_WARNING_SEVERITIES
          .HIGH,

      message:
        "Debt-to-equity ratio is outside the configured validation range."
    });
  }

  if (
    latest.currentRatio !==
      null &&
    latest.currentRatio >
      normalizedPolicy
        .maximumCurrentRatio
  ) {
    warnings.push({
      code:
        "EXTREME_CURRENT_RATIO",

      severity:
        FUNDAMENTAL_WARNING_SEVERITIES
          .MEDIUM,

      message:
        "Current ratio is outside the configured validation range."
    });
  }

  return {
    valid:
      errors.length === 0,

    status:
      errors.length
        ? FUNDAMENTAL_DATA_STATUSES
            .INVALID_DATA
        : warnings.length
          ? FUNDAMENTAL_DATA_STATUSES
              .PARTIAL
          : FUNDAMENTAL_DATA_STATUSES
              .AVAILABLE,

    errors,

    warnings,

    normalized
  };
}

/*
 * ============================================================
 * RESEARCH-READY RECORD
 * ============================================================
 */

export function buildResearchReadyFundamentals({
  company,
  policy = {}
} = {}) {
  const validation =
    validateCompanyFundamentals({
      company,

      policy
    });

  const normalized =
    validation.normalized;

  const metrics =
    buildDerivedFundamentalMetrics({
      company:
        normalized
    });

  const growth =
    buildFundamentalGrowthAnalysis({
      periods:
        normalized.periods
    });

  const quality =
    buildFundamentalDataQualityAnalysis({
      company:
        normalized,

      policy
    });

  const latest =
    normalized.latestPeriod ||
    {};

  return {
    generatedAt:
      new Date()
        .toISOString(),

    symbol:
      normalized.symbol ||
      null,

    name:
      normalized.name,

    sector:
      normalized.sector,

    industry:
      normalized.industry,

    exchange:
      normalized.exchange,

    currency:
      normalized.currency,

    status:
      validation.valid
        ? quality.status
        : FUNDAMENTAL_DATA_STATUSES
            .INVALID_DATA,

    currentPrice:
      metrics.currentPrice,

    marketCapitalization:
      metrics.marketCapitalization,

    enterpriseValue:
      metrics.enterpriseValue,

    sharesOutstanding:
      metrics.sharesOutstanding,

    revenue:
      metrics.revenue,

    currentRevenue:
      metrics.revenue,

    netIncome:
      metrics.netIncome,

    currentEarnings:
      metrics.netIncome,

    freeCashFlow:
      metrics.freeCashFlow,

    currentFreeCashFlow:
      metrics.freeCashFlow,

    totalAssets:
      metrics.totalAssets,

    totalLiabilities:
      metrics.totalLiabilities,

    totalEquity:
      metrics.totalEquity,

    cashAndEquivalents:
      metrics.cashAndEquivalents,

    totalDebt:
      metrics.totalDebt,

    netDebt:
      metrics.netDebt,

    earningsPerShare:
      metrics.earningsPerShare,

    currentEarningsPerShare:
      metrics.earningsPerShare,

    bookValuePerShare:
      metrics.bookValuePerShare,

    revenuePerShare:
      metrics.revenuePerShare,

    freeCashFlowPerShare:
      metrics.freeCashFlowPerShare,

    dividendPerShare:
      metrics.dividendPerShare,

    currentDividendPerShare:
      metrics.dividendPerShare,

    peRatio:
      metrics.peRatio,

    priceToBookRatio:
      metrics.priceToBookRatio,

    priceToSalesRatio:
      metrics.priceToSalesRatio,

    evToEbitdaRatio:
      metrics.evToEbitdaRatio,

    dividendYieldPercentage:
      metrics
        .dividendYieldPercentage,

    freeCashFlowYieldPercentage:
      metrics
        .freeCashFlowYieldPercentage,

    grossMarginPercentage:
      metrics
        .grossMarginPercentage,

    operatingMarginPercentage:
      metrics
        .operatingMarginPercentage,

    netMarginPercentage:
      metrics
        .netMarginPercentage,

    returnOnEquityPercentage:
      metrics
        .returnOnEquityPercentage,

    returnOnAssetsPercentage:
      metrics
        .returnOnAssetsPercentage,

    debtToEquityRatio:
      metrics
        .debtToEquityRatio,

    debtToAssetsRatio:
      metrics
        .debtToAssetsRatio,

    currentRatio:
      metrics.currentRatio,

    interestCoverageRatio:
      metrics
        .interestCoverageRatio,

    netDebtToEbitdaRatio:
      metrics
        .netDebtToEbitdaRatio,

    payoutRatioPercentage:
      metrics
        .payoutRatioPercentage,

    dividendCoverageRatio:
      metrics
        .dividendCoverageRatio,

    freeCashFlowCoverageRatio:
      metrics
        .freeCashFlowCoverageRatio,

    revenueGrowthPercentage:
      growth
        .revenue
        .cagrPercentage,

    earningsGrowthPercentage:
      growth
        .earningsPerShare
        .cagrPercentage ??
      growth
        .earnings
        .cagrPercentage,

    freeCashFlowGrowthPercentage:
      growth
        .freeCashFlowPerShare
        .cagrPercentage ??
      growth
        .freeCashFlow
        .cagrPercentage,

    dividendGrowthPercentage:
      growth
        .dividends
        .cagrPercentage,

    historicalRevenue:
      growth
        .revenue
        .series,

    historicalEarnings:
      growth
        .earnings
        .series,

    historicalEarningsPerShare:
      growth
        .earningsPerShare
        .series,

    historicalFreeCashFlow:
      growth
        .freeCashFlow
        .series,

    historicalDividends:
      growth
        .dividends
        .series,

    periods:
      normalized.periods,

    researchSources:
      normalized.sources,

    sources:
      normalized.sources,

    marketDataUpdatedAt:
      normalized.priceUpdatedAt,

    financialDataUpdatedAt:
      normalized
        .financialDataUpdatedAt,

    dividendDataUpdatedAt:
      normalized
        .dividendDataUpdatedAt,

    dataQualityScore:
      quality.score,

    dataQuality:
      quality,

    validation: {
      valid:
        validation.valid,

      errors:
        validation.errors,

      warnings:
        validation.warnings
    },

    latestPeriod:
      latest,

    growth,

    metrics,

    metadata:
      normalized.metadata,

    advisoryOnly:
      true
  };
}

/*
 * ============================================================
 * BATCH PROCESSING
 * ============================================================
 */

export function buildResearchReadyFundamentalsBatch({
  companies = [],
  policy = {}
} = {}) {
  const results =
    safeArray(companies).map(
      (company) =>
        buildResearchReadyFundamentals({
          company,

          policy
        })
    );

  const available =
    results.filter(
      (result) =>
        [
          FUNDAMENTAL_DATA_STATUSES
            .AVAILABLE,
          FUNDAMENTAL_DATA_STATUSES
            .PARTIAL,
          FUNDAMENTAL_DATA_STATUSES
            .STALE_DATA
        ].includes(
          result?.status
        )
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      results.length
        ? FUNDAMENTAL_DATA_STATUSES
            .AVAILABLE
        : FUNDAMENTAL_DATA_STATUSES
            .INSUFFICIENT_DATA,

    total:
      results.length,

    available:
      available.length,

    unavailable:
      results.length -
      available.length,

    averageDataQualityScore:
      roundPercent(
        average(
          results.map(
            (result) =>
              result
                ?.dataQualityScore
          )
        )
      ),

    results:
      results.sort(
        (first, second) =>
          number(
            second
              ?.dataQualityScore
          ) -
          number(
            first
              ?.dataQualityScore
          )
      )
  };
}

/*
 * ============================================================
 * PROVIDER ADAPTER REGISTRY
 * ============================================================
 */

const providerAdapters =
  new Map();

export function registerFundamentalDataProvider({
  id,
  normalize
} = {}) {
  const providerId =
    normalizeCode(id);

  if (
    !providerId ||
    typeof normalize !==
      "function"
  ) {
    throw new Error(
      "Provider id and normalize function are required."
    );
  }

  providerAdapters.set(
    providerId,
    normalize
  );

  return providerId;
}

export function unregisterFundamentalDataProvider(
  id
) {
  return providerAdapters.delete(
    normalizeCode(id)
  );
}

export function listFundamentalDataProviders() {
  return Array.from(
    providerAdapters.keys()
  );
}

export function normalizeProviderFundamentals({
  providerId,
  payload
} = {}) {
  const id =
    normalizeCode(providerId);

  const adapter =
    providerAdapters.get(id);

  if (!adapter) {
    throw new Error(
      `No fundamental-data adapter is registered for ${id}.`
    );
  }

  return adapter(payload);
}

/*
 * ============================================================
 * IN-MEMORY FUNDAMENTAL STORE
 * ============================================================
 */

const fundamentalStore =
  new Map();

export function saveCompanyFundamentals({
  company,
  policy = {}
} = {}) {
  const record =
    buildResearchReadyFundamentals({
      company,

      policy
    });

  if (!record.symbol) {
    throw new Error(
      "A company symbol is required."
    );
  }

  fundamentalStore.set(
    record.symbol,
    record
  );

  return record;
}

export function saveCompanyFundamentalsBatch({
  companies = [],
  policy = {}
} = {}) {
  return safeArray(companies).map(
    (company) =>
      saveCompanyFundamentals({
        company,

        policy
      })
  );
}

export function loadCompanyFundamentals(
  symbol
) {
  return fundamentalStore.get(
    normalizeSymbol(symbol)
  ) || null;
}

export function loadAllCompanyFundamentals() {
  return Array.from(
    fundamentalStore.values()
  );
}

export function deleteCompanyFundamentals(
  symbol
) {
  return fundamentalStore.delete(
    normalizeSymbol(symbol)
  );
}

export function clearCompanyFundamentals() {
  fundamentalStore.clear();

  return true;
}

/*
 * ============================================================
 * MERGING AND UPDATE
 * ============================================================
 */

export function mergeCompanyFundamentals({
  existing,
  incoming
} = {}) {
  const current =
    normalizeCompanyFundamentals(
      existing ||
      {}
    );

  const next =
    normalizeCompanyFundamentals(
      incoming ||
      {}
    );

  const periods =
    new Map();

  [
    ...current.periods,
    ...next.periods
  ].forEach(
    (period) => {
      const key =
        `${period.fiscalYear || "UNKNOWN"}-${period.periodType}`;

      periods.set(
        key,
        period
      );
    }
  );

  return normalizeCompanyFundamentals({
    ...current,

    ...next,

    symbol:
      next.symbol ||
      current.symbol,

    name:
      next.name ||
      current.name,

    sector:
      next.sector !==
        "Unknown"
        ? next.sector
        : current.sector,

    industry:
      next.industry !==
        "Unknown"
        ? next.industry
        : current.industry,

    periods:
      Array.from(
        periods.values()
      ),

    sources: [
      ...current.sources,
      ...next.sources
    ],

    metadata: {
      ...current.metadata,
      ...next.metadata
    }
  });
}

export function updateCompanyFundamentals({
  symbol,
  incoming,
  policy = {}
} = {}) {
  const existing =
    loadCompanyFundamentals(
      symbol
    );

  const merged =
    mergeCompanyFundamentals({
      existing:
        existing ||
        {
          symbol
        },

      incoming: {
        ...incoming,

        symbol:
          incoming?.symbol ||
          symbol
      }
    });

  return saveCompanyFundamentals({
    company:
      merged,

    policy
  });
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export function loadHighestQualityFundamentals(
  records = [],
  limit = 10
) {
  return safeArray(records)
    .sort(
      (first, second) =>
        number(
          second
            ?.dataQualityScore
        ) -
        number(
          first
            ?.dataQualityScore
        )
    )
    .slice(
      0,
      Math.max(
        Math.floor(
          number(limit)
        ),
        0
      )
    );
}

export function loadLowestQualityFundamentals(
  records = [],
  limit = 10
) {
  return safeArray(records)
    .sort(
      (first, second) =>
        number(
          first
            ?.dataQualityScore
        ) -
        number(
          second
            ?.dataQualityScore
        )
    )
    .slice(
      0,
      Math.max(
        Math.floor(
          number(limit)
        ),
        0
      )
    );
}

export function loadFundamentalsWithWarnings(
  records = []
) {
  return safeArray(records).filter(
    (record) =>
      safeArray(
        record
          ?.dataQuality
          ?.warnings
      ).length > 0 ||
      safeArray(
        record
          ?.validation
          ?.warnings
      ).length > 0
  );
}

export function loadFundamentalsMissingValuationInputs(
  records = []
) {
  return safeArray(records).filter(
    (record) => {
      const available = [
        record
          ?.earningsPerShare,
        record
          ?.bookValuePerShare,
        record
          ?.freeCashFlowPerShare,
        record
          ?.dividendPerShare,
        record
          ?.sharesOutstanding
      ].filter(
        (value) =>
          value !==
            null &&
          value !==
            undefined
      ).length;

      return available < 3;
    }
  );
}

export function loadFundamentalsBySector({
  records = [],
  sector
} = {}) {
  const target =
    normalizeText(sector)
      .toUpperCase();

  return safeArray(records).filter(
    (record) =>
      normalizeText(
        record?.sector
      ).toUpperCase() ===
      target
  );
}

export function buildFundamentalDataSummary(
  record
) {
  return {
    symbol:
      record?.symbol ||
      null,

    name:
      record?.name ||
      null,

    sector:
      record?.sector ||
      "Unknown",

    status:
      record?.status ||
      FUNDAMENTAL_DATA_STATUSES
        .INSUFFICIENT_DATA,

    currentPrice:
      record?.currentPrice ??
      null,

    earningsPerShare:
      record
        ?.earningsPerShare ??
      null,

    bookValuePerShare:
      record
        ?.bookValuePerShare ??
      null,

    freeCashFlowPerShare:
      record
        ?.freeCashFlowPerShare ??
      null,

    dividendPerShare:
      record
        ?.dividendPerShare ??
      null,

    peRatio:
      record?.peRatio ??
      null,

    priceToBookRatio:
      record
        ?.priceToBookRatio ??
      null,

    dividendYieldPercentage:
      record
        ?.dividendYieldPercentage ??
      null,

    revenueGrowthPercentage:
      record
        ?.revenueGrowthPercentage ??
      null,

    earningsGrowthPercentage:
      record
        ?.earningsGrowthPercentage ??
      null,

    dividendGrowthPercentage:
      record
        ?.dividendGrowthPercentage ??
      null,

    dataQualityScore:
      record
        ?.dataQualityScore ??
      null,

    dataQuality:
      record
        ?.dataQuality
        ?.classification
        ?.label ||
      "Not Rated",

    warningCount:
      safeArray(
        record
          ?.dataQuality
          ?.warnings
      ).length,

    periodCount:
      safeArray(
        record?.periods
      ).length
  };
}
