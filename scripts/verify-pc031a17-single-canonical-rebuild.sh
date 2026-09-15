#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== PC-031A17 VERIFY — SINGLE CANONICAL REBUILD ==="

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

UPLOAD="mobile/app/transactions-upload.js"
IMPORT="mobile/app/transaction-import.js"
A17_TEST="mobile/scripts/test-pc031a17-single-canonical-rebuild-runtime.mjs"

echo
echo "=== SOURCE CONTRACT ==="

check "transactions-upload exists" \
  test -f "$UPLOAD"

check "transaction-import exists" \
  test -f "$IMPORT"

check "A17 runtime test exists" \
  test -f "$A17_TEST"

count_upload="$(
  grep -c \
    'await rebuildCanonicalPortfolioLedger();' \
    "$UPLOAD" || true
)"

if [ "$count_upload" -eq 1 ]; then
  echo "PASS: transactions-upload has exactly one canonical rebuild"
else
  echo "FAIL: transactions-upload canonical rebuild count is $count_upload"
  fail=1
fi

count_import="$(
  grep -c \
    'await rebuildCanonicalPortfolioLedger();' \
    "$IMPORT" || true
)"

if [ "$count_import" -eq 1 ]; then
  echo "PASS: transaction-import has exactly one canonical rebuild"
else
  echo "FAIL: transaction-import canonical rebuild count is $count_import"
  fail=1
fi

check "verified evidence is saved before rebuild" \
  python - "$UPLOAD" <<'PY'
from pathlib import Path
import sys

s = Path(sys.argv[1]).read_text()

verified = s.index('userSetItem("transactionHistory"')
unverified = s.index('userSetItem("unverifiedTransactionHistory"')
rebuild = s.index("await rebuildCanonicalPortfolioLedger();")

raise SystemExit(
    0 if rebuild > verified and rebuild > unverified else 1
)
PY

check "sync status runs after canonical rebuild" \
  python - "$UPLOAD" <<'PY'
from pathlib import Path
import sys

s = Path(sys.argv[1]).read_text()

rebuild = s.index("await rebuildCanonicalPortfolioLedger();")
sync = s.index("await buildSyncStatus();")

raise SystemExit(0 if sync > rebuild else 1)
PY

check "OMS recovery remains downstream of sync status" \
  python - "$UPLOAD" <<'PY'
from pathlib import Path
import sys

s = Path(sys.argv[1]).read_text()

sync = s.index("await buildSyncStatus();")
recovery = s.index(
    "await reconcileUncertainRealOrderFromVerifiedEvidence"
)

raise SystemExit(0 if recovery > sync else 1)
PY

echo
echo "=== A17 RUNTIME ==="

if (
  cd mobile &&
  node scripts/test-pc031a17-single-canonical-rebuild-runtime.mjs \
    >/tmp/gatecep-pc031a17.log 2>&1
); then
  echo "PASS: PC-031A17 runtime"
  cat /tmp/gatecep-pc031a17.log
else
  echo "FAIL: PC-031A17 runtime"
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
  echo "PASS: PC-031A16 canonical evidence regression"
else
  echo "FAIL: PC-031A16 canonical evidence regression"
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
  echo "PASS: PC-031A15 stateful recovery regression"
else
  echo "FAIL: PC-031A15 stateful recovery regression"
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
  echo "PASS: PC-031A14 transition regression"
else
  echo "FAIL: PC-031A14 transition regression"
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
  echo "PASS: PC-031A13 matcher regression"
else
  echo "FAIL: PC-031A13 matcher regression"
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
  echo "PASS: canonical portfolio ledger regression"
else
  echo "FAIL: canonical portfolio ledger regression"
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
  echo "PASS: historical FIFO lot ledger regression"
else
  echo "FAIL: historical FIFO lot ledger regression"
  cat /tmp/gatecep-pc030m20af.log
  fail=1
fi

echo
echo "=== DIFF CHECK ==="

if git diff --check -- \
  "$UPLOAD" \
  "$A17_TEST"
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
  echo "PC-031A17 verification FAILED."
  exit 1
fi

echo
echo "PC-031A17 verification PASSED."
