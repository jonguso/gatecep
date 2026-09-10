import assert from "node:assert/strict";
import {
  buildMonthlyPositionStatement,
  buildMonthlyPositionRegister,
  buildDateBucketReconciliation,
  buildThreeWayPositionReconciliation
} from "../src/features/trading/monthlyPositionRegisterService.js";

const augustRows = [
  { Symbol:"JUB", Date:"01-AUG-26", Type:"Balance Brought Forward", Balance:0 },
  { Symbol:"JUB", Date:"2026-08-14", Type:"Purchase", Quantity:3, Balance:3 },
  { Symbol:"JUB", Date:"2026-08-14", Type:"Purchase", Quantity:42, Balance:45 },
  { Symbol:"JUB", Date:"2026-08-14", Type:"Purchase", Quantity:25, Balance:70 },
  { Symbol:"JUB", Date:"2026-08-19", Type:"Purchase", Quantity:3, Balance:73 },
  { Symbol:"JUB", Date:"2026-08-19", Type:"Purchase", Quantity:77, Balance:150 },
  { Symbol:"JUB", Date:"31-AUG-26", Type:"Balance Carried Forward", Balance:150 }
];

const august = buildMonthlyPositionStatement({ accountNumber:"TEST-CDS", periodStart:"01-AUG-26", periodEnd:"31-AUG-26", rows:augustRows });
const jub = august.securities.find(x=>x.symbol==="JUB");
assert.equal(august.periodStart, "2026-08-01");
assert.equal(august.periodEnd, "2026-08-31");
assert.equal(jub.openingBalance, 0);
assert.equal(jub.purchases, 150);
assert.equal(jub.closingBalance, 150);
assert.equal(jub.intraMonthReconciled, true);
console.log("PASS — CDSC opening balance + settled purchases/sales reconciles to the month-end closing balance.");

const brokerTransactions = [
  { symbol:"JUB", side:"BUY", quantity:45, price:270, settlementDate:"2026-08-14", status:"FILLED" },
  { symbol:"JUB", side:"BUY", quantity:25, price:271, settlementDate:"2026-08-14", status:"FILLED" },
  { symbol:"JUB", side:"BUY", quantity:80, price:272, settlementDate:"2026-08-19", status:"FILLED" }
];
const buckets = buildDateBucketReconciliation({ statement:august, transactions:brokerTransactions });
const aug14 = buckets.find(x=>x.symbol==="JUB" && x.date==="2026-08-14" && x.side==="BUY");
const aug19 = buckets.find(x=>x.symbol==="JUB" && x.date==="2026-08-19" && x.side==="BUY");
assert.equal(aug14.cdscQuantity, 70);
assert.equal(aug14.transactionQuantity, 70);
assert.equal(aug14.reconciled, true);
assert.equal(aug14.aggregationAccepted, true);
assert.equal(aug19.cdscQuantity, 80);
assert.equal(aug19.transactionQuantity, 80);
assert.equal(aug19.reconciled, true);
console.log("PASS — split CDSC movements reconcile to aggregated broker transactions by security + settlement date + side.");

const september = buildMonthlyPositionStatement({
  accountNumber:"TEST-CDS", periodStart:"01-SEP-26", periodEnd:"30-SEP-26",
  rows:[
    { Symbol:"JUB", Date:"01-SEP-26", Type:"Balance Brought Forward", Balance:150 },
    { Symbol:"JUB", Date:"30-SEP-26", Type:"Balance Carried Forward", Balance:150 }
  ]
});
const register = buildMonthlyPositionRegister([august,september]);
assert.equal(register.continuityGapCount, 0);
assert.equal(register.continuity.find(x=>x.symbol==="JUB").reconciled, true);
console.log("PASS — previous month closing balance becomes the next month opening balance without overwriting history.");

const threeWay = buildThreeWayPositionReconciliation({
  register:buildMonthlyPositionRegister([august]),
  holdings:[{symbol:"JUB",quantity:150,averagePrice:271.04}],
  transactions:brokerTransactions
});
const tJub = threeWay.securities.find(x=>x.symbol==="JUB");
assert.equal(tJub.positionStatus,"POSITION_RECONCILED");
assert.equal(tJub.transactionHistoryStatus,"TRANSACTION_HISTORY_RECONCILED");
assert.equal(tJub.fifoAvailableFromHistory,true);
console.log("PASS — CDSC settled quantity and broker valuation reconcile independently while transaction evidence validates dated lot movement.");

const extraTen = buildThreeWayPositionReconciliation({
  register:buildMonthlyPositionRegister([august]),
  holdings:[{symbol:"JUB",quantity:150}],
  transactions:[...brokerTransactions,{symbol:"JUB",side:"BUY",quantity:10,price:260,settlementDate:"2026-08-12",status:"FILLED"}]
});
const extraJub = extraTen.securities.find(x=>x.symbol==="JUB");
assert.equal(extraJub.positionStatus,"POSITION_RECONCILED");
assert.equal(extraJub.transactionHistoryStatus,"TRANSACTION_HISTORY_GAP");
assert.equal(extraJub.fifoAvailableFromHistory,false);
assert.ok(extraJub.dateBuckets.some(x=>x.difference===10));
console.log("PASS — an extra 10-share transaction does not corrupt the authoritative 150-share position; it remains an evidence gap and blocks FIFO.");

assert.equal(threeWay.mutatesRealPortfolio,false);
assert.equal(threeWay.mutatesPracticePortfolio,false);
console.log("PC-030M20AI monthly position register verification complete.");
