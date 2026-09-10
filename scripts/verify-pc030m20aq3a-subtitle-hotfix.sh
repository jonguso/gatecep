#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
FILE="$ROOT/mobile/app/(tabs)/trading.js"
[[ -f "$FILE" ]] || { echo "FAIL — missing $FILE"; exit 1; }

echo "PC-030M20AQ3A — Trading Subtitle Hotfix"
python - "$FILE" <<'PY'
from pathlib import Path
import sys
s = Path(sys.argv[1]).read_text(encoding='utf-8')
old = 'Read-only broker account, order, depth, and execution evidence.'
new = 'Test investment decisions against your portfolio, goals and risk before you act.'
assert old not in s, 'obsolete subtitle remains'
assert new in s, 'Decision Lab subtitle missing'
start = s.find('<ScrollView', s.find('export default function Trading'))
close = s.find('</ScrollView>', start)
assert start >= 0 and close > start, 'Trading main ScrollView not found'
main = s[start:close]
assert main.find('<ActiveUserBanner') >= 0, 'Active Account missing'
assert main.find('<DecisionLabHome data={data} />') >= 0, 'Decision Lab missing'
assert main.find('<ActiveUserBanner') < main.find('<DecisionLabHome data={data} />'), 'Active Account not above Decision Lab'
assert 'Broker Evidence' not in main, 'Broker Evidence still rendered'
assert 'Broker controlled' not in main, 'Broker controlled still rendered'
print('PASS — obsolete broker-evidence subtitle is gone.')
print('PASS — Decision Lab subtitle is present.')
print('PASS — AQ3 Active Account ordering remains intact.')
print('PASS — lower Broker Evidence UI remains removed.')
PY

if [[ -f scripts/verify-pc030m20aq3-trading-ui-consolidation.sh ]]; then
  echo "Re-running M20AQ3 verification..."
  bash scripts/verify-pc030m20aq3-trading-ui-consolidation.sh
fi
