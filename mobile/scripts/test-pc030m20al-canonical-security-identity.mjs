import assert from "node:assert/strict";
import { canonicalSecuritySymbol, canonicalizeSecuritySymbol, assertNoSecurityAliasCollisions } from "../src/features/trading/securityIdentityService.js";
import { buildMonthlyPositionRegister, buildHistoricalOwnershipChain, buildMonthlyPositionStatement } from "../src/features/trading/monthlyPositionRegisterService.js";
import { buildTransactionLedgerReconciliation } from "../src/features/trading/transactionLedgerReconciliationService.js";

assert.equal(canonicalSecuritySymbol("EQT"), "EQT");
assert.equal(canonicalSecuritySymbol("EQTY"), "EQT");
assert.equal(canonicalSecuritySymbol("EQTYO0000"), "EQT");
assert.equal(assertNoSecurityAliasCollisions(), true);
console.log("PASS — EQT, EQTY and EQTYO0000 resolve to one collision-safe canonical security identity: EQT.");

const rawAugust = {
  version: "PC-030M20AK",
  statementId: "CDSC-AUG-RAW",
  source: "CDSC_MONTHLY_POSITION_STATEMENT",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  securities: [{
    symbol: "EQTY",
    name: "EQUITY PLC",
    openingBalance: 1500,
    purchases: 300,
    sales: 0,
    calculatedClosingBalance: 1800,
    closingBalance: 1800,
    intraMonthReconciled: true,
    status: "MONTH_RECONCILED",
    rows: [
      { symbol:"EQTY", date:"2026-08-01", type:"OPENING_BALANCE", quantity:0, balance:1500 },
      { symbol:"EQTY", date:"2026-08-06", type:"PURCHASE", quantity:300, balance:1800 },
      { symbol:"EQTY", date:"2026-08-31", type:"CLOSING_BALANCE", quantity:0, balance:1800 }
    ]
  }]
};
const register = buildMonthlyPositionRegister([rawAugust]);
assert.equal(register.latestStatement.securities.length, 1);
assert.equal(register.latestStatement.securities[0].symbol, "EQT");
assert.equal(register.latestStatement.securities[0].closingBalance, 1800);
assert.equal(register.latestStatement.securities[0].rows[0].rawSymbol, "EQTY");
console.log("PASS — already-imported CDSC history is normalized analytically in place; raw EQTY evidence is preserved and no re-upload is required.");

const chain = buildHistoricalOwnershipChain([rawAugust]);
assert.equal(chain.securities.find((s)=>s.symbol === "EQT")?.latestClosingQuantity, 1800);
assert.equal(chain.securities.some((s)=>s.symbol === "EQTY"), false);
console.log("PASS — historical CDSC ownership chains collapse EQTY into canonical EQT without duplicating statement evidence.");

const report = buildTransactionLedgerReconciliation({
  verified: [{ symbol:"EQT", side:"BUY", quantity:1750, price:80, status:"FULLY TRADED", executionDate:"2026-08-06", canAffectRealPortfolio:true }],
  holdings: [{ symbol:"EQT", quantity:1750, averagePrice:80 }],
  monthlyPositionStatements:[rawAugust]
});
assert.equal(report.securities.filter((s)=>["EQT","EQTY"].includes(s.symbol)).length, 1);
assert.equal(report.securities.find((s)=>s.symbol === "EQT")?.brokerQuantity, 1750);
const anchor = report.threeWay.securities.find((s)=>s.symbol === "EQT");
assert.equal(anchor.registeredQuantity, 1800);
assert.equal(anchor.brokerQuantity, 1750);
assert.equal(anchor.positionDifference, -50);
assert.equal(anchor.positionStatus, "POSITION_MISMATCH");
console.log("PASS — reconciliation now produces one EQT row: CDSC 1,800 vs broker 1,750 = genuine -50 position difference.");

const fresh = buildMonthlyPositionStatement({periodStart:"2026-09-01",periodEnd:"2026-09-30",rows:[
  {symbol:"EQTYO0000",date:"2026-09-01",type:"Balance Brought Forward",balance:1800},
  {symbol:"EQTYO0000",date:"2026-09-30",type:"Balance Carried Forward",balance:1800}
]});
assert.equal(fresh.securities[0].symbol,"EQT");
assert.equal(fresh.securities[0].rows[0].rawSymbol,"EQTYO0000");
console.log("PASS — future CDSC imports preserve source symbols while emitting canonical EQT for downstream analytics.");

assert.equal(report.readOnly, true);
assert.equal(report.mutatesRealPortfolio, false);
assert.equal(report.mutatesPracticePortfolio, false);
console.log("PASS — symbol normalization is analytical/read-only and cannot mutate REAL or Practice portfolio evidence.");
