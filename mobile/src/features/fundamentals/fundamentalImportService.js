import {
  buildResearchReadyFundamentals,
  normalizeCompanyFundamentals,
  registerFundamentalDataProvider
} from "./fundamentalDataEngine";

import {
  loadFundamentalRecords,
  mergeAndSaveFundamentalRecord,
  saveFundamentalRecordBatch
} from "./fundamentalRepository";

/*
 * ============================================================
 * PC-024C
 * FUNDAMENTAL DATA IMPORT AND PROVIDER ADAPTER SERVICE
 * ============================================================
 *
 * Accepts:
 *
 * - normalized JSON objects,
 * - provider-specific JSON payloads,
 * - CSV text,
 * - row-based spreadsheet exports,
 * - annual financial-statement records.
 *
 * Responsibilities:
 *
 * - identify symbols,
 * - map external fields,
 * - group annual records,
 * - validate imports,
 * - preserve null values,
 * - reject malformed records,
 * - preview before saving,
 * - merge verified imports into PC-024B,
 * - register reusable provider adapters.
 *
 * Safeguards:
 *
 * - does not fabricate missing financial values,
 * - never interprets blank cells as zero,
 * - supports dry-run preview,
 * - records import errors and warnings,
 * - does not alter portfolio or broker data.
 * ============================================================
 */

export const FUNDAMENTAL_IMPORT_STATUSES = {
  READY: "READY",
  IMPORTED: "IMPORTED",
  PARTIAL: "PARTIAL",
  FAILED: "FAILED",
  EMPTY: "EMPTY",
  INVALID_FORMAT: "INVALID_FORMAT",
  VALIDATION_REQUIRED: "VALIDATION_REQUIRED"
};

export const FUNDAMENTAL_IMPORT_FORMATS = {
  NORMALIZED_JSON: "NORMALIZED_JSON",
  PROVIDER_JSON: "PROVIDER_JSON",
  ROWS: "ROWS",
  CSV: "CSV"
};

export const FUNDAMENTAL_IMPORT_MODES = {
  PREVIEW: "PREVIEW",
  MERGE: "MERGE",
  REPLACE: "REPLACE"
};

export const DEFAULT_IMPORT_POLICY = {
  requireSymbol: true,
  requireAtLeastOneFinancialMetric: true,
  allowIdentityOnlyRecords: false,
  maximumRows: 10000,
  trimText: true,
  ignoreUnknownFields: true,
  mergeExistingRecords: true
};

