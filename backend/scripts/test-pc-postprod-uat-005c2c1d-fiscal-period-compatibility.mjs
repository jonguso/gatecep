import assert from "node:assert/strict";
import fs from "node:fs";

const path =
  new URL(
    "../src/modules/fundamental-evidence/issuerDocumentIdentityInspector.js",
    import.meta.url
  );

const source =
  fs.readFileSync(path, "utf8");

/*
 * Keep this focused on the pure reporting-period logic.
 * We intentionally extract/evaluate only the helper boundary,
 * avoiding synthetic PDFs and any repository/network activity.
 */

const start =
  source.indexOf("const STRONG_REPORTING_PERIOD_PATTERNS =");

const end =
  source.indexOf(
    "\nexport async function inspectIssuerDocumentIdentity(",
    start
  );

assert.ok(start >= 0);
assert.ok(end > start);

const helperSource =
  source.slice(start, end);

const factory =
  new Function(
    "normalizeText",
    `${helperSource}
return detectReportingPeriod;`
  );

const normalizeText =
  (value) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim();

const detectReportingPeriod =
  factory(normalizeText);

function expectPeriod(
  text,
  fiscalYear,
  periodEnd
) {
  const result =
    detectReportingPeriod(text);

  assert.equal(
    result.fiscalYear,
    fiscalYear,
    text
  );

  assert.equal(
    result.periodEnd,
    periodEnd,
    text
  );

  assert.ok(
    result.evidence,
    `Expected evidence for ${text}`
  );
}

/*
 * Existing December behavior remains valid.
 */
expectPeriod(
  "YEAR ENDED 31 DECEMBER 2024",
  2024,
  "2024-12-31"
);

expectPeriod(
  "FOR THE YEAR ENDED 31ST DECEMBER 2023",
  2023,
  "2023-12-31"
);

/*
 * SCOM compatibility.
 */
expectPeriod(
  "YEAR ENDED 31 MARCH 2024",
  2024,
  "2024-03-31"
);

expectPeriod(
  "FOR THE YEAR ENDED 31ST MARCH 2025",
  2025,
  "2025-03-31"
);

/*
 * Other legitimate fiscal year ends are generic,
 * not issuer-specific.
 */
expectPeriod(
  "PERIOD ENDED 30 JUNE 2024",
  2024,
  "2024-06-30"
);

expectPeriod(
  "30 SEPTEMBER 2024",
  2024,
  "2024-09-30"
);

expectPeriod(
  "29 FEBRUARY 2024",
  2024,
  "2024-02-29"
);

/*
 * Invalid calendar dates must not become evidence.
 */
assert.deepEqual(
  detectReportingPeriod(
    "YEAR ENDED 31 FEBRUARY 2024"
  ),
  {
    fiscalYear: null,
    periodEnd: null,
    evidence: null
  }
);

assert.deepEqual(
  detectReportingPeriod(
    "YEAR ENDED 29 FEBRUARY 2023"
  ),
  {
    fiscalYear: null,
    periodEnd: null,
    evidence: null
  }
);

assert.deepEqual(
  detectReportingPeriod(
    "No reporting period is stated."
  ),
  {
    fiscalYear: null,
    periodEnd: null,
    evidence: null
  }
);

console.log(
  "PASS — December compatibility preserved."
);

console.log(
  "PASS — March/Safaricom fiscal year-end supported."
);

console.log(
  "PASS — general June/September/leap-year dates supported."
);

console.log(
  "PASS — invalid calendar dates rejected."
);

console.log(
  "PASS — PC-POSTPROD-UAT-005C2C1D contract."
);
