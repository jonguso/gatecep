import React, {
  useEffect,
  useMemo,
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
  buildBehaviorAnalytics
} from "../src/features/behavior-analytics/behaviorAnalyticsService";

export default function BehaviorAnalytics() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    analytics,
    setAnalytics
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError("");

      const result =
        await buildBehaviorAnalytics();

      setAnalytics(
        result
      );
    } catch (err) {
      console.error(
        "Unable to build Behavior Analytics:",
        err
      );

      setError(
        err?.message ||
          "Coach G could not analyze your decision behavior."
      );

      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }

  const repeatedSymbols =
    useMemo(() => {
      return Array.isArray(
        analytics?.patterns
          ?.repeatedSymbols
      )
        ? analytics.patterns
            .repeatedSymbols
        : [];
    }, [analytics]);

  const confidenceTrend =
    useMemo(() => {
      return Array.isArray(
        analytics?.patterns
          ?.confidenceTrend
      )
        ? analytics.patterns
            .confidenceTrend
        : [];
    }, [analytics]);

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
          Coach G is analyzing your
          decision patterns...
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
        PC-008
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Behavior Analytics
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Understand the patterns behind
        your investment decisions—not
        just the portfolio outcome.
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

      {analytics ? (
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
                analytics?.coachG
                  ?.headline
              }
            </Text>
          </View>

          <View
            style={
              styles.metricGrid
            }
          >
            <Metric
              label="Process Score"
              value={`${analytics?.summary?.processScore || 0}%`}
            />

            <Metric
              label="Decisions"
              value={
                analytics?.summary
                  ?.totalDecisions ||
                0
              }
            />

            <Metric
              label="Avg Confidence"
              value={`${Number(
                analytics?.summary
                  ?.averageConfidence ||
                0
              ).toFixed(1)} / 5`}
            />

            <Metric
              label="Pending Reviews"
              value={
                analytics?.summary
                  ?.pendingDecisions ||
                0
              }
            />
          </View>

          <AnalyticsCard
            title="Decision Discipline"
            text={
              analytics?.coachG
                ?.disciplineMessage
            }
          />

          <AnalyticsCard
            title="Attention Concentration"
            text={
              analytics?.coachG
                ?.concentrationMessage
            }
          />

          <AnalyticsCard
            title="Confidence Pattern"
            text={
              analytics?.coachG
                ?.confidenceMessage
            }
          />

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
              Strongest Patterns
            </Text>

            <Row
              label="Most Reviewed"
              value={
                analytics?.summary
                  ?.mostReviewedSymbol
                  ?.value ||
                "None yet"
              }
            />

            <Row
              label="Most Common Reason"
              value={
                analytics?.summary
                  ?.mostCommonReason
                  ?.value ||
                "None yet"
              }
            />

            <Row
              label="Most Common Outcome"
              value={
                analytics?.summary
                  ?.mostCommonOutcome
                  ?.value ||
                "None yet"
              }
            />

            <Row
              label="Reviewed Decisions"
              value={
                analytics?.summary
                  ?.reviewedDecisions ||
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
              Repeated Securities
            </Text>

            {repeatedSymbols.length ? (
              repeatedSymbols.map(
                (item) => (
                  <View
                    key={
                      item.symbol
                    }
                    style={
                      styles.patternRow
                    }
                  >
                    <Text
                      style={
                        styles.patternSymbol
                      }
                    >
                      {
                        item.symbol
                      }
                    </Text>

                    <Text
                      style={
                        styles.patternValue
                      }
                    >
                      {
                        item.count
                      }{" "}
                      decisions
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
                No repeated security
                pattern has emerged
                yet.
              </Text>
            )}
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
              Confidence Trend
            </Text>

            {confidenceTrend.length ? (
              confidenceTrend.map(
                (item) => (
                  <View
                    key={
                      item.month
                    }
                    style={
                      styles.patternRow
                    }
                  >
                    <Text
                      style={
                        styles.patternSymbol
                      }
                    >
                      {
                        item.month
                      }
                    </Text>

                    <Text
                      style={
                        styles.patternValue
                      }
                    >
                      {Number(
                        item.averageConfidence
                      ).toFixed(
                        1
                      )}{" "}
                      / 5
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
                No confidence trend is
                available yet.
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
              Coach G's Next
              Behavioral Focus
            </Text>

            <Text
              style={
                styles.focusText
              }
            >
              {
                analytics?.coachG
                  ?.nextFocus
              }
            </Text>
          </View>
        </>
      ) : null}

      <Pressable
        style={
          styles.refreshButton
        }
        onPress={
          loadAnalytics
        }
      >
        <Text
          style={
            styles.refreshButtonText
          }
        >
          Refresh Behavior Analytics
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/investor-timeline"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Investor Timeline
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

function AnalyticsCard({
  title,
  text
}) {
  return (
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
        {title}
      </Text>

      <Text
        style={
          styles.bodyText
        }
      >
        {text}
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
      color:
        "#94a3b8",
      marginTop: 14
    },

    eyebrow: {
      color:
        "#c084fc",
      fontSize: 13,
      fontWeight:
        "900",
      letterSpacing:
        1.2
    },

    title: {
      color:
        "white",
      fontSize:
        30,
      fontWeight:
        "900",
      marginTop:
        8
    },

    subtitle: {
      color:
        "#94a3b8",
      lineHeight:
        22,
      marginTop:
        8,
      marginBottom:
        20
    },

    coachCard: {
      backgroundColor:
        "rgba(147,51,234,.12)",
      borderColor:
        "rgba(147,51,234,.35)",
      borderWidth:
        1,
      borderRadius:
        22,
      padding:
        18
    },

    coachLabel: {
      color:
        "#c084fc",
      fontSize:
        12,
      fontWeight:
        "900"
    },

    coachHeadline: {
      color:
        "white",
      fontSize:
        20,
      fontWeight:
        "900",
      lineHeight:
        28,
      marginTop:
        8
    },

    metricGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap:
        10,
      marginTop:
        18
    },

    metric: {
      width:
        "47%",
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth:
        1,
      borderRadius:
        18,
      padding:
        15
    },

    metricLabel: {
      color:
        "#94a3b8",
      fontSize:
        12
    },

    metricValue: {
      color:
        "white",
      fontSize:
        20,
      fontWeight:
        "900",
      marginTop:
        6
    },

    card: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth:
        1,
      borderRadius:
        20,
      padding:
        18,
      marginTop:
        16
    },

    cardTitle: {
      color:
        "#67e8f9",
      fontSize:
        18,
      fontWeight:
        "900"
    },

    bodyText: {
      color:
        "#cbd5e1",
      lineHeight:
        22,
      marginTop:
        10
    },

    row: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      gap:
        16,
      marginTop:
        14
    },

    rowLabel: {
      color:
        "#94a3b8",
      flex:
        1
    },

    rowValue: {
      color:
        "white",
      fontWeight:
        "900",
      textAlign:
        "right",
      flex:
        1
    },

    patternRow: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
      paddingVertical:
        12,
      borderBottomWidth:
        1,
      borderBottomColor:
        "#1e293b"
    },

    patternSymbol: {
      color:
        "white",
      fontWeight:
        "900"
    },

    patternValue: {
      color:
        "#67e8f9",
      fontWeight:
        "900"
    },

    focusCard: {
      backgroundColor:
        "rgba(34,197,94,.10)",
      borderColor:
        "rgba(34,197,94,.35)",
      borderWidth:
        1,
      borderRadius:
        20,
      padding:
        18,
      marginTop:
        16
    },

    focusTitle: {
      color:
        "#86efac",
      fontSize:
        18,
      fontWeight:
        "900"
    },

    focusText: {
      color:
        "#bbf7d0",
      lineHeight:
        22,
      marginTop:
        10
    },

    refreshButton: {
      backgroundColor:
        "#9333ea",
      padding:
        17,
      borderRadius:
        18,
      marginTop:
        22
    },

    refreshButtonText: {
      color:
        "white",
      fontWeight:
        "900",
      textAlign:
        "center"
    },

    secondaryButton: {
      backgroundColor:
        "#1e293b",
      padding:
        17,
      borderRadius:
        18,
      marginTop:
        12
    },

    secondaryButtonText: {
      color:
        "#67e8f9",
      fontWeight:
        "900",
      textAlign:
        "center"
    },

    errorCard: {
      backgroundColor:
        "rgba(239,68,68,.10)",
      borderColor:
        "rgba(239,68,68,.35)",
      borderWidth:
        1,
      borderRadius:
        18,
      padding:
        16
    },

    errorText: {
      color:
        "#fca5a5"
    },

    emptyText: {
      color:
        "#94a3b8",
      lineHeight:
        22,
      marginTop:
        10
    }
  });