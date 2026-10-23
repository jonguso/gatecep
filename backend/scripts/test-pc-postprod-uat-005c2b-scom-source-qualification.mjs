import assert from "node:assert/strict";

import {
  ISSUER_SOURCE_RULES,
  listIssuerEvidenceSources,
  resolveIssuerEvidenceSource
} from "../src/modules/fundamental-evidence/issuerEvidenceSourceRegistry.js";

import {
  validateIssuerDocumentUrl
} from "../src/modules/fundamental-evidence/issuerDocumentUrlPolicy.js";

console.log(
  "===== PC-POSTPROD-UAT-005C2B — SCOM SOURCE QUALIFICATION REGRESSION ====="
);

const scom =
  listIssuerEvidenceSources("SCOM");

assert.equal(scom.length, 2);

assert.equal(
  scom[0].host,
  "annualreport.cma.or.ke"
);

assert.equal(
  scom[0].sourceType,
  "REGULATOR"
);

assert.equal(
  scom[0].sourcePriority,
  100
);

assert.equal(
  scom[0].acquisitionRole,
  "PRIMARY"
);

assert.equal(
  scom[1].sourceType,
  "ISSUER"
);

assert.equal(
  scom[1].sourcePriority,
  200
);

assert.equal(
  scom[1].acquisitionRole,
  "FALLBACK"
);

console.log(
  "PASS — CMA is primary and issuer is fallback for canonical NSE acquisition."
);

assert.ok(
  scom.some(
    (source) =>
      source.symbol === "SCOM" &&
      source.issuerName === "Safaricom PLC" &&
      source.host === "safaricom.co.ke" &&
      source.sourceType === "ISSUER" &&
      source.trustLevel === "OFFICIAL_ISSUER" &&
      source.authoritative === false &&
      source.verified === false &&
      source.qualificationStatus === "QUALIFIED"
  )
);

assert.ok(
  scom.some(
    (source) =>
      source.symbol === "SCOM" &&
      source.host === "annualreport.cma.or.ke" &&
      source.sourceType === "REGULATOR" &&
      source.trustLevel === "OFFICIAL_REGULATOR_REPOSITORY" &&
      source.authoritative === false &&
      source.verified === false &&
      source.qualificationStatus === "QUALIFIED"
  )
);

console.log(
  "PASS — exact SCOM non-authoritative source metadata."
);

for (
  const hostname of [
    "safaricom.co.ke",
    "www.safaricom.co.ke",
    "investor.safaricom.co.ke"
  ]
) {
  const source =
    resolveIssuerEvidenceSource({
      symbol: "SCOM",
      hostname
    });

  assert.ok(
    source,
    `Expected SCOM source resolution for ${hostname}`
  );
}

console.log(
  "PASS — root/www/subdomain resolution."
);

const qualified =
  validateIssuerDocumentUrl({
    symbol: "SCOM",
    url:
      "https://www.safaricom.co.ke/investor-relations/example.pdf"
  });

assert.equal(qualified.ok, true);
assert.equal(qualified.code, "QUALIFIED");

console.log(
  "PASS — SCOM + Safaricom HTTPS qualifies."
);

const crossSymbol =
  validateIssuerDocumentUrl({
    symbol: "EQT",
    url:
      "https://www.safaricom.co.ke/investor-relations/example.pdf"
  });

assert.equal(crossSymbol.ok, false);
assert.equal(
  crossSymbol.code,
  "UNQUALIFIED_ISSUER_HOST"
);

console.log(
  "PASS — cross-symbol Safaricom evidence rejected."
);

const unrelated =
  validateIssuerDocumentUrl({
    symbol: "SCOM",
    url: "https://example.com/report.pdf"
  });

assert.equal(unrelated.ok, false);
assert.equal(
  unrelated.code,
  "UNQUALIFIED_ISSUER_HOST"
);

console.log(
  "PASS — unrelated host rejected."
);

const insecure =
  validateIssuerDocumentUrl({
    symbol: "SCOM",
    url:
      "http://www.safaricom.co.ke/report.pdf"
  });

assert.equal(insecure.ok, false);
assert.equal(
  insecure.code,
  "HTTPS_REQUIRED"
);

console.log(
  "PASS — HTTPS boundary preserved."
);

const privateHost =
  validateIssuerDocumentUrl({
    symbol: "SCOM",
    url: "https://127.0.0.1/report.pdf"
  });

assert.equal(privateHost.ok, false);
assert.equal(
  privateHost.code,
  "PRIVATE_HOST_FORBIDDEN"
);

console.log(
  "PASS — private-host boundary preserved."
);

const eqt =
  listIssuerEvidenceSources("EQT");

assert.equal(eqt.length, 2);

assert.ok(
  eqt.some(
    (x) =>
      x.host === "equitygroupholdings.com" &&
      x.sourceType === "ISSUER"
  )
);

assert.ok(
  eqt.some(
    (x) =>
      x.host === "annualreport.cma.or.ke" &&
      x.sourceType === "REGULATOR"
  )
);

console.log(
  "PASS — existing EQT qualifications preserved."
);

assert.equal(
  ISSUER_SOURCE_RULES.length,
  2
);

assert.equal(
  ISSUER_SOURCE_RULES.filter(
    (x) => x.symbol === "SCOM"
  ).length,
  1
);

console.log(
  "PASS — issuer registry contains exactly 2 symbol-specific rules with one SCOM issuer rule."
);

console.log(
  "PASS — PC-POSTPROD-UAT-005C2B contract."
);
