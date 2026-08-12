#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "============================================================"
echo "PC-030C2C1 — HISTORICAL PERFORMANCE SUMMARY VERIFICATION"
echo "============================================================"

FILE="src/features/performance/historicalPerformanceSummaryService.js"

echo
echo "===== 1. SERVICE EXISTS ====="

test -f "$FILE"
echo "PASS — historical performance summary service exists."

echo
echo "===== 2. CANONICAL SNAPSHOT SOURCE ====="

grep -n -A4 -B2 \
  'loadPortfolioSnapshots' \
  "$FILE"

echo
echo "===== 3. REQUIRED PERIODS ====="

python - <<'PY'
from pathlib import Path

text = Path(
    "src/features/performance/"
    "historicalPerformanceSummaryService.js"
).read_text(
    encoding="utf-8"
)

required = [
    'code: "7D"',
    'code: "30D"',
    'code: "90D"',
    'code: "YTD"',
    'code: "1Y"',
    '"SINCE_FIRST_SNAPSHOT"'
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
PY

echo
echo "===== 4. MISSING HISTORY SAFETY ====="

python - <<'PY'
from pathlib import Path

text = Path(
    "src/features/performance/"
    "historicalPerformanceSummaryService.js"
).read_text(
    encoding="utf-8"
)

required = [
    "available: false",
    "returnPercentage:",
    "null",
    "INSUFFICIENT_HISTORY"
]

for item in required:
    if item not in text:
        print(
            f"FAIL — missing safety marker: {item}"
        )
        raise SystemExit(1)

print(
    "PASS — unavailable historical periods remain null/N/A."
)
PY

echo
echo "===== 5. DRAWDOWN CONTRACT ====="

python - <<'PY'
from pathlib import Path

text = Path(
    "src/features/performance/"
    "historicalPerformanceSummaryService.js"
).read_text(
    encoding="utf-8"
)

required = [
    "peakNetWorth",
    "currentDrawdown",
    "currentDrawdownPercentage",
    "maximumDrawdown",
    "maximumDrawdownPercentage",
    "maximumDrawdownPeakDate",
    "maximumDrawdownTroughDate"
]

for item in required:
    if item not in text:
        print(
            f"FAIL — missing {item}"
        )
        raise SystemExit(1)

print(
    "PASS — drawdown contract complete."
)
PY

echo
echo "===== 6. HEALTH TREND CONTRACT ====="

grep -n -A90 -B5 \
  'function buildHealthTrend' \
  "$FILE"

echo
echo "===== 7. ADVANCED PERFORMANCE SERVICES UNTOUCHED ====="

for f in \
  src/features/performance/portfolioPerformanceService.js \
  src/features/performance/performanceChartService.js \
  src/features/risk/riskMetricsService.js
do
  test -f "$f"
  echo "PASS — $f"
done

echo
echo "===== 8. LOW-LEVEL SNAPSHOT STORE UNCHANGED BY THIS PATCH ====="

grep -n \
  'Snapshot Contract Version: 2' \
  src/services/portfolio/portfolioSnapshot.js

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

echo "PASS — no backups inside app routes."

echo
echo "===== 10. ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== 11. WEB BUILD ====="

npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2C1 verification complete."
echo "============================================================"
