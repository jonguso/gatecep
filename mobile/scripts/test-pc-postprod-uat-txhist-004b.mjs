import assert from "node:assert/strict";

import {
  reviewBrokerTransactionUpload
} from "../src/features/trading/brokerTransactionUploadReviewService.js";

console.log(
  "===== TXHIST-004B REVIEW CLASSIFIER ====="
);

const account =
  "ABC::CLIENT-001";

const existing = [
  {
    exchangeOrderNo: "EX-100",
    price: 34.75
  }
];

const rawRows = [
  {
    "Order Date": "2026-10-01",
    "Security Code": "SCOM",
    "Buy or Sell": "BUY",
    "Total Traded Quantity": "100",
    "Order Price": "35.00",
    "Order Status": "Fully Traded",
    "Exchange Order No": "EX-100"
  },
  {
    "Order Date": "2026-10-02",
    "Security Code": "SCOM",
    "Buy or Sell": "BUY",
    "Total Traded Quantity": "50",
    "Order Price": "36.00",
    "Order Status": "Fully Traded",
    "Exchange Order No": "EX-101"
  },
  {
    "Order Date": "2026-10-03",
    "Security Code": "KCB",
    "Buy or Sell": "BUY",
    "Total Traded Quantity": "75",
    "Order Price": "",
    "Order Status": "Fully Traded",
    "Exchange Order No": "EX-102"
  },
  {
    "Order Date": "2026-10-04",
    "Security Code": "EQTY",
    "Buy or Sell": "SELL",
    "Total Traded Quantity": "20",
    "Order Price": "52.00",
    "Order Status": "Cancelled",
    "Exchange Order No": "EX-103"
  },
  {
    "Order Date": "2026-10-05",
    "Security Code": "SCOM",
    "Buy or Sell": "BUY",
    "Total Traded Quantity": "0",
    "Order Price": "35.00",
    "Order Status": "Pending",
    "Exchange Order No": ""
  },
  {
    "Order Date": "2026-10-02",
    "Security Code": "SCOM",
    "Buy or Sell": "BUY",
    "Total Traded Quantity": "50",
    "Order Price": "36.00",
    "Order Status": "Fully Traded",
    "Exchange Order No": "EX-101"
  }
];

const result =
  reviewBrokerTransactionUpload({
    rawRows,
    brokerAccountKey: account,
    existingVerified: existing
  });

assert.equal(
  result.summary.uploadedCount,
  6
);

assert.equal(
  result.summary.existingCount,
  1
);

assert.equal(
  result.summary.newCount,
  1
);

assert.equal(
  result.summary.reviewRequiredCount,
  2
);

assert.equal(
  result.summary.ignoredCount,
  2
);

assert.equal(
  result.summary.updatedExistingCount,
  0
);

assert.equal(
  result.summary.deletedExistingCount,
  0
);

const existingRow =
  result.existingRows[0];

assert.equal(
  existingRow.exchangeOrderNo,
  "EX-100"
);

assert.equal(
  existing[0].price,
  34.75,
  "existing manually corrected price must remain untouched"
);

const missingPrice =
  result.reviewRows.find(
    (row) =>
      row.exchangeOrderNo === "EX-102"
  );

assert.ok(
  missingPrice.reviewReasons.includes(
    "MISSING_PRICE"
  )
);

const cancelled =
  result.reviewRows.find(
    (row) =>
      row.exchangeOrderNo === "EX-103"
  );

assert.ok(
  cancelled.reviewReasons.includes(
    "NON_COMPLETED_STATUS_WITH_EXECUTION"
  )
);

console.log(
  "UPLOADED=" +
  result.summary.uploadedCount
);

console.log(
  "NEW=" +
  result.summary.newCount
);

console.log(
  "EXISTING=" +
  result.summary.existingCount
);

console.log(
  "NEEDS_REVIEW=" +
  result.summary.reviewRequiredCount
);

console.log(
  "IGNORED=" +
  result.summary.ignoredCount
);

console.log(
  "EXISTING_UPDATED=" +
  result.summary.updatedExistingCount
);

console.log(
  "EXISTING_DELETED=" +
  result.summary.deletedExistingCount
);

console.log(
  "MISSING_PRICE_REVIEW=PASS"
);

console.log(
  "CANCELLED_EXECUTION_REVIEW=PASS"
);

console.log(
  "MANUAL_CORRECTION_PROTECTED=PASS"
);

console.log(
  "TXHIST_004B_RESULT=PASS"
);

console.log(
  "===== PARTIALLY TRADED CONTRACT ====="
);

const partialResult =
  reviewBrokerTransactionUpload({
    brokerAccountKey: account,
    existingVerified: [],
    rawRows: [
      {
        "Order Date": "2026-10-10",
        "Security Code": "SCOM",
        "Buy or Sell": "BUY",

        // Broker order may have requested more,
        // but only the traded quantity is evidence.
        "Order Quantity": "1000",
        "Total Traded Quantity": "250",

        "Order Price": "40.00",
        "Order Status": "Partially Traded",
        "Exchange Order No": "EX-PARTIAL-001"
      }
    ]
  });

assert.equal(
  partialResult.summary.newCount,
  1,
  "PARTIALLY TRADED must be accepted as execution evidence"
);

assert.equal(
  partialResult.summary.reviewRequiredCount,
  0
);

assert.equal(
  partialResult.newRows[0].quantity,
  250,
  "partial execution must use Total Traded Quantity, not Order Quantity"
);

assert.equal(
  partialResult.newRows[0].totalTradedQuantity,
  250
);

assert.equal(
  partialResult.newRows[0].status,
  "Partially Traded"
);

console.log(
  "PARTIALLY_TRADED_ACCEPTED=PASS"
);

console.log(
  "PARTIAL_EXECUTED_QUANTITY=250"
);

console.log(
  "ORDER_QUANTITY_NOT_USED=PASS"
);
