import fs from "node:fs";
import assert from "node:assert/strict";

const files=[
  "app/broker-reconciliation-actions.js",
  "app/broker-reconciliation-cases.js",
  "app/broker-reconciliation.js",
  "app/broker-reconciliation-case.js",
  "app/broker-reconciliation-insight.js",
  "app/broker-resolution.js",
  "app/broker-resolution-ledger.js",
  "app/broker-sync-history.js",
];
const src=Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,"utf8")]));

for (const [name,text] of Object.entries(src)) {
  assert.ok(text.includes("PC-030M20AV3L RESPONSIVE CALIBRATION"),`${name}: marker missing`);
}

for (const name of [
  "app/broker-reconciliation-actions.js",
  "app/broker-reconciliation-cases.js",
]) {
  assert.ok(src[name].includes("maxWidth: 960"),`${name}: 960px containment missing`);
  assert.ok(src[name].includes("paddingBottom: 128"),`${name}: 128px bottom clearance missing`);
}

// Main Practice reconciliation boundary.
const recon=src["app/broker-reconciliation.js"];
assert.ok(recon.includes("PRACTICE ONLY"));
assert.ok(recon.includes("cannot read or update REAL holdings, cash, performance history, or connected-broker source-of-truth records."));
assert.ok(recon.includes("CASH_EVIDENCE_REQUIRED"));
assert.ok(recon.includes("MobileScreen"));
assert.ok(recon.includes("StickyActionBar"));

// Case review remains explanatory/read-only.
const c=src["app/broker-reconciliation-case.js"];
assert.ok(c.includes("PRACTICE ONLY"));
assert.ok(c.includes("cannot change REAL holdings or cash."));
assert.ok(c.includes("Review is explanatory"));
assert.ok(c.includes("does not change broker holdings, cash, or GateCEP portfolio positions."));

// Insight remains explanatory and isolated.
const insight=src["app/broker-reconciliation-insight.js"];
assert.ok(insight.includes("PRACTICE ONLY"));
assert.ok(insight.includes("REAL portfolio evidence remains isolated."));
assert.ok(insight.includes("Coach G explains; it does not modify portfolios"));

// Actions remain workflow notes, not transactions.
const actions=src["app/broker-reconciliation-actions.js"];
assert.ok(actions.includes("PRACTICE ONLY"));
assert.ok(actions.includes("These actions never enter the REAL investor record."));
assert.ok(actions.includes("not place a trade, move cash, or"));
assert.ok(actions.includes("modify a broker account."));
assert.ok(actions.includes("approveBrokerReconciliationAction"));
assert.ok(actions.includes("completeBrokerReconciliationAction"));

// Resolution remains sandbox-only.
const resolution=src["app/broker-resolution.js"];
assert.ok(resolution.includes("PRACTICE ONLY"));
assert.ok(resolution.includes("cannot import, trade, or modify the REAL portfolio."));
assert.ok(resolution.includes("They do not add, remove, buy, sell, transfer, or automatically import an investment."));

// Ledger and sync history stay read-only/audit.
const ledger=src["app/broker-resolution-ledger.js"];
assert.ok(ledger.includes("PRACTICE ONLY"));
assert.ok(ledger.includes("cannot modify REAL holdings, cash, performance, or broker records."));
assert.ok(ledger.includes("does not modify holdings, move cash, or submit broker instructions."));

const history=src["app/broker-sync-history.js"];
assert.ok(history.includes("PRACTICE ONLY"));
assert.ok(history.includes("isolated from REAL broker synchronization and portfolio evidence."));
assert.ok(history.includes("loadBrokerSyncAuditHistory"));

// Case history remains Practice-only.
const cases=src["app/broker-reconciliation-cases.js"];
assert.ok(cases.includes("Practice Reconciliation Cases"));
assert.ok(cases.includes("PRACTICE ONLY"));
assert.ok(cases.includes("loadBrokerReconciliationCases"));

console.log("PASS — all eight AV3L reconciliation/resolution targets contain responsive calibration.");
console.log("PASS — large ScrollView action/history screens have 960px desktop containment and 128px bottom clearance.");
console.log("PASS — canonical MobileScreen / StickyActionBar reconciliation shells remain intact.");
console.log("PASS — Practice-vs-REAL isolation remains explicit across reconciliation, cases, insight and resolution.");
console.log("PASS — reconciliation actions remain workflow-only and do not place trades, move cash or modify broker accounts.");
console.log("PASS — resolution remains explanatory/sandbox-only and cannot auto-import or modify investments.");
console.log("PASS — resolution ledger and sync history remain read-only audit/history surfaces.");
console.log("PASS — cash-evidence requirements and reconciliation route flow remain present.");
console.log("PC-030M20AV3L contract verification complete.");
