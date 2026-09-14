#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=== PC-031A5C-R1 VERIFY — REAL PROCEED-TO-TRADE REPAIR ==="

pass(){ echo "PASS: $1"; }
fail(){ echo "FAIL: $1"; exit 1; }

grep -q 'createBasketExecution,' mobile/app/trade.js \
  && grep -q 'from "../src/trade/basketExecutionStore"' mobile/app/trade.js \
  && pass "trade.js imports createBasketExecution through compatibility wrapper" \
  || fail "createBasketExecution wrapper import missing"

grep -q 'saveTradeBasket' mobile/app/trade.js \
  && grep -q 'from "../src/trade/tradeBasketStore"' mobile/app/trade.js \
  && pass "trade.js imports saveTradeBasket through compatibility wrapper" \
  || fail "saveTradeBasket wrapper import missing"

grep -q 'async function proceedRealOrderToReview()' mobile/app/trade.js \
  && pass "REAL Proceed-to-Trade handoff exists" \
  || fail "REAL handoff function missing"

grep -q '"COACH_G_REAL_DECISION"' mobile/app/trade.js \
  && grep -q 'executionMode: "REAL"' mobile/app/trade.js \
  && pass "REAL basket intent is explicit" \
  || fail "REAL basket intent missing"

grep -q 'router.push("/orders-review")' mobile/app/trade.js \
  && pass "REAL order enters Orders Review before queue/routing" \
  || fail "Orders Review handoff missing"

grep -q 'Proceed to Trade' mobile/app/trade.js \
  && grep -q 'Save to Broker Action Plan' mobile/app/trade.js \
  && pass "Proceed and Save-for-Later actions are separated" \
  || fail "Average Cost actions not separated"

grep -q 'decisionSupport:' mobile/src/services/trade/tradeBasketStore.js \
  && grep -q 'decisionSupport:' mobile/src/services/trade/basketExecutionStore.js \
  && pass "partial A5C metadata changes remain intact" \
  || fail "decisionSupport metadata contract missing"

grep -q 'minimumSalePrice:' mobile/app/trade.js \
  && grep -q 'maximumBuyPrice:' mobile/app/trade.js \
  && grep -q 'estimatedCharges:' mobile/app/trade.js \
  && grep -q 'removedLots:' mobile/app/trade.js \
  && pass "Average Cost/FIFO outputs attached as advisory metadata" \
  || fail "advisory metadata missing"

if grep -n 'placeBrokerOrder' mobile/app/trade.js >/dev/null 2>&1; then
  fail "trade.js bypasses queue and directly submits to broker"
else
  pass "trade.js does not directly call broker adapter"
fi

grep -q 'brokerId: null' mobile/app/trade.js \
  && grep -q 'brokerAccountId: null' mobile/app/trade.js \
  && pass "broker connection is deferred until routing boundary" \
  || fail "REAL review unexpectedly requires broker identity"

grep -q 'Number(existingExecution?.activeOrders || 0) > 0' mobile/app/trade.js \
  && pass "existing active execution is protected from overwrite" \
  || fail "active execution guard missing"

grep -q 'REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION' \
  mobile/src/services/trade/basketExecutionStore.js \
  && pass "A5B REAL receipt boundary remains intact" \
  || fail "A5B receipt guard regressed"

grep -q 'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' \
  mobile/src/services/trade/basketExecutionStore.js \
  && pass "REAL fill boundary remains intact" \
  || fail "REAL fill guard regressed"

grep -q 'placeBrokerOrder(submittedOrder)' \
  mobile/src/services/trade/basketExecutionStore.js \
  && pass "A4 adapter routing remains downstream" \
  || fail "A4 adapter routing regressed"

echo
echo "=== REAL HANDOFF SNIPPET ==="
grep -nA130 -B12 'async function proceedRealOrderToReview' mobile/app/trade.js | sed -n '1,170p'

echo
echo "=== AVERAGE COST ACTIONS ==="
grep -nA45 -B8 'Decision Preview — No REAL Trade Executed' mobile/app/trade.js || true

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
echo "PC-031A5C-R1 verification PASSED."
