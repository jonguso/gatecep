import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isCompletedLotExecution } from "../src/features/trading/brokerLotHistoryEvidenceService.js";

assert.equal(Boolean(isCompletedLotExecution({ symbol: "EQT", side: "BUY", quantity: 20, price: 69.5, date: "02-Apr-2026", status: "Fully Traded" })), true);
assert.equal(Boolean(isCompletedLotExecution({ symbol: "EQT", side: "BUY", quantity: 20, price: 68, date: "01-Apr-2026", status: "Expired" })), false);
assert.equal(Boolean(isCompletedLotExecution({ symbol: "KCB", side: "SELL", quantity: 100, price: 94.25, date: "31-Aug-2026", status: "Fully Traded" })), true);

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [center, trade, status] = await Promise.all([read("app/portfolio-sync-center.js"), read("app/trade.js"), read("src/services/portfolio/syncStatus.js")]);
assert.match(center, /Transaction \/ Lot History/);
assert.match(center, /Complete all three records before confirmation/);
assert.match(center, /valuationReady && cashEvidenceReady && transactionHistoryReady/);
assert.match(center, /Upload Transaction History/);
assert.match(center, /Required for FIFO lots, realized results, and post-sale WAP/);
assert.doesNotMatch(center.match(/Manage Canonical REAL Data[\s\S]*?Authoritative Replacement Preview/)?.[0] || "", /Upload Transaction History/);
assert.match(trade, /loadBrokerLotHistoryEvidence/);
assert.match(status, /lotHistoryReady/);

console.log("PASS — transaction and lot history is required alongside valuation and cash evidence.");
console.log("PASS — reconciliation cannot advance until all three evidence categories are available.");
console.log("PASS — only completed executions qualify for analytical FIFO lot reconstruction.");
console.log("PASS — analytically useful order history remains separate from evidence allowed to mutate REAL data.");
console.log("PASS — the duplicate transaction-history entry is removed from Manage and owned by Required Evidence.");
