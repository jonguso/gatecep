import fs from "node:fs";
import assert from "node:assert/strict";

const s=fs.readFileSync("app/queue-manager.js","utf8");

assert.ok(s.includes("PC-030M20AV3T RESPONSIVE CALIBRATION"),"AV3T marker missing");
assert.ok(/width\s*:\s*"100%"/.test(s),"width missing");
assert.ok(/maxWidth\s*:\s*960/.test(s),"maxWidth missing");
assert.ok(/alignSelf\s*:\s*"center"/.test(s),"centered containment missing");
assert.ok(/paddingBottom\s*:\s*128/.test(s),"bottom clearance missing");

for (const token of [
  "Practice Queue Manager",
  "Practice-only lifecycle simulator. It does not call broker adapters or create REAL execution evidence.",
  "GATECEP_PRACTICE",
  "PRACTICE_SIMULATION",
  "fillBrokerReceivedOrders",
  "basketExecutionStore",
  "/trade-basket",
  "ORDER_STATUS.BROKER_RECEIVED",
  "ORDER_STATUS.BROKER_SELECTED",
]) {
  assert.ok(s.includes(token),`queue-manager Practice contract missing: ${token}`);
}

assert.ok(
  s.includes("Nothing is sent to a broker."),
  "queue-manager explicit no-broker-transmission safeguard missing"
);

console.log("PASS — Queue Manager contains AV3T responsive calibration.");
console.log("PASS — Queue Manager has 960px centered desktop containment and 128px bottom clearance.");
console.log("PASS — Practice-only lifecycle, simulated broker receipt, and simulated-fill contracts remain present.");
console.log("PASS — explicit no-REAL-broker / no-REAL-execution-evidence safeguards remain present.");
console.log("PC-030M20AV3T contract verification complete.");
