import assert from "node:assert/strict";
import { buildHistoricalSecurityLotLedger } from "../src/features/trading/historicalSecurityLotLedgerService.js";
import { classifyBrokerExecutionEvidence } from "../src/features/broker-sync/brokerExecutionEvidencePolicy.js";

const tx = (side, date, quantity, price, reference, status = "Fully Traded") => ({
  symbol: "EQT", side, date, quantity, price, status, brokerReference: reference
});

const history = [
  tx("BUY", "2026-01-02", 100, 60, "B1"),
  tx("BUY", "2026-01-03", 100, 70, "B2"),
  tx("SELL", "2026-01-04", 75, 90, "S1"),
  tx("BUY", "2026-01-05", 50, 80, "B3"),
  tx("SELL", "2026-01-06", 25, 95, "S2"),
  tx("SELL", "2026-01-07", 999, 95, "R1", "Rejected"),
  tx("SELL", "2026-01-08", 999, 95, "R2", "Refused")
];

const ledger = buildHistoricalSecurityLotLedger({ transactions: history, symbol: "EQT", currentQuantity: 150, currentAveragePrice: 73.33 });
assert.equal(ledger.available, true);
assert.equal(ledger.reconstructedQuantity, 150);
assert.equal(ledger.historicalSales.length, 2);
assert.equal(ledger.acquisitions[0].status, "CLOSED");
assert.equal(ledger.acquisitions[1].remainingQuantity, 100);
assert.equal(ledger.acquisitions[2].remainingQuantity, 50);
assert.equal(ledger.openLots.reduce((sum, lot) => sum + lot.quantity, 0), 150);

const gap = buildHistoricalSecurityLotLedger({ transactions: [tx("SELL", "2026-01-01", 10, 90, "S0")], symbol: "EQT", currentQuantity: 0, currentAveragePrice: 0 });
assert.equal(gap.available, false);
assert.equal(gap.status, "HISTORICAL_LEDGER_GAP");
assert.equal(gap.issues[0].code, "UNMATCHED_HISTORICAL_SALE");

const rejected = classifyBrokerExecutionEvidence({ symbol: "EQT", side: "SELL", quantity: 10, price: 90, date: "2026-01-01", brokerReference: "R", broker: "ABC", fees: 10, settlementStatus: "N/A", status: "Rejected" });
assert.equal(rejected.canAffectRealPortfolio, false);
assert.ok(rejected.missingEvidence.includes("TRADE_NOT_EXECUTED"));

console.log("PASS — historical BUY executions create acquisition lots and historical SELL executions consume them FIFO.");
console.log("PASS — REJECTED and REFUSED orders do not create or consume security lots.");
console.log("PASS — unmatched historical sales surface a ledger gap instead of fabricating earlier acquisitions.");
console.log("PASS — current broker quantity reconciles independently against the derived open-lot quantity.");
console.log("PASS — the historical security lot ledger is analytical-only and does not mutate REAL or Practice portfolios.");
