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
  buildBrokerReconciliationInsight
} from "../src/features/broker-sync/brokerReconciliationInsightService";

export default function BrokerReconciliationInsight() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    insight,
    setInsight
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    loadInsight();
  }, []);

  async function loadInsight() {
    try {
      setLoading(true);
      setError("");

      const result =
        await buildBrokerReconciliationInsight();

      setInsight(
        result
      );
    } catch (err) {
      console.error(
        "Unable to build broker reconciliation insight:",
        err
      );

      setError(
        err?.message ||
          "Coach G could not analyze the broker reconciliation."
      );

      setInsight(null);
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
          Coach G is interpreting
          the reconciliation...
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
        Coach G Reconciliation Insight
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Understand why the broker
        portfolio differs before
        taking any action.
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

      {insight ? (
        <>
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
                styles.coachHeadline
              }
            >
              {
                insight?.coachG
                  ?.headline
              }
            </Text>

            <Text
              style={
                styles.coachBody
              }
            >
              {
                insight?.coachG
                  ?.explanation
              }
            </Text>
          </View>

          <View
            style={
              styles.classificationCard
            }
          >
            <Text
              style={
                styles.classificationLabel
              }
            >
              CLASSIFICATION
            </Text>

            <Text
              style={
                styles.classificationValue
              }
            >
              {
                insight.classification
              }
            </Text>
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
              Reconciliation Summary
            </Text>

            <Row
              label="Matched"
              value={
                insight
                  ?.reconciliation
                  ?.summary
                  ?.matched ||
                0
              }
            />

            <Row
              label="Mismatched"
              value={
                insight
                  ?.reconciliation
                  ?.summary
                  ?.mismatched ||
                0
              }
            />

            <Row
              label="Missing at Broker"
              value={
                insight
                  ?.reconciliation
                  ?.summary
                  ?.missingAtBroker ||
                0
              }
            />

            <Row
              label="Extra at Broker"
              value={
                insight
                  ?.reconciliation
                  ?.summary
                  ?.extraAtBroker ||
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
              Issues Found
            </Text>

            {(
              insight.issues ||
              []
            ).length ? (
              (
                insight.issues ||
                []
              ).map(
                (
                  issue,
                  index
                ) => (
                  <View
                    key={`${issue.type}-${index}`}
                    style={
                      styles.issueRow
                    }
                  >
                    <Text
                      style={
                        styles.issueType
                      }
                    >
                      {
                        issue.type
                      }
                    </Text>

                    <Text
                      style={
                        styles.issueMessage
                      }
                    >
                      {
                        issue.message
                      }
                    </Text>
                  </View>
                )
              )
            ) : (
              <Text
                style={
                  styles.emptyText
                }
              >
                No reconciliation
                issues were detected.
              </Text>
            )}
          </View>

          <View
            style={
              styles.focusCard
            }
          >
            <Text
              style={
                styles.focusTitle
              }
            >
              Coach G's Next Action
            </Text>

            <Text
              style={
                styles.focusText
              }
            >
              {
                insight?.coachG
                  ?.nextAction
              }
            </Text>
          </View>

          <View
            style={
              styles.cautionCard
            }
          >
            <Text
              style={
                styles.cautionTitle
              }
            >
              Read-Only Protection
            </Text>

            <Text
              style={
                styles.cautionText
              }
            >
              {
                insight?.coachG
                  ?.caution
              }
            </Text>
          </View>
        </>
      ) : null}

      <Pressable
        style={
          styles.primaryButton
        }
        onPress={
          loadInsight
        }
      >
        <Text
          style={
            styles.primaryButtonText
          }
        >
          Refresh Coach G Insight
        </Text>
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
          Open Reconciliation
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
      fontWeight: "900",
      fontSize: 12
    },

    coachHeadline: {
      color: "white",
      fontSize: 20,
      fontWeight: "900",
      lineHeight: 28,
      marginTop: 8
    },

    coachBody: {
      color: "#cbd5e1",
      lineHeight: 22,
      marginTop: 10
    },

    classificationCard: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      marginTop: 16
    },

    classificationLabel: {
      color: "#94a3b8",
      fontSize: 12,
      fontWeight: "900"
    },

    classificationValue: {
      color: "#facc15",
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

    issueRow: {
      borderBottomWidth: 1,
      borderBottomColor:
        "#1e293b",
      paddingVertical: 14
    },

    issueType: {
      color: "#facc15",
      fontWeight: "900",
      fontSize: 12
    },

    issueMessage: {
      color: "#cbd5e1",
      lineHeight: 21,
      marginTop: 6
    },

    focusCard: {
      backgroundColor:
        "rgba(34,197,94,.10)",
      borderColor:
        "rgba(34,197,94,.35)",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 16
    },

    focusTitle: {
      color: "#86efac",
      fontSize: 18,
      fontWeight: "900"
    },

    focusText: {
      color: "#bbf7d0",
      lineHeight: 22,
      marginTop: 10
    },

    cautionCard: {
      backgroundColor:
        "rgba(245,158,11,.10)",
      borderColor:
        "rgba(245,158,11,.35)",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18,
      marginTop: 16
    },

    cautionTitle: {
      color: "#fde68a",
      fontSize: 18,
      fontWeight: "900"
    },

    cautionText: {
      color: "#fef3c7",
      lineHeight: 22,
      marginTop: 10
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
    },

    emptyText: {
      color: "#94a3b8",
      lineHeight: 22,
      marginTop: 10
    }
  });