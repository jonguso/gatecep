import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function TradeHistory() {
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const raw = await AsyncStorage.getItem("gatecepSimulatedTrades");
    setTrades(raw ? JSON.parse(raw) : []);
  }

  const summary = useMemo(() => {
    const buys = trades.filter((t) => t.side === "BUY");
    const sells = trades.filter((t) => t.side === "SELL");

    return {
      total: trades.length,
      buys: buys.length,
      sells: sells.length,
      totalValue: trades.reduce((sum, t) => sum + Number(t.gross || 0), 0),
      totalFees: trades.reduce((sum, t) => sum + Number(t.totalFees || 0), 0)
    };
  }, [trades]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
             <View style={styles.headerRow}>
  <Text style={styles.title}>Trade History</Text>

  <Pressable
    style={styles.dashboardButton}
    onPress={() => router.replace("/(tabs)/dashboard")}
  >
    <Text style={styles.dashboardButtonText}>Dashboard</Text>
  </Pressable>
</View>
      <Text style={styles.subtitle}>
        Review simulated orders created before real broker execution is connected.
      </Text>

      <View style={styles.summaryCard}>
        <Metric label="Total Trades" value={String(summary.total)} />
        <Metric label="Buys" value={String(summary.buys)} />
        <Metric label="Sells" value={String(summary.sells)} />
        <Metric label="Fees" value={`KES ${money(summary.totalFees)}`} />
      </View>

      {trades.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No Trades Yet</Text>

          <Text style={styles.body}>
            Run your first simulated trade to begin building order history.
          </Text>

          <Pressable
            style={styles.primary}
            onPress={() => router.push("/first-trade")}
          >
            <Text style={styles.primaryText}>Start First Trade Simulation</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Orders</Text>

          {trades.map((trade, index) => (
            <View key={`${trade.symbol}-${trade.tradedAt}-${index}`} style={styles.tradeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.symbol}>
                  {trade.side} {trade.symbol}
                </Text>

                <Text style={styles.small}>
                  {trade.quantity} shares @ KES {money(trade.price)}
                </Text>

                <Text style={styles.tiny}>
                  {formatDate(trade.tradedAt)}
                </Text>

                <Text style={styles.status}>
                  {trade.status || "SIMULATED"}
                </Text>
              </View>

              <View style={styles.right}>
                <Text style={trade.side === "BUY" ? styles.buy : styles.sell}>
                  KES {money(trade.gross)}
                </Text>

                <Text style={styles.fee}>
                  Fees: KES {money(trade.totalFees)}
                </Text>

                <Text style={styles.cash}>
                  Cash: KES {money(trade.cashAfter)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.primary} onPress={() => router.push("/first-trade")}>
        <Text style={styles.primaryText}>New Simulated Trade</Text>
      </Pressable>

      <Pressable style={styles.secondary} onPress={() => router.replace("/coach")}>
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
  title: { color: "white", fontSize: 34, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },

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

  tradeRow: {
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
  status: { color: "#67e8f9", marginTop: 6, fontSize: 11, fontWeight: "900" },

  right: { alignItems: "flex-end", minWidth: 120 },
  buy: { color: "#86efac", fontWeight: "900" },
  sell: { color: "#fca5a5", fontWeight: "900" },
  fee: { color: "#94a3b8", marginTop: 5, fontSize: 12 },
  cash: { color: "#cbd5e1", marginTop: 5, fontSize: 12 },

  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
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
 headerRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12
},

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

  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  }
});