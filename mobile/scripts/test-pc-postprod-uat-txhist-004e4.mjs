import assert from "node:assert/strict";

import {
  partitionHistoricalBrokerExecutionEvidence
} from "../src/features/trading/historicalBrokerExecutionEvidencePolicy.js";

import {
  __setBrokerTransactionHistoryStorageLoaderForTests,
  __resetBrokerTransactionHistoryStorageLoaderForTests,
  saveBrokerTransactionHistoryEvidence,
  loadBrokerTransactionHistoryEvidence
} from "../src/features/trading/brokerTransactionHistoryEvidenceStore.js";


console.log(
  "===== TXHIST-004E4 SYNTHETIC END-TO-END SAVE ====="
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
  const brokerAccountKey =
    "AIB|137971";

  const context = {
    brokerAccountKey,
    brokerId: "AIB"
  };


  /*
   * ----------------------------------------------------------
   * INPUT
   *
   * 1. FIFO-ready execution.
   * 2. Confirmed execution requiring price review.
   * 3. Zero Total Traded Quantity — NOT an execution.
   *
   * Status values are deliberately contradictory to prove
   * that status does not determine historical execution.
   * ----------------------------------------------------------
   */

  const input = [
    {
      brokerAccountKey,
      exchangeOrderNo: "READY-001",
      date: "13-Apr-26",
      symbol: "ABSA",
      side: "BUY",
      totalTradedQuantity: 7,
      quantity: 1000,
      price: 30.95,
      status: "Cancelled"
    },

    {
      brokerAccountKey,
      exchangeOrderNo: "PRICE-001",
      date: "14-Apr-26",
      symbol: "SCOM",
      side: "BUY",
      totalTradedQuantity: 100,
      quantity: 500,
      price: 0,
      status: "Fully Traded"
    },

    {
      brokerAccountKey,
      exchangeOrderNo: "ZERO-001",
      date: "15-Apr-26",
      symbol: "KCB",
      side: "BUY",
      totalTradedQuantity: 0,
      quantity: 1000,
      price: 45,
      status: "Fully Traded"
    }
  ];


  /*
   * ----------------------------------------------------------
   * PARTITION
   * ----------------------------------------------------------
   */

  const partition =
    partitionHistoricalBrokerExecutionEvidence(
      input,
      context
    );

  assert.equal(
    partition.verified.length,
    1
  );

  assert.equal(
    partition.needsReview.length,
    1
  );

  assert.equal(
    partition.needsPrice.length,
    1
  );

  assert.equal(
    partition.ignored.length,
    1
  );

  console.log(
    "PARTITION_CONTRACT=PASS"
  );


  /*
   * ----------------------------------------------------------
   * EXACT UI SAVE MAPPING
   *
   * verified    -> verified
   * needsReview -> unverified
   * ignored     -> not submitted
   * ----------------------------------------------------------
   */

  const saved =
    await saveBrokerTransactionHistoryEvidence({
      brokerAccountKey,

      verified:
        partition.verified,

      unverified:
        partition.needsReview,

      fileName:
        "synthetic-order-history-137971.csv",

      source:
        "TRANSACTION_UPLOAD"
    });


  /*
   * ----------------------------------------------------------
   * RELOAD CANONICAL ACCOUNT BUCKET
   * ----------------------------------------------------------
   */

  const loaded =
    await loadBrokerTransactionHistoryEvidence(
      brokerAccountKey
    );

  assert.equal(
    loaded.verified.length,
    1
  );

  assert.equal(
    loaded.unverified.length,
    1
  );

  console.log(
    "STORE_BUCKET_COUNTS=PASS"
  );


  /*
   * ----------------------------------------------------------
   * READY EXECUTION IS VERIFIED.
   * ----------------------------------------------------------
   */

  const ready =
    loaded.verified.find(
      row =>
        row.exchangeOrderNo ===
        "READY-001"
    );

  assert.ok(ready);

  assert.equal(
    ready.totalTradedQuantity,
    7
  );

  /*
   * Canonical historical quantity must be actual executed qty,
   * not requested/order quantity 1000.
   */
  assert.equal(
    ready.quantity,
    7
  );

  assert.equal(
    ready.price,
    30.95
  );

  assert.equal(
    ready.status,
    "Cancelled"
  );

  assert.equal(
    ready.fifoEligible,
    true
  );

  console.log(
    "FIFO_READY_EXECUTION_PERSISTED=PASS"
  );


  /*
   * ----------------------------------------------------------
   * PRICE REVIEW EXECUTION STAYS UNVERIFIED.
   * ----------------------------------------------------------
   */

  const priceReview =
    loaded.unverified.find(
      row =>
        row.exchangeOrderNo ===
        "PRICE-001"
    );

  assert.ok(priceReview);

  assert.equal(
    priceReview.totalTradedQuantity,
    100
  );

  assert.equal(
    priceReview.quantity,
    100
  );

  assert.equal(
    priceReview.executionConfirmed,
    true
  );

  assert.equal(
    priceReview.needsPriceReview,
    true
  );

  assert.equal(
    priceReview.fifoEligible,
    false
  );

  console.log(
    "PRICE_REVIEW_EXECUTION_PERSISTED_UNVERIFIED=PASS"
  );


  /*
   * ----------------------------------------------------------
   * ZERO TOTAL TRADED MUST NOT ENTER EITHER STORE BUCKET.
   * ----------------------------------------------------------
   */

  const allStored = [
    ...loaded.verified,
    ...loaded.unverified
  ];

  assert.equal(
    allStored.some(
      row =>
        row.exchangeOrderNo ===
        "ZERO-001"
    ),
    false
  );

  console.log(
    "ZERO_EXECUTION_NOT_PERSISTED=PASS"
  );


  /*
   * ----------------------------------------------------------
   * NO OTHER QUANTITY FIELD MAY SUBSTITUTE.
   * ----------------------------------------------------------
   */

  assert.equal(
    allStored.some(
      row =>
        row.exchangeOrderNo ===
          "READY-001" &&
        row.quantity === 1000
    ),
    false
  );

  console.log(
    "ORDER_QUANTITY_NOT_SUBSTITUTED=PASS"
  );


  /*
   * ----------------------------------------------------------
   * STATUS REMAINS DESCRIPTIVE.
   * READY-001 was CANCELLED but actual traded qty = 7.
   * ----------------------------------------------------------
   */

  assert.equal(
    ready.executionConfirmed,
    true
  );

  assert.equal(
    ready.status,
    "Cancelled"
  );

  console.log(
    "STATUS_NOT_EXECUTION_GATE=PASS"
  );


  /*
   * ----------------------------------------------------------
   * REUPLOAD SAME EXECUTIONS.
   *
   * Append-only identity must make this idempotent.
   * ----------------------------------------------------------
   */

  const secondSave =
    await saveBrokerTransactionHistoryEvidence({
      brokerAccountKey,

      verified:
        partition.verified,

      unverified:
        partition.needsReview,

      fileName:
        "synthetic-order-history-137971.csv",

      source:
        "TRANSACTION_UPLOAD"
    });

  const secondLoaded =
    await loadBrokerTransactionHistoryEvidence(
      brokerAccountKey
    );

  assert.equal(
    secondLoaded.verified.length,
    1
  );

  assert.equal(
    secondLoaded.unverified.length,
    1
  );

  assert.equal(
    Number(
      secondSave?.mergeSummary
        ?.updatedExistingCount || 0
    ),
    0
  );

  assert.equal(
    Number(
      secondSave?.mergeSummary
        ?.deletedCount || 0
    ),
    0
  );

  console.log(
    "REUPLOAD_IDEMPOTENT=PASS"
  );


  /*
   * ----------------------------------------------------------
   * MANUAL CORRECTION PROTECTION
   *
   * Simulate an intentional user correction already stored.
   * Reupload must not overwrite it.
   * ----------------------------------------------------------
   */

  const registryKey =
    "brokerTransactionHistoryByAccount";

  const registry =
    JSON.parse(
      memory.get(registryKey)
    );

  const corrected =
    registry[brokerAccountKey]
      .verified
      .find(
        row =>
          row.exchangeOrderNo ===
          "READY-001"
      );

  corrected.price = 31.25;
  corrected.manualCorrection = true;

  memory.set(
    registryKey,
    JSON.stringify(registry)
  );

  await saveBrokerTransactionHistoryEvidence({
    brokerAccountKey,

    verified:
      partition.verified,

    unverified:
      partition.needsReview,

    fileName:
      "synthetic-order-history-137971.csv",

    source:
      "TRANSACTION_UPLOAD"
  });

  const afterCorrection =
    await loadBrokerTransactionHistoryEvidence(
      brokerAccountKey
    );

  const preserved =
    afterCorrection.verified.find(
      row =>
        row.exchangeOrderNo ===
        "READY-001"
    );

  assert.equal(
    preserved.price,
    31.25
  );

  assert.equal(
    preserved.manualCorrection,
    true
  );

  console.log(
    "MANUAL_CORRECTION_NOT_OVERWRITTEN=PASS"
  );


  /*
   * ----------------------------------------------------------
   * FINAL ECONOMIC SAFETY
   * ----------------------------------------------------------
   */

  assert.equal(
    afterCorrection.verified.length,
    1
  );

  assert.equal(
    afterCorrection.unverified.length,
    1
  );

  console.log(
    "FINAL_HISTORY_COUNTS=PASS"
  );

  console.log(
    "TXHIST_004E4_RESULT=PASS"
  );

} finally {
  __resetBrokerTransactionHistoryStorageLoaderForTests();
}
