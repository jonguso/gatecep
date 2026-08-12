#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

FILE="app/performance.js"

echo "============================================================"
echo "PC-030C2C5A — TIMELINE POINT CLEANUP VERIFICATION"
echo "============================================================"

echo
echo "===== 1. VISIBLE NET WORTH POINT ====="

grep -n -A35 -B12 \
  'key={`net-worth-${point.date}-${index}`}' \
  "$FILE"

echo
echo "===== 2. DUPLICATE CX SAFEGUARD ====="

python - <<'PY'
from pathlib import Path
import re

text = Path(
    "app/performance.js"
).read_text(
    encoding="utf-8"
)

bad = re.search(
    r'cx=\{xForIndex\(index\)\}\s+'
    r'cx=\{xForIndex\(index\)\}',
    text
)

if bad:
    print(
        "FAIL — duplicate cx attribute remains."
    )
    raise SystemExit(1)

print(
    "PASS — duplicate cx attribute removed."
)
PY

echo
echo "===== 3. C5 HIT TARGET RETAINED ====="

grep -q \
  'net-worth-hit-' \
  "$FILE"

grep -q \
  'r="22"' \
  "$FILE"

echo "PASS — 44px interaction target retained."

echo
echo "===== 4. SELECTION RING RETAINED ====="

grep -q \
  'r="10"' \
  "$FILE"

grep -q \
  'strokeDasharray="4 4"' \
  "$FILE"

echo "PASS — selection ring and guide retained."

echo
echo "===== 5. SNAPSHOT UX RETAINED ====="

grep -q \
  'function TimelineSelectedSnapshotSummary' \
  "$FILE"

grep -q \
  'function TimelineSnapshotInspector' \
  "$FILE"

echo "PASS — summary and full inspector retained."

echo
echo "===== 6. HISTORICAL TRUTH RETAINED ====="

grep -q \
  'safePoints.length < 2' \
  "$FILE"

grep -q \
  'Building Timeline History' \
  "$FILE"

grep -q \
  'Missing dates are not interpolated' \
  "$FILE"

echo "PASS — genuine history safeguards retained."

echo
echo "===== 7. BACKUPS INSIDE APP ====="

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
echo "===== 8. ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== 9. WEB BUILD ====="

npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2C5A verification complete."
echo "============================================================"
