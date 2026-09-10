#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
echo "PC-030M20AR10 — Action-Aware Projected Impact Interpretation"
node mobile/scripts/test-pc030m20ar10-projected-impact-interpretation.mjs
grep -q "PC-030M20AR10 Coach G projected interpretation" mobile/app/trade.js
grep -q "COACH G — WHAT THIS MEANS" mobile/app/trade.js
grep -q "projectedImpact.interpretation?.summary" mobile/app/trade.js
grep -q "projectedImpact.interpretation?.question" mobile/app/trade.js
grep -q "Add to Broker Action Plan" mobile/app/trade.js
echo "PASS — Projected Impact modal contains action-aware Coach G interpretation."
echo "PASS — Broker Action Plan handoff remains present."
if [[ -f scripts/verify-pc030m20ar8-projected-impact.sh ]]; then echo "Running M20AR8 projected-impact regression..."; bash scripts/verify-pc030m20ar8-projected-impact.sh; fi
if [[ -f scripts/verify-pc030m20ar9-action-aware-reasoning.sh ]]; then echo "Running M20AR9 action-aware dialogue regression..."; bash scripts/verify-pc030m20ar9-action-aware-reasoning.sh; fi
echo "PC-030M20AR10 verification complete."
