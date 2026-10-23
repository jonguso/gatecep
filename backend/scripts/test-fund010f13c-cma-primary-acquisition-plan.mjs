import assert from "node:assert/strict";

import {
  buildIssuerDocumentAcquisitionPlan
} from "../src/modules/fundamental-evidence/apifyIssuerDocumentDiscovery.adapter.js";

console.log(
  "===== FUND-010F13C — CMA PRIMARY ACQUISITION PLAN REGRESSION ====="
);

const scom =
  buildIssuerDocumentAcquisitionPlan({
    symbol: "SCOM"
  });

assert.equal(scom.symbol, "SCOM");
assert.equal(scom.primary.length, 1);
assert.equal(
  scom.primary[0].host,
  "annualreport.cma.or.ke"
);
assert.equal(
  scom.primary[0].sourceType,
  "REGULATOR"
);
assert.equal(
  scom.primary[0].sourcePriority,
  100
);
assert.equal(
  scom.primary[0].acquisitionRole,
  "PRIMARY"
);

assert.equal(scom.fallback.length, 1);
assert.equal(
  scom.fallback[0].host,
  "safaricom.co.ke"
);
assert.equal(
  scom.fallback[0].sourceType,
  "ISSUER"
);
assert.equal(
  scom.fallback[0].sourcePriority,
  200
);

console.log(
  "PASS — SCOM acquisition plan is CMA primary then issuer fallback."
);

const eqt =
  buildIssuerDocumentAcquisitionPlan({
    symbol: "EQT"
  });

assert.equal(eqt.primary.length, 1);
assert.equal(
  eqt.primary[0].host,
  "annualreport.cma.or.ke"
);
assert.equal(eqt.fallback.length, 1);
assert.equal(
  eqt.fallback[0].host,
  "equitygroupholdings.com"
);

console.log(
  "PASS — EQT acquisition plan is CMA primary then issuer fallback."
);

const kcb =
  buildIssuerDocumentAcquisitionPlan({
    symbol: "KCB"
  });

assert.equal(kcb.primary.length, 1);
assert.equal(
  kcb.primary[0].host,
  "annualreport.cma.or.ke"
);
assert.equal(kcb.fallback.length, 0);

console.log(
  "PASS — KCB acquisition plan is CMA primary with no unqualified fallback."
);

assert.throws(
  () =>
    buildIssuerDocumentAcquisitionPlan({
      symbol: "FAKE"
    }),
  /No qualified issuer evidence source is configured/i
);

console.log(
  "PASS — unknown symbol cannot inherit CMA acquisition."
);

console.log(
  "PASS — FUND-010F13C acquisition-plan contract."
);
