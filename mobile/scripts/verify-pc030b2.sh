#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== CANONICAL COACH CALLERS ====="

grep -Rni -B2 -A3 \
  '"/(tabs)/coach"' \
  app/analysis-ready.js \
  app/order-book.js \
  app/portfolio-command-center.js \
  app/portfolio-sync-center.js \
  app/watchlist-old.js \
  src/services/alerts/alertStore.js

echo
echo "===== REMAINING COACH-INSIGHTS CALLERS ====="

grep -Rni -B4 -A5 \
  '"/coach-insights"' \
  app src \
  --include="*.js" \
  --include="*.jsx"

echo
echo "Expected deliberate callers:"
echo "  app/(tabs)/coach.js -> Recommendation Workspace"
echo "  app/trade-basket.js -> create missing trade basket"

echo
echo "===== VERIFY ONLY DELIBERATE CALLERS REMAIN ====="

python - <<'PY'
from pathlib import Path
import re

root = Path.home() / "gatecep/mobile"

allowed = {
    "app/(tabs)/coach.js",
    "app/trade-basket.js"
}

found = set()

for base in [root / "app", root / "src"]:
    for path in list(base.rglob("*.js")) + list(base.rglob("*.jsx")):
        text = path.read_text(
            encoding="utf-8",
            errors="ignore"
        )

        if '"/coach-insights"' in text:
            found.add(
                path.relative_to(root)
                .as_posix()
            )

unexpected = found - allowed
missing = allowed - found

print("Found:", sorted(found))

if unexpected:
    print(
        "ERROR unexpected callers:",
        sorted(unexpected)
    )
    raise SystemExit(1)

if missing:
    print(
        "ERROR expected deliberate caller missing:",
        sorted(missing)
    )
    raise SystemExit(1)

print(
    "PASS — /coach-insights is now specialized-only."
)
PY

echo
echo "===== COACH DASHBOARD COMPATIBILITY ====="

grep -n \
  'Legacy compatibility route\|router.replace("/(tabs)/coach")\|Opening Coach G' \
  app/coach-dashboard.js

echo
echo "===== COACH DASHBOARD REFERENCES ====="

if grep -Rni \
  '"/coach-dashboard"' \
  app src \
  --include="*.js" \
  --include="*.jsx"
then
  echo
  echo "ERROR: active coach-dashboard callers remain."
  exit 1
else
  echo "PASS — no active callers use /coach-dashboard."
fi

echo
echo "===== ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== BACKUPS INSIDE APP ====="

COUNT="$(
  find app \
    -type f \
    -iname '*bak*' \
    | wc -l
)"

echo "Count: $COUNT"

if [ "$COUNT" -ne 0 ]; then
  find app -type f -iname '*bak*'
  exit 1
fi

echo
echo "PC-030B2 verification complete."
