import React, { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import {
  userGetItem,
  userSetItem
} from "../src/auth/userStorage";

export default function RecommendationHistory() {
  const [history, setHistory] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  async function loadHistory() {
    const raw = await userGetItem("recommendationHistory");
    setHistory(raw ? JSON.parse(raw) : []);
  }

  async function markStatus(id, status) {
    const updated = history.map((item) =>
      item.id === id
        ? {
            ...item,
            status,
            reviewedAt: new Date().toISOString()
          }
        : item
    );

    setHistory(updated);
    await userSetItem("recommendationHistory", JSON.stringify(updated));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Recommendation History</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Review what Coach G recommended and track whether you followed it.
      </Text>

      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No recommendations yet</Text>

          <Text style={styles.emptyText}>
            After portfolio analysis, Coach G recommendations will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {history.map((item) => (
            <View key={item.id || item.savedAt} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {item.type || "Coach G Recommendation"}
                  </Text>

                  <Text style={styles.dateText}>
                    {formatDate(item.date || item.savedAt)}
                  </Text>
                </View>

                <Text style={styles.score}>
                  {item.score ? `${item.score}/100` : item.version || "Saved"}
                </Text>
              </View>

              <Text style={styles.summary}>
                {item.summary ||
                  `Goal: ${item.goal || "N/A"} • Scenario: ${
                    item.scenario || "N/A"
                  } • Amount: KES ${money(item.amount || 0)}`}
              </Text>

              {item.rating ? (
                <Text style={styles.rating}>Rating: {item.rating}</Text>
              ) : null}

              {item.sectorPlan?.length ? (
                <View style={styles.actionList}>
                  {item.sectorPlan.map((sector, index) => (
                    <Text key={`${sector.sector}-${index}`} style={styles.actionText}>
                      • {sector.sector}: {sector.weight}% / KES{" "}
                      {money(sector.amount)}
                    </Text>
                  ))}
                </View>
              ) : null}

              {item.actions?.length ? (
                <View style={styles.actionList}>
                  {item.actions.map((action, index) => (
                    <Text key={index} style={styles.actionText}>
                      • {action}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.statusBox}>
                <Text style={styles.statusLabel}>Status</Text>
                <Text style={styles.statusValue}>{item.status || "NEW"}</Text>
              </View>

              <View style={styles.buttons}>
                <Pressable
                  style={styles.followed}
                  onPress={() => markStatus(item.id, "FOLLOWED")}
                >
                  <Text style={styles.buttonText}>Followed</Text>
                </Pressable>

                <Pressable
                  style={styles.pending}
                  onPress={() => markStatus(item.id, "PENDING")}
                >
                  <Text style={styles.buttonText}>Pending</Text>
                </Pressable>

                <Pressable
                  style={styles.ignored}
                  onPress={() => markStatus(item.id, "IGNORED")}
                >
                  <Text style={styles.buttonText}>Ignored</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <Pressable
        style={styles.primary}
        onPress={() => router.replace("/(tabs)/dashboard")}
      >
        <Text style={styles.primaryText}>Back to Dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

function formatDate(value) {
  if (!value) return "Unknown date";

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: {
    color: "white",
    fontSize: 30,
    fontWeight: "900",
    flex: 1
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 10,
    lineHeight: 22
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
  emptyCard: {
    marginTop: 26,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20
  },
  emptyTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 18
  },
  emptyText: {
    color: "#94a3b8",
    marginTop: 10,
    lineHeight: 20
  },
  list: {
    marginTop: 24,
    gap: 18
  },
  card: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  cardTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 17
  },
  dateText: {
    color: "#94a3b8",
    marginTop: 5,
    fontSize: 12
  },
  score: {
    color: "#c084fc",
    fontWeight: "900"
  },
  summary: {
    color: "#cbd5e1",
    marginTop: 14,
    lineHeight: 20
  },
  rating: {
    color: "#86efac",
    marginTop: 10,
    fontWeight: "900"
  },
  actionList: {
    marginTop: 12
  },
  actionText: {
    color: "#cbd5e1",
    marginTop: 6,
    lineHeight: 19
  },
  statusBox: {
    marginTop: 16,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12
  },
  statusLabel: {
    color: "#94a3b8",
    fontSize: 12
  },
  statusValue: {
    color: "white",
    marginTop: 4,
    fontWeight: "900"
  },
  buttons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14
  },
  followed: {
    flex: 1,
    backgroundColor: "rgba(34,197,94,.18)",
    padding: 12,
    borderRadius: 14
  },
  pending: {
    flex: 1,
    backgroundColor: "rgba(245,158,11,.18)",
    padding: 12,
    borderRadius: 14
  },
  ignored: {
    flex: 1,
    backgroundColor: "rgba(239,68,68,.18)",
    padding: 12,
    borderRadius: 14
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 12
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
  }
});