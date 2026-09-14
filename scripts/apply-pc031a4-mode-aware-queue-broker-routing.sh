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

# ------------------------------------------------------------
# 1. Canonical broker adapter defaults
# ------------------------------------------------------------
path = "mobile/src/services/brokers/brokerAdapters.js"
s = read(path)
s = s.replace('brokerId = "SIM"', 'brokerId = "GATECEP_PRACTICE"')
s = s.replace('order.brokerId || "SIM"', 'order.brokerId || "GATECEP_PRACTICE"')
write(path, s)

# ------------------------------------------------------------
# 2. Shared mode-aware routing service
# ------------------------------------------------------------
path = "mobile/src/services/trade/basketExecutionStore.js"
s = read(path)

imports_marker = 'import { userGetItem, userSetItem } from "../auth/userStorage";\n'
extra_imports = '''import { placeBrokerOrder } from "../brokers/brokerAdapters";
import { loadBrokerAccounts } from "../brokers/brokerAccountStore";
'''
if 'placeBrokerOrder' not in s:
    if imports_marker not in s:
        raise SystemExit(f"{path}: import marker not found")
    s = s.replace(imports_marker, imports_marker + extra_imports, 1)

# Canonicalize old helper fallbacks.
s = s.replace(
    'brokerId: broker.id || broker.brokerId || "SIM",',
    'brokerId: broker.id || broker.brokerId || "GATECEP_PRACTICE",'
)
s = s.replace(
    'brokerName: broker.name || broker.brokerName || "Simulation Broker",',
    'brokerName: broker.name || broker.brokerName || "GateCEP Broker",'
)

