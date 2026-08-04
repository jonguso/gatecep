import {
  buildResearchReadyFundamentals,
  buildResearchReadyFundamentalsBatch
} from "../fundamentalDataEngine";

/*
 * ============================================================
 * PC-025A
 * NSE FUNDAMENTAL DATASET GENERATOR
 * ============================================================
 *
 * Purpose:
 *
 * - convert verified company filings or imported records into
 *   a consistent NSE fundamental dataset,
 * - generate repository-ready JSON,
 * - generate row-based CSV,
 * - calculate derived research fields through PC-024A,
 * - preserve source provenance,
 * - flag incomplete or conflicting records,
 * - never fabricate missing values.
 *
 * This module does not scrape websites and does not create
 * financial facts that are not present in supplied source data.
 * ============================================================
 */

export const NSE_DATASET_STATUSES = {
  READY: "READY",
  PARTIAL: "PARTIAL",
  EMPTY: "EMPTY",
  INVALID: "INVALID",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA"
};

export const NSE_DATASET_EXPORT_FORMATS = {
  RESEARCH_JSON: "RESEARCH_JSON",
  NORMALIZED_JSON: "NORMALIZED_JSON",
  ANNUAL_ROWS: "ANNUAL_ROWS",
  CSV: "CSV"
};

export const DEFAULT_NSE_DATASET_POLICY = {
  includeIdentityOnlyRecords: false,
  includeInvalidRecords: false,
  includeWarnings: true,
  includePeriods: true,
  includeSources: true,
  minimumDataQualityScore: 0,
  preferredMinimumPeriods: 3
};

const CSV_HEADERS = [
  "symbol",
  "name",
  "sector",
  "industry",
  "exchange",
  "currency",
  "fiscal_year",
  "period_type",
  "period_end",
  "current_price",
  "price_updated_at",
  "shares_outstanding",
  "market_capitalization",
  "enterprise_value",
  "revenue",
  "gross_profit",
  "operating_income",
  "ebitda",
  "net_income",
  "total_assets",
  "total_liabilities",
  "total_equity",
  "cash_and_equivalents",
  "total_debt",
  "current_assets",
  "current_liabilities",
  "operating_cash_flow",
  "capital_expenditure",
  "free_cash_flow",
  "earnings_per_share",
  "book_value_per_share",
  "revenue_per_share",
  "free_cash_flow_per_share",
  "dividend_per_share",
  "dividends_paid",
  "payout_ratio_percentage",
  "gross_margin_percentage",
  "operating_margin_percentage",
  "net_margin_percentage",
  "return_on_equity_percentage",
  "return_on_assets_percentage",
  "debt_to_equity_ratio",
  "current_ratio",
  "interest_coverage_ratio",
  "data_quality_score",
  "fundamental_status",
  "source_name",
  "source_type",
  "source_url",
  "source_published_at"
];

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

