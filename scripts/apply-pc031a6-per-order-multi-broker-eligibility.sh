#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== PC-031A6 APPLY — PER-ORDER MULTI-BROKER EXECUTION ELIGIBILITY ==="

python - <<'PY'
from pathlib import Path
import re, shutil

root = Path.cwd()
orders = root / "mobile/app/orders-review.js"
store = root / "mobile/src/services/trade/basketExecutionStore.js"
basket = root / "mobile/app/trade-basket.js"
service_src = root / "brokerExecutionEligibilityService.js"
service_dst = root / "mobile/src/services/trade/brokerExecutionEligibilityService.js"

for p in (orders, store, basket, service_src):
    if not p.exists():
        raise SystemExit(f"Required file missing: {p}")

def backup(path):
    bak = Path(str(path) + ".pc031a6.bak")
    if not bak.exists():
        shutil.copy2(path, bak)

def must(text, needle, label):
    if needle not in text:
        raise SystemExit(f"Expected marker not found ({label}): {needle}")

# Install eligibility service.
if service_dst.exists():
    backup(service_dst)
shutil.copy2(service_src, service_dst)

# Orders Review
text = orders.read_text(encoding="utf-8")
backup(orders)

must(text, 'import { ORDER_STATUS } from "../src/trade/orderLifecycle";', "orders lifecycle import")
must(text, 'const [query, setQuery] = useState("");', "orders state")
must(text, 'async function updateOrder(order, patch) {', "updateOrder")
must(text, 'async function queueOrder(order) {', "queueOrder")
must(text, 'async function prepareHandoff() {', "prepareHandoff")
must(text, 'function ReviewOrderCard({ order, onChange, onDelete, onQueue }) {', "ReviewOrderCard")

if 'brokerExecutionEligibilityService' not in text:
    text = text.replace(
        'import { ORDER_STATUS } from "../src/trade/orderLifecycle";',
        'import { ORDER_STATUS } from "../src/trade/orderLifecycle";\n'
        'import { buildRealOrderBrokerEligibility } '
        'from "../src/services/trade/brokerExecutionEligibilityService";'
    )

if 'const [brokerEligibility, setBrokerEligibility]' not in text:
    text = text.replace(
        'const [query, setQuery] = useState("");',
        'const [query, setQuery] = useState("");\n'
        '  const [brokerEligibility, setBrokerEligibility] = useState({});\n'
        '  const [brokerEligibilityLoading, setBrokerEligibilityLoading] = useState(false);'
    )

if 'async function refreshBrokerEligibility' not in text:
    marker = '  const totalAmount = reviewOrders.reduce('
    idx = text.find(marker)
    if idx < 0:
        raise SystemExit("Unable to find totalAmount marker")
    block = '''  async function refreshBrokerEligibility(nextExecution = execution) {
    const nextOrders = nextExecution?.orders || [];
    const nextMode = String(
      nextExecution?.executionMode || nextOrders[0]?.executionMode || "PRACTICE"
    ).toUpperCase();

    if (nextMode !== "REAL") {
      setBrokerEligibility({});
      return;
    }

    setBrokerEligibilityLoading(true);

    try {
      const entries = await Promise.all(
        nextOrders
          .filter((order) =>
            [ORDER_STATUS.DRAFT, ORDER_STATUS.REVIEW, ORDER_STATUS.PENDING].includes(
              order.status
            )
          )
          .map(async (order) => [
            order.id,
            await buildRealOrderBrokerEligibility({
              order,
              executionOrders: nextOrders
            })
          ])
      );

      setBrokerEligibility(Object.fromEntries(entries));
    } finally {
      setBrokerEligibilityLoading(false);
    }
  }

'''
    text = text[:idx] + block + text[idx:]

old = '    setExecution(saved);\n  }'
new = '    setExecution(saved);\n    await refreshBrokerEligibility(saved);\n  }'
if old in text and 'await refreshBrokerEligibility(saved);' not in text:
    text = text.replace(old, new, 1)

old = '''  async function updateOrder(order, patch) {
    const updated = await updateExecutionOrder(order.id, patch);
    setExecution(updated);
  }'''
new = '''  async function updateOrder(order, patch) {
    const updated = await updateExecutionOrder(order.id, patch);
    setExecution(updated);
    await refreshBrokerEligibility(updated);
  }'''
must(text, old, "updateOrder exact block")
text = text.replace(old, new, 1)

old = '''  async function queueOrder(order) {
    const updated = await queueSingleOrder(order.id);
    setExecution(updated);
  }'''
