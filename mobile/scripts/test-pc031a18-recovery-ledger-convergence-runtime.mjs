import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildRealOrderRecoveryTransition
} from "../src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js";

import {
  normalizeCanonicalTradeEvents,
  buildCanonicalSecurityLedger,
  deriveTradeCashEvents
} from "../src/features/trading/canonicalPortfolioLedgerService.js";

const NOW =
  "2026-09-14T12:00:00.000Z";

function verifiedEvidence(overrides = {}) {
  return {
    id: "ABC-A18-EXEC-1",
    brokerReference:
      "ABC-A18-EXEC-1",

    broker:
      "ABC Capital",

    symbol:
      "SCOM",

    side:
      "BUY",

    quantity:
      100,

    price:
      25,

    totalFees:
      25,

    executionDate:
      "2026-09-14T11:00:00.000Z",

    settlementDate:
      "2026-09-16",

    settlementStatus:
      "SETTLED",

    status:
      "FILLED",

    executionStatus:
      "FILLED",

    evidenceStatus:
      "VERIFIED_BROKER_EXECUTION",

    canAffectRealPortfolio:
      true,

    source:
      "TRANSACTION_UPLOAD",

    sourceType:
      "BROKER_EXECUTION_EVIDENCE",

    ...overrides
  };
}

function uncertainOrder(overrides = {}) {
  return {
    id:
      "ORDER-A18-1",

    executionMode:
      "REAL",

    status:
      "BROKER_SELECTED",

    brokerStatus:
      "SUBMISSION_UNCERTAIN",

    brokerId:
      "ABC",

    brokerAccountId:
      "ABC-ACCOUNT-1",

    submissionBrokerId:
      "ABC",

    submissionBrokerAccountId:
      "ABC-ACCOUNT-1",

    submissionAttemptId:
      "ATTEMPT-A18-1",

    submissionAttemptCount:
      1,

    lastSubmissionAttemptAt:
      "2026-09-14T10:00:00.000Z",

    symbol:
      "SCOM",

    side:
      "BUY",

    quantity:
      100,

    price:
      25,

    brokerOrderId:
      null,

    ...overrides
  };
}

// --------------------------------------------------
// 1. One verified execution resolves one uncertain
// OMS order.
// --------------------------------------------------
const evidence =
  verifiedEvidence();

const order =
  uncertainOrder();

const recovery =
  buildRealOrderRecoveryTransition({
    order,
    executionMode: "REAL",
    records: [evidence],
    now: NOW
  });

assert.equal(
  recovery.resolved,
  true
);

assert.equal(
  recovery.matchCount,
  1
);

assert.equal(
  recovery.status,
  "RESOLVED_FROM_VERIFIED_BROKER_EXECUTION"
);

console.log(
  "PASS: one verified broker execution resolves exactly one uncertain REAL OMS order."
);

// --------------------------------------------------
// 2. OMS broker reference must converge to genuine
// broker evidence reference.
// --------------------------------------------------
assert.equal(
  recovery.patch.brokerOrderId,
  evidence.brokerReference
);

assert.equal(
  recovery.patch
    .verifiedExecutionEvidence
    .brokerReference,
  evidence.brokerReference
);

console.log(
  "PASS: OMS brokerOrderId converges to the genuine verified broker reference."
);

// --------------------------------------------------
// 3. OMS execution economics/time must match evidence.
// --------------------------------------------------
assert.equal(
  recovery.patch.filledQuantity,
  evidence.quantity
);

assert.equal(
  recovery.patch.averageFillPrice,
  evidence.price
);

assert.equal(
  recovery.patch.filledAt,
  evidence.executionDate
);

assert.equal(
  recovery.patch.brokerReceivedAt,
  evidence.executionDate
);

assert.equal(
  recovery.patch
    .verifiedExecutionEvidence
    .executionDate,
  evidence.executionDate
);

console.log(
  "PASS: OMS quantity, price and execution time converge to broker evidence."
);

// --------------------------------------------------
// 4. Canonical accounting receives exactly the same
// broker execution identity.
// --------------------------------------------------
const canonical =
  normalizeCanonicalTradeEvents([
    evidence
  ]);

assert.equal(
  canonical.length,
  1
);

assert.equal(
  canonical[0].brokerReference,
  recovery.patch.brokerOrderId
);

assert.equal(
  canonical[0].symbol,
  order.symbol
);

assert.equal(
  canonical[0].side,
  order.side
);

assert.equal(
  canonical[0].quantity,
  recovery.patch.filledQuantity
);

assert.equal(
  canonical[0].price,
  recovery.patch.averageFillPrice
);

assert.equal(
  canonical[0].executionDate,
  recovery.patch.filledAt
);

console.log(
  "PASS: OMS recovery and canonical accounting converge on the same execution identity and economics."
);

// --------------------------------------------------
// 5. Duplicate broker evidence cannot create a second
// canonical trade event.
// --------------------------------------------------
const duplicateCanonical =
  normalizeCanonicalTradeEvents([
    evidence,
    { ...evidence }
  ]);

assert.equal(
  duplicateCanonical.length,
  1
);

assert.equal(
  duplicateCanonical[0].brokerReference,
  evidence.brokerReference
);

console.log(
  "PASS: duplicate broker evidence cannot create a second canonical execution event."
);

