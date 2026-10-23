import assert from "node:assert/strict";

import {
  evaluateFundamentalDocumentRetention
} from "../src/modules/fundamental-evidence/fundamentalDocumentRetention.policy.js";

console.log(
  "===== FUND-010F14C — RETENTION ELIGIBILITY TEST ====="
);

const retrieval = {
  persistence: "NONE",
  verifiedFiling: false,
  verified: false,
  authoritative: false
};

const validIdentity = {
  identityStatus: "IDENTIFIED",
  symbol: "KCB",
  fiscalYear: 2025,
  filingType: "ANNUAL_REPORT"
};

const eligible =
  evaluateFundamentalDocumentRetention({
    expectedSymbol: "KCB",
    expectedFiscalYear: 2025,
    expectedFilingType:
      "ANNUAL_REPORT",
    source: "CMA",
    identity: validIdentity,
    retrieval
  });

assert.equal(
  eligible.eligible,
  true
);

assert.equal(
  eligible.reason,
  "VALIDATED_DOCUMENT_ELIGIBLE"
);

assert.equal(
  eligible.persistence,
  "ELIGIBLE_NOT_WRITTEN"
);

assert.equal(
  eligible.authoritative,
  false
);

assert.equal(
  eligible.verified,
  false
);

assert.equal(
  eligible.storageIdentity.relativePath,
  "fundamental-documents/KCB/2025/KCB_2025_ANNUAL_REPORT_CMA.pdf"
);

console.log(
  "PASS — validated KCB document becomes retention-eligible."
);

const wrongSymbol =
  evaluateFundamentalDocumentRetention({
    expectedSymbol: "KCB",
    expectedFiscalYear: 2025,
    source: "CMA",
    identity: {
      ...validIdentity,
      symbol: "EQT"
    },
    retrieval
  });

assert.deepEqual(
  {
    eligible:
      wrongSymbol.eligible,
    reason:
      wrongSymbol.reason
  },
  {
    eligible: false,
    reason: "SYMBOL_MISMATCH"
  }
);

console.log(
  "PASS — wrong issuer fails closed."
);

const wrongYear =
  evaluateFundamentalDocumentRetention({
    expectedSymbol: "KCB",
    expectedFiscalYear: 2025,
    source: "CMA",
    identity: {
      ...validIdentity,
      fiscalYear: 2024
    },
    retrieval
  });

assert.equal(
  wrongYear.eligible,
  false
);

assert.equal(
  wrongYear.reason,
  "FISCAL_YEAR_MISMATCH"
);

console.log(
  "PASS — wrong fiscal year fails closed."
);

const wrongType =
  evaluateFundamentalDocumentRetention({
    expectedSymbol: "KCB",
    expectedFiscalYear: 2025,
    source: "CMA",
    identity: {
      ...validIdentity,
      filingType:
        "INTERIM_REPORT"
    },
    retrieval
  });

assert.equal(
  wrongType.eligible,
  false
);

assert.equal(
  wrongType.reason,
  "FILING_TYPE_MISMATCH"
);

console.log(
  "PASS — wrong filing type fails closed."
);

const unvalidated =
  evaluateFundamentalDocumentRetention({
    expectedSymbol: "KCB",
    expectedFiscalYear: 2025,
    source: "CMA",
    identity: {
      ...validIdentity,
      identityStatus:
        "UNRESOLVED"
    },
    retrieval
  });

assert.equal(
  unvalidated.eligible,
  false
);

assert.equal(
  unvalidated.reason,
  "IDENTITY_NOT_VALIDATED"
);

console.log(
  "PASS — unresolved identity is not retention-eligible."
);

const badRetrieval =
  evaluateFundamentalDocumentRetention({
    expectedSymbol: "KCB",
    expectedFiscalYear: 2025,
    source: "CMA",
    identity:
      validIdentity,
    retrieval: {
      ...retrieval,
      authoritative: true
    }
  });

assert.equal(
  badRetrieval.eligible,
  false
);

assert.equal(
  badRetrieval.reason,
  "RETRIEVAL_CONTRACT_VIOLATION"
);

console.log(
  "PASS — preview retrieval authority violation fails closed."
);

console.log(
  JSON.stringify(
    eligible,
    null,
    2
  )
);

console.log(
  "F10F14C_DIRECTORY_CREATION=NONE"
);
console.log(
  "F10F14C_DOCUMENT_WRITE=NONE"
);
console.log(
  "F10F14C_DOCUMENT_DOWNLOAD=NONE"
);
console.log(
  "F10F14C_PROVIDER_CALL=NONE"
);
console.log(
  "F10F14C_PROVIDER_COST=ZERO"
);
console.log(
  "F10F14C_DATABASE_MUTATION=NONE"
);
console.log(
  "F10F14C_FUNDAMENTAL_MUTATION=NONE"
);
console.log(
  "F10F14C_APPROVAL=NONE"
);
console.log(
  "F10F14C_PROMOTION=NONE"
);
console.log(
  "F10F14C_PUBLICATION=NONE"
);

console.log(
  "===== FUND-010F14C PASS ====="
);
