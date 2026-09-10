import assert from "node:assert/strict";
import { buildCanonicalSecurityLedger, buildCanonicalCashLedger, deriveTradeCashEvents } from "../src/features/trading/canonicalPortfolioLedgerService.js";
import { normalizeBrokerCashStatementEvents } from "../src/features/trading/cashLedgerEvidenceService.js";

const trades = [
  { brokerReference:"B1", broker:"AIB", executionDate:"2026-01-02", settlementStatus:"SETTLED", symbol:"JUB", side:"BUY", quantity:100, price:100, totalFees:100, status:"FILLED", canAffectRealPortfolio:true },
  { brokerReference:"B2", broker:"AIB", executionDate:"2026-02-02", settlementStatus:"SETTLED", symbol:"JUB", side:"BUY", quantity:100, price:120, totalFees:120, status:"FULLY TRADED", canAffectRealPortfolio:true },
  { brokerReference:"S1", broker:"AIB", executionDate:"2026-03-02", settlementStatus:"SETTLED", symbol:"JUB", side:"SELL", quantity:50, price:150, totalFees:75, status:"COMPLETED", canAffectRealPortfolio:true },
  { brokerReference:"X1", broker:"AIB", executionDate:"2026-03-03", settlementStatus:"", symbol:"JUB", side:"SELL", quantity:999, price:1, totalFees:0, status:"REJECTED", canAffectRealPortfolio:false }
];
const security = buildCanonicalSecurityLedger({ transactions: trades, holdings:[{symbol:"JUB", quantity:150, averagePrice:113.63}] });
assert.equal(security.events.length, 3);
assert.equal(security.securities[0].reconstructedQuantity, 150);
assert.equal(security.securities[0].reconciliation.quantityMatches, true);
console.log("PASS: verified completed executions create the canonical security ledger and reconcile JUB quantity.");

const cashEvents = deriveTradeCashEvents(trades);
const external = normalizeBrokerCashStatementEvents([
  { Date:"2026-01-01", Description:"Opening balance", Balance:"30000" },
  { Date:"2026-01-15", Description:"Withdrawal", Debit:"1000", Balance:"18900" },
  { Date:"2026-02-02", Description:"BUY JUB", Debit:"12120", Balance:"6780" }
], {fileName:"cash.csv", broker:"AIB"});
assert.deepEqual(external.map(e=>e.type), ["OPENING_CASH","WITHDRAWAL"]);
const expected = 30000 - 1000 - 10100 - 12120 + 7500 - 75;
const cash = buildCanonicalCashLedger({ events:[...external, ...cashEvents], brokerAvailableCash:expected });
assert.equal(cash.reconciled, true);
assert.equal(cash.status, "CASH_LEDGER_RECONCILED");
console.log("PASS: opening cash + external cash movements + executed trade cash flows reconcile available cash.");

const gap = buildCanonicalCashLedger({ events:[...external, ...cashEvents], brokerAvailableCash:expected + 500 });
assert.equal(gap.status, "CASH_RECONCILIATION_GAP");
assert.equal(gap.difference, 500);
console.log("PASS: unexplained cash differences surface as reconciliation gaps; no adjustment is fabricated.");

assert.equal(security.securities[0].mutatesRealPortfolio, false);
assert.equal(security.securities[0].mutatesPracticePortfolio, false);
console.log("PASS: canonical derived ledgers remain read-only and simulations cannot mutate REAL or Practice portfolios.");
