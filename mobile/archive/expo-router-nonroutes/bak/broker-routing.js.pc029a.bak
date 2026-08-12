import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import {
  createBasketExecution,
  loadBasketExecution,
  routeExecutionOrder,
  updateExecutionOrder
} from "../src/trade/basketExecutionStore";
import { ORDER_STATUS } from "../src/trade/orderLifecycle";

const BROKERS = [
  {
    id: "AIB",
    name: "AIB-AXYS",
    bestFor: "All-round NSE execution",
    feeScore: 88,
    speedScore: 86,
    reliabilityScore: 90
  },
  {
    id: "ABC",
    name: "ABC Capital",
    bestFor: "Digital onboarding and research",
    feeScore: 84,
    speedScore: 82,
    reliabilityScore: 86
  },
  {
    id: "NCBA",
    name: "NCBA Investment Bank",
    bestFor: "Banking integration",
    feeScore: 80,
    speedScore: 78,
    reliabilityScore: 84
  },
  {
    id: "DYER",
    name: "Dyer & Blair",
    bestFor: "Full-service advisory",
    feeScore: 76,
    speedScore: 80,
    reliabilityScore: 88
  },
  {
    id: "FAIDA",
    name: "Faida Investment Bank",
    bestFor: "Retail investor access",
    feeScore: 82,
    speedScore: 77,
    reliabilityScore: 81
  }
];

