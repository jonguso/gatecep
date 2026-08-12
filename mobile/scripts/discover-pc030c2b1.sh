#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "============================================================"
echo "PC-030C2B1 — ANALYTICS ENGINE SOURCE DISCOVERY"
echo "============================================================"

echo
echo "===== UNIFIED ANALYTICS BUILD FUNCTION ====="

grep -n -A180 -B30 \
  'export async function buildUnifiedPortfolioAnalytics' \
  src/features/analytics/unifiedPortfolioAnalyticsService.js

echo
echo "===== RISK ADVISOR ====="

sed -n '1,420p' \
  src/features/risk/riskAdvisorService.js

echo
echo "===== RISK SOURCE DEPENDENCIES ====="

grep -RniE \
  'practicePortfolio|loadInvestorContext|loadUnifiedPortfolio|loadCanonicalReal|holdings|availableCash' \
  src/features/risk \
  --include="*.js" \
  | head -n 500

echo
echo "===== PERFORMANCE ADVISOR ====="

sed -n '1,420p' \
  src/features/performance/performanceAdvisorService.js

echo
echo "===== PERFORMANCE SOURCE DEPENDENCIES ====="

grep -RniE \
  'practicePortfolio|loadInvestorContext|loadUnifiedPortfolio|loadCanonicalReal|holdings|availableCash|snapshot' \
  src/features/performance \
  --include="*.js" \
  | head -n 500

echo
echo "===== REBALANCING ADVISOR ====="

sed -n '1,420p' \
  src/features/rebalancing/rebalanceAdvisorService.js

echo
echo "===== DRIFT ANALYSIS ====="

sed -n '1,420p' \
  src/features/rebalancing/driftAnalysisService.js

echo
echo "===== REBALANCING SOURCE DEPENDENCIES ====="

grep -RniE \
  'practicePortfolio|loadInvestorContext|loadUnifiedPortfolio|loadCanonicalReal|holdings|availableCash' \
  src/features/rebalancing \
  --include="*.js" \
  | head -n 600

echo
echo "===== EXECUTIVE ACTION QUEUE SOURCE ====="

grep -n -A220 -B30 \
  'export async function buildExecutiveActionQueue' \
  src/features/analytics/executiveActionQueueService.js

echo
echo "===== CANONICAL REAL WEALTH SERVICE — FULL BUILD SECTION ====="

grep -n -A220 -B50 \
  'buildCanonicalRealWealthContext' \
  src/features/wealth-journey/canonicalRealWealthMetricsService.js

echo
echo "===== PERFORMANCE BACK BUTTON ====="

grep -n -A20 -B15 \
  'Back to Dashboard\|router.replace\|router.push' \
  app/performance.js

echo
echo "===== REBALANCING BACK BUTTON ====="

grep -n -A20 -B15 \
  'Back to Dashboard\|router.replace\|router.push' \
  app/portfolio-rebalancing.js

echo
echo "============================================================"
echo "PC-030C2B1 DISCOVERY COMPLETE"
echo "============================================================"
