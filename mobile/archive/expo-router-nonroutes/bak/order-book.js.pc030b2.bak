import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

import { userGetItem } from "../src/auth/userStorage";

export default function OrderBook() {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const raw = await userGetItem("simulatedTrades");
    setTrades(raw ? JSON.parse(raw) : []);
  }

  const summary = useMemo(() => {
    return {
      total: trades.length,
      executed: trades.filter((x) => x.status === "SIMULATED_EXECUTED").length,
      buy: trades.filter((x) => x.side === "BUY").length,
      sell: trades.filter((x) => x.side === "SELL").length
    };
  }, [trades]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Order Book</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Review simulated orders before real broker execution is connected.
      </Text>

      <View style={styles.summaryCard}>
        <Metric label="Total Orders" value={String(summary.total)} />
        <Metric label="Executed" value={String(summary.executed)} />
        <Metric label="Buy Orders" value={String(summary.buy)} />
        <Metric label="Sell Orders" value={String(summary.sell)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Orders</Text>

        {trades.length === 0 ? (
          <Text style={styles.body}>No simulated orders yet.</Text>
        ) : (
          trades.map((order, index) => (
            <View
              key={`${order.symbol}-${order.tradedAt}-${index}`}
              style={styles.orderRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.symbol}>
                  {order.side} {order.symbol}
                </Text>

                <Text style={styles.small}>
                  {order.quantity} shares @ KES {money(order.price)}
                </Text>

                <Text style={styles.tiny}>{formatDate(order.tradedAt)}</Text>
              </View>

              <View style={styles.right}>
                <Text style={order.side === "BUY" ? styles.buy : styles.sell}>
                  KES {money(order.gross)}
                </Text>

                <Text style={styles.status}>{order.status || "SIMULATED"}</Text>

                <Text style={styles.tiny}>
                  {order.settlementStatus || "SETTLED"}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <Pressable style={styles.primary} onPress={() => router.push("/trade")}>
        <Text style={styles.primaryText}>New Simulated Order</Text>
      </Pressable>

      <Pressable style={styles.secondary} onPress={() => router.push("/trade-history")}>
        <Text style={styles.secondaryText}>View Trade History</Text>
      </Pressable>

      <Pressable style={styles.secondary} onPress={() => router.push("/coach-insights")}>
        <Text style={styles.secondaryText}>Back to Coach G Insights</Text>
      </Pressable>
    </ScrollView>
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

function formatDate(value) {
  if (!value) return "N/A";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 100 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 34, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardButtonText: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  summaryCard: {
    marginTop: 22,
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
  card: {
    marginTop: 22,
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
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 14
  },
  symbol: { color: "white", fontWeight: "900", fontSize: 17 },
  small: { color: "#94a3b8", marginTop: 4 },
  tiny: { color: "#64748b", marginTop: 4, fontSize: 12 },
  right: { alignItems: "flex-end", minWidth: 120 },
  buy: { color: "#86efac", fontWeight: "900" },
  sell: { color: "#fca5a5", fontWeight: "900" },
  status: { color: "#67e8f9", marginTop: 6, fontSize: 11, fontWeight: "900" },
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
  secondaryText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" }
});