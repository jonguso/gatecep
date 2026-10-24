import assert from "node:assert/strict";

import {
  classifyHistoricalBrokerExecutionEvidence,
  partitionHistoricalBrokerExecutionEvidence
} from "../src/features/trading/historicalBrokerExecutionEvidencePolicy.js";

console.log(
  "===== TXHIST-004D3 EXECUTION + FIFO READINESS ====="
);

const context = {
  brokerAccountKey: "AIB|137971",
  brokerId: "AIB"
};


/*
 * 1. Normal executed transaction.
 */
const ready =
  classifyHistoricalBrokerExecutionEvidence(
    {
      date: "13-Apr-26",
      symbol: "ABSA",
      side: "BUY",
      totalTradedQuantity: 7,
      price: 30.95,
      status: "Fully Traded",
      exchangeOrderNo: "EXEC-READY-001"
    },
    context
  );

assert.equal(
  ready.executionConfirmed,
  true
);

assert.equal(
  ready.historicalExecutionVerified,
  true
);

assert.equal(
  ready.historicalExecutionState,
  "EXECUTED_READY"
);

assert.equal(
  ready.fifoEligible,
  true
);

assert.equal(
  ready.quantity,
  7
);

console.log(
  "EXECUTED_READY=PASS"
);


/*
 * 2. Positive Total Traded Quantity but zero price.
 *
 * Execution is confirmed.
 * FIFO is blocked pending price review.
 */
const zeroPrice =
  classifyHistoricalBrokerExecutionEvidence(
    {
      date: "14-Apr-26",
      symbol: "SCOM",
      side: "BUY",
      totalTradedQuantity: 250,
      price: 0,
      status: "Anything",
      exchangeOrderNo: "PRICE-ZERO-001"
    },
    context
  );

assert.equal(
  zeroPrice.executionConfirmed,
  true
);

assert.equal(
  zeroPrice.historicalExecutionVerified,
  true
);

assert.equal(
  zeroPrice.historicalExecutionState,
  "EXECUTED_NEEDS_PRICE"
);

assert.equal(
  zeroPrice.needsPriceReview,
  true
);

assert.equal(
  zeroPrice.fifoEligible,
  false
);

assert.equal(
  zeroPrice.canAffectFifo,
  false
);

assert.ok(
  zeroPrice.missingEvidence.includes(
    "EXECUTED_PRICE"
  )
);

console.log(
  "ZERO_PRICE_EXECUTION_CONFIRMED=PASS"
);

console.log(
  "ZERO_PRICE_FIFO_BLOCKED=PASS"
);

console.log(
  "ZERO_PRICE_REVIEW_REQUIRED=PASS"
);


/*
 * 3. Negative price behaves the same.
 */
const negativePrice =
  classifyHistoricalBrokerExecutionEvidence(
    {
      date: "15-Apr-26",
      symbol: "KCB",
      side: "SELL",
      totalTradedQuantity: 100,
      price: -1,
      status: "Cancelled",
      exchangeOrderNo: "PRICE-NEGATIVE-001"
    },
    context
  );

assert.equal(
  negativePrice.executionConfirmed,
  true
);

assert.equal(
  negativePrice.historicalExecutionState,
  "EXECUTED_NEEDS_PRICE"
);

assert.equal(
  negativePrice.fifoEligible,
  false
);

console.log(
  "NEGATIVE_PRICE_REVIEW_REQUIRED=PASS"
);


/*
 * 4. Missing price.
 */
const missingPrice =
  classifyHistoricalBrokerExecutionEvidence(
    {
      date: "16-Apr-26",
      symbol: "EQTY",
      side: "BUY",
      totalTradedQuantity: 50,
      status: "Fully Traded",
      exchangeOrderNo: "PRICE-MISSING-001"
    },
    context
  );

assert.equal(
  missingPrice.executionConfirmed,
  true
);

assert.equal(
  missingPrice.historicalExecutionState,
  "EXECUTED_NEEDS_PRICE"
);

assert.equal(
  missingPrice.fifoEligible,
  false
);

