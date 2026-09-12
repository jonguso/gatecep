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
  loadBrokerMirror,
  loadBrokerSyncStatus,
  syncConnectedBrokerMirror
} from "../src/features/broker-sync/brokerSyncService";

export default function BrokerSync() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    syncing,
    setSyncing
  ] = useState(false);

  const [
    mirror,
    setMirror
  ] = useState(null);

  const [
    status,
    setStatus
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    loadState();
  }, []);

  async function loadState() {
    try {
      setLoading(true);
      setError("");

      const savedMirror = await loadBrokerMirror();
      const savedStatus = await loadBrokerSyncStatus();

      setMirror(
        savedMirror
      );

      setStatus(
        savedStatus
      );
    } catch (err) {
      console.error(
        "Unable to load broker sync state:",
        err
      );

      setError(
        err?.message ||
          "Unable to load broker synchronization state."
      );
    } finally {
      setLoading(false);
    }
  }

  async function runSync() {
    try {
      setSyncing(true);
      setError("");

      const synced =
        await syncConnectedBrokerMirror();

      setMirror(
        synced
      );

      await loadState();
    } catch (err) {
      console.error(
        "Broker synchronization failed:",
        err
      );

      setError(
        err?.message ||
          "Broker synchronization failed."
      );
    } finally {
      setSyncing(false);
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
          Loading broker connection...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        PC-009
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Broker Synchronization
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Load independent REAL broker evidence for read-only comparison with
        GateCEP's canonical REAL portfolio.
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

      <View
        style={
          styles.coachCard
        }
      >
        <Text
          style={
            styles.coachLabel
          }
        >
          COACH G
        </Text>

        <Text
          style={
            styles.coachText
          }
        >
          Broker synchronization lets me
          understand what you actually own.
          During this phase I can read and
          explain your portfolio, but I cannot
          place trades.
        </Text>
      </View>

      <View
        style={
          styles.statusCard
        }
      >
        <Text
          style={
            styles.cardTitle
          }
        >
          Connection Status
        </Text>

        <Row
          label="Status"
          value={
            status?.status ||
            "Not Synced"
          }
        />

        <Row
          label="Broker"
          value={
            status?.broker ||
            "None"
          }
        />

        <Row
          label="Last Sync"
          value={
            formatDate(
              status?.lastSyncAt
            )
          }
        />
      </View>

      {mirror ? (
        <>
          <View
            style={
              styles.metricGrid
            }
          >
            <Metric
              label="Total Value"
              value={`KES ${money(
                mirror.totalValue
              )}`}
            />

            <Metric
              label="Holdings Value"
              value={`KES ${money(
                mirror.holdingsValue
              )}`}
            />

            <Metric
              label="Cash"
              value={`KES ${money(
                mirror.cashBalance
              )}`}
            />

            <Metric
              label="Holdings"
              value={
                mirror.holdings
                  ?.length ||
                0
              }
            />
          </View>

          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              Broker Mirror
            </Text>

            <Row
              label="Broker"
              value={
                mirror.broker
              }
            />

            <Row
              label="Account"
              value={
                mirror.accountName
              }
            />

            <Row
              label="Currency"
              value={
                mirror.currency
              }
            />

            <Row
              label="Mode"
              value="Read Only"
            />
          </View>

          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.cardTitle
              }
            >
              Synced Holdings
            </Text>

            {(
              mirror.holdings ||
              []
            ).map(
              (holding) => (
                <View
                  key={
                    holding.symbol
                  }
                  style={
                    styles.holdingRow
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.symbol
                      }
                    >
                      {
                        holding.symbol
                      }
                    </Text>

                    <Text
                      style={
                        styles.holdingName
                      }
                    >
                      {
                        holding.name
                      }
                    </Text>

                    <Text
                      style={
                        styles.holdingMeta
                      }
                    >
                      Qty{" "}
                      {
                        holding.quantity
                      }
                    </Text>
                  </View>

                  <View
                    style={
                      styles.holdingRight
                    }
                  >
                    <Text
                      style={
                        styles.holdingValue
                      }
                    >
                      KES{" "}
                      {money(
                        holding.marketValue
                      )}
                    </Text>

                    <Text
                      style={
                        styles.holdingMeta
                      }
                    >
                      @ KES{" "}
                      {money(
                        holding.marketPrice
                      )}
                    </Text>
                  </View>
                </View>
              )
            )}
          </View>
        </>
      ) : (
        <View
          style={
            styles.emptyCard
          }
        >
          <Text
            style={
              styles.emptyTitle
            }
          >
            No Broker Mirror Yet
          </Text>

          <Text
            style={
              styles.emptyText
            }
          >
            A live broker API is not required. Upload the current broker
            portfolio valuation and cash evidence for REAL reconciliation.
          </Text>
        </View>
      )}

      <Pressable
        style={[
          styles.syncButton,
          syncing &&
            styles.disabled
        ]}
        disabled={
          syncing
        }
        onPress={
          runSync
        }
      >
        {syncing ? (
          <ActivityIndicator
            color="white"
          />
        ) : (
          <Text
            style={
              styles.syncButtonText
            }
          >
            {mirror
              ? "Sync Broker Again"
              : "Sync Connected Broker"}
          </Text>
        )}
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/broker-reconciliation"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Separate Practice Reconciliation
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push("/import-portfolio?mode=RECONCILE")}
      >
        <Text style={styles.secondaryButtonText}>
          Upload Current Portfolio Valuation
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push("/(tabs)/funds?mode=RECONCILE")}
      >
        <Text style={styles.secondaryButtonText}>
          Upload Current Cash / Ledger Statement
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/portfolio-sync-center"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Back to Portfolio Sync Center
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

