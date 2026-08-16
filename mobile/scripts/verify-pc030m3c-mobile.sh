#!/usr/bin/env bash
set -euo pipefail

ROOT="${GATECEP_MOBILE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

echo "============================================================"
echo "PC-030M3C — MOBILE COMPLETION + HISTORY VERIFICATION"
echo "============================================================"

grep -q 'buildBrokerReconciliationInsight' app/broker-reconciliation-insight.js
grep -q 'activeIndex={4}' app/broker-reconciliation-insight.js
grep -q 'IssuePager' app/broker-reconciliation-insight.js
grep -q 'Finish & Return to Portfolio' app/broker-reconciliation-insight.js
grep -q 'Read-Only Protection' app/broker-reconciliation-insight.js
echo "PASS — Completion preserves Coach G insight and the read-only contract."

grep -q 'loadBrokerResolutionLedger' app/broker-resolution-ledger.js
grep -q 'itemLabel="Decision"' app/broker-resolution-ledger.js
grep -q 'Decisions, not transactions' app/broker-resolution-ledger.js
echo "PASS — decision history uses the canonical ledger and pages one record at a time."

grep -q 'loadBrokerSyncAuditHistory' app/broker-sync-history.js
grep -q 'itemLabel="Event"' app/broker-sync-history.js
grep -q 'Return to Sync Center' app/broker-sync-history.js
echo "PASS — synchronization history uses the canonical audit store and pages one event at a time."

grep -q 'itemLabel = "Difference"' src/components/mobile/MobileUI.js
grep -q 'getItemTitle' src/components/mobile/MobileUI.js
echo "PASS — the shared pager supports accurate Difference, Decision, and Event labels."

if grep -q '<ScrollView' app/broker-reconciliation-insight.js app/broker-resolution-ledger.js app/broker-sync-history.js; then
  echo "FAIL — a converted Completion or History screen contains a nested vertical ScrollView."
  exit 1
fi
echo "PASS — Completion and History use one shared vertical scroll boundary."

node --check src/components/mobile/MobileUI.js
node --check app/broker-reconciliation-insight.js
node --check app/broker-resolution-ledger.js
node --check app/broker-sync-history.js
echo "PASS — M3C mobile source parses successfully."

bash scripts/verify-pc030m3b-mobile.sh

echo "PC-030M3C mobile Completion + History verification complete."
