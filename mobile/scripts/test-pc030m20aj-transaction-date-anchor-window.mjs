import assert from "node:assert/strict";
import { excelSerialToIsoDate, normalizeEvidenceDate, normalizeTransactionDateEvidence } from "../src/features/trading/transactionDateNormalizationService.js";
import { buildMonthlyPositionStatement, buildMonthlyPositionRegister, buildThreeWayPositionReconciliation } from "../src/features/trading/monthlyPositionRegisterService.js";

function pass(message) { console.log(`PASS — ${message}`); }

assert.equal(excelSerialToIsoDate(46204), "2026-07-01");
assert.equal(excelSerialToIsoDate(46245), "2026-08-11");
assert.equal(excelSerialToIsoDate(46248), "2026-08-14");
assert.deepEqual(normalizeEvidenceDate("46245"), {
  rawValue: "46245", normalizedDate: "2026-08-11", method: "EXCEL_1900_SERIAL", valid: true, serial: 46245
});
pass("Excel serial transaction dates are normalized before JavaScript can misread them as years such as 46245.");

const normalized = normalizeTransactionDateEvidence({ date: 46245 });
assert.equal(normalized.rawExecutionDate, 46245);
assert.equal(normalized.executionDate, "2026-08-11");
assert.equal(normalized.effectiveDateRole, "TRADE_OR_EXECUTION_DATE");
pass("raw transaction dates are preserved while normalized ISO dates are derived for analysis.");

const statement = buildMonthlyPositionStatement({
  accountNumber: "TEST",
  periodStart: "01-AUG-2026",
  periodEnd: "31-AUG-2026",
  rows: [
    { symbol:"JUB", date:"01-AUG-2026", type:"BALANCE BROUGHT FORWARD", balance:0 },
    { symbol:"JUB", date:"14-AUG-2026", type:"PURCHASE", quantity:3, balance:3 },
    { symbol:"JUB", date:"14-AUG-2026", type:"PURCHASE", quantity:42, balance:45 },
    { symbol:"JUB", date:"14-AUG-2026", type:"PURCHASE", quantity:25, balance:70 },
    { symbol:"JUB", date:"19-AUG-2026", type:"PURCHASE", quantity:3, balance:73 },
    { symbol:"JUB", date:"19-AUG-2026", type:"PURCHASE", quantity:77, balance:150 },
    { symbol:"JUB", date:"31-AUG-2026", type:"BALANCE CARRIED FORWARD", balance:150 }
  ]
});
const register = buildMonthlyPositionRegister([statement]);

const transactions = [
  { symbol:"JUB", side:"BUY", quantity:10, price:366, date:46204, status:"FULLY TRADED" },
  { symbol:"JUB", side:"BUY", quantity:25, price:395, date:46245, status:"FULLY TRADED" },
  { symbol:"JUB", side:"BUY", quantity:45, price:395, date:46245, status:"FULLY TRADED" },
  { symbol:"JUB", side:"BUY", quantity:80, price:400, date:46248, status:"FULLY TRADED" }
];

const threeWay = buildThreeWayPositionReconciliation({ register, holdings:[{ symbol:"JUB", quantity:150 }], transactions });
const jub = threeWay.securities.find((x) => x.symbol === "JUB");
assert.equal(jub.positionReconciled, true);
assert.equal(jub.preAnchorEvidenceCount, 1);
assert.equal(jub.inPeriodEvidenceCount, 3);
assert.equal(jub.anchorWindowLedgerQuantity, 150);
assert.equal(jub.anchorWindowDifference, 0);
assert.equal(jub.anchorWindowStatus, "ANCHOR_WINDOW_RECONCILED");
pass("a pre-August BUY 10 remains visible as pre-anchor evidence but does not contaminate the August CDSC anchor-window closing quantity of 150.");

const buckets = jub.dateBuckets;
assert.equal(buckets.length, 2);
assert.equal(buckets.every((b) => b.reconciled), true);
assert.equal(buckets[0].cdscQuantity, 70);
assert.equal(buckets[0].transactionQuantity, 70);
assert.equal(buckets[0].transactionDate, "2026-08-11");
assert.equal(buckets[0].date, "2026-08-14");
assert.equal(buckets[0].dateGapDays, 3);
assert.equal(buckets[1].cdscQuantity, 80);
assert.equal(buckets[1].transactionQuantity, 80);
assert.equal(buckets[1].transactionDate, "2026-08-14");
assert.equal(buckets[1].date, "2026-08-19");
assert.equal(buckets[1].dateGapDays, 5);
assert.equal(jub.transactionHistoryStatus, "TRANSACTION_HISTORY_RECONCILED_WITH_SETTLEMENT_ALIGNMENT");
pass("CDSC settlement-date quantities reconcile to aggregated broker trade-date quantities without rewriting source dates.");

const explicitSettlement = buildThreeWayPositionReconciliation({
  register,
  holdings:[{ symbol:"JUB", quantity:150 }],
  transactions:[
    { symbol:"JUB", side:"BUY", quantity:70, price:395, date:46245, settlementDate:"14-AUG-2026", status:"FULLY TRADED" },
    { symbol:"JUB", side:"BUY", quantity:80, price:400, date:46248, settlementDate:"19-AUG-2026", status:"FULLY TRADED" }
  ]
});
const exact = explicitSettlement.securities.find((x) => x.symbol === "JUB");
assert.equal(exact.dateBuckets.every((b) => b.authoritativeDateMatch), true);
assert.equal(exact.provisionalDateMatchCount, 0);
assert.equal(exact.transactionHistoryStatus, "TRANSACTION_HISTORY_RECONCILED");
pass("explicit broker settlement dates take precedence and produce exact date-bucket reconciliation.");

console.log("PC-030M20AJ transaction date & anchor-window verification complete.");
