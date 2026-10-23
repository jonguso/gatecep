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
        "A24B4F7_TEST"
    })
  );
}

const requiredFields = [
  "revenue",
  "netIncome",
  "totalAssets",
  "totalLiabilities",
  "totalEquity"
];

const primary2024 = {
  fiscalYear: 2024,
  periodEnd:
    "2024-03-31",

  revenue:
    349447200000,

  netIncome:
    62991700000,

  totalAssets:
    393121000000,

  totalLiabilities:
    249918000000,

  totalEquity:
    143203000000,

  operatingCashFlow:
    108000000000
};

const historical2023 = {
  fiscalYear: 2023,

  revenue:
    310904800000,

  netIncome:
    62268900000,

  totalAssets:
    365700000000,

  totalLiabilities:
    226800000000,

  totalEquity:
    138900000000
};

const historical2022 = {
  fiscalYear: 2022,

  revenue:
    298100000000,

  netIncome:
    67500000000
};

const historical2021 = {
  fiscalYear: 2021,

  revenue:
    264000000000,

  netIncome:
    68000000000
};

const historical2020 = {
  fiscalYear: 2020,

  revenue:
    250000000000,

  netIncome:
    73000000000
};

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

function build(periods, refs) {
  return buildWorkspace({
    filing: {
      symbol: "SCOM",
      companyName:
        "Safaricom PLC",
      filingType:
        "ANNUAL_REPORT",
      fiscalYear: 2024,
      periodEnd:
        "2024-03-31",
      company: {
        symbol: "SCOM",
        name:
          "Safaricom PLC",
        exchange: "NSE",
        currency: "KES"
      }
    },

    periods,
    sourceReferences: refs
  });
}

console.log("");
console.log(
  "===== CURRENT CONTRACT — ONE COMPLETE YEAR ====="
);

const oneYear =
  build(
    [
      primary2024
    ],
    [
      ...refs2024
    ]
  );

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
      periods:
        oneYear.periods.length
    },
    null,
    2
  )
);

check(
  "ONE_YEAR_PRIMARY_READY",
  oneYear.status === "READY"
);

check(
  "ONE_YEAR_PRIMARY_COMPLETE",
  Number(
    oneYear
      .completenessPercentage
  ) === 100
);

check(
  "ONE_YEAR_PRIMARY_NO_ERRORS",
  oneYear.errors.length === 0
);

console.log("");
console.log(
  "===== CURRENT CONTRACT — TWO COMPLETE YEARS ====="
);

const twoYears =
  build(
    [
      primary2024,
      historical2023
    ],
    [
      ...refs2024,
      ...refs2023
    ]
  );

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
      periods:
        twoYears.periods.length
    },
    null,
    2
  )
);

check(
  "TWO_YEAR_CURRENT_READY",
  twoYears.status === "READY"
);

console.log("");
console.log(
  "===== CURRENT CONTRACT — FIVE YEARS WITH PARTIAL HISTORY ====="
);

const fiveYears =
  build(
    [
      primary2024,
      historical2023,
      historical2022,
      historical2021,
      historical2020
    ],
    [
      ...refs2024,
      ...refs2023,
      ...refs2022,
      ...refs2021,
      ...refs2020
    ]
  );

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
  "CURRENT_FIVE_YEAR_IS_INVALID",
  fiveYears.status ===
    "INVALID"
);

check(
  "CURRENT_HISTORY_CREATES_ERRORS",
  fiveYears.errors.length > 0
);

const primaryValidation =
  fiveYears.periods.find(
    (item) =>
      Number(
        item?.period?.fiscalYear
      ) === 2024
  );

check(
  "PRIMARY_PERIOD_STILL_READY",
  primaryValidation?.status ===
    "READY"
);

check(
  "PRIMARY_PERIOD_STILL_100",
  Number(
    primaryValidation
      ?.completenessPercentage
  ) === 100
);

console.log("");
console.log(
  "===== TARGET A24B4F7 CONTRACT ====="
);

console.log(
  "TARGET_1=Primary filing period remains strict."
);

console.log(
  "TARGET_2=Missing required primary fields remain blocking errors."
);

console.log(
  "TARGET_3=Historical missing fields remain null and are not invented."
);

console.log(
  "TARGET_4=Historical incompleteness must not invalidate an otherwise READY primary filing period."
);

console.log(
  "TARGET_5=One supported fiscal year is acceptable with LOW historical confidence."
);

console.log(
  "TARGET_6=Additional supported years improve historical confidence rather than act as mandatory filing prerequisites."
);

console.log(
  "TARGET_7=Evidence confidence must disclose what years and fields support the conclusion."
);

console.log(
  "TARGET_8=No verification, approval, promotion, persistence, or portfolio mutation is introduced."
);

console.log("");
console.log(
  "===== TEST RESULT ====="
);

console.log(
  "ASSERTION_FAILURES=" +
    failures
);

if (failures === 0) {
  console.log(
    "A24B4F7A RESULT: CURRENT BEHAVIOR REPRODUCED / TARGET CONTRACT LOCKED"
  );
} else {
  console.log(
    "A24B4F7A RESULT: HOLD"
  );

  process.exitCode = 1;
}
