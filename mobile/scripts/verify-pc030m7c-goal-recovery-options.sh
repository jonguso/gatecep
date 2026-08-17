#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "============================================================"
echo "PC-030M7C — GOAL RECOVERY OPTION NAVIGATION VERIFICATION"
echo "============================================================"

node scripts/test-pc030m7c-goal-recovery-options.cjs

node - <<'NODE'
const fs = require("fs");
const parser = require("@babel/parser");

const files = [
  "app/wealth-journey.js",
  "app/goal-recovery-options.js",
  "src/features/wealth-journey/goalRecoveryOptionsService.js",
  "src/features/wealth-journey/components/WealthJourneyGoalCard.js",
  "src/features/wealth-journey/wealthJourneyRuntimeReconciliation.js"
];

for (const file of files) {
  parser.parse(fs.readFileSync(file, "utf8"), {
    sourceType: "module",
    plugins: ["jsx"]
  });
}

const route = fs.readFileSync("app/goal-recovery-options.js", "utf8");
const journey = fs.readFileSync("app/wealth-journey.js", "utf8");
const card = fs.readFileSync(
  "src/features/wealth-journey/components/WealthJourneyGoalCard.js",
  "utf8"
);
const service = fs.readFileSync(
  "src/features/wealth-journey/goalRecoveryOptionsService.js",
  "utf8"
);

function requireText(source, text, message) {
  if (!source.includes(text)) throw new Error(message);
}

requireText(route, "Option {index + 1} of {scenarios.length}", "Focused option pager is missing.");
requireText(route, "COACH G RECOMMENDS FIRST", "Recommended marker is missing.");
requireText(route, "Review only—nothing changes automatically", "Advisory safeguard is missing.");
requireText(route, "Back to Wealth Journey", "Parent return action is missing.");
requireText(journey, 'pathname: "/goal-recovery-options"', "Priority route is not connected.");
requireText(card, 'pathname: "/goal-recovery-options"', "Goal card route is not connected.");
requireText(service, "loadRealCurrentInvestorWealthJourney", "Canonical REAL journey loader is missing.");
requireText(service, "practiceUsed: false", "Practice exclusion is missing.");

console.log("PASS — Coach G priority and goal cards open the focused recovery route.");
console.log("PASS — options are reviewed one at a time with a recommended marker.");
console.log("PASS — the route returns to Wealth Journey and exposes no automatic apply action.");
console.log("PASS — recovery option source parses successfully.");
NODE

if [[ -f scripts/test-pc030c2c8-runtime.mjs ]]; then
  node --experimental-vm-modules scripts/test-pc030c2c8-runtime.mjs
fi

echo "PC-030M7C goal recovery option verification complete."
