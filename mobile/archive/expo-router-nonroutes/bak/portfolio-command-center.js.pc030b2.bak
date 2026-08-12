import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

const sections = [
  {
  title: "Live Dashboard",
  desc: "Real-time portfolio, cash, broker, market, and order updates.",
  route: "/live-dashboard"
  },
  {
    title: "My Holdings",
    desc: "View all portfolio positions, cost, value, and gain/loss.",
    route: "/holding-details"
  },
  {
    title: "Performance",
    desc: "Track portfolio value, snapshots, and health trend.",
    route: "/performance"
  },
  {
    title: "Activity",
    desc: "Review uploads, trades, cash updates, and Coach G actions.",
    route: "/portfolio-activity"
  },
  {
    title: "Coach Insights",
    desc: "Review portfolio health, risks, watchlist, and recommendations.",
    route: "/coach-insights"
  },
  {
    title: "Watchlist",
    desc: "Track stocks and Coach G signals.",
    route: "/watchlist"
  },
  {
    title: "Trade History",
    desc: "Review completed buy and sell activity.",
    route: "/trade-history"
  },
  {
    title: "Order Book",
    desc: "Review pending and historical orders.",
    route: "/order-book"
  },
  {
    title: "Trade",
    desc: "Buy or sell securities using available cash.",
    route: "/trade"
  },

{
  title: "Sync Center",
  desc: "Upload and sync holdings, cash, and transaction history.",
  route: "/portfolio-sync-center"
}

];

export default function PortfolioCommandCenter() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Portfolio Command Center</Text>

      <Text style={styles.subtitle}>
        Manage holdings, performance, activity, Coach G insights, and trading
        from one place.
      </Text>

      <View style={styles.grid}>
        {sections.map((item) => (
          <Pressable
            key={item.title}
            style={styles.card}
            onPress={() => router.push(item.route)}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.backButton}
        onPress={() => router.replace("/(tabs)/dashboard")}
      >
        <Text style={styles.backText}>Back to Dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },
  content: {
    padding: 20,
    paddingTop: 70,
    paddingBottom: 120
  },
  title: {
    color: "white",
    fontSize: 32,
    fontWeight: "900"
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 10,
    lineHeight: 22
  },
  grid: {
    marginTop: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  card: {
    width: "48%",
    minHeight: 130,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    justifyContent: "center"
  },
  cardTitle: {
    color: "#67e8f9",
    fontSize: 17,
    fontWeight: "900"
  },
  cardDesc: {
    color: "#94a3b8",
    marginTop: 8,
    lineHeight: 19,
    fontSize: 12
  },
  backButton: {
    marginTop: 24,
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16
  },
  backText: {
    color: "#67e8f9",
    fontWeight: "900",
    textAlign: "center"
  }
});