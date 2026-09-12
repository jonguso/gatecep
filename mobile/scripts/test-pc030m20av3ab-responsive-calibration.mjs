import fs from "node:fs";
import assert from "node:assert/strict";

const s=fs.readFileSync("app/review-portfolio-import.js","utf8");

for(const [rx,label] of [
  [/PC-030M20AV3AB RESPONSIVE CALIBRATION/,"marker"],
  [/width\s*:\s*"100%"/,"width"],
  [/maxWidth\s*:\s*960/,"maxWidth"],
  [/alignSelf\s*:\s*"center"/,"center"],
  [/paddingBottom\s*:\s*128/,"bottom clearance"],
]){
  assert.ok(rx.test(s),`review-portfolio-import: ${label} missing`);
}

for(const token of [
  "saveVerifiedUploadedBrokerMirror",
  "hasConnectedRealBrokerAccount",
  '"BROKER_RECONCILIATION_EVIDENCE"',
  '"Broker Evidence Ready"',
  '"The verified valuation is ready. Add the matching cash statement, then confirm the broker snapshot. No REAL holdings were changed yet."',
  '"Connected Broker Holdings Are Read-only"',
  '"This ordinary import cannot replace connected REAL holdings. Upload it as verified broker evidence from Portfolio Sync Center."',
  "await savePortfolio(cleanPortfolio);",
  'reason: "CONFIRMED_PORTFOLIO_IMPORT"',
  'router.replace("/portfolio-sync-center")',
  '"Confirm Broker Evidence and Compare"',
  '"Confirm Initial REAL Portfolio"',
]){
  assert.ok(s.includes(token),`review-portfolio-import: contract missing: ${token}`);
}

const reconcileIndex=s.indexOf("await saveVerifiedUploadedBrokerMirror({");
const realSaveIndex=s.indexOf("await savePortfolio(cleanPortfolio);");
assert.ok(reconcileIndex >= 0 && realSaveIndex > reconcileIndex,
  "review-portfolio-import: expected verified-mirror branch before initial REAL save branch");

const connectedGuard=s.indexOf("const brokerIsConnected = connectedRealBroker || hasConnectedRealBrokerAccount(await loadBrokerAccounts());");
assert.ok(connectedGuard >= 0 && connectedGuard < realSaveIndex,
  "review-portfolio-import: connected broker guard must remain before initial REAL save");

console.log("PASS — Review Portfolio Import contains AV3AB responsive calibration.");
console.log("PASS — 960px centered desktop containment and 128px bottom clearance are present.");
console.log("PASS — RECONCILE path retains verified broker mirror evidence contract.");
console.log("PASS — RECONCILE path retains explicit no-REAL-holdings-change statement.");
console.log("PASS — connected broker guard remains before ordinary REAL portfolio save.");
console.log("PASS — initial import retains savePortfolio and CONFIRMED_PORTFOLIO_IMPORT snapshot trigger.");
console.log("PASS — reconciliation and initial-import confirmation labels remain distinct.");
console.log("PC-030M20AV3AB contract verification complete.");