const DEFAULT_FIELD_ALIASES = {
  symbol: [
    "symbol",
    "ticker",
    "security_code",
    "securitycode",
    "stock_code",
    "stockcode"
  ],

  name: [
    "name",
    "company_name",
    "companyname",
    "issuer",
    "issuer_name"
  ],

  sector: [
    "sector",
    "industry_sector",
    "market_sector"
  ],

  industry: [
    "industry",
    "subsector",
    "sub_sector"
  ],

  exchange: [
    "exchange",
    "market"
  ],

  currency: [
    "currency",
    "reporting_currency"
  ],

  fiscalYear: [
    "fiscal_year",
    "fiscalyear",
    "year",
    "financial_year",
    "financialyear"
  ],

  periodType: [
    "period_type",
    "periodtype",
    "report_type"
  ],

  periodEnd: [
    "period_end",
    "periodend",
    "reporting_date",
    "reportingdate",
    "financial_date"
  ],

  currentPrice: [
    "current_price",
    "currentprice",
    "price",
    "market_price",
    "marketprice"
  ],

  priceUpdatedAt: [
    "price_updated_at",
    "priceupdatedat",
    "market_data_updated_at"
  ],

  sharesOutstanding: [
    "shares_outstanding",
    "sharesoutstanding",
    "issued_shares",
    "issuedshares"
  ],

  marketCapitalization: [
    "market_capitalization",
    "marketcapitalization",
    "market_cap",
    "marketcap"
  ],

  enterpriseValue: [
    "enterprise_value",
    "enterprisevalue"
  ],

  revenue: [
    "revenue",
    "sales",
    "turnover"
  ],

  grossProfit: [
    "gross_profit",
    "grossprofit"
  ],

  operatingIncome: [
    "operating_income",
    "operatingincome",
    "ebit"
  ],

  ebitda: [
    "ebitda"
  ],

  netIncome: [
    "net_income",
    "netincome",
    "profit_after_tax",
    "profitaftertax",
    "pat"
  ],

  totalAssets: [
    "total_assets",
    "totalassets",
    "assets"
  ],

  totalLiabilities: [
    "total_liabilities",
    "totalliabilities",
    "liabilities"
  ],

  totalEquity: [
    "total_equity",
    "totalequity",
    "shareholders_equity",
    "shareholdersequity",
    "equity"
  ],

  cashAndEquivalents: [
    "cash_and_equivalents",
    "cashandequivalents",
    "cash"
  ],

  totalDebt: [
    "total_debt",
    "totaldebt",
    "debt"
  ],

  currentAssets: [
    "current_assets",
    "currentassets"
  ],

  currentLiabilities: [
    "current_liabilities",
    "currentliabilities"
  ],

  operatingCashFlow: [
    "operating_cash_flow",
    "operatingcashflow",
    "cash_from_operations",
    "cashfromoperations"
  ],

  capitalExpenditure: [
    "capital_expenditure",
    "capitalexpenditure",
    "capex"
  ],

  freeCashFlow: [
    "free_cash_flow",
    "freecashflow",
    "fcf"
  ],

  earningsPerShare: [
    "earnings_per_share",
    "earningspershare",
    "eps"
  ],

  bookValuePerShare: [
    "book_value_per_share",
    "bookvaluepershare",
    "bvps"
  ],

  revenuePerShare: [
    "revenue_per_share",
    "revenuepershare",
    "sales_per_share"
  ],

  freeCashFlowPerShare: [
    "free_cash_flow_per_share",
    "freecashflowpershare",
    "fcf_per_share"
  ],

  dividendPerShare: [
    "dividend_per_share",
    "dividendpershare",
    "dps"
  ],

  dividendsPaid: [
    "dividends_paid",
    "dividendspaid"
  ],

  payoutRatioPercentage: [
    "payout_ratio_percentage",
    "payoutratiopercentage",
    "payout_ratio",
    "payoutratio"
  ],

  grossMarginPercentage: [
    "gross_margin_percentage",
    "grossmarginpercentage",
    "gross_margin"
  ],

  operatingMarginPercentage: [
    "operating_margin_percentage",
    "operatingmarginpercentage",
    "operating_margin"
  ],

  netMarginPercentage: [
    "net_margin_percentage",
    "netmarginpercentage",
    "net_margin"
  ],

  returnOnEquityPercentage: [
    "return_on_equity_percentage",
    "returnonequitypercentage",
    "roe_percentage",
    "roe"
  ],

  returnOnAssetsPercentage: [
    "return_on_assets_percentage",
    "returnonassetspercentage",
    "roa_percentage",
    "roa"
  ],

  debtToEquityRatio: [
    "debt_to_equity_ratio",
    "debttoequityratio",
    "debt_to_equity"
  ],

  currentRatio: [
    "current_ratio",
    "currentratio"
  ],

  interestCoverageRatio: [
    "interest_coverage_ratio",
    "interestcoverageratio"
  ],

  sourceName: [
    "source_name",
    "sourcename",
    "provider"
  ],

  sourceType: [
    "source_type",
    "sourcetype"
  ],

  sourceUrl: [
    "source_url",
    "sourceurl",
    "url"
  ],

  sourcePublishedAt: [
    "source_published_at",
    "sourcepublishedat",
    "published_at"
  ]
};

const COMPANY_LEVEL_FIELDS = new Set([
  "symbol",
  "name",
  "sector",
  "industry",
  "exchange",
  "currency",
  "currentPrice",
  "priceUpdatedAt",
  "sharesOutstanding",
  "marketCapitalization",
  "enterpriseValue"
]);

