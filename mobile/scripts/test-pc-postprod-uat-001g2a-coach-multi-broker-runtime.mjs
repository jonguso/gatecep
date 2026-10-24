import assert from "node:assert/strict";

import {
  __setBrokerTransactionHistoryStorageLoaderForTests,
  __resetBrokerTransactionHistoryStorageLoaderForTests,
  saveBrokerTransactionHistoryEvidence
} from "../src/features/trading/brokerTransactionHistoryEvidenceStore.js";

import {
  partitionBrokerExecutionEvidence
} from "../src/features/broker-sync/brokerExecutionEvidencePolicy.js";

import {
  filterRealBehaviorHistory
} from "../src/features/wealth-journey/realBehaviorHistorySourcePolicy.js";

const storage = new Map();

const userGetItem = async (key) =>
  storage.has(key) ? storage.get(key) : null;

const userSetItem = async (key, value) => {
  storage.set(key, value);
};

__setBrokerTransactionHistoryStorageLoaderForTests(
  async () => ({
    userGetItem,
    userSetItem
  })
);

const ACCOUNT_A = "ABC|ACC-A";
const ACCOUNT_B = "ABC|ACC-B";

function execution({
  reference,
  accountKey,
  symbol = "PORT",
  side = "BUY",
  quantity = 1,
  price = 120,
  date = "2026-10-15",
  status = "FILLED"
}) {
  return {
    fillReference: reference,
    brokerReference: reference,
    exchangeOrderNo: reference,
    totalTradedQuantity: quantity,
    brokerAccountKey: accountKey,
    broker: "ABC",
    symbol,
    side,
    quantity,
    price,
    date,
    executionDate: date,
    status,
    totalFees: 10,
    settlementStatus: "SETTLED"
  };
}

function loadCoachTradeHistory() {
  const raw = JSON.parse(
    storage.get("transactionHistory") || "[]"
  );

  const { verified } =
    partitionBrokerExecutionEvidence(raw);

  return filterRealBehaviorHistory(
    verified.map((row) => ({
      ...row,
      isPractice: false,
      isReal: true,
      sourceType: "BROKER_EXECUTION_EVIDENCE",
      evidenceSource:
        "VERIFIED_BROKER_TRANSACTION_HISTORY",
      createdAt: row.executionDate
    }))
  );
}

