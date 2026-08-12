#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

FILE="app/performance.js"

echo "============================================================"
echo "PC-030C2C4B — INTERACTIVE TIMELINE VERIFICATION"
echo "============================================================"

echo
echo "===== SELECTION STATE ====="

grep -nE \
  'selectedTimelinePoint|setSelectedTimelinePoint' \
  "$FILE"

echo
echo "===== CHART POINT INTERACTION ====="

grep -n -A32 -B10 \
  'onSelectPoint?.(point)' \
  "$FILE"

echo
echo "===== INSPECTOR ====="

grep -n -A180 -B5 \
  'function TimelineSnapshotInspector' \
  "$FILE"

echo
echo "===== V2 DETAIL MAPPING ====="

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
  grep -q \
    "snapshot?.$field" \
    "$FILE"

  echo "PASS $field"
done

echo
echo "===== SINGLE OBSERVATION INSPECTION ====="

grep -q \
  'Inspect Current Snapshot' \
  "$FILE"

echo "PASS — one genuine snapshot can be inspected."

echo
echo "===== HISTORICAL TRUTH SAFEGUARD ====="

grep -q \
  'safePoints.length < 2' \
  "$FILE"

grep -q \
  'Building Timeline History' \
  "$FILE"

grep -q \
  'Missing dates are not interpolated' \
  "$FILE"

echo "PASS — no synthetic timeline history introduced."

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
echo "===== ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== WEB BUILD ====="

npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2C4B verification complete."
echo "============================================================"
