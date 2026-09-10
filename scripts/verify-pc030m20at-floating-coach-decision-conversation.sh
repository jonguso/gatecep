#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "PC-030M20AT — Floating Coach G Decision Conversation"
node mobile/scripts/test-pc030m20at-floating-decision-conversation.mjs
grep -q "PC-030M20AT floating decision conversation" 'mobile/app/(tabs)/trading.js'
grep -q "Discuss with Coach G" 'mobile/app/(tabs)/trading.js'
grep -q "Skip discussion → Simulation" 'mobile/app/(tabs)/trading.js'
grep -q "PC-030M20AT decision session" mobile/src/components/coach/FloatingCoachG.js
grep -q "Yes — recommend" mobile/src/components/coach/FloatingCoachG.js
grep -q "Correct summary" mobile/src/components/coach/FloatingCoachG.js
grep -q "Continue to Simulation" mobile/src/components/coach/FloatingCoachG.js
echo "PASS — Decision Lab hands the scenario to canonical Floating Coach G."
echo "PASS — investor has a real free-text reply surface."
echo "PASS — Discovery → Summary → Recommendation is confirmation-gated."
echo "PASS — pure what-if simulation bypass remains explicit."
if [[ -f scripts/verify-pc030m20as-goal-risk-stress-impact.sh ]]; then
  echo "Running M20AS and prior regressions..."
  bash scripts/verify-pc030m20as-goal-risk-stress-impact.sh
fi
echo "PC-030M20AT verification complete."
