#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERIFY="$ROOT/scripts/verify-pc030m20ar8-projected-impact.sh"

echo "PC-030M20AR10A — M20AR8 FIFO Boundary Verifier Correction"
echo "NO APP CODE CHANGED — verification contract only."

[[ -f "$VERIFY" ]] || { echo "ERROR — M20AR8 verifier not found: $VERIFY"; exit 1; }

python - "$VERIFY" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text(encoding="utf-8")

if "M20AR10A_ARCHITECTURE_AWARE_FIFO_CHECK" in s:
    print("NO CHANGE — M20AR10A verifier correction already installed.")
    raise SystemExit(0)

old = """python - <<'PY'\nfrom pathlib import Path\ns=Path('app/trade.js').read_text(encoding='utf-8')\nchecks=[\n ('View Projected Impact' in s, 'Trade Lab exposes a separate projected-impact review action.'),\n ('Current vs Projected' in s and 'Weighted Average Price' in s, 'Impact review compares current and projected quantity/WAP/portfolio evidence.'),\n ('buildProjectedImpactReview' in s, 'Trade UI delegates projected impact calculations to the analytical service.'),\n ('averageGuard' in s and 'FIFO-aware sale analysis' in s, 'SELL review remains tied to existing FIFO-aware sale evidence.'),\n ('REAL portfolio evidence has not changed' in s, 'Projected review explicitly preserves REAL portfolio integrity.'),\n ('Add to Broker Action Plan' in s and 'BROKER_PLAN' in s, 'Broker Action Plan remains a separate advisory handoff.')\n]\nfor ok,msg in checks:\n    if not ok: raise AssertionError(msg)\n    print('PASS — '+msg)\nPY"""

new = """python - <<'PY'\nfrom pathlib import Path\ntrade=Path('app/trade.js').read_text(encoding='utf-8')\nservice=Path('src/features/trading/coachGProjectedImpactService.js').read_text(encoding='utf-8')\n# M20AR10A_ARCHITECTURE_AWARE_FIFO_CHECK\nchecks=[\n ('View Projected Impact' in trade, 'Trade Lab exposes a separate projected-impact review action.'),\n ('Current vs Projected' in trade and 'Weighted Average Price' in trade, 'Impact review compares current and projected quantity/WAP/portfolio evidence.'),\n ('buildProjectedImpactReview' in trade, 'Trade UI delegates projected impact calculations to the analytical service.'),\n (\n   'averageGuard' in trade\n   and 'averageGuard?.available' in service\n   and 'averageGuard.remainingQuantity' in service\n   and 'averageGuard.remainingAveragePrice' in service\n   and 'averageGuard.releasedCostBasis' in service\n   and 'averageGuard.estimatedRealizedProfitLoss' in service\n   and 'FIFO-aware SELL analysis' in service,\n   'SELL review remains tied to existing FIFO-aware sale evidence.'\n ),\n ('REAL portfolio evidence has not changed' in trade, 'Projected review explicitly preserves REAL portfolio integrity.'),\n ('Add to Broker Action Plan' in trade and 'BROKER_PLAN' in trade, 'Broker Action Plan remains a separate advisory handoff.')\n]\nfor ok,msg in checks:\n    if not ok: raise AssertionError(msg)\n    print('PASS — '+msg)\nPY"""

if old not in s:
    raise SystemExit("ERROR — expected M20AR8 verifier block not found; refusing unsafe verifier rewrite")

p.write_text(s.replace(old, new, 1), encoding="utf-8")
print("UPDATED — M20AR8 verifier now checks FIFO ownership across Trade UI + projected-impact service.")
print("PRESERVED — all original M20AR8 functional and integrity checks remain.")
PY

echo "PC-030M20AR10A applied successfully."
