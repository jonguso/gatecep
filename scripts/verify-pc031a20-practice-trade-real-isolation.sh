#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A20 VERIFY — PRACTICE TRADE / REAL EXECUTION ISOLATION ==="

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

TRADE="mobile/app/trade.js"
STORE="mobile/src/services/trade/basketExecutionStore.js"
TEST="mobile/scripts/test-pc031a20-practice-trade-real-isolation.mjs"
RECOVERY="mobile/src/features/broker-sync/realOrderExecutionRecoveryTransitionCore.js"

echo
echo "=== SOURCE CONTRACT ==="

check "A20 runtime test exists" \
  test -f "$TEST"

check "Practice Trade execution-mode helper exists" \
  grep -q \
    'function executionModeOf(execution)' \
    "$TRADE"

check "Practice Trade REAL execution helper exists" \
  grep -q \
    'function isRealExecution(execution)' \
    "$TRADE"

check "single simulated fill uses guarded store helper" \
  grep -q \
    'await markExecutionOrderFilled' \
    "$TRADE"

check "generic OMS update removed from trade.js" \
  sh -c '! grep -q "updateExecutionOrder" "$1"' \
  _ "$TRADE"

check "REAL simulator guard exists" \
  grep -q \
    'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' \
    "$TRADE"

check "Practice simulator explains verified evidence requirement" \
  grep -q \
    'Verified Broker Evidence Required' \
    "$TRADE"

check "store REAL full-fill guard remains" \
  grep -q \
    'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' \
    "$STORE"

check "REAL recovery still carries verified evidence" \
  grep -q \
    'verifiedExecutionEvidence' \
    "$RECOVERY"

echo
echo "=== DIRECT FILLED CONTRACT ==="

filled_count="$(
  grep -c 'status: "FILLED"' "$TRADE" || true
)"

if [ "$filled_count" -eq 1 ]; then
  echo "PASS: trade.js has exactly one remaining direct FILLED assignment"
else
  echo "FAIL: expected exactly one direct FILLED assignment; found $filled_count"
  fail=1
fi

echo
echo "=== A20 RUNTIME ==="

if (
  cd mobile &&
  node scripts/test-pc031a20-practice-trade-real-isolation.mjs \
    >/tmp/gatecep-pc031a20.log 2>&1
); then
  echo "PASS: PC-031A20 Practice/REAL isolation runtime"
  cat /tmp/gatecep-pc031a20.log
else
  echo "FAIL: PC-031A20 Practice/REAL isolation runtime"
  cat /tmp/gatecep-pc031a20.log
  fail=1
fi

echo
echo "=== A19 REGRESSION ==="

if (
  cd mobile &&
  node scripts/test-pc031a19-real-manual-fill-boundary.mjs \
    >/tmp/gatecep-pc031a19.log 2>&1
); then
  echo "PASS: PC-031A19 regression"
else
  echo "FAIL: PC-031A19 regression"
  cat /tmp/gatecep-pc031a19.log
  fail=1
fi

echo
echo "=== A18 REGRESSION ==="

if (
  cd mobile &&
  node scripts/test-pc031a18-recovery-ledger-convergence-runtime.mjs \
    >/tmp/gatecep-pc031a18.log 2>&1
); then
  echo "PASS: PC-031A18 regression"
else
  echo "FAIL: PC-031A18 regression"
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

if git diff --check -- \
  "$TRADE" \
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
  echo "PC-031A20 verification FAILED."
  exit 1
fi

echo
echo "PC-031A20 verification PASSED."
