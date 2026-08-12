#!/usr/bin/env bash
set -euo pipefail

ROOT="${GATECEP_MOBILE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

echo "============================================================"
echo "REAL BROKER RECONCILIATION CONTRACT VERIFICATION"
echo "============================================================"

if grep -R -n -E \
  'loadInvestorContext|savePracticePortfolio|practicePortfolio|Practice Portfolio' \
  src/features/broker-sync/brokerReconciliationService.js \
  src/features/broker-sync/brokerPortfolioImportService.js \
  src/features/broker-sync/brokerPortfolioImportExecutionService.js \
  app/broker-reconciliation.js \
  app/broker-portfolio-import.js
then
  echo "FAIL — active reconciliation/import boundary still references Practice."
  exit 1
fi
echo "PASS — active reconciliation/import boundary contains no Practice dependency."

grep -q 'syncConnectedBrokerMirror' app/broker-sync.js
if grep -q 'syncMockBrokerAccount' app/broker-sync.js; then
  echo "FAIL — investor UI still invokes the sandbox broker sync."
  exit 1
fi
echo "PASS — investor UI invokes connected broker adapters only."

grep -q 'router.push("/broker-sync")' app/portfolio-sync-center.js
grep -q '"/broker-reconciliation"' app/broker-sync.js
echo "PASS — Portfolio Sync Center exposes the reconciliation workflow."

grep -q 'saveCanonicalRealBrokerPortfolio' \
  src/features/broker-sync/brokerPortfolioImportExecutionService.js
grep -q 'refreshCanonicalRealPortfolioSnapshot' \
  src/features/broker-sync/canonicalRealBrokerPortfolioService.js
grep -q 'reason: "BROKER_RECONCILIATION_IMPORT"' \
  src/features/broker-sync/brokerPortfolioImportExecutionService.js
echo "PASS — approved imports use the REAL mutation and snapshot boundary."

node --experimental-vm-modules \
  scripts/test-real-broker-reconciliation-contract.mjs

python scripts/audit-pc029c-visible-routes.py

EXPO_STATE="${GATECEP_EXPO_STATE:-${TMPDIR:-/tmp}/gatecep-expo-real-broker}"
mkdir -p "$EXPO_STATE"
CI=1 EXPO_NO_TELEMETRY=1 \
  __UNSAFE_EXPO_HOME_DIRECTORY="$EXPO_STATE" \
  npx expo export --platform web

echo "REAL broker reconciliation verification complete."