export default function BrokerRouting() {
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

  const orders = execution?.orders || [];

  const routeableOrders = useMemo(() => {
    return orders.filter((order) =>
      [
        ORDER_STATUS.REVIEW,
        ORDER_STATUS.PENDING,
        ORDER_STATUS.BROKER_SELECTED,
        ORDER_STATUS.QUEUED,
        ORDER_STATUS.ROUTED
      ].includes(order.status)
    );
  }, [orders]);

  const routedCount = orders.filter(
    (order) => order.status === ORDER_STATUS.ROUTED
  ).length;

  const brokerSelectedCount = orders.filter(
    (order) => order.status === ORDER_STATUS.BROKER_SELECTED
  ).length;

  async function selectBroker(order, broker) {
    const updated = await updateExecutionOrder(order.id, {
      brokerId: broker.id,
      brokerName: broker.name,
      brokerScore: broker.reliabilityScore,
      brokerRecommendation: {
        brokerId: broker.id,
        brokerName: broker.name,
        bestFor: broker.bestFor,
        confidence: broker.reliabilityScore,
        reason: `Coach G selected ${broker.name} for ${broker.bestFor}.`
      },
      status: ORDER_STATUS.BROKER_SELECTED,
      message: `Broker selected: ${broker.name}`,
      brokerSelectedAt: new Date().toISOString()
    });

    setExecution(updated);
  }

  async function routeOrder(order) {
    if (!order.brokerId) {
      Alert.alert("Broker Required", "Select a broker before routing.");
      return;
    }

    const broker = {
      id: order.brokerId,
      name: order.brokerName
    };

    const updated = await routeExecutionOrder(order.id, broker);
    setExecution(updated);
  }

  async function routeAllSelected() {
    const selected = orders.filter(
      (order) => order.status === ORDER_STATUS.BROKER_SELECTED && order.brokerId
    );

    if (!selected.length) {
      Alert.alert(
        "No Broker Selected",
        "Select brokers for at least one order before routing."
      );
      return;
    }

    Alert.alert(
      "Route Selected Orders",
      `${selected.length} broker-selected orders will be routed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Route",
          onPress: async () => {
            let latest = execution;

            for (const order of selected) {
              latest = await routeExecutionOrder(order.id, {
                id: order.brokerId,
                name: order.brokerName
              });
            }

            setExecution(latest);
            router.push("/trading");
          }
        }
      ]
    );
  }

  async function autoSelectBrokers() {
    const openOrders = routeableOrders.filter(
      (order) =>
        ![
          ORDER_STATUS.ROUTED,
          ORDER_STATUS.BROKER_RECEIVED,
          ORDER_STATUS.FILLED
        ].includes(order.status)
    );

    if (!openOrders.length) {
      Alert.alert("No Orders", "No open orders require broker selection.");
      return;
    }

    let latest = execution;

    for (const order of openOrders) {
      const broker = recommendBroker(order);

      latest = await updateExecutionOrder(order.id, {
        brokerId: broker.id,
        brokerName: broker.name,
        brokerScore: broker.reliabilityScore,
        brokerRecommendation: {
          brokerId: broker.id,
          brokerName: broker.name,
          bestFor: broker.bestFor,
          confidence: broker.reliabilityScore,
          reason: `Coach G selected ${broker.name} for ${broker.bestFor}.`
        },
        status: ORDER_STATUS.BROKER_SELECTED,
        message: `Coach G selected ${broker.name}`,
        brokerSelectedAt: new Date().toISOString()
      });
    }

    setExecution(latest);
  }

  if (!execution || !orders.length) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Broker Routing</Text>

        <Text style={styles.subtitle}>
          No active orders found. Create or queue basket orders first.
        </Text>

        <Pressable
          style={styles.primary}
          onPress={() => router.push("/orders-review")}
        >
          <Text style={styles.primaryText}>Open Orders Review</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Broker Routing</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Select which broker should receive each order before routing to
        execution.
      </Text>

      <ActiveUserBanner />

      <View style={styles.summaryCard}>
        <Metric label="Routeable" value={String(routeableOrders.length)} />
        <Metric label="Broker Selected" value={String(brokerSelectedCount)} />
        <Metric label="Routed" value={String(routedCount)} />
        <Metric label="Execution" value={execution.status || "N/A"} />
      </View>

      <View style={styles.actionRow}>
        <Pressable style={styles.actionButton} onPress={autoSelectBrokers}>
          <Text style={styles.actionText}>Coach G Auto Select</Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={routeAllSelected}>
          <Text style={styles.actionText}>Route Selected</Text>
        </Pressable>
      </View>

      {routeableOrders.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No Routeable Orders</Text>
          <Text style={styles.body}>
            Orders may already be filled, cancelled, rejected, or expired.
          </Text>
        </View>
      ) : (
        routeableOrders.map((order) => (
          <RoutingCard
            key={order.id}
            order={order}
            onSelectBroker={(broker) => selectBroker(order, broker)}
            onRoute={() => routeOrder(order)}
          />
        ))
      )}

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/trading")}
      >
        <Text style={styles.secondaryText}>Open Trading</Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/orders")}
      >
        <Text style={styles.secondaryText}>Open OMS Orders</Text>
      </Pressable>
    </ScrollView>
  );
}

function RoutingCard({ order, onSelectBroker, onRoute }) {
  const canRoute =
    order.status === ORDER_STATUS.BROKER_SELECTED && !!order.brokerId;

  return (
    <View style={styles.card}>
      <View style={styles.orderTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.symbol}>
            {order.side} {order.symbol}
          </Text>

          <Text style={styles.small}>
            Qty {order.quantity} @ KES {money(order.price)}
          </Text>
        </View>

        <Text style={statusStyle(order.status)}>{order.status}</Text>
      </View>

      <View style={styles.routeBox}>
        <Text style={styles.routeLabel}>Current Route</Text>
        <Text style={styles.routeValue}>
          {order.brokerName || "No broker selected"}
        </Text>

        {order.brokerRecommendation?.reason ? (
          <Text style={styles.reason}>{order.brokerRecommendation.reason}</Text>
        ) : (
          <Text style={styles.reason}>
            Select a broker manually or let Coach G auto-select.
          </Text>
        )}
      </View>

      <Text style={styles.cardTitle}>Available Brokers</Text>

      {BROKERS.map((broker) => {
        const selected = order.brokerId === broker.id;

        return (
          <Pressable
            key={broker.id}
            style={[styles.brokerRow, selected && styles.brokerSelected]}
            onPress={() => onSelectBroker(broker)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.brokerName}>{broker.name}</Text>
              <Text style={styles.small}>{broker.bestFor}</Text>
            </View>

            <Text style={styles.brokerScore}>
              {broker.reliabilityScore}/100
            </Text>
          </Pressable>
        );
      })}

      <Pressable
        style={[styles.primarySmall, !canRoute && styles.disabledButton]}
        disabled={!canRoute}
        onPress={onRoute}
      >
        <Text style={styles.primaryText}>
          {canRoute ? "Route This Order" : "Select Broker First"}
        </Text>
      </Pressable>
    </View>
  );
}

function recommendBroker(order) {
  const side = String(order.side || "BUY").toUpperCase();
  const value = Number(order.amount || order.gross || 0);

  if (value >= 50000) {
    return BROKERS.find((broker) => broker.id === "AIB") || BROKERS[0];
  }

  if (side === "SELL") {
    return BROKERS.find((broker) => broker.id === "DYER") || BROKERS[0];
  }

  if (value <= 10000) {
    return BROKERS.find((broker) => broker.id === "ABC") || BROKERS[0];
  }

  return BROKERS[0];
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{String(value || "N/A")}</Text>
    </View>
  );
}

function statusStyle(status) {
  if (status === ORDER_STATUS.ROUTED) return styles.routed;
  if (status === ORDER_STATUS.BROKER_SELECTED) return styles.selected;
  if (status === ORDER_STATUS.QUEUED) return styles.queued;
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
  metricValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 6,
    fontSize: 13
  },
  actionRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10
  },
  actionButton: {
    flex: 1,
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
    fontSize: 16,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 10
  },
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
  orderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  symbol: { color: "white", fontWeight: "900", fontSize: 18 },
  small: { color: "#94a3b8", marginTop: 4, fontSize: 12 },
  routeBox: {
    marginTop: 16,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  routeLabel: {
    color: "#94a3b8",
    fontSize: 12
  },
  routeValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 4,
    fontSize: 16
  },
  reason: {
    color: "#cbd5e1",
    marginTop: 8,
    lineHeight: 20
  },
  brokerRow: {
    marginTop: 10,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  brokerSelected: {
    borderColor: "#9333ea",
    backgroundColor: "rgba(147,51,234,.16)"
  },
  brokerName: {
    color: "white",
    fontWeight: "900"
  },
  brokerScore: {
    color: "#86efac",
    fontWeight: "900"
  },
  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primarySmall: {
    marginTop: 18,
    backgroundColor: "#9333ea",
    padding: 15,
    borderRadius: 16
  },
  disabledButton: {
    opacity: 0.45
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
  pending: { color: "#fbbf24", fontWeight: "900", fontSize: 12 },
  selected: { color: "#86efac", fontWeight: "900", fontSize: 12 },
  queued: { color: "#67e8f9", fontWeight: "900", fontSize: 12 },
  routed: { color: "#c084fc", fontWeight: "900", fontSize: 12 }
});