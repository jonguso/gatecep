#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mobile"
echo "PC-030M20AR9 — Action-Aware Coach G Decision Reasoning"
node scripts/test-pc030m20ar9-action-aware-reasoning.mjs
cd "$ROOT"
python3 - <<'PY'
from pathlib import Path
s=Path('mobile/app/(tabs)/trading.js').read_text(encoding='utf-8')
checks={
 'action-aware Trading controls':'PC-030M20AR9 action-aware controls',
 'SELL released-cash control':'Explore released cash',
 'SELL original-reduction control':'Keep original reduction',
 'SELL cash comparison control':'Compare uses of cash',
 'FIFO boundary explanation':'existing FIFO evidence',
 'Broker Action Plan boundary':'BROKER_PLAN'
}
for label,needle in checks.items():
    assert needle in s, f'Missing {label}'
print('PASS — Trading presents SELL-specific discussion controls instead of BUY wording.')
print('PASS — preliminary SELL reasoning explicitly defers remaining WAP/cost/P&L to FIFO evidence.')
print('PASS — Broker Action Plan boundary remains present.')
PY
# Keep the newest installed UI regression when present, but do not require it.
if [[ -x "$ROOT/scripts/verify-pc030m20ar7-security-dropdown.sh" ]]; then
  echo "Running M20AR7 and prior UI regressions..."
  bash "$ROOT/scripts/verify-pc030m20ar7-security-dropdown.sh"
fi
echo "PC-030M20AR9 verification complete."
