import React, { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import {
  buildAlerts,
  loadAlerts,
  saveAlerts
} from "../src/alerts/alertStore";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const existing = await loadAlerts();
    setAlerts(existing);
  }

  async function refreshAlerts() {
    const next = await buildAlerts();
    setAlerts(next);
  }

  async function markAllRead() {
    const next = alerts.map((item) => ({
      ...item,
      read: true
    }));

    setAlerts(next);
    await saveAlerts(next);
  }

  async function openAlert(item) {
    const next = alerts.map((alert) =>
      alert.id === item.id ? { ...alert, read: true } : alert
    );

    setAlerts(next);
    await saveAlerts(next);

    if (item.payload) {
      router.push({ pathname: "/investor-alert-review", params: { alert: JSON.stringify(item.payload) } });
    } else if (item.route) {
      router.push(item.route);
    }
  }

  const unread = alerts.filter((item) => !item.read).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Coach G Alerts</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Portfolio, market, calendar, and Coach G notifications.
      </Text>

      <ActiveUserBanner />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Unread Alerts</Text>
        <Text style={styles.summaryValue}>{unread}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.secondary} onPress={refreshAlerts}>
          <Text style={styles.secondaryText}>Refresh Alerts</Text>
        </Pressable>

        <Pressable style={styles.secondary} onPress={markAllRead}>
          <Text style={styles.secondaryText}>Mark All Read</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alert Feed</Text>

        {alerts.length === 0 ? (
          <Text style={styles.empty}>No alerts yet.</Text>
        ) : (
          alerts.map((item) => (
            <Pressable
              key={item.id}
              style={item.read ? styles.alertRead : styles.alertUnread}
              onPress={() => openAlert(item)}
            >
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>{iconFor(item.type)}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{item.title}</Text>
                <Text style={styles.alertMessage}>{item.message}</Text>
                <Text style={styles.alertMeta}>
                  {item.symbol} • {item.type}
                </Text>
              </View>

              {!item.read ? <View style={styles.dot} /> : null}
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function iconFor(type) {
  if (type === "CASH") return "💰";
  if (type === "PRICE_MOVE") return "📈";
  if (type === "CALENDAR") return "📅";
  if (type === "BEHAVIOR") return "🧠";
  return "🔔";
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { /* PC-030M20AV3P RESPONSIVE CALIBRATION */ width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 32, fontWeight: "900" },
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
    marginTop: 18,
    backgroundColor: "rgba(147,51,234,.14)",
    borderColor: "rgba(147,51,234,.38)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  summaryLabel: { color: "#cbd5e1" },
  summaryValue: {
    color: "white",
    fontSize: 38,
    fontWeight: "900",
    marginTop: 6
  },
  actions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10
  },
  secondary: {
    flex: 1,
    backgroundColor: "#1e293b",
    padding: 14,
    borderRadius: 16
  },
  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  },
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
  alertUnread: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(6,182,212,.10)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 12
  },
  alertRead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
    opacity: 0.75
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center"
  },
  icon: { fontSize: 20 },
  alertTitle: { color: "white", fontWeight: "900", fontSize: 15 },
  alertMessage: { color: "#cbd5e1", marginTop: 5, lineHeight: 18 },
  alertMeta: { color: "#94a3b8", marginTop: 6, fontSize: 12 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#67e8f9"
  },
  empty: { color: "#94a3b8", marginTop: 12 }
});
