#!/usr/bin/env bash
set -euo pipefail
ROOT="$(pwd)"
FILE="$ROOT/mobile/app/(tabs)/trading.js"
[[ -f "$FILE" ]] || { echo "ERROR — missing $FILE"; exit 1; }

echo "PC-030M20AQ3A — Trading Subtitle Hotfix"
python - "$FILE" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
s = p.read_text(encoding='utf-8')
old = 'Read-only broker account, order, depth, and execution evidence.'
new = 'Test investment decisions against your portfolio, goals and risk before you act.'
if old in s:
    count = s.count(old)
    s = s.replace(old, new)
    p.write_text(s, encoding='utf-8')
    print(f'UPDATED — replaced obsolete Trading subtitle ({count} occurrence(s))')
elif new in s:
    print('SKIP — Decision Lab subtitle already present')
else:
    raise SystemExit('ERROR — neither expected old nor new Trading subtitle found; refusing unrelated edit')
PY

echo "PC-030M20AQ3A applied successfully."
