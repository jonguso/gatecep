import assert from "node:assert/strict";

import {
  __setBrokerTransactionHistoryStorageLoaderForTests,
  __resetBrokerTransactionHistoryStorageLoaderForTests,
  exportBrokerTransactionHistoryBackup
} from "../src/features/trading/brokerTransactionHistoryEvidenceStore.js";

console.log(
  "===== TXHIST-004E8-R4 BACKUP CONTRACT ====="
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

  const registry = {
    [aib]: {
      brokerAccountKey: aib,

      verified: [
        {
          brokerAccountKey: aib,
          exchangeOrderNo: "AIB-V-1",
          totalTradedQuantity: 7,
          price: 31.25,
          manualCorrection: true
        }
      ],

      unverified: [
        {
          brokerAccountKey: aib,
          exchangeOrderNo: "AIB-U-1",
          totalTradedQuantity: 100,
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
          price: 42.5
        }
      ],

      unverified: []
    }
  };

  memory.set(
    "brokerTransactionHistoryByAccount",
    JSON.stringify(registry)
  );

  memory.set(
    "transactionHistory",
    JSON.stringify([
      registry[aib].verified[0],
      registry[abc].verified[0],
      {
        exchangeOrderNo:
          "LEGACY-V-1"
      }
    ])
  );

  memory.set(
    "unverifiedTransactionHistory",
    JSON.stringify([
      registry[aib].unverified[0],
      {
        exchangeOrderNo:
          "LEGACY-U-1"
      }
    ])
  );

  memory.set(
    "brokerTransactionHistoryLegacyProjectionVersion",
    "OLD_CONTRACT"
  );

  const before =
    JSON.stringify(
      [...memory.entries()]
    );

  const backup =
    await exportBrokerTransactionHistoryBackup();

  assert.equal(
    backup.schema,
    "GATECEP_TRANSACTION_HISTORY_BACKUP_V1"
  );

  assert.equal(
    backup.accountCount,
    2
  );

  assert.equal(
    backup.scopedVerifiedCount,
    2
  );

  assert.equal(
    backup.scopedUnverifiedCount,
    1
  );

  assert.equal(
    backup.scopedTotalCount,
    3
  );

  console.log(
    "BACKUP_COUNTS=PASS"
  );


  assert.deepEqual(
    backup.registry,
    registry
  );

  console.log(
    "CANONICAL_REGISTRY_PRESERVED=PASS"
  );


  assert.equal(
    backup.compatibility.verified.length,
    3
  );

  assert.equal(
    backup.compatibility.unverified.length,
    2
  );

  assert.equal(
    backup.projectionVersion,
    "OLD_CONTRACT"
  );

  console.log(
    "COMPATIBILITY_EVIDENCE_PRESERVED=PASS"
  );


  assert.equal(
    backup.registry[aib].verified[0].price,
    31.25
  );

  assert.equal(
    backup.registry[aib].verified[0].manualCorrection,
    true
  );

  console.log(
    "MANUAL_CORRECTION_PRESERVED=PASS"
  );


  const after =
    JSON.stringify(
      [...memory.entries()]
    );

  assert.equal(
    after,
    before
  );

  console.log(
    "BACKUP_READ_ONLY=PASS"
  );


  assert.ok(
    typeof backup.exportedAt === "string" &&
    backup.exportedAt.length > 0
  );

  console.log(
    "BACKUP_TIMESTAMP=PASS"
  );

  console.log(
    "TXHIST_004E8_R4_RESULT=PASS"
  );

} finally {
  __resetBrokerTransactionHistoryStorageLoaderForTests();
}
