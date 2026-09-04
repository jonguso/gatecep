import assert from "node:assert/strict";
import fs from "node:fs";
import { getRowsForTab, MARKET_RANK_LIMITS } from "../src/services/markets/marketHubData.js";

const rows = [
  { symbol: "A", changePct: 3, volume: 100, turnover: 1000 },
  { symbol: "B", changePct: -4, volume: 500, turnover: 300 },
  { symbol: "C", changePct: 1, volume: 0, turnover: 900 },
  { symbol: "D", changePct: -1, volume: 300, turnover: 0 },
  { symbol: "E", changePct: 0, volume: null, turnover: null }
];

assert.deepEqual(getRowsForTab("Equities", rows).map((x) => x.symbol), ["A", "B", "C", "D", "E"]);
assert.deepEqual(getRowsForTab("Gainers", rows).map((x) => x.symbol), ["A", "C"]);
assert.deepEqual(getRowsForTab("Losers", rows).map((x) => x.symbol), ["B", "D"]);
assert.deepEqual(getRowsForTab("Volume", rows).map((x) => x.symbol), ["B", "D", "A"]);
assert.deepEqual(getRowsForTab("Turnover", rows).map((x) => x.symbol), ["A", "C", "B"]);
assert.deepEqual(MARKET_RANK_LIMITS, { Gainers: 10, Losers: 5, Volume: 10, Turnover: 5 });

const screen = fs.readFileSync("app/(tabs)/markets.js", "utf8");
assert.match(screen, /Verified traded-volume evidence is unavailable/);
assert.match(screen, /Verified turnover evidence is unavailable/);

console.log("PASS — Equities, Gainers, Losers, Volume, and Turnover use distinct contracts.");
console.log("PASS — ranking limits are 10 gainers, 5 losers, 10 volume, and 5 turnover.");
console.log("PASS — zero or missing activity evidence is excluded from ranked activity tabs.");
