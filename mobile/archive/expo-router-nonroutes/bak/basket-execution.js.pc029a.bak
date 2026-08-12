import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import {
  clearBasketExecution,
  createBasketExecution,
  getActiveExecutionOrders,
  loadBasketExecution
} from "../src/trade/basketExecutionStore";
import { ORDER_STATUS } from "../src/trade/orderLifecycle";

export default function BasketExecution() {
  const [execution, setExecution] = useState(null);

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

  const activeOrders = useMemo(() => {
    return getActiveExecutionOrders(execution || {}).filter((order) =>
      [
        ORDER_STATUS.QUEUED,
        ORDER_STATUS.ROUTED,
        ORDER_STATUS.BROKER_RECEIVED,
        ORDER_STATUS.PARTIAL_FILL
      ].includes(order.status)
    );
  }, [execution]);

  const closedOrders = execution?.orders?.filter((order) =>
    [
      ORDER_STATUS.FILLED,
      ORDER_STATUS.CANCELLED,
      ORDER_STATUS.REJECTED,
      ORDER_STATUS.EXPIRED
    ].includes(order.status)
  ) || [];

  const totalAmount = activeOrders.reduce(
    (sum, item) => sum + Number(item.amount || item.gross || 0),
    0
  );

  const isComplete =
    execution?.orders?.length > 0 && activeOrders.length === 0;

  async function clearExecution() {
    await clearBasketExecution();
    setExecution(null);
  }

  if (!execution || !execution.orders?.length) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Basket Execution</Text>
        <Text style={styles.subtitle}>No active basket execution found.</Text>

        <Pressable
          style={styles.primary}
          onPress={() => router.push("/orders-review")}
        >
          <Text style={styles.primaryText}>Open Orders Review</Text>
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
        <Text style={styles.title}>Basket Execution</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Track queued and broker-routed basket orders. Filled orders move to
        portfolio and trade history.
      </Text>

      <ActiveUserBanner />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Active Execution Orders</Text>
        <Text style={styles.summaryValue}>{activeOrders.length}</Text>
        <Text style={styles.body}>
          Status: {execution.status} • Active Value KES {money(totalAmount)}
        </Text>
        <Text style={styles.body}>
          Closed Orders: {closedOrders.length}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {isComplete ? "Execution Complete" : "Active Orders"}
        </Text>

        {isComplete ? (
          <>
            <Text style={styles.body}>
              No active execution orders remain. Filled orders should now be
              reflected in portfolio and trade history.
            </Text>

            <Pressable
              style={styles.secondary}
              onPress={() => router.push("/portfolio")}
            >
              <Text style={styles.secondaryText}>Open Portfolio</Text>
            </Pressable>

            <Pressable
              style={styles.secondary}
              onPress={() => router.push("/trade-history")}
            >
              <Text style={styles.secondaryText}>Open Trade History</Text>
            </Pressable>
          </>
        ) : (
          activeOrders.map((order) => (
            <View key={order.id} style={styles.orderRow}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>
                  {String(order.symbol || "?").slice(0, 2)}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.symbol}>{order.symbol}</Text>

                <Text style={styles.bodySmall}>
                  {order.side || "BUY"} • Qty {order.quantity} • KES{" "}
                  {money(order.amount || order.gross)}
                </Text>

                <Text style={styles.reason}>
                  Price KES {money(order.price)} •{" "}
                  {order.brokerName || "Broker not assigned"}
                </Text>

                <Text style={styles.reason}>
                  {order.message || "Awaiting lifecycle action"}
                </Text>
              </View>

              <Text style={statusStyle(order.status)}>
                {order.status}
              </Text>
            </View>
          ))
        )}
      </View>

      <Pressable
        style={styles.primary}
        onPress={() => router.push("/trading")}
      >
        <Text style={styles.primaryText}>Open Broker Routing</Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/trading")}
      >
        <Text style={styles.secondaryText}>Open Queue Manager</Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/orders")}
      >
        <Text style={styles.secondaryText}>Open OMS Orders</Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/orders-review")}
      >
        <Text style={styles.secondaryText}>Open Orders Review</Text>
      </Pressable>

      <Pressable style={styles.secondary} onPress={clearExecution}>
        <Text style={styles.secondaryText}>Clear Execution</Text>
      </Pressable>
    </ScrollView>
  );
}

function statusStyle(status) {
  if (status === ORDER_STATUS.QUEUED) return styles.queued;
  if (status === ORDER_STATUS.ROUTED) return styles.routed;
  if (status === ORDER_STATUS.BROKER_RECEIVED) return styles.received;
  if (status === ORDER_STATUS.PARTIAL_FILL) return styles.partial;
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
  summaryCard: {
    marginTop: 20,
    backgroundColor: "rgba(147,51,234,.14)",
    borderColor: "rgba(147,51,234,.38)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  summaryLabel: { color: "#cbd5e1" },
  summaryValue: {
    color: "white",
    fontSize: 38,
    fontWeight: "900",
    marginTop: 6
  },
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
  card: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
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
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 14
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  logoText: { color: "#67e8f9", fontWeight: "900", fontSize: 13 },
  symbol: { color: "white", fontWeight: "900", fontSize: 16 },
  bodySmall: { color: "#cbd5e1", marginTop: 4, fontSize: 12 },
  reason: { color: "#94a3b8", marginTop: 4, fontSize: 12 },
  pending: { color: "#94a3b8", fontWeight: "900", fontSize: 12 },
  queued: { color: "#67e8f9", fontWeight: "900", fontSize: 12 },
  routed: { color: "#c084fc", fontWeight: "900", fontSize: 12 },
  received: { color: "#38bdf8", fontWeight: "900", fontSize: 12 },
  partial: { color: "#fde68a", fontWeight: "900", fontSize: 12 },
  primary: {
    marginTop: 20,
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
  secondaryText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" }
});