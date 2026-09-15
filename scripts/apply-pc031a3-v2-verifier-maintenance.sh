#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

python - <<'PY'
from pathlib import Path

path = Path("scripts/verify-pc031a3-shared-basket-execution-mode.sh")
s = path.read_text(encoding="utf-8")

old = '''if grep -n 'placeBrokerOrder' \
    mobile/app/coach-insights.js \
    mobile/app/trade-basket.js \
    mobile/src/services/trade/tradeBasketStore.js \
    mobile/src/services/trade/basketExecutionStore.js \
    >/dev/null 2>&1; then
  fail "PC-031A3 unexpectedly introduced placeBrokerOrder"
else
  pass "PC-031A3 does not submit broker orders"
fi'''

new = '''if grep -n 'placeBrokerOrder' \
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
PY2'''

if old in s:
    s = s.replace(old, new, 1)
    path.write_text(s, encoding="utf-8", newline="\n")
    print("UPDATED scripts/verify-pc031a3-shared-basket-execution-mode.sh")
elif "A4 broker submission is centralized behind mode-aware routing" in s:
    print("Verifier already updated; no change needed.")
else:
    raise SystemExit("Expected stale A3 placeBrokerOrder block not found")

print("PC-031A3-V2 verifier maintenance applied.")
PY

echo
echo "Review with:"
git diff -- scripts/verify-pc031a3-shared-basket-execution-mode.sh
