#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

FILE="app/performance.js"

echo "============================================================"
echo "PC-030C2C5 — TIMELINE UX HARDENING VERIFICATION"
echo "============================================================"

echo
echo "===== 1. LARGE MOBILE HIT TARGET ====="

grep -q \
  'net-worth-hit-' \
  "$FILE"

grep -q \
  'r="22"' \
  "$FILE"

echo "PASS — 44px diameter point hit target present."

echo
echo "===== 2. SELECTED POINT GUIDE ====="

grep -q \
  'const selectedChartPoint' \
  "$FILE"

grep -q \
  'strokeDasharray="4 4"' \
  "$FILE"

grep -q \
  'r="10"' \
  "$FILE"

echo "PASS — selected guide line and outer ring present."

echo
echo "===== 3. SELECTED SNAPSHOT SUMMARY ====="

grep -q \
  'function TimelineSelectedSnapshotSummary' \
  "$FILE"

grep -q \
  'timelineSelectedSummary:' \
  "$FILE"

grep -q \
  'Net Worth' \
  "$FILE"

grep -q \
  'Return' \
  "$FILE"

echo "PASS — selected snapshot summary present."

echo
echo "===== 4. RANGE CHANGE CLEARS SELECTION ====="

python - <<'PY'
from pathlib import Path

text = Path(
    "app/performance.js"
).read_text(
    encoding="utf-8"
)

required = """setTimelineRange(range);
                      setSelectedTimelinePoint(null);"""

if required not in text:
    raise SystemExit(
        "FAIL — range change does not clear selection."
    )

print(
    "PASS — range changes clear selected point."
)
PY

echo
echo "===== 5. SERIES TOGGLES PRESERVE SELECTION ====="

python - <<'PY'
from pathlib import Path

text = Path(
    "app/performance.js"
).read_text(
    encoding="utf-8"
)

for name in [
    "setShowTimelineHoldings(",
    "setShowTimelineCash("
]:
    start = text.find(name)

    if start == -1:
        raise SystemExit(
            f"FAIL — missing {name}"
        )

    window = text[
        start:
        start + 180
    ]

    if (
        "setSelectedTimelinePoint(null)"
        in window
    ):
        raise SystemExit(
            f"FAIL — {name} clears selection."
        )

print(
    "PASS — Holdings/Cash toggles preserve selection."
)
PY

echo
echo "===== 6. GENUINE HISTORY SAFEGUARD ====="

grep -q \
  'safePoints.length < 2' \
  "$FILE"

grep -q \
  'Building Timeline History' \
  "$FILE"

grep -q \
  'Missing dates are not interpolated' \
  "$FILE"

grep -q \
  'beforeBoundary' \
  "$FILE"

echo "PASS — historical truth safeguards preserved."

echo
echo "===== 7. CURRENT POINT INTERACTION ====="

grep -n -A95 -B20 \
  'net-worth-hit-' \
  "$FILE"

echo
echo "===== 8. SELECTED SUMMARY ====="

grep -n -A90 -B5 \
  'function TimelineSelectedSnapshotSummary' \
  "$FILE"

echo
echo "===== 9. BACKUPS INSIDE APP ====="

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
echo "===== 10. ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== 11. WEB BUILD ====="

npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2C5 verification complete."
echo "============================================================"
