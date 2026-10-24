import assert from "node:assert/strict";

import {
  __setBrokerTransactionHistoryStorageLoaderForTests,
  __resetBrokerTransactionHistoryStorageLoaderForTests,
  loadBrokerTransactionHistoryEvidence,
  applyBrokerTransactionHistoryClassificationRepair
} from "../src/features/trading/brokerTransactionHistoryEvidenceStore.js";

import {
  planHistoricalBrokerClassificationRepair
} from "../src/features/trading/historicalBrokerExecutionClassificationRepairService.js";


console.log(
  "===== TXHIST-004E2 SYNTHETIC STORAGE REPAIR ====="
);

const memory =
  new Map();

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
  const account =
    "AIB|137971";

  const corrected = {
    brokerAccountKey: account,
    exchangeOrderNo: "CORRECTED-001",
    date: "13-Apr-26",
    symbol: "ABSA",
    side: "BUY",
    totalTradedQuantity: 7,
    quantity: 7,
    price: 31.25,
    manualCorrection: true,
    status: "Cancelled",
    evidenceStatus: "UNVERIFIED"
  };

  const needsPrice = {
    brokerAccountKey: account,
    exchangeOrderNo: "PRICE-001",
    date: "14-Apr-26",
    symbol: "SCOM",
    side: "BUY",
    totalTradedQuantity: 100,
    quantity: 100,
    price: 0,
    status: "Fully Traded",
    evidenceStatus: "UNVERIFIED"
  };

  const notExecuted = {
    brokerAccountKey: account,
    exchangeOrderNo: "ZERO-001",
    date: "15-Apr-26",
    symbol: "KCB",
    side: "BUY",
    totalTradedQuantity: 0,
    quantity: 1000,
    price: 45,
    status: "Fully Traded",
    evidenceStatus: "UNVERIFIED"
  };

  const existingVerified = {
    brokerAccountKey: account,
    exchangeOrderNo: "VERIFIED-001",
    date: "12-Apr-26",
    symbol: "EQTY",
    side: "BUY",
    totalTradedQuantity: 10,
    quantity: 10,
    price: 50,
    evidenceStatus: "VERIFIED"
  };

  memory.set(
    "brokerTransactionHistoryByAccount",
    JSON.stringify({
      [account]: {
        brokerAccountKey: account,
        verified: [
          existingVerified
        ],
        unverified: [
          corrected,
          needsPrice,
          notExecuted
        ],
        fileName: "synthetic.csv",
        source: "TEST"
      }
    })
  );

  memory.set(
    "transactionHistory",
    JSON.stringify([
      existingVerified
    ])
  );

  memory.set(
    "unverifiedTransactionHistory",
    JSON.stringify([
      corrected,
      needsPrice,
      notExecuted
    ])
  );


  /*
   * ----------------------------------------------------------
   * PLAN
   * ----------------------------------------------------------
   */

  const before =
    await loadBrokerTransactionHistoryEvidence(
      account
    );

  const plan =
    planHistoricalBrokerClassificationRepair({
      brokerAccountKey: account,
      brokerId: "AIB",
      verified: before.verified,
      unverified: before.unverified
    });

  assert.equal(
    plan.summary.promoteCount,
    1
  );

  assert.equal(
    plan.summary.needsPriceCount,
    1
  );

  assert.equal(
    plan.summary.ignoredNotExecutedCount,
    1
  );

  console.log(
    "REPAIR_PLAN_COUNTS=PASS"
  );


  /*
   * ----------------------------------------------------------
   * APPLY ONLY THE FIFO-READY PROMOTION.
   * ----------------------------------------------------------
   */

  const promotionIds =
    plan.promoteToVerified.map(
      (entry) =>
        entry.immutableIdentity
    );

  const result =
    await applyBrokerTransactionHistoryClassificationRepair({
      brokerAccountKey: account,
      promoteIdentities:
        promotionIds
    });

  assert.equal(
    result.repairSummary.promotedCount,
    1
  );

  assert.equal(
    result.repairSummary.economicRowsUpdated,
    0
  );

  assert.equal(
    result.repairSummary.economicRowsDeleted,
    0
  );

  assert.equal(
    result.repairSummary.economicRowsInserted,
    0
  );

  console.log(
    "CLASSIFICATION_PROMOTION_ONLY=PASS"
  );


  /*
   * ----------------------------------------------------------
   * MANUAL CORRECTION MUST SURVIVE EXACTLY.
   * ----------------------------------------------------------
   */

  const promoted =
    result.verified.find(
      (row) =>
        row.exchangeOrderNo ===
        "CORRECTED-001"
    );

  assert.ok(promoted);

  assert.equal(
    promoted.price,
    31.25
  );

  assert.equal(
    promoted.totalTradedQuantity,
    7
  );

  assert.equal(
    promoted.manualCorrection,
    true
  );

  assert.equal(
    promoted.status,
    "Cancelled"
  );

  console.log(
    "MANUAL_CORRECTION_EXACTLY_PRESERVED=PASS"
  );


  /*
   * ----------------------------------------------------------
   * PRICE REVIEW REMAINS UNVERIFIED.
   * ----------------------------------------------------------
   */

  assert.ok(
    result.unverified.some(
      (row) =>
        row.exchangeOrderNo ===
        "PRICE-001"
    )
  );

  console.log(
    "ZERO_PRICE_REMAINS_REVIEW=PASS"
  );


  /*
   * ----------------------------------------------------------
   * ZERO TOTAL TRADED REMAINS OUTSIDE VERIFIED.
   * ----------------------------------------------------------
   */

  assert.ok(
    result.unverified.some(
      (row) =>
        row.exchangeOrderNo ===
        "ZERO-001"
    )
  );

  assert.equal(
    result.verified.some(
      (row) =>
        row.exchangeOrderNo ===
        "ZERO-001"
    ),
    false
  );

  console.log(
    "ZERO_TOTAL_TRADED_NOT_PROMOTED=PASS"
  );


  /*
   * ----------------------------------------------------------
   * EXISTING VERIFIED ROW SURVIVES.
   * ----------------------------------------------------------
   */

  assert.equal(
    result.verified.filter(
      (row) =>
        row.exchangeOrderNo ===
        "VERIFIED-001"
    ).length,
    1
  );

  console.log(
    "EXISTING_VERIFIED_PRESERVED=PASS"
  );


  /*
   * ----------------------------------------------------------
   * FINAL COUNTS.
   * ----------------------------------------------------------
   */

  assert.equal(
    result.verified.length,
    2
  );

  assert.equal(
    result.unverified.length,
    2
  );

  console.log(
    "FINAL_BUCKET_COUNTS=PASS"
  );


  /*
   * ----------------------------------------------------------
   * RE-RUN IS IDEMPOTENT.
   * ----------------------------------------------------------
   */

  const rerun =
    await applyBrokerTransactionHistoryClassificationRepair({
      brokerAccountKey: account,
      promoteIdentities:
        promotionIds
    });

  assert.equal(
    rerun.repairSummary.promotedCount,
    0
  );

  assert.equal(
    rerun.verified.length,
    2
  );

  assert.equal(
    rerun.unverified.length,
    2
  );

  console.log(
    "REPAIR_RERUN_IDEMPOTENT=PASS"
  );

  console.log(
    "TXHIST_004E2_RESULT=PASS"
  );
} finally {
  __resetBrokerTransactionHistoryStorageLoaderForTests();
}
