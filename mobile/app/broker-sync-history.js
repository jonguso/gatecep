import React, {
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  router
} from "expo-router";

import {
  loadBrokerSyncAuditHistory
} from "../src/features/broker-sync/brokerSyncAuditStore";

export default function BrokerSyncHistory() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    history,
    setHistory
  ] = useState([]);

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      setLoading(true);
      setError("");

      const result =
        await loadBrokerSyncAuditHistory();

      setHistory(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (err) {
      console.error(
        "Unable to load broker sync history:",
        err
      );

      setError(
        err?.message ||
          "Unable to load broker synchronization history."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#67e8f9"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading broker sync history...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
      }
    >
      <Text
        style={styles.eyebrow}
      >
        PC-009
      </Text>

      <Text
        style={styles.title}
      >
        Broker Sync History
      </Text>

      <Text
        style={styles.subtitle}
      >
        Review previous synchronization
        and reconciliation events.
      </Text>

      {error ? (
        <View
          style={styles.errorCard}
        >
          <Text
            style={styles.errorText}
          >
            {error}
          </Text>
        </View>
      ) : null}

      <View
        style={styles.summaryCard}
      >
        <Text
          style={styles.cardTitle}
        >
          Audit Summary
        </Text>

        <Row
          label="Total Events"
          value={history.length}
        />

        <Row
          label="Latest Status"
          value={
            history[0]?.classification ||
            history[0]?.status ||
            "None"
          }
        />

        <Row
          label="Latest Broker"
          value={
            history[0]?.broker ||
            "None"
          }
        />
      </View>

      {history.length ? (
        history.map((event) => (
          <View
            key={event.id}
            style={styles.eventCard}
          >
            <View
              style={styles.eventHeader}
            >
              <View>
                <Text
                  style={styles.eventType}
                >
                  {event.type}
                </Text>

                <Text
                  style={styles.eventDate}
                >
                  {formatDate(
                    event.createdAt
                  )}
                </Text>
              </View>

              <Text
                style={styles.eventStatus}
              >
                {event.classification ||
                  event.status ||
                  "UNKNOWN"}
              </Text>
            </View>

            <Row
              label="Broker"
              value={
                event.broker ||
                "Unknown"
              }
            />

            <Row
              label="GateCEP Total"
              value={`KES ${money(
                event.gatecepTotal
              )}`}
            />

            <Row
              label="Broker Total"
              value={`KES ${money(
                event.brokerTotal
              )}`}
            />

            <Row
              label="Difference"
              value={`KES ${money(
                event.difference
              )}`}
            />

            <Row
              label="Matched"
              value={
                event.matched || 0
              }
            />

            <Row
              label="Mismatched"
              value={
                event.mismatched || 0
              }
            />

            {event.issues?.length ? (
              <View
                style={styles.issueBlock}
              >
                <Text
                  style={styles.issueTitle}
                >
                  Issues
                </Text>

                {event.issues.map(
                  (issue, index) => (
                    <Text
                      key={`${event.id}-${index}`}
                      style={styles.issueText}
                    >
                      • {issue.message}
                    </Text>
                  )
                )}
              </View>
            ) : null}
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            No Audit Events Yet
          </Text>

          <Text style={styles.emptyText}>
            Run a broker reconciliation
            insight to create the first
            audit record.
          </Text>
        </View>
      )}

      <Pressable
        style={styles.primaryButton}
        onPress={loadHistory}
      >
        <Text
          style={
            styles.primaryButtonText
          }
        >
          Refresh History
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/broker-reconciliation-insight"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Coach G Insight
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.replace(
            "/(tabs)/dashboard"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Back to Dashboard
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({
  label,
  value
}) {
  return (
    <View style={styles.row}>
      <Text
        style={styles.rowLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.rowValue}
      >
        {String(
          value ?? "N/A"
        )}
      </Text>
    </View>
  );
}

function money(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleString(
    "en-US"
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#020617"
    },

    content: {
      padding: 22,
      paddingTop: 70,
      paddingBottom: 110
    },

    center: {
      flex: 1,
      backgroundColor:
        "#020617",
      alignItems:
        "center",
      justifyContent:
        "center"
    },

    loadingText: {
      color: "#94a3b8",
      marginTop: 14
    },

    eyebrow: {
      color: "#c084fc",
      fontSize: 13,
      fontWeight: "900"
    },

    title: {
      color: "white",
      fontSize: 30,
      fontWeight: "900",
      marginTop: 8
    },

    subtitle: {
      color: "#94a3b8",
      lineHeight: 22,
      marginTop: 8,
      marginBottom: 20
    },

    summaryCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18
    },

    cardTitle: {
      color: "#67e8f9",
      fontSize: 18,
      fontWeight: "900"
    },

    eventCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 16
    },

    eventHeader: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      gap: 16
    },

    eventType: {
      color: "white",
      fontWeight: "900"
    },

    eventDate: {
      color: "#64748b",
      fontSize: 12,
      marginTop: 4
    },

    eventStatus: {
      color: "#facc15",
      fontWeight: "900"
    },

    row: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      gap: 16,
      marginTop: 14
    },

    rowLabel: {
      color: "#94a3b8",
      flex: 1
    },

    rowValue: {
      color: "white",
      fontWeight: "900",
      textAlign: "right",
      flex: 1
    },

    issueBlock: {
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        "#1e293b"
    },

    issueTitle: {
      color: "#facc15",
      fontWeight: "900"
    },

    issueText: {
      color: "#cbd5e1",
      lineHeight: 21,
      marginTop: 6
    },

    emptyCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18
    },

    emptyTitle: {
      color: "#67e8f9",
      fontSize: 18,
      fontWeight: "900"
    },

    emptyText: {
      color: "#94a3b8",
      lineHeight: 22,
      marginTop: 8
    },

    primaryButton: {
      backgroundColor:
        "#9333ea",
      padding: 17,
      borderRadius: 18,
      marginTop: 22
    },

    primaryButtonText: {
      color: "white",
      fontWeight: "900",
      textAlign: "center"
    },

    secondaryButton: {
      backgroundColor:
        "#1e293b",
      padding: 17,
      borderRadius: 18,
      marginTop: 12
    },

    secondaryButtonText: {
      color: "#67e8f9",
      fontWeight: "900",
      textAlign: "center"
    },

    errorCard: {
      backgroundColor:
        "rgba(239,68,68,.10)",
      borderColor:
        "rgba(239,68,68,.35)",
      borderWidth: 1,
      borderRadius: 18,
      padding: 16
    },

    errorText: {
      color: "#fca5a5"
    }
  });