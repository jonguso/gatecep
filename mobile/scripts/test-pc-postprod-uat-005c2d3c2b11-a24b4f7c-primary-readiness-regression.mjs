import fs from "node:fs";
import vm from "node:vm";
import { transformSync } from "@babel/core";
import transformModulesCommonjs from "@babel/plugin-transform-modules-commonjs";

const SERVICE =
  "mobile/src/features/fundamentals/extraction/filingExtractionService.js";

let failures = 0;

function check(label, condition, details = "") {
  const passed = Boolean(condition);

  console.log(
    label +
      "=" +
      (passed ? "PASS" : "FAIL") +
      (details ? " | " + details : "")
  );

  if (!passed) {
    failures += 1;
  }
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

function normalizePeriod(period = {}) {
  const normalized = {
    ...period
  };

  [
    "fiscalYear",
    "revenue",
    "netIncome",
    "totalAssets",
    "totalLiabilities",
    "totalEquity",
    "operatingCashFlow",
    "capitalExpenditure",
    "freeCashFlow",
    "sharesOutstanding",
    "earningsPerShare",
    "bookValuePerShare",
    "dividendPerShare"
  ].forEach((field) => {
    if (field in normalized) {
      normalized[field] =
        nullableNumber(
          normalized[field]
        );
    }
  });

  return normalized;
}

function normalizeCompanyFundamentals(company = {}) {
  const periods =
    Array.isArray(company.periods)
      ? company.periods
      : [];

  const normalizedPeriods =
    periods.map(normalizePeriod);

  const latestPeriod =
    normalizedPeriods
      .slice()
      .sort(
        (a, b) =>
          Number(b?.fiscalYear || 0) -
          Number(a?.fiscalYear || 0)
      )[0] || null;

  return {
    ...company,
    periods: normalizedPeriods,
    latestPeriod
  };
}

function loadService() {
  const source =
    fs.readFileSync(
      SERVICE,
      "utf8"
    );

  const transformed =
    transformSync(
      source,
      {
        filename: SERVICE,
        babelrc: false,
        configFile: false,
        plugins: [
          transformModulesCommonjs
        ]
      }
    ).code;

  const module = {
    exports: {}
  };

  const context = {
    module,
    exports: module.exports,

    require(specifier) {
      if (
        specifier ===
        "../fundamentalDataEngine"
      ) {
        return {
          normalizeCompanyFundamentals,
          normalizeFundamentalPeriod:
            normalizePeriod
        };
      }

      throw new Error(
        "Unexpected dependency: " +
          specifier
      );
    },

    console,
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    Map,
    JSON
  };

  vm.runInNewContext(
    transformed,
    context,
    {
      filename: SERVICE
    }
  );

  return module.exports;
}

const service =
  loadService();

const buildWorkspace =
  service
    .buildFilingExtractionWorkspace;

check(
  "BUILDER_AVAILABLE",
  typeof buildWorkspace === "function"
);

const requiredFields = [
  "revenue",
  "netIncome",
  "totalAssets",
  "totalLiabilities",
  "totalEquity"
];

function refsForPeriod(
  fiscalYear,
  fields
) {
  return fields.map(
    (field) => ({
      fiscalYear,
      field,
      pageNumber: 1,
      source:
        "A24B4F7C_TEST"
    })
  );
}

function completePeriod(
  fiscalYear,
  values = {}
) {
  return {
    fiscalYear,
    revenue:
      values.revenue ??
      100000000,
    netIncome:
      values.netIncome ??
      20000000,
    totalAssets:
      values.totalAssets ??
      300000000,
    totalLiabilities:
      values.totalLiabilities ??
      100000000,
    totalEquity:
      values.totalEquity ??
      200000000,
    ...values
  };
}

function partialHistoricalPeriod(
  fiscalYear,
  revenue,
  netIncome
) {
  return {
    fiscalYear,
    revenue,
    netIncome
  };
}

function build({
  filingFiscalYear = 2024,
  periods,
  sourceReferences
}) {
  return buildWorkspace({
    filing: {
      symbol: "SCOM",
      companyName:
        "Safaricom PLC",
      filingType:
        "ANNUAL_REPORT",
      fiscalYear:
        filingFiscalYear,
      periodEnd:
        filingFiscalYear === 2024
          ? "2024-03-31"
          : null,

      company: {
        symbol: "SCOM",
        name:
          "Safaricom PLC",
        exchange: "NSE",
        currency: "KES"
      }
    },

    periods,
    sourceReferences
  });
}

const primary2024 =
  completePeriod(
    2024,
    {
      revenue:
        349447200000,
      netIncome:
        62991700000,
      totalAssets:
        641164300000,
      totalLiabilities:
        305416400000,
      totalEquity:
        335747900000,
      operatingCashFlow:
        107923600000,
      periodEnd:
        "2024-03-31"
    }
  );

const complete2023 =
  completePeriod(
    2023,
    {
      revenue:
        310904800000,
      netIncome:
        62268900000,
      totalAssets:
        509207000000,
      totalLiabilities:
        245841100000,
      totalEquity:
        263365900000,
      operatingCashFlow:
        116151100000
    }
  );

const partial2022 =
  partialHistoricalPeriod(
    2022,
    298077900000,
    69648100000
  );

const partial2021 =
  partialHistoricalPeriod(
    2021,
    264026500000,
    68676200000
  );

const partial2020 =
  partialHistoricalPeriod(
    2020,
    262555700000,
    73657900000
  );

const refs2024 =
  refsForPeriod(
    2024,
    requiredFields
  );

const refs2023 =
  refsForPeriod(
    2023,
    requiredFields
  );

const refs2022 =
  refsForPeriod(
    2022,
    [
      "revenue",
      "netIncome"
    ]
  );

const refs2021 =
  refsForPeriod(
    2021,
    [
      "revenue",
      "netIncome"
    ]
  );

const refs2020 =
  refsForPeriod(
    2020,
    [
      "revenue",
      "netIncome"
    ]
  );

console.log("");
console.log(
  "===== CASE 1 — ONE COMPLETE PRIMARY YEAR ====="
);

const oneYear =
  build({
    periods: [
      primary2024
    ],

    sourceReferences: [
      ...refs2024
    ]
  });

console.log(
  JSON.stringify(
    {
      status:
        oneYear.status,

      completeness:
        oneYear
          .completenessPercentage,

      errors:
        oneYear.errors.length,

      warnings:
        oneYear.warnings.length,

      historicalEvidence:
        oneYear.historicalEvidence
    },
    null,
    2
  )
);

check(
  "ONE_YEAR_COMPLETENESS_100",
  Number(
    oneYear
      .completenessPercentage
  ) === 100
);

check(
  "ONE_YEAR_NO_ERRORS",
  oneYear.errors.length === 0
);

check(
  "ONE_YEAR_HISTORICAL_CONFIDENCE_LOW",
  oneYear
    ?.historicalEvidence
    ?.confidence === "LOW"
);

console.log("");
console.log(
  "===== CASE 2 — TWO COMPLETE YEARS ====="
);

const twoYears =
  build({
    periods: [
      primary2024,
      complete2023
    ],

    sourceReferences: [
      ...refs2024,
      ...refs2023
    ]
  });

console.log(
  JSON.stringify(
    {
      status:
        twoYears.status,

      completeness:
        twoYears
          .completenessPercentage,

      errors:
        twoYears.errors.length,

      warnings:
        twoYears.warnings.length,

      historicalEvidence:
        twoYears.historicalEvidence
    },
    null,
    2
  )
);

check(
  "TWO_YEAR_COMPLETENESS_100",
  Number(
    twoYears
      .completenessPercentage
  ) === 100
);

check(
  "TWO_YEAR_NO_ERRORS",
  twoYears.errors.length === 0
);

check(
  "TWO_YEAR_CONFIDENCE_MODERATE",
  twoYears
    ?.historicalEvidence
    ?.confidence ===
    "MODERATE"
);

console.log("");
console.log(
  "===== CASE 3 — SCOM SHAPE: TWO COMPLETE + THREE PARTIAL ====="
);

const fiveYears =
  build({
    periods: [
      primary2024,
      complete2023,
      partial2022,
      partial2021,
      partial2020
    ],

    sourceReferences: [
      ...refs2024,
      ...refs2023,
      ...refs2022,
      ...refs2021,
      ...refs2020
    ]
  });

console.log(
  JSON.stringify(
    {
      status:
        fiveYears.status,

      completeness:
        fiveYears
          .completenessPercentage,

      errors:
        fiveYears.errors.length,

      warnings:
        fiveYears.warnings.length,

      historicalEvidence:
        fiveYears.historicalEvidence,

      periods:
        fiveYears.periods.map(
          (item) => ({
            fiscalYear:
              item?.period
                ?.fiscalYear ??
              null,

            status:
              item?.status ??
              null,

            completeness:
              item
                ?.completenessPercentage ??
              null,

            errors:
              Array.isArray(
                item?.errors
              )
                ? item.errors.length
                : 0
          })
        )
    },
    null,
    2
  )
);

check(
  "FIVE_YEAR_PRIMARY_COMPLETENESS_100",
  Number(
    fiveYears
      .completenessPercentage
  ) === 100
);

check(
  "FIVE_YEAR_HISTORICAL_MISSING_NOT_BLOCKING_ERRORS",
  fiveYears.errors.length === 0
);

const historicalCoverageWarnings =
  fiveYears.warnings.filter(
    (warning) =>
      warning?.historical === true &&
      warning?.nonBlocking === true &&
      warning?.originalSeverity ===
        "ERROR" &&
      typeof warning?.code ===
        "string" &&
      warning.code.startsWith(
        "REQUIRED_"
      )
  );

check(
  "FIVE_YEAR_NINE_HISTORICAL_COVERAGE_WARNINGS",
  historicalCoverageWarnings.length === 9,
  "count=" +
    historicalCoverageWarnings.length
);

check(
  "FIVE_YEAR_ALL_PERIODS_PRESERVED",
  fiveYears.periods.length === 5
);

check(
  "FIVE_YEAR_ONE_COMPLETE_HISTORICAL_PERIOD",
  fiveYears
    ?.historicalEvidence
    ?.completePeriods === 1
);

check(
  "FIVE_YEAR_CONFIDENCE_MODERATE",
  fiveYears
    ?.historicalEvidence
    ?.confidence ===
    "MODERATE"
);

check(
  "FIVE_YEAR_STATUS_OBSERVED_PARTIAL",
  fiveYears.status === "PARTIAL",
  "status=" +
    fiveYears.status
);

console.log("");
console.log(
  "===== CASE 4 — INCOMPLETE PRIMARY MUST STILL FAIL ====="
);

const incompletePrimary = {
  fiscalYear: 2024,
  revenue:
    349447200000,
  netIncome:
    62991700000
};

const incompletePrimaryWorkspace =
  build({
    periods: [
      incompletePrimary,
      complete2023
    ],

    sourceReferences: [
      ...refsForPeriod(
        2024,
        [
          "revenue",
          "netIncome"
        ]
      ),
      ...refs2023
    ]
  });

console.log(
  JSON.stringify(
    {
      status:
        incompletePrimaryWorkspace
          .status,

      completeness:
        incompletePrimaryWorkspace
          .completenessPercentage,

      errors:
        incompletePrimaryWorkspace
          .errors.length,

      warnings:
        incompletePrimaryWorkspace
          .warnings.length
    },
    null,
    2
  )
);

check(
  "INCOMPLETE_PRIMARY_NOT_READY",
  incompletePrimaryWorkspace
    .status !== "READY"
);

check(
  "INCOMPLETE_PRIMARY_BELOW_100",
  Number(
    incompletePrimaryWorkspace
      .completenessPercentage
  ) < 100
);

check(
  "INCOMPLETE_PRIMARY_HAS_BLOCKING_ERRORS",
  incompletePrimaryWorkspace
    .errors.length > 0
);

console.log("");
console.log(
  "===== CASE 5 — UNMATCHED PRIMARY FAILS CLOSED ====="
);

const unmatched =
  build({
    filingFiscalYear: 2025,

    periods: [
      primary2024,
      complete2023
    ],

    sourceReferences: [
      ...refs2024,
      ...refs2023
    ]
  });

console.log(
  JSON.stringify(
    {
      status:
        unmatched.status,

      completeness:
        unmatched
          .completenessPercentage,

      errors:
        unmatched.errors.length,

      historicalEvidence:
        unmatched.historicalEvidence
    },
    null,
    2
  )
);

check(
  "UNMATCHED_PRIMARY_HAS_NO_HISTORICAL_RELAXATION",
  unmatched
    ?.historicalEvidence
    ?.availablePeriods === 0
);

check(
  "UNMATCHED_PRIMARY_CONFIDENCE_LOW",
  unmatched
    ?.historicalEvidence
    ?.confidence === "LOW"
);

console.log("");
console.log(
  "===== RESULT ====="
);

console.log(
  "ASSERTION_FAILURES=" +
    failures
);

if (failures === 0) {
  console.log(
    "A24B4F7C RESULT: PRIMARY/HISTORICAL AGGREGATION REGRESSION PASS"
  );
} else {
  console.log(
    "A24B4F7C RESULT: HOLD"
  );

  process.exitCode = 1;
}
