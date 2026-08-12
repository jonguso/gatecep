#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "============================================================"
echo "PC-030C2B2 — REAL ANALYTICS VERIFICATION"
echo "============================================================"

echo
echo "===== ALLOCATION ENGINE SOURCE ====="

grep -n -A55 -B10 \
  'loadCanonicalRealWealthMetrics\|sourceType.*REAL\|REAL-ALL' \
  src/features/rebalancing/allocationEngine.js \
  | head -n 120

echo
echo "===== UNIFIED ANALYTICS SOURCE ====="

grep -n -A85 -B12 \
  'loadCanonicalRealWealthMetrics\|analyticsPortfolioSource\|REAL-ALL' \
  src/features/analytics/unifiedPortfolioAnalyticsService.js \
  | head -n 180

echo
echo "===== PRACTICE SOURCE MUST NOT DRIVE ALLOCATION ====="

if grep -n \
  'await loadInvestorContext' \
  src/features/rebalancing/allocationEngine.js
then
  echo
  echo "ERROR: allocation engine still loads Investor Context."
  exit 1
else
  echo "PASS — allocation engine no longer loads Practice from Investor Context."
fi

echo
echo "===== UNIFIED ANALYTICS MUST NOT LOAD INVESTOR CONTEXT ====="

if grep -n \
  'await loadInvestorContext' \
  src/features/analytics/unifiedPortfolioAnalyticsService.js
then
  echo
  echo "ERROR: Unified Analytics still loads Investor Context directly."
  exit 1
else
  echo "PASS — Unified Analytics uses canonical real wealth metrics."
fi

echo
echo "===== REAL ANALYTICS SAFEGUARD ====="

grep -n \
  'sourceType:\|sourceId:\|analyticsPortfolioSource:' \
  src/features/rebalancing/allocationEngine.js \
  src/features/analytics/unifiedPortfolioAnalyticsService.js \
  | head -n 80

echo
echo "===== OLD PRACTICE REQUIREMENT TEXT ====="

if grep -Rni \
  'A funded Practice Portfolio is required before drift can be calculated\|A Practice Portfolio is required before unified analytics can be generated' \
  src/features/analytics \
  src/features/rebalancing
then
  echo
  echo "ERROR: old Practice-only analytics requirement remains."
  exit 1
else
  echo "PASS — real analytics no longer requires Practice Portfolio."
fi

echo
echo "===== NAVIGATION ====="

echo "--- Unified Analytics ---"

grep -n -A5 -B5 \
  'Back to Portfolio Hub' \
  app/unified-portfolio-analytics.js

echo
echo "--- Risk ---"

grep -n -A5 -B5 \
  'Back to Portfolio Analytics' \
  app/portfolio-risk.js

echo
echo "--- Performance ---"

grep -n -A5 -B5 \
  'Portfolio Analytics' \
  app/performance.js \
  | head -n 30

echo
echo "--- Rebalancing ---"

grep -n -A7 -B7 \
  'Back to Portfolio Analytics' \
  app/portfolio-rebalancing.js

echo
echo "===== REQUIRED NAVIGATION ROUTES ====="

grep -q \
  'router.replace("/portfolio-hub")' \
  app/unified-portfolio-analytics.js

echo "PASS Unified Analytics -> Portfolio Hub"

grep -q \
  'router.replace("/unified-portfolio-analytics")' \
  app/portfolio-risk.js

echo "PASS Risk -> Unified Analytics"

grep -q \
  'router.replace("/unified-portfolio-analytics")' \
  app/performance.js

echo "PASS Performance -> Unified Analytics"

grep -q \
  '"/unified-portfolio-analytics"' \
  app/portfolio-rebalancing.js

echo "PASS Rebalancing -> Unified Analytics"

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
echo "============================================================"
echo "PC-030C2B2 verification complete."
echo "============================================================"
