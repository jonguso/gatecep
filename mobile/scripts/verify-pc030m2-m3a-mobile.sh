#!/usr/bin/env bash
set -euo pipefail

ROOT="${GATECEP_MOBILE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

echo "============================================================"
echo "PC-030M2 + PC-030M3A — MOBILE JOURNEY VERIFICATION"
echo "============================================================"

for component in MobileScreen JourneyStepper StickyActionBar IssuePager DeveloperIdentifier; do
  grep -q "export function ${component}" src/components/mobile/MobileUI.js
done
grep -q 'useWindowDimensions' src/components/mobile/MobileUI.js
grep -q 'if (!__DEV__) return null' src/components/mobile/MobileUI.js
echo "PASS — shared responsive mobile primitives and dev-only identifiers are defined."

grep -q 'JourneyStepper' app/portfolio-sync-center.js
grep -q 'activeIndex={0}' app/portfolio-sync-center.js
grep -q 'StickyActionBar' app/portfolio-sync-center.js
grep -Fq '/import-portfolio?mode=RECONCILE' app/portfolio-sync-center.js
grep -Fq '/(tabs)/funds?mode=RECONCILE' app/portfolio-sync-center.js
echo "PASS — Evidence is a focused mobile step with valuation and cash prerequisites."

grep -q 'JourneyStepper' app/broker-reconciliation.js
grep -q 'activeIndex={1}' app/broker-reconciliation.js
grep -q 'IssuePager' app/broker-reconciliation.js
grep -q 'StickyActionBar' app/broker-reconciliation.js
echo "PASS — Comparison is a focused mobile step with paged differences."

if grep -q '<ScrollView' app/portfolio-sync-center.js app/broker-reconciliation.js; then
  echo "FAIL — converted journey screens contain their own nested vertical ScrollView."
  exit 1
fi
echo "PASS — converted screens rely on one shared vertical scroll boundary."

node --check src/components/mobile/MobileUI.js
node --check app/portfolio-sync-center.js
node --check app/broker-reconciliation.js
echo "PASS — mobile journey source parses successfully."

bash scripts/verify-broker-evidence-reconciliation.sh

echo "PC-030M2 + PC-030M3A mobile journey verification complete."