const PERIOD_LEVEL_FIELDS = new Set([
  "fiscalYear",
  "periodType",
  "periodEnd",
  "currency",
  "sharesOutstanding",
  "revenue",
  "grossProfit",
  "operatingIncome",
  "ebitda",
  "netIncome",
  "totalAssets",
  "totalLiabilities",
  "totalEquity",
  "cashAndEquivalents",
  "totalDebt",
  "currentAssets",
  "currentLiabilities",
  "operatingCashFlow",
  "capitalExpenditure",
  "freeCashFlow",
  "earningsPerShare",
  "bookValuePerShare",
  "revenuePerShare",
  "freeCashFlowPerShare",
  "dividendPerShare",
  "dividendsPaid",
  "payoutRatioPercentage",
  "grossMarginPercentage",
  "operatingMarginPercentage",
  "netMarginPercentage",
  "returnOnEquityPercentage",
  "returnOnAssetsPercentage",
  "debtToEquityRatio",
  "currentRatio",
  "interestCoverageRatio"
]);

const NUMERIC_FIELDS = new Set([
  "fiscalYear",
  "currentPrice",
  "sharesOutstanding",
  "marketCapitalization",
  "enterpriseValue",
  "revenue",
  "grossProfit",
  "operatingIncome",
  "ebitda",
  "netIncome",
  "totalAssets",
  "totalLiabilities",
  "totalEquity",
  "cashAndEquivalents",
  "totalDebt",
  "currentAssets",
  "currentLiabilities",
  "operatingCashFlow",
  "capitalExpenditure",
  "freeCashFlow",
  "earningsPerShare",
  "bookValuePerShare",
  "revenuePerShare",
  "freeCashFlowPerShare",
  "dividendPerShare",
  "dividendsPaid",
  "payoutRatioPercentage",
  "grossMarginPercentage",
  "operatingMarginPercentage",
  "netMarginPercentage",
  "returnOnEquityPercentage",
  "returnOnAssetsPercentage",
  "debtToEquityRatio",
  "currentRatio",
  "interestCoverageRatio"
]);

const DATE_FIELDS = new Set([
  "periodEnd",
  "priceUpdatedAt",
  "sourcePublishedAt"
]);

const FINANCIAL_EVIDENCE_FIELDS = [
  "revenue",
  "netIncome",
  "freeCashFlow",
  "totalAssets",
  "totalLiabilities",
  "earningsPerShare",
  "bookValuePerShare",
  "dividendPerShare"
];

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

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

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

