import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const require =
  createRequire(import.meta.url);

const babel =
  require("@babel/core");

const root =
  process.cwd();

function loadModule(relativePath) {
  const filename =
    path.join(
      root,
      relativePath
    );

  const source =
    fs.readFileSync(
      filename,
      "utf8"
    );

  const compiled =
    babel.transformSync(
      source,
      {
        filename,
        babelrc: false,
        configFile: false,
        plugins: [
          require.resolve(
            "@babel/plugin-transform-modules-commonjs"
          )
        ]
      }
    ).code;

  const moduleBox = {
    exports: {}
  };

  const context =
    vm.createContext({
      module:
        moduleBox,
      exports:
        moduleBox.exports,
      require,
      console,
      Number,
      String,
      Object,
      Array,
      Boolean,
      JSON,
      Math,
      Map,
      Set,
      Error,
      TypeError
    });

  vm.runInContext(
    compiled,
    context,
    {
      filename
    }
  );

  return moduleBox.exports;
}

const {
  composeFinancialEvidencePreviews
} =
  loadModule(
    "src/features/fundamentals/extraction/financialEvidenceCompositionService.js"
  );

let failures = 0;

function check(label, condition) {
  const pass =
    Boolean(condition);

  console.log(
    (pass ? "PASS" : "FAIL") +
      " — " +
      label
  );

  if (!pass) {
    failures += 1;
  }
}

function preview({
  symbol = "SCOM",
  filingType,
  periods,
  evidence
}) {
  return {
    previewOnly: true,
    extractionOnly: true,
    persistence: "NONE",

    verifiedFiling: false,
    verified: false,
    authoritative: false,

    symbol,
    companyName:
      "Safaricom PLC",
    extractionPolicy:
      "GENERIC",
    filingType,

    fiscalYear: 2024,
    periodEnd:
      "2024-03-31",

    periods,
    evidence,

    sourceDocument: {
      fileName:
        filingType +
        ".pdf"
    }
  };
}

const highlights =
  preview({
    filingType:
      "ANNUAL_REPORT",

    periods: [
      {
        fiscalYear: 2024,
        periodEnd:
          "2024-03-31",
        revenue:
          349447200000,
        netIncome:
          62991700000
      },
      {
        fiscalYear: 2023,
        periodEnd: null,
        revenue:
          310904800000,
        netIncome:
          62268900000
      }
    ],

    evidence: [
      {
        fiscalYear: 2024,
        field: "revenue",
        value: 349447200000,
        pageNumber: 110,
        extractionMethod:
          "DETERMINISTIC_MULTI_PERIOD_FINANCIAL_HIGHLIGHTS",
        verified: false,
        authoritative: false
      },
      {
        fiscalYear: 2024,
        field: "netIncome",
        value: 62991700000,
        pageNumber: 110,
        extractionMethod:
          "DETERMINISTIC_MULTI_PERIOD_FINANCIAL_HIGHLIGHTS",
        verified: false,
        authoritative: false
      },
      {
        fiscalYear: 2023,
        field: "revenue",
        value: 310904800000,
        pageNumber: 110,
        extractionMethod:
          "DETERMINISTIC_MULTI_PERIOD_FINANCIAL_HIGHLIGHTS",
        verified: false,
        authoritative: false
      },
      {
        fiscalYear: 2023,
        field: "netIncome",
        value: 62268900000,
        pageNumber: 110,
        extractionMethod:
          "DETERMINISTIC_MULTI_PERIOD_FINANCIAL_HIGHLIGHTS",
        verified: false,
        authoritative: false
      }
    ]
  });

