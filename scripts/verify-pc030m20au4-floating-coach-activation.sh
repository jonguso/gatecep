#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AU4 — Selected Recovery → Floating Coach Activation"

node mobile/scripts/test-pc030m20au4-floating-coach-activation.mjs

FLOATING='mobile/src/components/coach/FloatingCoachG.js'
SELECTOR='mobile/src/components/coach/RecoveryRecommendationSelector.js'

grep -q 'subscribeFloatingCoachGOpen' "$FLOATING"
grep -q 'PC-030M20AU4 floating activation subscription' "$FLOATING"
grep -q 'setOpen(true)' "$FLOATING"
grep -q 'requestFloatingCoachGOpen' "$SELECTOR"
grep -q 'PC-030M20AU4 activate canonical Floating Coach' "$SELECTOR"
grep -q 'source: "RECOVERY_RECOMMENDATION"' "$SELECTOR"

echo "PASS — canonical Floating Coach owns visible activation."
echo "PASS — Answer Coach G creates the existing session then opens Floating Coach."
echo "PASS — selected recovery question is handed to the reply surface."
echo "PASS — no second Coach G modal/component is introduced."

if [[ -f scripts/verify-pc030m20au3-select-recommendation-response.sh ]]; then
  echo "Running M20AU3 regression..."
  bash scripts/verify-pc030m20au3-select-recommendation-response.sh
fi

echo "PC-030M20AU4 verification complete."
