#!/usr/bin/env bash
set -euo pipefail

ROOT="${GATECEP_MOBILE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

echo "============================================================"
echo "REAL / PRACTICE RUNTIME SEPARATION VERIFICATION"
echo "============================================================"

grep -q 'throw new PortfolioAuthenticationError' \
  src/services/portfolio/unifiedPortfolioApi.js
if grep -q 'source: "NO_AUTH"' src/services/portfolio/unifiedPortfolioApi.js; then
  echo "FAIL — missing authentication still returns a successful empty portfolio."
  exit 1
fi
echo "PASS — REAL portfolio API fails closed on missing/expired authentication."

if grep -q 'sourceAccounts.push' app/'(tabs)'/dashboard.js || \
   grep -q 'setSelectedPortfolioAccount({' app/'(tabs)'/dashboard.js || \
   grep -q 'practicePortfolio?.availableCash' app/'(tabs)'/dashboard.js; then
  echo "FAIL — Dashboard still contains an automatic Practice financial fallback."
  exit 1
fi
echo "PASS — Dashboard financial metrics are REAL-only."

if grep -q -E 'practicePortfolio|type === "PRACTICE"|broker: "PRACTICE"' \
  app/portfolio-hub.js; then
  echo "FAIL — Portfolio Hub still mixes Practice into production sources."
  exit 1
fi
grep -q 'Open Separate Practice Demo' app/portfolio-hub.js
echo "PASS — Portfolio Hub is REAL-only and links to a separate demo route."

if grep -q 'practicePortfolio' \
  src/features/analytics/unifiedPortfolioAnalyticsService.js; then
  echo "FAIL — Unified Analytics still uses a Practice compatibility alias."
  exit 1
fi
grep -q 'portfolio ||' src/features/dividends/dividendForecastService.js
echo "PASS — Unified Analytics and dividend inputs honor explicit REAL data."

grep -q 'runtimeMode: "REAL_CONNECTED"' \
  src/features/broker-sync/brokerSyncService.js
grep -q 'NO_VERIFIED_BROKER_MIRROR' \
  src/features/broker-sync/brokerReconciliationService.js
grep -q 'NO_VERIFIED_BROKER_MIRROR' \
  src/features/analytics/executiveActionQueueService.js
echo "PASS — stale/sandbox broker mirrors are unavailable, not out of sync."

node --experimental-vm-modules \
  scripts/test-real-practice-runtime-boundary.mjs

python scripts/audit-pc029c-visible-routes.py

EXPO_STATE="${GATECEP_EXPO_STATE:-${TMPDIR:-/tmp}/gatecep-expo-boundary}"
mkdir -p "$EXPO_STATE"
CI=1 EXPO_NO_TELEMETRY=1 \
  __UNSAFE_EXPO_HOME_DIRECTORY="$EXPO_STATE" \
  npx expo export --platform web

echo "REAL / Practice separation verification complete."
