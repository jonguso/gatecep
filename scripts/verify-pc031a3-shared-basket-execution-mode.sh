#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "=== PC-031A3 VERIFY — SHARED BASKET EXECUTION MODE CONTRACT ==="

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

grep -q 'PRACTICE: "PRACTICE"' mobile/src/services/trade/tradeBasketStore.js \
  && grep -q 'REAL: "REAL"' mobile/src/services/trade/tradeBasketStore.js \
  && pass "trade basket defines PRACTICE and REAL execution modes" \
  || fail "execution mode constants missing"

grep -q 'executionMode: normalizedExecutionMode' mobile/src/services/trade/tradeBasketStore.js \
  && pass "trade basket persists executionMode" \
  || fail "trade basket executionMode persistence missing"

grep -q 'GATECEP_PRACTICE' mobile/src/services/trade/tradeBasketStore.js \
  && pass "Practice basket defaults to GateCEP Broker" \
  || fail "GateCEP Practice broker default missing"

count="$(grep -c 'executionMode: basket.executionMode || "PRACTICE"' mobile/src/services/trade/basketExecutionStore.js || true)"
[ "$count" -ge 2 ] \
  && pass "generated orders and execution both carry executionMode" \
  || fail "executionMode not present on both generated orders and execution"

grep -q 'brokerId: "GATECEP_PRACTICE"' mobile/app/coach-insights.js \
  && grep -q 'executionMode: "PRACTICE"' mobile/app/coach-insights.js \
  && pass "Coach Insights creates explicit GateCEP Broker Practice baskets" \
  || fail "Coach Insights Practice basket contract missing"

grep -q 'basket?.executionMode || "PRACTICE"' mobile/app/trade-basket.js \
  && grep -q 'brokerAccountId: basket?.brokerAccountId || null' mobile/app/trade-basket.js \
  && pass "trade basket re-save preserves execution metadata" \
  || fail "trade basket re-save does not preserve execution metadata"

if grep -n 'placeBrokerOrder' \
    mobile/app/coach-insights.js \
    mobile/app/trade-basket.js \
    mobile/src/services/trade/tradeBasketStore.js \
    >/dev/null 2>&1; then
  fail "A3 entry screens/stores must not submit broker orders directly"
else
  pass "A3 entry screens/stores do not submit broker orders directly"
fi

grep -q 'export async function routeExecutionOrderByMode' \
  mobile/src/services/trade/basketExecutionStore.js \
  && grep -q 'brokerResponse = await placeBrokerOrder(submittedOrder)' \
  mobile/src/services/trade/basketExecutionStore.js \
  && pass "A4 broker submission is centralized behind mode-aware routing" \
  || fail "mode-aware broker routing boundary missing"

python - <<'PY2'
from pathlib import Path
text = Path("mobile/src/services/trade/basketExecutionStore.js").read_text(encoding="utf-8")
start = text.find("export async function routeExecutionOrderByMode")
if start < 0:
    raise SystemExit("FAIL: routeExecutionOrderByMode missing")
end = text.find("export async function markBrokerReceived", start)
if end < 0:
    end = len(text)
body = text[start:end]
practice_if = body.find('if (executionMode === "PRACTICE")')
real_marker = body.find("const account = await resolveRealBrokerAccount(order)")
adapter_call = body.find("placeBrokerOrder(submittedOrder)")
if min(practice_if, real_marker, adapter_call) < 0:
    raise SystemExit("FAIL: routing structure markers missing")
if not (practice_if < real_marker < adapter_call):
    raise SystemExit("FAIL: Practice/REAL routing order is unsafe")
practice_block = body[practice_if:real_marker]
if "return await updateExecutionOrder" not in practice_block:
    raise SystemExit("FAIL: Practice branch does not return before REAL adapter routing")
real_tail = body[adapter_call:]
if "status: ORDER_STATUS.BROKER_RECEIVED" in real_tail:
    raise SystemExit("FAIL: REAL adapter path fabricates BROKER_RECEIVED")
print("PASS: Practice returns before REAL adapter submission")
print("PASS: REAL adapter path does not fabricate BROKER_RECEIVED")
PY2

grep -q 'id: "GATECEP_PRACTICE"' mobile/src/services/brokers/brokerRegistry.js \
  && grep -q 'name: "GateCEP Broker"' mobile/src/services/brokers/brokerRegistry.js \
  && pass "PC-031A2C GateCEP Broker identity remains intact" \
  || fail "GateCEP Broker canonical identity regressed"

grep -q 'GATECEP_PRACTICE' mobile/src/features/broker-sync/brokerCashEvidencePolicy.js \
  && pass "REAL cash evidence still excludes GateCEP Practice" \
  || fail "REAL cash evidence exclusion regressed"

echo
echo "=== CONTRACT SNIPPETS ==="
grep -nA14 -B2 'export const EXECUTION_MODE' mobile/src/services/trade/tradeBasketStore.js || true
grep -nA16 -B4 'executionMode: basket.executionMode' mobile/src/services/trade/basketExecutionStore.js || true
grep -nA12 -B4 'COACH_G_SIMULATION' mobile/app/coach-insights.js || true

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
echo "PC-031A3 verification PASSED."
