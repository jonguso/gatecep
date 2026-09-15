#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/mobile"

echo "===== PC-031A30 AUDIT EVENT IDENTITY INTEGRITY ====="

cd "$MOBILE"

node --experimental-vm-modules \
  scripts/test-pc031a30-audit-event-identity-integrity.mjs

echo
echo "===== A28 CLEAR CONCURRENCY REGRESSION ====="
node --experimental-vm-modules \
  scripts/test-pc031a28-audit-clear-concurrency-integrity.mjs

echo
echo "===== A27 WRITE CONCURRENCY REGRESSION ====="
node --experimental-vm-modules \
  scripts/test-pc031a27-audit-concurrency-integrity.mjs

echo
echo "===== A26 RETENTION REGRESSION ====="
node --experimental-vm-modules \
  scripts/test-pc031a26-audit-retention-integrity.mjs

echo
echo "===== A25 REAL AUDIT RUNTIME REGRESSION ====="
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
echo "===== A30 ID GENERATOR CONTRACT ====="

grep -n \
  'executionAuditIdSequence\|createUniqueExecutionAuditEventId' \
  mobile/src/services/trade/executionAuditStore.js

grep -n -A16 -B4 \
  'event.id =' \
  mobile/src/services/trade/executionAuditStore.js

echo
echo "===== ID ALLOCATION OCCURS INSIDE SERIALIZED WRITER ====="

ADD_BODY="$(
  sed -n \
    '/export async function addExecutionAuditEvent/,/export async function clearExecutionAuditTrail/p' \
    mobile/src/services/trade/executionAuditStore.js
)"

printf '%s\n' "$ADD_BODY" \
  | grep -q 'enqueueExecutionAuditWrite' \
  || {
    echo "FAIL: audit ADD is not serialized"
    exit 1
  }

printf '%s\n' "$ADD_BODY" \
  | grep -q 'createUniqueExecutionAuditEventId' \
  || {
    echo "FAIL: audit ID allocation is not inside ADD write path"
    exit 1
  }

echo "PASS: unique audit ID allocation occurs inside serialized ADD mutation"

echo
echo "===== PERSISTED TRAIL PARTICIPATES IN ID UNIQUENESS ====="

ID_BODY="$(
  sed -n \
    '/function createUniqueExecutionAuditEventId/,/^}/p' \
    mobile/src/services/trade/executionAuditStore.js
)"

printf '%s\n' "$ID_BODY"

printf '%s\n' "$ID_BODY" \
  | grep -q 'existingIds' \
  || {
    echo "FAIL: persisted IDs are not consulted"
    exit 1
  }

printf '%s\n' "$ID_BODY" \
  | grep -q 'existingIds.has(candidate)' \
  || {
    echo "FAIL: candidate collision is not rejected"
    exit 1
  }

echo "PASS: persisted audit IDs participate in uniqueness enforcement"

echo
echo "===== RETENTION PRECEDENCE UNCHANGED ====="

grep -n -A28 \
  'function realExecutionLifecycleKey' \
  mobile/src/services/trade/executionAuditStore.js

grep -q 'return `ORDER:' \
  mobile/src/services/trade/executionAuditStore.js

grep -q 'return `EXECUTION:' \
  mobile/src/services/trade/executionAuditStore.js

grep -q 'return `BROKER_ORDER:' \
  mobile/src/services/trade/executionAuditStore.js

grep -q 'return `BROKER_REFERENCE:' \
  mobile/src/services/trade/executionAuditStore.js

grep -q 'return `EVENT:' \
  mobile/src/services/trade/executionAuditStore.js

echo "PASS: lifecycle identity precedence remains unchanged"

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
echo "===== BROKER SUBMISSION LOCK REMAINS SEPARATE ====="

grep -n \
  'REAL_SUBMISSION_LOCKS' \
  mobile/src/services/trade/basketExecutionStore.js

if grep -n \
  'REAL_SUBMISSION_LOCKS' \
  mobile/src/services/trade/executionAuditStore.js
then
  echo "FAIL: audit identity logic reused broker submission locking"
  exit 1
else
  echo "PASS: audit identity remains independent from broker submission locking"
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
echo "PASS: PC-031A30 AUDIT EVENT IDENTITY INTEGRITY"
