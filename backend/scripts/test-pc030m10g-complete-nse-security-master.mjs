import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  NSE_SECURITIES,
  getSecurityBySymbol,
  normalizeNseSymbol
} from "../src/data/nseSecurityMaster.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = process.env.NSE_FULL_MARKET_FIXTURE || path.resolve(
  here,
  "../../../upload/dataset_african-stock-market-data_2026-08-21_19-59-49-671.json"
);

const canonicalSymbols = NSE_SECURITIES.map((item) => normalizeNseSymbol(item.symbol));
assert.equal(new Set(canonicalSymbols).size, canonicalSymbols.length, "Canonical symbols must be unique.");
assert.ok(NSE_SECURITIES.length >= 60, "The NSE master must not regress to the former limited universe.");
console.log(`PASS — the canonical registry contains ${NSE_SECURITIES.length} NSE securities and instruments.`);

assert.equal(getSecurityBySymbol("EQTY").symbol, "EQT");
assert.equal(getSecurityBySymbol("IMH").symbol, "IM");
assert.equal(getSecurityBySymbol("SKL.O0000").symbol, "SKL");
console.log("PASS — broker and provider ticker aliases resolve to one canonical security.");

for (const required of ["FMLY", "KPC", "LAPR", "ALP", "TRFC", "WTK", "SMWF", "GLD"]) {
  const item = getSecurityBySymbol(required);
  assert.notEqual(item.sector, "Unknown", `${required} must be registered.`);
}
console.log("PASS — new equities, ETFs, REITs, and portfolio counters remain registered.");

if (fs.existsSync(fixturePath)) {
  const payload = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  const rows = Array.isArray(payload) ? payload : payload.data || payload.items || [];
  const unknown = rows
    .map((row) => row.ticker || row.symbol)
    .filter((symbol) => getSecurityBySymbol(symbol).sector === "Unknown");
  assert.deepEqual(unknown, [], `Full-market fixture contains unknown symbols: ${unknown.join(", ")}`);
  console.log(`PASS — all ${rows.length} supplied full-market counters resolve through the security master.`);
} else {
  console.log("PASS — optional full-market fixture is absent; canonical registry checks remain complete.");
}

console.log("PC-030M10G complete NSE security master scenarios complete.");
