import assert from "node:assert/strict";

import {
  buildAccountAwareFifoLedger
} from "../src/features/trading/accountAwareFifoLedgerService.js";

function tx({
  account,
  reference,
  side = "BUY",
  quantity,
  price,
  date
}) {
  return {
    brokerAccountKey: account,
    brokerReference: reference,
    symbol: "SCOM",
    side,
    quantity,
    price,
    executionPrice: price,
    executionDate: date,
    status: "FILLED",
    verified: true,
    canonicalEligible: true
  };
}

const A = "AIB|ACCOUNT-A";
const B = "ABC|ACCOUNT-B";

console.log(
  "===== FIFO-R4 ACCOUNT-AWARE REGRESSION ====="
);

console.log(
  "TEST 1 — two accounts reconcile independently"
);

const combinedHolding = {
  symbol: "SCOM",
  quantity: 150,
  averagePrice: 34,
  broker: "MULTI_BROKER",
  brokerAccountKey: null,
  brokerAccounts: [A, B],
  sourceAccountCount: 2,
  sourceRows: [
    {
      symbol: "SCOM",
      brokerAccountKey: A,
      broker: A,
      quantity: 100,
      averagePrice: 30
    },
    {
      symbol: "SCOM",
      brokerAccountKey: B,
      broker: B,
      quantity: 50,
      averagePrice: 42
    }
  ]
};

const transactions = [
  tx({
    account: A,
    reference: "A-1",
    quantity: 100,
    price: 30,
    date: "2026-01-02"
  }),
  tx({
    account: B,
    reference: "B-1",
    quantity: 50,
    price: 42,
    date: "2026-01-01"
  })
];

const ledger =
  buildAccountAwareFifoLedger({
    holding: combinedHolding,
    transactions,
    symbol: "SCOM"
  });

assert.equal(ledger.available, true);
assert.equal(ledger.accountAware, true);
assert.equal(ledger.accountLedgers.length, 2);
assert.equal(ledger.reconstructedQuantity, 150);
assert.equal(ledger.openLots.length, 2);

assert.deepEqual(
  ledger.openLots.map(
    (lot) => lot.brokerAccountKey
  ),
  [B, A],
  "combined presentation must retain account provenance and chronological order"
);

console.log(
  "PASS — A and B reconcile independently and combine safely."
);

console.log(
  "TEST 2 — one incomplete account fails closed"
);

const incomplete =
  buildAccountAwareFifoLedger({
    holding: combinedHolding,
    transactions: transactions.filter(
      (row) =>
        row.brokerAccountKey === A
    ),
    symbol: "SCOM"
  });

assert.equal(incomplete.available, false);

assert.ok(
  String(incomplete.status || "").length > 0
);

console.log(
  "PASS — missing B evidence does not fabricate combined FIFO."
);

console.log(
  "TEST 3 — rejected execution cannot satisfy account reconciliation"
);

const rejected =
  buildAccountAwareFifoLedger({
    holding: combinedHolding,
    transactions: [
      transactions[0],
      tx({
        account: B,
        reference: "B-REJECTED",
        quantity: 50,
        price: 42,
        date: "2026-01-01"
      })
    ].map((row) =>
      row.brokerReference === "B-REJECTED"
        ? {
            ...row,
            status: "REJECTED"
          }
        : row
    ),
    symbol: "SCOM"
  });

assert.equal(rejected.available, false);

console.log(
  "PASS — rejected execution remains excluded."
);

console.log(
  "TEST 4 — single-account compatibility"
);

const single =
  buildAccountAwareFifoLedger({
    holding: {
      symbol: "SCOM",
      brokerAccountKey: A,
      broker: A,
      quantity: 100,
      averagePrice: 30,
      sourceRows: [
        {
          symbol: "SCOM",
          brokerAccountKey: A,
          broker: A,
          quantity: 100,
          averagePrice: 30
        }
      ]
    },
    transactions,
    symbol: "SCOM"
  });

assert.equal(single.available, true);
assert.equal(single.reconstructedQuantity, 100);

console.log(
  "PASS — single-account FIFO remains compatible."
);

console.log(
  "===== FIFO-R4 ACCOUNT-AWARE PASS ====="
);
