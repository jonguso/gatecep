import assert from "node:assert/strict";

import {
  __setBrokerTransactionHistoryStorageLoaderForTests,
  __resetBrokerTransactionHistoryStorageLoaderForTests,
  loadBrokerTransactionHistoryEvidence,
  resetBrokerTransactionHistoryEvidence
} from "../src/features/trading/brokerTransactionHistoryEvidenceStore.js";

console.log(
  "===== TXHIST-004E6 ACCOUNT RESET ====="
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
  }
};

__setBrokerTransactionHistoryStorageLoaderForTests(
  async () => storage
);

try {
  const aib = "AIB|137971";
  const abc = "ABC|ABC001";

  /*
   * Simulate contaminated AIB history plus valid ABC history.
   */
  memory.set(
    "brokerTransactionHistoryByAccount",
    JSON.stringify({
      [aib]: {
        brokerAccountKey: aib,
        verified: [
          {
            brokerAccountKey: aib,
            exchangeOrderNo: "AIB-V-1",
            totalTradedQuantity: 10,
            quantity: 10,
            price: 20
          }
        ],
        unverified: [
          {
            brokerAccountKey: aib,
            exchangeOrderNo: "AIB-U-1",
            totalTradedQuantity: 5,
            quantity: 5,
            price: 0
          }
        ]
      },

      [abc]: {
        brokerAccountKey: abc,
        verified: [
          {
            brokerAccountKey: abc,
            exchangeOrderNo: "ABC-V-1",
            totalTradedQuantity: 20,
            quantity: 20,
            price: 30
          }
        ],
        unverified: []
      }
    })
  );

  /*
   * Compatibility projections deliberately contain both
   * account-scoped history and genuine unscoped legacy rows.
   */
  memory.set(
    "transactionHistory",
    JSON.stringify([
      {
        brokerAccountKey: aib,
        exchangeOrderNo: "AIB-V-1",
        quantity: 10,
        price: 20
      },
      {
        brokerAccountKey: abc,
        exchangeOrderNo: "ABC-V-1",
        quantity: 20,
        price: 30
      },
      {
        exchangeOrderNo: "LEGACY-V-1",
        quantity: 3,
        price: 40
      }
    ])
  );

  memory.set(
    "unverifiedTransactionHistory",
    JSON.stringify([
      {
        brokerAccountKey: aib,
        exchangeOrderNo: "AIB-U-1",
        quantity: 5,
        price: 0
      },
      {
        exchangeOrderNo: "LEGACY-U-1",
        quantity: 2,
        price: 0
      }
    ])
  );

  const result =
    await resetBrokerTransactionHistoryEvidence({
      brokerAccountKey: aib
    });

  assert.equal(
    result.existed,
    true
  );

  assert.equal(
    result.removedVerifiedCount,
    1
  );

  assert.equal(
    result.removedUnverifiedCount,
    1
  );

  assert.equal(
    result.removedTotalCount,
    2
  );

  console.log(
    "TARGET_AIB_BUCKET_REMOVED=PASS"
  );

  const aibAfter =
    await loadBrokerTransactionHistoryEvidence(
      aib
    );

  assert.equal(
    aibAfter.verified.length,
    0
  );

  assert.equal(
    aibAfter.unverified.length,
    0
  );

  console.log(
    "AIB_HISTORY_ZERO_AFTER_RESET=PASS"
  );

  const abcAfter =
    await loadBrokerTransactionHistoryEvidence(
      abc
    );

  assert.equal(
    abcAfter.verified.length,
    1
  );

  assert.equal(
    abcAfter.verified[0]
      .exchangeOrderNo,
    "ABC-V-1"
  );

  console.log(
    "ABC_HISTORY_PRESERVED=PASS"
  );

  const verifiedProjection =
    JSON.parse(
      memory.get("transactionHistory")
    );

  const unverifiedProjection =
    JSON.parse(
      memory.get(
        "unverifiedTransactionHistory"
      )
    );

  assert.equal(
    verifiedProjection.some(
      row =>
        row.brokerAccountKey === aib
    ),
    false
  );

  assert.equal(
    unverifiedProjection.some(
      row =>
        row.brokerAccountKey === aib
    ),
    false
  );

  console.log(
    "STALE_AIB_PROJECTIONS_REMOVED=PASS"
  );

  assert.equal(
    verifiedProjection.some(
      row =>
        row.exchangeOrderNo ===
        "ABC-V-1"
    ),
    true
  );

  console.log(
    "ABC_PROJECTION_PRESERVED=PASS"
  );

  assert.equal(
    verifiedProjection.some(
      row =>
        row.exchangeOrderNo ===
        "LEGACY-V-1"
    ),
    true
  );

  assert.equal(
    unverifiedProjection.some(
      row =>
        row.exchangeOrderNo ===
        "LEGACY-U-1"
    ),
    true
  );

  console.log(
    "UNSCOPED_LEGACY_PRESERVED=PASS"
  );

  /*
   * Reset again: must be safe/idempotent.
   */
  const second =
    await resetBrokerTransactionHistoryEvidence({
      brokerAccountKey: aib
    });

  assert.equal(
    second.existed,
    false
  );

  assert.equal(
    second.removedTotalCount,
    0
  );

  console.log(
    "RESET_IDEMPOTENT=PASS"
  );

  console.log(
    "TXHIST_004E6_RESULT=PASS"
  );

} finally {
  __resetBrokerTransactionHistoryStorageLoaderForTests();
}
