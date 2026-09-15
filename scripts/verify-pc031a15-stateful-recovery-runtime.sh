#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A15 VERIFY — STATEFUL RECOVERY RUNTIME ==="

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

SERVICE="mobile/src/features/broker-sync/realOrderExecutionEvidenceReconciliationService.js"
TRANSITION="mobile/src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js"
MATCHER="mobile/src/features/broker-sync/realOrderExecutionEvidenceMatchCore.js"
STORE="mobile/src/services/trade/basketExecutionStore.js"
UPLOAD="mobile/app/transactions-upload.js"
TEST="mobile/scripts/test-pc031a15-stateful-recovery-runtime.mjs"

echo
echo "=== STATEFUL RECOVERY CONTRACT ==="

check "stateful reconciliation service exists" \
  test -f "$SERVICE"

check "service loads basket execution" \
  grep -q 'loadBasketExecution' "$SERVICE"

check "service uses pure transition builder" \
  grep -q 'buildRealOrderRecoveryTransition' "$SERVICE"

check "service returns before persistence when unresolved" \
  grep -q 'if (!decision.resolved)' "$SERVICE"

check "service persists through updateExecutionOrder only" \
  grep -q 'updateExecutionOrder' "$SERVICE"

check "service applies exact transition patch" \
  grep -q 'decision.patch' "$SERVICE"

check "service detects null persistence result" \
  grep -q 'if (!updated)' "$SERVICE"

check "service exposes persistence failure status" \
  grep -q '"RECONCILIATION_PERSISTENCE_FAILED"' "$SERVICE"

check "persistence failure is unresolved" \
  sh -c '
    grep -A15 "RECONCILIATION_PERSISTENCE_FAILED" "$1" |
    grep -q "persistenceSucceeded: false"
  ' _ "$SERVICE"

check "successful persistence is explicitly recorded" \
  grep -q 'persistenceSucceeded: true' "$SERVICE"

check "verified evidence match is explicitly recorded" \
  grep -q 'evidenceMatched: true' "$SERVICE"

echo
echo "=== NO FABRICATED RECOVERY SUCCESS ==="

check "null persistence cannot return execution object" \
  sh -c '
    grep -A15 "RECONCILIATION_PERSISTENCE_FAILED" "$1" |
    grep -q "execution: null"
  ' _ "$SERVICE"

check "stateful service has no direct broker adapter call" \
  sh -c '! grep -q "placeBrokerOrder" "$1"' \
  _ "$SERVICE"

check "stateful service has no routing call" \
  sh -c '! grep -q "routeExecutionOrderByMode" "$1"' \
  _ "$SERVICE"

check "stateful service has no manual REAL fill call" \
  sh -c '! grep -q "markExecutionOrderFilled" "$1"' \
  _ "$SERVICE"

check "stateful service has no direct portfolio/cash/lot mutation" \
  sh -c '
    ! grep -Eq \
      "saveCanonical|refreshCanonical|availableCash|cashLedger|lotLedger|portfolioLedger" \
      "$1"
  ' _ "$SERVICE"

echo
echo "=== PURE-CORE REGRESSION BOUNDARY ==="

check "A13 matcher remains present" \
  test -f "$MATCHER"

check "A14 transition core remains present" \
  test -f "$TRANSITION"

check "transition core still resolves only FILLED" \
  grep -q 'status: ORDER_STATUS.FILLED' "$TRANSITION"

check "transition core still uses broker execution date" \
  grep -q 'const executionDate =' "$TRANSITION"

check "transition core does not mutate basket store" \
  sh -c '! grep -q "updateExecutionOrder" "$1"' \
  _ "$TRANSITION"

echo
echo "=== TRANSACTION-UPLOAD RECOVERY UI ==="

check "upload UI handles persistence failure" \
  grep -q '"RECONCILIATION_PERSISTENCE_FAILED"' "$UPLOAD"

check "upload UI tells investor recovery was not persisted" \
  grep -q 'Recovery Not Persisted' "$UPLOAD"

check "upload UI keeps order locked" \
  grep -q 'The order remains locked' "$UPLOAD"

check "upload UI warns against resubmission" \
  grep -q 'Do not resubmit' "$UPLOAD"

check "persistence failure routes to recovery review" \
  sh -c '
    grep -a -A22 "RECONCILIATION_PERSISTENCE_FAILED" "$1" |
    grep -a -q "/real-order-recovery"
  ' _ "$UPLOAD"

check "successful reconciliation message remains present" \
  grep -q '"REAL Order Reconciled"' "$UPLOAD"

echo
echo "=== REAL EXECUTION SAFETY GUARDS ==="

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
  echo "PASS: PC-031A13 matcher runtime"
else
  echo "FAIL: PC-031A13 matcher runtime"
  cat /tmp/gatecep-pc031a13-runtime.log
  fail=1
fi

if (
  cd mobile &&
  node scripts/test-pc031a14-recovery-transition-runtime.mjs \
    >/tmp/gatecep-pc031a14-runtime.log 2>&1
); then
  echo "PASS: PC-031A14 transition runtime"
else
  echo "FAIL: PC-031A14 transition runtime"
  cat /tmp/gatecep-pc031a14-runtime.log
  fail=1
fi

if (
  cd mobile &&
  node --experimental-vm-modules \
    scripts/test-pc031a15-stateful-recovery-runtime.mjs \
    >/tmp/gatecep-pc031a15-runtime.log 2>&1
); then
  echo "PASS: PC-031A15 stateful runtime"
  cat /tmp/gatecep-pc031a15-runtime.log
else
  echo "FAIL: PC-031A15 stateful runtime"
  cat /tmp/gatecep-pc031a15-runtime.log
  fail=1
fi

echo
echo "=== DIFF CHECK ==="

if git diff --check -- \
  "$SERVICE" \
  "$TRANSITION" \
  "$MATCHER" \
  "$STORE" \
  "$UPLOAD" \
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
  echo "PC-031A15 verification FAILED."
  exit 1
fi

echo
echo "PC-031A15 verification PASSED."
