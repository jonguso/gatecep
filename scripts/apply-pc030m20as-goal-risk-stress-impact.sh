#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRADE="$ROOT/mobile/app/trade.js"

echo "PC-030M20AS — Goal + Risk Stress Impact"
[[ -f "$TRADE" ]] || { echo "ERROR — $TRADE not found"; exit 1; }
[[ -f "$ROOT/mobile/src/features/trading/coachGProjectedImpactService.js" ]] || { echo "ERROR — M20AR10 projected impact service missing"; exit 1; }
[[ -f "$ROOT/mobile/src/features/trading/coachGDecisionLabService.js" ]] || { echo "ERROR — M20AQ Decision Lab service missing"; exit 1; }
python "$ROOT/scripts/patch-pc030m20as-trade.py" "$TRADE"
echo "PC-030M20AS applied successfully."
