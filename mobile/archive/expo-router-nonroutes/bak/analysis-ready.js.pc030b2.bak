import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

import { userGetItem } from "../src/auth/userStorage";

export default function AnalysisReady() {
  const [broker, setBroker] = useState(null);

  useEffect(() => {
    loadBroker();
  }, []);

  async function loadBroker() {
    const raw = await userGetItem("brokerProfile");

    if (raw) {
      setBroker(JSON.parse(raw));
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Coach G Analysis Ready</Text>

      <Text style={styles.subtitle}>
        Your broker profile and document workflow are ready. Coach G can now
        guide the next investment action.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Broker Profile</Text>
        <Text style={styles.cardText}>
          Broker: {broker?.broker || broker?.name || broker?.brokerName || "N/A"}
        </Text>
        <Text style={styles.cardText}>
          Client Number: {broker?.clientNumber || "Optional"}
        </Text>
        <Text style={styles.cardText}>
          CDS Number: {broker?.cdsNumber || "Optional"}
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Coach G Next Actions</Text>

        <Action label="Analyze portfolio concentration" status="READY" />
        <Action label="Check sector exposure" status="READY" />
        <Action label="Review document freshness" status="READY" />
        <Action label="Compare against investment goal" status="READY" />
        <Action label="Track historical recommendations" status="READY" />
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Advisory + Simulation</Text>
        <Text style={styles.noticeText}>
          Gatecep can guide recommendations, create trade baskets, and simulate
          orders. Real broker execution will come later through approved broker
          integrations.
        </Text>
      </View>

      <Pressable
        style={styles.primary}
        onPress={() => router.replace("/(tabs)/dashboard")}
      >
        <Text style={styles.primaryText}>Return to Dashboard</Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/coach-insights")}
      >
        <Text style={styles.secondaryText}>Open Coach G Insights</Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/portfolio-sync-center")}
      >
        <Text style={styles.secondaryText}>Open Portfolio Sync Center</Text>
      </Pressable>
    </ScrollView>
  );
}

function Action({ label, status }) {
  return (
    <View style={styles.action}>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionStatus}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },
  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 90
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
  card: {
    marginTop: 24,
    backgroundColor: "rgba(6, 182, 212, 0.10)",
    borderColor: "rgba(6, 182, 212, 0.35)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18
  },
  cardTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 17
  },
  cardText: {
    color: "#cbd5e1",
    marginTop: 8
  },
  summaryCard: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18
  },
  summaryTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 10
  },
  action: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    gap: 12
  },
  actionLabel: {
    color: "#cbd5e1",
    flex: 1
  },
  actionStatus: {
    color: "#86efac",
    fontWeight: "900",
    marginLeft: 10
  },
  notice: {
    marginTop: 22,
    backgroundColor: "rgba(245, 158, 11, 0.10)",
    borderColor: "rgba(245, 158, 11, 0.35)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18
  },
  noticeTitle: {
    color: "#fde68a",
    fontWeight: "900"
  },
  noticeText: {
    color: "#cbd5e1",
    marginTop: 8,
    lineHeight: 20
  },
  primary: {
    marginTop: 28,
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
  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  }
});