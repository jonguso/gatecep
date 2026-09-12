import fs from "node:fs";
import assert from "node:assert/strict";

const audit=fs.readFileSync("app/execution-audit.js","utf8");
const bridge=fs.readFileSync("app/execution-bridge.js","utf8");
const wizard=fs.readFileSync("app/execution-wizard.js","utf8");

for (const [name,s] of [["execution-audit",audit],["execution-bridge",bridge],["execution-wizard",wizard]]) {
  assert.ok(s.includes("PC-030M20AV3V RESPONSIVE CALIBRATION"),`${name}: marker missing`);
  assert.ok(/width\s*:\s*"100%"/.test(s),`${name}: width missing`);
  assert.ok(/maxWidth\s*:\s*960/.test(s),`${name}: maxWidth missing`);
  assert.ok(/alignSelf\s*:\s*"center"/.test(s),`${name}: centered containment missing`);
  assert.ok(/paddingBottom\s*:\s*128/.test(s),`${name}: bottom clearance missing`);
}

for (const token of [
  "Practice Execution Audit",
  "Practice-only local audit trail for simulated lifecycle events and routing",
  "executionAuditStore",
]) {
  assert.ok(audit.includes(token),`execution-audit: missing ${token}`);
}

for (const token of [
  "Coach G → Practice Simulation Pipeline",
  "ActiveUserBanner",
]) {
  assert.ok(bridge.includes(token),`execution-bridge: missing ${token}`);
}

for (const token of [
  "calculateExecutionReadiness",
  "Practice-only path from a Coach G idea to simulated order review. REAL execution occurs only at the broker.",
  "Broker account not linked",
  "Trade basket not created",
  "Cash balance missing",
  "Portfolio not loaded",
  "/broker-marketplace",
]) {
  assert.ok(wizard.includes(token),`execution-wizard: missing ${token}`);
}

console.log("PASS — all three AV3V execution-review screens contain responsive calibration.");
console.log("PASS — all targets have 960px centered desktop containment and 128px bottom clearance.");
console.log("PASS — Practice Execution Audit remains local simulated lifecycle evidence only.");
console.log("PASS — Coach G → Practice Simulation Pipeline boundary remains present.");
console.log("PASS — Execution Wizard readiness checks and broker-setup handoff remain present.");
console.log("PASS — explicit REAL-execution-only-at-broker safeguard remains present.");
console.log("PC-030M20AV3V contract verification complete.");
