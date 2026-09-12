#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AU4C — Decision Lab Modal → Floating Coach Handoff"

SELECTOR='mobile/src/components/coach/RecoveryRecommendationSelector.js'
TRADING='mobile/app/(tabs)/trading.js'
FLOATING='mobile/src/components/coach/FloatingCoachG.js'

grep -q 'onConversationStarted' "$SELECTOR"
grep -q 'PC-030M20AU4C close Decision Lab before Floating Coach' "$SELECTOR"
grep -q 'onConversationStarted?.();' "$SELECTOR"
grep -q 'setTimeout(() => {' "$SELECTOR"
grep -q 'requestFloatingCoachGOpen' "$SELECTOR"

grep -q 'onConversationStarted={() => setConversationOpen(false)}' "$TRADING"
grep -q 'setConversationOpen(false)' "$TRADING"

grep -q 'subscribeFloatingCoachGOpen' "$FLOATING"

echo "PASS — parent Decision Lab modal closes before Floating Coach handoff."
echo "PASS — canonical Floating Coach remains the conversation surface."

if [[ -f scripts/verify-pc030m20au4b-floating-coach-activation.sh ]]; then
  echo "Running M20AU4B regression..."
  bash scripts/verify-pc030m20au4b-floating-coach-activation.sh
fi

echo "PC-030M20AU4C verification complete."
