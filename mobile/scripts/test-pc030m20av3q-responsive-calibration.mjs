import fs from "node:fs";
import assert from "node:assert/strict";

const dividend=fs.readFileSync("app/dividend-center.js","utf8");
const monthly=fs.readFileSync("app/monthly-review.js","utf8");

for (const [name,s] of [["dividend-center",dividend],["monthly-review",monthly]]) {
  assert.ok(s.includes("PC-030M20AV3Q RESPONSIVE CALIBRATION"),`${name}: marker missing`);
  assert.ok(/width\s*:\s*"100%"/.test(s),`${name}: width missing`);
  assert.ok(/maxWidth\s*:\s*960/.test(s),`${name}: maxWidth missing`);
  assert.ok(/alignSelf\s*:\s*"center"/.test(s),`${name}: center missing`);
  assert.ok(/paddingBottom\s*:\s*128/.test(s),`${name}: bottom clearance missing`);
}

// Dividend Center persistence and confirmation contracts.
for (const token of [
  "saveDividendRecord",
  "deleteDividendRecord",
  "confirmDelete",
  "confirmReceiveDividend",
  "removeRecord",
]) {
  assert.ok(dividend.includes(token),`dividend-center: ${token} contract missing`);
}

// Monthly Review persisted snapshot contract.
for (const token of [
  "saveMonthlyReview",
  "saveCurrentReview",
  "setSavedSnapshot",
]) {
  assert.ok(monthly.includes(token),`monthly-review: ${token} contract missing`);
}

assert.ok(monthly.includes("/investor-timeline") || monthly.includes("timeline"),
  "monthly-review: timeline return contract missing");

console.log("PASS — Dividend Center and Monthly Review contain AV3Q responsive calibration.");
console.log("PASS — both screens have 960px centered desktop containment and 128px bottom clearance.");
console.log("PASS — Dividend Center save/delete/receive-confirmation contracts remain present.");
console.log("PASS — Monthly Review persisted snapshot contracts remain present.");
console.log("PC-030M20AV3Q contract verification complete.");
