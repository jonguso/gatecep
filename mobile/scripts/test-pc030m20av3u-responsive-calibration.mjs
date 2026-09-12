import fs from "node:fs";
import assert from "node:assert/strict";

const goal=fs.readFileSync("app/goal-details-edit.js","utf8");
const recovery=fs.readFileSync("app/goal-recovery-options.js","utf8");
const profile=fs.readFileSync("app/investor-profile-edit.js","utf8");

for (const [name,s] of [["goal-details-edit",goal],["goal-recovery-options",recovery],["investor-profile-edit",profile]]) {
  assert.ok(s.includes("PC-030M20AV3U RESPONSIVE CALIBRATION"),`${name}: marker missing`);
  assert.ok(/width\s*:\s*"100%"/.test(s),`${name}: width missing`);
  assert.ok(/maxWidth\s*:\s*960/.test(s),`${name}: maxWidth missing`);
  assert.ok(/alignSelf\s*:\s*"center"/.test(s),`${name}: centered containment missing`);
  assert.ok(/paddingBottom\s*:\s*128/.test(s),`${name}: bottom clearance missing`);
}

for (const token of [
  "loadCanonicalGoalDetails",
  "saveCanonicalGoalDetails",
  "Planning evidence only",
  "Practice Portfolio values are never used",
]) {
  assert.ok(goal.includes(token),`goal-details-edit: ${token} contract missing`);
}

for (const token of [
  "loadCurrentGoalRecoveryOptions",
  "COACH G • GOAL RECOVERY",
  "your goal, contribution, holdings, cash, or broker instructions",
]) {
  assert.ok(recovery.includes(token),`goal-recovery-options: ${token} advisory contract missing`);
}

for (const token of ["const GOALS =", "const RISKS =", "useAuth", "ContainedPanel"]) {
  assert.ok(profile.includes(token),`investor-profile-edit: ${token} contract missing`);
}

console.log("PASS — all three AV3U edit/planning screens contain responsive calibration.");
console.log("PASS — all targets have 960px centered desktop containment and 128px bottom clearance.");
console.log("PASS — canonical Goal Details evidence/load/save contracts remain present.");
console.log("PASS — Goal Recovery Options advisory/no-mutation language remains present.");
console.log("PASS — Investor Profile Edit goal/risk/profile contracts remain present.");
console.log("PC-030M20AV3U contract verification complete.");
