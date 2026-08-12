#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

FILE="app/performance.js"

echo "============================================================"
echo "PC-030C2C4 — INTERACTIVE TIMELINE VERIFICATION"
echo "============================================================"

echo
echo "===== 1. SELECTION STATE ====="

grep -nE \
  'selectedTimelinePoint|setSelectedTimelinePoint' \
  "$FILE"

echo
echo "===== 2. CHART INTERACTION ====="

grep -nE \
  'onSelectPoint|selectedPoint|timelinePointHitTarget' \
  "$FILE"

echo
echo "===== 3. SNAPSHOT INSPECTOR ====="

grep -n -A180 -B10 \
  'function TimelineSnapshotInspector' \
  "$FILE"

echo
echo "===== 4. REQUIRED INSPECTOR FIELDS ====="

for label in \
  "Net Worth" \
  "Holdings Market Value" \
  "Invested Value" \
  "Available Cash" \
  "Unrealized Gain/Loss" \
  "Unrealized Return" \
  "Health Score" \
  "Health Rating" \
  "Portfolio Source" \
  "Snapshot Trigger"
do
  if grep -q \
    "label=\"$label\"" \
    "$FILE"
  then
    echo "PASS $label"
  else
    echo "FAIL $label"
    exit 1
  fi
done

echo
echo "===== 5. V2 DETAIL MAPPING ====="

for field in \
  investedValue \
  unrealizedGainLoss \
  unrealizedGainLossPct \
  healthScore \
  healthRating \
  sourceId \
  sourceLabel \
  triggerReason
do
  if grep -q \
    "snapshot?.$field" \
    "$FILE"
  then
    echo "PASS $field"
  else
    echo "FAIL $field"
    exit 1
  fi
done

echo
echo "===== 6. SINGLE OBSERVATION INSPECTION ====="

grep -q \
  'Inspect Current Snapshot' \
  "$FILE"

echo "PASS — current genuine snapshot remains inspectable."

echo
echo "===== 7. TWO-OBSERVATION CHART SAFEGUARD ====="

grep -q \
  'safePoints.length < 2' \
  "$FILE"

grep -q \
  'timeline?.points?.length >= 2' \
  "$FILE"

echo "PASS — chart still requires at least two genuine observations."

echo
echo "===== 8. BUILDING HISTORY SAFEGUARD ====="

grep -q \
  'Building Timeline History' \
  "$FILE"

grep -q \
  'will preserve N/A until enough real' \
  "$FILE"

echo "PASS — insufficient history remains explicit."

echo
echo "===== 9. NO SYNTHETIC HISTORY LANGUAGE ====="

grep -q \
  'Missing dates are not interpolated' \
  "$FILE"

grep -q \
  'create synthetic dates' \
  "$FILE"

echo "PASS — timeline remains genuine-observation only."

echo
echo "===== 10. EXISTING RANGE CONTROLS ====="

for range in \
  30D \
  90D \
  1Y \
  ALL
do
  if grep -q \
    "\"$range\"" \
    "$FILE"
  then
    echo "PASS $range"
  else
    echo "FAIL $range"
    exit 1
  fi
done

echo
echo "===== 11. SERIES CONTROLS RETAINED ====="

grep -q \
  'showTimelineHoldings' \
  "$FILE"

grep -q \
  'showTimelineCash' \
  "$FILE"

echo "PASS — Holdings and Cash overlays retained."

echo
echo "===== 12. BACKUPS INSIDE APP ====="

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
echo "===== 13. ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== 14. WEB BUILD ====="

npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2C4 verification complete."
echo "============================================================"
