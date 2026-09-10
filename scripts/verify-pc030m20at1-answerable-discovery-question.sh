#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AT1 — Answerable Discovery Question Guard"

node mobile/scripts/test-pc030m20at1-answerable-opening-question.mjs

grep -q "PC-030M20AT1 answerable question guard" mobile/src/features/trading/coachGDecisionConversationSession.js
grep -q "PC-030M20AT1 normalize handoff question" 'mobile/app/(tabs)/trading.js'
grep -q "What would you like the released cash to accomplish?" mobile/src/features/trading/coachGDecisionConversationSession.js
grep -q "What outcome would make this idea worthwhile for you?" mobile/src/features/trading/coachGDecisionConversationSession.js

echo "PASS — every Discovery session has an explicit answerable question."
echo "PASS — valid existing Coach G questions are preserved."
echo "PASS — non-question status text falls back to action-aware discovery."

if [[ -f scripts/verify-pc030m20at-floating-coach-decision-conversation.sh ]]; then
  echo "Running M20AT and prior regressions..."
  bash scripts/verify-pc030m20at-floating-coach-decision-conversation.sh
fi

echo "PC-030M20AT1 verification complete."
