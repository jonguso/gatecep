import assert from "node:assert/strict";
import { normalizeApifyEodExport } from "../src/services/marketData/ApifyEodExportNormalizer.js";
import { normalizeDatabaseMarketDate } from "../src/modules/market-cache/marketDate.js";

const rows = Array.from({ length: 45 }, (_, index) => ({
  ticker: index === 0 ? "EQTY" : `T${String(index).padStart(2, "0")}`,
  name: `NSE Security ${index}`,
  price: 10 + index,
  change: index / 10,
  change_pct: index / 100,
  volume: 1000 + index,
  scraped_at: "2026-08-24T12:15:08.678+00:00",
  exchange: "NSE",
  retrieved_at: "2026-08-24T13:59:46.950Z"
}));
const headers = Object.keys(rows[0]);
const csv = [headers.join(","), ...rows.map((row) => headers.map((key) => JSON.stringify(row[key])).join(","))].join("\n");
const jsonSnapshot = normalizeApifyEodExport({ fileText: JSON.stringify(rows), fileName: "dataset_african-stock-market-data.json" });
const csvSnapshot = normalizeApifyEodExport({ fileText: csv, fileName: "dataset_african-stock-market-data.csv" });

assert.equal(jsonSnapshot.count, 45);
assert.equal(jsonSnapshot.marketDate, "2026-08-24");
assert.equal(jsonSnapshot.checksum, csvSnapshot.checksum);
assert.equal(jsonSnapshot.provider, "APIFY_MANUAL_EOD");
assert.equal(jsonSnapshot.valuationEligible, true);
assert.equal(jsonSnapshot.data[0].hasLivePrice, false);
assert.ok(jsonSnapshot.data.every((row) => !Object.hasOwn(row, "quantity") && !Object.hasOwn(row, "costBasis") && !Object.hasOwn(row, "cash")));
assert.equal(normalizeDatabaseMarketDate(new Date("2026-08-21T00:00:00.000Z")), "2026-08-21");
assert.equal(normalizeDatabaseMarketDate("Fri Aug 21 2026 00:00:00 GMT+0000"), "2026-08-21");
assert.ok(jsonSnapshot.marketDate > normalizeDatabaseMarketDate(new Date("2026-08-21T00:00:00.000Z")));
console.log("PASS — Apify CSV and JSON converge to one canonical verified EOD snapshot.");
console.log("PASS — upstream scraped_at determines the Nairobi market date.");
console.log("PASS — normalized data contains prices only and cannot mutate broker positions.");
console.log("PASS — PostgreSQL Date values normalize before stale-snapshot comparison.");
