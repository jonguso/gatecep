import assert from "node:assert/strict";

import {
  buildFundamentalDocumentRetentionBoundary
} from "../src/modules/fundamental-evidence/fundamentalDocumentRetentionBoundary.js";

console.log(
  "===== FUND-010F14H — RETENTION BOUNDARY TEST ====="
);

const identity = {
  identityStatus:
    "IDENTIFIED",
  symbol:
    "KCB",
  fiscalYear:
    2025,
  filingType:
    "ANNUAL_REPORT",
  persistence:
    "NONE",
  verifiedFiling:
    false,
  verified:
    false,
  authoritative:
    false
};

const extraction = {
  symbol:
    "KCB",
  fiscalYear:
    2025,
  filingType:
    "ANNUAL_REPORT",
  extractionOnly:
    true,
  persistence:
    "NONE",
  verifiedFiling:
    false,
  verified:
    false,
  authoritative:
    false
};

const retrieval = {
  persistence:
    "NONE",
  verifiedFiling:
    false,
  verified:
    false,
  authoritative:
    false,
  retrievalMethod:
    "TEST_FIXTURE"
};

const boundary =
  buildFundamentalDocumentRetentionBoundary({
    symbol:
      "kcb",
    identity,
    extraction,
    retrieval,
    source:
      "cma"
  });

assert.equal(
  boundary.expectedSymbol,
  "KCB"
);

assert.equal(
  boundary.expectedFiscalYear,
  2025
);

assert.equal(
  boundary.expectedFilingType,
  "ANNUAL_REPORT"
);

assert.equal(
  boundary.source,
  "CMA"
);

assert.equal(
  boundary.identity,
  identity
);

assert.equal(
  boundary.retrieval,
  retrieval
);

console.log(
  "PASS — validated preview evidence maps to F14F contract."
);

await assert.rejects(
  async () =>
    buildFundamentalDocumentRetentionBoundary({
      symbol:
        "KCB",
      identity: {
        ...identity,
        identityStatus:
          "PARTIAL"
      },
      extraction,
      retrieval,
      source:
        "CMA"
    }),
  /must be IDENTIFIED/
);

console.log(
  "PASS — unresolved/partial identity fails closed."
);

await assert.rejects(
  async () =>
    buildFundamentalDocumentRetentionBoundary({
      symbol:
        "KCB",
      identity: {
        ...identity,
        symbol:
          "EQT"
      },
      extraction,
      retrieval,
      source:
        "CMA"
    }),
  /issuer does not match/
);

console.log(
  "PASS — wrong issuer fails closed."
);

await assert.rejects(
  async () =>
    buildFundamentalDocumentRetentionBoundary({
      symbol:
        "KCB",
      identity,
      extraction: {
        ...extraction,
        fiscalYear:
          2024
      },
      retrieval,
      source:
        "CMA"
    }),
  /Identity and extraction evidence disagree/
);

console.log(
  "PASS — identity/extraction year disagreement fails closed."
);

await assert.rejects(
  async () =>
    buildFundamentalDocumentRetentionBoundary({
      symbol:
        "KCB",
      identity,
      extraction: {
        ...extraction,
        filingType:
          "INTERIM_REPORT"
      },
      retrieval,
      source:
        "CMA"
    }),
  /Identity and extraction evidence disagree/
);

console.log(
  "PASS — identity/extraction filing-type disagreement fails closed."
);

await assert.rejects(
  async () =>
    buildFundamentalDocumentRetentionBoundary({
      symbol:
        "KCB",
      identity,
      extraction,
      retrieval:
        null,
      source:
        "CMA"
    }),
  /Retrieval evidence is required/
);

console.log(
  "PASS — missing retrieval evidence fails closed."
);

await assert.rejects(
  async () =>
    buildFundamentalDocumentRetentionBoundary({
      symbol:
        "KCB",
      identity,
      extraction,
      retrieval,
      source:
        ""
    }),
  /document source is required/i
);

console.log(
  "PASS — missing source fails closed."
);

console.log(
  JSON.stringify(
    {
      expectedSymbol:
        boundary.expectedSymbol,
      expectedFiscalYear:
        boundary.expectedFiscalYear,
      expectedFilingType:
        boundary.expectedFilingType,
      source:
        boundary.source,
      retrievalPersistence:
        boundary.retrieval.persistence,
      retrievalVerified:
        boundary.retrieval.verified,
      retrievalAuthoritative:
        boundary.retrieval.authoritative
    },
    null,
    2
  )
);

console.log(
  "F10F14H_DOCUMENT_WRITE=NONE"
);
console.log(
  "F10F14H_DOCUMENT_DOWNLOAD=NONE"
);
console.log(
  "F10F14H_PROVIDER_CALL=NONE"
);
console.log(
  "F10F14H_PROVIDER_COST=ZERO"
);
console.log(
  "F10F14H_DATABASE_MUTATION=NONE"
);
console.log(
  "F10F14H_FUNDAMENTAL_MUTATION=NONE"
);
console.log(
  "F10F14H_APPROVAL=NONE"
);
console.log(
  "F10F14H_PROMOTION=NONE"
);
console.log(
  "F10F14H_PUBLICATION=NONE"
);

console.log(
  "===== FUND-010F14H PASS ====="
);