function normalizeCode(value) {
  return String(value || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
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

function number(value) {
  return nullableNumber(value) ?? 0;
}

function average(values = []) {
  const valid = safeArray(values)
    .map(nullableNumber)
    .filter(
      (value) =>
        value !== null
    );

  if (!valid.length) {
    return null;
  }

  return valid.reduce(
    (total, value) =>
      total + value,
    0
  ) / valid.length;
}

function normalizePolicy(policy = {}) {
  return {
    includeIdentityOnlyRecords:
      Boolean(
        policy?.includeIdentityOnlyRecords
      ),

    includeInvalidRecords:
      Boolean(
        policy?.includeInvalidRecords
      ),

    includeWarnings:
      policy?.includeWarnings !== false,

    includePeriods:
      policy?.includePeriods !== false,

    includeSources:
      policy?.includeSources !== false,

    minimumDataQualityScore:
      Math.max(
        number(
          policy?.minimumDataQualityScore ??
          DEFAULT_NSE_DATASET_POLICY
            .minimumDataQualityScore
        ),
        0
      ),

    preferredMinimumPeriods:
      Math.max(
        Math.floor(
          number(
            policy?.preferredMinimumPeriods ??
            DEFAULT_NSE_DATASET_POLICY
              .preferredMinimumPeriods
          )
        ),
        1
      )
  };
}

function hasResearchEvidence(record) {
  return [
    record?.earningsPerShare,
    record?.bookValuePerShare,
    record?.freeCashFlowPerShare,
    record?.dividendPerShare,
    record?.revenue,
    record?.netIncome,
    record?.freeCashFlow
  ].some(
    (value) =>
      value !== null &&
      value !== undefined
  );
}

function isValidRecord(record) {
  return Boolean(
    record?.symbol &&
    record?.validation?.valid
  );
}

function buildDatasetRecord({
  record,
  policy
}) {
  const result = {
    symbol:
      normalizeSymbol(
        record?.symbol
      ),

    name:
      record?.name ||
      null,

    sector:
      record?.sector ||
      "Unknown",

    industry:
      record?.industry ||
      "Unknown",

    exchange:
      record?.exchange ||
      "NSE",

    currency:
      record?.currency ||
      "KES",

    status:
      record?.status ||
      "INSUFFICIENT_DATA",

    currentPrice:
      record?.currentPrice ??
      null,

    priceUpdatedAt:
      record?.marketDataUpdatedAt ??
      null,

    financialDataUpdatedAt:
      record?.financialDataUpdatedAt ??
      null,

    dividendDataUpdatedAt:
      record?.dividendDataUpdatedAt ??
      null,

    sharesOutstanding:
      record?.sharesOutstanding ??
      null,

    marketCapitalization:
      record?.marketCapitalization ??
      null,

    enterpriseValue:
      record?.enterpriseValue ??
      null,

    revenue:
      record?.revenue ??
      null,

    netIncome:
      record?.netIncome ??
      null,

    freeCashFlow:
      record?.freeCashFlow ??
      null,

    totalAssets:
      record?.totalAssets ??
      null,

    totalLiabilities:
      record?.totalLiabilities ??
      null,

    totalEquity:
      record?.totalEquity ??
      null,

    totalDebt:
      record?.totalDebt ??
      null,

    cashAndEquivalents:
      record?.cashAndEquivalents ??
      null,

    earningsPerShare:
      record?.earningsPerShare ??
      null,

    bookValuePerShare:
      record?.bookValuePerShare ??
      null,

    revenuePerShare:
      record?.revenuePerShare ??
      null,

    freeCashFlowPerShare:
      record?.freeCashFlowPerShare ??
      null,

    dividendPerShare:
      record?.dividendPerShare ??
      null,

    peRatio:
      record?.peRatio ??
      null,

    priceToBookRatio:
      record?.priceToBookRatio ??
      null,

    priceToSalesRatio:
      record?.priceToSalesRatio ??
      null,

    evToEbitdaRatio:
      record?.evToEbitdaRatio ??
      null,

    dividendYieldPercentage:
      record?.dividendYieldPercentage ??
      null,

    freeCashFlowYieldPercentage:
      record?.freeCashFlowYieldPercentage ??
      null,

    grossMarginPercentage:
      record?.grossMarginPercentage ??
      null,

    operatingMarginPercentage:
      record?.operatingMarginPercentage ??
      null,

    netMarginPercentage:
      record?.netMarginPercentage ??
      null,

    returnOnEquityPercentage:
      record?.returnOnEquityPercentage ??
      null,

    returnOnAssetsPercentage:
      record?.returnOnAssetsPercentage ??
      null,

    debtToEquityRatio:
      record?.debtToEquityRatio ??
      null,

    currentRatio:
      record?.currentRatio ??
      null,

    interestCoverageRatio:
      record?.interestCoverageRatio ??
      null,

    payoutRatioPercentage:
      record?.payoutRatioPercentage ??
      null,

    dividendCoverageRatio:
      record?.dividendCoverageRatio ??
      null,

    revenueGrowthPercentage:
      record?.revenueGrowthPercentage ??
      null,

    earningsGrowthPercentage:
      record?.earningsGrowthPercentage ??
      null,

    freeCashFlowGrowthPercentage:
      record?.freeCashFlowGrowthPercentage ??
      null,

    dividendGrowthPercentage:
      record?.dividendGrowthPercentage ??
      null,

    dataQualityScore:
      record?.dataQualityScore ??
      null,

    dataQuality:
      record?.dataQuality ??
      null,

    validation:
      record?.validation ??
      null,

    metadata:
      record?.metadata ??
      {}
  };

  if (policy.includePeriods) {
    result.periods =
      safeArray(
        record?.periods
      );
  }

  if (policy.includeSources) {
    result.sources =
      safeArray(
        record?.researchSources ??
        record?.sources
      );
  }

  if (policy.includeWarnings) {
    result.warnings = [
      ...safeArray(
        record?.dataQuality?.warnings
      ),
      ...safeArray(
        record?.validation?.warnings
      )
    ];
  }

  return result;
}

/*
 * ============================================================
 * DATASET GENERATION
 * ============================================================
 */

export function buildNseFundamentalDataset({
  companies = [],
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const batch =
    buildResearchReadyFundamentalsBatch({
      companies
    });

  const excluded = [];

  const records =
    batch.results.filter(
      (record) => {
        if (
          !normalizedPolicy
            .includeInvalidRecords &&
          !isValidRecord(record)
        ) {
          excluded.push({
            symbol:
              record?.symbol ||
              null,

            reason:
              "INVALID_RECORD"
          });

          return false;
        }

        if (
          !normalizedPolicy
            .includeIdentityOnlyRecords &&
          !hasResearchEvidence(record)
        ) {
          excluded.push({
            symbol:
              record?.symbol ||
              null,

            reason:
              "IDENTITY_ONLY"
          });

          return false;
        }

        if (
          number(
            record?.dataQualityScore
          ) <
          normalizedPolicy
            .minimumDataQualityScore
        ) {
          excluded.push({
            symbol:
              record?.symbol ||
              null,

            reason:
              "BELOW_MINIMUM_QUALITY"
          });

          return false;
        }

        return true;
      }
    )
    .map(
      (record) =>
        buildDatasetRecord({
          record,
          policy:
            normalizedPolicy
        })
    );

  const researchReady =
    records.filter(
      hasResearchEvidence
    );

  const averageQuality =
    average(
      records.map(
        (record) =>
          record
            ?.dataQualityScore
      )
    );

  let status =
    NSE_DATASET_STATUSES
      .READY;

  if (!records.length) {
    status =
      companies.length
        ? NSE_DATASET_STATUSES
            .INSUFFICIENT_DATA
        : NSE_DATASET_STATUSES
            .EMPTY;
  } else if (
    records.length <
    companies.length
  ) {
    status =
      NSE_DATASET_STATUSES
        .PARTIAL;
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    datasetVersion:
      "PC-025A-1",

    status,

    exchange:
      "NSE",

    currency:
      "KES",

    summary: {
      received:
        safeArray(
          companies
        ).length,

      included:
        records.length,

      excluded:
        excluded.length,

      researchReady:
        researchReady.length,

      averageDataQualityScore:
        averageQuality === null
          ? null
          : Number(
              averageQuality.toFixed(2)
            )
    },

    records,

    excluded,

    policy:
      normalizedPolicy,

    safeguards: {
      missingValuesFabricated:
        false,

      portfolioModified:
        false,

      brokerOrdersSubmitted:
        false,

      advisoryOnly:
        true
    }
  };
}

/*
 * ============================================================
 * NORMALIZED JSON EXPORT
 * ============================================================
 */

export function buildNormalizedFundamentalJson(
  dataset
) {
  return {
    datasetVersion:
      dataset?.datasetVersion ||
      "PC-025A-1",

    generatedAt:
      dataset?.generatedAt ||
      new Date()
        .toISOString(),

    exchange:
      dataset?.exchange ||
      "NSE",

    currency:
      dataset?.currency ||
      "KES",

    companies:
      safeArray(
        dataset?.records
      ).map(
        (record) => ({
          symbol:
            record?.symbol,

          name:
            record?.name,

          sector:
            record?.sector,

          industry:
            record?.industry,

          exchange:
            record?.exchange,

          currency:
            record?.currency,

          currentPrice:
            record?.currentPrice,

          priceUpdatedAt:
            record?.priceUpdatedAt,

          financialDataUpdatedAt:
            record
              ?.financialDataUpdatedAt,

          dividendDataUpdatedAt:
            record
              ?.dividendDataUpdatedAt,

          sharesOutstanding:
            record
              ?.sharesOutstanding,

          marketCapitalization:
            record
              ?.marketCapitalization,

          enterpriseValue:
            record
              ?.enterpriseValue,

          periods:
            safeArray(
              record?.periods
            ),

          sources:
            safeArray(
              record?.sources
            ),

          metadata: {
            ...(record?.metadata || {}),

            dataQualityScore:
              record
                ?.dataQualityScore ??
              null
          }
        })
      )
  };
}

/*
 * ============================================================
 * ANNUAL ROW EXPORT
 * ============================================================
 */

export function buildNseFundamentalAnnualRows(
  dataset
) {
  const rows = [];

  safeArray(
    dataset?.records
  ).forEach(
    (record) => {
      const periods =
        safeArray(
          record?.periods
        );

      if (!periods.length) {
        rows.push(
          buildAnnualRow({
            record,
            period:
              null
          })
        );

        return;
      }

      periods.forEach(
        (period) => {
          rows.push(
            buildAnnualRow({
              record,
              period
            })
          );
        }
      );
    }
  );

  return rows;
}

function buildAnnualRow({
  record,
  period
}) {
  const source =
    safeArray(
      record?.sources
    )[0] ||
    period?.source ||
    {};

  return {
    symbol:
      record?.symbol ??
      null,

    name:
      record?.name ??
      null,

    sector:
      record?.sector ??
      null,

    industry:
      record?.industry ??
      null,

    exchange:
      record?.exchange ??
      "NSE",

    currency:
      period?.currency ??
      record?.currency ??
      "KES",

    fiscal_year:
      period?.fiscalYear ??
      null,

    period_type:
      period?.periodType ??
      null,

    period_end:
      period?.periodEnd ??
      null,

    current_price:
      record?.currentPrice ??
      null,

    price_updated_at:
      record?.priceUpdatedAt ??
      null,

    shares_outstanding:
      period?.sharesOutstanding ??
      record?.sharesOutstanding ??
      null,

    market_capitalization:
      record?.marketCapitalization ??
      null,

    enterprise_value:
      record?.enterpriseValue ??
      null,

    revenue:
      period?.revenue ??
      null,

    gross_profit:
      period?.grossProfit ??
      null,

    operating_income:
      period?.operatingIncome ??
      null,

    ebitda:
      period?.ebitda ??
      null,

    net_income:
      period?.netIncome ??
      null,

    total_assets:
      period?.totalAssets ??
      null,

    total_liabilities:
      period?.totalLiabilities ??
      null,

    total_equity:
      period?.totalEquity ??
      null,

    cash_and_equivalents:
      period?.cashAndEquivalents ??
      null,

    total_debt:
      period?.totalDebt ??
      null,

    current_assets:
      period?.currentAssets ??
      null,

    current_liabilities:
      period?.currentLiabilities ??
      null,

    operating_cash_flow:
      period?.operatingCashFlow ??
      null,

    capital_expenditure:
      period?.capitalExpenditure ??
      null,

    free_cash_flow:
      period?.freeCashFlow ??
      null,

    earnings_per_share:
      period?.earningsPerShare ??
      null,

    book_value_per_share:
      period?.bookValuePerShare ??
      null,

    revenue_per_share:
      period?.revenuePerShare ??
      null,

    free_cash_flow_per_share:
      period?.freeCashFlowPerShare ??
      null,

    dividend_per_share:
      period?.dividendPerShare ??
      null,

    dividends_paid:
      period?.dividendsPaid ??
      null,

    payout_ratio_percentage:
      period?.payoutRatioPercentage ??
      null,

    gross_margin_percentage:
      period?.grossMarginPercentage ??
      null,

    operating_margin_percentage:
      period?.operatingMarginPercentage ??
      null,

    net_margin_percentage:
      period?.netMarginPercentage ??
      null,

    return_on_equity_percentage:
      period?.returnOnEquityPercentage ??
      null,

    return_on_assets_percentage:
      period?.returnOnAssetsPercentage ??
      null,

    debt_to_equity_ratio:
      period?.debtToEquityRatio ??
      null,

    current_ratio:
      period?.currentRatio ??
      null,

    interest_coverage_ratio:
      period?.interestCoverageRatio ??
      null,

    data_quality_score:
      record?.dataQualityScore ??
      null,

    fundamental_status:
      record?.status ??
      null,

    source_name:
      source?.name ??
      null,

    source_type:
      source?.type ??
      null,

    source_url:
      source?.url ??
      null,

    source_published_at:
      source?.publishedAt ??
      null
  };
}

/*
 * ============================================================
 * CSV EXPORT
 * ============================================================
 */

function escapeCsvValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const text =
    typeof value ===
      "object"
      ? JSON.stringify(value)
      : String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replaceAll(
      '"',
      '""'
    )}"`;
  }

  return text;
}

