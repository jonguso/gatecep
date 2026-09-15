#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=== PC-031A3-V2 VERIFY — MAINTAINED A3 CONTRACT ==="

pass(){ echo "PASS: $1"; }
fail(){ echo "FAIL: $1"; exit 1; }

grep -q 'A3 entry screens/stores do not submit broker orders directly'   scripts/verify-pc031a3-shared-basket-execution-mode.sh   && pass "stale global no-placeBrokerOrder assertion removed"   || fail "maintained A3 direct-submission check missing"

grep -q 'A4 broker submission is centralized behind mode-aware routing'   scripts/verify-pc031a3-shared-basket-execution-mode.sh   && pass "A3 verifier recognizes intentional A4 extension"   || fail "A4-aware verifier check missing"

grep -q 'Practice returns before REAL adapter submission'   scripts/verify-pc031a3-shared-basket-execution-mode.sh   && pass "verifier checks Practice/REAL routing separation"   || fail "Practice/REAL separation check missing"

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
echo "PC-031A3-V2 verification PASSED."
