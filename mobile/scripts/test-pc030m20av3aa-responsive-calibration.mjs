import fs from "node:fs";
import assert from "node:assert/strict";

const s=fs.readFileSync("app/import-portfolio.js","utf8");

for(const [rx,label] of [
  [/PC-030M20AV3AA RESPONSIVE CALIBRATION/,"marker"],
  [/width\s*:\s*"100%"/,"width"],
  [/maxWidth\s*:\s*960/,"maxWidth"],
  [/alignSelf\s*:\s*"center"/,"center"],
  [/paddingBottom\s*:\s*128/,"bottom clearance"],
]){
  assert.ok(rx.test(s),`import-portfolio: ${label} missing`);
}

for(const token of [
  "requireSafeImportFile",
  "requireSafeImportRows",
  "loadVerifiedUserCds",
  "requireValidBrokerEvidenceIdentity",
  "hasConnectedRealBrokerAccount",
  '"BROKER_RECONCILIATION_EVIDENCE"',
  '"INITIAL_REAL_PORTFOLIO"',
  'pathname: "/review-portfolio-import"',
  'mode: reconciliationMode ? "RECONCILE" : "INITIAL"',
]){
  assert.ok(s.includes(token),`import-portfolio: contract missing: ${token}`);
}

console.log("PASS — Import Portfolio contains AV3AA responsive calibration.");
console.log("PASS — 960px centered desktop containment and 128px bottom clearance are present.");
console.log("PASS — safe file and row validation contracts remain present.");
console.log("PASS — verified CDS/broker evidence identity contracts remain present.");
console.log("PASS — reconciliation evidence and initial REAL import modes remain distinct.");
console.log("PASS — explicit /review-portfolio-import review handoff remains present.");
console.log("PC-030M20AV3AA contract verification complete.");
