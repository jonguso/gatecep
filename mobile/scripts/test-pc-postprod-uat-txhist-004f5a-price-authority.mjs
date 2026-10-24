import assert from "node:assert/strict";

import {
  normalizeBrokerTransactionReviewRow,
  reviewBrokerTransactionUpload
} from "../src/features/trading/brokerTransactionUploadReviewService.js";

import {
  classifyHistoricalBrokerExecutionEvidence
} from "../src/features/trading/historicalBrokerExecutionEvidencePolicy.js";

console.log(
  "===== TXHIST-004F5A PRICE AUTHORITY REGRESSION ====="
);

const base = {
  Date: "2026-01-02",
  Symbol: "SCOM",
  Side: "BUY",
  "Exchange Order No": "F5A-BASE",
  "Total Traded Quantity": "100",
  "Order Status": "FULLY TRADED"
};

function normalize(
  exchangeOrderNo,
  overrides = {}
) {
  return normalizeBrokerTransactionReviewRow(
    {
      ...base,
      "Exchange Order No":
        exchangeOrderNo,
      ...overrides
    },
    0
  );
}

/*
 * 1. Explicit positive broker price remains authoritative.
 */
const explicit =
  normalize(
    "F5A-EXPLICIT",
    {
      Price: "25",
      Value: "2500"
    }
  );

assert.equal(
  explicit.price,
  25
);

assert.equal(
  explicit.totalTradedQuantity,
  100
);

console.log(
  "EXPLICIT_PRICE_ACCEPTED=PASS"
);

/*
 * 2. Missing price must NOT be derived from Value / quantity.
 */
const missingWithValue =
  normalize(
    "F5A-MISSING-VALUE",
    {
      Value: "2500"
    }
  );

assert.equal(
  missingWithValue.price,
  0
);

assert.equal(
  missingWithValue.value,
  2500
);

console.log(
  "MISSING_PRICE_NOT_DERIVED_FROM_VALUE=PASS"
);

/*
 * 3. Explicit zero price + value must remain zero.
 */
const zeroWithValue =
  normalize(
    "F5A-ZERO-VALUE",
    {
      Price: "0",
      Value: "2500"
    }
  );

assert.equal(
  zeroWithValue.price,
  0
);

console.log(
  "ZERO_PRICE_NOT_DERIVED_FROM_VALUE=PASS"
);

/*
 * 4. Negative price must not become a positive inferred price.
 */
const negativeWithValue =
  normalize(
    "F5A-NEGATIVE-VALUE",
    {
      Price: "-25",
      Value: "2500"
    }
  );

assert.equal(
  negativeWithValue.price,
  0
);

console.log(
  "NEGATIVE_PRICE_NOT_DERIVED_FROM_VALUE=PASS"
);

/*
 * 5. Review classifier must flag the confirmed execution.
 */
const review =
  reviewBrokerTransactionUpload({
    rawRows: [
      {
        ...base,
        "Exchange Order No":
          "F5A-REVIEW",
        Value: "2500"
      }
    ],
    brokerAccountKey:
      "AIB|F5A",
    existingVerified: [],
    existingUnverified: []
  });

assert.equal(
  review.summary.reviewRequiredCount,
  1
);

assert.equal(
  review.reviewRows.length,
  1
);

assert.equal(
  review.reviewRows[0].price,
  0
);

assert.equal(
  review.reviewRows[0].reviewStatus,
  "NEEDS_REVIEW"
);

assert.ok(
  review.reviewRows[0].reviewReasons.includes(
    "MISSING_PRICE"
  )
);

console.log(
  "MISSING_PRICE_FLAGGED_FOR_REVIEW=PASS"
);

/*
 * 6. Historical policy must retain execution confirmation but
 *    prevent FIFO until price is explicitly corrected.
 */
const historical =
  classifyHistoricalBrokerExecutionEvidence(
    {
      ...review.reviewRows[0],
      brokerAccountKey:
        "AIB|F5A",
      broker: "AIB"
    },
    {
      brokerAccountKey:
        "AIB|F5A",
      brokerId: "AIB"
    }
  );

assert.equal(
  historical.executionConfirmed,
  true
);

assert.equal(
  historical.historicalExecutionState,
  "EXECUTED_NEEDS_PRICE"
);

assert.equal(
  historical.needsPriceReview,
  true
);

assert.equal(
  historical.fifoEligible,
  false
);

assert.equal(
  historical.canAffectFifo,
  false
);

console.log(
  "EXECUTION_CONFIRMED_PRICE_REVIEW_REQUIRED=PASS"
);

console.log(
  "PRICE_REVIEW_NOT_FIFO_ELIGIBLE=PASS"
);

/*
 * 7. Value remains useful audit evidence but cannot become price.
 */
assert.equal(
  historical.value,
  2500
);

assert.equal(
  historical.price,
  0
);

console.log(
  "VALUE_RETAINED_WITHOUT_PRICE_FABRICATION=PASS"
);

console.log(
  "TXHIST_004F5A_RESULT=PASS"
);
