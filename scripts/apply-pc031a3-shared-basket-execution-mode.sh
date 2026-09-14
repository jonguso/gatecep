#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

python - <<'PY'
from pathlib import Path
import re

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing required file: {path}")
    return p.read_text(encoding="utf-8")

def write(path, text):
    Path(path).write_text(text, encoding="utf-8", newline="\n")
    print(f"UPDATED {path}")

# 1) tradeBasketStore.js
path = "mobile/src/services/trade/tradeBasketStore.js"
s = read(path)

if 'export const EXECUTION_MODE = {' not in s:
    marker = 'import { userGetItem, userSetItem } from "../auth/userStorage";\n'
    if marker not in s:
        raise SystemExit(f"{path}: import marker not found")
    s = s.replace(
        marker,
        marker + '\nexport const EXECUTION_MODE = Object.freeze({\n  PRACTICE: "PRACTICE",\n  REAL: "REAL"\n});\n',
        1,
    )

old_sig = 'export async function saveTradeBasket(items = [], source = "COACH_G") {'
new_sig = '''export async function saveTradeBasket(
  items = [],
  source = "COACH_G",
  {
    executionMode = EXECUTION_MODE.PRACTICE,
    brokerId = null,
    brokerAccountId = null
  } = {}
) {'''
if old_sig in s:
    s = s.replace(old_sig, new_sig, 1)
elif new_sig not in s:
    raise SystemExit(f"{path}: saveTradeBasket signature not found")

old_basket = '''  const basket = {
    id: `BASKET-${Date.now()}`,
    source,
    status: "DRAFT",'''
new_basket = '''  const normalizedExecutionMode =
    String(executionMode || EXECUTION_MODE.PRACTICE).toUpperCase() === EXECUTION_MODE.REAL
      ? EXECUTION_MODE.REAL
      : EXECUTION_MODE.PRACTICE;

  const basket = {
    id: `BASKET-${Date.now()}`,
    source,
    executionMode: normalizedExecutionMode,
    brokerId:
      brokerId ||
      (normalizedExecutionMode === EXECUTION_MODE.PRACTICE
        ? "GATECEP_PRACTICE"
        : null),
    brokerAccountId: brokerAccountId || null,
    status: "DRAFT",'''
if old_basket in s:
    s = s.replace(old_basket, new_basket, 1)
elif 'executionMode: normalizedExecutionMode' not in s:
    raise SystemExit(f"{path}: basket creation block not found")

write(path, s)

# 2) basketExecutionStore.js
path = "mobile/src/services/trade/basketExecutionStore.js"
s = read(path)

old_order = '''      reason: item.reason || "Coach G recommendation",
      status: ORDER_STATUS.REVIEW,'''
new_order = '''      reason: item.reason || "Coach G recommendation",
      executionMode: basket.executionMode || "PRACTICE",
      brokerId:
        item.brokerId ||
        basket.brokerId ||
        ((basket.executionMode || "PRACTICE") === "PRACTICE"
          ? "GATECEP_PRACTICE"
          : null),
      brokerAccountId: item.brokerAccountId || basket.brokerAccountId || null,
      status: ORDER_STATUS.REVIEW,'''
if old_order in s:
    s = s.replace(old_order, new_order, 1)
elif 'item.brokerAccountId || basket.brokerAccountId || null' not in s:
    raise SystemExit(f"{path}: order creation block not found")

old_exec = '''    basketId: basket.id,
    source: basket.source || "COACH_G",
    status: ORDER_STATUS.REVIEW,'''
new_exec = '''    basketId: basket.id,
    source: basket.source || "COACH_G",
    executionMode: basket.executionMode || "PRACTICE",
    brokerId:
      basket.brokerId ||
      ((basket.executionMode || "PRACTICE") === "PRACTICE"
        ? "GATECEP_PRACTICE"
        : null),
    brokerAccountId: basket.brokerAccountId || null,
    status: ORDER_STATUS.REVIEW,'''
if old_exec in s:
    s = s.replace(old_exec, new_exec, 1)
elif 'brokerAccountId: basket.brokerAccountId || null' not in s:
    raise SystemExit(f"{path}: execution creation block not found")

write(path, s)

# 3) coach-insights.js
path = "mobile/app/coach-insights.js"
s = read(path)

old_call = '''    await saveTradeBasket(
  basketItems,
  "COACH_G_SIMULATION"
);'''
new_call = '''    await saveTradeBasket(
      basketItems,
      "COACH_G_SIMULATION",
      {
        executionMode: "PRACTICE",
        brokerId: "GATECEP_PRACTICE",
        brokerAccountId: null
      }
    );'''
if old_call in s:
    s = s.replace(old_call, new_call, 1)
elif 'brokerId: "GATECEP_PRACTICE"' not in s:
    pat = re.compile(r'await saveTradeBasket\(\s*basketItems,\s*"COACH_G_SIMULATION"\s*\);', re.S)
    s2, n = pat.subn(new_call.strip(), s, count=1)
    if n != 1:
        raise SystemExit(f"{path}: Practice basket creation call not found")
    s = s2

write(path, s)

# 4) trade-basket.js
path = "mobile/app/trade-basket.js"
s = read(path)

old_save = '    await saveTradeBasket(nextItems, basket?.source || "COACH_G");'
new_save = '''    await saveTradeBasket(
      nextItems,
      basket?.source || "COACH_G",
      {
        executionMode: basket?.executionMode || "PRACTICE",
        brokerId:
          basket?.brokerId ||
          ((basket?.executionMode || "PRACTICE") === "PRACTICE"
            ? "GATECEP_PRACTICE"
            : null),
        brokerAccountId: basket?.brokerAccountId || null
      }
    );'''
if old_save in s:
    s = s.replace(old_save, new_save, 1)
elif 'brokerAccountId: basket?.brokerAccountId || null' not in s:
    raise SystemExit(f"{path}: basket re-save call not found")

write(path, s)

print()
print("PC-031A3 applied.")
print("No broker routing or REAL execution behavior was enabled.")
PY

echo
echo "Review with:"
git diff -- \
  mobile/src/services/trade/tradeBasketStore.js \
  mobile/src/services/trade/basketExecutionStore.js \
  mobile/app/coach-insights.js \
  mobile/app/trade-basket.js
