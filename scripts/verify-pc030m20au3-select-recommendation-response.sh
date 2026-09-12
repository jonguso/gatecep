#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AU3 — Select Recommendation → Coach G Response"

node mobile/scripts/test-pc030m20au3-select-recommendation-response.mjs

COMPONENT='mobile/src/components/coach/RecoveryRecommendationSelector.js'
SERVICE='mobile/src/features/trading/recoveryRecommendationSelectorService.js'
TRADING='mobile/app/(tabs)/trading.js'

grep -q 'selectedChoiceId' "$COMPONENT"
grep -q 'accessibilityState={{ selected }}' "$COMPONENT"
grep -q 'SELECTED ✓' "$COMPONENT"
grep -q 'COACH G — YOUR SELECTED OPTION' "$COMPONENT"
grep -q 'Answer Coach G' "$COMPONENT"
grep -q 'buildSelectedRecoveryCoachResponse' "$SERVICE"

if grep -q 'What part of that recommendation would you like to test before deciding?' "$TRADING"; then
  echo "FAIL — obsolete generic recovery question still present."
  exit 1
fi

echo "PASS — each recovery card is a selectable investor decision."
echo "PASS — selection is visually marked SELECTED ✓."
echo "PASS — selected option receives its own evidence-backed Coach G answer."
echo "PASS — selected option receives its own recovery question."
echo "PASS — recommendation is not automatically selected."
echo "PASS — Floating Coach conversation starts only when investor chooses Answer Coach G."

if [[ -f scripts/verify-pc030m20au2-decisionlabhome-installer-correction.sh ]]; then
  echo "Running M20AU2 regression..."
  bash scripts/verify-pc030m20au2-decisionlabhome-installer-correction.sh
fi

echo "PC-030M20AU3 verification complete."
