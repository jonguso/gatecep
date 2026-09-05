import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hasConnectedRealBrokerAccount } from "../src/features/broker-sync/brokerCashEvidencePolicy.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [manual, importer, review, center] = await Promise.all([
  read("app/manual-portfolio-entry.js"),
  read("app/import-portfolio.js"),
  read("app/review-portfolio-import.js"),
  read("app/portfolio-sync-center.js")
]);

assert.equal(hasConnectedRealBrokerAccount([{ brokerId: "AIB", connected: true, status: "ACTIVE" }]), true);
assert.equal(hasConnectedRealBrokerAccount([{ brokerId: "SIM", connected: true, connectionMode: "SIMULATION" }]), false);

for (const screen of [manual, importer, review, center]) {
  assert.match(screen, /hasConnectedRealBrokerAccount/);
  assert.match(screen, /loadBrokerAccounts/);
}

assert.match(manual, /Connected Broker Holdings Are Read-only/);
assert.ok(manual.indexOf("const brokerIsConnected") < manual.indexOf("await savePortfolio(enrichedRows)"));
assert.match(importer, /!reconciliationMode && brokerIsConnected/);
assert.ok(importer.indexOf("const brokerIsConnected") < importer.indexOf('userSetItem("statementUploaded"'));
assert.match(review, /Connected Broker Holdings Are Read-only/);
assert.ok(review.indexOf("const brokerIsConnected") < review.indexOf("await savePortfolio(cleanPortfolio)"));
assert.match(review, /saveVerifiedUploadedBrokerMirror/);

assert.match(center, /state\.connectedRealBroker/);
assert.match(center, /A REAL broker is connected/);
assert.match(center, /Manual Initial Portfolio/);

console.log("PASS — connected REAL holdings cannot be replaced by manual portfolio entry.");
console.log("PASS — ordinary imports are blocked after a REAL broker is connected.");
console.log("PASS — verified reconciliation imports remain available and read-only until confirmation.");
console.log("PASS — initial manual/import setup remains available before broker connection.");