new = '''  async function queueOrder(order) {
    if (isRealExecution) {
      const result = brokerEligibility[order.id];
      const selected = (result?.candidates || []).find(
        (candidate) => candidate.brokerAccountId === order.brokerAccountId
      );

      if (!order.brokerAccountId || !selected || !selected.eligible) {
        Alert.alert(
          "Eligible Broker Required",
          !order.brokerAccountId
            ? "Choose an eligible connected broker for this REAL order before preparing it."
            : "The selected broker no longer has enough broker-specific trading space or holdings for this order."
        );
        return;
      }
    }

    const updated = await queueSingleOrder(order.id);
    setExecution(updated);
    await refreshBrokerEligibility(updated);
  }'''
must(text, old, "queueOrder exact block")
text = text.replace(old, new, 1)

needle = '''    Alert.alert(
      "Prepare Order Handoff",'''
if 'const invalidRealOrders = reviewOrders.filter' not in text:
    insert = '''    if (isRealExecution) {
      const invalidRealOrders = reviewOrders.filter((order) => {
        const result = brokerEligibility[order.id];
        const selected = (result?.candidates || []).find(
          (candidate) => candidate.brokerAccountId === order.brokerAccountId
        );

        return !order.brokerAccountId || !selected || !selected.eligible;
      });

      if (invalidRealOrders.length) {
        Alert.alert(
          "Broker Assignment Required",
          `${invalidRealOrders.length} REAL order${invalidRealOrders.length === 1 ? "" : "s"} still need an eligible broker assignment. Review broker cash/trading space or broker-specific holdings before queueing.`
        );
        return;
      }
    }

'''
    must(text, needle, "prepare alert")
    text = text.replace(needle, insert + needle, 1)

old = '''            order={order}
            onChange={(patch) => updateOrder(order, patch)}
            onDelete={() => deleteOrder(order)}
            onQueue={() => queueOrder(order)}'''
new = '''            order={order}
            executionMode={executionMode}
            brokerEligibility={brokerEligibility[order.id]}
            brokerEligibilityLoading={brokerEligibilityLoading}
            onChange={(patch) => updateOrder(order, patch)}
            onDelete={() => deleteOrder(order)}
            onQueue={() => queueOrder(order)}'''
must(text, old, "ReviewOrderCard props")
text = text.replace(old, new, 1)

text = text.replace(
    'function ReviewOrderCard({ order, onChange, onDelete, onQueue }) {',
    '''function ReviewOrderCard({
  order,
  executionMode,
  brokerEligibility,
  brokerEligibilityLoading,
  onChange,
  onDelete,
  onQueue
}) {''',
    1
)

old = '''  const amount = Number(order.quantity || 0) * Number(order.price || 0);

  return ('''
new = '''  const amount = Number(order.quantity || 0) * Number(order.price || 0);
  const isRealOrder = String(
    order?.executionMode || executionMode || "PRACTICE"
  ).toUpperCase() === "REAL";
  const candidates = brokerEligibility?.candidates || [];
  const selectedCandidate = candidates.find(
    (candidate) => candidate.brokerAccountId === order.brokerAccountId
  );

  return ('''
must(text, old, "ReviewOrderCard amount block")
text = text.replace(old, new, 1)