export function buildNseFundamentalCsv(
  dataset
) {
  const rows =
    buildNseFundamentalAnnualRows(
      dataset
    );

  const lines = [
    CSV_HEADERS.join(",")
  ];

  rows.forEach(
    (row) => {
      lines.push(
        CSV_HEADERS
          .map(
            (header) =>
              escapeCsvValue(
                row?.[header]
              )
          )
          .join(",")
      );
    }
  );

  return `${lines.join("\n")}\n`;
}

/*
 * ============================================================
 * EXPORT ORCHESTRATION
 * ============================================================
 */

export function exportNseFundamentalDataset({
  dataset,
  format
} = {}) {
  const normalizedFormat =
    normalizeCode(format);

  if (
    normalizedFormat ===
    NSE_DATASET_EXPORT_FORMATS
      .RESEARCH_JSON
  ) {
    return {
      format:
        normalizedFormat,

      mediaType:
        "application/json",

      extension:
        "json",

      data:
        JSON.stringify(
          dataset,
          null,
          2
        )
    };
  }

  if (
    normalizedFormat ===
    NSE_DATASET_EXPORT_FORMATS
      .NORMALIZED_JSON
  ) {
    return {
      format:
        normalizedFormat,

      mediaType:
        "application/json",

      extension:
        "json",

      data:
        JSON.stringify(
          buildNormalizedFundamentalJson(
            dataset
          ),
          null,
          2
        )
    };
  }

  if (
    normalizedFormat ===
    NSE_DATASET_EXPORT_FORMATS
      .ANNUAL_ROWS
  ) {
    return {
      format:
        normalizedFormat,

      mediaType:
        "application/json",

      extension:
        "json",

      data:
        JSON.stringify(
          buildNseFundamentalAnnualRows(
            dataset
          ),
          null,
          2
        )
    };
  }

  if (
    normalizedFormat ===
    NSE_DATASET_EXPORT_FORMATS
      .CSV
  ) {
    return {
      format:
        normalizedFormat,

      mediaType:
        "text/csv",

      extension:
        "csv",

      data:
        buildNseFundamentalCsv(
          dataset
        )
    };
  }

  throw new Error(
    `Unsupported NSE dataset export format: ${normalizedFormat}.`
  );
}

/*
 * ============================================================
 * DATASET SUMMARY
 * ============================================================
 */

export function buildNseFundamentalDatasetSummary(
  dataset
) {
  const records =
    safeArray(
      dataset?.records
    );

  return {
    datasetVersion:
      dataset?.datasetVersion ||
      null,

    generatedAt:
      dataset?.generatedAt ||
      null,

    status:
      dataset?.status ||
      NSE_DATASET_STATUSES
        .EMPTY,

    received:
      dataset
        ?.summary
        ?.received ??
      0,

    included:
      dataset
        ?.summary
        ?.included ??
      records.length,

    excluded:
      dataset
        ?.summary
        ?.excluded ??
      0,

    researchReady:
      dataset
        ?.summary
        ?.researchReady ??
      records.filter(
        hasResearchEvidence
      ).length,

    averageDataQualityScore:
      dataset
        ?.summary
        ?.averageDataQualityScore ??
      null,

    symbols:
      records.map(
        (record) =>
          record?.symbol
      )
  };
}
