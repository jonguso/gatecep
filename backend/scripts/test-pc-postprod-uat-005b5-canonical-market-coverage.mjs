import assert from "node:assert/strict";
import fs from "node:fs";
import {
  NSE_SECURITIES,
  getSecurityBySymbol
} from "../src/data/nseSecurityMaster.js";

const adapter = fs.readFileSync(
  "src/services/marketData/ApifyNseMarketDataAdapter.js",
  "utf8"
);

const collector = fs.readFileSync(
  "src/modules/market-cache/marketEodCollector.service.js",
  "utf8"
);

assert.equal(
  NSE_SECURITIES.length,
  64,
  "Canonical active NSE universe changed unexpectedly."
);

assert.equal(getSecurityBySymbol("EQTY").symbol, "EQT");
assert.equal(getSecurityBySymbol("IMH").symbol, "IM");
assert.equal(getSecurityBySymbol("TPSE").symbol, "TPS");
assert.equal(getSecurityBySymbol("UMME").symbol, "UMME");
assert.equal(getSecurityBySymbol("KURV").symbol, "KURV");

assert.match(
  adapter,
  /canonicalCount:\s*NSE_SECURITIES\.length/
);

assert.match(
  adapter,
  /coveredCanonicalSymbols\.size\s*===\s*canonicalSymbols\.size/
);

assert.doesNotMatch(
  adapter,
  /data\.length\s*>=\s*NSE_SECURITIES\.length/
);

assert.match(
  adapter,
  /"FULL_CANONICAL_MARKET"/
);

assert.match(
  adapter,
  /"PARTIAL_CANONICAL_MARKET"/
);

assert.match(
  adapter,
  /unpricedCount:\s*Math\.max\(0,\s*canonicalSymbols\.size\s*-\s*coveredCanonicalSymbols\.size\)/
);

assert.match(
  adapter,
  /coverage:\s*data\.length\s*<\s*inputRows/
);

assert.match(
  collector,
  /snapshot\.canonicalCoverage\s*!==\s*"FULL_CANONICAL_MARKET"/
);

assert.match(
  collector,
  /snapshot\.coverage\s*!==\s*"FULL_MARKET"/
);

assert.match(
  collector,
  /MARKET_EOD_MINIMUM_QUOTES/
);

console.log(
  "PASS — canonical active market universe contains 64 securities."
);

console.log(
  "PASS — EQTY, IMH and TPSE resolve through established canonical aliases; UMME and KURV are canonical."
);

console.log(
  "PASS — provider coverage and canonical coverage are represented separately."
);

console.log(
  "PASS — missing canonical identities contribute to unpricedCount."
);

console.log(
  "PASS — legacy FULL_MARKET ingestion coverage remains intact."
);

console.log(
  "PC-POSTPROD-UAT-005B5 canonical coverage regression complete."
);
