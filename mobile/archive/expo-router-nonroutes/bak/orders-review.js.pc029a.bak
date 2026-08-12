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
  deleteExecutionOrder,
  loadBasketExecution,
  queueExecutionOrders,
  queueSingleOrder,
  updateExecutionOrder
} from "../src/trade/basketExecutionStore";
import { ORDER_STATUS } from "../src/trade/orderLifecycle";

export default function OrdersReview() {
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

  const reviewOrders = useMemo(() => {
    const search = query.trim().toLowerCase();

    return orders
      .filter((order) =>
        [ORDER_STATUS.DRAFT, ORDER_STATUS.REVIEW, ORDER_STATUS.PENDING].includes(
          order.status
        )
      )
      .filter((order) => {
        if (!search) return true;

        return (
          String(order.symbol || "").toLowerCase().includes(search) ||
          String(order.name || "").toLowerCase().includes(search) ||
          String(order.side || "").toLowerCase().includes(search)
        );
      });
  }, [orders, query]);

  const totalAmount = reviewOrders.reduce(
    (sum, order) => sum + Number(order.amount || order.gross || 0),
    0
  );

  async function updateOrder(order, patch) {
    const updated = await updateExecutionOrder(order.id, patch);
    setExecution(updated);
  }

  async function deleteOrder(order) {
    Alert.alert("Delete Order", `Remove ${order.symbol} from this basket?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = await deleteExecutionOrder(order.id);
          setExecution(updated);
        }
      }
    ]);
  }

  async function queueOrder(order) {
    const updated = await queueSingleOrder(order.id);
    setExecution(updated);
  }

  async function prepareHandoff() {
    if (!reviewOrders.length) {
      Alert.alert("No Orders", "There are no review orders to submit.");
      return;
    }

    Alert.alert(
      "Prepare Order Handoff",
      `${reviewOrders.length} orders will be prepared for broker execution.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: async () => {
            const updated = await queueExecutionOrders();
            setExecution(updated);
            router.push("/trading")
          }
        }
      ]
    );
  }

  if (!execution || !orders.length) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Orders Review</Text>

        <Text style={styles.subtitle}>
          No basket orders found. Create a Coach G trade basket first.
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
        <Text style={styles.title}>Orders Review</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Review and modify basket orders before preparing broker handoff.
      </Text>

      <ActiveUserBanner />

      <View style={styles.summaryCard}>
        <Metric label="Review Orders" value={String(reviewOrders.length)} />
        <Metric label="Basket Orders" value={String(orders.length)} />
        <Metric label="Estimated Value" value={`KES ${money(totalAmount)}`} />
        <Metric label="Status" value={execution.status} />
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search symbol, name, or side"
        placeholderTextColor="#64748b"
        style={styles.search}
      />

      {reviewOrders.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No Review Orders</Text>

          <Text style={styles.body}>
            All orders have already been prepared, submitted, filled, cancelled,
            or removed.
          </Text>

          <Pressable
            style={styles.primary}
            onPress={() => router.push("/trading")}
          >
            <Text style={styles.primaryText}>Open Trading</Text>
          </Pressable>
        </View>
      ) : (
        reviewOrders.map((order) => (
          <ReviewOrderCard
            key={order.id}
            order={order}
            onChange={(patch) => updateOrder(order, patch)}
            onDelete={() => deleteOrder(order)}
            onQueue={() => queueOrder(order)}
          />
        ))
      )}

      <Pressable
        style={[styles.primary, reviewOrders.length === 0 && styles.disabledButton]}
        disabled={reviewOrders.length === 0}
        onPress={prepareHandoff}
      >
        <Text style={styles.primaryText}>
          {reviewOrders.length > 0
            ? `Continue to Order Handoff (${reviewOrders.length})`
            : "No Orders to Submit"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function ReviewOrderCard({ order, onChange, onDelete, onQueue }) {
  const qty = String(order.quantity || "");
  const price = String(order.price || "");
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

        <Text style={styles.status}>{order.status}</Text>
      </View>

      <Text style={styles.reason}>
        {order.reason || "Coach G recommended order"}
      </Text>

      <View style={styles.sideRow}>
        {["BUY", "SELL"].map((side) => (
          <Pressable
            key={side}
            style={[styles.sideChip, order.side === side && styles.sideChipActive]}
            onPress={() => onChange({ side })}
          >
            <Text
              style={order.side === side ? styles.sideTextActive : styles.sideText}
            >
              {side}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.editGrid}>
        <View style={styles.editBox}>
          <Text style={styles.inputLabel}>Quantity</Text>

          <TextInput
            value={qty}
            keyboardType="numeric"
            placeholder="Qty"
            placeholderTextColor="#64748b"
            style={styles.input}
            onChangeText={(value) => {
              const quantity = cleanNumber(value);
              const gross = quantity * Number(order.price || 0);

              onChange({
                quantity,
                gross,
                amount: gross
              });
            }}
          />
        </View>

        <View style={styles.editBox}>
          <Text style={styles.inputLabel}>Limit Price</Text>

          <TextInput
            value={price}
            keyboardType="numeric"
            placeholder="Price"
            placeholderTextColor="#64748b"
            style={styles.input}
            onChangeText={(value) => {
              const nextPrice = cleanNumber(value);
              const gross = Number(order.quantity || 0) * nextPrice;

              onChange({
                price: nextPrice,
                gross,
                amount: gross
              });
            }}
          />
        </View>
      </View>

      <View style={styles.amountBox}>
        <Text style={styles.amountLabel}>Estimated Value</Text>
        <Text style={styles.amountValue}>KES {money(amount)}</Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.queueButton} onPress={onQueue}>
          <Text style={styles.queueText}>Prepare This Order</Text>
        </Pressable>

        <Pressable style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{String(value || "N/A")}</Text>
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
  cardTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
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
  status: {
    color: "#fbbf24",
    fontWeight: "900",
    fontSize: 12
  },
  reason: {
    color: "#cbd5e1",
    marginTop: 12,
    lineHeight: 20
  },
  sideRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  sideChip: {
    flex: 1,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13
  },
  sideChipActive: {
    backgroundColor: "#9333ea",
    borderColor: "#c084fc"
  },
  sideText: {
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "900"
  },
  sideTextActive: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  editGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  editBox: {
    flex: 1
  },
  inputLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 6
  },
  input: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    color: "white"
  },
  amountBox: {
    marginTop: 16,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  amountLabel: {
    color: "#94a3b8",
    fontSize: 12
  },
  amountValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 4
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  queueButton: {
    flex: 1,
    backgroundColor: "#9333ea",
    padding: 14,
    borderRadius: 16
  },
  queueText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 12
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 16
  },
  deleteText: {
    color: "#fca5a5",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 12
  },
  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" },
  disabledButton: { opacity: 0.45 },
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
  }
});