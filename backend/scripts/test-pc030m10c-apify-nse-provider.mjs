import assert from "node:assert/strict";
import {
  normalizeApifyNseRows,
  resolveApifyAsOf,
  resolveApifySource
} from "../src/services/marketData/ApifyNseNormalizer.js";

const asOf = new Date().toISOString();
const direct = [{ symbol: "SCOM", lastPrice: "36.50", timestamp: asOf, source: "NSE" }];
assert.equal(normalizeApifyNseRows(direct, asOf)[0].price, 36.5);
assert.equal(resolveApifyAsOf(direct), asOf);
assert.equal(resolveApifySource(direct), "NSE");

const nested = [{ generatedAt: asOf, provider: "NSE Kenya Market Data", data: [
  { ticker: "EQTY.NR", currentPrice: "55.25", previousClose: "54.00" }
] }];
const rows = normalizeApifyNseRows(nested, asOf);
assert.equal(rows.length, 1);
assert.equal(rows[0].symbol, "EQT");
assert.equal(rows[0].price, 55.25);

assert.equal(normalizeApifyNseRows([{ symbol: "BAD", price: 0 }], asOf).length, 0);

const actualActorShape = [
  { category: "gainer", ticker: "CARB", price_kes: 48.7, change_pct: "+9.81", source: "NSE Kenya", scraped_at: asOf },
  { category: "mover", ticker: "SCOM", volume: 15292227, source: "NSE Kenya", scraped_at: asOf }
];
const actualRows = normalizeApifyNseRows(actualActorShape, resolveApifyAsOf(actualActorShape));
assert.equal(resolveApifyAsOf(actualActorShape), asOf);
assert.equal(actualRows.length, 1);
assert.equal(actualRows[0].symbol, "CARB");
assert.equal(actualRows[0].price, 48.7);
assert.equal(actualRows[0].changePct, 9.81);
console.log("PASS — direct and nested Apify dataset rows normalize to canonical NSE quotes.");
console.log("PASS — source and upstream timestamps remain explicit.");
console.log("PASS — unusable prices are rejected instead of fabricating valuation data.");
console.log("PASS — price_kes, change_pct, and scraped_at match the live Actor schema.");
console.log("PASS — volume-only mover rows cannot overwrite portfolio valuation prices.");
