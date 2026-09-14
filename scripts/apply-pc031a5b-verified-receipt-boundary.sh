#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

python - <<'PY'
from pathlib import Path

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing required file: {path}")
    return p.read_text(encoding="utf-8")

def write(path, text):
    Path(path).write_text(text, encoding="utf-8", newline="\n")
    print(f"UPDATED {path}")

# 1) Harden generic broker-received helper.
path = "mobile/src/services/trade/basketExecutionStore.js"
s = read(path)

old = '''export async function markBrokerReceived(orderId, brokerPayload = {}) {
  return await updateExecutionOrder(orderId, {
    brokerOrderId: brokerPayload.brokerOrderId || brokerPayload.id || null,
    brokerStatus: brokerPayload.status || ORDER_STATUS.BROKER_RECEIVED,
    status: ORDER_STATUS.BROKER_RECEIVED,
    message: "Broker received order",
    brokerReceivedAt: new Date().toISOString()
  });
}'''

new = '''export async function markBrokerReceived(orderId, brokerPayload = {}) {
  const execution = await loadBasketExecution();
  const order = execution?.orders?.find((item) => item.id === orderId);
  const executionMode = canonicalExecutionMode(
    order?.executionMode || execution?.executionMode
  );

  if (executionMode === "REAL") {
    const error = new Error(
      "REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION"
    );
    error.code = "REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION";
    throw error;
  }

  return await updateExecutionOrder(orderId, {
    executionMode: "PRACTICE",
    brokerId: order?.brokerId || "GATECEP_PRACTICE",
    brokerName: order?.brokerName || "GateCEP Broker",
    brokerOrderId: brokerPayload.brokerOrderId || brokerPayload.id || null,
    brokerStatus: brokerPayload.status || ORDER_STATUS.BROKER_RECEIVED,
    status: ORDER_STATUS.BROKER_RECEIVED,
    message: brokerPayload.message || "GateCEP Broker received Practice order",
    brokerReceivedAt: brokerPayload.receivedAt || new Date().toISOString(),
    isPractice: true
  });
}'''

if old in s:
    s = s.replace(old, new, 1)
elif 'REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION' not in s:
    raise SystemExit(f"{path}: markBrokerReceived block not found")

write(path, s)

# 2) Remove now-unused import from Orders screen.
path = "mobile/app/orders.js"
s = read(path)
s = s.replace('  markBrokerReceived,\n', '')
write(path, s)

# 3) Make Orders Review mode-aware without changing queue behavior.
path = "mobile/app/orders-review.js"
s = read(path)

marker = '  const orders = execution?.orders || [];\n'
insert = '''  const orders = execution?.orders || [];
  const executionMode = String(
    execution?.executionMode || orders[0]?.executionMode || "PRACTICE"
  ).toUpperCase();
  const isRealExecution = executionMode === "REAL";
'''
if marker in s:
    s = s.replace(marker, insert, 1)
elif 'const isRealExecution = executionMode === "REAL";' not in s:
    raise SystemExit(f"{path}: orders marker not found")

s = s.replace(
'''      `${reviewOrders.length} orders will be prepared for Practice simulation only.`,''',
'''      isRealExecution
        ? `${reviewOrders.length} REAL order${reviewOrders.length === 1 ? "" : "s"} will be queued for broker routing. Queueing does not mean the broker has received or executed the order.`
        : `${reviewOrders.length} Practice order${reviewOrders.length === 1 ? "" : "s"} will be queued for GateCEP Broker.`,'''
)

s = s.replace(
    '<Text style={styles.title}>Practice Orders Review</Text>',
    '<Text style={styles.title}>{isRealExecution ? "REAL Orders Review" : "Practice Orders Review"}</Text>'
)

s = s.replace(
'''      <Text style={styles.subtitle}>
        Review simulated basket orders. Nothing here is sent to a REAL broker.
      </Text>''',
'''      <Text style={styles.subtitle}>
        {isRealExecution
          ? "Review REAL orders before queueing them for broker routing. Queueing does not create broker receipt or execution evidence."
          : "Review Practice orders before sending them through GateCEP Broker."}
      </Text>'''
)

write(path, s)

print()
print("PC-031A5B applied.")
print("REAL broker receipt remains blocked outside verified evidence ingestion.")
PY

echo
echo "Review with:"
git diff -- \
  mobile/src/services/trade/basketExecutionStore.js \
  mobile/app/orders.js \
  mobile/app/orders-review.js
