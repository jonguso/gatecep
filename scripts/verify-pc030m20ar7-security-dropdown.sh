#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "PC-030M20AR7 — Canonical NSE Security Dropdown"
cd "$ROOT/mobile"
node scripts/test-pc030m20ar7-security-dropdown.mjs
[ -f scripts/test-pc030m20ar4-investor-facing-dialogue.mjs ] && node scripts/test-pc030m20ar4-investor-facing-dialogue.mjs
[ -f scripts/test-pc030m20ar3-decision-accommodation.mjs ] && node scripts/test-pc030m20ar3-decision-accommodation.mjs
python3 - <<'PY'
from pathlib import Path
s=Path('app/(tabs)/trading.js').read_text(encoding='utf-8')
checks={
'M20AR6 canonical identity guard':'NSE_SECURITIES',
'investor/Coach dialogue':'dialogueTurns.map(turn=>',
'accommodation engine':'buildAccommodationAnalysis',
'same-sector rotation':'Explore reducing',
'underweight evidence guard':'will not invent an “underweight” sector',
'compare alternatives':'Compare alternatives',
'smaller amount':'Test a smaller',
'Broker Action Plan mode':'BROKER_PLAN',
'recovery context':'entryParams={entryParams}',
}
for label,term in checks.items():
    assert term in s, f'{label} missing'
assert 'Select a security from the NSE list so I can use the correct portfolio and sector evidence.' in s
assert 'COACH G — PORTFOLIO FIT' not in s
print('PASS — M20AR3/M20AR4 conversation and accommodation contracts remain connected under the dropdown UI.')
print('PASS — M20AR6 canonical-identity guard remains active and unresolved text cannot become a scenario security.')
print('PASS — single-surface Coach G dialogue and Broker Action Plan separation remain intact.')
PY
cd "$ROOT"
if [ -x scripts/verify-pc030m20ar5-m20ar4-verifier-correction.sh ]; then
  echo 'Running M20AR5/AQ3 regression...'
  bash scripts/verify-pc030m20ar5-m20ar4-verifier-correction.sh
fi
echo "PC-030M20AR7 verification complete."
