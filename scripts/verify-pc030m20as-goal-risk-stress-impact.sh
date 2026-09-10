#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "PC-030M20AS — Goal + Risk Stress Impact"
node mobile/scripts/test-pc030m20as-goal-risk-stress-impact.mjs

grep -q "PC-030M20AS goal+risk stress" mobile/app/trade.js
grep -q "COACH G — GOAL + RISK STRESS" mobile/app/trade.js
grep -q "buildGoalRiskStressImpact" mobile/app/trade.js
grep -q "loadRealCurrentInvestorWealthJourney" mobile/app/trade.js
grep -q "Risk label describes this modeled scenario, not your permanent Investor DNA risk profile" mobile/app/trade.js
grep -q "Add to Broker Action Plan" mobile/app/trade.js

echo "PASS — Projected Impact includes deterministic Goal + Risk Stress."
echo "PASS — REAL Wealth Journey is the goal-evidence source; missing goals are not fabricated."
echo "PASS — scenario risk remains separate from permanent Investor DNA risk profile."
echo "PASS — Broker Action Plan boundary remains present."

if [[ -f scripts/verify-pc030m20ar10-projected-impact-interpretation.sh ]]; then
  echo "Running M20AR10/M20AR8 projected-impact regressions..."
  bash scripts/verify-pc030m20ar10-projected-impact-interpretation.sh
fi
if [[ -f scripts/verify-pc030m20ar9-action-aware-reasoning.sh ]]; then
  echo "Running M20AR9 action-aware dialogue regression..."
  bash scripts/verify-pc030m20ar9-action-aware-reasoning.sh
fi

echo "PC-030M20AS verification complete."
