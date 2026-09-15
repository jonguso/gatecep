#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A6 VERIFY — PER-ORDER MULTI-BROKER EXECUTION ELIGIBILITY ==="

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

SERVICE="mobile/src/services/trade/brokerExecutionEligibilityService.js"
REVIEW="mobile/app/orders-review.js"
STORE="mobile/src/services/trade/basketExecutionStore.js"
BASKET="mobile/app/trade-basket.js"

check "eligibility service exists" test -f "$SERVICE"
check "eligibility service loads canonical broker accounts" grep -q 'loadBrokerAccounts' "$SERVICE"
check "eligibility service uses account-scoped REAL cash" grep -q 'loadRealAvailableCashForSource' "$SERVICE"
check "eligibility service reads canonical REAL portfolio holdings" grep -q 'loadUnifiedPortfolio' "$SERVICE"
check "Practice broker identities excluded from REAL candidates" grep -q 'isPracticeBrokerIdentity' "$SERVICE"
check "BUY eligibility checks broker-specific trading space" grep -q 'INSUFFICIENT_TRADING_SPACE' "$SERVICE"
check "SELL eligibility checks broker-specific holding" grep -q 'INSUFFICIENT_BROKER_HOLDING' "$SERVICE"
check "basket-level cash reservation exists" grep -q 'reservedCash' "$SERVICE"
check "basket-level SELL quantity reservation exists" grep -q 'reservedQuantity' "$SERVICE"
check "verified broker fees are reused" grep -q 'estimateBrokerOrderCharges' "$SERVICE"

check "Orders Review loads broker eligibility" grep -q 'buildRealOrderBrokerEligibility' "$REVIEW"
check "Orders Review offers Broker Route per REAL order" grep -q 'Broker Route' "$REVIEW"
check "Orders Review persists brokerAccountId per order" grep -q 'brokerAccountId: candidate.brokerAccountId' "$REVIEW"
check "Orders Review persists brokerId per order" grep -q 'brokerId: candidate.brokerId' "$REVIEW"
check "Orders Review shows broker-specific BUY cash" grep -q 'candidate.projectedAvailableCash' "$REVIEW"
check "Orders Review shows broker-specific SELL quantity" grep -q 'candidate.projectedAvailableQuantity' "$REVIEW"
check "Orders Review blocks invalid REAL order preparation" grep -q 'Eligible Broker Required' "$REVIEW"
check "Orders Review blocks invalid REAL basket handoff" grep -q 'Broker Assignment Required' "$REVIEW"

check "service-layer REAL broker assignment invariant exists" grep -q 'REAL_ORDER_BROKER_ASSIGNMENT_REQUIRED' "$STORE"
check "service-layer REAL eligibility invariant exists" grep -q 'REAL_ORDER_BROKER_ELIGIBILITY_REQUIRED' "$STORE"
check "queue all validates broker assignment" sh -c "grep -A25 'export async function queueExecutionOrders' '$STORE' | grep -q 'assertRealOrderBrokerAssignment'"
check "queue single validates broker assignment" sh -c "grep -A45 'export async function queueSingleOrder' '$STORE' | grep -q 'assertRealOrderBrokerAssignment'"

check "Trade Basket is mode-aware" grep -q 'REAL Trade Basket' "$BASKET"
check "Trade Basket points REAL broker selection to Orders Review" grep -q 'assigning a broker to each order in Orders Review' "$BASKET"

echo
echo "=== INTEGRITY BOUNDARIES ==="
check "eligibility service does not call broker adapter" sh -c "! grep -q 'placeBrokerOrder' '$SERVICE'"
check "eligibility service does not mutate portfolio" sh -c "! grep -Eq 'userSetItem|saveUnifiedPortfolio|replaceAuthoritativeBrokerPortfolio' '$SERVICE'"
check "Orders Review does not call broker adapter" sh -c "! grep -q 'placeBrokerOrder' '$REVIEW'"
check "REAL route remains downstream in basketExecutionStore" grep -q 'routeExecutionOrderByMode' "$STORE"
check "verified REAL receipt guard remains" grep -q 'REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION' "$STORE"
check "verified REAL fill guard remains" grep -q 'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' "$STORE"

echo
echo "=== DIFF CHECK ==="
if git diff --check -- "$SERVICE" "$REVIEW" "$STORE" "$BASKET"; then
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
  echo "PC-031A6 verification FAILED."
  exit 1
fi

echo
echo "PC-031A6 verification PASSED."
