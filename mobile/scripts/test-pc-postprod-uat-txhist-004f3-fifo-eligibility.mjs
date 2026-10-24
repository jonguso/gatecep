import assert from "node:assert/strict";

import {
  __setBrokerTransactionHistoryStorageLoaderForTests,
  __resetBrokerTransactionHistoryStorageLoaderForTests
} from "../src/features/trading/brokerTransactionHistoryEvidenceStore.js";

import {
  loadBrokerLotHistoryEvidence
} from "../src/features/trading/brokerLotHistoryEvidenceService.js";

import {
  classifyHistoricalBrokerExecutionEvidence
} from "../src/features/trading/historicalBrokerExecutionEvidencePolicy.js";

console.log(
  "===== TXHIST-004F3 FIFO ELIGIBILITY REGRESSION ====="
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

const ACCOUNT = "AIB|F3-ACCOUNT";

function historical({
  exchangeOrderNo,
  quantity,
  price,
  status = "FULLY TRADED",
  date = "2026-01-02",
  side = "BUY"
}) {
  return classifyHistoricalBrokerExecutionEvidence(
    {
      brokerAccountKey: ACCOUNT,
      broker: "AIB",
      exchangeOrderNo,
      executionDate: date,
      date,
      symbol: "SCOM",
      side,

      // Historical execution authority.
      totalTradedQuantity: quantity,

      price,
      status
    },
    {
      brokerAccountKey: ACCOUNT,
      brokerId: "AIB"
    }
  );
}

try {
  const ready = historical({
    exchangeOrderNo: "F3-READY",
    quantity: 100,
    price: 30
  });

  const needsPrice = historical({
    exchangeOrderNo: "F3-NEEDS-PRICE",
    quantity: 50,
    price: 0
  });

  assert.equal(
    ready.fifoEligible,
    true
  );

  assert.equal(
    ready.canAffectFifo,
    true
  );

  assert.equal(
    needsPrice.executionConfirmed,
    true
  );

  assert.equal(
    needsPrice.historicalExecutionState,
    "EXECUTED_NEEDS_PRICE"
  );

  assert.equal(
    needsPrice.fifoEligible,
    false
  );

  assert.equal(
    needsPrice.canAffectFifo,
    false
  );

  console.log(
    "POLICY_PRICE_REVIEW_NOT_FIFO_ELIGIBLE=PASS"
  );

  /*
   * Put the FIFO-ready execution in verified and the confirmed
   * needs-price execution in unverified, exactly matching the
   * historical save contract.
   */
  memory.set(
    "brokerTransactionHistoryByAccount",
    JSON.stringify({
      [ACCOUNT]: {
        brokerAccountKey: ACCOUNT,
        verified: [
          ready
        ],
        unverified: [
          needsPrice
        ],
        updatedAt:
          "2026-10-24T00:00:00.000Z",
        fileName:
          "f3-synthetic.csv",
        source:
          "F3_SYNTHETIC"
      }
    })
  );

  /*
   * Keep compatibility projections empty so this test isolates
   * the account-scoped registry and cannot accidentally pass
   * because of duplicate compatibility evidence.
   */
  memory.set(
    "transactionHistory",
    JSON.stringify([])
  );

  memory.set(
    "unverifiedTransactionHistory",
    JSON.stringify([])
  );

  const evidence =
    await loadBrokerLotHistoryEvidence({
      brokerAccountKey: ACCOUNT
    });

  assert.equal(
    evidence.ready,
    true
  );

  assert.equal(
    evidence.completedCount,
    1,
    "only the FIFO-ready execution may enter lot history"
  );

  assert.equal(
    evidence.records.length,
    1
  );

  assert.equal(
    evidence.records[0].exchangeOrderNo,
    "F3-READY"
  );

  assert.equal(
    evidence.records.some(
      row =>
        row.exchangeOrderNo ===
        "F3-NEEDS-PRICE"
    ),
    false,
    "needs-price execution must never reach FIFO lot history"
  );

  console.log(
    "UNVERIFIED_NEEDS_PRICE_EXCLUDED_FROM_FIFO=PASS"
  );

  /*
   * Status is deliberately odd. Historical execution authority
   * is Total Traded Quantity, but the current lot-history
   * compatibility predicate still recognizes status.
   *
   * F3 is NOT changing that separate legacy predicate. This
   * assertion simply ensures explicit FIFO false wins even if
   * every legacy completion field otherwise looks acceptable.
   */
  const explicitFalse = {
    ...ready,
    exchangeOrderNo:
      "F3-EXPLICIT-FALSE",
    brokerReference:
      "F3-EXPLICIT-FALSE",
    fifoEligible: false,
    canAffectFifo: false,
    status: "FULLY TRADED"
  };

  memory.set(
    "brokerTransactionHistoryByAccount",
    JSON.stringify({
      [ACCOUNT]: {
        brokerAccountKey: ACCOUNT,
        verified: [
          ready
        ],
        unverified: [
          explicitFalse
        ]
      }
    })
  );

  const explicitFalseEvidence =
    await loadBrokerLotHistoryEvidence({
      brokerAccountKey: ACCOUNT
    });

  assert.equal(
    explicitFalseEvidence.records.some(
      row =>
        row.exchangeOrderNo ===
        "F3-EXPLICIT-FALSE"
    ),
    false
  );

  console.log(
    "EXPLICIT_FIFO_FALSE_FAILS_CLOSED=PASS"
  );

  /*
   * Compatibility test:
   * older verified lot records may not have the newer flags.
   * F3 must not erase legitimate legacy FIFO evidence merely
   * because those properties are absent.
   */
  const legacyVerified = {
    brokerAccountKey: ACCOUNT,
    brokerReference:
      "F3-LEGACY",
    exchangeOrderNo:
      "F3-LEGACY",
    symbol: "SCOM",
    side: "BUY",
    quantity: 25,
    price: 28,
    executionPrice: 28,
    executionDate:
      "2025-12-01",
    date:
      "2025-12-01",
    status:
      "FULLY TRADED"
  };

  memory.set(
    "brokerTransactionHistoryByAccount",
    JSON.stringify({
      [ACCOUNT]: {
        brokerAccountKey: ACCOUNT,
        verified: [
          legacyVerified
        ],
        unverified: []
      }
    })
  );

  const legacyEvidence =
    await loadBrokerLotHistoryEvidence({
      brokerAccountKey: ACCOUNT
    });

  assert.equal(
    legacyEvidence.completedCount,
    1
  );

  assert.equal(
    legacyEvidence.records[0].exchangeOrderNo,
    "F3-LEGACY"
  );

  console.log(
    "LEGACY_VERIFIED_COMPATIBILITY=PASS"
  );

  console.log(
    "TXHIST_004F3_RESULT=PASS"
  );
} finally {
  __resetBrokerTransactionHistoryStorageLoaderForTests();
}
