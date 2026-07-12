import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import { useAuth } from "../../src/features/auth/hooks/useAuth";
import ActiveUserBanner from "../../src/components/ActiveUserBanner";
import { APP_VERSION } from "../../src/version/versionRegistry";

import { getMarketIntelligenceHome } from "../../src/features/market/api/marketIntelligenceApi";
import { getCoachDashboard } from "../../src/features/coach/api/coachApi";
import { getUserBrokers } from "../../src/features/brokers/api/userBrokerApi";

export default function Dashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [marketIntel, setMarketIntel] = useState(null);
  const [coach, setCoach] = useState(null);
  const [brokers, setBrokers] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("");

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    try {
      setLoading(true);

      const [marketResult, coachResult, brokerResult] = await Promise.all([
        getMarketIntelligenceHome(),
        getCoachDashboard().catch(() => null),
        getUserBrokers().catch(() => ({ brokers: [] }))
      ]);

      setMarketIntel(marketResult);
      setCoach(coachResult);
      setBrokers(brokerResult?.brokers || []);
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.log("Dashboard load error:", error.message);
      setMarketIntel(null);
      setCoach(null);
    } finally {
      setLoading(false);
    }
  }

  const summary = marketIntel?.summary || {};
  const holdings = marketIntel?.holdings || [];
  const movers = marketIntel?.movers || [];

  const currentValue = Number(summary.totalValue || 0);
  const investedValue = Number(summary.investedValue || 0);
  const totalCash = Number(summary.totalCash || 0);
  const netWorth = Number(summary.netWorth || currentValue + totalCash);
  const totalGain = Number(summary.totalGain || 0);
  const totalGainPct = Number(summary.totalGainPct || 0);
  const dayChange = Number(summary.dayChange || 0);
  const holdingsCount = Number(summary.holdingsCount || holdings.length || 0);

  const goalTarget = 1000000;
  const goalProgress = goalTarget > 0 ? (netWorth / goalTarget) * 100 : 0;

  const coachMessage =
    marketIntel?.coach?.narrative ||
    coach?.coachMessage ||
    "Coach G is ready to guide your portfolio.";

  const portfolioScore = Number(
    coach?.scores?.portfolioScore ||
      (holdingsCount > 0 ? 78 : 0)
  );

  const sourceLabel = marketIntel?.marketFeed?.provider
    ? `MARKET_INTELLIGENCE • ${marketIntel.marketFeed.provider}`
    : "PRODUCTION_PORTFOLIO";

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#67e8f9" />
        <Text style={styles.body}>Coach G is loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.icon} onPress={() => router.push("/menu")}>
          <Text style={styles.iconText}>☰</Text>
        </Pressable>

        <Text style={styles.title}>Dashboard</Text>

        <Pressable
          style={styles.icon}
          onPress={() => router.push("/intelligence-center")}
        >
          <Text style={styles.iconText}>🔔</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Good {greeting()} {user?.username || user?.email || "Investor"}
      </Text>

      <Text style={styles.small}>Version {APP_VERSION}</Text>
      <Text style={styles.small}>Updated {lastUpdated}</Text>
      <Text style={styles.sourceText}>Source: {sourceLabel}</Text>

      <ActiveUserBanner />

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Net Worth</Text>
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
        <Metric label="Portfolio" value={`KES ${money(currentValue)}`} />
        <Metric label="Invested" value={`KES ${money(investedValue)}`} />
        <Metric label="Cash" value={`KES ${money(totalCash)}`} />
        <Metric label="Holdings" value={String(holdingsCount)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coach G Intelligence</Text>
        <Text style={styles.coachText}>{coachMessage}</Text>

        <View style={styles.scoreRow}>
          <Text style={styles.small}>Portfolio Score</Text>
          <Text style={styles.score}>{portfolioScore}/100</Text>
        </View>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(portfolioScore, 100)}%` }
            ]}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Goal Tracker</Text>
        <Text style={styles.goalValue}>KES {money(netWorth)}</Text>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(goalProgress, 100)}%` }
            ]}
          />
        </View>

        <Text style={styles.small}>
          Target KES {money(goalTarget)} • {goalProgress.toFixed(1)}% complete
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Broker Profile</Text>

        {brokers.length === 0 ? (
          <Text style={styles.body}>No broker linked yet.</Text>
        ) : (
          brokers.map((broker) => (
            <View key={broker.id || broker.broker} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{broker.broker}</Text>
              <Text style={styles.infoValue}>
                {broker.status || "ACTIVE"} • {broker.clientNumber || "N/A"}
              </Text>
            </View>
          ))
        )}

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push("/broker-profile")}
        >
          <Text style={styles.primaryButtonText}>Manage Broker</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top Movers Today</Text>

        {movers.length === 0 ? (
          <Text style={styles.body}>No movers yet.</Text>
        ) : (
          movers.slice(0, 5).map((item) => {
            const pct = Number(item.dayChangePct || item.changePct || 0);
            return (
              <View key={item.symbol} style={styles.marketRow}>
                <View>
                  <Text style={styles.symbol}>{item.symbol}</Text>
                  <Text style={styles.small}>{item.name || item.sector}</Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.value}>KES {money(item.livePrice)}</Text>
                  <Text style={pct >= 0 ? styles.green : styles.red}>
                    {pct >= 0 ? "+" : ""}
                    {pct.toFixed(2)}%
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.quickGrid}>
        <Quick title="Live Dashboard" route="/live-dashboard" />
        <Quick title="Portfolio" route="/portfolio-hub" />
        <Quick title="Markets" route="/(tabs)/markets" />
        <Quick title="Trading" route="/(tabs)/trading" />
        <Quick title="Profile" route="/my-profile" />
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

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
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
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center"
  },
  iconText: { color: "white", fontSize: 22 },
  title: { color: "white", fontSize: 34, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  small: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
  sourceText: {
    color: "#c084fc",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "900"
  },
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
    fontSize: 36,
    fontWeight: "900",
    marginTop: 8
  },
  green: { color: "#86efac", fontWeight: "900", marginTop: 5 },
  red: { color: "#fca5a5", fontWeight: "900", marginTop: 5 },
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
  coachText: {
    color: "white",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 26
  },
  scoreRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  score: { color: "#86efac", fontWeight: "900" },
  barTrack: {
    marginTop: 12,
    height: 12,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    overflow: "hidden"
  },
  barFill: {
    height: "100%",
    backgroundColor: "#9333ea",
    borderRadius: 8
  },
  goalValue: {
    color: "white",
    fontSize: 24,
    fontWeight: "900"
  },
  infoRow: {
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12
  },
  infoLabel: { color: "#94a3b8", fontSize: 12 },
  infoValue: { color: "white", fontWeight: "900", marginTop: 4 },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#9333ea",
    borderRadius: 16,
    padding: 14,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "900"
  },
  marketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12,
    gap: 12
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