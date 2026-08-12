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
import {
  createBasketExecution,
  loadBasketExecution,
  markExecutionOrderFilled,
  updateExecutionOrder
} from "../src/trade/basketExecutionStore";
import { ORDER_STATUS } from "../src/trade/orderLifecycle";
import { placeBrokerOrder } from "../src/brokers/brokerAdapters";

const FLOW = [
  ORDER_STATUS.REVIEW,
  ORDER_STATUS.BROKER_SELECTED,
  ORDER_STATUS.QUEUED,
  ORDER_STATUS.ROUTED,
  ORDER_STATUS.BROKER_RECEIVED,
  ORDER_STATUS.PARTIAL_FILL,
  ORDER_STATUS.FILLED
];

export default function QueueManager() {
  const [execution, setExecution] = useState(null);
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

  const filteredOrders = useMemo(() => {
    const search = query.trim().toLowerCase();

    return orders.filter((order) => {
      if (!search) return true;

      return (
        String(order.symbol || "").toLowerCase().includes(search) ||
        String(order.name || "").toLowerCase().includes(search) ||
        String(order.status || "").toLowerCase().includes(search) ||
        String(order.brokerName || "").toLowerCase().includes(search)
      );
    });
  }, [orders, query]);

  const counts = useMemo(() => {
    return FLOW.reduce((acc, status) => {
      acc[status] = orders.filter((order) => order.status === status).length;
      return acc;
    }, {});
  }, [orders]);

  async function routeQueuedOrders() {
    const queued = orders.filter((order) =>
      [ORDER_STATUS.QUEUED, ORDER_STATUS.BROKER_SELECTED].includes(order.status)
    );

    if (!queued.length) {
      Alert.alert("No Queued Orders", "Queue or select broker orders before routing.");
      return;
    }

    Alert.alert(
      "Route Orders",
      `${queued.length} orders will be sent through the broker adapter layer.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Route",
          onPress: async () => {
            let latest = execution;

            for (const order of queued) {
              latest = await updateExecutionOrder(order.id, {
                status: ORDER_STATUS.ROUTED,
                message: `Routing to ${order.brokerName || "Simulation Broker"}`,
                routedAt: new Date().toISOString()
              });

              const brokerResponse = await placeBrokerOrder({
                ...order,
                brokerId: order.brokerId || "SIM",
                brokerName: order.brokerName || "Simulation Broker"
              });

              latest = await updateExecutionOrder(order.id, {
                brokerId: brokerResponse.brokerId || order.brokerId || "SIM",
                brokerName:
                  brokerResponse.brokerName ||
                  order.brokerName ||
                  "Simulation Broker",
                brokerOrderId: brokerResponse.brokerOrderId,
                brokerStatus: brokerResponse.status,
                status: ORDER_STATUS.BROKER_RECEIVED,
                message:
                  brokerResponse.message ||
                  "Broker received order through adapter.",
                submittedAt: brokerResponse.submittedAt,
                brokerReceivedAt: brokerResponse.receivedAt,
                adapterResponse: brokerResponse,
                updatedAt: new Date().toISOString()
              });
            }

            setExecution(latest);
          }
        }
      ]
    );
  }

  async function fillBrokerReceivedOrders() {
    const received = orders.filter((order) =>
      [ORDER_STATUS.BROKER_RECEIVED, ORDER_STATUS.PARTIAL_FILL].includes(
        order.status
      )
    );

    if (!received.length) {
      Alert.alert(
        "No Broker Received Orders",
        "No broker received orders are ready to fill."
      );
      return;
    }

    Alert.alert(
      "Mark Filled",
      `${received.length} broker-received orders will be marked as filled.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Fill",
          onPress: async () => {
            let latest = execution;

            for (const order of received) {
              latest = await markExecutionOrderFilled(order.id, {
                symbol: order.symbol,
                side: order.side,
                quantity: order.quantity,
                price: order.price,
                brokerId: order.brokerId,
                brokerName: order.brokerName,
                brokerOrderId: order.brokerOrderId,
                filledAt: new Date().toISOString(),
                source: "BROKER_CONFIRMATION"
              });
            }

            setExecution(latest);
          }
        }
      ]
    );
  }

  async function markPartial(order) {
    const filledQty = Math.max(1, Math.floor(Number(order.quantity || 0) / 2));

    const updated = await updateExecutionOrder(order.id, {
      status: ORDER_STATUS.PARTIAL_FILL,
      filledQuantity: filledQty,
      remainingQuantity: Number(order.quantity || 0) - filledQty,
      message: `Partial fill: ${filledQty}/${order.quantity}`,
      updatedAt: new Date().toISOString()
    });

    setExecution(updated);
  }

  if (!execution || !orders.length) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Queue Manager</Text>

        <Text style={styles.subtitle}>
          No active OMS queue found. Create a basket first.
        </Text>

        <Pressable
          style={styles.primary}
          onPress={() => router.push("/trade-basket")}
        >
          <Text style={styles.primaryText}>Open Trade Basket</Text>
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.secondaryText}>Dashboard</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Queue Manager</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        OMS control center using broker adapters for routing and broker
        confirmation.
      </Text>

      <ActiveUserBanner />

      <View style={styles.flowCard}>
        <Text style={styles.cardTitle}>Lifecycle Flow</Text>

        {FLOW.map((status, index) => (
          <View key={status} style={styles.flowRow}>
            <View style={styles.flowStep}>
              <Text style={styles.flowStepText}>{index + 1}</Text>
            </View>

            <Text style={styles.flowLabel}>{status}</Text>

            <Text style={styles.flowCount}>{counts[status] || 0}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionGrid}>
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/orders-review")}
        >
          <Text style={styles.actionText}>Review Orders</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/trading")}
        >
          <Text style={styles.actionText}>Broker Routing</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/orders")}
        >
          <Text style={styles.actionText}>OMS Orders</Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={routeQueuedOrders}>
          <Text style={styles.actionText}>Route Queued</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={fillBrokerReceivedOrders}
        >
          <Text style={styles.actionText}>Fill Received</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/basket-execution")}
        >
          <Text style={styles.actionText}>Basket Execution</Text>
        </Pressable>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search symbol, broker, or status"
        placeholderTextColor="#64748b"
        style={styles.search}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Queue Orders</Text>

        {filteredOrders.length === 0 ? (
          <Text style={styles.body}>No orders found.</Text>
        ) : (
          filteredOrders.map((order) => (
            <View key={order.id} style={styles.orderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.symbol}>
                  {order.side} {order.symbol}
                </Text>

                <Text style={styles.small}>
                  Qty {order.quantity} @ KES {money(order.price)}
                </Text>

                <Text style={styles.small}>
                  Broker: {order.brokerName || "Not routed"}
                </Text>

                {order.brokerOrderId ? (
                  <Text style={styles.small}>
                    Broker Order: {order.brokerOrderId}
                  </Text>
                ) : null}

                <Text style={styles.reason}>
                  {order.message || "Waiting for next lifecycle action"}
                </Text>
              </View>

              <View style={styles.right}>
                <Text style={statusStyle(order.status)}>{order.status}</Text>

                {order.status === ORDER_STATUS.BROKER_RECEIVED ? (
                  <Pressable
                    style={styles.miniButton}
                    onPress={() => markPartial(order)}
                  >
                    <Text style={styles.miniButtonText}>Partial</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function statusStyle(status) {
  if (status === ORDER_STATUS.FILLED) return styles.filled;
  if (status === ORDER_STATUS.QUEUED) return styles.queued;
  if (status === ORDER_STATUS.ROUTED) return styles.routed;
  if (status === ORDER_STATUS.BROKER_RECEIVED) return styles.received;
  if (status === ORDER_STATUS.PARTIAL_FILL) return styles.partial;
  if (status === ORDER_STATUS.BROKER_SELECTED) return styles.selected;
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
  title: { color: "white", fontSize: 32, fontWeight: "900", flex: 1 },
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
  flowCard: {
    marginTop: 20,
    backgroundColor: "rgba(147,51,234,.14)",
    borderColor: "rgba(147,51,234,.38)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  cardTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  flowRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomColor: "rgba(148,163,184,.18)",
    borderBottomWidth: 1,
    paddingVertical: 10,
    gap: 12
  },
  flowStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#9333ea",
    alignItems: "center",
    justifyContent: "center"
  },
  flowStepText: {
    color: "white",
    fontWeight: "900"
  },
  flowLabel: {
    color: "white",
    fontWeight: "900",
    flex: 1,
    fontSize: 12
  },
  flowCount: {
    color: "#86efac",
    fontWeight: "900"
  },
  actionGrid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  actionButton: {
    width: "47%",
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    padding: 14,
    borderRadius: 16
  },
  actionText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 12
  },
  search: {
    marginTop: 18,
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
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
  orderRow: {
    flexDirection: "row",
    gap: 12,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 14
  },
  symbol: {
    color: "white",
    fontWeight: "900",
    fontSize: 17
  },
  small: {
    color: "#94a3b8",
    marginTop: 5,
    fontSize: 12
  },
  reason: {
    color: "#cbd5e1",
    marginTop: 6,
    lineHeight: 19,
    fontSize: 12
  },
  right: {
    alignItems: "flex-end",
    minWidth: 105
  },
  miniButton: {
    marginTop: 10,
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  miniButtonText: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 11
  },
  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" },
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
  pending: { color: "#fbbf24", fontWeight: "900", fontSize: 12 },
  selected: { color: "#86efac", fontWeight: "900", fontSize: 12 },
  queued: { color: "#67e8f9", fontWeight: "900", fontSize: 12 },
  routed: { color: "#c084fc", fontWeight: "900", fontSize: 12 },
  received: { color: "#38bdf8", fontWeight: "900", fontSize: 12 },
  partial: { color: "#fde68a", fontWeight: "900", fontSize: 12 },
  filled: { color: "#86efac", fontWeight: "900", fontSize: 12 }
});