# Add mode-aware routing helper before markBrokerReceived.
helper_marker = 'export async function markBrokerReceived(orderId, brokerPayload = {}) {'
helper = r'''function canonicalExecutionMode(value = "PRACTICE") {
  return String(value || "PRACTICE").toUpperCase() === "REAL"
    ? "REAL"
    : "PRACTICE";
}

function isPracticeBrokerIdentity(value = "") {
  const raw = String(value || "").trim().toUpperCase();

  return [
    "GATECEP_PRACTICE",
    "GATECEP PRACTICE",
    "GATECEP BROKER",
    "SIM",
    "SIMULATION BROKER",
    "GATECEP-DEMO",
    "GATECEP DEMO"
  ].includes(raw);
}

function isConnectedRealBrokerAccount(account = {}) {
  const brokerId = String(account?.brokerId || account?.id || "").trim();
  const mode = String(account?.connectionMode || "").toUpperCase();
  const status = String(account?.status || "ACTIVE").toUpperCase();

  return (
    !!brokerId &&
    !isPracticeBrokerIdentity(brokerId) &&
    !/PRACTICE|DEMO|SIMULATION/.test(mode) &&
    status !== "INACTIVE" &&
    status !== "DISCONNECTED" &&
    (account?.connected === true || account?.linked === true)
  );
}

async function resolveRealBrokerAccount(order = {}) {
  const accounts = (await loadBrokerAccounts()).filter(isConnectedRealBrokerAccount);

  const requestedAccountId = String(order?.brokerAccountId || "").trim();
  const requestedBrokerId = String(order?.brokerId || "").trim().toUpperCase();

  if (requestedAccountId) {
    const exactAccount = accounts.find(
      (account) => String(account?.id || "") === requestedAccountId
    );

    if (exactAccount) return exactAccount;
  }

  if (requestedBrokerId && !isPracticeBrokerIdentity(requestedBrokerId)) {
    const exactBroker = accounts.find(
      (account) =>
        String(account?.brokerId || account?.id || "").trim().toUpperCase() ===
        requestedBrokerId
    );

    if (exactBroker) return exactBroker;
  }

  return (
    accounts.find((account) => account?.defaultBroker === true) ||
    accounts[0] ||
    null
  );
}

export async function routeExecutionOrderByMode(orderId) {
  const execution = await loadBasketExecution();

  if (!execution) {
    throw new Error("ACTIVE_EXECUTION_REQUIRED");
  }

  const order = (execution.orders || []).find((item) => item.id === orderId);

  if (!order) {
    throw new Error("EXECUTION_ORDER_NOT_FOUND");
  }

  const executionMode = canonicalExecutionMode(
    order.executionMode || execution.executionMode
  );

  if (executionMode === "PRACTICE") {
    const now = new Date().toISOString();

    await routeExecutionOrder(orderId, {
      id: "GATECEP_PRACTICE",
      name: "GateCEP Broker"
    });

    return await updateExecutionOrder(orderId, {
      executionMode: "PRACTICE",
      brokerId: "GATECEP_PRACTICE",
      brokerName: "GateCEP Broker",
      brokerOrderId: `PRACTICE-${Date.now()}-${order.symbol}`,
      brokerStatus: "PRACTICE_RECEIVED",
      status: ORDER_STATUS.BROKER_RECEIVED,
      message: "GateCEP Broker received the Practice order.",
      submittedAt: now,
      brokerReceivedAt: now,
      adapterResponse: {
        ok: true,
        isPractice: true,
        brokerId: "GATECEP_PRACTICE",
        brokerName: "GateCEP Broker",
        status: "PRACTICE_RECEIVED",
        submittedAt: now,
        receivedAt: now
      },
      isPractice: true,
      updatedAt: now
    });
  }

  const account = await resolveRealBrokerAccount(order);

  if (!account) {
    const error = new Error("CONNECTED_REAL_BROKER_REQUIRED");
    error.code = "CONNECTED_REAL_BROKER_REQUIRED";
    throw error;
  }

  const brokerId = String(account.brokerId || account.id || "").trim();
  const brokerAccountId = account.id || order.brokerAccountId || null;
  const brokerName =
    account.brokerName ||
    account.name ||
    account.broker ||
    brokerId;

  const submittedOrder = {
    ...order,
    executionMode: "REAL",
    brokerId,
    brokerAccountId,
    brokerName
  };

  let brokerResponse;

  try {
    brokerResponse = await placeBrokerOrder(submittedOrder);
  } catch (error) {
    return await updateExecutionOrder(orderId, {
      executionMode: "REAL",
      brokerId,
      brokerAccountId,
      brokerName,
      status: ORDER_STATUS.BROKER_SELECTED,
      brokerStatus: "ADAPTER_ERROR",
      brokerOrderId: null,
      message:
        error?.message ||
        "Broker adapter failed before broker receipt could be confirmed.",
      adapterError: true,
      isPractice: false,
      updatedAt: new Date().toISOString()
    });
  }

  return await updateExecutionOrder(orderId, {
    executionMode: "REAL",
    brokerId: brokerResponse?.brokerId || brokerId,
    brokerAccountId,
    brokerName: brokerResponse?.brokerName || brokerName,
    brokerOrderId: brokerResponse?.brokerOrderId || null,
    brokerStatus:
      brokerResponse?.status ||
      (brokerResponse?.ok ? "SUBMITTED" : "PENDING_API"),
    status: ORDER_STATUS.ROUTED,
    message:
      brokerResponse?.message ||
      "Routed to broker adapter. Awaiting verified broker confirmation.",
    submittedAt: brokerResponse?.submittedAt || new Date().toISOString(),
    brokerReceivedAt: null,
    adapterResponse: brokerResponse || null,
    isPractice: false,
    updatedAt: new Date().toISOString()
  });
}

'''
if 'export async function routeExecutionOrderByMode' not in s:
    if helper_marker not in s:
        raise SystemExit(f"{path}: markBrokerReceived marker not found")
    s = s.replace(helper_marker, helper + helper_marker, 1)

# Enforce service-level REAL manual fill guard.
old_fill = '''export async function markExecutionOrderFilled(orderId, trade = {}) {
  return await updateExecutionOrder(orderId, {
    status: ORDER_STATUS.FILLED,
    message: "Filled by broker/simulation",
    trade,
    filledAt: new Date().toISOString()
  });
}'''
new_fill = '''export async function markExecutionOrderFilled(orderId, trade = {}) {
  const execution = await loadBasketExecution();
  const order = execution?.orders?.find((item) => item.id === orderId);
  const executionMode = canonicalExecutionMode(
    order?.executionMode || execution?.executionMode
  );

  if (executionMode === "REAL") {
    const error = new Error("REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION");
    error.code = "REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION";
    throw error;
  }

  return await updateExecutionOrder(orderId, {
    status: ORDER_STATUS.FILLED,
    message: "Filled by GateCEP Broker in Practice",
    trade: {
      ...trade,
      executionMode: "PRACTICE",
      isPractice: true
    },
    filledAt: new Date().toISOString()
  });
}'''
if old_fill in s:
    s = s.replace(old_fill, new_fill, 1)
