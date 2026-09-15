#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"

echo "===== PC-031A28 AUDIT CLEAR CONCURRENCY INTEGRITY ====="

cd "$MOBILE"

node --experimental-vm-modules \
  scripts/test-pc031a28-audit-clear-concurrency-integrity.mjs

echo
echo "===== A27 CONCURRENCY REGRESSION ====="
node --experimental-vm-modules \
  scripts/test-pc031a27-audit-concurrency-integrity.mjs

echo
echo "===== A26 RETENTION REGRESSION ====="
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
echo "===== A28 SHARED AUDIT MUTATION QUEUE CONTRACT ====="

grep -n \
  'enqueueExecutionAuditWrite' \
  mobile/src/services/trade/executionAuditStore.js

ADD_QUEUE_COUNT="$(
  sed -n \
    '/export async function addExecutionAuditEvent/,/export async function clearExecutionAuditTrail/p' \
    mobile/src/services/trade/executionAuditStore.js \
  | grep -c 'enqueueExecutionAuditWrite'
)"

CLEAR_QUEUE_COUNT="$(
  sed -n \
    '/export async function clearExecutionAuditTrail/,/export function filterAuditTrail/p' \
    mobile/src/services/trade/executionAuditStore.js \
  | grep -c 'enqueueExecutionAuditWrite'
)"

test "$ADD_QUEUE_COUNT" -eq 1 \
  || {
    echo "FAIL: addExecutionAuditEvent is not serialized exactly once"
    exit 1
  }

test "$CLEAR_QUEUE_COUNT" -eq 1 \
  || {
    echo "FAIL: clearExecutionAuditTrail is not serialized exactly once"
    exit 1
  }

echo "PASS: ADD and CLEAR share the serialized audit mutation queue"

echo
echo "===== CLEAR HAS NO DIRECT UNSERIALIZED STORAGE WRITE ====="

CLEAR_BODY="$(
  sed -n \
    '/export async function clearExecutionAuditTrail/,/export function filterAuditTrail/p' \
    mobile/src/services/trade/executionAuditStore.js
)"

printf '%s\n' "$CLEAR_BODY"

if printf '%s\n' "$CLEAR_BODY" \
  | grep -q 'enqueueExecutionAuditWrite'
then
  echo "PASS: clear is routed through audit serialization"
else
  echo "FAIL: clear bypasses audit serialization"
  exit 1
fi

echo
echo "===== AUDIT REMAINS OBSERVATIONAL ====="

if grep -n -E \
  'placeBrokerOrder|markExecutionOrderFilled|updateExecutionOrder|rebuildCanonicalPortfolioLedger' \
  mobile/src/services/trade/executionAuditStore.js
then
  echo "FAIL: audit store gained broker/OMS/accounting authority"
  exit 1
else
  echo "PASS: audit store remains observational"
fi

echo
echo "===== BROKER SUBMISSION LOCK REMAINS SEPARATE ====="

grep -n \
  'REAL_SUBMISSION_LOCKS' \
  mobile/src/services/trade/basketExecutionStore.js

if grep -n \
  'REAL_SUBMISSION_LOCKS' \
  mobile/src/services/trade/executionAuditStore.js
then
  echo "FAIL: audit mutation queue reused broker submission lock"
  exit 1
else
  echo "PASS: audit mutation queue remains independent from broker submission locking"
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
echo "PASS: PC-031A28 AUDIT CLEAR CONCURRENCY INTEGRITY"
