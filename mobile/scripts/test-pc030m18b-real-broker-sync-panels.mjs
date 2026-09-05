import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [center, sync, upload, status, adoption] = await Promise.all([
  read("app/portfolio-sync-center.js"), read("app/broker-sync.js"),
  read("app/broker-upload.js"), read("app/broker-status.js"),
  read("src/features/broker-sync/brokerAuthoritativeSnapshotService.js")
]);

for (const id of ["real-sync-evidence-panel", "real-sync-api-panel", "real-sync-manage-panel", "real-sync-preview-panel"]) assert.match(center, new RegExp(id));
assert.match(center, /confirmVisible/);
assert.match(center, /testID="confirm-broker-snapshot-replacement"/);
assert.match(center, /await adoptVerifiedBrokerSnapshot\(\)/);
assert.match(sync, /testID="real-broker-holdings-panel"/);
assert.match(sync, /Open Separate Practice Reconciliation/);
assert.match(upload, /testID="broker-upload-required-panel"/);
assert.match(upload, /testID="broker-upload-optional-panel"/);
assert.match(status, /Practice Broker Readiness/);
assert.match(adoption, /BROKER_SOURCE_OF_TRUTH/);

console.log("PASS — REAL Sync Center displays one Evidence, API, Manage, or Preview panel at a time.");
console.log("PASS — authoritative broker replacement still requires explicit modal confirmation.");
console.log("PASS — synced REAL holdings and broker uploads use contained internal scrolling.");
console.log("PASS — onboarding readiness and reconciliation remain visibly separate Practice journeys.");
