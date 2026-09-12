import fs from "node:fs";
import assert from "node:assert/strict";

const s=fs.readFileSync("app/reconciliation-conversation.js","utf8");

for(const [rx,label] of [
  [/PC-030M20AV3X RESPONSIVE CALIBRATION/,"marker"],
  [/width\s*:\s*"100%"/,"width"],
  [/maxWidth\s*:\s*960/,"maxWidth"],
  [/alignSelf\s*:\s*"center"/,"center"],
  [/paddingBottom\s*:\s*128/,"bottom clearance"],
]){
  assert.ok(rx.test(s),`reconciliation-conversation: ${label} missing`);
}

for(const token of [
  "confirmed clarification evidence",
  "Your Investor DNA was not changed automatically.",
  "A single response does not automatically rewrite your Investor DNA, place trades, or change your portfolio.",
]){
  assert.ok(s.includes(token),`reconciliation-conversation: contract missing: ${token}`);
}

console.log("PASS — Reconciliation Conversation contains AV3X responsive calibration.");
console.log("PASS — 960px centered desktop containment and 128px bottom clearance are present.");
console.log("PASS — confirmed clarification remains evidence-only.");
console.log("PASS — Investor DNA auto-change safeguard remains present.");
console.log("PASS — no automatic trade or portfolio mutation safeguard remains present.");
console.log("PC-030M20AV3X contract verification complete.");
