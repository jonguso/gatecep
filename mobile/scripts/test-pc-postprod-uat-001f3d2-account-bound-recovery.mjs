import assert from "node:assert/strict";

import {
  findVerifiedEvidenceMatches,
  buildVerifiedEvidenceMatchAudit
} from "../src/features/broker-sync/realOrderExecutionEvidenceMatchCore.js";

import {
  buildRealOrderRecoveryTransition
} from "../src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js";

const ACCOUNT_A = "ABC|ACC-A";
const ACCOUNT_B = "ABC|ACC-B";

function makeOrder(overrides = {}) {
  return {
    id: "ORDER-D2",
    executionMode: "REAL",
    status: "BROKER_SELECTED",
    brokerStatus: "SUBMISSION_UNCERTAIN",
    symbol: "PORT",
    side: "BUY",
    quantity: 10,
    brokerId: "ABC",
    brokerName: "ABC Capital",
    submissionBrokerId: "ABC",
    lastSubmissionAttemptAt:
      "2026-10-15T10:00:00.000Z",
    ...overrides
  };
}

function makeEvidence(
  brokerAccountKey,
  overrides = {}
) {
  return {
    id: `EVIDENCE-${brokerAccountKey}`,
    date: "2026-10-15T10:05:00.000Z",
    executionDate:
      "2026-10-15T10:05:00.000Z",
    symbol: "PORT",
    side: "BUY",
    quantity: 10,
    price: 120,
    totalFees: 0,
    broker: "ABC Capital",
    brokerId: "ABC",
    brokerReference: "ABC-SAME-REF",
    fillReference:
      `FILL-${brokerAccountKey}`,
    settlementStatus: "SETTLED",
    status: "FILLED",
    evidenceStatus:
      "VERIFIED_BROKER_EXECUTION",
    canAffectRealPortfolio: true,
    source: "TRANSACTION_UPLOAD",
    brokerAccountKey,
    ...overrides
  };
}

const evidenceA = makeEvidence(ACCOUNT_A);
const evidenceB = makeEvidence(ACCOUNT_B);

const combined = [
  evidenceA,
  evidenceB
];

/*
 * 1. Heuristic matching is account-bound.
 */
{
  const matches =
    findVerifiedEvidenceMatches({
      order: makeOrder(),
      records: combined,
      expectedBrokerAccountKey:
        ACCOUNT_A
    });

  assert.equal(matches.length, 1);
  assert.equal(
    matches[0].brokerAccountKey,
    ACCOUNT_A
  );

  console.log(
    "PASS — heuristic recovery is account-bound."
  );
}

/*
 * 2. Exact broker reference is also account-bound.
 */
{
  const matches =
    findVerifiedEvidenceMatches({
      order: makeOrder({
        brokerOrderId:
          "ABC-SAME-REF"
      }),
      records: combined,
      expectedBrokerAccountKey:
        ACCOUNT_B
    });

  assert.equal(matches.length, 1);
  assert.equal(
    matches[0].brokerAccountKey,
    ACCOUNT_B
  );

  console.log(
    "PASS — exact broker reference is account-bound."
  );
}

/*
 * 3. Legacy unscoped evidence cannot satisfy an
 * account-bound recovery.
 */
{
  const legacy = {
    ...evidenceA
  };

  delete legacy.brokerAccountKey;

  const matches =
    findVerifiedEvidenceMatches({
      order: makeOrder(),
      records: [legacy],
      expectedBrokerAccountKey:
        ACCOUNT_A
    });

  assert.equal(matches.length, 0);

  console.log(
    "PASS — unscoped legacy evidence rejected for account-bound recovery."
  );
}

/*
 * 4. Existing account-unaware callers retain compatibility.
 */
{
  const legacy = {
    ...evidenceA
  };

  delete legacy.brokerAccountKey;

  const matches =
    findVerifiedEvidenceMatches({
      order: makeOrder(),
      records: [legacy]
    });

  assert.equal(matches.length, 1);

  console.log(
    "PASS — legacy caller behavior preserved without expected account key."
  );
}

/*
 * 5. Audit is account-bound.
 */
{
  const audit =
    buildVerifiedEvidenceMatchAudit({
      order: makeOrder(),
      records: combined,
      expectedBrokerAccountKey:
        ACCOUNT_A
    });

  assert.equal(audit.matchCount, 1);

  console.log(
    "PASS — recovery audit sees only account A."
  );
}

/*
 * 6. Transition is not made ambiguous by another
 * broker account containing equivalent evidence.
 */
{
  const decision =
    buildRealOrderRecoveryTransition({
      order: makeOrder(),
      executionMode: "REAL",
      records: combined,
      expectedBrokerAccountKey:
        ACCOUNT_A,
      now:
        "2026-10-15T10:10:00.000Z"
    });

  assert.equal(decision.matchCount, 1);

  console.log(
    "PASS — transition sees only account A evidence."
  );
}

/*
 * 7. B cannot recover A.
 */
{
  const matches =
    findVerifiedEvidenceMatches({
      order: makeOrder(),
      records: [evidenceB],
      expectedBrokerAccountKey:
        ACCOUNT_A
    });

  assert.equal(matches.length, 0);

  console.log(
    "PASS — account B cannot recover account A."
  );
}

console.log("");
console.log(
  "PC-POSTPROD-UAT-001F3D2 account-bound recovery PASSED."
);
