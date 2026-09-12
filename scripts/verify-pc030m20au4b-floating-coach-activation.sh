#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AU4B — Floating Coach Activation Syntax Correction"

node mobile/scripts/test-pc030m20au4b-floating-coach-activation.mjs

FLOATING='mobile/src/components/coach/FloatingCoachG.js'
SELECTOR='mobile/src/components/coach/RecoveryRecommendationSelector.js'

grep -q 'subscribeFloatingCoachGOpen' "$FLOATING"
grep -q 'PC-030M20AU4B runtime-state-aware activation' "$FLOATING"
grep -q 'requestFloatingCoachGOpen' "$SELECTOR"
grep -q 'PC-030M20AU4B activate canonical Floating Coach' "$SELECTOR"

echo "PASS — installer connected the current Floating Coach visibility state."
echo "PASS — Answer Coach G activates the canonical Floating Coach."
echo "PASS — existing recovery conversation session remains intact."
echo "PASS — no duplicate Coach G surface was introduced."

if [[ -f scripts/verify-pc030m20au3-select-recommendation-response.sh ]]; then
  echo "Running M20AU3 regression..."
  bash scripts/verify-pc030m20au3-select-recommendation-response.sh
fi

echo "PC-030M20AU4B verification complete."
