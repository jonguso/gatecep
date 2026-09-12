import fs from "node:fs";
import assert from "node:assert/strict";

const dna=fs.readFileSync("app/dna-update-review.js","utf8");
const simulator=fs.readFileSync("app/portfolio-simulator.js","utf8");

for (const [name,s] of [["dna-update-review",dna],["portfolio-simulator",simulator]]) {
  assert.ok(s.includes("PC-030M20AV3S RESPONSIVE CALIBRATION"),`${name}: marker missing`);
  assert.ok(/width\s*:\s*"100%"/.test(s),`${name}: width missing`);
  assert.ok(/maxWidth\s*:\s*960/.test(s),`${name}: maxWidth missing`);
  assert.ok(/alignSelf\s*:\s*"center"/.test(s),`${name}: centered containment missing`);
  assert.ok(/paddingBottom\s*:\s*128/.test(s),`${name}: bottom clearance missing`);
}

for (const token of [
  "confirmInvestorDNAReviewField",
  "submitInvestorDNAReviewConfirmation",
  "setConfirmAll",
]) {
  assert.ok(dna.includes(token),`dna-update-review: ${token} contract missing`);
}

for (const token of [
  "saveScenario",
  "setSelectedScenario",
  "setCustomMonthly",
]) {
  assert.ok(simulator.includes(token),`portfolio-simulator: ${token} contract missing`);
}

console.log("PASS — DNA Update Review and Portfolio Simulator contain AV3S responsive calibration.");
console.log("PASS — both screens have 960px centered desktop containment and 128px bottom clearance.");
console.log("PASS — DNA review field-confirmation and submission contracts remain present.");
console.log("PASS — Portfolio Simulator scenario selection/save contracts remain present.");
console.log("PC-030M20AV3S contract verification complete.");
