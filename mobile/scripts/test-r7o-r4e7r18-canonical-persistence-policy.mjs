import assert from "node:assert/strict";

import {
  classifyCanonicalHistoryAuthority,
  requireCanonicalAppendAuthority,
  requireVerifiedAppendBatch
} from "../src/features/transactions/transactionHistoryCanonicalPersistencePolicy.js";

function pass(name) {
  console.log(
    name + "=PASS"
  );
}

const neverEstablished =
  classifyCanonicalHistoryAuthority({
    authorityEstablished: false,
    currentGeneration: null,
    count: 0,
    history: []
  });

assert.equal(
  neverEstablished.state,
  "AUTHORITY_NOT_ESTABLISHED"
);

assert.equal(
  neverEstablished.mayInvalidateLocalEvidence,
  false
);

assert.equal(
  neverEstablished.mayAppendWithObservedGeneration,
  false
);

pass(
  "NEVER_ESTABLISHED_DOES_NOT_INVALIDATE_LOCAL"
);

const cleared =
  classifyCanonicalHistoryAuthority({
    authorityEstablished: true,
    currentGeneration: 1,
    count: 0,
    history: []
  });

assert.equal(
  cleared.state,
  "AUTHORITY_ESTABLISHED_EMPTY"
);

assert.equal(
  cleared.mayInvalidateLocalEvidence,
  true
);

assert.equal(
  cleared.mayAppendWithObservedGeneration,
  true
);

assert.equal(
  cleared.currentGeneration,
  1
);

pass(
  "ESTABLISHED_EMPTY_CLASSIFIED_FOR_CLEAR"
);

const existingHistory = [
  {
    executionIdentity:
      "AIB|137971|ORDER-001"
  }
];

const populated =
  classifyCanonicalHistoryAuthority({
    authorityEstablished: true,
    currentGeneration: 1,
    count: 1,
    history: existingHistory
  });

assert.equal(
  populated.state,
  "AUTHORITY_ESTABLISHED_WITH_HISTORY"
);

assert.equal(
  populated.mayInvalidateLocalEvidence,
  false
);

assert.equal(
  populated.mayAppendWithObservedGeneration,
  true
);

pass(
  "POPULATED_AUTHORITY_PRESERVES_LOCAL"
);

const appendAuthority =
  requireCanonicalAppendAuthority({
    authorityEstablished: true,
    currentGeneration: 1,
    count: 0,
    history: []
  });

assert.equal(
  appendAuthority.observedGeneration,
  1
);

assert.equal(
  appendAuthority.authorityState,
  "AUTHORITY_ESTABLISHED_EMPTY"
);

pass(
  "OBSERVED_GENERATION_DERIVED_FROM_SERVER"
);

assert.throws(
  () =>
    requireCanonicalAppendAuthority({
      authorityEstablished: false,
      currentGeneration: null,
      count: 0,
      history: []
    }),
  /not established/i
);

pass(
  "UNESTABLISHED_AUTHORITY_BLOCKS_NORMAL_APPEND"
);

const verifiedBatch = [
  {
    executionIdentity:
      "AIB|137971|ORDER-001",

    exchangeOrderNo:
      "ORDER-001",

    historicalExecutionState:
      "READY",

    executionConfirmed:
      true,

    fifoEligible:
      true,

    canAffectFifo:
      true,

    totalTradedQuantity:
      100,

    executionPrice:
      25.5
  }
];

assert.equal(
  requireVerifiedAppendBatch(
    verifiedBatch
  ),
  verifiedBatch
);

pass(
  "VERIFIED_READY_BATCH_ACCEPTED"
);

assert.throws(
  () =>
    requireVerifiedAppendBatch([
      {
        ...verifiedBatch[0],
        historicalExecutionState:
          "NEEDS_REVIEW"
      }
    ]),
  /not READY/i
);

pass(
  "NEEDS_REVIEW_BATCH_REJECTED"
);

assert.throws(
  () =>
    requireVerifiedAppendBatch([
      {
        ...verifiedBatch[0],
        executionPrice:
          null
      }
    ]),
  /execution price/i
);

pass(
  "MISSING_EXECUTION_PRICE_REJECTED"
);

assert.throws(
  () =>
    classifyCanonicalHistoryAuthority({
      authorityEstablished: true,
      currentGeneration: 1,
      count: 2,
      history: [{}]
    }),
  /count is invalid/i
);

pass(
  "CANONICAL_COUNT_MISMATCH_REJECTED"
);

assert.throws(
  () =>
    classifyCanonicalHistoryAuthority({
      authorityEstablished: true,
      currentGeneration: null,
      count: 0,
      history: []
    }),
  /currentGeneration/i
);

pass(
  "ESTABLISHED_AUTHORITY_REQUIRES_GENERATION"
);

console.log(
  "R7O_R4E7R18_POLICY_TEST=PASS"
);
