#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A16 VERIFY — CANONICAL REAL EVIDENCE BOUNDARY ==="

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

LEDGER="mobile/src/features/trading/canonicalPortfolioLedgerService.js"
EVIDENCE="mobile/src/features/broker-sync/brokerExecutionEvidencePolicy.js"
LOTS="mobile/src/features/trading/historicalSecurityLotLedgerService.js"
LOT_EVIDENCE="mobile/src/features/trading/brokerLotHistoryEvidenceService.js"
MATCHER="mobile/src/features/broker-sync/realOrderExecutionEvidenceMatchCore.js"
TRANSITION="mobile/src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js"
RECOVERY="mobile/src/features/broker-sync/realOrderExecutionEvidenceReconciliationService.js"
UPLOAD="mobile/app/transactions-upload.js"
TEST="mobile/scripts/test-pc031a16-canonical-evidence-boundary-runtime.mjs"

echo
echo "=== FAIL-CLOSED CANONICAL EVIDENCE GATE ==="

check "canonical ledger service exists" \
  test -f "$LEDGER"

check "canonical ledger requires explicit REAL authorization" \
  grep -q 'canAffectRealPortfolio === true' "$LEDGER"

check "old permissive gate is absent" \
  sh -c '! grep -q "canAffectRealPortfolio !== false" "$1"' \
  _ "$LEDGER"

check "canonical security ledger remains evidence driven" \
  grep -q 'source: "VERIFIED_BROKER_EXECUTION_EVIDENCE"' "$LEDGER"

check "canonical ledger remains read-only for REAL portfolio" \
  grep -q 'mutatesRealPortfolio: false' "$LEDGER"

check "canonical ledger remains read-only for PRACTICE portfolio" \
  grep -q 'mutatesPracticePortfolio: false' "$LEDGER"

echo
echo "=== BROKER EXECUTION EVIDENCE POLICY ==="

check "evidence policy marks verified execution" \
  grep -q '"VERIFIED_BROKER_EXECUTION"' "$EVIDENCE"

check "evidence policy controls REAL portfolio eligibility" \
  grep -q 'canAffectRealPortfolio: missing.length === 0' "$EVIDENCE"

check "completed execution statuses remain defined" \
  grep -q 'FULLY TRADED.*FILLED.*COMPLETED.*SETTLED' "$EVIDENCE"

check "non-executed statuses remain blocked" \
  grep -q 'REJECTED.*REFUSED.*CANCELLED.*CANCELED.*EXPIRED' "$EVIDENCE"

echo
echo "=== LOT / FIFO INTEGRITY ==="

check "historical lot ledger exists" \
  test -f "$LOTS"

check "lot path requires completed execution" \
  grep -q 'filter(isCompletedLotExecution)' "$LOTS"

check "completed lot statuses remain constrained" \
  grep -q 'FULLY TRADED.*FILLED.*COMPLETED.*SETTLED' "$LOT_EVIDENCE"

check "historical lot ledger remains analytical only" \
  grep -q 'analyticalOnly: true' "$LOTS"

check "historical lot ledger does not mutate REAL portfolio" \
  grep -q 'mutatesRealPortfolio: false' "$LOTS"

echo
echo "=== OMS / ACCOUNTING SEPARATION ==="

check "A13 matcher exists" \
  test -f "$MATCHER"

check "A14 transition exists" \
  test -f "$TRANSITION"

check "A15 reconciliation exists" \
  test -f "$RECOVERY"

check "A13-A15 do not directly mutate REAL accounting" \
  sh -c '
    ! grep -Eq \
      "saveCanonical|refreshCanonical|availableCash|cashLedger|lotLedger|portfolioLedger" \
      "$1" "$2" "$3"
  ' _ "$MATCHER" "$TRANSITION" "$RECOVERY"

