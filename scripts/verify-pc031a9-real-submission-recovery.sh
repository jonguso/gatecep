#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A9 VERIFY — REAL SUBMISSION RECOVERY ==="

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

RECOVERY="mobile/app/real-order-recovery.js"
QUEUE="mobile/app/queue-manager.js"
STORE="mobile/src/services/trade/basketExecutionStore.js"

check "REAL recovery screen exists" \
  test -f "$RECOVERY"

check "recovery screen scopes to REAL execution" \
  grep -q 'executionMode === "REAL"' "$RECOVERY"

check "SUBMITTING is treated as unresolved recovery state" \
  grep -q '"SUBMITTING"' "$RECOVERY"

check "SUBMISSION_UNCERTAIN is treated as recovery state" \
  grep -q '"SUBMISSION_UNCERTAIN"' "$RECOVERY"

check "manual broker confirmation state is recoverable" \
  grep -q '"MANUAL_CONFIRMATION_REQUIRED"' "$RECOVERY"

check "recovery requires BROKER_SELECTED lifecycle state" \
  grep -q 'status === "BROKER_SELECTED"' "$RECOVERY"

check "recovery points to verified transaction evidence upload" \
  grep -q 'pathname: "/transactions-upload"' "$RECOVERY"

check "transaction evidence upload uses RECONCILE mode" \
  grep -q 'mode: "RECONCILE"' "$RECOVERY"

check "recovery also links existing REAL sync center" \
  grep -q 'router.push("/portfolio-sync-center")' "$RECOVERY"

check "recovery screen does not route broker order" \
  sh -c "! grep -q 'routeExecutionOrderByMode' '$RECOVERY'"

check "recovery screen does not manually mutate execution order" \
  sh -c "! grep -q 'updateExecutionOrder' '$RECOVERY'"

check "recovery screen cannot manually fill REAL order" \
  sh -c "! grep -q 'markExecutionOrderFilled' '$RECOVERY'"

check "Queue Manager detects unresolved REAL broker submissions" \
  grep -q 'const realRecoveryOrders =' "$QUEUE"

check "Queue Manager exposes REAL recovery destination" \
  grep -q 'router.push("/real-order-recovery")' "$QUEUE"

check "Queue Manager recovery warning blocks blind resubmission guidance" \
  grep -q 'Do not resubmit them until genuine' "$QUEUE"

echo
echo "=== EXISTING REAL EXECUTION SAFETY ==="

check "A8 SUBMITTING guard remains" \
  grep -q 'REAL_ORDER_SUBMISSION_IN_PROGRESS' "$STORE"

check "A8 reconciliation guard remains" \
  grep -q 'REAL_ORDER_RECONCILIATION_REQUIRED' "$STORE"

check "A8 uncertain submission state remains" \
  grep -q 'brokerStatus: "SUBMISSION_UNCERTAIN"' "$STORE"

check "verified REAL receipt boundary remains" \
  grep -q \
  'REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION' \
  "$STORE"

check "verified REAL fill boundary remains" \
  grep -q \
  'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' \
  "$STORE"

echo
echo "=== REGRESSION ==="

if bash scripts/verify-pc031a8-real-routing-retry-integrity.sh \
  >/tmp/gatecep-pc031a9-a8.log 2>&1; then
  echo "PASS: PC-031A8 regression suite"
else
  echo "FAIL: PC-031A8 regression suite"
  cat /tmp/gatecep-pc031a9-a8.log
  fail=1
fi

echo
echo "=== DIFF CHECK ==="

if git diff --check -- "$RECOVERY" "$QUEUE" "$STORE"; then
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
  echo "PC-031A9 verification FAILED."
  exit 1
fi

echo
echo "PC-031A9 verification PASSED."