elif 'REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION' not in s:
    raise SystemExit(f"{path}: fill helper block not found")

# Normalize legacy orders/executions to explicit mode.
old_order_return = '''  return {
    ...order,
    symbol: String(order.symbol || "").toUpperCase(),'''
new_order_return = '''  const executionMode = canonicalExecutionMode(order.executionMode);

  return {
    ...order,
    executionMode,
    brokerId:
      order.brokerId ||
      (executionMode === "PRACTICE" ? "GATECEP_PRACTICE" : null),
    symbol: String(order.symbol || "").toUpperCase(),'''
if old_order_return in s:
    s = s.replace(old_order_return, new_order_return, 1)
elif 'const executionMode = canonicalExecutionMode(order.executionMode);' not in s:
    raise SystemExit(f"{path}: normalizeOrder return marker not found")

old_exec_return = '''  return {
    ...execution,
    status,
    totalOrders: orders.length,'''
new_exec_return = '''  const executionMode = canonicalExecutionMode(
    execution.executionMode || orders[0]?.executionMode
  );

  return {
    ...execution,
    executionMode,
    brokerId:
      execution.brokerId ||
      (executionMode === "PRACTICE" ? "GATECEP_PRACTICE" : null),
    status,
    totalOrders: orders.length,'''
if old_exec_return in s:
    s = s.replace(old_exec_return, new_exec_return, 1)
elif 'execution.executionMode || orders[0]?.executionMode' not in s:
    raise SystemExit(f"{path}: normalizeExecution return marker not found")

write(path, s)

# ------------------------------------------------------------
# 3. queue-manager.js
# ------------------------------------------------------------
path = "mobile/app/queue-manager.js"
s = read(path)

# Add helper to import list.
s = s.replace(
    'markExecutionOrderFilled,\n  updateExecutionOrder',
    'markExecutionOrderFilled,\n  routeExecutionOrderByMode,\n  updateExecutionOrder'
)

start = s.find('  async function routeQueuedOrders() {')
end = s.find('  async function fillBrokerReceivedOrders() {')
if start == -1 or end == -1 or end <= start:
    raise SystemExit(f"{path}: routing function boundaries not found")

new_route_fn = '''  async function routeQueuedOrders() {
    const queued = orders.filter((order) =>
      [ORDER_STATUS.QUEUED, ORDER_STATUS.BROKER_SELECTED].includes(order.status)
    );

    if (!queued.length) {
      Alert.alert("No Queued Orders", "Queue or select broker orders before routing.");
      return;
    }

    const realCount = queued.filter(
      (order) =>
        String(order.executionMode || execution?.executionMode || "PRACTICE").toUpperCase() ===
        "REAL"
    ).length;
    const practiceCount = queued.length - realCount;

    const routeSummary = [
      practiceCount ? `${practiceCount} Practice order${practiceCount === 1 ? "" : "s"} through GateCEP Broker` : null,
      realCount ? `${realCount} REAL order${realCount === 1 ? "" : "s"} through the selected connected broker adapter` : null
    ]
      .filter(Boolean)
      .join(" and ");

    Alert.alert(
      "Route Orders",
      `${routeSummary}. REAL orders remain pending until genuine broker confirmation is available.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Route",
          onPress: async () => {
            let latest = execution;

            for (const order of queued) {
              try {
                latest = await routeExecutionOrderByMode(order.id);
              } catch (error) {
                const code = error?.code || error?.message;

                Alert.alert(
                  "Order Not Routed",
                  code === "CONNECTED_REAL_BROKER_REQUIRED"
                    ? `${order.symbol}: connect or select a REAL broker account before routing this REAL order.`
                    : `${order.symbol}: ${error?.message || "Broker routing failed."}`
                );
              }
            }

            setExecution(latest);
          }
        }
      ]
    );
  }

'''
s = s[:start] + new_route_fn + s[end:]

# Replace received filter with Practice-only filter.
old_received = '''    const received = orders.filter((order) =>
      [ORDER_STATUS.BROKER_RECEIVED, ORDER_STATUS.PARTIAL_FILL].includes(
        order.status
      )
    );'''
new_received = '''    const received = orders.filter(
      (order) =>
        [ORDER_STATUS.BROKER_RECEIVED, ORDER_STATUS.PARTIAL_FILL].includes(
          order.status
        ) &&
        String(
          order.executionMode || execution?.executionMode || "PRACTICE"
        ).toUpperCase() === "PRACTICE"
    );'''