function normalizeCode(value) {
  return String(value || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
}

function hasValue(value) {
  return (
    value !== null &&
    value !== undefined &&
    value !== ""
  );
}

function parseNumber(value) {
  if (!hasValue(value)) {
    return null;
  }

  if (
    typeof value ===
    "number"
  ) {
    return Number.isFinite(value)
      ? value
      : null;
  }

  const cleaned =
    String(value)
      .trim()
      .replaceAll(",", "")
      .replace(
        /^\((.*)\)$/,
        "-$1"
      )
      .replace(
        /%$/,
        ""
      );

  if (!cleaned) {
    return null;
  }

  const parsed =
    Number(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function normalizeDateValue(value) {
  if (!hasValue(value)) {
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
    : date.toISOString();
}

function normalizePolicy(policy = {}) {
  return {
    requireSymbol:
      policy?.requireSymbol !==
      false,

    requireAtLeastOneFinancialMetric:
      policy
        ?.requireAtLeastOneFinancialMetric !==
      false,

    allowIdentityOnlyRecords:
      Boolean(
        policy
          ?.allowIdentityOnlyRecords
      ),

    maximumRows:
      Math.max(
        Number(
          policy?.maximumRows ??
          DEFAULT_IMPORT_POLICY
            .maximumRows
        ) || 0,
        1
      ),

    trimText:
      policy?.trimText !==
      false,

    ignoreUnknownFields:
      policy?.ignoreUnknownFields !==
      false,

    mergeExistingRecords:
      policy?.mergeExistingRecords !==
      false
  };
}

function buildAliasIndex(
  aliases =
    DEFAULT_FIELD_ALIASES
) {
  const index =
    new Map();

  Object.entries(
    aliases
  ).forEach(
    ([
      canonical,
      values
    ]) => {
      [
        canonical,
        ...safeArray(values)
      ].forEach(
        (alias) => {
          index.set(
            normalizeKey(alias),
            canonical
          );
        }
      );
    }
  );

  return index;
}

function convertFieldValue(
  field,
  value
) {
  if (!hasValue(value)) {
    return null;
  }

  if (
    NUMERIC_FIELDS.has(field)
  ) {
    return parseNumber(value);
  }

  if (
    DATE_FIELDS.has(field)
  ) {
    return normalizeDateValue(
      value
    );
  }

  if (
    field ===
    "symbol"
  ) {
    return normalizeSymbol(value);
  }

  if (
    field ===
      "periodType" ||
    field ===
      "sourceType" ||
    field ===
      "currency" ||
    field ===
      "exchange"
  ) {
    return normalizeCode(value);
  }

  return String(value).trim();
}

function mapExternalRow({
  row,
  aliases,
  customFieldMap = {}
}) {
  const aliasIndex =
    buildAliasIndex(aliases);

  const customIndex =
    new Map(
      Object.entries(
        customFieldMap || {}
      ).map(
        ([
          external,
          canonical
        ]) => [
          normalizeKey(external),
          canonical
        ]
      )
    );

  const mapped = {};
  const unknown = [];

  Object.entries(
    row || {}
  ).forEach(
    ([
      key,
      rawValue
    ]) => {
      const normalizedKey =
        normalizeKey(key);

      const canonical =
        customIndex.get(
          normalizedKey
        ) ||
        aliasIndex.get(
          normalizedKey
        );

      if (!canonical) {
        unknown.push(key);
        return;
      }

      const converted =
        convertFieldValue(
          canonical,
          rawValue
        );

      if (converted !== null) {
        mapped[canonical] =
          converted;
      }
    }
  );

  return {
    mapped,
    unknown
  };
}

function hasFinancialEvidence(
  record
) {
  return FINANCIAL_EVIDENCE_FIELDS
    .some(
      (field) =>
        hasValue(
          record?.[field]
        )
    );
}

function mergeNonNull(
  current,
  incoming
) {
  const result = {
    ...(current || {})
  };

  Object.entries(
    incoming || {}
  ).forEach(
    ([
      key,
      value
    ]) => {
      if (hasValue(value)) {
        result[key] =
          value;
      }
    }
  );

  return result;
}

/*
 * ============================================================
 * CSV PARSER
 * ============================================================
 */

export function parseFundamentalCsv(
  csvText,
  {
    delimiter = ",",
    hasHeader = true
  } = {}
) {
  const text =
    String(csvText || "");

  if (!text.trim()) {
    return {
      status:
        FUNDAMENTAL_IMPORT_STATUSES
          .EMPTY,

      headers:
        [],

      rows:
        [],

      errors:
        []
    };
  }

  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let inQuotes = false;

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    const character =
      text[index];

    const next =
      text[index + 1];

    if (
      character ===
      '"'
    ) {
      if (
        inQuotes &&
        next ===
        '"'
      ) {
        currentCell +=
          '"';

        index += 1;
      } else {
        inQuotes =
          !inQuotes;
      }

      continue;
    }

    if (
      character ===
        delimiter &&
      !inQuotes
    ) {
      currentRow.push(
        currentCell
      );

      currentCell = "";
      continue;
    }

    if (
      (
        character === "\n" ||
        character === "\r"
      ) &&
      !inQuotes
    ) {
      if (
        character === "\r" &&
        next === "\n"
      ) {
        index += 1;
      }

      currentRow.push(
        currentCell
      );

      currentCell = "";

      if (
        currentRow.some(
          (cell) =>
            String(cell).trim()
        )
      ) {
        rows.push(
          currentRow
        );
      }

      currentRow = [];
      continue;
    }

    currentCell +=
      character;
  }

  if (
    currentCell ||
    currentRow.length
  ) {
    currentRow.push(
      currentCell
    );

    if (
      currentRow.some(
        (cell) =>
          String(cell).trim()
      )
    ) {
      rows.push(
        currentRow
      );
    }
  }

  if (inQuotes) {
    return {
      status:
        FUNDAMENTAL_IMPORT_STATUSES
          .INVALID_FORMAT,

      headers:
        [],

      rows:
        [],

      errors: [
        {
          code:
            "UNCLOSED_QUOTE",

          message:
            "CSV contains an unclosed quoted value."
        }
      ]
    };
  }

  const headers =
    hasHeader
      ? safeArray(
          rows.shift()
        ).map(
          (header) =>
            String(header).trim()
        )
      : (
          rows[0] ||
          []
        ).map(
          (
            _value,
            index
          ) =>
            `column_${index + 1}`
        );

  const objects =
    rows.map(
      (row) => {
        const object = {};

        headers.forEach(
          (
            header,
            index
          ) => {
            object[header] =
              row[index] ??
              "";
          }
        );

        return object;
      }
    );

  return {
    status:
      FUNDAMENTAL_IMPORT_STATUSES
        .READY,

    headers,

    rows:
      objects,

    errors:
      []
  };
}

/*
 * ============================================================
 * ROW GROUPING
 * ============================================================
 */

export function buildCompaniesFromFundamentalRows({
  rows = [],
  fieldAliases =
    DEFAULT_FIELD_ALIASES,
  customFieldMap = {},
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const limitedRows =
    safeArray(rows).slice(
      0,
      normalizedPolicy
        .maximumRows
    );

  const companies =
    new Map();

  const errors = [];
  const warnings = [];
  const unknownFields =
    new Set();

  limitedRows.forEach(
    (
      sourceRow,
      index
    ) => {
      const {
        mapped,
        unknown
      } =
        mapExternalRow({
          row:
            sourceRow,

          aliases:
            fieldAliases,

          customFieldMap
        });

      unknown.forEach(
        (field) =>
          unknownFields.add(field)
      );

      const symbol =
        normalizeSymbol(
          mapped.symbol
        );

      if (
        normalizedPolicy
          .requireSymbol &&
        !symbol
      ) {
        errors.push({
          row:
            index + 1,

          code:
            "MISSING_SYMBOL",

          message:
            "Row does not contain a recognizable symbol."
        });

        return;
      }

      if (
        normalizedPolicy
          .requireAtLeastOneFinancialMetric &&
        !normalizedPolicy
          .allowIdentityOnlyRecords &&
        !hasFinancialEvidence(
          mapped
        )
      ) {
        warnings.push({
          row:
            index + 1,

          code:
            "NO_FINANCIAL_EVIDENCE",

          message:
            `No financial metric was found for ${symbol || "this row"}.`
        });
      }

      const existing =
        companies.get(
          symbol
        ) || {
          symbol,

          periods:
            [],

          sources:
            []
        };

      const companyFields = {};
      const periodFields = {};

      Object.entries(
        mapped
      ).forEach(
        ([
          field,
          value
        ]) => {
          if (
            COMPANY_LEVEL_FIELDS.has(
              field
            )
          ) {
            companyFields[field] =
              value;
          }

          if (
            PERIOD_LEVEL_FIELDS.has(
              field
            )
          ) {
            periodFields[field] =
              value;
          }
        }
      );

      const mergedCompany =
        mergeNonNull(
          existing,
          companyFields
        );

      const periodHasData =
        Object.entries(
          periodFields
        ).some(
          ([
            field,
            value
          ]) =>
            field !==
              "fiscalYear" &&
            hasValue(value)
        );

      if (
        hasValue(
          periodFields.fiscalYear
        ) ||
        periodHasData
      ) {
        const periodKey =
          `${
            periodFields
              .fiscalYear ??
            periodFields
              .periodEnd ??
            "UNKNOWN"
          }-${
            periodFields
              .periodType ??
            "ANNUAL"
          }`;

        const existingPeriodIndex =
          safeArray(
            mergedCompany.periods
          ).findIndex(
            (period) =>
              `${
                period
                  ?.fiscalYear ??
                period
                  ?.periodEnd ??
                "UNKNOWN"
              }-${
                period
                  ?.periodType ??
                "ANNUAL"
              }` ===
              periodKey
          );

        if (
          existingPeriodIndex >= 0
        ) {
          mergedCompany.periods[
            existingPeriodIndex
          ] =
            mergeNonNull(
              mergedCompany
                .periods[
                existingPeriodIndex
              ],
              periodFields
            );
        } else {
          mergedCompany.periods = [
            ...safeArray(
              mergedCompany.periods
            ),
            periodFields
          ];
        }
      }

      if (
        mapped.sourceName ||
        mapped.sourceUrl
      ) {
        mergedCompany.sources = [
          ...safeArray(
            mergedCompany.sources
          ),
          {
            name:
              mapped.sourceName ||
              "Imported Source",

            type:
              mapped.sourceType ||
              "IMPORT",

            url:
              mapped.sourceUrl ||
              null,

            publishedAt:
              mapped
                .sourcePublishedAt ||
              null,

            verified:
              false,

            authoritative:
              false
          }
        ];
      }

      companies.set(
        symbol,
        mergedCompany
      );
    }
  );

  return {
    status:
      companies.size
        ? errors.length
          ? FUNDAMENTAL_IMPORT_STATUSES
              .PARTIAL
          : FUNDAMENTAL_IMPORT_STATUSES
              .READY
        : FUNDAMENTAL_IMPORT_STATUSES
            .FAILED,

    companies:
      Array.from(
        companies.values()
      ),

    rowsReceived:
      safeArray(rows).length,

    rowsProcessed:
      limitedRows.length,

    companyCount:
      companies.size,

    errors,

    warnings,

    unknownFields:
      Array.from(
        unknownFields
      )
  };
}

/*
 * ============================================================
 * IMPORT PREVIEW
 * ============================================================
 */

export function previewFundamentalImport({
  format,
  payload,
  providerId = null,
  fieldAliases =
    DEFAULT_FIELD_ALIASES,
  customFieldMap = {},
  policy = {}
} = {}) {
  const normalizedFormat =
    normalizeCode(format);

  let companies = [];
  let parsing = null;

  if (
    normalizedFormat ===
    FUNDAMENTAL_IMPORT_FORMATS
      .CSV
  ) {
    const parsed =
      parseFundamentalCsv(
        payload
      );

    if (
      parsed.status !==
      FUNDAMENTAL_IMPORT_STATUSES
        .READY
    ) {
      return {
        status:
          parsed.status,

        format:
          normalizedFormat,

        companies:
          [],

        prepared:
          [],

        errors:
          parsed.errors,

        warnings:
          []
      };
    }

    parsing =
      buildCompaniesFromFundamentalRows({
        rows:
          parsed.rows,

        fieldAliases,

        customFieldMap,

        policy
      });

    companies =
      parsing.companies;
  } else if (
    normalizedFormat ===
    FUNDAMENTAL_IMPORT_FORMATS
      .ROWS
  ) {
    parsing =
      buildCompaniesFromFundamentalRows({
        rows:
          payload,

        fieldAliases,

        customFieldMap,

        policy
      });

    companies =
      parsing.companies;
  } else if (
    normalizedFormat ===
    FUNDAMENTAL_IMPORT_FORMATS
      .NORMALIZED_JSON
  ) {
    companies =
      safeArray(
        payload?.companies ??
        payload
      );
  } else if (
    normalizedFormat ===
    FUNDAMENTAL_IMPORT_FORMATS
      .PROVIDER_JSON
  ) {
    if (!providerId) {
      return {
        status:
          FUNDAMENTAL_IMPORT_STATUSES
            .VALIDATION_REQUIRED,

        format:
          normalizedFormat,

        companies:
          [],

        prepared:
          [],

        errors: [
          {
            code:
              "MISSING_PROVIDER_ID",

            message:
              "Provider id is required for provider JSON imports."
          }
        ],

        warnings:
          []
      };
    }

    const adapter =
      providerImportAdapters.get(
        normalizeCode(
          providerId
        )
      );

    if (!adapter) {
      return {
        status:
          FUNDAMENTAL_IMPORT_STATUSES
            .VALIDATION_REQUIRED,

        format:
          normalizedFormat,

        companies:
          [],

        prepared:
          [],

        errors: [
          {
            code:
              "PROVIDER_ADAPTER_NOT_FOUND",

            message:
              `No import adapter is registered for ${providerId}.`
          }
        ],

        warnings:
          []
      };
    }

    const adapted =
      adapter(payload);

    companies =
      safeArray(
        adapted?.companies ??
        adapted
      );
  } else {
    return {
      status:
        FUNDAMENTAL_IMPORT_STATUSES
          .INVALID_FORMAT,

      format:
        normalizedFormat,

      companies:
        [],

      prepared:
        [],

      errors: [
        {
          code:
            "UNSUPPORTED_IMPORT_FORMAT",

          message:
            `Unsupported import format: ${normalizedFormat}.`
        }
      ],

      warnings:
        []
    };
  }

  const prepared =
    companies.map(
      (company) =>
        buildResearchReadyFundamentals({
          company
        })
    );

  const valid =
    prepared.filter(
      (record) =>
        record
          ?.validation
          ?.valid
    );

  const invalid =
    prepared.filter(
      (record) =>
        !record
          ?.validation
          ?.valid
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      prepared.length
        ? invalid.length
          ? FUNDAMENTAL_IMPORT_STATUSES
              .PARTIAL
          : FUNDAMENTAL_IMPORT_STATUSES
              .READY
        : FUNDAMENTAL_IMPORT_STATUSES
            .EMPTY,

    format:
      normalizedFormat,

    providerId:
      providerId ||
      null,

    companies,

    prepared,

    summary: {
      received:
        companies.length,

      valid:
        valid.length,

      invalid:
        invalid.length,

      researchReady:
        prepared.filter(
          (record) =>
            record
              ?.earningsPerShare !==
              null &&
            record
              ?.earningsPerShare !==
              undefined ||
            record
              ?.bookValuePerShare !==
              null &&
            record
              ?.bookValuePerShare !==
              undefined ||
            record
              ?.freeCashFlowPerShare !==
              null &&
            record
              ?.freeCashFlowPerShare !==
              undefined
        ).length
    },

    errors: [
      ...safeArray(
        parsing?.errors
      ),

      ...invalid.flatMap(
        (record) =>
          safeArray(
            record
              ?.validation
              ?.errors
          ).map(
            (error) => ({
              symbol:
                record?.symbol,

              ...error
            })
          )
      )
    ],

    warnings: [
      ...safeArray(
        parsing?.warnings
      ),

      ...prepared.flatMap(
        (record) =>
          safeArray(
            record
              ?.validation
              ?.warnings
          ).map(
            (warning) => ({
              symbol:
                record?.symbol,

              ...warning
            })
          )
      )
    ],

    unknownFields:
      safeArray(
        parsing
          ?.unknownFields
      )
  };
}

/*
 * ============================================================
 * SAVE IMPORT
 * ============================================================
 */

export async function importFundamentalData({
  format,
  payload,
  providerId = null,
  fieldAliases =
    DEFAULT_FIELD_ALIASES,
  customFieldMap = {},
  importMode =
    FUNDAMENTAL_IMPORT_MODES
      .MERGE,
  policy = {},
  fundamentalPolicy = {}
} = {}) {
  const preview =
    previewFundamentalImport({
      format,

      payload,

      providerId,

      fieldAliases,

      customFieldMap,

      policy
    });

  if (
    [
      FUNDAMENTAL_IMPORT_STATUSES
        .FAILED,
      FUNDAMENTAL_IMPORT_STATUSES
        .EMPTY,
      FUNDAMENTAL_IMPORT_STATUSES
        .INVALID_FORMAT,
      FUNDAMENTAL_IMPORT_STATUSES
        .VALIDATION_REQUIRED
    ].includes(
      preview.status
    )
  ) {
    return {
      ...preview,

      imported:
        0
    };
  }

  const validCompanies =
    preview.prepared
      .filter(
        (record) =>
          record
            ?.validation
            ?.valid
      )
      .map(
        (record) =>
          record
            ?.sources
            ?.security ??
          record
      );

  if (
    normalizeCode(
      importMode
    ) ===
    FUNDAMENTAL_IMPORT_MODES
      .PREVIEW
  ) {
    return {
      ...preview,

      status:
        FUNDAMENTAL_IMPORT_STATUSES
          .READY,

      imported:
        0
    };
  }

  let imported = 0;

  if (
    normalizeCode(
      importMode
    ) ===
    FUNDAMENTAL_IMPORT_MODES
      .REPLACE
  ) {
    const batch =
      await saveFundamentalRecordBatch({
        companies:
          preview.companies.filter(
            (company) =>
              preview.prepared.some(
                (record) =>
                  record.symbol ===
                    normalizeSymbol(
                      company?.symbol
                    ) &&
                  record
                    ?.validation
                    ?.valid
              )
          ),

        policy:
          fundamentalPolicy
      });

    imported =
      batch.results.length;
  } else {
    for (
      const company of preview.companies
    ) {
      const prepared =
        preview.prepared.find(
          (record) =>
            record.symbol ===
            normalizeSymbol(
              company?.symbol
            )
        );

      if (
        !prepared
          ?.validation
          ?.valid
      ) {
        continue;
      }

      await mergeAndSaveFundamentalRecord({
        symbol:
          company?.symbol,

        incoming:
          company,

        policy:
          fundamentalPolicy
      });

      imported += 1;
    }
  }

  const repository =
    await loadFundamentalRecords();

  return {
    ...preview,

    status:
      imported === 0
        ? FUNDAMENTAL_IMPORT_STATUSES
            .FAILED
        : imported <
            preview
              .summary
              .valid
          ? FUNDAMENTAL_IMPORT_STATUSES
              .PARTIAL
          : FUNDAMENTAL_IMPORT_STATUSES
              .IMPORTED,

    imported,

    repositoryCount:
      repository.length
  };
}

/*
 * ============================================================
 * PROVIDER IMPORT ADAPTERS
 * ============================================================
 */

const providerImportAdapters =
  new Map();

export function registerFundamentalImportAdapter({
  id,
  adapt,
  registerWithEngine = true
} = {}) {
  const providerId =
    normalizeCode(id);

  if (
    !providerId ||
    typeof adapt !==
      "function"
  ) {
    throw new Error(
      "Provider id and adapt function are required."
    );
  }

  providerImportAdapters.set(
    providerId,
    adapt
  );

  if (registerWithEngine) {
    registerFundamentalDataProvider({
      id:
        providerId,

      normalize:
        adapt
    });
  }

  return providerId;
}

export function unregisterFundamentalImportAdapter(
  id
) {
  return providerImportAdapters.delete(
    normalizeCode(id)
  );
}

export function listFundamentalImportAdapters() {
  return Array.from(
    providerImportAdapters.keys()
  );
}

/*
 * ============================================================
 * IMPORT TEMPLATES
 * ============================================================
 */

export function buildFundamentalCsvTemplate() {
  const headers = [
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
    "source_name",
    "source_type",
    "source_url",
    "source_published_at"
  ];

  return `${headers.join(",")}\n`;
}

export function buildFundamentalJsonTemplate() {
  return {
    companies: [
      {
        symbol:
          "SCOM",

        name:
          "Safaricom PLC",

        sector:
          "Telecommunication and Technology",

        industry:
          "Telecommunications",

        exchange:
          "NSE",

        currency:
          "KES",

        currentPrice:
          null,

        priceUpdatedAt:
          null,

        sharesOutstanding:
          null,

        periods: [
          {
            fiscalYear:
              null,

            periodType:
              "ANNUAL",

            periodEnd:
              null,

            currency:
              "KES",

            revenue:
              null,

            netIncome:
              null,

            freeCashFlow:
              null,

            totalAssets:
              null,

            totalLiabilities:
              null,

            totalEquity:
              null,

            earningsPerShare:
              null,

            bookValuePerShare:
              null,

            dividendPerShare:
              null
          }
        ],

        sources: [
          {
            name:
              null,

            type:
              "COMPANY_FILING",

            authoritative:
              true,

            verified:
              true,

            url:
              null,

            publishedAt:
              null
          }
        ]
      }
    ]
  };
}
