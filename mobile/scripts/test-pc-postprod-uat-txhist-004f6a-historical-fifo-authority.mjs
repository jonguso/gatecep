import assert from "node:assert/strict";

import {
  isCompletedLotExecution
} from "../src/features/trading/brokerLotHistoryEvidenceService.js";

import {
  classifyHistoricalBrokerExecutionEvidence
} from "../src/features/trading/historicalBrokerExecutionEvidencePolicy.js";

console.log(
  "===== TXHIST-004F6A HISTORICAL FIFO AUTHORITY ====="
);

function historical(
  label,
  overrides = {}
) {
  return classifyHistoricalBrokerExecutionEvidence(
    {
      brokerAccountKey:
        "AIB|F6A",
      broker: "AIB",
      exchangeOrderNo:
        "F6A-" + label,
      executionDate:
        "2026-01-02",
      date:
        "2026-01-02",
      symbol: "SCOM",
      side: "BUY",
      totalTradedQuantity: 100,
      price: 25,
      status: "FULLY TRADED",
      ...overrides
    },
    {
      brokerAccountKey:
        "AIB|F6A",
      brokerId: "AIB"
    }
  );
}

/*
 * Historical status must be descriptive only.
 */
for (
  const status of [
    "FULLY TRADED",
    "PARTIALLY TRADED",
    "REJECTED",
    "CANCELLED",
    "UNKNOWN",
    ""
  ]
) {
  const row =
    historical(
      status || "EMPTY",
      { status }
    );

  assert.equal(
    row.executionConfirmed,
    true
  );

  assert.equal(
    row.historicalExecutionState,
    "EXECUTED_READY"
  );

  assert.equal(
    row.fifoEligible,
    true
  );

  assert.equal(
    row.canAffectFifo,
    true
  );

  assert.equal(
    Boolean(
      isCompletedLotExecution(row)
    ),
    true
  );
}

console.log(
  "CLASSIFIED_HISTORICAL_STATUS_NOT_REGATED=PASS"
);

/*
 * Confirmed execution needing price must still fail closed.
 */
const needsPrice =
  historical(
    "NEEDS-PRICE",
    {
      price: 0,
      status: "REJECTED"
    }
  );

assert.equal(
  needsPrice.executionConfirmed,
  true
);

assert.equal(
  needsPrice.historicalExecutionState,
  "EXECUTED_NEEDS_PRICE"
);

assert.equal(
  needsPrice.fifoEligible,
  false
);

assert.equal(
  needsPrice.canAffectFifo,
  false
);

assert.equal(
  Boolean(
    isCompletedLotExecution(
      needsPrice
    )
  ),
  false
);

console.log(
  "CLASSIFIED_PRICE_REVIEW_FAILS_CLOSED=PASS"
);

/*
 * No Total Traded Quantity must remain non-executed.
 */
const notExecuted =
  historical(
    "NOT-EXECUTED",
    {
      totalTradedQuantity: 0,
      status: "FULLY TRADED"
    }
  );

assert.equal(
  notExecuted.executionConfirmed,
  false
);

assert.equal(
  notExecuted.historicalExecutionState,
  "NOT_EXECUTED"
);

assert.equal(
  Boolean(
    isCompletedLotExecution(
      notExecuted
    )
  ),
  false
);

console.log(
  "CLASSIFIED_ZERO_EXECUTION_FAILS_CLOSED=PASS"
);

/*
 * Explicit contradictory historical flags fail closed.
 */
const contradictory = {
  ...historical(
    "CONTRADICTORY",
    {
      status: "REJECTED"
    }
  ),
  fifoEligible: false,
  canAffectFifo: false
};

assert.equal(
  Boolean(
    isCompletedLotExecution(
      contradictory
    )
  ),
  false
);

console.log(
  "EXPLICIT_FIFO_FALSE_FAILS_CLOSED=PASS"
);

/*
 * Legacy/live evidence retains old status behavior.
 */
const legacyFilled = {
  symbol: "SCOM",
  side: "BUY",
  quantity: 100,
  price: 25,
  executionDate:
    "2026-01-02",
  status: "FILLED"
};

const legacyRejected = {
  ...legacyFilled,
  status: "REJECTED"
};

assert.equal(
  Boolean(
    isCompletedLotExecution(
      legacyFilled
    )
  ),
  true
);

assert.equal(
  Boolean(
    isCompletedLotExecution(
      legacyRejected
    )
  ),
  false
);

console.log(
  "LEGACY_FILLED_COMPATIBILITY=PASS"
);

console.log(
  "LEGACY_REJECTED_STILL_EXCLUDED=PASS"
);

/*
 * A partial/incomplete pseudo-classification must NOT bypass
 * legacy validation.
 */
const incompleteShape = {
  ...legacyRejected,
  fifoEligible: true,
  canAffectFifo: true
};

assert.equal(
  Boolean(
    isCompletedLotExecution(
      incompleteShape
    )
  ),
  false
);

console.log(
  "INCOMPLETE_CLASSIFICATION_CANNOT_BYPASS_LEGACY_GATE=PASS"
);

console.log(
  "TXHIST_004F6A_RESULT=PASS"
);
