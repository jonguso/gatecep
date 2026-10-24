import assert from "node:assert/strict";

import {
  __setBrokerTransactionHistoryStorageLoaderForTests,
  __resetBrokerTransactionHistoryStorageLoaderForTests,
  loadBrokerTransactionHistoryRegistry,
  loadBrokerTransactionHistoryEvidence,
  resetAllBrokerTransactionHistoryEvidence
} from "../src/features/trading/brokerTransactionHistoryEvidenceStore.js";

console.log(
  "===== TXHIST-004E7 GLOBAL CLEAN START ====="
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

try {
  const aib = "AIB|137971";
  const abc = "ABC|ABC001";

  memory.set(
    "brokerTransactionHistoryByAccount",
    JSON.stringify({
      [aib]: {
        brokerAccountKey: aib,

        verified: [
          {
            brokerAccountKey: aib,
            exchangeOrderNo: "AIB-V-1"
          },
          {
            brokerAccountKey: aib,
            exchangeOrderNo: "AIB-V-2"
          }
        ],

        unverified: [
          {
            brokerAccountKey: aib,
            exchangeOrderNo: "AIB-U-1"
          }
        ]
      },

      [abc]: {
        brokerAccountKey: abc,

        verified: [
          {
            brokerAccountKey: abc,
            exchangeOrderNo: "ABC-V-1"
          }
        ],

        unverified: [
          {
            brokerAccountKey: abc,
            exchangeOrderNo: "ABC-U-1"
          }
        ]
      }
    })
  );

  /*
   * Include account-scoped and old unscoped legacy rows.
   * ALL transaction-history evidence must disappear during
   * this explicit clean-start operation.
   */
  memory.set(
    "transactionHistory",
    JSON.stringify([
      {
        brokerAccountKey: aib,
        exchangeOrderNo: "AIB-V-1"
      },
      {
        brokerAccountKey: abc,
        exchangeOrderNo: "ABC-V-1"
      },
      {
        exchangeOrderNo: "LEGACY-V-1"
      }
    ])
  );

  memory.set(
    "unverifiedTransactionHistory",
    JSON.stringify([
      {
        brokerAccountKey: aib,
        exchangeOrderNo: "AIB-U-1"
      },
      {
        brokerAccountKey: abc,
        exchangeOrderNo: "ABC-U-1"
      },
      {
        exchangeOrderNo: "LEGACY-U-1"
      }
    ])
  );

  memory.set(
    "brokerTransactionHistoryLegacyProjectionVersion",
    "OLD_CONTRACT"
  );

  /*
   * Sentinel values representing evidence that MUST NOT be
   * touched by transaction-history reset.
   */
  memory.set(
    "brokerHoldingsEvidence",
    "HOLDINGS_SENTINEL"
  );

  memory.set(
    "brokerCashEvidence",
    "CASH_SENTINEL"
  );

  memory.set(
    "brokerAccounts",
    "BROKER_ACCOUNT_SENTINEL"
  );


  const result =
    await resetAllBrokerTransactionHistoryEvidence();


  assert.equal(
    result.clearedAccountCount,
    2
  );

  assert.equal(
    result.clearedVerifiedCount,
    3
  );

  assert.equal(
    result.clearedUnverifiedCount,
    2
  );

  assert.equal(
    result.clearedScopedCount,
    5
  );

  console.log(
    "AIB_AND_ABC_SCOPED_HISTORY_CLEARED=PASS"
  );


  const registry =
    await loadBrokerTransactionHistoryRegistry();

  assert.deepEqual(
    registry,
    {}
  );

  console.log(
    "CANONICAL_REGISTRY_EMPTY=PASS"
  );


  const aibAfter =
    await loadBrokerTransactionHistoryEvidence(
      aib
    );

  const abcAfter =
    await loadBrokerTransactionHistoryEvidence(
      abc
    );

  assert.equal(
    aibAfter.verified.length,
    0
  );

  assert.equal(
    aibAfter.unverified.length,
    0
  );

  assert.equal(
    abcAfter.verified.length,
    0
  );

  assert.equal(
    abcAfter.unverified.length,
    0
  );

  console.log(
    "AIB_HISTORY_ZERO=PASS"
  );

  console.log(
    "ABC_HISTORY_ZERO=PASS"
  );


  assert.deepEqual(
    JSON.parse(
      memory.get("transactionHistory")
    ),
    []
  );

  assert.deepEqual(
    JSON.parse(
      memory.get(
        "unverifiedTransactionHistory"
      )
    ),
    []
  );

  console.log(
    "COMPATIBILITY_PROJECTIONS_EMPTY=PASS"
  );


  assert.equal(
    memory.has(
      "brokerTransactionHistoryLegacyProjectionVersion"
    ),
    false
  );

  console.log(
    "OLD_PROJECTION_MARKER_REMOVED=PASS"
  );


  /*
   * Verify non-transaction evidence survived exactly.
   */
  assert.equal(
    memory.get("brokerHoldingsEvidence"),
    "HOLDINGS_SENTINEL"
  );

  assert.equal(
    memory.get("brokerCashEvidence"),
    "CASH_SENTINEL"
  );

  assert.equal(
    memory.get("brokerAccounts"),
    "BROKER_ACCOUNT_SENTINEL"
  );

  console.log(
    "HOLDINGS_UNTOUCHED=PASS"
  );

  console.log(
    "CASH_UNTOUCHED=PASS"
  );

  console.log(
    "BROKER_CONNECTIONS_UNTOUCHED=PASS"
  );


  /*
   * Global reset must also be idempotent.
   */
  const second =
    await resetAllBrokerTransactionHistoryEvidence();

  assert.equal(
    second.clearedAccountCount,
    0
  );

  assert.equal(
    second.clearedScopedCount,
    0
  );

  console.log(
    "GLOBAL_RESET_IDEMPOTENT=PASS"
  );


  console.log(
    "TXHIST_004E7_RESULT=PASS"
  );

} finally {
  __resetBrokerTransactionHistoryStorageLoaderForTests();
}
