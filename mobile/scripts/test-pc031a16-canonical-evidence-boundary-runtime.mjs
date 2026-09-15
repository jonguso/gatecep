import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  normalizeCanonicalTradeEvents,
  buildCanonicalSecurityLedger,
  deriveTradeCashEvents
} from "../src/features/trading/canonicalPortfolioLedgerService.js";

function verifiedTrade(overrides = {}) {
  return {
    brokerReference: "ABC-A16-B1",
    broker: "ABC Capital",
    executionDate: "2026-09-14",
    settlementDate: "2026-09-16",
    settlementStatus: "SETTLED",
    symbol: "SCOM",
    side: "BUY",
    quantity: 100,
    price: 25,
    totalFees: 25,
    status: "FILLED",
    evidenceStatus:
      "VERIFIED_BROKER_EXECUTION",
    canAffectRealPortfolio: true,
    ...overrides
  };
}

// 1. Explicitly verified completed evidence qualifies.
{
  const rows =
    normalizeCanonicalTradeEvents([
      verifiedTrade()
    ]);

  assert.equal(rows.length, 1);
  assert.equal(
    rows[0].brokerReference,
    "ABC-A16-B1"
  );
  assert.equal(
    rows[0].canAffectRealPortfolio,
    true
  );

  console.log(
    "PASS: explicitly verified completed broker evidence enters the canonical ledger."
  );
}

// 2. Explicitly unverified evidence cannot qualify.
{
  const rows =
    normalizeCanonicalTradeEvents([
      verifiedTrade({
        brokerReference: "ABC-A16-U1",
        canAffectRealPortfolio: false,
        evidenceStatus: "UNVERIFIED"
      })
    ]);

  assert.equal(rows.length, 0);

  console.log(
    "PASS: canAffectRealPortfolio=false cannot enter canonical REAL accounting."
  );
}

// 3. Missing REAL-portfolio authorization fails closed.
{
  const row = verifiedTrade({
    brokerReference: "ABC-A16-MISSING"
  });

  delete row.canAffectRealPortfolio;

  const rows =
    normalizeCanonicalTradeEvents([
      row
    ]);

  assert.equal(rows.length, 0);

  console.log(
    "PASS: missing canAffectRealPortfolio authorization fails closed."
  );
}

// 4. OMS FILLED state alone is not broker evidence.
{
  const omsOnly = {
    id: "ORDER-A16-OMS",
    executionMode: "REAL",
    status: "FILLED",
    brokerStatus: "FILLED",
    brokerOrderId: "ABC-OMS-ONLY",
    symbol: "SCOM",
    side: "BUY",
    quantity: 100,
    price: 25,
    executionDate: "2026-09-14"
  };

  const rows =
    normalizeCanonicalTradeEvents([
      omsOnly
    ]);

  assert.equal(rows.length, 0);

  assert.equal(
    deriveTradeCashEvents([
      omsOnly
    ]).length,
    0
  );

  console.log(
    "PASS: OMS FILLED state alone cannot create canonical security or cash effects."
  );
}

// 5. Non-executed broker evidence remains excluded,
// even if a bad caller marks the REAL flag true.
for (
  const status of [
    "REJECTED",
    "REFUSED",
    "CANCELLED",
    "CANCELED",
    "EXPIRED"
  ]
) {
  const rows =
    normalizeCanonicalTradeEvents([
      verifiedTrade({
        brokerReference:
          `ABC-A16-${status}`,
        status,
        canAffectRealPortfolio: true
      })
    ]);

  assert.equal(
    rows.length,
    0,
    `${status} must not qualify`
  );
}

console.log(
  "PASS: rejected/refused/cancelled/expired orders cannot create canonical effects."
);

// 6. Verified BUY creates a lot and verified SELL
// consumes it through the historical FIFO path.
{
  const transactions = [
    verifiedTrade({
      brokerReference: "ABC-A16-BUY",
      quantity: 100,
      price: 25
    }),
    verifiedTrade({
      brokerReference: "ABC-A16-SELL",
      side: "SELL",
      quantity: 40,
      price: 30,
      totalFees: 20,
      executionDate: "2026-09-15",
      status: "SETTLED"
    })
  ];

  const ledger =
    buildCanonicalSecurityLedger({
      transactions,
      holdings: [
        {
          symbol: "SCOM",
          quantity: 60,
          averagePrice: 25.25
        }
      ]
    });

  assert.equal(
    ledger.events.length,
    2
  );

  assert.equal(
    ledger.securities.length,
    1
  );

  assert.equal(
    ledger.securities[0]
      .reconstructedQuantity,
    60
  );

  assert.equal(
    ledger.securities[0]
      .historicalSales.length,
    1
  );

  assert.equal(
    ledger.securities[0]
      .historicalSales[0]
      .consumedLots[0]
      .quantity,
    40
  );

  console.log(
    "PASS: genuine verified SELL evidence consumes genuine verified acquisition lots FIFO."
  );
}

// 7. Duplicate evidence cannot double-apply.
{
  const row = verifiedTrade({
    brokerReference:
      "ABC-A16-DEDUPE"
  });

  const ledger =
    buildCanonicalSecurityLedger({
      transactions: [
        row,
        { ...row }
      ],
      holdings: [
        {
          symbol: "SCOM",
          quantity: 100,
          averagePrice: 25.25
        }
      ]
    });

  assert.equal(
    ledger.events.length,
    1
  );

  assert.equal(
    ledger.securities[0]
      .reconstructedQuantity,
    100
  );

  console.log(
    "PASS: duplicate broker evidence cannot double-apply to the canonical ledger."
  );
}

// 8. Pure canonical derivation is deterministic/idempotent.
{
  const transactions = [
    verifiedTrade()
  ];

  const holdings = [
    {
      symbol: "SCOM",
      quantity: 100,
      averagePrice: 25.25
    }
  ];

  const first =
    buildCanonicalSecurityLedger({
      transactions,
      holdings
    });

  const second =
    buildCanonicalSecurityLedger({
      transactions,
      holdings
    });

  assert.deepEqual(
    second,
    first
  );

  console.log(
    "PASS: rebuilding from identical verified evidence is deterministic and idempotent."
  );
}

// 9. Recovery layers remain outside portfolio mutation.
{
  const read = (path) =>
    readFile(
      new URL(
        `../${path}`,
        import.meta.url
      ),
      "utf8"
    );

  const files =
    await Promise.all([
      read(
        "src/features/broker-sync/" +
        "realOrderExecutionEvidenceMatchCore.js"
      ),
      read(
        "src/features/broker-sync/" +
        "realOrderExecutionRecoveryTransitionCore.js"
      ),
      read(
        "src/features/broker-sync/" +
        "realOrderExecutionEvidenceReconciliationService.js"
      )
    ]);

  const forbidden =
    /saveCanonical|refreshCanonical|availableCash|cashLedger|lotLedger|portfolioLedger|placeBrokerOrder|routeExecutionOrderByMode|markExecutionOrderFilled/;

  for (const source of files) {
    assert.doesNotMatch(
      source,
      forbidden
    );
  }

  console.log(
    "PASS: A13-A15 recovery layers have no direct REAL portfolio, cash, lot, or broker-routing mutation path."
  );
}

console.log("");
console.log(
  "PC-031A16 canonical evidence boundary runtime tests PASSED."
);
