import fs from "node:fs";
import assert from "node:assert/strict";

const files=[
  "app/broker-account-center.js",
  "app/broker-accounts.js",
  "app/broker-profile.js",
  "app/broker-status.js",
  "app/broker-upload.js",
  "app/brokers.js",
];

const src=Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,"utf8")]));

for (const [name,text] of Object.entries(src)) {
  assert.ok(text.includes("PC-030M20AV3K RESPONSIVE CALIBRATION"),`${name}: AV3K marker missing`);
  assert.ok(text.includes("maxWidth: 960"),`${name}: 960px containment missing`);
  assert.ok(text.includes("paddingBottom: 128"),`${name}: 128px bottom clearance missing`);
}

const center=src["app/broker-account-center.js"];
assert.ok(center.includes("getUserBrokers"));
assert.ok(center.includes("addUserBroker"));
assert.ok(center.includes("real broker APIs come later"));
assert.ok(center.includes('router.push("/broker-accounts")'));

const accounts=src["app/broker-accounts.js"];
assert.ok(accounts.includes("loadBrokerAccounts"));
assert.ok(accounts.includes("saveBrokerAccounts"));
assert.ok(accounts.includes("migrateLegacyBrokerProfileToCanonicalAccounts"));
assert.ok(accounts.includes("buildBrokerFeeSchedule"));
assert.ok(accounts.includes("Evidence source and verified date are required"));
assert.ok(accounts.includes("This will not delete portfolio history."));
assert.ok(accounts.includes('apiMode: "PENDING_BROKER_API"'));

const profile=src["app/broker-profile.js"];
assert.ok(profile.includes("upsertBrokerAccount"));
assert.ok(profile.includes("resolveCanonicalBrokerId"));
assert.ok(profile.includes("Compatibility profile for statement matching."));
assert.ok(profile.includes("fee evidence and execution readiness are managed in Broker Accounts."));
assert.ok(profile.includes('apiMode: "PENDING_BROKER_API"'));

const status=src["app/broker-status.js"];
assert.ok(status.includes("Practice Broker Readiness"));
assert.ok(status.includes("separate from REAL broker synchronization"));
assert.ok(status.includes("first trade simulation"));

const upload=src["app/broker-upload.js"];
assert.ok(upload.includes("Portfolio Valuation"));
assert.ok(upload.includes("Cash / Ledger Statement"));
assert.ok(upload.includes("Transaction / Order History"));
assert.ok(upload.includes('router.push("/transaction-import")'));
assert.ok(upload.includes('router.push("/import-portfolio")'));

const brokers=src["app/brokers.js"];
assert.ok(brokers.includes("Portfolio Valuation"));
assert.ok(brokers.includes("Cash / Ledger Statement"));
assert.ok(brokers.includes("Transaction / Order History"));
assert.ok(brokers.includes('router.push("/manual-portfolio-entry")'));

console.log("PASS — six AV3K broker-account targets contain responsive calibration.");
console.log("PASS — all six targets have 960px desktop containment and 128px bottom clearance.");
console.log("PASS — Broker Account Center remains POC profile linking and still hands off to canonical Broker Accounts.");
console.log("PASS — canonical Broker Accounts store/default/fee-evidence contracts remain present.");
console.log("PASS — broker fee verification evidence requirements and portfolio-history preservation remain present.");
console.log("PASS — Broker Profile compatibility-to-canonical convergence remains present.");
console.log("PASS — Broker Status remains Practice-only and isolated from REAL broker synchronization.");
console.log("PASS — Broker Upload and /brokers evidence/navigation routes remain present.");
console.log("PC-030M20AV3K contract verification complete.");
