#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"

echo "===== PC-031A25 REAL EXECUTION AUDIT RUNTIME ====="

cd "$MOBILE"

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
echo "===== A22 STATUS CONVERGENCE REGRESSION ====="
node \
  scripts/test-pc031a22-real-execution-status-read-model.mjs

echo
echo "===== A18 RECOVERY / LEDGER CONVERGENCE ====="
node \
  scripts/test-pc031a18-recovery-ledger-convergence-runtime.mjs

echo
echo "===== A16 CANONICAL EVIDENCE BOUNDARY ====="
node \
  scripts/test-pc031a16-canonical-evidence-boundary-runtime.mjs

echo
echo "===== A13 RECOVERY MATCHER ====="
node \
  scripts/test-pc031a13-recovery-match-runtime.mjs

echo
echo "===== AUDIT AUTHORITY ISOLATION ====="

cd "$ROOT"

grep -n -E \
  'placeBrokerOrder|updateExecutionOrder|markExecutionOrderFilled|rebuildCanonicalPortfolioLedger' \
  mobile/src/services/trade/executionAuditStore.js \
  && {
    echo "FAIL: audit store has execution/accounting authority"
    exit 1
  } \
  || echo "PASS: audit store remains observational"

grep -R -n \
  'executionAuditTrail' \
  mobile/src/features/trading \
  && {
    echo "FAIL: canonical trading/accounting reads execution audit"
    exit 1
  } \
  || echo "PASS: canonical accounting remains independent of audit trail"

echo
echo "===== A25 EVENT COVERAGE ====="

grep -R -n -E \
  'REAL_ORDER_QUEUED|REAL_SUBMISSION_STARTED|REAL_SUBMISSION_SAFE_FAILURE|REAL_SUBMISSION_UNCERTAIN|REAL_ORDER_ROUTED|REAL_RECOVERY_MATCHED|REAL_ORDER_FILLED_FROM_VERIFIED_EVIDENCE|REAL_RECOVERY_PERSISTENCE_FAILED' \
  mobile/src/services/trade \
  mobile/src/features/broker-sync \
  --exclude='*.bak'

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
echo "PASS: PC-031A25 REAL EXECUTION AUDIT RUNTIME"
