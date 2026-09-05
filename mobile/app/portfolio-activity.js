import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { ContainedPanel } from "../src/components/mobile/MobileUI";
import { loadCanonicalRealTransactionHistory } from "../src/features/wealth-journey/canonicalRealBehaviorHistoryService";
export default function PortfolioActivity() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  useFocusEffect(
  useCallback(() => {
    load();
  }, [])
);

  async function load() {
    setLoading(true);

    const uploadRaw = await AsyncStorage.getItem("gatecepLatestUpload");
    const statementRaw = await AsyncStorage.getItem("gatecepStatementSummary");
    const recommendationRaw = await AsyncStorage.getItem("gatecepRecommendationHistory");
    const transactions = await loadCanonicalRealTransactionHistory();

    const recommendations = recommendationRaw ? JSON.parse(recommendationRaw) : [];

    const nextEvents = [];

    if (uploadRaw) {
      const upload = JSON.parse(uploadRaw);
      nextEvents.push({
        type: "UPLOAD",
        title: "Portfolio Valuation Uploaded",
        subtitle: upload?.valuation?.fileName || "Confirmed portfolio import",
        amount: null,
        date: upload.uploadedAt || upload?.valuation?.uploadedAt || new Date().toISOString()
      });
    }

    if (statementRaw) {
      const statement = JSON.parse(statementRaw);
      nextEvents.push({
        type: "CASH",
        title: "Cash Statement Saved",
        subtitle: `${statement.broker || "Broker"} • KES ${money(statement.availableCash)}`,
        amount: Number(statement.availableCash || 0),
        date: statement.uploadedAt || new Date().toISOString()
      });
    }

    transactions.forEach((tx) => {
      nextEvents.push({
        type: String(tx.side || "EXECUTION").toUpperCase(),
        title: `${tx.symbol || "Security"} broker execution`,
        subtitle: `${tx.broker} • Ref ${tx.brokerReference} • ${tx.quantity} @ KES ${money(tx.price)}`,
        amount: Number(tx.value || Number(tx.quantity || 0) * Number(tx.price || 0)),
        date: tx.executionDate
      });
    });

    recommendations.forEach((r) => {
      nextEvents.push({
        type: "COACH",
        title: "Coach G Strategy Saved",
        subtitle: `${r.goal || "Goal"} • ${r.scenario || "Scenario"} • KES ${money(r.amount)}`,
        amount: null,
        date: r.savedAt || new Date().toISOString()
      });
    });

    nextEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

    setEvents(nextEvents);
    setLoading(false);
  }

  const totals = useMemo(() => {
    const buys = events
      .filter((e) => e.type === "BUY")
      .reduce((sum, e) => sum + Math.abs(Number(e.amount || 0)), 0);

    const sells = events
      .filter((e) => e.type === "SELL")
      .reduce((sum, e) => sum + Math.abs(Number(e.amount || 0)), 0);

    return { buys, sells, count: events.length };
  }, [events]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#67e8f9" />
        <Text style={styles.body}>Loading activity...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Portfolio Activity</Text>
          <Text style={styles.subtitle}>
            Audit trail for verified uploads, cash updates, imports, and Coach G actions.
          </Text>
        </View>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardText}>Dashboard</Text>
        </Pressable>
      </View>

      <View style={styles.summary}>
        <SummaryItem label="Events" value={String(totals.count)} />
        <SummaryItem label="Buys" value={`KES ${money(totals.buys)}`} red />
        <SummaryItem label="Sells" value={`KES ${money(totals.sells)}`} green />
      </View>

      <ContainedPanel
        title={`Activity (${events.length})`}
        subtitle="Verified REAL portfolio events • scroll history"
        emptyMessage="No verified activity yet. Upload a portfolio, save a cash statement, synchronize broker evidence, or save a Coach G strategy. Practice trades remain in Practice only."
        testID="portfolio-activity-contained-panel"
      >
      {events.length ? (
        events.map((event, index) => (
          <View key={`${event.type}-${index}`} style={styles.eventCard}>
            <View style={styles.eventTop}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{event.type}</Text>
              </View>

              <Text style={styles.dateText}>{formatDate(event.date)}</Text>
            </View>

            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventSubtitle}>{event.subtitle}</Text>

            {event.amount !== null && event.amount !== undefined ? (
              <Text style={Number(event.amount) >= 0 ? styles.green : styles.red}>
                {Number(event.amount) >= 0 ? "+" : "-"} KES {money(Math.abs(event.amount))}
              </Text>
            ) : null}
          </View>
        ))
      ) : null}
      </ContainedPanel>

      <Pressable
        style={styles.backButton}
        onPress={() => router.replace("/(tabs)/dashboard")}
      >
        <Text style={styles.backText}>Back to Dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

function SummaryItem({ label, value, green, red }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.small}>{label}</Text>
      <Text style={green ? styles.green : red ? styles.red : styles.white}>
        {value}
      </Text>
    </View>
  );
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Unknown date";
  }
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
  eventCard: {
    marginTop: 16,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    padding: 18,
    borderRadius: 20
  },
  eventTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  badge: {
    backgroundColor: "rgba(6,182,212,.14)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999
  },
  badgeText: { color: "#67e8f9", fontSize: 11, fontWeight: "900" },
  dateText: { color: "#64748b", fontSize: 11 },
  eventTitle: { color: "white", fontWeight: "900", fontSize: 17, marginTop: 12 },
  eventSubtitle: { color: "#94a3b8", marginTop: 6, lineHeight: 19 },
  small: { color: "#94a3b8", marginTop: 4 },
  white: { color: "white", fontWeight: "900", marginTop: 6 },
  green: { color: "#86efac", fontWeight: "900", marginTop: 6 },
  red: { color: "#fca5a5", fontWeight: "900", marginTop: 6 },
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