if old_received in s:
    s = s.replace(old_received, new_received, 1)
elif 'execution?.executionMode || "PRACTICE"' not in s[s.find('fillBrokerReceivedOrders'):]:
    raise SystemExit(f"{path}: received order filter not found")

# Canonical Practice fill source/name.
s = s.replace('source: "PRACTICE_SIMULATION"', 'source: "GATECEP_BROKER_PRACTICE"')

# Guard manual partial.
partial_marker = '''  async function markPartial(order) {
    const filledQty = Math.max(1, Math.floor(Number(order.quantity || 0) / 2));'''
partial_replacement = '''  async function markPartial(order) {
    const executionMode = String(
      order?.executionMode || execution?.executionMode || "PRACTICE"
    ).toUpperCase();

    if (executionMode === "REAL") {
      Alert.alert(
        "Verified Broker Evidence Required",
        "REAL orders cannot be manually marked as partially filled. GateCEP must receive genuine broker execution evidence."
      );
      return;
    }

    const filledQty = Math.max(1, Math.floor(Number(order.quantity || 0) / 2));'''
if partial_marker in s:
    s = s.replace(partial_marker, partial_replacement, 1)
elif 'REAL orders cannot be manually marked as partially filled' not in s:
    raise SystemExit(f"{path}: markPartial marker not found")

# Update obvious Practice title to shared title, preserving mode explanation in body.
s = s.replace('<Text style={styles.title}>Practice Queue Manager</Text>', '<Text style={styles.title}>Order Queue</Text>')
write(path, s)

# ------------------------------------------------------------
# 4. orders.js
# ------------------------------------------------------------
path = "mobile/app/orders.js"
s = read(path)

s = s.replace(
    'markExecutionOrderFilled,\n  routeExecutionOrder,\n  updateExecutionOrder',
    'markExecutionOrderFilled,\n  routeExecutionOrderByMode,\n  updateExecutionOrder'
)

start = s.find('  async function sendToBroker(order) {')
end = s.find('  async function fillOrder(order) {')
if start == -1 or end == -1 or end <= start:
    raise SystemExit(f"{path}: sendToBroker boundaries not found")

new_send = '''  async function sendToBroker(order) {
    try {
      const routed = await routeExecutionOrderByMode(order.id);
      setExecution(routed);
    } catch (error) {
      const code = error?.code || error?.message;

      Alert.alert(
        "Order Not Routed",
        code === "CONNECTED_REAL_BROKER_REQUIRED"
          ? "Connect or select a REAL broker account before routing this REAL order."
          : error?.message || "Broker routing failed."
      );
    }
  }

'''
s = s[:start] + new_send + s[end:]

old_fill_head = '''  async function fillOrder(order) {
    Alert.alert(
      "Simulate Fill",'''
new_fill_head = '''  async function fillOrder(order) {
    const executionMode = String(
      order?.executionMode || execution?.executionMode || "PRACTICE"
    ).toUpperCase();

    if (executionMode === "REAL") {
      Alert.alert(
        "Verified Broker Evidence Required",
        "REAL orders cannot be manually filled. GateCEP must receive genuine broker execution evidence before REAL holdings, cash, P&L or FIFO can change."
      );
      return;
    }

    Alert.alert(
      "Practice Fill",'''
if old_fill_head in s:
    s = s.replace(old_fill_head, new_fill_head, 1)
elif 'REAL orders cannot be manually filled' not in s:
    raise SystemExit(f"{path}: fillOrder marker not found")

s = s.replace(
    '`Simulate filling ${order.side} ${order.symbol} in Practice?`,',
    '`Fill ${order.side} ${order.symbol} through GateCEP Broker in Practice?`,'
)
s = s.replace('{ text: "Simulate Fill",', '{ text: "Practice Fill",')
s = s.replace('source: "PRACTICE_SIMULATION"', 'source: "GATECEP_BROKER_PRACTICE"')

write(path, s)

print()
print("PC-031A4 applied.")
print("PRACTICE routes through GateCEP Broker.")
print("REAL routes through connected broker adapters and remains pending without genuine broker confirmation.")
print("REAL manual partial/fill remains blocked.")
PY

echo
echo "Review with:"
git diff -- \
  mobile/src/services/brokers/brokerAdapters.js \
  mobile/src/services/trade/basketExecutionStore.js \
  mobile/app/queue-manager.js \
  mobile/app/orders.js
