#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=== PC-031A3-V2-R1 VERIFY ==="

pass(){ echo "PASS: $1"; }
fail(){ echo "FAIL: $1"; exit 1; }

grep -q 'A3 entry screens/stores do not submit broker orders directly' scripts/verify-pc031a3-shared-basket-execution-mode.sh \
  && pass "direct-submission boundary check installed" \
  || fail "direct-submission boundary check missing"

grep -q 'A4 broker submission is centralized behind mode-aware routing' scripts/verify-pc031a3-shared-basket-execution-mode.sh \
  && pass "A4-aware routing check installed" \
  || fail "A4-aware routing check missing"

grep -q 'Practice returns before REAL adapter submission' scripts/verify-pc031a3-shared-basket-execution-mode.sh \
  && pass "Practice/REAL separation check installed" \
  || fail "Practice/REAL separation check missing"

echo
echo "=== RUN UPDATED A3 VERIFIER ==="
bash scripts/verify-pc031a3-shared-basket-execution-mode.sh

echo
echo "=== SAFETY ==="
git status --short
echo -n "gatecep-next vs main: "
git rev-list --left-right --count main...HEAD
echo -n "Push guard: "
test -x .git/hooks/pre-push && echo ACTIVE || echo NOT_ACTIVE

echo
echo "PC-031A3-V2-R1 verification PASSED."
