import assert from "node:assert/strict";

import {
  buildRealOrderRecoveryTransition
} from "../src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js";

import {
  findVerifiedEvidenceMatches
} from "../src/features/broker-sync/realOrderExecutionEvidenceMatchCore.js";

import {
  classifyBrokerExecutionEvidence
} from "../src/features/broker-sync/brokerExecutionEvidencePolicy.js";

import {
  normalizeCanonicalTradeEvents
} from "../src/features/trading/canonicalPortfolioLedgerService.js";


const NOW =
  "2026-09-14T16:00:00.000Z";


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


function evidence(overrides = {}) {
  return {
    id: "EVIDENCE-A32-1",

    executionDate:
      "2026-09-14T11:00:00.000Z",

    symbol: "SCOM",
    side: "BUY",

    quantity: 400,
    price: 25,

    broker:
      "ABC Capital",

    brokerReference:
      "ABC-ORDER-1001",

    totalFees: 40,

    settlementStatus:
      "SETTLED",

    status:
      "FILLED",

    source:
      "TRANSACTION_UPLOAD",

    ...overrides
  };
}


// =========================================================
// Scenario 1
// An individual execution smaller than the parent order
// can still be genuine VERIFIED_BROKER_EXECUTION evidence.
// =========================================================

{
  const classified =
    classifyBrokerExecutionEvidence(
      evidence()
    );

  assert.equal(
    classified.evidenceStatus,
    "VERIFIED_BROKER_EXECUTION"
  );

  assert.equal(
    classified.canAffectRealPortfolio,
    true
  );

  assert.equal(
    classified.quantity,
    400
  );

  console.log(
    "CONFIRMED: a completed 400-share broker execution can be verified independently of the 1,000-share parent order."
  );
}


// =========================================================
// Scenario 2
// Exact genuine broker reference permits the partial
// execution evidence to match the parent order.
// =========================================================

{
  const matches =
    findVerifiedEvidenceMatches({
      order: order(),
      records: [
        evidence()
      ]
    });

  assert.equal(
    matches.length,
    1
  );

  assert.equal(
    matches[0].quantity,
    400
  );

  console.log(
    "CONFIRMED: exact broker reference matches genuine partial execution evidence without requiring parent-order quantity equality."
  );
}


// =========================================================
// Scenario 3
// Current recovery incorrectly converts that partial
// execution into terminal FILLED state.
// =========================================================

{
  const result =
    buildRealOrderRecoveryTransition({
      order: order(),
      executionMode: "REAL",
      records: [
        evidence()
      ],
      now: NOW
    });

  assert.equal(
    result.resolved,
    true
  );

  assert.equal(
    result.patch.status,
    "FILLED"
  );

  assert.equal(
    result.patch.filledQuantity,
    400
  );

  assert.equal(
    result.patch.remainingQuantity,
    0
  );

  console.log(
    "DEFECT CONFIRMED: 400/1000 verified execution is written as FILLED with remainingQuantity=0."
  );
}


// =========================================================
// Scenario 4
// Without a known broker order reference, heuristic
// matching currently requires exact parent quantity.
// =========================================================

{
  const matches =
    findVerifiedEvidenceMatches({
      order:
        order({
          brokerOrderId: null
        }),

      records: [
        evidence()
      ]
    });

  assert.equal(
    matches.length,
    0
  );

  console.log(
    "CONFIRMED: heuristic recovery cannot identify a partial fill because it requires full order quantity equality."
  );
}


// =========================================================
// Scenario 5
// Multiple genuine execution rows sharing one broker order
// reference become ambiguous to current OMS recovery.
// =========================================================

{
  const records = [
    evidence({
      id: "EVIDENCE-A32-400",
      quantity: 400,
      price: 25,
      executionDate:
        "2026-09-14T11:00:00.000Z"
    }),

    evidence({
      id: "EVIDENCE-A32-350",
      quantity: 350,
      price: 25.1,
      executionDate:
        "2026-09-14T11:10:00.000Z"
    })
  ];

  const matches =
    findVerifiedEvidenceMatches({
      order: order(),
      records
    });

  assert.equal(
    matches.length,
    2
  );

  const result =
    buildRealOrderRecoveryTransition({
      order: order(),
      executionMode: "REAL",
      records,
      now: NOW
    });

  assert.equal(
    result.resolved,
    false
  );

  assert.equal(
    result.status,
    "AMBIGUOUS_VERIFIED_MATCH"
  );

  console.log(
    "DEFECT CONFIRMED: two genuine fills for the same broker order are treated as ambiguous rather than cumulative execution evidence."
  );
}


// =========================================================
// Scenario 6
// Canonical trade normalization currently deduplicates
// same-reference broker fills using brokerReference alone.
// =========================================================

{
  const first =
    classifyBrokerExecutionEvidence(
      evidence({
        id:
          "BROKER-FILL-A32-1",

        quantity: 400,

        price: 25,

        executionDate:
          "2026-09-14T11:00:00.000Z"
      })
    );

  const second =
    classifyBrokerExecutionEvidence(
      evidence({
        id:
          "BROKER-FILL-A32-2",

        quantity: 350,

        price: 25.1,

        executionDate:
          "2026-09-14T11:10:00.000Z"
      })
    );

  assert.equal(
    first.canAffectRealPortfolio,
    true
  );

  assert.equal(
    second.canAffectRealPortfolio,
    true
  );

  const normalized =
    normalizeCanonicalTradeEvents([
      first,
      second
    ]);

  console.log(
    "Canonical normalized event count:",
    normalized.length
  );

  console.log(
    "Canonical normalized quantities:",
    normalized.map(
      (row) => row.quantity
    )
  );

  assert.equal(
    normalized.length,
    1
  );

  console.log(
    "DEFECT CONFIRMED: canonical normalization collapses multiple genuine fills sharing one brokerReference."
  );
}


// =========================================================
// Scenario 7
// Different broker references remain independent.
// =========================================================

{
  const first =
    classifyBrokerExecutionEvidence(
      evidence({
        brokerReference:
          "ABC-FILL-1001-A",

        quantity: 400,

        executionDate:
          "2026-09-14T11:00:00.000Z"
      })
    );

  const second =
    classifyBrokerExecutionEvidence(
      evidence({
        brokerReference:
          "ABC-FILL-1001-B",

        quantity: 350,

        executionDate:
          "2026-09-14T11:10:00.000Z"
      })
    );

  const normalized =
    normalizeCanonicalTradeEvents([
      first,
      second
    ]);

  assert.equal(
    normalized.length,
    2
  );

  console.log(
    "PASS: distinct broker references remain distinct canonical executions."
  );
}


console.log();
console.log(
  "PC-031A32 REAL partial-fill discovery completed."
);
