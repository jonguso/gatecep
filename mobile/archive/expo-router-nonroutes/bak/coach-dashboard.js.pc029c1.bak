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

import { useAuth } from "../src/features/auth/hooks/useAuth";
import ActiveUserBanner from "../src/components/ActiveUserBanner";
import { getCoachDashboard } from "../src/features/coach/api/coachApi";

export default function CoachDashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [coach, setCoach] = useState(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    try {
      setLoading(true);
      const data = await getCoachDashboard();
      setCoach(data);
    } catch (error) {
      console.log("Coach dashboard load error:", error.message);
      setCoach(null);
    } finally {
      setLoading(false);
    }
  }

  const summary = coach?.summary || {};
  const scores = coach?.scores || {};
  const recommendations = coach?.recommendations || [];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#67e8f9" />
        <Text style={styles.body}>Coach G is reviewing your portfolio...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Coach G</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        {greeting(user?.username || user?.email || "Investor")}
      </Text>

      <ActiveUserBanner />

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Today&apos;s Advice</Text>
        <Text style={styles.heroText}>
          {coach?.coachMessage || "Coach G has reviewed your portfolio."}
        </Text>
      </View>

      <View style={styles.scoreCard}>
        <Text style={styles.cardTitle}>Portfolio Score</Text>
        <Text style={styles.score}>{Number(scores.portfolioScore || 0)}</Text>
        <Text style={styles.small}>out of 100</Text>
        <ScoreBar value={Number(scores.portfolioScore || 0)} />
      </View>

      <View style={styles.grid}>
        <Metric label="Net Worth" value={`KES ${money(summary.netWorth)}`} />
        <Metric label="Portfolio" value={`KES ${money(summary.totalValue)}`} />
        <Metric label="Cash" value={`KES ${money(summary.totalCash)}`} />
        <Metric label="Gain" value={`KES ${money(summary.totalGain)}`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Risk Snapshot</Text>

        <Info label="Largest Holding" value={`${coach?.largestHolding?.symbol || "N/A"} • ${Number(coach?.largestHolding?.weight || 0).toFixed(2)}%`} />
        <Info label="Largest Sector" value={`${coach?.largestSector?.sector || "N/A"} • ${Number(coach?.largestSector?.weight || 0).toFixed(2)}%`} />
        <Info label="Risk Score" value={`${Number(scores.riskScore || 0)}/100`} />
        <Info label="Cash Score" value={`${Number(scores.cashScore || 0)}/100`} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top Recommendations</Text>

        {recommendations.length === 0 ? (
          <Text style={styles.body}>No recommendations yet.</Text>
        ) : (
          recommendations.map((item, index) => (
            <View key={`${item.type}-${index}`} style={styles.recommendation}>
              <Text style={styles.recommendationTitle}>
                {badge(item.priority)} {item.title}
              </Text>
              <Text style={styles.body}>{item.message}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.quickGrid}>
        <Quick title="Portfolio" route="/portfolio-hub" />
        <Quick title="Performance" route="/performance" />
        <Quick title="Goals" route="/goals" />
        <Quick title="Activity" route="/transactions" />
      </View>
    </ScrollView>
  );
}

function greeting(name) {
  const hour = new Date().getHours();

  if (hour < 12) return `Good Morning ${name} ☀️`;
  if (hour < 17) return `Good Afternoon ${name} 🌤️`;
  return `Good Evening ${name} 🌙`;
}

function badge(priority) {
  if (priority === "HIGH") return "🔴";
  if (priority === "MEDIUM") return "🟡";
  return "🟢";
}

function ScoreBar({ value }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.min(value, 100)}%` }]} />
    </View>
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

function Info({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  dashboardButtonText: { color: "#67e8f9", fontWeight: "900" },
  hero: {
    marginTop: 18,
    backgroundColor: "rgba(147,51,234,.16)",
    borderColor: "rgba(192,132,252,.35)",
    borderWidth: 1,
    borderRadius: 24,
    padding: 20
  },
  heroLabel: { color: "#c4b5fd", fontWeight: "900", fontSize: 12 },
  heroText: { color: "white", fontSize: 19, fontWeight: "900", marginTop: 8, lineHeight: 28 },
  scoreCard: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    alignItems: "center"
  },
  card: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  cardTitle: { color: "#67e8f9", fontSize: 18, fontWeight: "900", marginBottom: 12 },
  score: { color: "white", fontSize: 52, fontWeight: "900" },
  small: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
  barTrack: {
    marginTop: 14,
    height: 12,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    overflow: "hidden",
    width: "100%"
  },
  barFill: {
    height: "100%",
    backgroundColor: "#9333ea",
    borderRadius: 8
  },
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
  infoRow: {
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12
  },
  infoLabel: { color: "#94a3b8", fontSize: 12 },
  infoValue: { color: "white", fontWeight: "900", marginTop: 4 },
  recommendation: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 12
  },
  recommendationTitle: { color: "white", fontWeight: "900", fontSize: 15 },
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
  quickText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" }
});