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
import { getCurrentSession } from "../src/auth/authStore";
import {
  getIntelligenceHome,
  markNotificationRead,
  markAllNotificationsRead
} from "../src/features/intelligence/api/intelligenceApi";

export default function IntelligenceCenter() {
  const [loading, setLoading] = useState(true);
  const [coach, setCoach] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [token, setToken] = useState("");

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    try {
      setLoading(true);

      const session = await getCurrentSession();
      const authToken = session?.token || session?.accessToken;

      setToken(authToken);

      const intelligenceResult = await getIntelligenceHome(authToken);

	setCoach(intelligenceResult);
	setNotifications(intelligenceResult?.notifications?.items || []);
	setSummary(intelligenceResult?.notifications?.summary || null);

    } catch (error) {
      console.log("Intelligence Center error:", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRead(item) {
    try {
      if (!item?.id || item.read) return;
      await markNotificationRead(token, item.id);
      await load();
    } catch (error) {
      console.log("Read notification error:", error.message);
    }
  }

async function handleReadAll() {
  try {
    if (!token) return;
    await markAllNotificationsRead(token);
    await load();
  } catch (error) {
    console.log("Mark all read error:", error.message);
  }
}

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#67e8f9" />
        <Text style={styles.loading}>Loading Intelligence Center...</Text>
      </View>
    );
  }

  const card = coach?.dashboardCard;
  const intelligence = coach;
  const dividends = coach?.dividends;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable style={styles.icon} onPress={() => router.back()}>
          <Text style={styles.iconText}>‹</Text>
        </Pressable>

        <Text style={styles.title}>Intelligence Center</Text>

        <Pressable style={styles.icon} onPress={load}>
          <Text style={styles.iconText}>↻</Text>
        </Pressable>
      </View>

      {card ? (
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>Coach G</Text>
          <Text style={styles.status}>{card.label}</Text>
          <Text style={styles.headline}>{card.headline}</Text>
          <Text style={styles.body}>{card.summary}</Text>

          <View style={styles.confidenceRow}>
            <Text style={styles.small}>Confidence</Text>
            <Text style={styles.green}>{card.confidence}%</Text>
          </View>

          {card.mainAction ? (
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push(card.mainAction.route)}
            >
              <Text style={styles.primaryText}>{card.mainAction.label}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {dividends ? (
  <View style={styles.dividendCard}>
    <Text style={styles.kicker}>Dividend Intelligence</Text>

    <Text style={styles.dividendAmount}>
      KES {money(dividends.projectedAnnualDividend)}
    </Text>

    <Text style={styles.small}>Projected Annual Dividend</Text>

    <View style={styles.summaryGrid}>
      <MiniStat
        label="Monthly"
        value={`KES ${money(dividends.projectedMonthlyDividend)}`}
      />
      <MiniStat
        label="Coverage"
        value={`${dividends.dividendCoveragePct}%`}
      />
    </View>

    <View style={styles.summaryGrid}>
      <MiniStat
        label="Best"
        value={dividends.bestDividendHolding?.symbol || "-"}
      />
      <MiniStat
        label="Next"
        value={dividends.bestDividendHolding?.nextDate || "-"}
      />
    </View>

    <Text style={styles.body}>{dividends.narrative}</Text>
  </View>
) : null}

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
  <Text style={styles.cardTitle}>Notification Summary</Text>

  {summary?.unread > 0 ? (
    <Pressable onPress={handleReadAll}>
      <Text style={styles.readAllText}>Mark all read</Text>
    </Pressable>
  ) : null}
</View>
        <View style={styles.summaryGrid}>
          <MiniStat label="Total" value={summary?.total || 0} />
          <MiniStat label="Unread" value={summary?.unread || 0} />
          <MiniStat label="High" value={summary?.high || 0} />
          <MiniStat label="Low" value={summary?.low || 0} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alerts</Text>

        <Pressable style={styles.primaryButton} onPress={() => router.push("/(tabs)/news")}>
          <Text style={styles.primaryText}>Open Portfolio-Aware News Alerts</Text>
        </Pressable>

        {notifications.length ? (
          notifications.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.notification, item.read && styles.readNotification]}
              onPress={() => handleRead(item)}
            >
              <View style={styles.notificationTop}>
                <Text style={styles.severity}>{item.severity}</Text>
                <Text style={styles.readFlag}>{item.read ? "Read" : "Unread"}</Text>
              </View>

              <Text style={styles.notificationTitle}>{item.title}</Text>
              <Text style={styles.body}>{item.message}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.small}>No notifications yet.</Text>
        )}
      </View>

      {intelligence?.nextBestActions?.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Best Actions</Text>

          {intelligence.nextBestActions.map((action) => (
            <Pressable
              key={action.action}
              style={styles.actionButton}
              onPress={() => router.push(action.route)}
            >
              <Text style={styles.actionText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString("en-KE", {
    maximumFractionDigits: 0
  });
}

function MiniStat({ label, value }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.small}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },
  content: {
    padding: 18,
    paddingBottom: 40
  },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center"
  },
  loading: {
    color: "#e5e7eb",
    marginTop: 12
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center"
  },
  iconText: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "900"
  },
  title: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900"
  },
  heroCard: {
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155"
  },
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e293b"
  },
  kicker: {
    color: "#67e8f9",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  status: {
    color: "#facc15",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 6
  },
  headline: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6
  },
  body: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  small: {
    color: "#94a3b8",
    fontSize: 12
  },
  green: {
    color: "#22c55e",
    fontWeight: "900"
  },
  confidenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#22c55e",
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center"
  },
  primaryText: {
    color: "#052e16",
    fontWeight: "900"
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10
  },
  miniStat: {
    flex: 1,
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 12,
    alignItems: "center"
  },
  miniValue: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900"
  },
  notification: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155"
  },
  readNotification: {
    opacity: 0.55
  },
  notificationTop: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  severity: {
    color: "#f97316",
    fontSize: 12,
    fontWeight: "900"
  },
  readFlag: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700"
  },
  notificationTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 6
  },
  actionButton: {
    backgroundColor: "#020617",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155"
  },
  actionText: {
    color: "#e5e7eb",
    fontWeight: "900"
  },
sectionHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 12
},
readAllText: {
  color: "#67e8f9",
  fontSize: 12,
  fontWeight: "900"
},

dividendCard: {
  backgroundColor: "#133A22",
  borderRadius: 24,
  padding: 18,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#22c55e"
},
dividendAmount: {
  color: "#4ade80",
  fontSize: 30,
  fontWeight: "900",
  marginTop: 8
}
});
