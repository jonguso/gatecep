import fs from "node:fs";
import assert from "node:assert/strict";

const s=fs.readFileSync("app/link-broker-account.js","utf8");

for(const [rx,label] of [
  [/PC-030M20AV3Y RESPONSIVE CALIBRATION/,"marker"],
  [/width\s*:\s*"100%"/,"width"],
  [/maxWidth\s*:\s*960/,"maxWidth"],
  [/alignSelf\s*:\s*"center"/,"center"],
  [/paddingBottom\s*:\s*128/,"bottom clearance"],
]){
  assert.ok(rx.test(s),`link-broker-account: ${label} missing`);
}

for(const token of [
  "upsertBrokerAccount",
  "defaultBroker: true",
  'Alert.alert("Broker Linked", "Broker account saved.")',
  'router.replace("/broker-accounts")',
  "Add your broker client number. CDS is user-level and not used as the broker account key.",
]){
  assert.ok(s.includes(token),`link-broker-account: contract missing: ${token}`);
}

console.log("PASS — Link Broker Account contains AV3Y responsive calibration.");
console.log("PASS — 960px centered desktop containment and 128px bottom clearance are present.");
console.log("PASS — canonical broker account upsert contract remains present.");
console.log("PASS — default-broker assignment remains present.");
console.log("PASS — successful save returns to /broker-accounts.");
console.log("PASS — CDS/user-level identity safeguard remains present.");
console.log("PC-030M20AV3Y contract verification complete.");
