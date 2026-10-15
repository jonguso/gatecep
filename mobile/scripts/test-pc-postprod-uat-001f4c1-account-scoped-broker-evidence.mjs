import assert from "node:assert/strict";

import {
  __setBrokerAccountEvidenceStorageLoaderForTests,
  __resetBrokerAccountEvidenceStorageLoaderForTests,
  loadBrokerAccountEvidence,
  loadBrokerAccountEvidenceRegistry,
  saveBrokerAccountEvidence,
  removeBrokerAccountEvidence,
  projectBrokerAccountEvidence
} from "../src/features/broker-sync/brokerAccountEvidenceStore.js";

console.log(
  "===== PC-POSTPROD-UAT-001F4C1 — ACCOUNT-SCOPED BROKER EVIDENCE ====="
);

const values = new Map();

const storage = {
  async userGetItem(key) {
    return values.has(key)
      ? values.get(key)
      : null;
  },

  async userSetItem(key, value) {
    values.set(key, value);
  },

  async userRemoveItem(key) {
    values.delete(key);
  }
};

__setBrokerAccountEvidenceStorageLoaderForTests(
  async () => storage
);

const A = "AIB|ACC-A";
const B = "ABC|ACC-B";
const C = "AIB|ACC-C";

function mirror(
  brokerAccountKey,
  symbol,
  quantity,
  cashBalance = 0,
  cashEvidenceAvailable = false
) {
  return {
    type: "GATECEP_BROKER_MIRROR",
    runtimeMode: "REAL_VERIFIED_UPLOAD",
    source: cashEvidenceAvailable
      ? "BROKER_VALUATION_AND_CASH_UPLOAD"
      : "BROKER_VALUATION_UPLOAD",
    brokerAccountKey,
    brokerAccountId: brokerAccountKey,
    identityStatus: "VERIFIED",
    cdsNumber: "CDS-001",
    holdings: [
      {
        symbol,
        quantity
      }
    ],
    cashBalance,
    cashEvidenceAvailable
  };
}

try {
  console.log("TEST 1 — save valuation for A");

  await saveBrokerAccountEvidence({
    brokerAccountKey: A,
    mirror: mirror(A, "PORT", 120)
  });

  let registry =
    await loadBrokerAccountEvidenceRegistry();

  assert.equal(
    Object.keys(registry).length,
    1
  );

  assert.equal(
    registry[A].holdings[0].quantity,
    120
  );

  console.log("PASS — A stored.");

  console.log("TEST 2 — save valuation + cash for B");

  await saveBrokerAccountEvidence({
    brokerAccountKey: B,
    mirror: mirror(
      B,
      "SCOM",
      50,
      5000,
      true
    )
  });

  registry =
    await loadBrokerAccountEvidenceRegistry();

  assert.equal(
    Object.keys(registry).length,
    2
  );

  assert.equal(
    registry[A].holdings[0].quantity,
    120
  );

  assert.equal(
    registry[B].cashBalance,
    5000
  );

  console.log(
    "PASS — B added without replacing A."
  );

  console.log(
    "TEST 3 — replace A only"
  );

  await saveBrokerAccountEvidence({
    brokerAccountKey: A,
    mirror: mirror(
      A,
      "PORT",
      121,
      396.05,
      true
    )
  });

  registry =
    await loadBrokerAccountEvidenceRegistry();

  assert.equal(
    Object.keys(registry).length,
    2
  );

  assert.equal(
    registry[A].holdings[0].quantity,
    121
  );

  assert.equal(
    registry[A].cashBalance,
    396.05
  );

  assert.equal(
    registry[B].holdings[0].quantity,
    50
  );

  assert.equal(
    registry[B].cashBalance,
    5000
  );

  console.log(
    "PASS — replacing A preserved B."
  );

  console.log(
    "TEST 4 — same broker, different accounts coexist"
  );

  await saveBrokerAccountEvidence({
    brokerAccountKey: C,
    mirror: mirror(
      C,
      "KCB",
      25
    )
  });

  registry =
    await loadBrokerAccountEvidenceRegistry();

  assert.equal(
    Object.keys(registry).length,
    3
  );

  assert.ok(registry[A]);
  assert.ok(registry[B]);
  assert.ok(registry[C]);

  console.log(
    "PASS — same broker distinct accounts coexist."
  );

  console.log(
    "TEST 5 — selected account load is isolated"
  );

  const selectedB =
    await loadBrokerAccountEvidence(B);

  assert.equal(
    selectedB.brokerAccountKey,
    B
  );

  assert.equal(
    selectedB.holdings[0].symbol,
    "SCOM"
  );

  console.log(
    "PASS — selected account returns only its evidence."
  );

  console.log(
    "TEST 6 — compatibility projection follows explicit save"
  );

  let legacy =
    JSON.parse(
      values.get(
        "brokerMirrorPortfolio"
      )
    );

  assert.equal(
    legacy.brokerAccountKey,
    C
  );

  await projectBrokerAccountEvidence(B);

  legacy =
    JSON.parse(
      values.get(
        "brokerMirrorPortfolio"
      )
    );

  assert.equal(
    legacy.brokerAccountKey,
    B
  );

  assert.equal(
    legacy.cashBalance,
    5000
  );

  console.log(
    "PASS — compatibility projection is explicit and account-bound."
  );

  console.log(
    "TEST 7 — deleting A does not remove B/C"
  );

  const removed =
    await removeBrokerAccountEvidence(A);

  assert.equal(
    removed,
    true
  );

  registry =
    await loadBrokerAccountEvidenceRegistry();

  assert.equal(
    registry[A],
    undefined
  );

  assert.ok(registry[B]);
  assert.ok(registry[C]);

  console.log(
    "PASS — account removal preserved other accounts."
  );

  console.log(
    "TEST 8 — mismatched account mirror rejected"
  );

  await assert.rejects(
    () =>
      saveBrokerAccountEvidence({
        brokerAccountKey: A,
        mirror: mirror(
          B,
          "PORT",
          999
        )
      }),
    /does not match/
  );

  console.log(
    "PASS — cross-account evidence rejected."
  );

  console.log(
    "===== PC-POSTPROD-UAT-001F4C1 PASS ====="
  );
} finally {
  __resetBrokerAccountEvidenceStorageLoaderForTests();
}
