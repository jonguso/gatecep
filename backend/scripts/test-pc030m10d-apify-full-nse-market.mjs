import assert from "node:assert/strict";
import {
  normalizeApifyNseRows,
  resolveApifyAsOf
} from "../src/services/marketData/ApifyNseNormalizer.js";
import {
  assertFreshApifyNseQuote,
  isNseTradingSession,
  normalizeApifyActorId
} from "../src/services/marketData/ApifyNsePolicy.js";

const scrapedAt = "2026-08-21T12:15:11.939+00:00";
const fullMarketShape = [
  { ticker: "ABSA", price: 35, change: -0.05, change_pct: -0.1427, volume: 675402, scraped_at: scrapedAt, exchange: "NSE" },
  { ticker: "EQTY", price: 76, change: 0.75, change_pct: 1, volume: 2258780, scraped_at: scrapedAt, exchange: "NSE" },
  { ticker: "NOT_NSE", price: 10, scraped_at: scrapedAt, exchange: "JSE" }
];

assert.equal(normalizeApifyActorId("mansalabs/african-stock-market-data"), "mansalabs~african-stock-market-data");
assert.equal(resolveApifyAsOf(fullMarketShape), scrapedAt);

const rows = normalizeApifyNseRows(fullMarketShape, scrapedAt);
assert.equal(rows.length, 2);
assert.equal(rows[0].exchange, "NSE");
assert.equal(rows[1].symbol, "EQT");
assert.equal(rows[1].sector, "Banking");

const afterClose = new Date("2026-08-21T17:00:00.000Z");
assert.equal(isNseTradingSession(afterClose), false);
assert.doesNotThrow(() => assertFreshApifyNseQuote(scrapedAt, afterClose));

const duringSession = new Date("2026-08-21T10:00:00.000Z");
assert.equal(isNseTradingSession(duringSession), true);
assert.throws(() => assertFreshApifyNseQuote("2026-08-21T08:00:00.000Z", duringSession), /stale during/);
assert.doesNotThrow(() => assertFreshApifyNseQuote("2026-08-21T09:50:00.000Z", duringSession));

console.log("PASS — mansalabs actor identifiers are converted to Apify API form.");
console.log("PASS — full-market rows retain only positive NSE securities.");
console.log("PASS — broker and market ticker aliases converge before valuation.");
console.log("PASS — intraday quotes remain strict while market-close snapshots remain usable.");
