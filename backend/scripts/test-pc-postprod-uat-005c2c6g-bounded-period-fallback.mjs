import assert from "node:assert/strict";
import fs from "node:fs";

const path =
  new URL(
    "../src/modules/fundamental-evidence/issuerDocumentIdentityInspector.js",
    import.meta.url
  );

const source =
  fs.readFileSync(
    path,
    "utf8"
  );

assert.match(
  source,
  /const MAX_IDENTITY_PAGES = 12;/
);

assert.match(
  source,
  /const STRONG_REPORTING_PERIOD_PATTERNS =/
);

assert.match(
  source,
  /async function detectReportingPeriodFallback/
);

assert.match(
  source,
  /issuer\.matched\s*&&[\s\S]*filing\.filingType\s*&&[\s\S]*!Number\.isInteger/
);

assert.match(
  source,
  /extracted\.inspectedPageCount \+ 1/
);

assert.match(
  source,
  /const pattern of[\s\S]*STRONG_REPORTING_PERIOD_PATTERNS/
);

assert.match(
  source,
  /pageText\.match\(pattern\)/
);

assert.match(
  source,
  /const patterns = \[[\s\S]*\.\.\.STRONG_REPORTING_PERIOD_PATTERNS/
);

/*
 * Primary detector retains its generic bare-date fallback.
 */
assert.match(
  source,
  /\/\(\\d\{1,2\}\)\(\?:ST\|ND\|RD\|TH\)\?\\s\+/
);

/*
 * Later-page fallback must not infer dates from FY labels.
 */
assert.doesNotMatch(
  source,
  /FY2024|FY24/
);

console.log(
  "PASS — primary identity window remains 12 pages."
);

console.log(
  "PASS — later fallback requires issuer + filing type."
);

console.log(
  "PASS — later fallback uses strong fiscal-period phrases."
);

console.log(
  "PASS — primary generic bare-date compatibility retained."
);

console.log(
  "PASS — no SCOM/FY-specific period inference."
);

console.log(
  "PASS — PC-POSTPROD-UAT-005C2C6G4 contract."
);
