#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=== PC-031A5B VERIFY — VERIFIED RECEIPT BOUNDARY + SHARED ORDERS REVIEW ==="

pass(){ echo "PASS: $1"; }
fail(){ echo "FAIL: $1"; exit 1; }

grep -q 'REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION' \
  mobile/src/services/trade/basketExecutionStore.js \
  && pass "generic broker receipt helper blocks REAL orders" \
  || fail "REAL broker receipt guard missing"

grep -q 'executionMode: "PRACTICE"' mobile/src/services/trade/basketExecutionStore.js \
  && grep -q 'GateCEP Broker received Practice order' mobile/src/services/trade/basketExecutionStore.js \
  && pass "Practice broker receipt remains available" \
  || fail "Practice broker receipt contract missing"

if grep -n 'markBrokerReceived,' mobile/app/orders.js >/dev/null 2>&1; then
  fail "orders.js still imports unused markBrokerReceived"
else
  pass "stale Orders import removed"
fi

grep -q 'const isRealExecution = executionMode === "REAL";' mobile/app/orders-review.js \
  && pass "Orders Review is execution-mode aware" \
  || fail "Orders Review mode detection missing"

grep -q 'REAL Orders Review' mobile/app/orders-review.js \
  && grep -q 'Practice Orders Review' mobile/app/orders-review.js \
  && pass "Orders Review exposes correct REAL/Practice titles" \
  || fail "Orders Review titles are not mode-aware"

grep -q 'Queueing does not create broker receipt or execution evidence' mobile/app/orders-review.js \
  && pass "REAL queue review clearly preserves evidence boundary" \
  || fail "REAL review evidence warning missing"

grep -q 'placeBrokerOrder(submittedOrder)' mobile/src/services/trade/basketExecutionStore.js \
  && pass "PC-031A4 REAL adapter routing remains intact" \
  || fail "PC-031A4 routing regressed"

grep -q 'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' mobile/src/services/trade/basketExecutionStore.js \
  && pass "REAL manual fill guard remains intact" \
  || fail "REAL fill guard regressed"

echo
echo "=== markBrokerReceived REFERENCES ==="
grep -RIn \
  --exclude-dir=node_modules \
  --exclude-dir=.expo \
  --exclude-dir=dist \
  --exclude='*.bak' \
  --exclude='*.map' \
  'markBrokerReceived' \
  mobile/app mobile/src \
  2>/dev/null | sed -n '1,120p' || true

echo
echo "=== DIFF STAT ==="
git diff --stat

echo
echo "=== SAFETY ==="
git status --short
echo -n "gatecep-next vs main: "
git rev-list --left-right --count main...HEAD
echo -n "Push guard: "
test -x .git/hooks/pre-push && echo ACTIVE || echo NOT_ACTIVE

echo
echo "PC-031A5B verification PASSED."
