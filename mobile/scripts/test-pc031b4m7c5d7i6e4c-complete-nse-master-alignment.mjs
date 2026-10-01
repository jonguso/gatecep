import assert from "node:assert/strict";

import {
  NSE_SECURITIES as backendMaster
} from "../../backend/src/data/nseSecurityMaster.js";

import {
  NSE_SECURITIES as mobileMaster,
  applySecurityMaster,
  getSecurityBySymbol
} from "../src/utils/nseSecurityMaster.js";

const project = (rows) =>
  rows.map((item) => ({
    symbol: item.symbol,
    aliases: Array.isArray(item.aliases)
      ? [...item.aliases]
      : [],
    name: item.name,
    sector: item.sector
  }));

assert.equal(
  backendMaster.length,
  61,
  "Established backend master must retain the complete 61-security universe."
);
console.log(
  "PASS — established backend master retains 61 securities/instruments."
);

assert.equal(
  mobileMaster.length,
  backendMaster.length,
  "Mobile master must cover the complete backend universe."
);
console.log(
  "PASS — mobile master covers the complete canonical universe."
);

assert.deepEqual(
  project(mobileMaster),
  project(backendMaster),
  "Mobile and backend canonical identity metadata must remain aligned."
);
console.log(
  "PASS — mobile symbol, alias, name, and sector metadata match backend authority."
);

for (const item of backendMaster) {
  assert.notEqual(
    getSecurityBySymbol(item.symbol).sector,
    "Unknown",
    `${item.symbol} must resolve canonically on mobile.`
  );
}
console.log(
  "PASS — every registered NSE security resolves to a known mobile sector."
);

assert.equal(
  applySecurityMaster({
    symbol: "SCOM",
    name: "Safaricom",
    sector: "Telecommunication"
  }).sector,
  "Telecom"
);
console.log(
  "PASS — stale Telecommunication presentation resolves to canonical Telecom."
);

assert.equal(
  applySecurityMaster({
    symbol: "EABL",
    name: "EABL",
    sector: "Consumer"
  }).sector,
  "Manufacturing & Allied"
);
console.log(
  "PASS — stale EABL Consumer presentation resolves to canonical Manufacturing & Allied."
);

assert.equal(
  applySecurityMaster({
    symbol: "KQ",
    name: "Kenya Airways",
    sector: "Transport"
  }).sector,
  "Commercial & Services"
);
console.log(
  "PASS — stale KQ Transport presentation resolves to canonical Commercial & Services."
);

assert.equal(
  applySecurityMaster({
    symbol: "NSE",
    name: "Nairobi Securities Exchange",
    sector: "NSE"
  }).sector,
  "Investment Services"
);
console.log(
  "PASS — NSE counter resolves to Investment Services rather than exchange placeholder."
);

const unknown = applySecurityMaster({
  symbol: "NOTREGISTERED",
  name: "External Security",
  sector: "External Sector"
});

assert.equal(
  unknown.sector,
  "External Sector"
);
assert.equal(
  unknown.name,
  "External Security"
);
console.log(
  "PASS — unknown securities retain supplied identity; no sector is fabricated."
);

assert.equal(
  getSecurityBySymbol("EQTY").symbol,
  "EQT"
);
assert.equal(
  getSecurityBySymbol("IMH").symbol,
  "IM"
);
assert.equal(
  getSecurityBySymbol("SKL.O0000").symbol,
  "SKL"
);
console.log(
  "PASS — established aliases remain canonical."
);

console.log(
  "PC-031B4M7C5D7I6E4C complete NSE master alignment scenarios complete."
);
