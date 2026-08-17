#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCREEN="$ROOT/app/wealth-journey.js"
EDITOR="$ROOT/app/goal-details-edit.js"
CARD="$ROOT/src/features/wealth-journey/components/WealthJourneyGoalCard.js"
SERVICE="$ROOT/src/features/wealth-journey/goalDetailsService.js"
PROVIDER="$ROOT/src/features/wealth-journey/realGatecepWealthJourneyProviders.js"
RECONCILIATION="$ROOT/src/features/wealth-journey/wealthJourneyRuntimeReconciliation.js"
CANONICAL="$ROOT/src/features/wealth-journey/canonicalRealWealthContextService.js"
ACTIVATION="$ROOT/src/features/wealth-journey/realWealthActivationAdapter.js"

echo "============================================================"
echo "PC-030M7B — TRACKABLE GOAL DETAILS VERIFICATION"
echo "============================================================"

grep -q 'TRACKABLE_GOAL_DETAILS' "$SCREEN"
grep -q 'Add Required Goal Details' "$SCREEN"
grep -q 'pathname: "/goal-details-edit"' "$CARD"
grep -q 'Update Goal Details' "$CARD"
echo "PASS — missing goal details have direct investor-facing update actions."

grep -q 'Target Amount (KES)' "$EDITOR"
grep -q 'Target Date' "$EDITOR"
grep -q 'Save Goal Details' "$EDITOR"
grep -q 'router.replace("/wealth-journey")' "$EDITOR"
echo "PASS — the focused editor captures amount and date and returns to Wealth Journey."

grep -q 'userSetItem("investorProfile"' "$SERVICE"
grep -q 'saveInvestorProfile(updatedProfile)' "$SERVICE"
grep -q 'Practice Portfolio values are never used' "$EDITOR"
if grep -q 'practicePortfolio' "$SERVICE"; then
  echo "FAIL — goal details service must not read or write Practice Portfolio." >&2
  exit 1
fi
echo "PASS — goal details use the existing investor profile contract without Practice data."

grep -q 'existingIndex' "$PROVIDER"
grep -q 'score > deduped\[existingIndex\].score' "$PROVIDER"
grep -q 'targetDate:' "$RECONCILIATION"
grep -q 'label="Target Date"' "$CARD"
echo "PASS — structured goal evidence wins over duplicate intent and the date is visible."

grep -q 'extractCanonicalTrackableGoals' "$CANONICAL"
grep -q 'goals: trackableGoals' "$CANONICAL"
grep -q 'trackableGoals.length' "$ACTIVATION"
node "$ROOT/scripts/test-pc030m7b-goal-activation-boundary.cjs"
echo "PASS — REAL activation no longer replaces saved targets with null values."

node - "$SCREEN" "$EDITOR" "$CARD" "$SERVICE" "$PROVIDER" "$RECONCILIATION" "$CANONICAL" "$ACTIVATION" <<'NODE'
const fs = require("fs");
const parser = require("@babel/parser");
for (const file of process.argv.slice(2)) {
  parser.parse(fs.readFileSync(file, "utf8"), {
    sourceType: "module",
    plugins: ["jsx"]
  });
}
console.log("PASS — Wealth Journey goal-detail source parses successfully.");
NODE

if [[ -f "$ROOT/scripts/test-pc030c2c8-runtime.mjs" ]]; then
  node --experimental-vm-modules "$ROOT/scripts/test-pc030c2c8-runtime.mjs"
fi

echo "PC-030M7B trackable goal details verification complete."
