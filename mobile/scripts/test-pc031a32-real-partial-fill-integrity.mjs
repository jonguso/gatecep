import assert from "node:assert/strict";

import {
  buildRealOrderRecoveryTransition
} from "../src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js";

import {
  classifyBrokerExecutionEvidence
} from "../src/features/broker-sync/brokerExecutionEvidencePolicy.js";

import {
  normalizeCanonicalTradeEvents
} from "../src/features/trading/canonicalPortfolioLedgerService.js";

import {
  buildExecutionStatusReadModel
} from "../src/services/trade/realExecutionStatusReadModel.js";


const NOW =
  "2026-09-14T17:00:00.000Z";


function order(overrides = {}) {
  return {
    id: "ORDER-A32-1",

    executionMode: "REAL",

    status: "BROKER_SELECTED",

    brokerStatus:
      "SUBMISSION_UNCERTAIN",

    symbol: "SCOM",
    side: "BUY",

    quantity: 1000,

    brokerId: "ABC",
    brokerName: "ABC Capital",
    submissionBrokerId: "ABC",

    brokerOrderId:
      "ABC-ORDER-1001",

    submissionAttemptId:
      "ATTEMPT-A32-1",

    lastSubmissionAttemptAt:
      "2026-09-14T10:00:00.000Z",

    ...overrides
  };
}


function evidence({
  id,
  quantity,
  price,
  time
}) {
  return {
    id,

    executionDate: time,

    symbol: "SCOM",
    side: "BUY",

    quantity,
    price,

    broker:
      "ABC Capital",

    brokerReference:
      "ABC-ORDER-1001",

    totalFees:
      quantity / 10,

    settlementStatus:
      "SETTLED",

    status:
      "FILLED",

    source:
      "TRANSACTION_UPLOAD"
  };
}


const fill400 =
  evidence({
    id: "FILL-400",
    quantity: 400,
    price: 25,

    time:
      "2026-09-14T11:00:00.000Z"
  });


const fill350 =
  evidence({
    id: "FILL-350",
    quantity: 350,
    price: 25.1,

    time:
      "2026-09-14T11:10:00.000Z"
  });


const fill250 =
  evidence({
    id: "FILL-250",
    quantity: 250,
    price: 25.2,

    time:
      "2026-09-14T11:20:00.000Z"
  });


function transition(
  orderValue,
  records
) {
  return buildRealOrderRecoveryTransition({
    order: orderValue,
    executionMode: "REAL",
    records,
    now: NOW
  });
}


// =========================================================
// 1. 400 / 1000 => PARTIAL_FILL
// =========================================================

{
  const result =
    transition(
      order(),
      [fill400]
    );

  assert.equal(
    result.resolved,
    true
  );

  assert.equal(
    result.status,
    "PARTIAL_FILL_FROM_VERIFIED_BROKER_EXECUTION"
  );

  assert.equal(
    result.patch.status,
    "PARTIAL_FILL"
  );

  assert.equal(
    result.patch.filledQuantity,
    400
  );

  assert.equal(
    result.patch.remainingQuantity,
    600
  );

  assert.equal(
    result.patch.fillPercent,
    40
  );

  assert.equal(
    result.patch.averageFillPrice,
    25
  );

  assert.equal(
    result.patch.filledAt,
    null
  );

  console.log(
    "PASS: 400/1000 genuine execution produces PARTIAL_FILL with 600 remaining."
  );
}


// =========================================================
// 2. Verified REAL partial fill must remain recoverable.
// =========================================================

{
  const first =
    transition(
      order(),
      [fill400]
    );

  const partialOrder = {
    ...order(),
    ...first.patch
  };

  const model =
    buildExecutionStatusReadModel(
      partialOrder,
      {
        executionMode: "REAL",
        orders: [
          partialOrder
        ]
      }
    );

  assert.equal(
    model.phase,
    "PARTIAL_FILL"
  );

  assert.equal(
    model.recoveryRequired,
    true
  );

  console.log(
    "PASS: verified REAL PARTIAL_FILL remains eligible for evidence reconciliation."
  );
}


// =========================================================
// 3. Authoritative evidence 400 + 350 => 750 / 1000.
// =========================================================

{
  const first =
    transition(
      order(),
      [fill400]
    );

  const partialOrder = {
    ...order(),
    ...first.patch
  };

  const result =
    transition(
      partialOrder,
      [
        fill400,
        fill350
      ]
    );

  assert.equal(
    result.resolved,
    true
  );

  assert.equal(
    result.status,
    "PARTIAL_FILL_FROM_VERIFIED_BROKER_EXECUTION"
  );

  assert.equal(
    result.patch.status,
    "PARTIAL_FILL"
  );

  assert.equal(
    result.patch.filledQuantity,
    750
  );

  assert.equal(
    result.patch.remainingQuantity,
    250
  );

  assert.equal(
    result.patch.fillPercent,
    75
  );

  const expectedAverage =
    (
      400 * 25 +
      350 * 25.1
    ) / 750;

  assert.ok(
    Math.abs(
      result.patch.averageFillPrice -
      expectedAverage
    ) < 0.000001
  );

  console.log(
    "PASS: authoritative 400+350 evidence converges OMS to 750/1000."
  );
}


// =========================================================
// 4. 400 + 350 + 250 => FILLED 1000 / 1000.
// =========================================================

