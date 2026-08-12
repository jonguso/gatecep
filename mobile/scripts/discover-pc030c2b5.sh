#!/usr/bin/env bash

cd ~/gatecep/mobile || exit 1

echo "============================================================"
echo "PC-030C2B5 — PERFORMANCE + REBALANCING DISCOVERY"
echo "============================================================"

echo
echo "===== 1. PERFORMANCE SCREEN ====="

grep -n -A12 -B12 \
  'Portfolio Value\|Invested\|Gain\|Loss\|Return\|Cost\|Cash\|Net Worth\|performance' \
  app/performance.js \
  | head -n 320

echo
echo "===== 2. PERFORMANCE DATA LOAD ====="

sed -n '1,210p' \
  app/performance.js

echo
echo "===== 3. PERFORMANCE SERVICES ====="

find src/features/performance \
  -type f \
  \( -name "*.js" -o -name "*.jsx" \) \
  -print \
  | sort

echo
grep -RniE \
  'totalValue|holdingsValue|investedValue|investedAmount|gain|loss|return|availableCash|netWorth|practicePortfolio|loadInvestorContext|loadCanonicalRealWealthMetrics|buildCurrentPortfolioAllocation' \
  src/features/performance \
  --include="*.js" \
  --include="*.jsx" \
  | head -n 420

echo
echo "===== 4. REBALANCING SCREEN VALUES ====="

grep -n -A12 -B12 \
  'Portfolio Value\|Available Cash\|Holdings\|Drift\|Turnover\|Invested\|Current\|Target' \
  app/portfolio-rebalancing.js \
  | head -n 380

echo
echo "===== 5. REBALANCING DATA LOAD ====="

sed -n '1,230p' \
  app/portfolio-rebalancing.js

echo
echo "===== 6. REBALANCING SERVICES ====="

grep -RniE \
  'totalValue|holdingsValue|investedValue|investedAmount|availableCash|netWorth|practicePortfolio|loadInvestorContext|loadCanonicalRealWealthMetrics|buildCurrentPortfolioAllocation' \
  src/features/rebalancing \
  --include="*.js" \
  --include="*.jsx" \
  | head -n 520

echo
echo "===== 7. CANONICAL REAL METRICS CONTRACT ====="

grep -n -A120 -B20 \
  'loadCanonicalRealWealthMetrics' \
  src/features/wealth-journey/canonicalRealWealthMetricsService.js

echo
echo "===== 8. ALLOCATION ENGINE PORTFOLIO RETURN ====="

grep -n -A110 -B30 \
  'portfolio:' \
  src/features/rebalancing/allocationEngine.js \
  | head -n 240

echo
echo "===== 9. DRIFT ANALYSIS PORTFOLIO VALUES ====="

grep -n -A100 -B25 \
  'portfolio:' \
  src/features/rebalancing/driftAnalysisService.js \
  | head -n 260

echo
echo "===== 10. REBALANCE RECOMMENDATION VALUE USE ====="

grep -RniE \
  'portfolioValue|totalValue|holdingsValue|availableCash|estimatedTurnover|turnoverPercent|drift' \
  src/features/rebalancing/rebalanceRecommendationService.js \
  src/features/rebalancing/rebalanceAdvisorService.js \
  | head -n 420

echo
echo "===== 11. PERFORMANCE / REBALANCING ROUTES ====="

grep -nE \
  'router\.(push|replace)|Back to Portfolio Analytics|Portfolio Analytics' \
  app/performance.js \
  app/portfolio-rebalancing.js

echo
echo "===== 12. LEGACY PRACTICE REFERENCES ====="

grep -RniE \
  'Practice Portfolio|practicePortfolio|loadInvestorContext' \
  src/features/performance \
  src/features/rebalancing \
  app/performance.js \
  app/portfolio-rebalancing.js \
  --include="*.js" \
  --include="*.jsx" \
  | head -n 300

echo
echo "============================================================"
echo "PC-030C2B5 DISCOVERY COMPLETE"
echo "============================================================"
