#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A14 VERIFY — RECOVERY TRANSITION RUNTIME ==="

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

CORE="mobile/src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js"
MATCHER="mobile/src/features/broker-sync/realOrderExecutionEvidenceMatchCore.js"
SERVICE="mobile/src/features/broker-sync/realOrderExecutionEvidenceReconciliationService.js"
STORE="mobile/src/services/trade/basketExecutionStore.js"
POLICY="mobile/src/features/broker-sync/brokerExecutionEvidencePolicy.js"
TEST="mobile/scripts/test-pc031a14-recovery-transition-runtime.mjs"

echo
echo "=== PURE TRANSITION CORE ==="

check "recovery transition core exists" \
  test -f "$CORE"

check "transition builder exported" \
  grep -q 'export function buildRealOrderRecoveryTransition' "$CORE"

check "transition core uses verified matcher" \
  grep -q 'findVerifiedEvidenceMatches' "$CORE"

check "transition core requires REAL execution" \
  grep -q 'resolvedExecutionMode !== "REAL"' "$CORE"

check "transition core requires BROKER_SELECTED" \
  grep -q 'ORDER_STATUS.BROKER_SELECTED' "$CORE"

check "transition core retains recoverable uncertain statuses" \
  grep -q 'SUBMISSION_UNCERTAIN' "$CORE"

check "transition core resolves only to FILLED" \
  grep -q 'status: ORDER_STATUS.FILLED' "$CORE"

check "transition core sets remaining quantity to zero" \
  grep -q 'remainingQuantity: 0' "$CORE"

check "transition core records verified provenance" \
  grep -q 'verifiedExecutionEvidence' "$CORE"

check "transition core records reconciliation audit" \
  grep -q 'realExecutionReconciliation' "$CORE"

check "transition core records submission attempt provenance" \
  grep -q 'submissionAttemptId' "$CORE"

echo
echo "=== EXECUTION-TIME INTEGRITY ==="

check "transition uses broker execution date" \
  grep -q 'const executionDate =' "$CORE"

check "filledAt uses broker execution date" \
  sh -c '
    grep -A2 "filledAt:" "$1" |
    grep -q "executionDate"
  ' _ "$CORE"

check "brokerReceivedAt uses broker execution date" \
  sh -c '
    grep -A2 "brokerReceivedAt:" "$1" |
    grep -q "executionDate"
  ' _ "$CORE"

check "filledAt does not use reconciliation now directly" \
  sh -c '
    ! grep -A2 "filledAt:" "$1" |
    grep -q "now"
  ' _ "$CORE"

check "brokerReceivedAt does not use reconciliation now directly" \
  sh -c '
    ! grep -A2 "brokerReceivedAt:" "$1" |
    grep -q "now"
  ' _ "$CORE"

echo
echo "=== PURE-CORE SAFETY BOUNDARY ==="

check "transition core does not import basket store" \
  sh -c '! grep -q "basketExecutionStore" "$1"' \
  _ "$CORE"

check "transition core does not import user storage" \
  sh -c '! grep -q "userStorage" "$1"' \
  _ "$CORE"

check "transition core does not import React Native or Expo" \
  sh -c '! grep -Eq "react-native|expo-router|AsyncStorage" "$1"' \
  _ "$CORE"

check "transition core cannot update execution order" \
  sh -c '! grep -q "updateExecutionOrder" "$1"' \
  _ "$CORE"

check "transition core cannot place broker order" \
  sh -c '! grep -q "placeBrokerOrder" "$1"' \
  _ "$CORE"

check "transition core cannot route broker order" \
  sh -c '! grep -q "routeExecutionOrderByMode" "$1"' \
  _ "$CORE"

check "transition core cannot invoke manual fill path" \
  sh -c '! grep -q "markExecutionOrderFilled" "$1"' \
  _ "$CORE"

check "transition core does not directly mutate portfolio/cash/lots" \
  sh -c '
    ! grep -Eq \
      "saveCanonical|refreshCanonical|availableCash|cashLedger|lotLedger|portfolioLedger" \
      "$1"
  ' _ "$CORE"

echo
echo "=== STATEFUL RECONCILIATION BOUNDARY ==="

check "stateful service imports transition builder" \
  grep -q 'buildRealOrderRecoveryTransition' "$SERVICE"

check "stateful service loads basket execution" \
  grep -q 'loadBasketExecution' "$SERVICE"

check "stateful service applies updateExecutionOrder" \
  grep -q 'updateExecutionOrder' "$SERVICE"

check "stateful service gates update on resolved decision" \
  grep -q 'if (!decision.resolved)' "$SERVICE"

check "stateful service passes decision patch to update" \
  grep -q 'decision.patch' "$SERVICE"

check "stateful service has no direct broker adapter call" \
  sh -c '! grep -q "placeBrokerOrder" "$1"' \
  _ "$SERVICE"

check "stateful service has no routing call" \
  sh -c '! grep -q "routeExecutionOrderByMode" "$1"' \
  _ "$SERVICE"

check "stateful service has no manual fill call" \
  sh -c '! grep -q "markExecutionOrderFilled" "$1"' \
  _ "$SERVICE"

check "stateful service has no direct portfolio/cash/lot mutation" \
  sh -c '
    ! grep -Eq \
      "saveCanonical|refreshCanonical|availableCash|cashLedger|lotLedger|portfolioLedger" \
      "$1"
  ' _ "$SERVICE"

echo
echo "=== VERIFIED EVIDENCE INTEGRITY ==="

check "matcher still exists" \
  test -f "$MATCHER"

check "broker evidence classifier remains enforced" \
  grep -q 'classifyBrokerExecutionEvidence' "$MATCHER"

check "policy still accepts FILLED" \
  grep -q '"FILLED"' "$POLICY"

check "policy still accepts SETTLED" \
  grep -q '"SETTLED"' "$POLICY"

check "policy still rejects REJECTED" \
  grep -q '"REJECTED"' "$POLICY"

check "policy still rejects REFUSED" \
  grep -q '"REFUSED"' "$POLICY"

check "manual REAL fill guard remains" \
  grep -q 'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' "$STORE"

check "REAL broker receipt guard remains" \
  grep -q 'REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION' "$STORE"

echo
echo "=== RUNTIME REGRESSION ==="

if (
  cd mobile &&
  node scripts/test-pc031a13-recovery-match-runtime.mjs \
    >/tmp/gatecep-pc031a13-runtime.log 2>&1
); then
  echo "PASS: PC-031A13 matcher regression"
else
  echo "FAIL: PC-031A13 matcher regression"
  cat /tmp/gatecep-pc031a13-runtime.log
  fail=1
fi

if (
  cd mobile &&
  node scripts/test-pc031a14-recovery-transition-runtime.mjs \
    >/tmp/gatecep-pc031a14-runtime.log 2>&1
); then
  echo "PASS: PC-031A14 transition runtime"
  cat /tmp/gatecep-pc031a14-runtime.log
else
  echo "FAIL: PC-031A14 transition runtime"
  cat /tmp/gatecep-pc031a14-runtime.log
  fail=1
fi

echo
echo "=== DIFF CHECK ==="

if git diff --check -- \
  "$CORE" \
  "$MATCHER" \
  "$SERVICE" \
  "$STORE" \
  "$POLICY" \
  "$TEST"
then
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
test -x .git/hooks/pre-push \
  && echo ACTIVE \
  || echo NOT_ACTIVE

if [ "$fail" -ne 0 ]; then
  echo
  echo "PC-031A14 verification FAILED."
  exit 1
fi

echo
echo "PC-031A14 verification PASSED."