function Metric({
  label,
  value
}) {
  return (
    <View
      style={
        styles.metric
      }
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
      style={
        styles.row
      }
    >
      <Text
        style={
          styles.rowLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.rowValue
        }
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
    return "Never";
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
      justifyContent:
        "center",
      alignItems:
        "center"
    },

    loadingText: {
      color:
        "#94a3b8",
      marginTop: 14
    },

    eyebrow: {
      color:
        "#c084fc",
      fontSize: 13,
      fontWeight: "900"
    },

    title: {
      color:
        "white",
      fontSize: 30,
      fontWeight: "900",
      marginTop: 8
    },

    subtitle: {
      color:
        "#94a3b8",
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
      color:
        "#c084fc",
      fontWeight: "900"
    },

    coachText: {
      color:
        "white",
      lineHeight: 23,
      marginTop: 8
    },

    statusCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 16
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
      color:
        "#67e8f9",
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
      color:
        "#94a3b8",
      flex: 1
    },

    rowValue: {
      color:
        "white",
      fontWeight: "900",
      textAlign: "right",
      flex: 1
    },

    metricGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
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
      color:
        "#94a3b8",
      fontSize: 12
    },

    metricValue: {
      color:
        "white",
      fontWeight: "900",
      fontSize: 18,
      marginTop: 6
    },

    holdingRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      borderBottomWidth: 1,
      borderBottomColor:
        "#1e293b",
      paddingVertical: 14
    },

    holdingRight: {
      alignItems:
        "flex-end"
    },

    symbol: {
      color:
        "white",
      fontWeight: "900"
    },

    holdingName: {
      color:
        "#94a3b8",
      marginTop: 3
    },

    holdingMeta: {
      color:
        "#64748b",
      marginTop: 3
    },

    holdingValue: {
      color:
        "#67e8f9",
      fontWeight: "900"
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
      color:
        "#67e8f9",
      fontWeight: "900",
      fontSize: 18
    },

    emptyText: {
      color:
        "#94a3b8",
      lineHeight: 22,
      marginTop: 8
    },

    syncButton: {
      backgroundColor:
        "#16a34a",
      padding: 17,
      borderRadius: 18,
      marginTop: 22
    },

    syncButtonText: {
      color:
        "white",
      fontWeight: "900",
      textAlign: "center"
    },

    disabled: {
      opacity: 0.6
    },

    secondaryButton: {
      backgroundColor:
        "#1e293b",
      padding: 17,
      borderRadius: 18,
      marginTop: 12
    },

    secondaryButtonText: {
      color:
        "#67e8f9",
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
      color:
        "#fca5a5"
    }
  });