console.log(
  "MISSING_PRICE_REVIEW_REQUIRED=PASS"
);


/*
 * 5. No execution.
 */
const notExecuted =
  classifyHistoricalBrokerExecutionEvidence(
    {
      date: "17-Apr-26",
      symbol: "NCBA",
      side: "BUY",
      totalTradedQuantity: 0,
      price: 70,
      status: "Fully Traded",
      exchangeOrderNo: "ZERO-QTY-001"
    },
    context
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
  notExecuted.fifoEligible,
  false
);

console.log(
  "ZERO_TOTAL_TRADED_IGNORED=PASS"
);


/*
 * 6. Positive execution but missing Exchange Order No.
 */
const missingIdentity =
  classifyHistoricalBrokerExecutionEvidence(
    {
      date: "18-Apr-26",
      symbol: "COOP",
      side: "BUY",
      totalTradedQuantity: 100,
      price: 18.50,
      status: "Fully Traded"
    },
    context
  );

assert.equal(
  missingIdentity.executionConfirmed,
  true
);

assert.equal(
  missingIdentity.historicalExecutionState,
  "NEEDS_IDENTITY_REVIEW"
);

assert.equal(
  missingIdentity.historicalExecutionVerified,
  false
);

assert.equal(
  missingIdentity.fifoEligible,
  false
);

console.log(
  "MISSING_EXCHANGE_ORDER_REVIEW=PASS"
);


/*
 * 7. Order status must not control execution.
 */
const oddStatus =
  classifyHistoricalBrokerExecutionEvidence(
    {
      date: "19-Apr-26",
      symbol: "EABL",
      side: "BUY",
      totalTradedQuantity: 25,
      price: 220,
      status: "Cancelled",
      exchangeOrderNo: "ODD-STATUS-001"
    },
    context
  );

assert.equal(
  oddStatus.executionConfirmed,
  true
);

assert.equal(
  oddStatus.fifoEligible,
  true
);

console.log(
  "STATUS_NOT_EXECUTION_AUTHORITY=PASS"
);


/*
 * 8. Never substitute Order Quantity.
 */
const orderQuantityOnly =
  classifyHistoricalBrokerExecutionEvidence(
    {
      date: "20-Apr-26",
      symbol: "SCOM",
      side: "BUY",

      quantity: 1000,

      totalTradedQuantity: 0,

      price: 25,
      status: "Fully Traded",
      exchangeOrderNo: "ORDER-QTY-ONLY"
    },
    context
  );

assert.equal(
  orderQuantityOnly.executionConfirmed,
  false
);

assert.equal(
  orderQuantityOnly.quantity,
  0
);

console.log(
  "ORDER_QUANTITY_NOT_EXECUTION_EVIDENCE=PASS"
);


/*
 * 9. Partition behavior.
 */
const partition =
  partitionHistoricalBrokerExecutionEvidence(
    [
      {
        date: "13-Apr-26",
        symbol: "ABSA",
        side: "BUY",
        totalTradedQuantity: 7,
        price: 30.95,
        exchangeOrderNo: "P1"
      },

      {
        date: "14-Apr-26",
        symbol: "SCOM",
        side: "BUY",
        totalTradedQuantity: 250,
        price: 0,
        exchangeOrderNo: "P2"
      },

      {
        date: "15-Apr-26",
        symbol: "KCB",
        side: "BUY",
        totalTradedQuantity: 0,
        price: 45,
        exchangeOrderNo: "P3"
      }
    ],
    context
  );

assert.equal(
  partition.verified.length,
  1
);

assert.equal(
  partition.needsReview.length,
  1
);

assert.equal(
  partition.needsPrice.length,
  1
);

assert.equal(
  partition.ignored.length,
  1
);

console.log(
  "PARTITION_FIFO_READY_1=PASS"
);

console.log(
  "PARTITION_NEEDS_PRICE_1=PASS"
);

console.log(
  "PARTITION_IGNORED_1=PASS"
);

console.log(
  "TXHIST_004D3_RESULT=PASS"
);
