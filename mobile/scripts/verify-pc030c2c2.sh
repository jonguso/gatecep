#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "============================================================"
echo "PC-030C2C2 — PERFORMANCE HISTORICAL UI VERIFICATION"
echo "============================================================"

FILE="app/performance.js"

echo
echo "===== 1. HISTORICAL SERVICE WIRING ====="

grep -nE \
  'buildHistoricalPerformanceSummary|historicalSummary' \
  "$FILE"

echo
echo "===== 2. HISTORICAL PERIOD UI ====="

grep -n -A130 -B8 \
  'Historical Performance' \
  "$FILE"

echo
echo "===== 3. PERIOD COVERAGE ====="

for label in \
  7D \
  30D \
  90D \
  YTD \
  1Y
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

grep -q \
  'label="Since First"' \
  "$FILE"

echo "PASS Since First"

echo
echo "===== 4. DRAWDOWN UI ====="

grep -n -A90 -B5 \
  'Portfolio Drawdown' \
  "$FILE"

echo
echo "===== 5. HEALTH TREND UI ====="

grep -n -A100 -B5 \
  'Portfolio Health Trend' \
  "$FILE"

echo
echo "===== 6. N/A SAFEGUARD ====="

grep -q \
  'Insufficient history' \
  "$FILE"

echo "PASS — unavailable periods use N/A / insufficient history."

echo
echo "===== 7. CURRENT CANONICAL METRICS RETAINED ====="

for label in \
  "Holdings Market Value" \
  "Invested Value" \
  "Available Cash" \
  "Unrealized Gain/Loss" \
  "Health Score"
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
echo "===== 8. OLD SINGLE HISTORY CARD REMOVED ====="

COUNT="$(
  grep -c \
    'label="Change Since First Snapshot"' \
    "$FILE" \
    || true
)"

echo "Count: $COUNT"

if [ "$COUNT" -ne 0 ]; then
  echo "ERROR — obsolete single historical summary remains."
  exit 1
fi

echo "PASS — period intelligence supersedes old single comparison."

echo
echo "===== 9. SNAPSHOT HISTORY RETAINED ====="

grep -q \
  'Snapshot History' \
  "$FILE"

echo "PASS — raw snapshot history remains available."

echo
echo "===== 10. NAVIGATION RETAINED ====="

grep -q \
  'router.replace("/unified-portfolio-analytics")' \
  "$FILE"

echo "PASS — Performance returns to Portfolio Analytics."

echo
echo "===== 11. BACKUPS INSIDE APP ====="

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
echo "===== 12. ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== 13. WEB BUILD ====="

npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2C2 verification complete."
echo "============================================================"
