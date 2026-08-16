#!/usr/bin/env bash
set -euo pipefail

ROOT="${GATECEP_MOBILE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

echo "============================================================"
echo "BROKER EVIDENCE + REAL RECONCILIATION VERIFICATION"
echo "============================================================"

grep -q 'REAL_VERIFIED_UPLOAD' src/features/broker-sync/brokerSyncService.js
grep -q 'quarantinedLegacyBrokerMirror' src/features/broker-sync/brokerSyncService.js
grep -q 'isVerifiedRealBrokerMirror' src/features/broker-sync/brokerReconciliationService.js
echo "PASS — only verified REAL broker mirrors reach reconciliation."

grep -q 'BROKER_RECONCILIATION_EVIDENCE' app/import-portfolio.js
grep -q 'saveVerifiedUploadedBrokerMirror' app/review-portfolio-import.js
grep -q 'No REAL holdings were changed' app/review-portfolio-import.js
echo "PASS — reconciliation upload creates evidence without mutating REAL holdings."

grep -Fq '/import-portfolio?mode=RECONCILE' app/portfolio-sync-center.js
grep -Fq '/(tabs)/funds?mode=RECONCILE' app/portfolio-sync-center.js
grep -q 'attachVerifiedBrokerCashEvidence' 'app/(tabs)/funds.js'
grep -q 'CASH_EVIDENCE_REQUIRED' src/features/broker-sync/brokerReconciliationService.js
echo "PASS — valuation and cash evidence are both required for full reconciliation."

grep -q 'savePortfolio(cleanPortfolio)' app/review-portfolio-import.js
grep -q 'CONFIRMED_PORTFOLIO_IMPORT' app/review-portfolio-import.js
echo "PASS — initial REAL portfolio creation remains available as a separate contract."

grep -q 'Sync & Reconcile' app/portfolio-hub.js
grep -q 'Continue to Comparison' app/portfolio-sync-center.js
grep -q 'Review Differences' app/broker-reconciliation.js
grep -q 'Correction Action Center' app/broker-reconciliation.js
echo "PASS — Portfolio Sync Center exposes the complete investor workflow."

if grep -R -n 'syncMockBrokerAccount' app >/dev/null 2>&1; then
  echo "FAIL — an investor-facing screen can still invoke the Sandbox sync."
  exit 1
fi
echo "PASS — investor UI cannot invoke Sandbox broker synchronization."

node --experimental-vm-modules scripts/test-broker-evidence-boundary.mjs
node --experimental-vm-modules scripts/test-real-broker-reconciliation-contract.mjs

python scripts/audit-pc029c-visible-routes.py

EXPO_STATE="${GATECEP_EXPO_STATE:-${TMPDIR:-/tmp}/gatecep-expo-broker-evidence}"
mkdir -p "$EXPO_STATE"
CI=1 EXPO_NO_TELEMETRY=1 \
  __UNSAFE_EXPO_HOME_DIRECTORY="$EXPO_STATE" \
  npx expo export --platform web

echo "Broker evidence + REAL reconciliation verification complete."
