import assert from "node:assert/strict";

import {
  classifyHistoricalBrokerExecutionEvidence,
  partitionHistoricalBrokerExecutionEvidence
} from "../src/features/trading/historicalBrokerExecutionEvidencePolicy.js";

console.log(
  "===== TXHIST-004D HISTORICAL EXECUTION CONTRACT ====="
);

const context = {
  brokerAccountKey: "AIB|137971",
  brokerId: "AIB"
};

const fullyTraded =
  classifyHistoricalBrokerExecutionEvidence(
    {
      date: "13-Apr-26",
      symbol: "ABSA",
      side: "BUY",
      quantity: 7,
      totalTradedQuantity: 7,
      price: 30.95,
      status: "Fully Traded",
      exchangeOrderNo: "O0QxfCgZR5Lu"
    },
    context
  );

assert.equal(
  fullyTraded.historicalExecutionVerified,
  true
);

assert.equal(
  fullyTraded.brokerAccountKey,
  "AIB|137971"
);

assert.equal(
  fullyTraded.broker,
  "AIB"
);

assert.equal(
  fullyTraded.brokerReference,
  "O0QxfCgZR5Lu"
);

assert.equal(
  fullyTraded.quantity,
  7
);

assert.equal(
  fullyTraded.settlementStatus,
  null
);

assert.equal(
  fullyTraded.settlementDate,
  null
);

console.log(
  "FULLY_TRADED_WITH_ACTUAL_AIB_SCHEMA=PASS"
);

console.log(
  "CONNECTED_BROKER_CONTEXT=PASS"
);

console.log(
  "EXCHANGE_ORDER_REFERENCE=PASS"
);

console.log(
  "NO_SETTLEMENT_FABRICATION=PASS"
);


const partial =
  classifyHistoricalBrokerExecutionEvidence(
    {
      date: "14-Apr-26",
      symbol: "SCOM",
      side: "BUY",

      // Requested quantity intentionally much larger.
      quantity: 1000,

      // Broker says only 250 actually traded.
      totalTradedQuantity: 250,

      price: 24.50,
      status: "Partially Traded",
      exchangeOrderNo: "PARTIAL-001"
    },
    context
  );

assert.equal(
  partial.historicalExecutionVerified,
  true
);

assert.equal(
  partial.quantity,
  250
);

assert.notEqual(
  partial.quantity,
  1000
);

console.log(
  "PARTIALLY_TRADED=PASS"
);

console.log(
  "PARTIAL_ACTUAL_QUANTITY_250=PASS"
);

console.log(
  "ORDER_QUANTITY_NOT_SUBSTITUTED=PASS"
);


const zeroExecuted =
  classifyHistoricalBrokerExecutionEvidence(
    {
      date: "15-Apr-26",
      symbol: "KCB",
      side: "BUY",
      quantity: 500,
      totalTradedQuantity: 0,
      price: 45,
      status: "Fully Traded",
      exchangeOrderNo: "ZERO-001"
    },
    context
  );

assert.equal(
  zeroExecuted.historicalExecutionVerified,
  false
);

assert.ok(
  zeroExecuted.missingEvidence.includes(
    "EXECUTED_QUANTITY"
  )
);

console.log(
  "ZERO_TOTAL_TRADED_NOT_EXECUTED=PASS"
);


/*
 * Textual status must not override positive broker execution
 * quantity. This protects against inconsistent historical
 * status labels in broker exports.
 */
const positiveQuantityOddStatus =
  classifyHistoricalBrokerExecutionEvidence(
    {
      date: "16-Apr-26",
      symbol: "EQTY",
      side: "SELL",

      // Requested/order quantity is irrelevant.
      quantity: 1000,

      // Broker's actual cumulative execution quantity.
      totalTradedQuantity: 100,

      price: 55,
      status: "Cancelled",
      exchangeOrderNo: "EXECUTED-100"
    },
    context
  );

assert.equal(
  positiveQuantityOddStatus.historicalExecutionVerified,
  true
);

assert.equal(
  positiveQuantityOddStatus.quantity,
  100
);

console.log(
  "POSITIVE_TOTAL_TRADED_IS_EXECUTION=PASS"
);

console.log(
  "STATUS_DOES_NOT_OVERRIDE_EXECUTION_QUANTITY=PASS"
);


const missingIdentity =
  classifyHistoricalBrokerExecutionEvidence(
    {
      date: "17-Apr-26",
      symbol: "NCBA",
      side: "BUY",
      totalTradedQuantity: 100,
      price: 70,
      status: "Fully Traded"
    },
    context
  );

assert.equal(
  missingIdentity.historicalExecutionVerified,
  false
);

assert.ok(
  missingIdentity.missingEvidence.includes(
    "EXCHANGE_ORDER_NO"
  )
);

console.log(
  "MISSING_EXCHANGE_ID_FAIL_CLOSED=PASS"
);


const partitioned =
  partitionHistoricalBrokerExecutionEvidence(
    [
      {
        date: "13-Apr-26",
        symbol: "ABSA",
        side: "BUY",
        totalTradedQuantity: 7,
        price: 30.95,
        status: "Fully Traded",
        exchangeOrderNo: "ONE"
      },
      {
        date: "14-Apr-26",
        symbol: "SCOM",
        side: "BUY",
        totalTradedQuantity: 250,
        price: 24.50,
        status: "Partially Traded",
        exchangeOrderNo: "TWO"
      },
      {
        date: "15-Apr-26",
        symbol: "KCB",
        side: "BUY",
        totalTradedQuantity: 0,
        price: 45,
        status: "Cancelled",
        exchangeOrderNo: "THREE"
      }
    ],
    context
  );

assert.equal(
  partitioned.verified.length,
  2
);

assert.equal(
  partitioned.unverified.length,
  1
);

console.log(
  "PARTITION_VERIFIED_2=PASS"
);

console.log(
  "PARTITION_UNVERIFIED_1=PASS"
);

console.log(
  "TXHIST_004D_RESULT=PASS"
);
