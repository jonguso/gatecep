import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import { ContainedPanel } from "../src/components/mobile/MobileUI";
import {
  cancelExecutionOrder,
  createBasketExecution,
  loadBasketExecution,
  markBrokerReceived,
  markExecutionOrderFilled,
  routeExecutionOrder,
  updateExecutionOrder
} from "../src/trade/basketExecutionStore";
import { ORDER_STATUS, isClosedOrder } from "../src/trade/orderLifecycle";

const TABS = ["Review", "Queued", "Routed", "Closed"];

export default function Orders() {
  const [execution, setExecution] = useState(null);
  const [tab, setTab] = useState("Queued");
  const [query, setQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    let saved = await loadBasketExecution();

    if (!saved) {
      saved = await createBasketExecution();
    }

    setExecution(saved);
  }

  const orders = execution?.orders || [];

  const visibleOrders = useMemo(() => {
    const search = query.trim().toLowerCase();

    return orders
      .filter((order) => {
        const status = String(order.status || "").toUpperCase();

        if (tab === "Review") {
          return [ORDER_STATUS.DRAFT, ORDER_STATUS.REVIEW, ORDER_STATUS.PENDING].includes(status);
        }

        if (tab === "Queued") {
          return status === ORDER_STATUS.QUEUED;
        }

        if (tab === "Routed") {
          return [
            ORDER_STATUS.ROUTED,
            ORDER_STATUS.BROKER_RECEIVED,
            ORDER_STATUS.PARTIAL_FILL
          ].includes(status);
        }

        if (tab === "Closed") {
          return isClosedOrder(status);
        }

        return true;
      })
      .filter((order) => {
        if (!search) return true;

        return (
          String(order.symbol || "").toLowerCase().includes(search) ||
          String(order.name || "").toLowerCase().includes(search) ||
          String(order.brokerName || "").toLowerCase().includes(search)
        );
      });
  }, [orders, tab, query]);

  const counts = {
    review: orders.filter((o) =>
      [ORDER_STATUS.DRAFT, ORDER_STATUS.REVIEW, ORDER_STATUS.PENDING].includes(o.status)
    ).length,
    queued: orders.filter((o) => o.status === ORDER_STATUS.QUEUED).length,
    routed: orders.filter((o) =>
      [ORDER_STATUS.ROUTED, ORDER_STATUS.BROKER_RECEIVED, ORDER_STATUS.PARTIAL_FILL].includes(o.status)
    ).length,
    closed: orders.filter((o) => isClosedOrder(o.status)).length
  };

  async function sendToBroker(order) {
    const routed = await routeExecutionOrder(order.id, {
      id: "GATECEP_PRACTICE",
      name: "Practice Simulator"
    });

    setExecution(routed);

    setTimeout(async () => {
      const received = await markBrokerReceived(order.id, {
        brokerOrderId: `PRACTICE-${Date.now()}-${order.symbol}`,
        status: "BROKER_RECEIVED"
      });

      setExecution(received);
    }, 400);
  }

  async function fillOrder(order) {
    Alert.alert(
      "Simulate Fill",
      `Simulate filling ${order.side} ${order.symbol} in Practice?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Simulate Fill",
          onPress: async () => {
            const updated = await markExecutionOrderFilled(order.id, {
              symbol: order.symbol,
              side: order.side,
              quantity: order.quantity,
              price: order.price,
              filledAt: new Date().toISOString(),
              source: "PRACTICE_SIMULATION"
            });

            setExecution(updated);
          }
        }
      ]
    );
  }

  async function cancelOrder(order) {
    const updated = await cancelExecutionOrder(order.id);
    setExecution(updated);
  }

  async function updateOrder(order, patch) {
    const updated = await updateExecutionOrder(order.id, patch);
    setExecution(updated);
  }

  if (!execution || !orders.length) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Practice Orders</Text>
        <Text style={styles.subtitle}>No active orders found.</Text>

        <Pressable style={styles.primary} onPress={() => router.push("/trade-basket")}>
          <Text style={styles.primaryText}>Open Trade Basket</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Practice Orders</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Practice-only order simulation. REAL executions are imported from broker evidence and cannot be created here.
      </Text>

      <ActiveUserBanner />

      <View style={styles.summaryCard}>
        <Metric label="Review" value={String(counts.review)} />
        <Metric label="Queued" value={String(counts.queued)} />
        <Metric label="Routed" value={String(counts.routed)} />
        <Metric label="Closed" value={String(counts.closed)} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((item) => (
          <Pressable
            key={item}
            style={[styles.tab, tab === item && styles.tabActive]}
            onPress={() => setTab(item)}
          >
            <Text style={tab === item ? styles.tabTextActive : styles.tabText}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search symbol, broker, or company"
        placeholderTextColor="#64748b"
        style={styles.search}
      />

      <ContainedPanel
        title={`${tab} Orders`}
        subtitle={`${visibleOrders.length} matching order${visibleOrders.length === 1 ? "" : "s"}`}
        emptyMessage={`No orders found in ${tab}.`}
        minHeight={340}
        maxHeight={500}
        heightRatio={0.48}
        testID="orders-status-panel"
      >
      {visibleOrders.length === 0 ? null : (
        visibleOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            tab={tab}
            onSendToBroker={() => sendToBroker(order)}
            onFill={() => fillOrder(order)}
            onCancel={() => cancelOrder(order)}
            onUpdate={(patch) => updateOrder(order, patch)}
          />
        ))
      )}
      </ContainedPanel>

      <Pressable style={styles.secondary} onPress={() => router.push("/orders-review")}>
        <Text style={styles.secondaryText}>Open Orders Review</Text>
      </Pressable>

      <Pressable style={styles.secondary} onPress={() => router.push("/basket-execution")}>
        <Text style={styles.secondaryText}>Open Basket Execution</Text>
      </Pressable>
    </ScrollView>
  );
}

function OrderCard({
  order,
  onSendToBroker,
  onFill,
  onCancel,
  onUpdate
}) {
  const status = String(order.status || "").toUpperCase();
  const canEdit = [ORDER_STATUS.DRAFT, ORDER_STATUS.REVIEW, ORDER_STATUS.PENDING].includes(status);
  const canRoute = status === ORDER_STATUS.QUEUED;
  const canFill = [
    ORDER_STATUS.ROUTED,
    ORDER_STATUS.BROKER_RECEIVED,
    ORDER_STATUS.PARTIAL_FILL
  ].includes(status);
  const canCancel = !isClosedOrder(status);

  const amount = Number(order.quantity || 0) * Number(order.price || 0);

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.symbol}>
            {order.side} {order.symbol}
          </Text>
          <Text style={styles.small}>
            {order.name || order.symbol} • {order.sector || "NSE"}
          </Text>
        </View>

        <Text style={statusStyle(status)}>{status}</Text>
      </View>

      <Text style={styles.reason}>
        {order.message || order.reason || "Order awaiting action"}
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>Qty {order.quantity}</Text>
        <Text style={styles.infoText}>Price KES {money(order.price)}</Text>
        <Text style={styles.infoText}>Value KES {money(amount)}</Text>
        <Text style={styles.infoText}>
          Broker {order.brokerName || "Not routed"}
        </Text>
      </View>

      {canEdit && (
        <View style={styles.editGrid}>
          <TextInput
            value={String(order.quantity || "")}
            keyboardType="numeric"
            placeholder="Qty"
            placeholderTextColor="#64748b"
            style={styles.input}
            onChangeText={(value) => {
              const quantity = cleanNumber(value);
              const gross = quantity * Number(order.price || 0);
              onUpdate({ quantity, gross, amount: gross });
            }}
          />

          <TextInput
            value={String(order.price || "")}
            keyboardType="numeric"
            placeholder="Price"
            placeholderTextColor="#64748b"
            style={styles.input}
            onChangeText={(value) => {
              const price = cleanNumber(value);
              const gross = Number(order.quantity || 0) * price;
              onUpdate({ price, gross, amount: gross });
            }}
          />
        </View>
      )}

      {canRoute && (
        <Pressable style={styles.primarySmall} onPress={onSendToBroker}>
          <Text style={styles.primaryText}>Route in Practice</Text>
        </Pressable>
      )}

      {canFill && (
        <Pressable style={styles.primarySmall} onPress={onFill}>
          <Text style={styles.primaryText}>Simulate Fill</Text>
        </Pressable>
      )}

      {canCancel && (
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel Order</Text>
        </Pressable>
      )}
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function cleanNumber(value) {
  const number = Number(
    String(value || "")
      .replaceAll(",", "")
      .replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(number) ? number : 0;
}

function statusStyle(status) {
  if (status === ORDER_STATUS.FILLED) return styles.filled;
  if (status === ORDER_STATUS.QUEUED) return styles.queued;
  if (
    status === ORDER_STATUS.ROUTED ||
    status === ORDER_STATUS.BROKER_RECEIVED ||
    status === ORDER_STATUS.PARTIAL_FILL
  ) {
    return styles.routed;
  }
  if (status === ORDER_STATUS.CANCELLED) return styles.cancelled;
  if (status === ORDER_STATUS.REJECTED) return styles.failed;
  return styles.pending;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 110 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 34, fontWeight: "900", flex: 1 },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardButtonText: { color: "#67e8f9", fontWeight: "900" },
  summaryCard: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metric: {
    width: "47%",
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  metricLabel: { color: "#94a3b8", fontSize: 12 },
  metricValue: { color: "white", fontWeight: "900", marginTop: 6 },
  tabs: {
    marginTop: 18,
    flexDirection: "row",
    gap: 8
  },
  tab: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 11,
    borderRadius: 999
  },
  tabActive: {
    backgroundColor: "rgba(147,51,234,.25)",
    borderColor: "#9333ea"
  },
  tabText: {
    color: "#cbd5e1",
    fontWeight: "800",
    fontSize: 11,
    textAlign: "center"
  },
  tabTextActive: {
    color: "white",
    fontWeight: "900",
    fontSize: 11,
    textAlign: "center"
  },
  search: {
    marginTop: 16,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    color: "white",
    padding: 16,
    borderRadius: 16
  },
  card: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  body: { color: "#cbd5e1", lineHeight: 21 },
  orderCard: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  symbol: {
    color: "white",
    fontWeight: "900",
    fontSize: 18
  },
  small: {
    color: "#94a3b8",
    marginTop: 5
  },
  reason: {
    color: "#cbd5e1",
    marginTop: 12,
    lineHeight: 20
  },
  infoBox: {
    marginTop: 14,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 5
  },
  infoText: {
    color: "#cbd5e1",
    fontSize: 12
  },
  editGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  input: {
    flex: 1,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    color: "white"
  },
  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primarySmall: {
    marginTop: 16,
    backgroundColor: "#9333ea",
    padding: 14,
    borderRadius: 16
  },
  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  secondary: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  },
  cancelButton: {
    marginTop: 12,
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 16
  },
  cancelText: {
    color: "#fca5a5",
    textAlign: "center",
    fontWeight: "900"
  },
  pending: { color: "#fbbf24", fontWeight: "900", fontSize: 12 },
  queued: { color: "#67e8f9", fontWeight: "900", fontSize: 12 },
  routed: { color: "#c084fc", fontWeight: "900", fontSize: 12 },
  filled: { color: "#86efac", fontWeight: "900", fontSize: 12 },
  cancelled: { color: "#94a3b8", fontWeight: "900", fontSize: 12 },
  failed: { color: "#fca5a5", fontWeight: "900", fontSize: 12 }
});
