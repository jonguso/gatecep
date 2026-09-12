import fs from "node:fs";
import assert from "node:assert/strict";

const alert=fs.readFileSync("app/investor-alert-review.js","utf8");
const portal=fs.readFileSync("app/existing-portal.js","utf8");
const profile=fs.readFileSync("app/my-profile.js","utf8");

assert.ok(alert.includes("PC-030M20AV3R RESPONSIVE CALIBRATION"),
  "investor-alert-review: AV3R marker missing");
assert.ok(!alert.includes("paddingTop: 54,,"),
  "investor-alert-review: duplicate comma still present");
assert.ok(alert.includes("paddingTop: 54, gap: 16"),
  "investor-alert-review: expected corrected style sequence missing");

for (const [name,s] of [["portal",portal],["alert",alert],["profile",profile]]) {
  assert.ok(s.includes("PC-030M20AV3R RESPONSIVE CALIBRATION"),`${name}: marker missing`);
  assert.ok(/maxWidth\s*:\s*960/.test(s),`${name}: maxWidth missing`);
  assert.ok(/paddingBottom\s*:\s*128/.test(s),`${name}: bottom clearance missing`);
}

assert.ok(alert.includes("/goal-scenario-planner"),
  "investor-alert-review: scenario planner route missing");
assert.ok(alert.includes("/trade"),
  "investor-alert-review: trade handoff missing");
assert.ok(alert.includes("/security/") || alert.includes("`/security/${"),
  "investor-alert-review: security detail route missing");

for (const token of ["/account-edit","/investor-profile-edit","/broker-accounts","/portfolio-sync-center"]) {
  assert.ok(profile.includes(token),`my-profile: ${token} route missing`);
}

console.log("PASS — AV3R2 duplicate-comma syntax defect is removed.");
console.log("PASS — all three AV3R screens retain responsive calibration.");
console.log("PASS — Investor Alert Review scenario/trade/security handoff contracts remain present.");
console.log("PASS — My Profile account/profile/broker/portfolio navigation contracts remain present.");
console.log("PC-030M20AV3R2 hotfix verification complete.");
