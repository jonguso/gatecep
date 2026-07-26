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
  buildInvestorTimeline
} from "../src/features/investor-timeline/investorTimelineService";

export default function InvestorTimeline() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    timeline,
    setTimeline
  ] = useState(null);

  const [
    error,
    setError
  ] = useState("");

  const [
    filter,
    setFilter
  ] = useState(
    "ALL"
  );

  useEffect(() => {
    loadTimeline();
  }, []);

  async function loadTimeline() {
    try {
      setLoading(true);
      setError("");

      const result =
        await buildInvestorTimeline();

      setTimeline(result);
    } catch (err) {
      console.error(
        "Unable to build Investor Timeline:",
        err
      );

      setError(
        err?.message ||
          "Coach G could not build your Investor Timeline."
      );

      setTimeline(null);
    } finally {
      setLoading(false);
    }
  }

  const visibleEvents =
    useMemo(() => {
      const events =
        Array.isArray(
          timeline?.events
        )
          ? timeline.events
          : [];

      if (
        filter === "ALL"
      ) {
        return events;
      }

      return events.filter(
        (event) =>
          event.category ===
          filter
      );
    }, [
      timeline,
      filter
    ]);

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
          Coach G is building your
          investor story...
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
        PC-007
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Investor Timeline
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        See how your investor journey
        has developed over time.
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

      {timeline ? (
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
                styles.coachText
              }
            >
              {timeline?.investor
                ?.firstName
                ? `${timeline.investor.firstName}, `
                : ""}
              this is the story of
              how your investing
              process is taking shape.
              The goal is not just to
              track money. It is to
              track how your decisions,
              discipline, and confidence
              evolve.
            </Text>
          </View>

          <View
            style={
              styles.summaryGrid
            }
          >
            <Metric
              label="Timeline Events"
              value={
                timeline?.summary
                  ?.totalEvents ||
                0
              }
            />

            <Metric
              label="Decisions"
              value={
                timeline?.summary
                  ?.decisionEvents ||
                0
              }
            />

            <Metric
              label="Reviews"
              value={
                timeline?.summary
                  ?.reviewEvents ||
                0
              }
            />

            <Metric
  label="Broker Events"
  value={
    timeline?.summary
      ?.brokerEvents ||
    0
  }
/>
          </View>

          <View
            style={
              styles.filterRow
            }
          >
            {[
               {
    value: "ALL",
    label: "All"
  },
  {
    value: "FOUNDATION",
    label: "Foundation"
  },
  {
    value: "PORTFOLIO",
    label: "Portfolio"
  },
  {
    value: "DECISION",
    label: "Decisions"
  },
  {
    value: "REVIEW",
    label: "Reviews"
  },
  {
    value: "BROKER",
    label: "Broker"
  }
            ].map(
              (item) => (
                <Pressable
                  key={
                    item.value
                  }
                  style={[
                    styles.filterButton,
                    filter ===
                      item.value &&
                      styles.filterButtonActive
                  ]}
                  onPress={() =>
                    setFilter(
                      item.value
                    )
                  }
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter ===
                        item.value &&
                        styles.filterTextActive
                    ]}
                  >
                    {
                      item.label
                    }
                  </Text>
                </Pressable>
              )
            )}
          </View>

          <View
            style={
              styles.timelineCard
            }
          >
            {visibleEvents.length ? (
              visibleEvents.map(
                (
                  event,
                  index
                ) => (
                  <TimelineEvent
                    key={
                      event.id
                    }
                    event={
                      event
                    }
                    isLast={
                      index ===
                      visibleEvents.length -
                        1
                    }
                  />
                )
              )
            ) : (
              <Text
                style={
                  styles.emptyText
                }
              >
                No events are
                available for this
                category yet.
              </Text>
            )}
          </View>
        </>
      ) : null}

      <Pressable
        style={
          styles.refreshButton
        }
        onPress={
          loadTimeline
        }
      >
        <Text
          style={
            styles.refreshButtonText
          }
        >
          Refresh Timeline
        </Text>
      </Pressable>

      <Pressable
        style={
          styles.secondaryButton
        }
        onPress={() =>
          router.push(
            "/monthly-review"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Open Monthly Review
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

function TimelineEvent({
  event,
  isLast
}) {
  return (
    <View
      style={
        styles.eventRow
      }
    >
      <View
        style={
          styles.eventRail
        }
      >
        <View
          style={[
            styles.dot,
            dotStyle(
              event.category
            )
          ]}
        />

        {!isLast ? (
          <View
            style={
              styles.line
            }
          />
        ) : null}
      </View>

      <View
        style={
          styles.eventContent
        }
      >
        <Text
          style={
            styles.eventDate
          }
        >
          {formatDate(
            event.timestamp
          )}
        </Text>

        <Text
          style={
            styles.eventTitle
          }
        >
          {event.title}
        </Text>

        <Text
          style={
            styles.eventDescription
          }
        >
          {event.description}
        </Text>

        <Text
          style={
            styles.eventCategory
          }
        >
          {categoryLabel(
            event.category
          )}
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

function categoryLabel(
  category
) {
  switch (category) {
    case "FOUNDATION":
      return "Foundation";

    case "PORTFOLIO":
      return "Portfolio";

    case "DECISION":
      return "Decision";

    case "REVIEW":
      return "Monthly Review";

    case "BROKER":
  return "Broker";

    default:
      return "Investor Journey";
  }
}

function dotStyle(
  category
) {
  switch (category) {
    case "FOUNDATION":
      return {
        borderColor:
          "#67e8f9"
      };

    case "PORTFOLIO":
      return {
        borderColor:
          "#c084fc"
      };

    case "DECISION":
      return {
        borderColor:
          "#facc15"
      };

    case "REVIEW":
      return {
        borderColor:
          "#86efac"
      };

    case "BROKER":
  return {
    borderColor:
      "#fb7185"
  };

    default:
      return {
        borderColor:
          "#94a3b8"
      };
  }
}

function formatDate(
  value
) {
  if (!value) {
    return "Date unavailable";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date unavailable";
  }

  return date.toLocaleString(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
      hour:
        "numeric",
      minute:
        "2-digit"
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
      fontWeight: "900",
      letterSpacing: 1.2
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
      fontWeight: "900",
      fontSize: 12
    },

    coachText: {
      color:
        "white",
      fontWeight: "700",
      lineHeight: 23,
      marginTop: 8
    },

    summaryGrid: {
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
      fontSize: 20,
      fontWeight: "900",
      marginTop: 6
    },

    filterRow: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap: 8,
      marginTop: 20
    },

    filterButton: {
      backgroundColor:
        "#1e293b",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14
    },

    filterButtonActive: {
      backgroundColor:
        "#9333ea"
    },

    filterText: {
      color:
        "#94a3b8",
      fontWeight: "900"
    },

    filterTextActive: {
      color:
        "white"
    },

    timelineCard: {
      marginTop: 18,
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 22,
      padding: 18
    },

    eventRow: {
      flexDirection:
        "row",
      alignItems:
        "stretch"
    },

    eventRail: {
      width: 28,
      alignItems:
        "center"
    },

    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 4,
      backgroundColor:
        "#020617"
    },

    line: {
      width: 2,
      flex: 1,
      minHeight: 86,
      backgroundColor:
        "#334155"
    },

    eventContent: {
      flex: 1,
      paddingLeft: 12,
      paddingBottom: 24
    },

    eventDate: {
      color:
        "#64748b",
      fontSize: 12
    },

    eventTitle: {
      color:
        "white",
      fontSize: 17,
      fontWeight: "900",
      marginTop: 4
    },

    eventDescription: {
      color:
        "#cbd5e1",
      lineHeight: 21,
      marginTop: 6
    },

    eventCategory: {
      color:
        "#67e8f9",
      fontSize: 11,
      fontWeight: "900",
      textTransform:
        "uppercase",
      marginTop: 8
    },

    refreshButton: {
      backgroundColor:
        "#9333ea",
      padding: 17,
      borderRadius: 18,
      marginTop: 22
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
      padding: 17,
      borderRadius: 18,
      marginTop: 12
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
      borderWidth: 1,
      borderRadius: 18,
      padding: 16
    },

    errorText: {
      color:
        "#fca5a5"
    },

    emptyText: {
      color:
        "#94a3b8",
      lineHeight: 22
    }
  });