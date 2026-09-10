#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
if [[ ! -d "$ROOT/mobile" || ! -d "$ROOT/backend" ]]; then
  echo "ERROR — run this from the GateCEP project root (expected ./mobile and ./backend)."
  exit 1
fi

python - <<'PY'
from pathlib import Path
import sys

root = Path.cwd()

# exact, targeted consumer substitutions only — never global EQTY replacement
changes = {
    "mobile/app/(tabs)/markets.js": [
        ('["SCOM", "EABL", "EQTY", "KCB"]', '["SCOM", "EABL", "EQT", "KCB"]'),
    ],
    "mobile/app/first-trade.js": [
        ('symbol: "EQTY"', 'symbol: "EQT"'),
    ],
    "mobile/app/watchlist.js": [
        ('["SCOM", "EABL", "EQTY", "COOP"]', '["SCOM", "EABL", "EQT", "COOP"]'),
    ],
    "mobile/src/features/broker-sync/brokerSyncService.js": [
        ('"EQTY",', '"EQT",'),
    ],
    "mobile/src/features/fundamentals/seeds/nseFundamentalSeed.js": [
        ('"EQTY",', '"EQT",'),
    ],
    "mobile/src/features/practice/PracticePortfolio.jsx": [
        ('symbol: "EQTY"', 'symbol: "EQT"'),
    ],
    "mobile/src/services/dashboard/dashboardHomeData.js": [
        ('mostActive: "EQTY"', 'mostActive: "EQT"'),
    ],
    "mobile/src/services/trade/marketDepthData.js": [
        ('EQTY:', 'EQT:'),
    ],
    "mobile/src/utils/demoMarketEngine.js": [
        ('EQTY:', 'EQT:'),
    ],
    "backend/src/modules/dividends/dividend.service.js": [
        ('EQTY:', 'EQT:'),
    ],
}

problems = []
for rel, reps in changes.items():
    p = root / rel
    if not p.exists():
        problems.append(f"missing target: {rel}")
        continue
    text = p.read_text(encoding="utf-8")
    original = text
    for old, new in reps:
        # idempotent: either old exists and is replaced, or new already exists.
        if old in text:
            text = text.replace(old, new)
        elif new not in text:
            problems.append(f"pattern not found in {rel}: {old}")
    if text != original:
        p.write_text(text, encoding="utf-8")
        print(f"UPDATED — {rel}")
    else:
        print(f"UNCHANGED/ALREADY CANONICAL — {rel}")

if problems:
    print("\nERROR — M20AM did not modify ambiguous/missing targets:")
    for problem in problems:
        print(" -", problem)
    sys.exit(1)

print("PC-030M20AM targeted canonical-symbol cleanup applied.")
PY
