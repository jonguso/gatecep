#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A18 VERIFY — RECOVERY / LEDGER CONVERGENCE ==="

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

TEST="mobile/scripts/test-pc031a18-recovery-ledger-convergence-runtime.mjs"
MATCHER="mobile/src/features/broker-sync/realOrderExecutionEvidenceMatchCore.js"
TRANSITION="mobile/src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js"
RECOVERY="mobile/src/features/broker-sync/realOrderExecutionEvidenceReconciliationService.js"
LEDGER="mobile/src/features/trading/canonicalPortfolioLedgerService.js"

echo
echo "=== SOURCE CONTRACT ==="

check "A18 runtime test exists" \
  test -f "$TEST"

check "A13 matcher exists" \
  test -f "$MATCHER"

check "A14 transition exists" \
  test -f "$TRANSITION"

check "A15 reconciliation exists" \
  test -f "$RECOVERY"

check "canonical ledger exists" \
  test -f "$LEDGER"

check "canonical ledger reads broker transaction history" \
  grep -q 'userGetItem("transactionHistory")' "$LEDGER"

check "canonical ledger does not read basket execution" \
  sh -c '! grep -Eq "loadBasketExecution|basketExecutionStore" "$1"' \
  _ "$LEDGER"

check "recovery layers do not mutate REAL accounting" \
  sh -c '
    ! grep -Eq \
      "saveCanonicalRealBrokerPortfolio|refreshCanonicalRealPortfolioSnapshot|rebuildCanonicalPortfolioLedger|canonicalPortfolioLedger|availableCash|cashLedger|lotLedger" \
      "$1" "$2" "$3"
  ' _ "$MATCHER" "$TRANSITION" "$RECOVERY"

check "recovery layers do not route or manually fill broker orders" \
  sh -c '
    ! grep -Eq \
      "placeBrokerOrder|routeExecutionOrderByMode|markExecutionOrderFilled" \
      "$1" "$2" "$3"
  ' _ "$MATCHER" "$TRANSITION" "$RECOVERY"

check "canonical accounting cannot rewrite OMS state" \
  sh -c '
    ! grep -Eq \
      "updateExecutionOrder|saveBasketExecution|markExecutionOrderFilled|BROKER_SELECTED|SUBMISSION_UNCERTAIN" \
      "$1"
  ' _ "$LEDGER"

echo
echo "=== A18 RUNTIME ==="

if (
  cd mobile &&
  node scripts/test-pc031a18-recovery-ledger-convergence-runtime.mjs \
    >/tmp/gatecep-pc031a18.log 2>&1
); then
  echo "PASS: PC-031A18 convergence runtime"
  cat /tmp/gatecep-pc031a18.log
else
  echo "FAIL: PC-031A18 convergence runtime"
  cat /tmp/gatecep-pc031a18.log
  fail=1
fi

echo
echo "=== A17 REGRESSION ==="

if (
  cd mobile &&
  node scripts/test-pc031a17-single-canonical-rebuild-runtime.mjs \
    >/tmp/gatecep-pc031a17.log 2>&1
); then
  echo "PASS: PC-031A17 regression"
else
  echo "FAIL: PC-031A17 regression"
  cat /tmp/gatecep-pc031a17.log
  fail=1
fi

echo
echo "=== A16 REGRESSION ==="

if (
  cd mobile &&
  node scripts/test-pc031a16-canonical-evidence-boundary-runtime.mjs \
    >/tmp/gatecep-pc031a16.log 2>&1
); then
  echo "PASS: PC-031A16 regression"
else
  echo "FAIL: PC-031A16 regression"
  cat /tmp/gatecep-pc031a16.log
  fail=1
fi

echo
echo "=== A15 REGRESSION ==="

if (
  cd mobile &&
  node --experimental-vm-modules \
    scripts/test-pc031a15-stateful-recovery-runtime.mjs \
    >/tmp/gatecep-pc031a15.log 2>&1
); then
  echo "PASS: PC-031A15 regression"
else
  echo "FAIL: PC-031A15 regression"
  cat /tmp/gatecep-pc031a15.log
  fail=1
fi

echo
echo "=== A14 REGRESSION ==="

if (
  cd mobile &&
  node scripts/test-pc031a14-recovery-transition-runtime.mjs \
    >/tmp/gatecep-pc031a14.log 2>&1
); then
  echo "PASS: PC-031A14 regression"
else
  echo "FAIL: PC-031A14 regression"
  cat /tmp/gatecep-pc031a14.log
  fail=1
fi

echo
echo "=== A13 REGRESSION ==="

if (
  cd mobile &&
  node scripts/test-pc031a13-recovery-match-runtime.mjs \
    >/tmp/gatecep-pc031a13.log 2>&1
); then
  echo "PASS: PC-031A13 regression"
else
  echo "FAIL: PC-031A13 regression"
  cat /tmp/gatecep-pc031a13.log
  fail=1
fi

echo
echo "=== CANONICAL LEDGER REGRESSION ==="

if (
  cd mobile &&
  node scripts/test-pc030m20ag-canonical-portfolio-ledger.mjs \
    >/tmp/gatecep-pc030m20ag.log 2>&1
); then
  echo "PASS: canonical ledger regression"
else
  echo "FAIL: canonical ledger regression"
  cat /tmp/gatecep-pc030m20ag.log
  fail=1
fi

echo
echo "=== FIFO REGRESSION ==="

if (
  cd mobile &&
  node scripts/test-pc030m20af-historical-security-lot-ledger.mjs \
    >/tmp/gatecep-pc030m20af.log 2>&1
); then
  echo "PASS: FIFO lot ledger regression"
else
  echo "FAIL: FIFO lot ledger regression"
  cat /tmp/gatecep-pc030m20af.log
  fail=1
fi

echo
echo "=== DIFF CHECK ==="

if git diff --check -- "$TEST"; then
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
  echo "PC-031A18 verification FAILED."
  exit 1
fi

echo
echo "PC-031A18 verification PASSED."
