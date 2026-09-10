import assert from "node:assert/strict";
import { buildTransactionLedgerReconciliation } from "../src/features/trading/transactionLedgerReconciliationService.js";

const base = [
  { symbol:"JUB", side:"BUY", quantity:100, price:250, date:"2026-01-10", status:"FILLED", brokerReference:"J1" },
  { symbol:"JUB", side:"BUY", quantity:60, price:270, date:"2026-02-10", status:"FULLY TRADED", brokerReference:"J2" },
  { symbol:"JUB", side:"SELL", quantity:10, price:286, date:"2026-03-10", status:"UNKNOWN", brokerReference:"J3" }
];
const holdings = [{ symbol:"JUB", quantity:150, averagePrice:271.04, sector:"Insurance" }];

const gap = buildTransactionLedgerReconciliation({ verified: base.slice(0,2), unverified: [base[2]], holdings });
const jub = gap.securities.find((row) => row.symbol === "JUB");
assert.equal(jub.ledgerQuantity, 160);
assert.equal(jub.brokerQuantity, 150);
assert.equal(jub.difference, 10);
assert.equal(jub.status, "NOT_RECONCILED");
const excludedSale = jub.rows.find((row) => row.brokerReference === "J3");
assert.equal(excludedSale.fifoIncluded, false);
assert.ok(excludedSale.exclusionReasons.includes("COMPLETED_EXECUTION_STATUS_REQUIRED"));
console.log("PASS: mismatch remains visible and excluded SELL evidence explains why FIFO closes at 160 instead of broker 150.");

const fixed = buildTransactionLedgerReconciliation({ verified: [...base.slice(0,2), { ...base[2], status:"SETTLED" }], holdings });
const fixedJub = fixed.securities.find((row) => row.symbol === "JUB");
assert.equal(fixedJub.ledgerQuantity, 150);
assert.equal(fixedJub.status, "RECONCILED");
console.log("PASS: verified completed SELL evidence reconciles JUB to the broker quantity without adjustment shares.");

const duplicate = buildTransactionLedgerReconciliation({ verified: [base[0], base[0], base[1]], holdings:[{ symbol:"JUB", quantity:160 }] });
const duplicateJub = duplicate.securities[0];
assert.equal(duplicateJub.ledgerQuantity, 160);
assert.ok(duplicateJub.rows.some((row) => row.exclusionReasons.includes("DUPLICATE_EVIDENCE")));
console.log("PASS: duplicate evidence is exposed but not double-counted in the analytical ledger.");

assert.equal(gap.mutatesRealPortfolio, false);
assert.equal(gap.mutatesPracticePortfolio, false);
assert.equal(gap.readOnly, true);
console.log("PASS: reconciliation report remains read-only and cannot mutate REAL or Practice portfolios.");
