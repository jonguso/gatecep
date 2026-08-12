#!/usr/bin/env bash
set -euo pipefail

ROOT="${GATECEP_MOBILE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

echo "============================================================"
echo "PC-030C2B9 — SNAPSHOT LIFECYCLE VERIFICATION"
echo "============================================================"

echo
echo "===== 1. SNAPSHOT TRIGGER SERVICE ====="

sed -n '1,220p' \
  src/services/portfolio/portfolioSnapshotTrigger.js

echo
echo "===== 2. SNAPSHOT TRIGGER METADATA ====="

grep -n -A14 -B8 \
  'triggerReason' \
  src/services/portfolio/portfolioSnapshot.js

echo
echo "===== 3. ACTIVE LIFECYCLE TRIGGERS ====="

grep -Rni -A5 -B5 \
  'refreshCanonicalRealPortfolioSnapshot' \
  app \
  src/services/brokers \
  src/services/portfolio \
  --include="*.js" \
  --include="*.jsx"

echo
echo "===== 4. REQUIRED REASONS ====="

for reason in \
  PERFORMANCE_OPEN \
  MANUAL_PORTFOLIO_ENTRY \
  CONFIRMED_PORTFOLIO_IMPORT \
  CASH_STATEMENT_UPDATE \
  TRADE_COMMIT \
  BASKET_TRADE_COMMIT \
  BROKER_PORTFOLIO_SYNC
do
  if grep -Rqs \
    "\"$reason\"" \
    app \
    src/services
  then
    echo "PASS $reason"
  else
    echo "FAIL $reason"
    exit 1
  fi
done

echo
echo "===== 5. PERFORMANCE SAFETY REFRESH ====="

grep -n -A8 -B6 \
  'PERFORMANCE_OPEN' \
  app/performance.js

echo
echo "===== 6. CONFIRMED IMPORT BOUNDARY ====="

grep -n -A14 -B12 \
  'CONFIRMED_PORTFOLIO_IMPORT' \
  app/review-portfolio-import.js

echo
echo "===== 7. CASH COMMIT BOUNDARY ====="

grep -n -A14 -B12 \
  'CASH_STATEMENT_UPDATE' \
  app/'(tabs)'/funds.js

echo
echo "===== 8. TRADE BOUNDARIES ====="

grep -n -A10 -B10 \
  'TRADE_COMMIT\|BASKET_TRADE_COMMIT' \
  app/trade.js

echo
echo "===== 9. BROKER PORTFOLIO SYNC ====="

grep -n -A12 -B12 \
  'BROKER_PORTFOLIO_SYNC' \
  src/services/brokers/brokerPortfolioSync.js

echo
echo "===== 10. LOW-LEVEL PORTFOLIO STORE SAFEGUARD ====="

if grep -n \
  'refreshCanonicalRealPortfolioSnapshot' \
  src/services/portfolio/portfolioStore.js
then
  echo
  echo "ERROR — snapshot trigger was placed inside portfolioStore."
  exit 1
else
  echo "PASS — ordinary load/revaluation cannot create snapshots."
fi

echo
echo "===== 11. REAL BROKER RECONCILIATION BOUNDARY ====="

if grep -n -E \
  'savePracticePortfolio|practicePortfolio' \
  src/features/broker-sync/brokerPortfolioImportExecutionService.js \
  src/features/broker-sync/brokerReconciliationService.js
then
  echo
  echo "ERROR — active broker reconciliation still depends on Practice."
  exit 1
fi

grep -q 'saveCanonicalRealBrokerPortfolio' \
  src/features/broker-sync/brokerPortfolioImportExecutionService.js
grep -q 'refreshCanonicalRealPortfolioSnapshot' \
  src/features/broker-sync/canonicalRealBrokerPortfolioService.js
echo "PASS — approved broker reconciliation uses the canonical REAL mutation boundary."

echo
echo "===== 12. CORPORATE ACTION EXCLUSION ====="

if grep -n \
  'refreshCanonicalRealPortfolioSnapshot' \
  app/corporate-actions.js
then
  echo
  echo "ERROR — monitoring-only Corporate Actions trigger snapshots."
  exit 1
else
  echo "PASS — Corporate Actions remains monitoring-only."
fi

echo
echo "===== 13. TRANSACTION HISTORY EXCLUSION ====="

if grep -n \
  'refreshCanonicalRealPortfolioSnapshot' \
  app/transaction-import.js \
  app/transactions-upload.js
then
  echo
  echo "ERROR — transaction history import creates portfolio snapshot."
  exit 1
else
  echo "PASS — transaction history alone does not mutate portfolio value."
fi

echo
echo "===== 14. DIRECT CANONICAL WRITER CALLERS ====="

grep -Rni \
  'saveCanonicalRealPortfolioSnapshot' \
  app src \
  --include="*.js" \
  --include="*.jsx"

echo
echo "===== 15. CIRCULAR IMPORT SAFEGUARD ====="

if grep -Rni \
  'portfolioSnapshotTrigger\|portfolioSnapshot' \
  src/features/analytics \
  src/features/wealth-journey \
  src/features/rebalancing \
  src/features/risk \
  --include="*.js"
then
  echo
  echo "ERROR — analytics/wealth dependency points back to snapshot layer."
  exit 1
else
  echo "PASS — no analytics -> snapshot dependency detected."
fi

echo
echo "===== 15A. PERFORMANCE READER BOUNDARY ====="

grep -q \
  'from "../src/services/portfolio/portfolioSnapshot"' \
  app/performance.js

grep -q \
  'from "../../services/portfolio/portfolioSnapshot"' \
  src/features/performance/historicalPerformanceSummaryService.js

if grep -Rni \
  'src/portfolio/portfolioSnapshot\|../../portfolio/portfolioSnapshot' \
  app/performance.js \
  src/features/performance/historicalPerformanceSummaryService.js
then
  echo "ERROR — Performance still reads through the legacy wrapper."
  exit 1
else
  echo "PASS — Performance readers use the canonical service boundary."
fi

echo
echo "===== 16. BACKUPS INSIDE APP ====="

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
echo "===== 17. ROUTE AUDIT ====="

python scripts/audit-pc029c-visible-routes.py

echo
echo "===== 18. WEB BUILD ====="

EXPO_STATE="${GATECEP_EXPO_STATE:-${TMPDIR:-/tmp}/gatecep-expo-state}"
mkdir -p "$EXPO_STATE"

CI=1 EXPO_NO_TELEMETRY=1 \
  __UNSAFE_EXPO_HOME_DIRECTORY="$EXPO_STATE" \
  npx expo export --platform web

echo
echo "============================================================"
echo "PC-030C2B9 verification complete."
echo "============================================================"