check "A13-A15 do not directly submit broker orders" \
  sh -c '
    ! grep -Eq \
      "placeBrokerOrder|routeExecutionOrderByMode" \
      "$1" "$2" "$3"
  ' _ "$MATCHER" "$TRANSITION" "$RECOVERY"

check "A13-A15 do not create manual REAL fills" \
  sh -c '
    ! grep -q \
      "markExecutionOrderFilled" \
      "$1" "$2" "$3"
  ' _ "$MATCHER" "$TRANSITION" "$RECOVERY"

echo
echo "=== TRANSACTION-UPLOAD ORDERING ==="

check "upload stores verified transaction history" \
  grep -q 'userSetItem("transactionHistory"' "$UPLOAD"

check "upload rebuilds canonical ledger from stored evidence" \
  grep -q 'rebuildCanonicalPortfolioLedger' "$UPLOAD"

check "upload invokes OMS reconciliation separately" \
  grep -q 'reconcileUncertainRealOrderFromVerifiedEvidence' "$UPLOAD"

echo
echo "=== A16 RUNTIME ==="

if (
  cd mobile &&
  node scripts/test-pc031a16-canonical-evidence-boundary-runtime.mjs \
    >/tmp/gatecep-pc031a16-runtime.log 2>&1
); then
  echo "PASS: PC-031A16 canonical evidence boundary runtime"
  cat /tmp/gatecep-pc031a16-runtime.log
else
  echo "FAIL: PC-031A16 canonical evidence boundary runtime"
  cat /tmp/gatecep-pc031a16-runtime.log
  fail=1
fi

echo
echo "=== REGRESSION — CANONICAL LEDGER ==="

if (
  cd mobile &&
  node scripts/test-pc030m20ag-canonical-portfolio-ledger.mjs \
    >/tmp/gatecep-pc030m20ag.log 2>&1
); then
  echo "PASS: canonical portfolio ledger regression"
else
  echo "FAIL: canonical portfolio ledger regression"
  cat /tmp/gatecep-pc030m20ag.log
  fail=1
fi

echo
echo "=== REGRESSION — FIFO LOT LEDGER ==="

if (
  cd mobile &&
  node scripts/test-pc030m20af-historical-security-lot-ledger.mjs \
    >/tmp/gatecep-pc030m20af.log 2>&1
); then
  echo "PASS: historical FIFO lot ledger regression"
else
  echo "FAIL: historical FIFO lot ledger regression"
  cat /tmp/gatecep-pc030m20af.log
  fail=1
fi

echo
echo "=== REGRESSION — A13/A14/A15 ==="

if (
  cd mobile &&
  node scripts/test-pc031a13-recovery-match-runtime.mjs \
    >/tmp/gatecep-pc031a13.log 2>&1
); then
  echo "PASS: PC-031A13 matcher runtime"
else
  echo "FAIL: PC-031A13 matcher runtime"
  cat /tmp/gatecep-pc031a13.log
  fail=1
fi

if (
  cd mobile &&
  node scripts/test-pc031a14-recovery-transition-runtime.mjs \
    >/tmp/gatecep-pc031a14.log 2>&1
); then
  echo "PASS: PC-031A14 transition runtime"
else
  echo "FAIL: PC-031A14 transition runtime"
  cat /tmp/gatecep-pc031a14.log
  fail=1
fi

if (
  cd mobile &&
  node --experimental-vm-modules \
    scripts/test-pc031a15-stateful-recovery-runtime.mjs \
    >/tmp/gatecep-pc031a15.log 2>&1
); then
  echo "PASS: PC-031A15 stateful runtime"
else
  echo "FAIL: PC-031A15 stateful runtime"
  cat /tmp/gatecep-pc031a15.log
  fail=1
fi

echo
echo "=== DIFF CHECK ==="

if git diff --check -- \
  "$LEDGER" \
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
  echo "PC-031A16 verification FAILED."
  exit 1
fi

echo
echo "PC-031A16 verification PASSED."