needle = '      <View style={styles.buttonRow}>'
if 'Broker Route' not in text:
    block = '''      {isRealOrder ? (
        <View style={styles.brokerBox}>
          <Text style={styles.inputLabel}>Broker Route</Text>
          <Text style={styles.brokerHelp}>
            Choose one connected REAL broker for this order. GateCEP checks that broker's own cash/trading space for BUY orders and that broker's own holding quantity for SELL orders.
          </Text>

          {brokerEligibilityLoading && !candidates.length ? (
            <Text style={styles.brokerHelp}>Checking broker eligibility…</Text>
          ) : null}

          {!brokerEligibilityLoading && !candidates.length ? (
            <Text style={styles.brokerBlocked}>
              No connected REAL broker is currently eligible for review.
            </Text>
          ) : null}

          {candidates.map((candidate) => {
            const selected =
              candidate.brokerAccountId === order.brokerAccountId;
            const cashMode = String(order.side || "BUY").toUpperCase() === "BUY";

            return (
              <Pressable
                key={candidate.brokerAccountId}
                disabled={!candidate.eligible}
                style={[
                  styles.brokerOption,
                  selected && styles.brokerOptionSelected,
                  !candidate.eligible && styles.brokerOptionDisabled
                ]}
                onPress={() =>
                  onChange({
                    brokerAccountId: candidate.brokerAccountId,
                    brokerId: candidate.brokerId,
                    brokerName: candidate.brokerName,
                    estimatedCharges: candidate.estimatedCharges,
                    estimatedTotalCost: cashMode
                      ? candidate.requiredCash
                      : candidate.gross,
                    executionEligibility: {
                      checked: true,
                      side: candidate.side,
                      reason: candidate.reason,
                      requiredCash: cashMode ? candidate.requiredCash : null,
                      availableCash: cashMode ? candidate.availableCash : null,
                      reservedCash: cashMode ? candidate.reservedCash : null,
                      projectedAvailableCash: cashMode
                        ? candidate.projectedAvailableCash
                        : null,
                      requiredQuantity: cashMode
                        ? null
                        : candidate.requiredQuantity,
                      heldQuantity: cashMode ? null : candidate.heldQuantity,
                      reservedQuantity: cashMode
                        ? null
                        : candidate.reservedQuantity,
                      projectedAvailableQuantity: cashMode
                        ? null
                        : candidate.projectedAvailableQuantity,
                      feeEvidenceAvailable:
                        candidate.feeEvidenceAvailable === true,
                      feeEvidenceSource: candidate.feeEvidenceSource || null,
                      feeVerifiedAt: candidate.feeVerifiedAt || null
                    }
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.brokerName}>
                    {candidate.brokerName}
                    {candidate.defaultBroker ? " • Default" : ""}
                  </Text>

                  {cashMode ? (
                    <Text style={styles.brokerMeta}>
                      Cash KES {money(candidate.availableCash)} • Reserved KES {money(candidate.reservedCash)} • Available KES {money(candidate.projectedAvailableCash)}
                    </Text>
                  ) : (
                    <Text style={styles.brokerMeta}>
                      Holding {candidate.heldQuantity} • Reserved {candidate.reservedQuantity} • Available {candidate.projectedAvailableQuantity}
                    </Text>
                  )}

                  <Text style={styles.brokerMeta}>
                    {candidate.estimatedCharges == null
                      ? "Verified broker charges unavailable"
                      : `Verified est. charges KES ${money(candidate.estimatedCharges)}`}
                  </Text>
                </View>

                <Text
                  style={
                    candidate.eligible
                      ? styles.brokerEligible
                      : styles.brokerBlocked
                  }
                >
                  {candidate.eligible
                    ? selected
                      ? "SELECTED"
                      : "ELIGIBLE"
                    : candidate.reason === "INSUFFICIENT_TRADING_SPACE"
                    ? "INSUFFICIENT CASH"
                    : "INSUFFICIENT HOLDING"}
                </Text>
              </Pressable>
            );
          })}

          {selectedCandidate ? (
            <Text
              style={
                selectedCandidate.eligible
                  ? styles.brokerEligibleSummary
                  : styles.brokerBlocked
              }
            >
              {selectedCandidate.eligible
                ? `Route selected: ${selectedCandidate.brokerName}`
                : "Selected broker is no longer eligible. Choose another broker."}
            </Text>
          ) : (
            <Text style={styles.brokerBlocked}>
              Select an eligible broker before preparing this REAL order.
            </Text>
          )}
        </View>
      ) : null}

'''
    must(text, needle, "buttonRow insertion")
    text = text.replace(needle, block + needle, 1)

if 'brokerBox:' not in text:
    marker = '  buttonRow:'
    idx = text.find(marker)
    style_block = '''  brokerBox: {
    marginTop: 14,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12
  },
  brokerHelp: { color: "#94a3b8", marginTop: 6, lineHeight: 18, fontSize: 12 },
  brokerOption: {
    marginTop: 10,
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  brokerOptionSelected: {
    borderColor: "#67e8f9",
    backgroundColor: "rgba(103,232,249,.08)"
  },
  brokerOptionDisabled: { opacity: 0.48 },
  brokerName: { color: "white", fontWeight: "900" },
  brokerMeta: { color: "#94a3b8", marginTop: 4, fontSize: 11, lineHeight: 16 },
  brokerEligible: { color: "#86efac", fontWeight: "900", fontSize: 10 },
  brokerEligibleSummary: { color: "#86efac", fontWeight: "900", marginTop: 10 },
  brokerBlocked: { color: "#fbbf24", fontWeight: "800", marginTop: 8, fontSize: 11 },

'''
    if idx < 0:
        idx = text.rfind('});')
        if idx < 0:
            raise SystemExit("Unable to place broker styles")
    text = text[:idx] + style_block + text[idx:]

