#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"

echo "===== PC-031A26 AUDIT RETENTION INTEGRITY ====="

cd "$MOBILE"

node --experimental-vm-modules \
  scripts/test-pc031a26-audit-retention-integrity.mjs

echo
echo "===== A25 RUNTIME AUDIT REGRESSION ====="
node --experimental-vm-modules \
  scripts/test-pc031a25-real-execution-audit-runtime.mjs

echo
echo "===== A24 AUDIT CONTRACT REGRESSION ====="
node \
  scripts/test-pc031a24-real-execution-audit-trail.mjs

echo
echo "===== A23 IDENTITY CONTINUITY REGRESSION ====="
node \
  scripts/test-pc031a23-real-execution-identity-continuity.mjs

echo
echo "===== A18 RECOVERY / LEDGER CONVERGENCE ====="
node \
  scripts/test-pc031a18-recovery-ledger-convergence-runtime.mjs

echo
echo "===== A16 CANONICAL EVIDENCE BOUNDARY ====="
node \
  scripts/test-pc031a16-canonical-evidence-boundary-runtime.mjs

cd "$ROOT"

echo
echo "===== A26 RETENTION CONTRACT SOURCE CHECK ====="

grep -n \
  'MAX_EXECUTION_AUDIT_EVENTS = 1000' \
  mobile/src/services/trade/executionAuditStore.js

grep -n \
  'realExecutionLifecycleKey' \
  mobile/src/services/trade/executionAuditStore.js

grep -n \
  'retainExecutionAuditEvents' \
  mobile/src/services/trade/executionAuditStore.js

if grep -n \
  'slice(0, 1000)' \
  mobile/src/services/trade/executionAuditStore.js
then
  echo "FAIL: legacy arbitrary event-level retention still exists"
  exit 1
else
  echo "PASS: legacy arbitrary event-level retention removed"
fi

echo
echo "===== AUDIT REMAINS OBSERVATIONAL ====="

if grep -n -E \
  'placeBrokerOrder|markExecutionOrderFilled|updateExecutionOrder|rebuildCanonicalPortfolioLedger' \
  mobile/src/services/trade/executionAuditStore.js
then
  echo "FAIL: audit store gained execution/accounting authority"
  exit 1
else
  echo "PASS: audit store remains observational"
fi

echo
echo "===== DIFF CHECK ====="
git diff --check

echo
echo "===== REPOSITORY SAFETY ====="
git branch --show-current
git rev-list --left-right --count main...HEAD

test -x .git/hooks/pre-push \
  && echo "Push guard: ACTIVE" \
  || {
    echo "Push guard: NOT ACTIVE"
    exit 1
  }

echo
echo "PASS: PC-031A26 AUDIT RETENTION INTEGRITY"
