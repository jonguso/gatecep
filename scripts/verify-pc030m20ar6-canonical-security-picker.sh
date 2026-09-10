#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
echo "PC-030M20AR6 — Canonical Security Picker & Conversation De-duplication"
cd "$ROOT/mobile"
node scripts/test-pc030m20ar6-canonical-security-picker.mjs
python - <<'PY'
from pathlib import Path
s=Path('app/(tabs)/trading.js').read_text(encoding='utf-8')
assert 'NSE_SECURITIES' in s
assert 'securityMatches' in s and 'chooseSecurity' in s
assert 'selectedSecurity?.symbol || ""' in s
assert 'Select a security from the NSE list so I can use the correct portfolio and sector evidence.' in s
assert 'COACH G — PORTFOLIO FIT' not in s
assert 'buildAccommodationDialogue(nextAccommodation)' in s
assert 'Review Broker Action Plan' in s
print('PASS — canonical master selection, unresolved-symbol blocking and single-surface Coach G dialogue are present.')
print('PASS — accommodation and Broker Action Plan boundaries remain available.')
PY
cd "$ROOT"
if [[ -x scripts/verify-pc030m20ar5-m20ar4-verifier-correction.sh ]]; then
  echo "Running M20AR5/AQ3 regression..."
  bash scripts/verify-pc030m20ar5-m20ar4-verifier-correction.sh
fi
echo "PC-030M20AR6 verification complete."