const afs =
  preview({
    filingType:
      "AUDITED_FINANCIALS",

    periods: [
      {
        fiscalYear: 2024,
        periodEnd:
          "2024-03-31",
        totalAssets:
          641164300000,
        totalLiabilities:
          305416400000,
        totalEquity:
          335747900000,
        operatingCashFlow:
          107923600000
      },
      {
        fiscalYear: 2023,
        periodEnd: null,
        totalAssets:
          509207000000,
        totalLiabilities:
          245841100000,
        totalEquity:
          263365900000,
        operatingCashFlow:
          116151100000
      }
    ],

    evidence: [
      {
        fiscalYear: 2024,
        field: "totalAssets",
        value: 641164300000,
        pageNumber: 21,
        extractionMethod:
          "DETERMINISTIC_GROUP_COMPANY_PRIMARY_STATEMENT",
        verified: false,
        authoritative: false
      },
      {
        fiscalYear: 2024,
        field: "totalLiabilities",
        value: 305416400000,
        pageNumber: 22,
        extractionMethod:
          "DETERMINISTIC_GROUP_COMPANY_PRIMARY_STATEMENT",
        verified: false,
        authoritative: false
      },
      {
        fiscalYear: 2024,
        field: "totalEquity",
        value: 335747900000,
        pageNumber: 21,
        extractionMethod:
          "DETERMINISTIC_GROUP_COMPANY_PRIMARY_STATEMENT",
        verified: false,
        authoritative: false
      },
      {
        fiscalYear: 2024,
        field: "operatingCashFlow",
        value: 107923600000,
        pageNumber: 26,
        extractionMethod:
          "DETERMINISTIC_GROUP_COMPANY_PRIMARY_STATEMENT",
        verified: false,
        authoritative: false
      },
      {
        fiscalYear: 2023,
        field: "totalAssets",
        value: 509207000000,
        pageNumber: 21,
        extractionMethod:
          "DETERMINISTIC_GROUP_COMPANY_PRIMARY_STATEMENT",
        verified: false,
        authoritative: false
      },
      {
        fiscalYear: 2023,
        field: "totalLiabilities",
        value: 245841100000,
        pageNumber: 22,
        extractionMethod:
          "DETERMINISTIC_GROUP_COMPANY_PRIMARY_STATEMENT",
        verified: false,
        authoritative: false
      },
      {
        fiscalYear: 2023,
        field: "totalEquity",
        value: 263365900000,
        pageNumber: 21,
        extractionMethod:
          "DETERMINISTIC_GROUP_COMPANY_PRIMARY_STATEMENT",
        verified: false,
        authoritative: false
      },
      {
        fiscalYear: 2023,
        field: "operatingCashFlow",
        value: 116151100000,
        pageNumber: 26,
        extractionMethod:
          "DETERMINISTIC_GROUP_COMPANY_PRIMARY_STATEMENT",
        verified: false,
        authoritative: false
      }
    ]
  });

try {
  const composed =
    composeFinancialEvidencePreviews(
      [
        highlights,
        afs
      ]
    );

  check(
    "SCOM symbol preserved",
    composed.symbol === "SCOM"
  );

  check(
    "two fiscal periods composed",
    composed.periods.length === 2
  );

  check(
    "all twelve provenance records retained",
    composed.evidence.length === 12
  );

  const fy2024 =
    composed.periods.find(
      item =>
        item.fiscalYear === 2024
    );

  const fy2023 =
    composed.periods.find(
      item =>
        item.fiscalYear === 2023
    );

  check(
    "FY2024 revenue composed",
    fy2024?.revenue ===
      349447200000
  );

  check(
    "FY2024 assets composed",
    fy2024?.totalAssets ===
      641164300000
  );

  check(
    "FY2023 revenue composed",
    fy2023?.revenue ===
      310904800000
  );

  check(
    "FY2023 assets composed",
    fy2023?.totalAssets ===
      509207000000
  );

  check(
    "unsupported FY2023 periodEnd remains null",
    fy2023?.periodEnd === null
  );

  check(
    "composition remains non-persistent",
    composed.persistence ===
      "NONE"
  );

  check(
    "composition remains unverified",
    composed.verified === false &&
      composed.verifiedFiling === false
  );

  check(
    "composition remains non-authoritative",
    composed.authoritative === false
  );
} catch (error) {
  console.log(
    "COMPLEMENTARY_ERROR=" +
      (
        error?.stack ||
        error?.message ||
        String(error)
      )
  );

  failures += 1;
}

