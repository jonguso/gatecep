#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A7 VERIFY — REAL EXECUTION HANDOFF REVALIDATION ==="

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
SERVICE="mobile/src/services/trade/brokerExecutionEligibilityService.js"

check \
  "A6 broker eligibility service remains available" \
  test -f "$SERVICE"

check \
  "REAL routing requires routable lifecycle state" \
  grep -q 'REAL_ORDER_NOT_READY_FOR_ROUTING' "$STORE"

check \
  "REAL routing permits queued handoff" \
  grep -q 'ORDER_STATUS.QUEUED' "$STORE"

check \
  "REAL adapter retry state remains supported" \
  grep -q 'ORDER_STATUS.BROKER_SELECTED' "$STORE"

check \
  "REAL routing revalidates assignment immediately before handoff" \
  sh -c '
    route_start=$(grep -n "export async function routeExecutionOrderByMode" "'"$STORE"'" | head -1 | cut -d: -f1)
    next_fn=$(awk -v start="$route_start" "NR > start && /^export async function / { print NR; exit }" "'"$STORE"'")
    test -n "$route_start" &&
    test -n "$next_fn" &&
    sed -n "${route_start},$((next_fn - 1))p" "'"$STORE"'" |
      grep -q "assertRealOrderBrokerAssignment"
  '
check \
  "REAL routing records pre-broker-handoff validation stage" \
  grep -q 'PRE_BROKER_HANDOFF' "$STORE"

check \
  "Unavailable assigned REAL broker has explicit failure contract" \
  grep -q 'REAL_ASSIGNED_BROKER_UNAVAILABLE' "$STORE"

check \
  "REAL broker resolver requires brokerAccountId" \
  sh -c \
  "grep -A45 'async function resolveRealBrokerAccount' '$STORE' | grep -q 'requestedAccountId'"

check \
  "REAL broker resolver requires brokerId" \
  sh -c \
  "grep -A45 'async function resolveRealBrokerAccount' '$STORE' | grep -q 'requestedBrokerId'"

check \
  "REAL broker resolver matches exact account and broker identity" \
  sh -c \
  "grep -A45 'async function resolveRealBrokerAccount' '$STORE' | grep -q 'requestedAccountId' &&
   grep -A45 'async function resolveRealBrokerAccount' '$STORE' | grep -q 'requestedBrokerId'"

check \
  "REAL broker resolver no longer falls back to default broker" \
  sh -c \
  "! grep -A50 'async function resolveRealBrokerAccount' '$STORE' | grep -q 'defaultBroker'"

check \
  "REAL broker resolver no longer falls back to first account" \
  sh -c \
  "! grep -A50 'async function resolveRealBrokerAccount' '$STORE' | grep -q 'accounts\\[0\\]'"

check \
  "broker adapter remains downstream of routeExecutionOrderByMode" \
  grep -q 'placeBrokerOrder(submittedOrder)' "$STORE"

check \
  "verified REAL receipt guard remains" \
  grep -q \
  'REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION' \
  "$STORE"

check \
  "verified REAL fill guard remains" \
  grep -q \
  'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' \
  "$STORE"

check \
  "eligibility service still does not call broker adapter" \
  sh -c "! grep -q 'placeBrokerOrder' '$SERVICE'"

echo
echo "=== PC-031A6 REGRESSION ==="

if bash scripts/verify-pc031a6-per-order-multi-broker-eligibility.sh \
  >/tmp/gatecep-pc031a7-a6.log 2>&1; then
  echo "PASS: PC-031A6 regression suite"
else
  echo "FAIL: PC-031A6 regression suite"
  cat /tmp/gatecep-pc031a7-a6.log
  fail=1
fi

echo
echo "=== DIFF CHECK ==="

if git diff --check -- "$STORE" "$SERVICE"; then
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

echo "Worktree:"
git status --short

if [ "$fail" -ne 0 ]; then
  echo
  echo "PC-031A7 verification FAILED."
  exit 1
fi

echo
echo "PC-031A7 verification PASSED."
