import assert from "node:assert/strict";

import {
  __setBrokerTransactionHistoryStorageLoaderForTests,
  __resetBrokerTransactionHistoryStorageLoaderForTests,
  saveBrokerTransactionHistoryEvidence,
  loadBrokerTransactionHistoryEvidence
} from "../src/features/trading/brokerTransactionHistoryEvidenceStore.js";

console.log(
  "===== TXHIST-004F4A STORE BOUNDARY REGRESSION ====="
);

const memory = new Map();

const storage = {
  async userGetItem(key) {
    return memory.has(key)
      ? memory.get(key)
      : null;
  },

  async userSetItem(key, value) {
    memory.set(key, value);
  },

  async userRemoveItem(key) {
    memory.delete(key);
  }
};

__setBrokerTransactionHistoryStorageLoaderForTests(
  async () => storage
);

const ACCOUNT = "AIB|F4A";

function row(exchangeOrderNo, overrides = {}) {
  return {
    brokerAccountKey: ACCOUNT,
    broker: "AIB",
    exchangeOrderNo,
    symbol: "SCOM",
    side: "BUY",
    executionDate: "2026-01-02",
    date: "2026-01-02",
    price: 30,
    status: "FULLY TRADED",
    ...overrides
  };
}

try {
  const result =
    await saveBrokerTransactionHistoryEvidence({
      brokerAccountKey: ACCOUNT,

      verified: [
        row(
          "F4A-TOTAL",
          {
            totalTradedQuantity: 100,
            quantity: 999
          }
        ),

        row(
          "F4A-ZERO",
          {
            totalTradedQuantity: 0,
            quantity: 999,
            tradedQuantity: 888,
            filledQuantity: 777
          }
        ),

        row(
          "F4A-TRADED-FALLBACK",
          {
            tradedQuantity: 888,
            quantity: 999
          }
        ),

        row(
          "F4A-FILLED-FALLBACK",
          {
            filledQuantity: 777,
            quantity: 999
          }
        ),

        row(
          "F4A-GENERIC-FALLBACK",
          {
            quantity: 999
          }
        ),

        row(
          "",
          {
            totalTradedQuantity: 25
          }
        )
      ],

      unverified: [
        row(
          "F4A-NEEDS-PRICE",
          {
            totalTradedQuantity: 50,
            quantity: 50,
            price: 0,
            historicalExecutionState:
              "EXECUTED_NEEDS_PRICE",
            fifoEligible: false,
            canAffectFifo: false
          }
        )
      ],

      fileName: "f4a-synthetic.csv",
      source: "F4A_SYNTHETIC"
    });

  const evidence =
    await loadBrokerTransactionHistoryEvidence(
      ACCOUNT
    );

  assert.equal(
    evidence.verified.length,
    1
  );

  assert.equal(
    evidence.verified[0].exchangeOrderNo,
    "F4A-TOTAL"
  );

  assert.equal(
    evidence.unverified.length,
    1
  );

  assert.equal(
    evidence.unverified[0].exchangeOrderNo,
    "F4A-NEEDS-PRICE"
  );

  assert.equal(
    evidence.unverified[0].totalTradedQuantity,
    50
  );

  console.log(
    "TOTAL_TRADED_POSITIVE_PERSISTED=PASS"
  );

  console.log(
    "EXECUTED_NEEDS_PRICE_PERSISTED_UNVERIFIED=PASS"
  );

  for (const forbidden of [
    "F4A-ZERO",
    "F4A-TRADED-FALLBACK",
    "F4A-FILLED-FALLBACK",
    "F4A-GENERIC-FALLBACK"
  ]) {
    assert.equal(
      [
        ...evidence.verified,
        ...evidence.unverified
      ].some(
        item =>
          item.exchangeOrderNo === forbidden
      ),
      false,
      `${forbidden} must not persist`
    );
  }

  console.log(
    "ZERO_TOTAL_TRADED_REJECTED=PASS"
  );

  console.log(
    "TRADED_QUANTITY_NOT_SUBSTITUTED=PASS"
  );

  console.log(
    "FILLED_QUANTITY_NOT_SUBSTITUTED=PASS"
  );

  console.log(
    "GENERIC_QUANTITY_NOT_SUBSTITUTED=PASS"
  );

  assert.equal(
    result.mergeSummary.insertedVerifiedCount,
    1
  );

  assert.equal(
    result.mergeSummary.insertedUnverifiedCount,
    1
  );

  assert.equal(
    result.mergeSummary.skippedInvalidCount,
    5
  );

  assert.equal(
    result.mergeSummary.updatedExistingCount,
    0
  );

  assert.equal(
    result.mergeSummary.deletedCount,
    0
  );

  console.log(
    "MISSING_EXCHANGE_ORDER_REJECTED=PASS"
  );

  console.log(
    "APPEND_ONLY_INVARIANT=PASS"
  );

  /*
   * Re-upload the two valid identities.
   * They must be skipped, not updated.
   */
  const repeat =
    await saveBrokerTransactionHistoryEvidence({
      brokerAccountKey: ACCOUNT,

      verified: [
        row(
          "F4A-TOTAL",
          {
            totalTradedQuantity: 100,
            quantity: 12345,
            price: 999
          }
        )
      ],

      unverified: [
        row(
          "F4A-NEEDS-PRICE",
          {
            totalTradedQuantity: 50,
            quantity: 50,
            price: 99
          }
        )
      ]
    });

  const afterRepeat =
    await loadBrokerTransactionHistoryEvidence(
      ACCOUNT
    );

  assert.equal(
    afterRepeat.verified.length,
    1
  );

  assert.equal(
    afterRepeat.unverified.length,
    1
  );

  assert.equal(
    afterRepeat.verified[0].price,
    30
  );

  assert.equal(
    afterRepeat.unverified[0].price,
    0
  );

  assert.equal(
    repeat.mergeSummary.updatedExistingCount,
    0
  );

  assert.equal(
    repeat.mergeSummary.deletedCount,
    0
  );

  console.log(
    "REUPLOAD_IDEMPOTENT=PASS"
  );

  console.log(
    "EXISTING_ROWS_NOT_OVERWRITTEN=PASS"
  );

  console.log(
    "TXHIST_004F4A_RESULT=PASS"
  );
} finally {
  __resetBrokerTransactionHistoryStorageLoaderForTests();
}
