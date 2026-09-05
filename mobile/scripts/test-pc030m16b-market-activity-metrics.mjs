import assert from "node:assert/strict";
import fs from "node:fs";
import { getMarketSummary, getRowsForTab, getTurnoverMetric } from "../src/services/markets/marketHubData.js";

const rows = [
  { symbol: "ACTUAL", price: 10, volume: 100, turnover: 5000 },
  { symbol: "EST", price: 20, volume: 400, turnover: null },
  { symbol: "SMALL", price: 5, volume: 200, turnover: 0 },
  { symbol: "EMPTY", price: 50, volume: 0, turnover: null }
];

assert.deepEqual(getTurnoverMetric(rows[0]), { value: 5000, estimated: false });
assert.deepEqual(getTurnoverMetric(rows[1]), { value: 8000, estimated: true });
assert.deepEqual(getRowsForTab("Volume", rows).map((row) => row.symbol), ["EST", "SMALL", "ACTUAL"]);
assert.deepEqual(getRowsForTab("Turnover", rows).map((row) => row.symbol), ["EST", "ACTUAL", "SMALL"]);

const summary = getMarketSummary(rows);
assert.equal(summary.turnover, 14000);
assert.equal(summary.turnoverEstimated, true);

const screen = fs.readFileSync("app/(tabs)/markets.js", "utf8");
assert.match(screen, /tab === "Volume"/);
assert.match(screen, />Volume</);
assert.match(screen, /Est\. turnover/);
assert.match(screen, /summary\.turnoverEstimated \? "Est\. Turnover"/);

console.log("PASS — Volume rows display verified traded volume instead of price/change.");
console.log("PASS — reported turnover is preferred and derived turnover is explicitly labelled estimated.");
console.log("PASS — Turnover ranks by KES activity and summary discloses estimated inputs.");
