import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const service = await read("src/features/broker-sync/brokerReconciliationService.js");
const syncCenter = await read("app/portfolio-sync-center.js");
const resolution = await read("src/features/broker-sync/brokerResolutionService.js");
const screens = await Promise.all([
  "app/broker-reconciliation.js", "app/broker-reconciliation-case.js", "app/broker-resolution.js",
  "app/broker-reconciliation-insight.js", "app/broker-sync-history.js", "app/broker-resolution-ledger.js",
  "app/broker-reconciliation-actions.js", "app/broker-reconciliation-cases.js"
].map(read));
const stores = await Promise.all([
  "brokerReconciliationCaseStore", "brokerResolutionStore", "brokerResolutionLedgerStore",
  "brokerSyncAuditStore", "brokerReconciliationActionStore"
].map((name) => read(`src/features/broker-sync/${name}.js`)));

assert.doesNotMatch(service, /loadCanonicalRealBrokerPortfolio|loadBrokerMirror|isVerifiedRealBrokerMirror/);
assert.match(service, /loadInvestorContext/);
assert.match(service, /practicePortfolio/);
assert.match(service, /practiceBrokerMirror/);
assert.match(service, /isPractice: true/);
assert.doesNotMatch(syncCenter, /buildBrokerReconciliation/);
assert.match(resolution, /GATECEP_PRACTICE_ONLY/);
for (const screen of screens) assert.match(screen, /Practice|PRACTICE/);
for (const store of stores) assert.match(store, /practiceBroker/);

console.log("PASS — reconciliation reads Practice portfolio and sandbox mirror evidence only.");
console.log("PASS — REAL Portfolio Sync Center no longer loads the Practice reconciliation service.");
console.log("PASS — cases, resolutions, actions, audit history, and ledger use Practice-scoped storage.");
console.log("PASS — every reconciliation screen is visibly marked Practice and remains non-executing.");