// --------------------------------------------------
// 6. Duplicate evidence cannot create duplicate trade
// cash effects.
// --------------------------------------------------
const cashEvents =
  deriveTradeCashEvents([
    evidence,
    { ...evidence }
  ]);

assert.equal(
  cashEvents.length,
  2
);

assert.equal(
  cashEvents.filter(
    (row) =>
      row.type ===
      "BUY_CONSIDERATION"
  ).length,
  1
);

assert.equal(
  cashEvents.filter(
    (row) =>
      row.type ===
      "BUY_FEES"
  ).length,
  1
);

assert.ok(
  cashEvents.every(
    (row) =>
      row.brokerReference ===
      evidence.brokerReference
  )
);

console.log(
  "PASS: duplicate evidence cannot double-apply canonical trade cash effects."
);

// --------------------------------------------------
// 7. Verified BUY produces exactly one genuine
// canonical acquisition quantity.
// --------------------------------------------------
const ledger =
  buildCanonicalSecurityLedger({
    transactions: [
      evidence,
      { ...evidence }
    ],

    holdings: [
      {
        symbol:
          "SCOM",

        quantity:
          100,

        averagePrice:
          25.25
      }
    ]
  });

assert.equal(
  ledger.events.length,
  1
);

assert.equal(
  ledger.securities.length,
  1
);

assert.equal(
  ledger.securities[0]
    .reconstructedQuantity,
  100
);

console.log(
  "PASS: one verified broker BUY creates one canonical acquisition effect."
);

// --------------------------------------------------
// 8. OMS FILLED state alone cannot manufacture a
// canonical execution.
// --------------------------------------------------
const omsFilledOnly = {
  ...order,
  ...recovery.patch
};

const omsCanonical =
  normalizeCanonicalTradeEvents([
    omsFilledOnly
  ]);

assert.equal(
  omsCanonical.length,
  0
);

assert.equal(
  deriveTradeCashEvents([
    omsFilledOnly
  ]).length,
  0
);

console.log(
  "PASS: recovered OMS FILLED state alone cannot manufacture canonical accounting evidence."
);

// --------------------------------------------------
// 9. Re-running recovery against an already FILLED
// order cannot manufacture another transition.
// --------------------------------------------------
const repeatedRecovery =
  buildRealOrderRecoveryTransition({
    order: omsFilledOnly,
    executionMode: "REAL",
    records: [evidence],
    now:
      "2026-09-14T12:05:00.000Z"
  });

assert.equal(
  repeatedRecovery.resolved,
  false
);

assert.equal(
  repeatedRecovery.status,
  "ORDER_NOT_RECOVERABLE"
);

assert.equal(
  repeatedRecovery.patch,
  null
);

console.log(
  "PASS: an already recovered FILLED order cannot be recovered a second time."
);

// --------------------------------------------------
// 10. Canonical rebuild input remains broker evidence,
// not recovered OMS state.
// --------------------------------------------------
{
  const canonicalSource =
    await readFile(
      new URL(
        "../src/features/trading/canonicalPortfolioLedgerService.js",
        import.meta.url
      ),
      "utf8"
    );

  assert.match(
    canonicalSource,
    /userGetItem\("transactionHistory"\)/
  );

  assert.doesNotMatch(
    canonicalSource,
    /loadBasketExecution|basketExecutionStore|verifiedExecutionEvidence/
  );

  console.log(
    "PASS: canonical accounting reads broker transaction evidence, not recovered OMS state."
  );
}

// --------------------------------------------------
// 11. Recovery layers cannot directly mutate REAL
// portfolio, cash, lots or canonical ledger.
// --------------------------------------------------
{
  const paths = [
    "../src/features/broker-sync/realOrderExecutionEvidenceMatchCore.js",
    "../src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js",
    "../src/features/broker-sync/realOrderExecutionEvidenceReconciliationService.js"
  ];

  const sources =
    await Promise.all(
      paths.map((path) =>
        readFile(
          new URL(
            path,
            import.meta.url
          ),
          "utf8"
        )
      )
    );

  const forbidden =
    /saveCanonicalRealBrokerPortfolio|refreshCanonicalRealPortfolioSnapshot|rebuildCanonicalPortfolioLedger|canonicalPortfolioLedger|availableCash|cashLedger|lotLedger|placeBrokerOrder|routeExecutionOrderByMode|markExecutionOrderFilled/;

  for (const source of sources) {
    assert.doesNotMatch(
      source,
      forbidden
    );
  }

  console.log(
    "PASS: A13-A15 recovery layers cannot directly mutate REAL portfolio, cash, lots, canonical ledger, or broker routing."
  );
}

// --------------------------------------------------
// 12. Canonical accounting cannot directly rewrite
// OMS execution state.
// --------------------------------------------------
{
  const canonicalSource =
    await readFile(
      new URL(
        "../src/features/trading/canonicalPortfolioLedgerService.js",
        import.meta.url
      ),
      "utf8"
    );

  const forbidden =
    /updateExecutionOrder|saveBasketExecution|markExecutionOrderFilled|BROKER_SELECTED|SUBMISSION_UNCERTAIN/;

  assert.doesNotMatch(
    canonicalSource,
    forbidden
  );

  console.log(
    "PASS: canonical accounting cannot directly rewrite OMS execution state."
  );
}

console.log("");
console.log(
  "PC-031A18 recovery / ledger convergence runtime tests PASSED."
);