try {
  console.log("TEST 1 — A and B both enter Coach G REAL history");

  await saveBrokerTransactionHistoryEvidence({
    brokerAccountKey: ACCOUNT_A,
    verified: [
      execution({
        reference: "A-OLD",
        accountKey: ACCOUNT_A,
        quantity: 120,
        price: 121.47
      })
    ],
    fileName: "account-a.csv",
    source: "001G2A_TEST"
  });

  await saveBrokerTransactionHistoryEvidence({
    brokerAccountKey: ACCOUNT_B,
    verified: [
      execution({
        reference: "B-001",
        accountKey: ACCOUNT_B,
        quantity: 1,
        price: 120.40
      })
    ],
    fileName: "account-b.csv",
    source: "001G2A_TEST"
  });

  let coachHistory = loadCoachTradeHistory();

  assert.equal(
    coachHistory.length,
    2,
    "initial Coach G history must contain A-old and B exactly once"
  );

  assert.deepEqual(
    new Set(
      coachHistory.map(
        (row) => row.brokerAccountKey
      )
    ),
    new Set([ACCOUNT_A, ACCOUNT_B])
  );

  console.log(
    "PASS — Coach G sees verified executions from A and B with account provenance."
  );

  console.log("TEST 2 — append new A execution without double-learning A-old");

  await saveBrokerTransactionHistoryEvidence({
    brokerAccountKey: ACCOUNT_A,
    verified: [
      execution({
        reference: "A-NEW",
        accountKey: ACCOUNT_A,
        side: "SELL",
        quantity: 20,
        price: 130
      })
    ],
    fileName: "account-a-replacement.csv",
    source: "001G2A_TEST"
  });

  coachHistory = loadCoachTradeHistory();

  assert.equal(
    coachHistory.filter(
      (row) => row.brokerReference === "A-OLD"
    ).length,
    1,
    "A-old must remain after append-only account upload"
  );

  assert.equal(
    coachHistory.filter(
      (row) => row.brokerReference === "A-NEW"
    ).length,
    1,
    "A-new must appear exactly once"
  );

  assert.equal(
    coachHistory.filter(
      (row) => row.brokerReference === "B-001"
    ).length,
    1,
    "B must survive append to A"
  );

  assert.equal(
    coachHistory.length,
    3,
    "append-only Coach G history must contain A-old, A-new, and B"
  );

  console.log(
    "PASS — appending A preserves A-old, adds A-new exactly once, and preserves B."
  );

  console.log("TEST 3 — rejected execution cannot enter Coach G");

  await saveBrokerTransactionHistoryEvidence({
    brokerAccountKey: ACCOUNT_A,
    verified: [
      execution({
        reference: "A-NEW",
        accountKey: ACCOUNT_A,
        side: "SELL",
        quantity: 20,
        price: 130
      }),
      execution({
        reference: "A-REJECTED",
        accountKey: ACCOUNT_A,
        quantity: 999,
        price: 1,
        status: "REJECTED"
      })
    ],
    fileName: "account-a-filter-test.csv",
    source: "001G2A_TEST"
  });

  coachHistory = loadCoachTradeHistory();

  assert.equal(
    coachHistory.some(
      (row) =>
        row.brokerReference === "A-REJECTED"
    ),
    false
  );

  assert.equal(
    coachHistory.some(
      (row) =>
        row.brokerReference === "A-NEW"
    ),
    true
  );

  assert.equal(
    coachHistory.some(
      (row) =>
        row.brokerReference === "B-001"
    ),
    true
  );

  console.log(
    "PASS — rejected broker execution is excluded from Coach G REAL behavior."
  );

  console.log("TEST 4 — unverified evidence cannot enter Coach G");

  await saveBrokerTransactionHistoryEvidence({
    brokerAccountKey: ACCOUNT_A,
    verified: [
      execution({
        reference: "A-NEW",
        accountKey: ACCOUNT_A,
        side: "SELL",
        quantity: 20,
        price: 130
      })
    ],
    unverified: [
      {
        brokerAccountKey: ACCOUNT_A,
        brokerReference: "A-MANUAL",
        broker: "ABC",
        symbol: "PORT",
        side: "BUY",
        quantity: 50,
        price: 125,
        executionDate: "2026-10-15",
        status: "FILLED"
      }
    ],
    fileName: "account-a-unverified-test.csv",
    source: "001G2A_TEST"
  });

  coachHistory = loadCoachTradeHistory();

  assert.equal(
    coachHistory.some(
      (row) =>
        row.brokerReference === "A-MANUAL"
    ),
    false
  );

  assert.equal(
    coachHistory.length,
    3,
    "unverified evidence must not alter the three verified append-only executions"
  );

  console.log(
    "PASS — unverified/manual evidence is absent from Coach G REAL behavior."
  );

  console.log("TEST 5 — final provenance remains A-new + B");

  const finalByReference = new Map(
    coachHistory.map(
      (row) => [row.brokerReference, row]
    )
  );

  assert.equal(
    finalByReference.get("A-NEW")?.brokerAccountKey,
    ACCOUNT_A
  );

  assert.equal(
    finalByReference.get("B-001")?.brokerAccountKey,
    ACCOUNT_B
  );

  console.log(
    "PASS — final Coach G history retains broker-account provenance."
  );

  console.log(
    "===== PC-POSTPROD-UAT-001G2A RUNTIME PASS ====="
  );
} finally {
  __resetBrokerTransactionHistoryStorageLoaderForTests();
}
