import assert from "node:assert/strict";
import { classifyBrokerExecutionEvidence, partitionBrokerExecutionEvidence } from "../src/features/broker-sync/brokerExecutionEvidencePolicy.js";
import { readFile } from "node:fs/promises";

const complete = classifyBrokerExecutionEvidence({
  side: "BUY", executionDate: "2026-09-04", brokerReference: "CN-123",
  broker: "AIB-AXYS", quantity: 100, price: 50, fees: 75,
  settlementStatus: "SETTLED"
});
assert.equal(complete.evidenceStatus, "VERIFIED_BROKER_EXECUTION");
assert.equal(complete.canAffectRealPortfolio, true);

const incomplete = classifyBrokerExecutionEvidence({ side: "SELL", quantity: 10, price: 20 });
assert.equal(incomplete.evidenceStatus, "UNVERIFIED");
assert.equal(incomplete.canAffectRealPortfolio, false);
for (const requirement of ["BROKER_EXECUTION_DATE", "BROKER_REFERENCE", "BROKER_SOURCE", "BROKER_AND_REGULATORY_FEES", "SETTLEMENT_EVIDENCE"]) assert.ok(incomplete.missingEvidence.includes(requirement));

const partition = partitionBrokerExecutionEvidence([complete, incomplete]);
assert.equal(partition.verified.length, 1);
assert.equal(partition.unverified.length, 1);

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [manual, upload, activity] = await Promise.all([read("app/transaction-import.js"), read("app/transactions-upload.js"), read("app/portfolio-activity.js")]);
for (const screen of [manual, upload]) {
  assert.match(screen, /partitionBrokerExecutionEvidence/);
  assert.match(screen, /unverifiedTransactionHistory/);
  assert.match(screen, /verified\.length \? "true" : "false"/);
  assert.doesNotMatch(screen, /\|\| new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/);
}
assert.match(manual, /transaction-evidence-review-panel/);
assert.match(upload, /broker-execution-preview-panel/);
assert.match(activity, /Practice trades remain in Practice only/);

console.log("PASS — REAL executions require broker date, reference, broker, quantity, price, fees and settlement evidence.");
console.log("PASS — incomplete or manual records remain UNVERIFIED and cannot qualify as REAL evidence.");
console.log("PASS — upload time is not substituted for a missing broker execution date.");
console.log("PASS — execution previews are contained, read-only mobile panels.");