try {
  const duplicate =
    structuredClone(afs);

  duplicate.periods[0].revenue =
    349447200000;

  duplicate.evidence.push({
    fiscalYear: 2024,
    field: "revenue",
    value: 349447200000,
    pageNumber: 30,
    extractionMethod:
      "SECOND_OFFICIAL_DOCUMENT",
    verified: false,
    authoritative: false
  });

  const composed =
    composeFinancialEvidencePreviews(
      [
        highlights,
        duplicate
      ]
    );

  check(
    "identical duplicate value is accepted",
    composed.periods.find(
      item =>
        item.fiscalYear === 2024
    )?.revenue ===
      349447200000
  );

  check(
    "identical duplicate provenance is retained",
    composed.evidence.filter(
      item =>
        item.fiscalYear === 2024 &&
        item.field === "revenue"
    ).length === 2
  );
} catch (error) {
  console.log(
    "IDENTICAL_DUPLICATE_ERROR=" +
      (
        error?.stack ||
        error?.message ||
        String(error)
      )
  );

  failures += 1;
}

try {
  const conflict =
    structuredClone(afs);

  conflict.periods[0].revenue =
    349500000000;

  composeFinancialEvidencePreviews(
    [
      highlights,
      conflict
    ]
  );

  check(
    "conflicting duplicate fails closed",
    false
  );
} catch (error) {
  check(
    "conflicting duplicate fails closed",
    error?.code ===
      "FINANCIAL_EVIDENCE_COMPOSITION_CONFLICT"
  );

  check(
    "conflict identifies FY2024 revenue",
    Array.isArray(
      error?.conflicts
    ) &&
      error.conflicts.some(
        item =>
          item.fiscalYear === 2024 &&
          item.field === "revenue"
      )
  );
}

try {
  const otherSymbol =
    structuredClone(afs);

  otherSymbol.symbol =
    "EQT";

  composeFinancialEvidencePreviews(
    [
      highlights,
      otherSymbol
    ]
  );

  check(
    "cross-symbol composition fails closed",
    false
  );
} catch (error) {
  check(
    "cross-symbol composition fails closed",
    /one canonical symbol/i.test(
      String(error?.message)
    )
  );
}

try {
  const nullEvidence =
    structuredClone(afs);

  nullEvidence.periods[0].revenue =
    null;

  const composed =
    composeFinancialEvidencePreviews(
      [
        highlights,
        nullEvidence
      ]
    );

  check(
    "null never overwrites supported value",
    composed.periods.find(
      item =>
        item.fiscalYear === 2024
    )?.revenue ===
      349447200000
  );
} catch (error) {
  console.log(
    "NULL_MERGE_ERROR=" +
      (
        error?.stack ||
        error?.message ||
        String(error)
      )
  );

  failures += 1;
}

try {
  const periodConflict =
    structuredClone(afs);

  periodConflict.periods[0]
    .periodEnd =
      "2024-06-30";

  composeFinancialEvidencePreviews(
    [
      highlights,
      periodConflict
    ]
  );

  check(
    "conflicting periodEnd fails closed",
    false
  );
} catch (error) {
  check(
    "conflicting periodEnd fails closed",
    error?.code ===
      "FINANCIAL_EVIDENCE_COMPOSITION_CONFLICT"
  );

  check(
    "periodEnd conflict is explicit",
    Array.isArray(
      error?.conflicts
    ) &&
      error.conflicts.some(
        item =>
          item.type ===
            "PERIOD_END_CONFLICT" &&
          item.fiscalYear === 2024
      )
  );
}

console.log(
  "ASSERTION_FAILURES=" +
    failures
);

if (failures) {
  process.exitCode = 1;
}
