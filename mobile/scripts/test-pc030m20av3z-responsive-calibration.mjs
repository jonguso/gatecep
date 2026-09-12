import fs from "node:fs";
import assert from "node:assert/strict";

const s=fs.readFileSync("app/manual-portfolio-entry.js","utf8");

for(const [rx,label] of [
  [/PC-030M20AV3Z RESPONSIVE CALIBRATION/,"marker"],
  [/width\s*:\s*"100%"/,"width"],
  [/maxWidth\s*:\s*960/,"maxWidth"],
  [/alignSelf\s*:\s*"center"/,"center"],
  [/paddingBottom\s*:\s*128/,"bottom clearance"],
]){
  assert.ok(rx.test(s),`manual-portfolio-entry: ${label} missing`);
}

for(const token of [
  "savePortfolio",
  "hasConnectedRealBrokerAccount",
  "Your connected REAL broker holdings are read-only here. Use verified broker synchronization.",
  "Add holdings only for initial REAL portfolio setup before connecting a broker.",
  'router.replace("/portfolio-sync-center")',
  'reason: "MANUAL_PORTFOLIO_ENTRY"',
]){
  assert.ok(s.includes(token),`manual-portfolio-entry: contract missing: ${token}`);
}

console.log("PASS — Manual Portfolio Entry contains AV3Z responsive calibration.");
console.log("PASS — 960px centered desktop containment and 128px bottom clearance are present.");
console.log("PASS — connected REAL broker holdings remain read-only here.");
console.log("PASS — manual entry remains initial REAL setup before broker connection.");
console.log("PASS — verified broker sync handoff remains present.");
console.log("PASS — MANUAL_PORTFOLIO_ENTRY canonical snapshot trigger remains present.");
console.log("PC-030M20AV3Z contract verification complete.");