orders.write_text(text, encoding="utf-8")

# basketExecutionStore guards
text = store.read_text(encoding="utf-8")
backup(store)
must(text, 'export async function queueExecutionOrders() {', "queueExecutionOrders")

if 'REAL_ORDER_BROKER_ASSIGNMENT_REQUIRED' not in text:
    marker = 'export async function queueExecutionOrders() {'
    helper = '''function assertRealOrderBrokerAssignment(order = {}, execution = {}) {
  const mode = String(
    order?.executionMode || execution?.executionMode || "PRACTICE"
  ).toUpperCase();

  if (mode !== "REAL") return;

  if (!String(order?.brokerAccountId || "").trim()) {
    const error = new Error("REAL_ORDER_BROKER_ASSIGNMENT_REQUIRED");
    error.code = "REAL_ORDER_BROKER_ASSIGNMENT_REQUIRED";
    throw error;
  }

  if (order?.executionEligibility?.checked !== true) {
    const error = new Error("REAL_ORDER_BROKER_ELIGIBILITY_REQUIRED");
    error.code = "REAL_ORDER_BROKER_ELIGIBILITY_REQUIRED";
    throw error;
  }

  if (
    order?.executionEligibility?.reason &&
    order.executionEligibility.reason !== "ELIGIBLE"
  ) {
    const error = new Error("REAL_ORDER_BROKER_NOT_ELIGIBLE");
    error.code = "REAL_ORDER_BROKER_NOT_ELIGIBLE";
    throw error;
  }
}

'''
    text = text.replace(marker, helper + marker, 1)

old = '''  if (!execution) return null;

  const orders = execution.orders.map((order) => {'''
new = '''  if (!execution) return null;

  for (const order of execution.orders || []) {
    if (isActiveOrder(order.status)) {
      assertRealOrderBrokerAssignment(order, execution);
    }
  }

  const orders = execution.orders.map((order) => {'''
must(text, old, "queueExecutionOrders mapping")
text = text.replace(old, new, 1)

m = re.search(r'export async function queueSingleOrder\(orderId\) \{(?P<body>.*?)\n\}', text, re.S)
if not m:
    raise SystemExit("queueSingleOrder function not found")
body = m.group('body')
if 'assertRealOrderBrokerAssignment' not in body:
    mm = re.search(r'(\n\s*const order = .*?;\n)', body, re.S)
    if mm:
        body = body[:mm.end()] + '\n  assertRealOrderBrokerAssignment(order, execution);\n' + body[mm.end():]
    else:
        anchor = 'if (!execution) return null;'
        if anchor not in body:
            raise SystemExit("queueSingleOrder execution guard not found")
        body = body.replace(
            anchor,
            anchor + '\n\n  const order = (execution.orders || []).find((item) => item.id === orderId);\n  if (!order) return execution;\n  assertRealOrderBrokerAssignment(order, execution);',
            1
        )
    text = text[:m.start('body')] + body + text[m.end('body'):]

store.write_text(text, encoding="utf-8")

# Trade Basket mode-aware copy only
text = basket.read_text(encoding="utf-8")
backup(basket)

if '<Text style={styles.title}>Practice Trade Basket</Text>' in text:
    text = text.replace(
        '<Text style={styles.title}>Practice Trade Basket</Text>',
        '''<Text style={styles.title}>
          {String(basket?.executionMode || "PRACTICE").toUpperCase() === "REAL"
            ? "REAL Trade Basket"
            : "Practice Trade Basket"}
        </Text>''',
        1
    )

if 'Review Coach G recommendations before sending them to the trade screen.' in text:
    text = text.replace(
        'Review Coach G recommendations before sending them to the trade screen.',
        '''{String(basket?.executionMode || "PRACTICE").toUpperCase() === "REAL"
          ? "Review the intended REAL trades before assigning a broker to each order in Orders Review."
          : "Review Coach G Practice recommendations before Orders Review and GateCEP Broker."}''',
        1
    )

basket.write_text(text, encoding="utf-8")

print("PC-031A6 apply completed.")
PY

rm -f brokerExecutionEligibilityService.js

echo
echo "Changed files:"
git status --short -- \
  mobile/app/orders-review.js \
  mobile/app/trade-basket.js \
  mobile/src/services/trade/basketExecutionStore.js \
  mobile/src/services/trade/brokerExecutionEligibilityService.js

echo
echo "No git staging, commit, push, clean, reset, or production action was performed."
