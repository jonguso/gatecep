import assert from "node:assert/strict";

import {
  buildRealOrderRecoveryTransition
} from "../src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js";

const NOW =
  "2026-09-14T12:00:00.000Z";

function order(overrides = {}) {
  return {
    id: "ORDER-A14-1",

    executionMode: "REAL",

    status: "BROKER_SELECTED",

    brokerStatus:
      "SUBMISSION_UNCERTAIN",

    symbol: "SCOM",
    side: "BUY",
    quantity: 100,

    brokerId: "ABC",
    brokerName: "ABC Capital",
    submissionBrokerId: "ABC",

    submissionAttemptId:
      "ATTEMPT-A14-1",

    lastSubmissionAttemptAt:
      "2026-09-14T10:00:00.000Z",

    ...overrides
  };
}

function evidence(overrides = {}) {
  return {
    id: "EVIDENCE-A14-1",

    date:
      "2026-09-14T11:00:00.000Z",

    symbol: "SCOM",
    side: "BUY",
    quantity: 100,
    price: 25,

    broker:
      "ABC Capital",

    brokerReference:
      "ABC-EXEC-1001",

    fees: 25,

    settlementStatus:
      "SETTLED",

    status:
      "FILLED",

    source:
      "TRANSACTION_UPLOAD",

    ...overrides
  };
}

function transition({
  orderValue = order(),
  executionMode = "REAL",
  records = [evidence()]
} = {}) {
  return buildRealOrderRecoveryTransition({
    order: orderValue,
    executionMode,
    records,
    now: NOW
  });
}

// 1. Missing order.
{
  const result = transition({
    orderValue: null
  });

  assert.equal(
    result.resolved,
    false
  );

  assert.equal(
    result.status,
    "ORDER_NOT_FOUND"
  );

  assert.equal(
    result.patch,
    null
  );

  console.log(
    "PASS: missing order produces no transition patch."
  );
}

// 2. PRACTICE order.
{
  const result = transition({
    orderValue:
      order({
        executionMode: "PRACTICE"
      })
  });

  assert.equal(
    result.resolved,
    false
  );

  assert.equal(
    result.status,
    "NOT_REAL_ORDER"
  );

  assert.equal(
    result.patch,
    null
  );

  console.log(
    "PASS: PRACTICE order cannot enter REAL recovery transition."
  );
}

// 3. Non-recoverable REAL status.
{
  const result = transition({
    orderValue:
      order({
        status: "QUEUED"
      })
  });

  assert.equal(
    result.resolved,
    false
  );

  assert.equal(
    result.status,
    "ORDER_NOT_RECOVERABLE"
  );

  assert.equal(
    result.patch,
    null
  );

  console.log(
    "PASS: non-recoverable REAL order produces no patch."
  );
}

// 4. No verified match.
{
  const result = transition({
    records: [
      evidence({
        symbol: "EQTY"
      })
    ]
  });

  assert.equal(
    result.resolved,
    false
  );

  assert.equal(
    result.status,
    "NO_VERIFIED_MATCH"
  );

  assert.equal(
    result.patch,
    null
  );

  console.log(
    "PASS: no verified match produces no transition patch."
  );
}

// 5. Ambiguous match.
{
  const result = transition({
    records: [
      evidence({
        brokerReference:
          "ABC-EXEC-1"
      }),
      evidence({
        brokerReference:
          "ABC-EXEC-2"
      })
    ]
  });

  assert.equal(
    result.resolved,
    false
  );

  assert.equal(
    result.status,
    "AMBIGUOUS_VERIFIED_MATCH"
  );

  assert.equal(
    result.matchCount,
    2
  );

  assert.equal(
    result.patch,
    null
  );

  console.log(
    "PASS: ambiguous verified evidence remains locked."
  );
}

// 6-14. Unique verified match transition contract.
{
  const result = transition();

  assert.equal(
    result.resolved,
    true
  );

  assert.equal(
    result.status,
    "RESOLVED_FROM_VERIFIED_BROKER_EXECUTION"
  );

  assert.equal(
    result.matchCount,
    1
  );

  const patch = result.patch;

  assert.ok(
    patch,
    "unique match must create exactly one state patch"
  );

  assert.equal(
    patch.status,
    "FILLED"
  );

  assert.equal(
    patch.executionMode,
    "REAL"
  );

  assert.equal(
    patch.brokerOrderId,
    "ABC-EXEC-1001"
  );

  assert.equal(
    patch.filledQuantity,
    100
  );

  assert.equal(
    patch.remainingQuantity,
    0
  );

  assert.equal(
    patch.averageFillPrice,
    25
  );

  assert.equal(
    patch.filledAt,
    "2026-09-14T11:00:00.000Z"
  );

  assert.equal(
    patch.brokerReceivedAt,
    "2026-09-14T11:00:00.000Z"
  );

  assert.notEqual(
    patch.filledAt,
    NOW,
    "broker execution time must not be fabricated from reconciliation time"
  );

  assert.equal(
    patch.verifiedExecutionEvidence
      ?.evidenceStatus,
    "VERIFIED_BROKER_EXECUTION"
  );

  assert.equal(
    patch.verifiedExecutionEvidence
      ?.sourceType,
    "BROKER_EXECUTION_EVIDENCE"
  );

  assert.equal(
    patch.verifiedExecutionEvidence
      ?.brokerReference,
    "ABC-EXEC-1001"
  );

  assert.equal(
    patch.verifiedExecutionEvidence
      ?.executionDate,
    "2026-09-14T11:00:00.000Z"
  );

  assert.equal(
    patch.realExecutionReconciliation
      ?.status,
    "RESOLVED_FROM_VERIFIED_BROKER_EXECUTION"
  );

  assert.equal(
    patch.realExecutionReconciliation
      ?.matchedAt,
    NOW
  );

  assert.equal(
    patch.realExecutionReconciliation
      ?.matchCount,
    1
  );

  assert.equal(
    patch.realExecutionReconciliation
      ?.previousBrokerStatus,
    "SUBMISSION_UNCERTAIN"
  );

  assert.equal(
    patch.realExecutionReconciliation
      ?.submissionAttemptId,
    "ATTEMPT-A14-1"
  );

  assert.equal(
    patch.isPractice,
    false
  );

  console.log(
    "PASS: unique verified evidence builds the canonical FILLED recovery patch."
  );
}

// Existing genuine brokerOrderId must win over evidence reference.
{
  const result = transition({
    orderValue:
      order({
        brokerOrderId:
          "ABC-CONFIRMED-777"
      }),

    records: [
      evidence({
        brokerReference:
          "ABC-CONFIRMED-777"
      })
    ]
  });

  assert.equal(
    result.resolved,
    true
  );

  assert.equal(
    result.patch?.brokerOrderId,
    "ABC-CONFIRMED-777"
  );

  console.log(
    "PASS: existing genuine brokerOrderId is preserved."
  );
}

// Rejected evidence can never produce a FILLED patch.
{
  const result = transition({
    records: [
      evidence({
        status: "REJECTED"
      })
    ]
  });

  assert.equal(
    result.resolved,
    false
  );

  assert.equal(
    result.status,
    "NO_VERIFIED_MATCH"
  );

  assert.equal(
    result.patch,
    null
  );

  console.log(
    "PASS: rejected evidence cannot manufacture a FILLED transition."
  );
}

console.log("");
console.log(
  "PC-031A14 recovery transition runtime tests PASSED."
);
