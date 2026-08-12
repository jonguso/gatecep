#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== SHARED ENGINE ====="
grep -n \
  "calculatePortfolioSummary\|netWorth = totalValue + totalCash" \
  ../shared/portfolio/engine.js \
  ../shared/portfolio/calculations.js

echo
echo "===== DASHBOARD ADOPTION ====="
grep -n \
  "calculateSharedPortfolioSummary\|legacyPortfolioSummary\|selectedViewNetWorth" \
  app/'(tabs)'/dashboard.js

echo
echo "===== PORTFOLIO HUB ADOPTION ====="
grep -n \
  "calculateSharedPortfolioSummary\|sharedPortfolio\|sharedSummary\|portfolioCash\|hub.netWorth" \
  app/portfolio-hub.js

echo
echo "===== WEALTH JOURNEY ADOPTION ====="
grep -n \
  "calculateSharedPortfolioSummary\|sharedResult\|shared?.netWorth" \
  src/features/wealth-journey/canonicalRealWealthMetricsService.js

echo
echo "===== SYNTAX ====="
node --check app/'(tabs)'/dashboard.js
node --check app/portfolio-hub.js
node --check src/features/wealth-journey/canonicalRealWealthMetricsService.js
node --check ../shared/portfolio/engine.js
node --check ../shared/portfolio/calculations.js

echo
echo "PC-028Q verification complete."
