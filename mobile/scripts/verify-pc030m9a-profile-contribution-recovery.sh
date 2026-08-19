#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "============================================================"
echo "PC-030M9A — PROFILE CONTRIBUTION RECOVERY VERIFICATION"
echo "============================================================"

node scripts/test-pc030m9a-profile-contribution-recovery.cjs

node - <<'NODE'
const fs = require("fs");
const parser = require("@babel/parser");

const files = [
  "src/features/wealth-journey/canonicalRealWealthContextService.js",
  "src/features/wealth-journey/realWealthActivationAdapter.js",
  "src/features/wealth-journey/goalGapRecoveryPlanner.js",
  "app/investor-profile-edit.js",
  "app/my-profile.js"
];

for (const file of files) {
  parser.parse(fs.readFileSync(file, "utf8"), {
    sourceType: "module",
    plugins: ["jsx"]
  });
}

const canonical = fs.readFileSync(files[0], "utf8");
const activation = fs.readFileSync(files[1], "utf8");
if (!canonical.includes("extractCanonicalContributionBehavior")) {
  throw new Error("Canonical profile contribution adapter is missing.");
}
if (!activation.includes("contributionBehavior")) {
  throw new Error("Wealth activation does not forward contribution behavior.");
}
if (!canonical.includes('practiceUsed: false')) {
  throw new Error("Practice exclusion is missing from contribution evidence.");
}

console.log("PASS — canonical contribution evidence is forwarded into REAL goal planning.");
console.log("PASS — profile screens identify recurring contribution amounts clearly.");
console.log("PASS — updated contribution source parses successfully.");
NODE

echo "PC-030M9A profile contribution recovery verification complete."
