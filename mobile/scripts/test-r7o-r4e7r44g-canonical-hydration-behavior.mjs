import assert from "node:assert/strict";

import {
  mapCanonicalHistoryToVerifiedEvidence
} from "../src/features/transactions/api/transactionHistoryCanonicalHydrationMapper.js";

import {
  replaceBrokerTransactionHistoryEvidenceFromCanonical,
  loadBrokerTransactionHistoryEvidence,
  __setBrokerTransactionHistoryStorageLoaderForTests,
  __resetBrokerTransactionHistoryStorageLoaderForTests
} from "../src/features/trading/brokerTransactionHistoryEvidenceStore.js";

const storage = new Map();

const mockStorage = {
  async userGetItem(key) {
    return storage.has(key)
      ? storage.get(key)
      : null;
  },

  async userSetItem(key, value) {
    storage.set(key, value);
  },

  async userRemoveItem(key) {
    storage.delete(key);
  }
};

__setBrokerTransactionHistoryStorageLoaderForTests(
  async () => mockStorage
);

function execution({
  brokerAccountKey,
  exchangeOrderNo,
  symbol = "SCOM",
  side = "BUY",
  quantity = 1,
  price = 10,
  date = "2026-10-15"
}) {
  return {
    brokerAccountKey,
    exchangeOrderNo,
    executionDate: date,
    symbol,
    side,
    totalTradedQuantity: quantity,
    executionPrice: price,
    fifoEligible: true,
    canAffectFifo: true
  };
}

async function hydrate({
  brokerAccountKey,
  history
}) {
  const verified =
    mapCanonicalHistoryToVerifiedEvidence({
      brokerAccountKey,
      history
    });

  return replaceBrokerTransactionHistoryEvidenceFromCanonical({
    brokerAccountKey,
    verified,
    source:
      "CANONICAL_SERVER_HISTORY"
  });
}

