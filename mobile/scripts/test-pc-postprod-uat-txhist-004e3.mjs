import assert from "node:assert/strict";

import {
  partitionHistoricalBrokerExecutionEvidence
} from "../src/features/trading/historicalBrokerExecutionEvidencePolicy.js";

console.log(
  "===== TXHIST-004E3 HISTORICAL SAVE PIPELINE ====="
);

const context = {
  brokerAccountKey: "AIB|137971",
  brokerId: "AIB"
};

const ready = {
  brokerAccountKey: "AIB|137971",
  exchangeOrderNo: "READY-001",
  date: "13-Apr-26",
  symbol: "ABSA",
  side: "BUY",
  totalTradedQuantity: 7,
  quantity: 7,
  price: 30.95,

  /*
   * Deliberately CANCELLED.
   * Historical execution authority is Total Traded Quantity,
   * not Order Status.
   */
  status: "Cancelled"
};

const needsPrice = {
  brokerAccountKey: "AIB|137971",
  exchangeOrderNo: "PRICE-001",
  date: "14-Apr-26",
  symbol: "SCOM",
  side: "BUY",
  totalTradedQuantity: 100,
  quantity: 100,
  price: 0,
  status: "Fully Traded"
};

const notExecuted = {
  brokerAccountKey: "AIB|137971",
  exchangeOrderNo: "ZERO-001",
  date: "15-Apr-26",
  symbol: "KCB",
  side: "BUY",

  /*
   * Requested quantity deliberately positive.
   */
  quantity: 1000,

  /*
   * Execution authority deliberately zero.
   */
  totalTradedQuantity: 0,

  price: 45,
  status: "Fully Traded"
};

const partition =
  partitionHistoricalBrokerExecutionEvidence(
    [
      ready,
      needsPrice,
      notExecuted
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
  partition.ignored.length,
  1
);

console.log(
  "HISTORICAL_PARTITION_COUNTS=PASS"
);

assert.equal(
  partition.verified[0]
    .exchangeOrderNo,
  "READY-001"
);

assert.equal(
  partition.verified[0]
    .totalTradedQuantity,
  7
);

console.log(
  "TOTAL_TRADED_EXECUTION_READY=PASS"
);

assert.equal(
  partition.needsReview[0]
    .exchangeOrderNo,
  "PRICE-001"
);

assert.equal(
  partition.needsReview[0]
    .executionConfirmed,
  true
);

assert.equal(
  partition.needsReview[0]
    .fifoEligible,
  false
);

console.log(
  "MISSING_PRICE_EXECUTION_REVIEW=PASS"
);

assert.equal(
  partition.needsPrice.length,
  1
);

assert.equal(
  partition.needsPrice[0]
    .exchangeOrderNo,
  "PRICE-001"
);

console.log(
  "NEEDS_PRICE_SUBSET=PASS"
);

assert.equal(
  partition.ignored[0]
    .exchangeOrderNo,
  "ZERO-001"
);

assert.equal(
  partition.ignored[0]
    .executionConfirmed,
  false
);

console.log(
  "ORDER_QUANTITY_NOT_SUBSTITUTED=PASS"
);

/*
 * Status must remain descriptive.
 */
assert.equal(
  partition.verified[0].status,
  "Cancelled"
);

console.log(
  "STATUS_DESCRIPTIVE_ONLY=PASS"
);

/*
 * Historical policy must identify its own evidence source.
 */
assert.equal(
  partition.verified[0]
    .sourceType,
  "HISTORICAL_BROKER_EXECUTION_EVIDENCE"
);

console.log(
  "HISTORICAL_SOURCE_TYPE=PASS"
);

console.log(
  "TXHIST_004E3_RESULT=PASS"
);
