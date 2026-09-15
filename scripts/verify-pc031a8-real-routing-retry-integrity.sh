#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A8 VERIFY — REAL ROUTING FAILURE / RETRY INTEGRITY ==="

fail=0

check() {
  local description="$1"
  shift

  if "$@" >/dev/null 2>&1; then
    echo "PASS: $description"
  else
    echo "FAIL: $description"
    fail=1
  fi
}

STORE="mobile/src/services/trade/basketExecutionStore.js"
QUEUE="mobile/app/queue-manager.js"

check "process-level REAL submission lock exists" \
  grep -q 'REAL_SUBMISSION_LOCKS' "$STORE"

check "duplicate in-process REAL submission is blocked" \
  grep -q 'REAL_ORDER_SUBMISSION_IN_PROGRESS' "$STORE"

check "persisted SUBMITTING state exists" \
  grep -q 'brokerStatus: "SUBMITTING"' "$STORE"

check "submission lock is persisted before broker adapter call" \
  sh -c '
    submitting=$(grep -n '\''brokerStatus: "SUBMITTING"'\'' "'"$STORE"'" | head -1 | cut -d: -f1)
    adapter=$(grep -n '\''brokerResponse = await placeBrokerOrder(submittedOrder)'\'' "'"$STORE"'" | head -1 | cut -d: -f1)
    test -n "$submitting" &&
    test -n "$adapter" &&
    test "$submitting" -lt "$adapter"
  '

check "REAL broker reference prevents blind resubmission" \
  grep -q 'REAL_ORDER_ALREADY_HAS_BROKER_REFERENCE' "$STORE"

check "uncertain REAL submission requires reconciliation" \
  grep -q 'REAL_ORDER_RECONCILIATION_REQUIRED' "$STORE"

check "uncertain broker response has explicit state" \
  grep -q 'brokerStatus: "SUBMISSION_UNCERTAIN"' "$STORE"

check "automatic retry requires explicit ADAPTER_ERROR state" \
  grep -q 'realBrokerStatus !== "ADAPTER_ERROR"' "$STORE"

check "adapter must explicitly certify safe retry" \
  grep -q 'error?.safeToRetry === true' "$STORE"

check "pre-submission failure evidence can permit retry" \
  grep -q 'error?.beforeSubmission === true' "$STORE"

check "retry cannot switch broker assignment" \
  grep -q 'REAL_ORDER_RETRY_BROKER_MISMATCH' "$STORE"

check "submission attempt identifier is persisted" \
  grep -q 'submissionAttemptId' "$STORE"

check "submission attempt counter is persisted" \
  grep -q 'submissionAttemptCount' "$STORE"

check "submission broker account identity is pinned" \
  grep -q 'submissionBrokerAccountId' "$STORE"

check "submission broker identity is pinned" \
  grep -q 'submissionBrokerId' "$STORE"

check "ROUTED requires explicit adapter success" \
  grep -q 'brokerResponse?.ok === true' "$STORE"

check "ROUTED requires brokerOrderId" \
  grep -q 'responseBrokerOrderId' "$STORE"

check "Queue Manager only retries ADAPTER_ERROR BROKER_SELECTED orders" \
  sh -c \
  "grep -A20 'const queued = orders.filter' '$QUEUE' | grep -q 'brokerStatus === \"ADAPTER_ERROR\"'"

check "Queue Manager does not bulk-route every BROKER_SELECTED order" \
  sh -c \
  "! grep -A8 'const queued = orders.filter' '$QUEUE' | grep -q '\\[ORDER_STATUS.QUEUED, ORDER_STATUS.BROKER_SELECTED\\]'"

echo
echo "=== EXISTING INTEGRITY BOUNDARIES ==="

check "verified REAL receipt guard remains" \
  grep -q \
  'REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION' \
  "$STORE"

check "verified REAL fill guard remains" \
  grep -q \
  'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' \
  "$STORE"

check "A7 pre-handoff revalidation remains" \
  grep -q 'PRE_BROKER_HANDOFF' "$STORE"

check "exact REAL broker resolver remains" \
  grep -q 'REAL_ASSIGNED_BROKER_UNAVAILABLE' "$STORE"

echo
echo "=== REGRESSION ==="

if bash scripts/verify-pc031a7-real-execution-handoff-revalidation.sh \
  >/tmp/gatecep-pc031a8-a7.log 2>&1; then
  echo "PASS: PC-031A7 regression suite"
else
  echo "FAIL: PC-031A7 regression suite"
  cat /tmp/gatecep-pc031a8-a7.log
  fail=1
fi

if bash scripts/verify-pc031a6-per-order-multi-broker-eligibility.sh \
  >/tmp/gatecep-pc031a8-a6.log 2>&1; then
  echo "PASS: PC-031A6 regression suite"
else
  echo "FAIL: PC-031A6 regression suite"
  cat /tmp/gatecep-pc031a8-a6.log
  fail=1
fi

echo
echo "=== DIFF CHECK ==="

if git diff --check -- "$STORE" "$QUEUE"; then
  echo "PASS: git diff --check"
else
  echo "FAIL: git diff --check"
  fail=1
fi

echo
echo "=== SAFETY ==="
echo -n "Branch: "
git branch --show-current

echo -n "gatecep-next vs main: "
git rev-list --left-right --count main...HEAD

echo -n "Push guard: "
test -x .git/hooks/pre-push && echo ACTIVE || echo NOT_ACTIVE

if [ "$fail" -ne 0 ]; then
  echo
  echo "PC-031A8 verification FAILED."
  exit 1
fi

echo
echo "PC-031A8 verification PASSED."
