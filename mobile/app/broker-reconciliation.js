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
  buildBrokerReconciliation
} from "../src/features/broker-sync/brokerReconciliationService";

export default function BrokerReconciliation() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    result,
    setResult
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    loadReconciliation();
  }, []);

  async function loadReconciliation() {
    try {
      setLoading(true);
      setError("");

      const data =
        await buildBrokerReconciliation();

      setResult(data);
    } catch (err) {
      console.error(
        "Unable to reconcile broker portfolio:",
        err
      );

      setError(
        err?.message ||
          "Unable to reconcile the broker portfolio."
      );

      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View
        style={
          styles.center
        }
      >
        <ActivityIndicator
          size="large"
          color="#67e8f9"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Reconciling broker
          holdings...
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
        Broker Reconciliation
      </Text>

      <Text
        style={styles.subtitle}
      >
        Compare GateCEP's portfolio
        record with the synchronized
        broker account.
      </Text>

      {error ? (
        <View
          style={
            styles.errorCard
          }
        >
          <Text
            style={
              styles.errorText
            }
          >
            {error}
          </Text>
        </View>
      ) : null}

      {result ? (
        <>
          <StatusCard
            status={
              result.status
            }
            message={
              result.message
            }
          />

          {result.realPortfolio &&
          result.brokerMirror ? (
            <>
              <View
                style={
                  styles.metricGrid
                }
              >
                <Metric
                  label="Matched"
                  value={
                    result.summary
                      .matched
                  }
                />

                <Metric
                  label="Mismatched"
                  value={
                    result.summary
                      .mismatched
                  }
                />

                <Metric
                  label="Missing at Broker"
                  value={
                    result.summary
                      .missingAtBroker
                  }
                />

                <Metric
                  label="Extra at Broker"
                  value={
                    result.summary
                      .extraAtBroker
                  }
                />
              </View>

              <View
                style={styles.card}
              >
                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  Value Reconciliation
                </Text>

                <Row
                  label="GateCEP Total"
                  value={`KES ${money(
                    result
                      .realPortfolio
                      .totalValue
                  )}`}
                />

                <Row
                  label="Broker Total"
                  value={`KES ${money(
                    result
                      .brokerMirror
                      .totalValue
                  )}`}
                />

                <Row
                  label="Difference"
                  value={`KES ${money(
                    result.summary
                      .totalDifference
                  )}`}
                />

                <Row
                  label="Cash Difference"
                  value={`KES ${money(
                    result.summary
                      .cashDifference
                  )}`}
                />
              </View>

              <View
                style={styles.card}
              >
                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  Holding Comparison
                </Text>

                {(
                  result.holdings ||
                  []
                ).map(
                  (item) => (
                    <HoldingComparison
                      key={
                        item.symbol
                      }
                      item={
                        item
                      }
                    />
                  )
                )}
              </View>
            </>
          ) : null}
        </>
      ) : null}

      <Pressable
        style={
          styles.primaryButton
        }
        onPress={
          loadReconciliation
        }
      >
        <Text
          style={
            styles.primaryButtonText
          }
        >
          Refresh Reconciliation
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/broker-sync"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Back to Broker Sync
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

function StatusCard({
  status,
  message
}) {
  const statusStyle =
    status === "MATCHED"
      ? styles.statusGood
      : status ===
        "PARTIAL_MATCH"
      ? styles.statusWarn
      : styles.statusBad;

  return (
    <View
      style={[
        styles.statusCard,
        statusStyle
      ]}
    >
      <Text
        style={
          styles.statusLabel
        }
      >
        RECONCILIATION STATUS
      </Text>

      <Text
        style={
          styles.statusTitle
        }
      >
        {status}
      </Text>

      <Text
        style={
          styles.statusText
        }
      >
        {message}
      </Text>
    </View>
  );
}

function HoldingComparison({
  item
}) {
  return (
    <View
      style={
        styles.holdingRow
      }
    >
      <View
        style={{ flex: 1 }}
      >
        <Text
          style={styles.symbol}
        >
          {item.symbol}
        </Text>

        <Text
          style={
            styles.holdingStatus
          }
        >
          {item.status}
        </Text>
      </View>

      <View
        style={
          styles.holdingColumn
        }
      >
        <Text
          style={
            styles.holdingLabel
          }
        >
          GateCEP
        </Text>

        <Text
          style={
            styles.holdingValue
          }
        >
          Qty{" "}
          {item.real
            ?.quantity ??
            0}
        </Text>
      </View>

      <View
        style={
          styles.holdingColumn
        }
      >
        <Text
          style={
            styles.holdingLabel
          }
        >
          Broker
        </Text>

        <Text
          style={
            styles.holdingValue
          }
        >
          Qty{" "}
          {item.broker
            ?.quantity ??
            0}
        </Text>
      </View>
    </View>
  );
}

function Metric({
  label,
  value
}) {
  return (
    <View
      style={styles.metric}
    >
      <Text
        style={
          styles.metricLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.metricValue
        }
      >
        {String(value)}
      </Text>
    </View>
  );
}

function Row({
  label,
  value
}) {
  return (
    <View
      style={styles.row}
    >
      <Text
        style={styles.rowLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.rowValue}
      >
        {String(value)}
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

    statusCard: {
      borderWidth: 1,
      borderRadius: 22,
      padding: 18
    },

    statusGood: {
      backgroundColor:
        "rgba(34,197,94,.10)",
      borderColor:
        "rgba(34,197,94,.35)"
    },

    statusWarn: {
      backgroundColor:
        "rgba(245,158,11,.10)",
      borderColor:
        "rgba(245,158,11,.35)"
    },

    statusBad: {
      backgroundColor:
        "rgba(239,68,68,.10)",
      borderColor:
        "rgba(239,68,68,.35)"
    },

    statusLabel: {
      color: "#94a3b8",
      fontSize: 12,
      fontWeight: "900"
    },

    statusTitle: {
      color: "white",
      fontSize: 22,
      fontWeight: "900",
      marginTop: 6
    },

    statusText: {
      color: "#cbd5e1",
      lineHeight: 21,
      marginTop: 8
    },

    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 18
    },

    metric: {
      width: "47%",
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 18,
      padding: 15
    },

    metricLabel: {
      color: "#94a3b8",
      fontSize: 12
    },

    metricValue: {
      color: "white",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 6
    },

    card: {
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

    holdingRow: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor:
        "#1e293b",
      paddingVertical: 14
    },

    symbol: {
      color: "white",
      fontWeight: "900"
    },

    holdingStatus: {
      color: "#67e8f9",
      fontSize: 11,
      marginTop: 4
    },

    holdingColumn: {
      minWidth: 100,
      alignItems: "flex-end"
    },

    holdingLabel: {
      color: "#64748b",
      fontSize: 11
    },

    holdingValue: {
      color: "#cbd5e1",
      fontWeight: "900",
      marginTop: 4
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