{
  const first =
    transition(
      order(),
      [fill400]
    );

  const partial400 = {
    ...order(),
    ...first.patch
  };

  const second =
    transition(
      partial400,
      [
        fill400,
        fill350
      ]
    );

  const partial750 = {
    ...order(),
    ...second.patch
  };

  const result =
    transition(
      partial750,
      [
        fill400,
        fill350,
        fill250
      ]
    );

  assert.equal(
    result.resolved,
    true
  );

  assert.equal(
    result.status,
    "RESOLVED_FROM_VERIFIED_BROKER_EXECUTION"
  );

  assert.equal(
    result.patch.status,
    "FILLED"
  );

  assert.equal(
    result.patch.filledQuantity,
    1000
  );

  assert.equal(
    result.patch.remainingQuantity,
    0
  );

  assert.equal(
    result.patch.fillPercent,
    100
  );

  assert.equal(
    result.patch.filledAt,
    "2026-09-14T11:20:00.000Z"
  );

  const expectedAverage =
    (
      400 * 25 +
      350 * 25.1 +
      250 * 25.2
    ) / 1000;

  assert.ok(
    Math.abs(
      result.patch.averageFillPrice -
      expectedAverage
    ) < 0.000001
  );

  console.log(
    "PASS: authoritative 400+350+250 evidence converges OMS to FILLED 1000/1000."
  );
}


// =========================================================
// 5. Overfill must fail closed.
// =========================================================

{
  const result =
    transition(
      order(),
      [
        fill400,
        fill350,
        fill250,

        evidence({
          id: "FILL-EXCESS",
          quantity: 50,
          price: 25.3,

          time:
            "2026-09-14T11:30:00.000Z"
        })
      ]
    );

  assert.equal(
    result.resolved,
    false
  );

  assert.equal(
    result.status,
    "VERIFIED_EXECUTION_QUANTITY_EXCEEDS_ORDER"
  );

  assert.equal(
    result.patch,
    null
  );

  assert.equal(
    result.filledQuantity,
    1050
  );

  assert.equal(
    result.orderQuantity,
    1000
  );

  console.log(
    "PASS: cumulative broker execution above parent quantity fails closed."
  );
}


// =========================================================
// 6. Same parent broker reference must preserve each
// genuine fill as an independent canonical trade event.
// =========================================================

{
  const classified =
    [
      fill400,
      fill350,
      fill250
    ].map(
      (row) =>
        classifyBrokerExecutionEvidence(
          row
        )
    );

  assert.ok(
    classified.every(
      (row) =>
        row.canAffectRealPortfolio ===
        true
    )
  );

  const normalized =
    normalizeCanonicalTradeEvents(
      classified
    );

  assert.equal(
    normalized.length,
    3
  );

  assert.deepEqual(
    normalized.map(
      (row) =>
        row.quantity
    ),
    [
      400,
      350,
      250
    ]
  );

  console.log(
    "PASS: three genuine fills sharing one broker parent reference remain three canonical trade events."
  );
}


// =========================================================
// 7. An exact duplicate execution must still dedupe even
// if its local/import row ID differs.
// =========================================================

{
  const first =
    classifyBrokerExecutionEvidence(
      fill400
    );

  const duplicate = {
    ...first,

    id:
      "ANOTHER-LOCAL-ID"
  };

  const normalized =
    normalizeCanonicalTradeEvents([
      first,
      duplicate
    ]);

  assert.equal(
    normalized.length,
    1
  );

  console.log(
    "PASS: exact duplicate broker execution evidence still deduplicates."
  );
}


// =========================================================
// 8. Duplicate representation of the SAME genuine broker
// fill must not double-count OMS recovery quantity.
// =========================================================

{
  const duplicate400 = {
    ...fill400,

    // Different local/import identity must not turn the same
    // economic broker execution into a second fill.
    id:
      "SECOND-LOCAL-ROW-FOR-FILL-400"
  };

  const result =
    transition(
      order(),
      [
        fill400,
        duplicate400
      ]
    );

  assert.equal(
    result.resolved,
    true
  );

  assert.equal(
    result.status,
    "PARTIAL_FILL_FROM_VERIFIED_BROKER_EXECUTION"
  );

  assert.equal(
    result.patch.status,
    "PARTIAL_FILL"
  );

  assert.equal(
    result.patch.filledQuantity,
    400
  );

  assert.equal(
    result.patch.remainingQuantity,
    600
  );

  assert.equal(
    result.patch.fillPercent,
    40
  );

  assert.equal(
    result.patch.verifiedExecutionEvidence.fillCount,
    1
  );

  assert.equal(
    result.patch.verifiedExecutionEvidenceRecords.length,
    1
  );

  console.log(
    "PASS: duplicate representation of one 400-share broker fill remains 400/1000 in OMS recovery."
  );
}


// =========================================================
// 9. Without genuine brokerOrderId, partial evidence must
// remain fail-closed under conservative heuristic matching.
// =========================================================

{
  const result =
    transition(
      order({
        brokerOrderId: null
      }),
      [fill400]
    );

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
    "PASS: partial recovery without genuine broker order identity remains fail-closed."
  );
}


console.log();
console.log(
  "PC-031A32 REAL partial-fill integrity tests PASSED."
);
