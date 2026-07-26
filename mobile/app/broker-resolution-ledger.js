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
  loadBrokerResolutionLedger
} from "../src/features/broker-sync/brokerResolutionLedgerStore";

export default function BrokerResolutionLedger() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    ledger,
    setLedger
  ] = useState([]);

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    loadLedger();
  }, []);

  async function loadLedger() {
    try {
      setLoading(true);
      setError("");

      const result =
        await loadBrokerResolutionLedger();

      setLedger(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (err) {
      console.error(
        "Unable to load broker resolution ledger:",
        err
      );

      setError(
        err?.message ||
          "Unable to load the resolution ledger."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View
        style={styles.center}
      >
        <ActivityIndicator
          size="large"
          color="#67e8f9"
        />

        <Text
          style={styles.loadingText}
        >
          Loading resolution history...
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
        PC-011
      </Text>

      <Text
        style={styles.title}
      >
        Resolution Decision Ledger
      </Text>

      <Text
        style={styles.subtitle}
      >
        A historical record of how
        broker reconciliation differences
        were explained and resolved.
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
        style={styles.coachCard}
      >
        <Text
          style={styles.coachLabel}
        >
          COACH G
        </Text>

        <Text
          style={styles.coachText}
        >
          This ledger records decisions
          about discrepancies. It does not
          modify holdings, move cash, or
          submit broker instructions.
        </Text>
      </View>

      <View
        style={styles.summaryCard}
      >
        <Text
          style={styles.cardTitle}
        >
          Ledger Summary
        </Text>

        <Row
          label="Resolution Decisions"
          value={ledger.length}
        />

        <Row
          label="Latest Symbol"
          value={
            ledger[0]?.symbol ||
            "None"
          }
        />

        <Row
          label="Latest Resolution"
          value={
            ledger[0]
              ?.resolutionLabel ||
            "None"
          }
        />
      </View>

      {ledger.length ? (
        ledger.map(
          (event) => (
            <View
              key={event.id}
              style={styles.eventCard}
            >
              <View
                style={styles.eventHeader}
              >
                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={styles.symbol}
                  >
                    {event.symbol ||
                      "Account"}
                  </Text>

                  <Text
                    style={
                      styles.discrepancyType
                    }
                  >
                    {
                      event.discrepancyType
                    }
                  </Text>
                </View>

                <Text
                  style={
                    styles.status
                  }
                >
                  {event.status}
                </Text>
              </View>

              <Text
                style={
                  styles.resolutionTitle
                }
              >
                {
                  event.resolutionLabel
                }
              </Text>

              {event.previousResolutionCode ? (
                <Text
                  style={
                    styles.previousText
                  }
                >
                  Previous resolution:{" "}
                  {
                    event.previousResolutionCode
                  }
                </Text>
              ) : null}

              <View
                style={
                  styles.comparisonCard
                }
              >
                <Row
                  label="GateCEP Quantity"
                  value={
                    event.gatecepQuantity
                  }
                />

                <Row
                  label="Broker Quantity"
                  value={
                    event.brokerQuantity
                  }
                />

                <Row
                  label="GateCEP Value"
                  value={`KES ${money(
                    event.gatecepValue
                  )}`}
                />

                <Row
                  label="Broker Value"
                  value={`KES ${money(
                    event.brokerValue
                  )}`}
                />
              </View>

              <Text
                style={styles.date}
              >
                Recorded{" "}
                {formatDate(
                  event.createdAt
                )}
              </Text>

              <Text
                style={styles.source}
              >
                {
                  event.source ||
                  "BROKER_RECONCILIATION"
                }
              </Text>
            </View>
          )
        )
      ) : (
        <View
          style={styles.emptyCard}
        >
          <Text
            style={styles.emptyTitle}
          >
            No Resolution Decisions Yet
          </Text>

          <Text
            style={styles.emptyText}
          >
            Resolve a discrepancy in
            PC-010 and the decision will
            appear here.
          </Text>
        </View>
      )}

      <Pressable
        style={styles.primaryButton}
        onPress={loadLedger}
      >
        <Text
          style={
            styles.primaryButtonText
          }
        >
          Refresh Ledger
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/broker-resolution"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Reconciliation Resolution
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/broker-sync-history"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Broker Sync History
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
      alignItems: "center",
      justifyContent:
        "center",
      padding: 24
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

    coachCard: {
      backgroundColor:
        "rgba(147,51,234,.12)",
      borderColor:
        "rgba(147,51,234,.35)",
      borderWidth: 1,
      borderRadius: 22,
      padding: 18
    },

    coachLabel: {
      color: "#c084fc",
      fontWeight: "900"
    },

    coachText: {
      color: "white",
      lineHeight: 22,
      marginTop: 8
    },

    summaryCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 16
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
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 16
    },

    symbol: {
      color: "white",
      fontSize: 20,
      fontWeight: "900"
    },

    discrepancyType: {
      color: "#facc15",
      fontSize: 11,
      fontWeight: "900",
      marginTop: 4
    },

    status: {
      color: "#86efac",
      fontWeight: "900"
    },

    resolutionTitle: {
      color: "#67e8f9",
      fontWeight: "900",
      fontSize: 17,
      marginTop: 14
    },

    previousText: {
      color: "#94a3b8",
      marginTop: 6
    },

    comparisonCard: {
      backgroundColor:
        "#020617",
      borderRadius: 14,
      padding: 12,
      marginTop: 14
    },

    row: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      gap: 16,
      marginTop: 10
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

    date: {
      color: "#64748b",
      fontSize: 12,
      marginTop: 14
    },

    source: {
      color: "#c084fc",
      fontSize: 11,
      fontWeight: "900",
      marginTop: 5
    },

    emptyCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 16
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