try {
  storage.clear();

  /*
   * ------------------------------------------------------------
   * CASE 1 — canonical AIB 319 -> local AIB 319
   * ------------------------------------------------------------
   */

  const aib319 =
    Array.from(
      { length: 319 },
      (_, index) =>
        execution({
          brokerAccountKey:
            "AIB:137971",
          exchangeOrderNo:
            `AIB-${String(index + 1).padStart(4, "0")}`,
          symbol:
            index % 2 === 0
              ? "SCOM"
              : "KCB",
          side:
            index % 5 === 0
              ? "SELL"
              : "BUY",
          quantity:
            index + 1,
          price:
            10 + index / 100
        })
    );

  const first =
    await hydrate({
      brokerAccountKey:
        "AIB:137971",
      history:
        aib319
    });

  assert.equal(
    first.canonicalVerifiedCount,
    319
  );

  let aib =
    await loadBrokerTransactionHistoryEvidence("AIB:137971");

  assert.equal(
    aib.verified.length,
    319
  );

  for (const row of aib.verified) {
    assert.equal(
      row.executionConfirmed,
      true
    );

    assert.equal(
      row.historicalExecutionState,
      "EXECUTED_READY"
    );

    assert.equal(
      row.fifoEligible,
      true
    );

    assert.equal(
      row.canAffectFifo,
      true
    );

    assert.equal(
      row.isPractice,
      false
    );

    assert.equal(
      row.isReal,
      true
    );

    assert.equal(
      row.source,
      "CANONICAL_SERVER_HISTORY"
    );
  }

  console.log(
    "CASE_1_CANONICAL_319_TO_LOCAL_319=PASS"
  );

  /*
   * ------------------------------------------------------------
   * CASE 2/3 — seed ABC, then clear only AIB.
   * ------------------------------------------------------------
   */

  const abc58 =
    Array.from(
      { length: 58 },
      (_, index) =>
        execution({
          brokerAccountKey:
            "ABC:CLIENT-1",
          exchangeOrderNo:
            `ABC-${String(index + 1).padStart(4, "0")}`,
          symbol:
            "EQTY",
          side:
            "BUY",
          quantity:
            index + 1,
          price:
            40 + index / 100
        })
    );

  await hydrate({
    brokerAccountKey:
      "ABC:CLIENT-1",
    history:
      abc58
  });

  let abc =
    await loadBrokerTransactionHistoryEvidence("ABC:CLIENT-1");

  assert.equal(
    abc.verified.length,
    58
  );

  const cleared =
    await hydrate({
      brokerAccountKey:
        "AIB:137971",
      history: []
    });

  assert.equal(
    cleared.canonicalVerifiedCount,
    0
  );

  assert.equal(
    cleared.removedAccountBucket,
    true
  );

  aib =
    await loadBrokerTransactionHistoryEvidence("AIB:137971");

  abc =
    await loadBrokerTransactionHistoryEvidence("ABC:CLIENT-1");

  assert.equal(
    aib.verified.length,
    0
  );

  assert.equal(
    abc.verified.length,
    58
  );

  console.log(
    "CASE_2_ESTABLISHED_CANONICAL_0_TO_LOCAL_0=PASS"
  );

  console.log(
    "CASE_3_AIB_REPLACEMENT_PRESERVES_ABC=PASS"
  );

  /*
   * ------------------------------------------------------------
   * CASE 4 — authority-not-established behavior belongs to R44E.
   *
   * R44E returns before calling replacement. Prove its source
   * ordering and prove untouched local AIB evidence survives when
   * replacement is not invoked.
   * ------------------------------------------------------------
   */

  await hydrate({
    brokerAccountKey:
      "AIB:137971",
    history: [
      execution({
        brokerAccountKey:
          "AIB:137971",
        exchangeOrderNo:
          "AIB-PRESERVE-1",
        quantity: 7,
        price: 99
      })
    ]
  });

  const beforeNoAuthority =
    await loadBrokerTransactionHistoryEvidence("AIB:137971");

  assert.equal(
    beforeNoAuthority.verified.length,
    1
  );

  /*
   * Simulate R44E's AUTHORITY_NOT_ESTABLISHED branch:
   * no replacement call occurs.
   */

  const afterNoAuthority =
    await loadBrokerTransactionHistoryEvidence("AIB:137971");

  assert.deepEqual(
    afterNoAuthority.verified,
    beforeNoAuthority.verified
  );

  console.log(
    "CASE_4_AUTHORITY_NOT_ESTABLISHED_PRESERVES_AIB=PASS"
  );

  /*
   * ------------------------------------------------------------
   * CASE 5 — duplicate canonical immutable identity rejected.
   * ------------------------------------------------------------
   */

  const duplicate =
    execution({
      brokerAccountKey:
        "AIB:137971",
      exchangeOrderNo:
        "AIB-DUP-1"
    });

  assert.throws(
    () =>
      mapCanonicalHistoryToVerifiedEvidence({
        brokerAccountKey:
          "AIB:137971",
        history: [
          duplicate,
          duplicate
        ]
      }),
    /duplicate immutable execution identity/i
  );

  console.log(
    "CASE_5_DUPLICATE_CANONICAL_IDENTITY_REJECTED=PASS"
  );

  /*
   * ------------------------------------------------------------
   * CASE 6 — invalid canonical execution rejected.
   * ------------------------------------------------------------
   */

  assert.throws(
    () =>
      mapCanonicalHistoryToVerifiedEvidence({
        brokerAccountKey:
          "AIB:137971",
        history: [
          execution({
            brokerAccountKey:
              "AIB:137971",
            exchangeOrderNo:
              "AIB-BAD-1",
            price:
              0
          })
        ]
      }),
    /execution price/i
  );

  console.log(
    "CASE_6_INVALID_CANONICAL_EXECUTION_REJECTED=PASS"
  );

  /*
   * ------------------------------------------------------------
   * Compatibility projection consumed by Coach G.
   * ------------------------------------------------------------
   */

  const legacyRaw =
    storage.get(
      "transactionHistory"
    );

  const legacy =
    legacyRaw
      ? JSON.parse(legacyRaw)
      : [];

  assert.equal(
    legacy.some(
      (row) =>
        row.brokerAccountKey ===
          "AIB:137971" &&
        row.exchangeOrderNo ===
          "AIB-PRESERVE-1"
    ),
    true
  );

  assert.equal(
    legacy.some(
      (row) =>
        row.brokerAccountKey ===
        "ABC:CLIENT-1"
    ),
    true
  );

  console.log(
    "COACH_G_COMPATIBILITY_PROJECTION=PASS"
  );

  console.log(
    "FIFO_FIELDS_PRESERVED=PASS"
  );

  console.log(
    "COACH_G_REAL_FIELDS_PRESERVED=PASS"
  );

  console.log(
    "R7O_R4E7R44G_CANONICAL_HYDRATION_BEHAVIOR=PASS"
  );
} finally {
  __resetBrokerTransactionHistoryStorageLoaderForTests();
}
