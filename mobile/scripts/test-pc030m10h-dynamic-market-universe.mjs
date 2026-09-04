import assert from "node:assert/strict";
import fs from "node:fs";
import {
  getMarketSummary,
  getRowsForTab
} from "../src/services/markets/marketHubData.js";

const rows = Array.from({ length: 45 }, (_, index) => ({
  symbol: `SEC${String(index + 1).padStart(2, "0")}`,
  name: `Security ${index + 1}`,
  price: index + 1,
  changePct: index % 3 === 0 ? 2 : index % 3 === 1 ? -1 : 0,
  volume: 1000 - index,
  turnover: (index + 1) * 100
}));

assert.equal(getRowsForTab("Equities", rows).length, 45);
assert.equal(getRowsForTab("Gainers", rows).length, 10);
assert.equal(getRowsForTab("Losers", rows).length, 5);
assert.equal(getRowsForTab("Volume", rows).length, 10);
assert.equal(getRowsForTab("Turnover", rows).length, 5);
assert.equal(getRowsForTab("Volume", rows)[0].symbol, "SEC01");
assert.equal(getRowsForTab("Turnover", rows)[0].symbol, "SEC45");
console.log("PASS — every verified backend security reaches the Equities view.");

const summary = getMarketSummary(rows);
assert.equal(summary.securities, 45);
assert.equal(summary.gainers, 15);
assert.equal(summary.decliners, 15);
console.log("PASS — summary and ranked tabs derive from the complete response.");

const screen = fs.readFileSync(new URL("../app/(tabs)/markets.js", import.meta.url), "utf8");
const hook = fs.readFileSync(new URL("../src/services/markets/useMarketData.js", import.meta.url), "utf8");
const watchlist = fs.readFileSync(new URL("../app/watchlist.js", import.meta.url), "utf8");

assert.match(screen, /useMarketData/);
assert.match(screen, /getRowsForTab\(tab, market\.rows\)/);
assert.match(watchlist, /market\.rows/);
assert.doesNotMatch(hook, /FALLBACK_MARKET_ROWS/);
assert.doesNotMatch(screen, /31\.75|258\.25|516\.00/);
console.log("PASS — Markets and Watchlist share live rows with no sample-price fallback.");

console.log("PC-030M10H dynamic market universe scenarios complete.");
