#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "============================================================"
echo "PC-030C2C3 — PORTFOLIO TIMELINE VERIFICATION"
echo "============================================================"

FILE="app/performance.js"

echo
echo "===== 1. SVG DEPENDENCY ====="

grep -n -A8 -B3 \
  'react-native-svg' \
  "$FILE"

echo
echo "===== 2. TIMELINE STATE ====="

grep -nE \
  'timelineRange|showTimelineHoldings|showTimelineCash|useWindowDimensions' \
  "$FILE" \
  | head -n 80

echo
echo "===== 3. PORTFOLIO TIMELINE UI ====="

grep -n -A230 -B8 \
  'Portfolio Value Timeline' \
  "$FILE" \
  | head -n 280

echo
echo "===== 4. RANGE SELECTOR ====="

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
echo "===== 5. TIMELINE CHART ====="

grep -n -A260 \
  'function PortfolioTimelineChart' \
  "$FILE" \
  | head -n 300

echo
echo "===== 6. CANONICAL HISTORY SOURCE ====="

grep -n -A180 \
  'function buildTimelineView' \
  "$FILE" \
  | head -n 220

echo
echo "===== 7. REQUIRED SERIES ====="

python - <<'PY'
from pathlib import Path

text = Path(
    "app/performance.js"
).read_text(
    encoding="utf-8"
)

required = [
    "point.netWorth",
    "point.holdingsValue",
    "point.availableCash",
    'pathFor("netWorth")',
    'pathFor("holdingsValue")',
    'pathFor("availableCash")'
]

for item in required:
    if item not in text:
        print(
            f"FAIL — missing {item}"
        )
        raise SystemExit(1)

    print(
        f"PASS {item}"
    )

print()
print(
    "PASS — timeline consumes Net Worth, Holdings and Cash."
)
PY

echo
echo "===== 8. NO SYNTHETIC HISTORY ====="

grep -q \
  'Missing dates are not interpolated' \
  "$FILE"

grep -q \
  'without.*inventing\|not.*interpolat\|synthetic' \
  "$FILE"

echo "PASS — timeline declares real-observation-only behavior."

echo
echo "===== 9. INSUFFICIENT HISTORY ====="

grep -n -A20 -B5 \
  'Building Timeline History' \
  "$FILE"

echo
echo "===== 10. PC-030C2C2 RETAINED ====="

for section in \
  "Historical Performance" \
  "Portfolio Drawdown" \
  "Portfolio Health Trend" \
  "Snapshot History"
do
  if grep -q \
    "$section" \
    "$FILE"
  then
    echo "PASS $section"
  else
    echo "FAIL $section"
    exit 1
  fi
done

echo
echo "===== 11. CURRENT CANONICAL METRICS RETAINED ====="

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
echo "===== 12. ADVANCED PERFORMANCE SERVICE UNTOUCHED ====="

test -f \
  src/features/performance/performanceChartService.js

test -f \
  src/features/performance/portfolioPerformanceService.js

echo "PASS — advanced performance services remain separate."

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

echo
echo "===== 14. ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== 15. WEB BUILD ====="

npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2C3 verification complete."
echo "============================================================"
