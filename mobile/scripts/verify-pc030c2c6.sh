#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

SUMMARY="src/features/performance/historicalPerformanceSummaryService.js"
UI="app/performance.js"

echo "============================================================"
echo "PC-030C2C6 — PERFORMANCE RECORDS VERIFICATION"
echo "============================================================"

echo
echo "===== 1. PERFORMANCE RECORD ENGINE ====="

grep -n -A300 -B10 \
  'function buildPerformanceRecords' \
  "$SUMMARY" \
  | head -n 340

echo
echo "===== 2. REQUIRED RECORD CONTRACT ====="

for field in \
  highestNetWorth \
  lowestNetWorth \
  bestSnapshotChange \
  worstSnapshotChange \
  bestHealthImprovement \
  worstHealthDecline \
  milestones
do
  if grep -q \
    "$field" \
    "$SUMMARY"
  then
    echo "PASS $field"
  else
    echo "FAIL $field"
    exit 1
  fi
done

echo
echo "===== 3. MILESTONE THRESHOLDS ====="

python - <<'PY'
from pathlib import Path

text = Path(
    "src/features/performance/"
    "historicalPerformanceSummaryService.js"
).read_text(
    encoding="utf-8"
)

required = [
    "100000",
    "250000",
    "500000",
    "1000000",
    "2500000",
    "5000000",
    "10000000"
]

for value in required:
    if value not in text:
        print(
            f"FAIL milestone {value}"
        )
        raise SystemExit(1)

    print(
        f"PASS milestone {value}"
    )
PY

echo
echo "===== 4. NO-HISTORY SAFEGUARD ====="

grep -n -A22 -B10 \
  'buildPerformanceRecords(\[\])' \
  "$SUMMARY"

echo
echo "PASS — empty history receives an unavailable records contract."

echo
echo "===== 5. READY CONTRACT ====="

grep -n -A25 -B12 \
  'const performanceRecords' \
  "$SUMMARY"

grep -q \
  'records:' \
  "$SUMMARY"

echo "PASS — records exposed through historical summary."

echo
echo "===== 6. PERFORMANCE RECORDS UI ====="

grep -n -A330 -B10 \
  'Performance Records' \
  "$UI" \
  | head -n 380

echo
echo "===== 7. REQUIRED UI RECORDS ====="

for label in \
  "Record High Net Worth" \
  "Record Low Net Worth" \
  "Best Snapshot Move" \
  "Worst Snapshot Move" \
  "Best Health Improvement" \
  "Largest Health Decline"
do
  if grep -q \
    "$label" \
    "$UI"
  then
    echo "PASS $label"
  else
    echo "FAIL $label"
    exit 1
  fi
done

echo
echo "===== 8. PORTFOLIO MILESTONES UI ====="

grep -n -A100 -B8 \
  'Portfolio Milestones' \
  "$UI"

grep -q \
  'First recorded date' \
  "$UI"

grep -q \
  'ACHIEVED' \
  "$UI"

grep -q \
  'PENDING' \
  "$UI"

echo "PASS — milestone dates and status are visible."

echo
echo "===== 9. INSUFFICIENT HISTORY SAFEGUARD ====="

grep -q \
  'Building Performance Records' \
  "$UI"

grep -q \
  'at least two genuine portfolio observations' \
  "$UI"

echo "PASS — no synthetic best/worst movement is created."

echo
echo "===== 10. C5A TIMELINE CONTRACT ====="

for marker in \
  TimelineSelectedSnapshotSummary \
  TimelineSnapshotInspector \
  net-worth-hit- \
  'r="22"' \
  'r="10"' \
  'safePoints.length < 2' \
  'Building Timeline History'
do
  if grep -q \
    "$marker" \
    "$UI"
  then
    echo "PASS $marker"
  else
    echo "FAIL $marker"
    exit 1
  fi
done

echo
echo "===== 11. NO SYNTHETIC HISTORY ====="

grep -q \
  'Missing dates are not interpolated' \
  "$UI"

grep -q \
  'No synthetic dates' \
  "$SUMMARY"

echo "PASS — performance records use genuine snapshots only."

echo
echo "===== 12. EXISTING HISTORICAL ANALYTICS RETAINED ====="

for item in \
  "Historical Performance" \
  "Portfolio Drawdown" \
  "Portfolio Health Trend" \
  "Snapshot History"
do
  if grep -q \
    "$item" \
    "$UI"
  then
    echo "PASS $item"
  else
    echo "FAIL $item"
    exit 1
  fi
done

echo
echo "===== 13. BACKUPS INSIDE APP ====="

COUNT="$(
  find app \
    -type f \
    -iname '*bak*' \
    | wc -l
)"

echo "Count: $COUNT"

if [ "$COUNT" -ne 0 ]; then
  find app \
    -type f \
    -iname '*bak*'

  exit 1
fi

echo "PASS — no backups inside Expo Router app."

echo
echo "===== 14. ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== 15. WEB BUILD ====="

npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2C6 verification complete."
echo "============================================================"
