#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "=== PC-031A4 VERIFY — MODE-AWARE QUEUE → BROKER ADAPTER RECOVERY ==="

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

grep -q 'export async function routeExecutionOrderByMode' mobile/src/services/trade/basketExecutionStore.js \
  && pass "shared mode-aware routing helper exists" \
  || fail "mode-aware routing helper missing"

grep -q 'placeBrokerOrder(submittedOrder)' mobile/src/services/trade/basketExecutionStore.js \
  && pass "REAL routing reconnects to broker adapter layer" \
  || fail "REAL placeBrokerOrder call missing"

grep -q 'loadBrokerAccounts' mobile/src/services/trade/basketExecutionStore.js \
  && grep -q 'isConnectedRealBrokerAccount' mobile/src/services/trade/basketExecutionStore.js \
  && pass "REAL routing resolves connected REAL broker accounts" \
  || fail "REAL broker-account resolution missing"

grep -q 'brokerStatus:' mobile/src/services/trade/basketExecutionStore.js \
  && grep -q 'status: ORDER_STATUS.ROUTED' mobile/src/services/trade/basketExecutionStore.js \
  && pass "REAL adapter response is retained on ROUTED order" \
  || fail "REAL routed response contract missing"

grep -q 'brokerReceivedAt: null' mobile/src/services/trade/basketExecutionStore.js \
  && pass "REAL routing does not fabricate broker receipt" \
  || fail "REAL routing may fabricate broker receipt"

grep -q 'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' mobile/src/services/trade/basketExecutionStore.js \
  && pass "service layer blocks manual REAL fill" \
  || fail "service layer REAL fill guard missing"

grep -q 'REAL orders cannot be manually marked as partially filled' mobile/app/queue-manager.js \
  && pass "Queue Manager blocks manual REAL partial fill" \
  || fail "Queue Manager REAL partial guard missing"

grep -q 'REAL orders cannot be manually filled' mobile/app/orders.js \
  && pass "Orders screen blocks manual REAL fill" \
  || fail "Orders screen REAL fill guard missing"

grep -q 'routeExecutionOrderByMode(order.id)' mobile/app/queue-manager.js \
  && grep -q 'routeExecutionOrderByMode(order.id)' mobile/app/orders.js \
  && pass "both order routing screens use shared mode-aware router" \
  || fail "routing screens still diverge"

grep -q 'brokerId: "GATECEP_PRACTICE"' mobile/src/services/trade/basketExecutionStore.js \
  && grep -q 'brokerName: "GateCEP Broker"' mobile/src/services/trade/basketExecutionStore.js \
  && pass "Practice route uses canonical GateCEP Broker identity" \
  || fail "Practice canonical broker identity missing"

if grep -n 'Simulation Broker\|Practice Simulator' \
  mobile/app/queue-manager.js \
  mobile/app/orders.js \
  mobile/src/services/trade/basketExecutionStore.js \
  >/dev/null 2>&1; then
  fail "active queue/order routing still exposes legacy Simulation Broker labels"
else
  pass "active queue/order routing no longer exposes legacy simulation labels"
fi

if grep -n 'order.brokerId || "SIM"\|brokerId = "SIM"' mobile/src/services/brokers/brokerAdapters.js >/dev/null 2>&1; then
  fail "broker adapter defaults still use SIM"
else
  pass "broker adapter defaults use canonical GateCEP Practice identity"
fi

# Pending named broker adapters must still be pending, not fake success.
for f in \
  mobile/src/services/brokers/aibAdapter.js \
  mobile/src/services/brokers/abcAdapter.js \
  mobile/src/services/brokers/ncbaAdapter.js \
  mobile/src/services/brokers/faidaAdapter.js \
  mobile/src/services/brokers/genghisAdapter.js
do
  grep -q 'createPendingApiResponse' "$f" || fail "$f no longer uses pending API contract"
done
pass "named broker adapters remain pending API connectors"

grep -q 'status = "MANUAL_CONFIRMATION_REQUIRED"' mobile/src/services/brokers/pendingBrokerAdapter.js \
  && grep -q 'brokerOrderId: null' mobile/src/services/brokers/pendingBrokerAdapter.js \
  && pass "pending broker response remains manual-confirmation-required with no broker order id" \
  || fail "pending broker response contract changed unexpectedly"

# A2C/A3 invariants.
grep -q 'id: "GATECEP_PRACTICE"' mobile/src/services/brokers/brokerRegistry.js \
  && grep -q 'name: "GateCEP Broker"' mobile/src/services/brokers/brokerRegistry.js \
  && pass "PC-031A2C canonical GateCEP Broker identity remains intact" \
  || fail "PC-031A2C identity regressed"

grep -q 'PRACTICE: "PRACTICE"' mobile/src/services/trade/tradeBasketStore.js \
  && grep -q 'REAL: "REAL"' mobile/src/services/trade/tradeBasketStore.js \
  && pass "PC-031A3 shared execution-mode contract remains intact" \
  || fail "PC-031A3 execution mode contract regressed"

echo
echo "=== ACTIVE placeBrokerOrder REFERENCES ==="
grep -RIn \
  --exclude-dir=node_modules \
  --exclude-dir=.expo \
  --exclude-dir=dist \
  --exclude='*.bak' \
  --exclude='*.map' \
  'placeBrokerOrder' \
  mobile/app mobile/src \
  2>/dev/null | sed -n '1,140p' || true

echo
echo "=== ROUTING CONTRACT SNIPPET ==="
grep -nA145 -B8 'export async function routeExecutionOrderByMode' \
  mobile/src/services/trade/basketExecutionStore.js | sed -n '1,190p'

echo
echo "=== REAL FILL GUARD ==="
grep -nA30 -B4 'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' \
  mobile/src/services/trade/basketExecutionStore.js || true

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
echo "PC-031A4 verification PASSED."
