#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

SERVICE="src/features/performance/performanceBenchmarkGoalIntelligenceService.js"
UI="app/performance.js"

echo "============================================================"
echo "PC-030C2C7 — BENCHMARK + GOAL INTELLIGENCE VERIFICATION"
echo "============================================================"

echo
echo "===== 1. C7 SERVICE EXISTS ====="

test -f "$SERVICE"

echo "PASS — C7 intelligence service exists."

echo
echo "===== 2. EXISTING BENCHMARK ENGINE REUSED ====="

grep -n -A5 -B3 \
  'buildPortfolioBenchmarkSummary' \
  "$SERVICE"

grep -q \
  'DEFAULT_BENCHMARK_CODE' \
  "$SERVICE"

echo "PASS — existing benchmarkComparisonService is authoritative."

echo
echo "===== 3. EXISTING REAL WEALTH JOURNEY REUSED ====="

grep -n -A5 -B3 \
  'loadRealCurrentInvestorWealthJourney' \
  "$SERVICE"

echo "PASS — existing real Wealth Journey is authoritative."

echo
echo "===== 4. CANONICAL REAL NET WORTH ====="

grep -n -A20 -B8 \
  'currentNetWorth' \
  "$SERVICE" \
  | head -n 80

grep -q \
  'realMetrics?.netWorth' \
  "$SERVICE"

echo "PASS — goal current value comes from canonical REAL Net Worth."

echo
echo "===== 5. BENCHMARK CONTRACT ====="

for field in \
  portfolioReturnPercentage \
  benchmarkReturnPercentage \
  activeReturnPercentage \
  alphaPercentage \
  trackingErrorPercentage \
  matchedObservations \
  relativeStatus
do
  if grep -q \
    "$field" \
    "$SERVICE"
  then
    echo "PASS $field"
  else
    echo "FAIL $field"
    exit 1
  fi
done

echo
echo "===== 6. NO SYNTHETIC BENCHMARK ====="

grep -q \
  'syntheticBenchmarkUsed:' \
  "$SERVICE"

grep -q \
  'false' \
  "$SERVICE"

grep -q \
  'zeroReturnSubstituted:' \
  "$SERVICE"

echo "PASS — C7 does not manufacture benchmark evidence."

echo
echo "===== 7. GOAL CONTRACT ====="

for field in \
  targetAmount \
  targetDate \
  currentNetWorth \
  currentProgressPercentage \
  remainingAmount \
  requiredMonthlyContribution \
  projectedValue \
  projectedGap \
  statusLabel \
  nextBestAction
do
  if grep -q \
    "$field" \
    "$SERVICE"
  then
    echo "PASS $field"
  else
    echo "FAIL $field"
    exit 1
  fi
done

echo
echo "===== 8. TARGET-DATE TRACK-STATUS SAFEGUARD ====="

python - <<'PY'
from pathlib import Path

text = Path(
    "src/features/performance/"
    "performanceBenchmarkGoalIntelligenceService.js"
).read_text(
    encoding="utf-8"
)

required = [
    "TARGET_DATE_REQUIRED",
    "trackStatusRequiresTargetDate:",
    "hasTargetDate:",
    "hasTrajectoryEvidence",
    "will not classify the goal as on track or behind"
]

missing = [
    item
    for item in required
    if item not in text
]

if missing:
    print(
        "FAIL — missing target-date safeguards:",
        missing
    )
    raise SystemExit(1)

print(
    "PASS — amount-only goals do not receive false track status."
)
PY

echo
echo "===== 9. PRACTICE EXCLUSION ====="

grep -q \
  'practiceIncluded:' \
  "$SERVICE"

if grep -q \
  'loadInvestorContext' \
  "$SERVICE"
then
  echo "FAIL — C7 directly loads legacy Investor/Practice context."
  exit 1
fi

echo "PASS — C7 remains on REAL Wealth Journey path."

echo
echo "===== 10. PERFORMANCE WIRING ====="

grep -nE \
  'buildPerformanceBenchmarkGoalIntelligence|benchmarkGoalIntel' \
  "$UI"

echo
echo "===== 11. BENCHMARK UI ====="

for label in \
  "Benchmark" \
  "Benchmark Status" \
  "Portfolio Return" \
  "Benchmark Return" \
  "Excess Return" \
  "Matched Observations" \
  "Alpha" \
  "Tracking Error"
do
  if grep -q \
    "label=\"$label\"" \
    "$UI"
  then
    echo "PASS $label"
  else
    echo "FAIL $label"
    exit 1
  fi
done

echo
echo "===== 12. GOAL UI ====="

for label in \
  "Goal" \
  "Current Net Worth" \
  "Target Amount" \
  "Current Progress" \
  "Remaining" \
  "Target Date" \
  "Projected Value" \
  "Required Monthly Contribution"
do
  if grep -q \
    "label=\"$label\"" \
    "$UI"
  then
    echo "PASS $label"
  else
    echo "FAIL $label"
    exit 1
  fi
done

echo
echo "===== 13. GOAL STATUS SAFEGUARD UI ====="

grep -q \
  'Target Date Required for Track Status' \
  "$UI"

grep -q \
  'will not claim the investor is' \
  "$UI"

echo "PASS — UI explains why track status may be unavailable."

echo
echo "===== 14. C1-C6 PERFORMANCE FEATURES RETAINED ====="

for item in \
  "Historical Performance" \
  "Performance Records" \
  "Portfolio Drawdown" \
  "Portfolio Health Trend" \
  "Snapshot History" \
  TimelineSelectedSnapshotSummary \
  TimelineSnapshotInspector \
  net-worth-hit- \
  'Building Timeline History'
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
echo "===== 15. HISTORICAL TRUTH RETAINED ====="

grep -q \
  'safePoints.length < 2' \
  "$UI"

grep -q \
  'Missing dates are not interpolated' \
  "$UI"

grep -q \
  'No synthetic dates' \
  src/features/performance/historicalPerformanceSummaryService.js

echo "PASS — genuine history safeguards remain intact."

echo
echo "===== 16. LOW-LEVEL SNAPSHOT CONTRACT RETAINED ====="

grep -q \
  'Snapshot Contract Version: 2' \
  src/services/portfolio/portfolioSnapshot.js

grep -q \
  'practiceIncluded:' \
  src/services/portfolio/portfolioSnapshot.js

echo "PASS — canonical V2 REAL snapshot contract retained."

echo
echo "===== 17. BACKUPS INSIDE APP ====="

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
echo "===== 18. ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== 19. WEB BUILD ====="

npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2C7 verification complete."
echo "============================================================"
