import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import { getMarketSocket } from "../src/features/market/api/marketSocket";
import { getMarketIntelligenceHome } from "../src/features/market/api/marketIntelligenceApi";
import { getUserBrokers } from "../src/features/brokers/api/userBrokerApi";
import ActiveUserBanner from "../src/components/ActiveUserBanner";

export default function LiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [marketIntel, setMarketIntel] = useState(null);
  const [brokers, setBrokers] = useState([]);
  const [events, setEvents] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("");

  useFocusEffect(
    useCallback(() => {
      load();

      const socket = getMarketSocket();

      const refresh = () => {
        pushEvent("Market cache updated");
        load(false);
      };

      const portfolioUpdate = (payload) => {
        pushEvent("Portfolio updated");

        if (payload?.summary) {
          setMarketIntel((current) => ({
            ...(current || {}),
            summary: payload.summary,
            holdings: payload.holdings || current?.holdings || [],
            movers: payload.movers || current?.movers || [],
            marketFeed: payload.marketFeed || current?.marketFeed,
            coach: payload.coach || current?.coach,
            generatedAt: payload.generatedAt || new Date().toISOString()
          }));
        }
      };

      const orderUpdate = (payload) => {
        pushEvent(`Order ${payload?.status || "updated"}`);
      };

      socket.on("market-cache:updated", refresh);
      socket.on("portfolio:update", portfolioUpdate);
      socket.on("order:update", orderUpdate);

      return () => {
        socket.off("market-cache:updated", refresh);
        socket.off("portfolio:update", portfolioUpdate);
        socket.off("order:update", orderUpdate);
      };
    }, [])
  );

  async function load(showSpinner = true) {
    try {
      if (showSpinner) setLoading(true);

      const [marketResult, brokerResult] = await Promise.all([
        getMarketIntelligenceHome(),
        getUserBrokers().catch(() => ({ brokers: [] }))
      ]);

      setMarketIntel(marketResult);
      setBrokers(brokerResult?.brokers || []);
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.log("Live dashboard load error:", error.message);
    } finally {
      setLoading(false);
    }
  }

  function pushEvent(message) {
    setEvents((current) =>
      [
        {
          id: `${Date.now()}-${Math.random()}`,
          message,
          time: new Date().toLocaleTimeString()
        },
        ...current
      ].slice(0, 8)
    );
  }

  const summary = marketIntel?.summary || {};
  const holdings = marketIntel?.holdings || [];
  const movers = marketIntel?.movers || [];

  const netWorth = Number(summary.netWorth || 0);
  const totalValue = Number(summary.totalValue || 0);
  const totalCash = Number(summary.totalCash || 0);
  const dayChange = Number(summary.dayChange || 0);
  const totalGain = Number(summary.totalGain || 0);
  const totalGainPct = Number(summary.totalGainPct || 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#67e8f9" />
        <Text style={styles.body}>Opening Live Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Live Dashboard</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Real-time portfolio, market, broker, and order activity.
      </Text>

      <Text style={styles.small}>Updated {lastUpdated}</Text>

      <ActiveUserBanner />

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Live Net Worth</Text>
        <Text style={styles.heroValue}>KES {money(netWorth)}</Text>

        <Text style={totalGain >= 0 ? styles.green : styles.red}>
          {totalGain >= 0 ? "▲" : "▼"} KES {money(totalGain)} (
          {totalGainPct.toFixed(2)}%)
        </Text>

        <Text style={dayChange >= 0 ? styles.green : styles.red}>
          Today {dayChange >= 0 ? "+" : ""}KES {money(dayChange)}
        </Text>
      </View>

      <View style={styles.grid}>
        <Metric label="Portfolio" value={`KES ${money(totalValue)}`} />
        <Metric label="Cash" value={`KES ${money(totalCash)}`} />
        <Metric label="Holdings" value={String(holdings.length)} />
        <Metric
          label="Feed"
          value={marketIntel?.marketFeed?.provider || "UNKNOWN"}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Holdings</Text>

        {holdings.slice(0, 8).map((item) => (
          <View key={`${item.broker}-${item.symbol}`} style={styles.row}>
            <View>
              <Text style={styles.symbol}>{item.symbol}</Text>
              <Text style={styles.small}>{item.name || item.sector}</Text>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.value}>KES {money(item.marketValue)}</Text>
              <Text
                style={Number(item.gain || item.profitLoss || 0) >= 0 ? styles.green : styles.red}
              >
                KES {money(item.gain || item.profitLoss || 0)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top Movers</Text>

        {movers.length === 0 ? (
          <Text style={styles.body}>No live movers yet.</Text>
        ) : (
          movers.slice(0, 5).map((item) => (
            <View key={item.symbol} style={styles.row}>
              <View>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.small}>{item.name || item.sector}</Text>
              </View>

              <Text style={Number(item.dayChange || 0) >= 0 ? styles.green : styles.red}>
                {Number(item.dayChange || 0) >= 0 ? "+" : ""}KES{" "}
                {money(item.dayChange)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Broker Sync Status</Text>

        {brokers.length === 0 ? (
          <Text style={styles.body}>No broker connected.</Text>
        ) : (
          brokers.map((broker) => (
            <View key={broker.id || broker.broker} style={styles.row}>
              <View>
                <Text style={styles.symbol}>{broker.broker}</Text>
                <Text style={styles.small}>
                  Client {broker.clientNumber || "N/A"}
                </Text>
              </View>

              <Text style={styles.green}>{broker.status || "ACTIVE"}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Events</Text>

        {events.length === 0 ? (
          <Text style={styles.body}>
            Waiting for market, portfolio, or order updates...
          </Text>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <Text style={styles.body}>• {event.message}</Text>
              <Text style={styles.small}>{event.time}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.quickGrid}>
        <Quick title="Portfolio Hub" route="/portfolio-hub" />
        <Quick title="Command Center" route="/portfolio-command-center" />
        <Quick title="Trade" route="/trade" />
        <Quick title="Order Book" route="/order-book" />
      </View>
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

function Quick({ title, route }) {
  return (
    <Pressable style={styles.quickButton} onPress={() => router.push(route)}>
      <Text style={styles.quickText}>{title}</Text>
    </Pressable>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 120 },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: { color: "white", fontSize: 32, fontWeight: "900", flex: 1 },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  small: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardButtonText: { color: "#67e8f9", fontWeight: "900" },
  hero: {
    marginTop: 18,
    backgroundColor: "rgba(147,51,234,.16)",
    borderColor: "rgba(192,132,252,.35)",
    borderWidth: 1,
    borderRadius: 26,
    padding: 20
  },
  heroLabel: {
    color: "#c4b5fd",
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase"
  },
  heroValue: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 8
  },
  green: { color: "#86efac", fontWeight: "900", marginTop: 4 },
  red: { color: "#fca5a5", fontWeight: "900", marginTop: 4 },
  grid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metric: {
    width: "47%",
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14
  },
  metricLabel: { color: "#94a3b8", fontSize: 11 },
  metricValue: { color: "white", fontWeight: "900", marginTop: 8 },
  card: {
    marginTop: 18,
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12,
    gap: 12
  },
  eventRow: {
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 10
  },
  symbol: { color: "white", fontWeight: "900", fontSize: 16 },
  value: { color: "white", fontWeight: "900" },
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
  quickGrid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  quickButton: {
    width: "47%",
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16
  },
  quickText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  }
});