import assert from "node:assert/strict";

import {
  __setBrokerTransactionHistoryStorageLoaderForTests,
  __resetBrokerTransactionHistoryStorageLoaderForTests,
  saveBrokerTransactionHistoryEvidence,
  loadBrokerTransactionHistoryEvidence
} from "../src/features/trading/brokerTransactionHistoryEvidenceStore.js";

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

const ACCOUNT =
  "ABC::CLIENT-001";

function tx({
  exchangeOrderNo,
  quantity = 100,
  price = 20,
  status = "FULLY TRADED",
  id
}) {
  return {
    id:
      id ||
      `TX-${exchangeOrderNo}`,
    date: "2026-10-23",
    symbol: "SCOM",
    side: "BUY",
    quantity,
    totalTradedQuantity: quantity,
    price,
    status,
    exchangeOrderNo,
    source: "TRANSACTION_UPLOAD"
  };
}

try {
  console.log(
    "===== TXHIST-003A RUNTIME VERIFIER ====="
  );

  // ----------------------------------------------------------
  // Initial historical import.
  // ----------------------------------------------------------

  const first =
    await saveBrokerTransactionHistoryEvidence({
      brokerAccountKey: ACCOUNT,
      verified: [
        tx({
          exchangeOrderNo: "EX-1001",
          price: 20
        }),
        tx({
          exchangeOrderNo: "EX-1002",
          price: 30
        })
      ],
      unverified: [],
      fileName: "history-1.csv"
    });

  assert.equal(
    first.mergeSummary.insertedVerifiedCount,
    2
  );

  let loaded =
    await loadBrokerTransactionHistoryEvidence(
      ACCOUNT
    );

  assert.equal(
    loaded.verified.length,
    2
  );

  console.log(
    "INITIAL_INSERT=PASS count=" +
    loaded.verified.length
  );

  // ----------------------------------------------------------
  // Simulate a manual correction after initial import.
  // This represents the user's corrected market execution price.
  // ----------------------------------------------------------

  const registry =
    JSON.parse(
      memory.get(
        "brokerTransactionHistoryByAccount"
      )
    );

  registry[ACCOUNT].verified[0].price =
    25.75;

  registry[ACCOUNT].verified[0].manualCorrection =
    true;

  memory.set(
    "brokerTransactionHistoryByAccount",
    JSON.stringify(registry)
  );

  // Keep compatibility projection aligned for this isolated test.
  const legacy =
    JSON.parse(
      memory.get("transactionHistory")
    );

  const correctedLegacy =
    legacy.map((row) =>
      row.exchangeOrderNo === "EX-1001"
        ? {
            ...row,
            price: 25.75,
            manualCorrection: true
          }
        : row
    );

  memory.set(
    "transactionHistory",
    JSON.stringify(correctedLegacy)
  );

  // ----------------------------------------------------------
  // Later broker upload:
  // - EX-1001 already exists but broker price differs.
  // - EX-1002 already exists.
  // - EX-1003 is genuinely new.
  // ----------------------------------------------------------

  const second =
    await saveBrokerTransactionHistoryEvidence({
      brokerAccountKey: ACCOUNT,
      verified: [
        tx({
          exchangeOrderNo: "EX-1001",
          price: 0
        }),
        tx({
          exchangeOrderNo: "EX-1002",
          price: 99
        }),
        tx({
          exchangeOrderNo: "EX-1003",
          price: 40
        })
      ],
      unverified: [],
      fileName: "history-2.csv"
    });

  loaded =
    await loadBrokerTransactionHistoryEvidence(
      ACCOUNT
    );

  assert.equal(
    loaded.verified.length,
    3,
    "Only one new exchange order should be appended."
  );

  const ex1001 =
    loaded.verified.find(
      (row) =>
        row.exchangeOrderNo === "EX-1001"
    );

  assert.ok(ex1001);

  assert.equal(
    ex1001.price,
    25.75,
    "Manual price correction must survive later upload."
  );

  assert.equal(
    ex1001.manualCorrection,
    true
  );

  assert.equal(
    second.mergeSummary.insertedVerifiedCount,
    1
  );

  assert.equal(
    second.mergeSummary.skippedExistingCount,
    2
  );

  assert.equal(
    second.mergeSummary.updatedExistingCount,
    0
  );

  assert.equal(
    second.mergeSummary.deletedCount,
    0
  );

  console.log(
    "MANUAL_CORRECTION_PRESERVED=PASS"
  );

  console.log(
    "EXISTING_ROWS_SKIPPED=PASS count=" +
    second.mergeSummary.skippedExistingCount
  );

  console.log(
    "NEW_ROW_INSERTED=PASS count=" +
    second.mergeSummary.insertedVerifiedCount
  );

  console.log(
    "EXISTING_ROWS_UPDATED=0"
  );

  console.log(
    "EXISTING_ROWS_DELETED=0"
  );

  // ----------------------------------------------------------
  // Re-upload same file: must be idempotent.
  // ----------------------------------------------------------

  const third =
    await saveBrokerTransactionHistoryEvidence({
      brokerAccountKey: ACCOUNT,
      verified: [
        tx({
          exchangeOrderNo: "EX-1001",
          price: 20
        }),
        tx({
          exchangeOrderNo: "EX-1002",
          price: 30
        }),
        tx({
          exchangeOrderNo: "EX-1003",
          price: 40
        })
      ],
      unverified: [],
      fileName: "history-3.csv"
    });

  loaded =
    await loadBrokerTransactionHistoryEvidence(
      ACCOUNT
    );

  assert.equal(
    loaded.verified.length,
    3
  );

  assert.equal(
    third.mergeSummary.insertedVerifiedCount,
    0
  );

  assert.equal(
    third.mergeSummary.skippedExistingCount,
    3
  );

  console.log(
    "REUPLOAD_IDEMPOTENT=PASS"
  );

  // ----------------------------------------------------------
  // Invalid execution admission.
  // ----------------------------------------------------------

  const fourth =
    await saveBrokerTransactionHistoryEvidence({
      brokerAccountKey: ACCOUNT,
      verified: [
        tx({
          exchangeOrderNo: "",
          quantity: 100,
          price: 50
        }),
        tx({
          exchangeOrderNo: "EX-ZERO",
          quantity: 0,
          price: 50
        })
      ],
      unverified: [],
      fileName: "invalid.csv"
    });

  loaded =
    await loadBrokerTransactionHistoryEvidence(
      ACCOUNT
    );

  assert.equal(
    loaded.verified.length,
    3
  );

  assert.equal(
    fourth.mergeSummary.skippedInvalidCount,
    2
  );

  console.log(
    "INVALID_EXECUTIONS_IGNORED=PASS count=2"
  );

  console.log(
    "TXHIST_003A_RESULT=PASS"
  );
} finally {
  __resetBrokerTransactionHistoryStorageLoaderForTests();
}
