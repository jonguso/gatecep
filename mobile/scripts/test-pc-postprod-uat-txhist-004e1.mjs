import assert from "node:assert/strict";

import {
  normalizeBrokerTransactionReviewRow,
  reviewBrokerTransactionUpload
} from "../src/features/trading/brokerTransactionUploadReviewService.js";

import {
  planHistoricalBrokerClassificationRepair
} from "../src/features/trading/historicalBrokerExecutionClassificationRepairService.js";

console.log(
  "===== TXHIST-004E1 HISTORICAL REVIEW + REPAIR FOUNDATION ====="
);


/*
 * ------------------------------------------------------------
 * A. Total Traded Quantity is the only execution quantity.
 * ------------------------------------------------------------
 */

const quantityRow =
  normalizeBrokerTransactionReviewRow(
    {
      "Order Date": "13-Apr-26",
      "Security Code": "ABSA",
      "Buy or Sell": "B",

      "Order Quantity": "1000",
      "Traded Quantity": "900",
      "Total Traded Quantity": "7",

      "Order Price": "30.95",
      "Order Status": "Cancelled",
      "Exchange Order No": "QTY-001"
    },
    0
  );

assert.equal(
  quantityRow.totalTradedQuantity,
  7
);

assert.equal(
  quantityRow.quantity,
  7
);

console.log(
  "TOTAL_TRADED_QUANTITY_ONLY=PASS"
);


/*
 * ------------------------------------------------------------
 * B. Status cannot override positive Total Traded Quantity.
 * ------------------------------------------------------------
 */

const statusReview =
  reviewBrokerTransactionUpload({
    brokerAccountKey: "AIB|137971",

    rawRows: [
      {
        "Order Date": "13-Apr-26",
        "Security Code": "ABSA",
        "Buy or Sell": "B",
        "Order Quantity": "1000",
        "Traded Quantity": "900",
        "Total Traded Quantity": "7",
        "Order Price": "30.95",
        "Order Status": "Cancelled",
        "Exchange Order No": "STATUS-001"
      }
    ]
  });

assert.equal(
  statusReview.summary.newCount,
  1
);

assert.equal(
  statusReview.summary.reviewRequiredCount,
  0
);

console.log(
  "STATUS_NOT_EXECUTION_GATE=PASS"
);


/*
 * ------------------------------------------------------------
 * C. Zero Total Traded Quantity remains ignored even when
 * other quantity fields are positive.
 * ------------------------------------------------------------
 */

const zeroTotal =
  reviewBrokerTransactionUpload({
    brokerAccountKey: "AIB|137971",

    rawRows: [
      {
        "Order Date": "13-Apr-26",
        "Security Code": "SCOM",
        "Buy or Sell": "B",
        "Order Quantity": "1000",
        "Traded Quantity": "900",
        "Total Traded Quantity": "0",
        "Order Price": "25",
        "Order Status": "Fully Traded",
        "Exchange Order No": "ZERO-001"
      }
    ]
  });

assert.equal(
  zeroTotal.summary.newCount,
  0
);

assert.equal(
  zeroTotal.summary.ignoredCount,
  1
);

console.log(
  "OTHER_QUANTITY_FIELDS_NOT_SUBSTITUTED=PASS"
);


/*
 * ------------------------------------------------------------
 * D. Missing price remains review-required.
 * ------------------------------------------------------------
 */

const priceReview =
  reviewBrokerTransactionUpload({
    brokerAccountKey: "AIB|137971",

    rawRows: [
      {
        "Order Date": "13-Apr-26",
        "Security Code": "KCB",
        "Buy or Sell": "B",
        "Total Traded Quantity": "100",
        "Order Price": "0",
        "Exchange Order No": "PRICE-001"
      }
    ]
  });

assert.equal(
  priceReview.summary.reviewRequiredCount,
  1
);

assert.ok(
  priceReview.reviewRows[0]
    .reviewReasons
    .includes("MISSING_PRICE")
);

console.log(
  "EXECUTED_MISSING_PRICE_REVIEW=PASS"
);


/*
 * ------------------------------------------------------------
 * E. Classification repair preserves manual correction.
 * ------------------------------------------------------------
 */

const manuallyCorrected = {
  brokerAccountKey: "AIB|137971",
  exchangeOrderNo: "MANUAL-001",
  date: "13-Apr-26",
  symbol: "ABSA",
  side: "BUY",
  totalTradedQuantity: 7,

  /*
   * User-corrected historical execution price.
   */
  price: 31.25,
  manualCorrection: true,

  status: "Cancelled",

  evidenceStatus: "UNVERIFIED"
};

const repair =
  planHistoricalBrokerClassificationRepair({
    brokerAccountKey: "AIB|137971",
    brokerId: "AIB",
    verified: [],
    unverified: [
      manuallyCorrected,

      {
        brokerAccountKey: "AIB|137971",
        exchangeOrderNo: "NEEDS-PRICE-001",
        date: "14-Apr-26",
        symbol: "SCOM",
        side: "BUY",
        totalTradedQuantity: 100,
        price: 0,
        status: "Fully Traded"
      },

      {
        brokerAccountKey: "AIB|137971",
        exchangeOrderNo: "NOT-EXECUTED-001",
        date: "15-Apr-26",
        symbol: "KCB",
        side: "BUY",
        totalTradedQuantity: 0,
        price: 45,
        status: "Fully Traded"
      }
    ]
  });

assert.equal(
  repair.summary.promoteCount,
  1
);

assert.equal(
  repair.summary.needsPriceCount,
  1
);

assert.equal(
  repair.summary.ignoredNotExecutedCount,
  1
);

assert.equal(
  repair.promoteToVerified[0]
    .classified
    .price,
  31.25
);

assert.equal(
  repair.promoteToVerified[0]
    .original
    .manualCorrection,
  true
);

assert.equal(
  repair.summary.economicRowsUpdated,
  0
);

assert.equal(
  repair.summary.economicRowsDeleted,
  0
);

assert.equal(
  repair.summary.economicRowsInserted,
  0
);

console.log(
  "MANUAL_PRICE_CORRECTION_PRESERVED=PASS"
);

console.log(
  "CLASSIFICATION_ONLY_REPAIR=PASS"
);


/*
 * ------------------------------------------------------------
 * F. Existing verified identity is never duplicated.
 * ------------------------------------------------------------
 */

const duplicateRepair =
  planHistoricalBrokerClassificationRepair({
    brokerAccountKey: "AIB|137971",
    brokerId: "AIB",

    verified: [
      {
        brokerAccountKey: "AIB|137971",
        exchangeOrderNo: "DUP-001",
        totalTradedQuantity: 5,
        price: 20
      }
    ],

    unverified: [
      {
        brokerAccountKey: "AIB|137971",
        exchangeOrderNo: "DUP-001",
        date: "13-Apr-26",
        symbol: "ABSA",
        side: "BUY",
        totalTradedQuantity: 5,
        price: 20
      }
    ]
  });

assert.equal(
  duplicateRepair.summary.promoteCount,
  0
);

console.log(
  "EXISTING_VERIFIED_NOT_DUPLICATED=PASS"
);

console.log(
  "TXHIST_004E1_RESULT=PASS"
);
