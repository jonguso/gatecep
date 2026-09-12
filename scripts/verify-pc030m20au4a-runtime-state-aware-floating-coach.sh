#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AU4A — Runtime-State-Aware Floating Coach Activation"

node mobile/scripts/test-pc030m20au4a-floating-coach-activation.mjs

FLOATING='mobile/src/components/coach/FloatingCoachG.js'
SELECTOR='mobile/src/components/coach/RecoveryRecommendationSelector.js'

grep -q 'subscribeFloatingCoachGOpen' "$FLOATING"
grep -q 'PC-030M20AU4A runtime-state-aware activation' "$FLOATING"
grep -q 'requestFloatingCoachGOpen' "$SELECTOR"
grep -q 'PC-030M20AU4A activate canonical Floating Coach' "$SELECTOR"

echo "PASS — activation uses the actual current Floating Coach visibility state."
echo "PASS — Answer Coach G uses the canonical Floating Coach."
echo "PASS — no duplicate Coach G surface was created."

if [[ -f scripts/verify-pc030m20au3-select-recommendation-response.sh ]]; then
  echo "Running M20AU3 regression..."
  bash scripts/verify-pc030m20au3-select-recommendation-response.sh
fi

echo "PC-030M20AU4A verification complete."
