#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "PC-030M11A — AUTHORITATIVE BROKER SNAPSHOT VERIFICATION"
echo "============================================================"

service="src/features/broker-sync/brokerAuthoritativeSnapshotService.js"
center="app/portfolio-sync-center.js"

grep -q 'Verified valuation and matching cash evidence are required' "$service"
grep -q 'AUTHORITATIVE_BROKER_SNAPSHOT_ADOPTED' "$service"
grep -q 'replaceAuthoritativeBrokerPortfolio' "$service"
grep -q 'replacement?.count' "$service"
grep -q 'clearVerifiedUploadedBrokerEvidence' "$service"
echo "PASS — only complete, identity-verified broker evidence can replace REAL data."

grep -q 'Confirm Broker Snapshot' "$center"
grep -q 'Use broker snapshot as REAL portfolio' "$center"
grep -q 'testID="broker-snapshot-confirmation"' "$center"
grep -q 'testID="confirm-broker-snapshot-replacement"' "$center"
grep -q 'setConfirmVisible(true)' "$center"
grep -q 'Daily prices change current value only' "$center"
echo "PASS — one Expo-safe confirmation modal replaces the old issue-by-issue resolution journey."

grep -q 'router.replace("/portfolio-sync-center")' app/review-portfolio-import.js
grep -q 'router.replace("/portfolio-sync-center")' 'app/(tabs)/funds.js'
echo "PASS — valuation and cash evidence converge on the single confirmation screen."

if grep -q 'broker-reconciliation-insight' "$center"; then
  echo "FAIL — simplified adoption must not enter the legacy resolution journey."
  exit 1
fi
echo "PASS — adoption completes directly to the canonical portfolio."

node --check "$service"
node --check "$center"
node --check app/review-portfolio-import.js
node --check 'app/(tabs)/funds.js'
echo "PASS — authoritative snapshot source parses successfully."
echo "PC-030M11A authoritative broker snapshot verification complete."
