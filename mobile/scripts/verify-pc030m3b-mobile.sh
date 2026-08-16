#!/usr/bin/env bash
set -euo pipefail

ROOT="${GATECEP_MOBILE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

echo "============================================================"
echo "PC-030M3B — MOBILE REVIEW + RESOLUTION VERIFICATION"
echo "============================================================"

grep -q 'buildBrokerReconciliationCaseWorkflow' app/broker-reconciliation-case.js
grep -q 'JourneyStepper' app/broker-reconciliation-case.js
grep -q 'activeIndex={2}' app/broker-reconciliation-case.js
grep -q 'IssuePager' app/broker-reconciliation-case.js
grep -q 'StickyActionBar' app/broker-reconciliation-case.js
grep -q '/broker-resolution' app/broker-reconciliation-case.js
echo "PASS — Review uses the existing case contract and pages one issue at a time."

grep -q 'buildBrokerResolutionWorkflow' app/broker-resolution.js
grep -q 'resolveBrokerDiscrepancy' app/broker-resolution.js
grep -q 'RESOLUTION_OPTIONS' app/broker-resolution.js
grep -q 'activeIndex={3}' app/broker-resolution.js
grep -q 'IssuePager' app/broker-resolution.js
grep -q 'primaryDisabled={loading || !complete' app/broker-resolution.js
echo "PASS — Resolution preserves the decision contract and requires every issue to be documented."

grep -q 'does not change broker holdings' app/broker-reconciliation-case.js
grep -q 'do not add, remove, buy, sell, transfer' app/broker-resolution.js
echo "PASS — read-only and no-money-movement protections remain visible."

if grep -q '<ScrollView' app/broker-reconciliation-case.js app/broker-resolution.js; then
  echo "FAIL — converted Review or Resolution screen contains a nested vertical ScrollView."
  exit 1
fi
echo "PASS — Review and Resolution use one shared vertical scroll boundary."

node --check app/broker-reconciliation-case.js
node --check app/broker-resolution.js
echo "PASS — M3B mobile source parses successfully."

bash scripts/verify-pc030m2-m3a-mobile.sh

echo "PC-030M3B mobile Review + Resolution verification complete."
