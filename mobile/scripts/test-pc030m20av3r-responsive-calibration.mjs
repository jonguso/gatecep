import fs from "node:fs";
import assert from "node:assert/strict";

const files = {
  portal: fs.readFileSync("app/existing-portal.js","utf8"),
  alert: fs.readFileSync("app/investor-alert-review.js","utf8"),
  profile: fs.readFileSync("app/my-profile.js","utf8"),
};

for (const [name,s] of Object.entries(files)) {
  assert.ok(s.includes("PC-030M20AV3R RESPONSIVE CALIBRATION"),`${name}: marker missing`);
  assert.ok(/width\s*:\s*"100%"/.test(s),`${name}: width missing`);
  assert.ok(/maxWidth\s*:\s*960/.test(s),`${name}: maxWidth missing`);
  assert.ok(/alignSelf\s*:\s*"center"/.test(s),`${name}: centered containment missing`);
  assert.ok(/paddingBottom\s*:\s*128/.test(s),`${name}: bottom clearance missing`);
}

assert.ok(files.portal.includes("/import-portfolio"));
assert.ok(files.portal.includes("/investor-home"));

assert.ok(files.alert.includes("/goal-scenario-planner"));
assert.ok(files.alert.includes("/trade"));
assert.ok(files.alert.includes("/security/") || files.alert.includes("`/security/${"));

for (const token of ["/account-edit","/investor-profile-edit","/broker-accounts","/portfolio-sync-center"]) {
  assert.ok(files.profile.includes(token),`my-profile: ${token} route missing`);
}
assert.ok(files.profile.includes("loadUnifiedPortfolio"),"my-profile: unified portfolio read contract missing");
assert.ok(files.profile.includes("getUserCash"),"my-profile: cash read contract missing");
assert.ok(files.profile.includes("getUserBrokers"),"my-profile: broker read contract missing");

console.log("PASS — all three AV3R screens contain responsive calibration.");
console.log("PASS — all targets have 960px centered desktop containment and 128px bottom clearance.");
console.log("PASS — Existing Portal navigation contracts remain present.");
console.log("PASS — Investor Alert Review scenario/trade/security handoff contracts remain present.");
console.log("PASS — My Profile portfolio/cash/broker read and account-navigation contracts remain present.");
console.log("PC-030M20AV3R contract verification complete.");
