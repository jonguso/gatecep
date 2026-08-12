import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import {
  clearExecutionAuditTrail,
  loadExecutionAuditTrail
} from "../src/trade/executionAuditStore";

export default function ExecutionAudit() {
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const trail = await loadExecutionAuditTrail();
    setEvents(trail);
  }

  const filteredEvents = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return events;

    return events.filter((event) => {
      return (
        String(event.symbol || "").toLowerCase().includes(search) ||
        String(event.status || "").toLowerCase().includes(search) ||
        String(event.eventType || "").toLowerCase().includes(search) ||
        String(event.message || "").toLowerCase().includes(search) ||
        String(event.brokerName || "").toLowerCase().includes(search)
      );
    });
  }, [events, query]);

  async function clearTrail() {
    Alert.alert(
      "Clear Audit Trail",
      "Clear local execution audit history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearExecutionAuditTrail();
            setEvents([]);
          }
        }
      ]
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Execution Audit</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Permanent local audit trail for OMS lifecycle events, broker routing,
        confirmations, fills, cancellations, and errors.
      </Text>

      <ActiveUserBanner />

      <View style={styles.summaryCard}>
        <Metric label="Events" value={String(events.length)} />
        <Metric
          label="Visible"
          value={String(filteredEvents.length)}
        />
        <Metric
          label="Latest"
          value={events[0]?.status || "None"}
        />
        <Metric
          label="Mode"
          value="Local Audit"
        />
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search symbol, status, broker, message"
        placeholderTextColor="#64748b"
        style={styles.search}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Timeline</Text>

        {filteredEvents.length === 0 ? (
          <Text style={styles.body}>No audit events found yet.</Text>
        ) : (
          filteredEvents.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <View style={styles.dot} />

              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>
                  {event.eventType} • {event.status || "N/A"}
                </Text>

                <Text style={styles.eventMeta}>
                  {event.symbol || "N/A"} • {event.brokerName || "No broker"}
                </Text>

                <Text style={styles.body}>
                  {event.message || "No message"}
                </Text>

                <Text style={styles.time}>
                  {formatDate(event.createdAt)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/trading")}
      >
        <Text style={styles.secondaryText}>Open Queue Manager</Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/orders")}
      >
        <Text style={styles.secondaryText}>Open OMS Orders</Text>
      </Pressable>

      <Pressable style={styles.danger} onPress={clearTrail}>
        <Text style={styles.dangerText}>Clear Audit Trail</Text>
      </Pressable>
    </ScrollView>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{String(value || "N/A")}</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 110 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 32, fontWeight: "900", flex: 1 },
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
  summaryCard: {
    marginTop: 20,
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
  metricValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 6,
    fontSize: 13
  },
  search: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    color: "white",
    padding: 16,
    borderRadius: 16
  },
  card: {
    marginTop: 20,
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
  eventRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 14,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#9333ea",
    marginTop: 5
  },
  eventTitle: {
    color: "white",
    fontWeight: "900"
  },
  eventMeta: {
    color: "#67e8f9",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800"
  },
  body: { color: "#cbd5e1", marginTop: 6, lineHeight: 21 },
  time: {
    color: "#64748b",
    marginTop: 6,
    fontSize: 12
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
  },
  danger: {
    marginTop: 14,
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    padding: 16,
    borderRadius: 18
  },
  dangerText: {
    color: "#fca5a5",
    textAlign: "center",
    fontWeight: "900"
  }
});