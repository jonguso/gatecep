import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";
import { loadPortfolioSnapshots } from "../src/portfolio/portfolioSnapshot";

export default function Performance() {
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await loadPortfolioSnapshots();
    setSnapshots(data);
    setLoading(false);
  }

  const metrics = useMemo(() => {
    const latest = snapshots[0];
    const first = snapshots[snapshots.length - 1];

    const change =
      latest && first
        ? Number(latest.totalValue || 0) - Number(first.totalValue || 0)
        : 0;

    const changePct =
      first && Number(first.totalValue || 0) > 0
        ? (change / Number(first.totalValue || 0)) * 100
        : 0;

    return {
      latest,
      first,
      change,
      changePct
    };
  }, [snapshots]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#67e8f9" />
        <Text style={styles.body}>Loading performance...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Performance</Text>
          <Text style={styles.subtitle}>
            Portfolio value, gains, cash, and health over time.
          </Text>
        </View>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardText}>Dashboard</Text>
        </Pressable>
      </View>

      {!metrics.latest ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No Snapshot Yet</Text>
          <Text style={styles.body}>
            Open Dashboard after importing holdings or placing a trade to create
            your first performance snapshot.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <SummaryItem
              label="Current Value"
              value={`KES ${money(metrics.latest.currentValue)}`}
              cyan
            />

            <SummaryItem
              label="Invested Value"
              value={`KES ${money(metrics.latest.investedValue)}`}
            />

            <SummaryItem
              label="Cash"
              value={`KES ${money(metrics.latest.cash)}`}
              green
            />

            <SummaryItem
              label="Net Gain/Loss"
              value={`KES ${money(metrics.latest.netGainLoss)} (${Number(
                metrics.latest.gainLossPct || 0
              ).toFixed(2)}%)`}
              positive={Number(metrics.latest.netGainLoss || 0) >= 0}
            />

            <SummaryItem
              label="Change Since First Snapshot"
              value={`KES ${money(metrics.change)} (${metrics.changePct.toFixed(
                2
              )}%)`}
              positive={metrics.change >= 0}
            />

            <SummaryItem
              label="Health Score"
              value={`${metrics.latest.healthScore || 0}/100 ${
                metrics.latest.healthRating
                  ? `(${metrics.latest.healthRating})`
                  : ""
              }`}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Snapshot History</Text>

            {snapshots.map((s) => (
              <View key={s.date} style={styles.snapshotRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.snapshotDate}>{s.date}</Text>
                  <Text style={styles.small}>
                    Health {s.healthScore || 0}/100 • Cash KES {money(s.cash)}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.white}>KES {money(s.totalValue)}</Text>
                  <Text
                    style={
                      Number(s.netGainLoss || 0) >= 0
                        ? styles.green
                        : styles.red
                    }
                  >
                    KES {money(s.netGainLoss)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <Pressable
        style={styles.backButton}
        onPress={() => router.replace("/(tabs)/dashboard")}
      >
        <Text style={styles.backText}>Back to Dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

function SummaryItem({ label, value, cyan, green, positive }) {
  let valueStyle = styles.white;

  if (cyan) valueStyle = styles.cyan;
  if (green) valueStyle = styles.green;
  if (positive !== undefined) valueStyle = positive ? styles.green : styles.red;

  return (
    <View style={styles.summaryItem}>
      <Text style={styles.small}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
}

function money(v) {
  return Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 120 },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "flex-start"
  },
  title: { color: "white", fontSize: 32, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 8, lineHeight: 21 },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardText: { color: "#67e8f9", fontWeight: "900" },
  summary: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    padding: 18,
    borderRadius: 20,
    borderColor: "#1e293b",
    borderWidth: 1,
    gap: 12
  },
  summaryItem: {
    backgroundColor: "#020617",
    padding: 14,
    borderRadius: 14,
    borderColor: "#1e293b",
    borderWidth: 1
  },
  card: {
    marginTop: 16,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    padding: 18,
    borderRadius: 20
  },
  cardTitle: { color: "#67e8f9", fontSize: 18, fontWeight: "900" },
  body: { color: "#cbd5e1", marginTop: 10, lineHeight: 21 },
  small: { color: "#94a3b8", marginTop: 4 },
  white: { color: "white", fontWeight: "900", marginTop: 6 },
  cyan: { color: "#67e8f9", fontWeight: "900", marginTop: 6 },
  green: { color: "#86efac", fontWeight: "900", marginTop: 6 },
  red: { color: "#fca5a5", fontWeight: "900", marginTop: 6 },
  snapshotRow: {
    marginTop: 12,
    paddingVertical: 14,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  snapshotDate: { color: "white", fontWeight: "900" },
  backButton: {
    marginTop: 20,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18,
    borderColor: "#334155",
    borderWidth: 1
  },
  backText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" }
});