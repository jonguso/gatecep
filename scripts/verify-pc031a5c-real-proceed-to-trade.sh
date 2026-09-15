#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=== PC-031A5C VERIFY — REAL PROCEED-TO-TRADE HANDOFF ==="

pass(){ echo "PASS: $1"; }
fail(){ echo "FAIL: $1"; exit 1; }

grep -q 'async function proceedRealOrderToReview()' mobile/app/trade.js \
  && pass "REAL Proceed-to-Trade handoff exists" \
  || fail "REAL handoff function missing"

grep -q 'executionMode: "REAL"' mobile/app/trade.js \
  && grep -q '"COACH_G_REAL_DECISION"' mobile/app/trade.js \
  && pass "Trade creates explicit REAL basket intent" \
  || fail "REAL basket intent missing"

grep -q 'router.push("/orders-review")' mobile/app/trade.js \
  && pass "REAL decision enters Orders Review before queue/routing" \
  || fail "REAL handoff does not enter Orders Review"

grep -q 'Proceed to Trade' mobile/app/trade.js \
  && grep -q 'Save to Broker Action Plan' mobile/app/trade.js \
  && pass "Broker Action Plan is optional alongside Proceed to Trade" \
  || fail "Average Cost actions are not correctly separated"

grep -q 'decisionSupport:' mobile/src/services/trade/tradeBasketStore.js \
  && grep -q 'decisionSupport:' mobile/src/services/trade/basketExecutionStore.js \
  && pass "decision-support metadata survives basket -> execution handoff" \
  || fail "decision-support metadata is lost"

grep -q 'minimumSalePrice:' mobile/app/trade.js \
  && grep -q 'maximumBuyPrice:' mobile/app/trade.js \
  && grep -q 'estimatedCharges:' mobile/app/trade.js \
  && grep -q 'removedLots:' mobile/app/trade.js \
  && pass "existing Average Cost/FIFO/fee outputs are attached as advisory metadata" \
  || fail "required advisory metadata missing"

if grep -n 'placeBrokerOrder' mobile/app/trade.js >/dev/null 2>&1; then
  fail "trade.js directly submits REAL broker orders"
else
  pass "trade.js does not bypass Orders Review/Queue"
fi

grep -q 'brokerId: null' mobile/app/trade.js \
  && grep -q 'brokerAccountId: null' mobile/app/trade.js \
  && pass "REAL order creation does not require broker connection before review" \
  || fail "REAL handoff unexpectedly requires broker identity"

grep -q 'Number(existingExecution?.activeOrders || 0) > 0' mobile/app/trade.js \
  && pass "REAL handoff protects existing active queue from overwrite" \
  || fail "active execution overwrite guard missing"

grep -q 'REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION' \
  mobile/src/services/trade/basketExecutionStore.js \
  && pass "A5B REAL broker-receipt boundary remains intact" \
  || fail "A5B receipt boundary regressed"

grep -q 'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' \
  mobile/src/services/trade/basketExecutionStore.js \
  && pass "REAL manual fill guard remains intact" \
  || fail "REAL fill guard regressed"

grep -q 'placeBrokerOrder(submittedOrder)' mobile/src/services/trade/basketExecutionStore.js \
  && pass "A4 broker routing remains downstream of review/queue" \
  || fail "A4 broker routing regressed"

echo
echo "=== REAL HANDOFF SNIPPET ==="
grep -nA135 -B12 'async function proceedRealOrderToReview' mobile/app/trade.js | sed -n '1,175p'

echo
echo "=== AVERAGE COST ACTIONS ==="
grep -nA48 -B10 'Decision Preview — No REAL Trade Executed' mobile/app/trade.js || true

echo
echo "=== ACTIVE saveTradeBasket CALLERS ==="
grep -RIn \
  --exclude-dir=node_modules \
  --exclude-dir=.expo \
  --exclude-dir=dist \
  --exclude='*.bak' \
  'saveTradeBasket(' \
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
echo "PC-031A5C verification PASSED."
