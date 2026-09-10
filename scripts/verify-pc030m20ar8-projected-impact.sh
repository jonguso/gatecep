#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"
echo "PC-030M20AR8 — Projected Holding & Portfolio Impact Review"
node scripts/test-pc030m20ar8-projected-impact.mjs
python - <<'PY'
from pathlib import Path
trade=Path('app/trade.js').read_text(encoding='utf-8')
service=Path('src/features/trading/coachGProjectedImpactService.js').read_text(encoding='utf-8')
# M20AR10A_ARCHITECTURE_AWARE_FIFO_CHECK
checks=[
 ('View Projected Impact' in trade, 'Trade Lab exposes a separate projected-impact review action.'),
 ('Current vs Projected' in trade and 'Weighted Average Price' in trade, 'Impact review compares current and projected quantity/WAP/portfolio evidence.'),
 ('buildProjectedImpactReview' in trade, 'Trade UI delegates projected impact calculations to the analytical service.'),
 (
   'averageGuard' in trade
   and 'averageGuard?.available' in service
   and 'averageGuard.remainingQuantity' in service
   and 'averageGuard.remainingAveragePrice' in service
   and 'averageGuard.releasedCostBasis' in service
   and 'averageGuard.estimatedRealizedProfitLoss' in service
   and 'FIFO-aware SELL analysis' in service,
   'SELL review remains tied to existing FIFO-aware sale evidence.'
 ),
 ('REAL portfolio evidence has not changed' in trade, 'Projected review explicitly preserves REAL portfolio integrity.'),
 ('Add to Broker Action Plan' in trade and 'BROKER_PLAN' in trade, 'Broker Action Plan remains a separate advisory handoff.')
]
for ok,msg in checks:
    if not ok: raise AssertionError(msg)
    print('PASS — '+msg)
PY

if [[ -x "$ROOT/scripts/verify-pc030m20ap-trade-lab-broker-plan-boundary.sh" ]]; then
  echo "Running M20AP regression..."
  bash "$ROOT/scripts/verify-pc030m20ap-trade-lab-broker-plan-boundary.sh"
fi
if [[ -x "$ROOT/scripts/verify-pc030m20ao-fifo-acquisition-date-normalization.sh" ]]; then
  echo "Running M20AO/FIFO regression..."
  bash "$ROOT/scripts/verify-pc030m20ao-fifo-acquisition-date-normalization.sh"
fi

echo "PC-030M20AR8 verification complete."
