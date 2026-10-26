import assert from "node:assert/strict";

import {
  reviewAdminTransactionHistoryUpload,
  mapAdminReviewedNewExecutionsForCanonicalAppend
} from "../src/modules/admin/adminTransactionHistoryReview.service.js";

console.log(
  "===== R7O-R4E7R35 — REVIEW SERVICE TEST ====="
);

const rawRows = [
  {
    "Exchange Order No":
      "ORDER-1",

    "Total Traded Quantity":
      "100",

    "Execution Date":
      "2026-10-26",

    "Security":
      "SCOM",

    "Buy/Sell":
      "BUY",

    "Price":
      "25.00",

    "Order Status":
      "Completed"
  },

  {
    "Exchange Order No":
      "",

    "Total Traded Quantity":
      "0",

    "Execution Date":
      "2026-10-26",

    "Security":
      "SCOM",

    "Buy/Sell":
      "BUY",

    "Price":
      "25.00"
  },

  {
    "Exchange Order No":
      "ORDER-2",

    "Total Traded Quantity":
      "0",

    "Execution Date":
      "2026-10-26",

    "Security":
      "SCOM",

    "Buy/Sell":
      "BUY",

    "Price":
      "25.00"
  },

  {
    "Exchange Order No":
      "ORDER-3",

    "Total Traded Quantity":
      "50",

    "Execution Date":
      "2026-10-26",

    "Security":
      "KCB",

    "Buy/Sell":
      "BUY",

    "Price":
      ""
  },

  {
    "Exchange Order No":
      "ORDER-4",

    "Total Traded Quantity":
      "25",

    "Execution Date":
      "2026-10-26",

    "Security":
      "EQTY",

    "Buy/Sell":
      "SELL",

    "Price":
      "60"
  }
];

const review =
  reviewAdminTransactionHistoryUpload({
    rawRows,

    brokerAccountKey:
      "AIB|137971",

    existingCanonicalHistory: [
      {
        exchangeOrderNo:
          "ORDER-4"
      }
    ]
  });

assert.equal(
  review.summary.uploadedCount,
  5
);

assert.equal(
  review.summary.newCount,
  1
);

assert.equal(
  review.summary.existingCount,
  1
);

assert.equal(
  review.summary.reviewRequiredCount,
  1
);

assert.equal(
  review.summary.ignoredCount,
  2
);

assert.equal(
  review.newRows[0]
    .exchangeOrderNo,
  "ORDER-1"
);

const mapped =
  mapAdminReviewedNewExecutionsForCanonicalAppend(
    review.newRows,
    {
      brokerAccountKey:
        "AIB|137971",

      sourceFileName:
        "order-history-52470471.csv"
    }
  );

assert.equal(
  mapped.length,
  1
);

assert.equal(
  mapped[0].exchangeOrderNo,
  "ORDER-1"
);

assert.equal(
  mapped[0].totalTradedQuantity,
  100
);

assert.equal(
  mapped[0].executionPrice,
  25
);

assert.equal(
  mapped[0].fifoEligible,
  true
);

console.log(
  "NO_EXCHANGE_ORDER_IGNORED=PASS"
);

console.log(
  "NO_TRADED_QUANTITY_IGNORED=PASS"
);

console.log(
  "EXISTING_EXCHANGE_ORDER_SKIPPED=PASS"
);

console.log(
  "MISSING_PRICE_NEEDS_REVIEW=PASS"
);

console.log(
  "VALID_EXECUTION_NEW=PASS"
);

console.log(
  "NEW_ONLY_CANONICAL_MAPPING=PASS"
);

console.log(
  "R7O_R4E7R35_REVIEW_SERVICE_TEST=PASS"
);
