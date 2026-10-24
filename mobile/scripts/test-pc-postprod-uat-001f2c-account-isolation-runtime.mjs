import assert from "node:assert/strict";

import {
  __setBrokerTransactionHistoryStorageLoaderForTests,
  __resetBrokerTransactionHistoryStorageLoaderForTests,
  loadBrokerTransactionHistoryEvidence,
  loadCombinedBrokerTransactionHistoryEvidence,
  saveBrokerTransactionHistoryEvidence
} from "../src/features/trading/brokerTransactionHistoryEvidenceStore.js";

const storage = new Map();

const userGetItem = async (key) =>
  storage.has(key)
    ? storage.get(key)
    : null;

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

function fill({
  fillReference,
  exchangeOrderNo = fillReference,
  symbol = "PORT",
  quantity = 1,
  price = 120,
  date = "2026-10-15"
}) {
  return {
    fillReference,
    exchangeOrderNo,
    totalTradedQuantity: quantity,
    symbol,
    side: "BUY",
    quantity,
    price,
    date,
    executionDate: date,
    status: "FILLED"
  };
}

try {
  // ----------------------------------------------------------
  // Legacy evidence exists before account-scoped migration.
  // ----------------------------------------------------------

  await userSetItem(
    "transactionHistory",
    JSON.stringify([
      fill({
        fillReference: "LEGACY-001",
        symbol: "KCB",
        quantity: 5,
        price: 40
      })
    ])
  );

  await userSetItem(
    "unverifiedTransactionHistory",
    JSON.stringify([])
  );

  // ----------------------------------------------------------
  // Save account A.
  // Duplicate FILL-001 within A must collapse in combined view.
  // ----------------------------------------------------------

  await saveBrokerTransactionHistoryEvidence({
    brokerAccountKey: ACCOUNT_A,
    verified: [
      fill({
        fillReference: "FILL-001",
        quantity: 120,
        price: 121.47
      }),
      fill({
        fillReference: "FILL-001",
        quantity: 120,
        price: 121.47
      })
    ],
    fileName: "account-a.csv",
    source: "001F2C_TEST"
  });

  let accountA =
    await loadBrokerTransactionHistoryEvidence(ACCOUNT_A);

  assert.equal(accountA.ready, true);
  assert.equal(
    accountA.verified.length,
    1,
    "same Exchange Order identity must be stored only once"
  );

  let combined =
    await loadCombinedBrokerTransactionHistoryEvidence();

  assert.equal(
    combined.verified.filter(
      (row) =>
        row.brokerAccountKey === ACCOUNT_A &&
        row.fillReference === "FILL-001"
    ).length,
    1,
    "same-account duplicate must dedupe in combined evidence"
  );

  assert.equal(
    combined.legacyVerifiedCount,
    1,
    "legacy unscoped evidence must survive A save"
  );

  // ----------------------------------------------------------
  // Save B with the SAME broker fill identity.
  // Cross-account fill identities must remain independent.
  // ----------------------------------------------------------

  await saveBrokerTransactionHistoryEvidence({
    brokerAccountKey: ACCOUNT_B,
    verified: [
      fill({
        fillReference: "FILL-001",
        quantity: 1,
        price: 120.40
      })
    ],
    fileName: "account-b.csv",
    source: "001F2C_TEST"
  });

  accountA =
    await loadBrokerTransactionHistoryEvidence(ACCOUNT_A);

  let accountB =
    await loadBrokerTransactionHistoryEvidence(ACCOUNT_B);

  assert.equal(
    accountA.verified.length,
    1,
    "saving B must preserve deduplicated A history"
  );

  assert.equal(accountB.verified.length, 1);

  combined =
    await loadCombinedBrokerTransactionHistoryEvidence();

  const crossAccountSameFill =
    combined.verified.filter(
      (row) => row.fillReference === "FILL-001"
    );

  assert.equal(
    crossAccountSameFill.length,
    2,
    "same fill identity in A and B must survive as two executions"
  );

  assert.deepEqual(
    new Set(
      crossAccountSameFill.map(
        (row) => row.brokerAccountKey
      )
    ),
    new Set([ACCOUNT_A, ACCOUNT_B])
  );

  assert.equal(
    combined.accountKeys.length,
    2,
    "registry must contain A and B"
  );

  // ----------------------------------------------------------
  // Append one new execution to A.
  // Existing A history and B must remain exactly intact.
  // ----------------------------------------------------------

  await saveBrokerTransactionHistoryEvidence({
    brokerAccountKey: ACCOUNT_A,
    verified: [
      fill({
        fillReference: "FILL-002",
        quantity: 120,
        price: 122.00
      })
    ],
    fileName: "account-a-append.csv",
    source: "001F2C_TEST"
  });

  accountA =
    await loadBrokerTransactionHistoryEvidence(ACCOUNT_A);

  accountB =
    await loadBrokerTransactionHistoryEvidence(ACCOUNT_B);

  assert.equal(
    accountA.verified.length,
    2,
    "append to A must preserve FILL-001 and add FILL-002"
  );
  assert.deepEqual(
    new Set(
      accountA.verified.map(
        (row) => row.fillReference
      )
    ),
    new Set([
      "FILL-001",
      "FILL-002"
    ]),
    "append-only A history must preserve FILL-001 and add FILL-002"
  );

  assert.equal(
    accountB.verified.length,
    1,
    "appending A must not remove B"
  );

  assert.equal(
    accountB.verified[0].fillReference,
    "FILL-001"
  );

  combined =
    await loadCombinedBrokerTransactionHistoryEvidence();

  assert.equal(combined.accountKeys.length, 2);

  assert.equal(
    combined.verified.filter(
      (row) =>
        row.brokerAccountKey === ACCOUNT_A &&
        row.fillReference === "FILL-002"
    ).length,
    1
  );

  assert.equal(
    combined.verified.filter(
      (row) =>
        row.brokerAccountKey === ACCOUNT_B &&
        row.fillReference === "FILL-001"
    ).length,
    1
  );

  assert.equal(
    combined.verified.filter(
      (row) =>
        row.brokerAccountKey === ACCOUNT_A &&
        row.fillReference === "FILL-001"
    ).length,
    1,
    "old A evidence must remain after append-only upload"
  );

  const legacy =
    combined.verified.filter(
      (row) => !row.brokerAccountKey
    );

  assert.equal(
    legacy.length,
    1,
    "legacy evidence must remain explicitly unscoped"
  );

  assert.equal(
    legacy[0].fillReference,
    "LEGACY-001"
  );

  // ----------------------------------------------------------
  // Compatibility projection must contain A1 + A2 + B1 + legacy.
  // ----------------------------------------------------------

  const projected = JSON.parse(
    storage.get("transactionHistory")
  );

  assert.equal(projected.length, 4);

  assert.equal(
    projected.filter(
      (row) =>
        row.brokerAccountKey === ACCOUNT_A &&
        row.fillReference === "FILL-002"
    ).length,
    1
  );

  assert.equal(
    projected.filter(
      (row) =>
        row.brokerAccountKey === ACCOUNT_A &&
        row.fillReference === "FILL-001"
    ).length,
    1,
    "compatibility projection must preserve prior A execution"
  );

  assert.equal(
    projected.filter(
      (row) =>
        row.brokerAccountKey === ACCOUNT_B &&
        row.fillReference === "FILL-001"
    ).length,
    1
  );

  assert.equal(
    projected.filter(
      (row) =>
        !row.brokerAccountKey &&
        row.fillReference === "LEGACY-001"
    ).length,
    1
  );

  console.log(
    "PASS — save A then B preserves both broker-account buckets."
  );
  console.log(
    "PASS — same fill identity survives independently across A and B."
  );
  console.log(
    "PASS — same-account duplicate collapses in combined evidence."
  );
  console.log(
    "PASS — appending A preserves both prior A evidence and B."
  );
  console.log(
    "PASS — legacy evidence remains explicitly unscoped."
  );
  console.log(
    "PASS — compatibility projection contains A history + B + legacy."
  );
} finally {
  __resetBrokerTransactionHistoryStorageLoaderForTests();
}
