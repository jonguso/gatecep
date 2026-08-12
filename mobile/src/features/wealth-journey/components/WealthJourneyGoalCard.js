import React from "react";

import {
  StyleSheet,
  Text,
  View
} from "react-native";

function formatMoney(
  currency,
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not set";
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed
    )
  ) {
    return "Not set";
  }

  return `${currency || "KES"} ${parsed.toLocaleString()}`;
}

export default function WealthJourneyGoalCard({
  goal
}) {
  if (!goal) {
    return null;
  }

  const incomplete =
    goal?.completeness &&
    goal.completeness !==
      "PLANNABLE";

  return (
    <View
      style={
        styles.card
      }
    >
      <View
        style={
          styles.header
        }
      >
        <Text
          style={
            styles.name
          }
        >
          {goal.name}
        </Text>

        <Text
          style={
            styles.status
          }
        >
          {goal.statusLabel}
        </Text>
      </View>

      {incomplete ? (
        <View
          style={
            styles.incompleteBanner
          }
        >
          <Text
            style={
              styles.incompleteText
            }
          >
            Goal details are incomplete. Coach G will help turn this
            intention into a trackable plan.
          </Text>
        </View>
      ) : null}

      <View
        style={
          styles.metrics
        }
      >
        <Metric
          label="Current"
          value={
            formatMoney(
              goal.currency,
              goal.currentValue
            )
          }
        />

        <Metric
          label="Target"
          value={
            formatMoney(
              goal.currency,
              goal.targetAmount
            )
          }
        />

        <Metric
          label="Projected"
          value={
            formatMoney(
              goal.currency,
              goal.projectedValue
            )
          }
        />
      </View>

      {goal.narrative ? (
        <Text
          style={
            styles.narrative
          }
        >
          {goal.narrative}
        </Text>
      ) : null}

      {goal.nextAction ? (
        <View
          style={
            styles.next
          }
        >
          <Text
            style={
              styles.nextLabel
            }
          >
            NEXT
          </Text>

          <Text
            style={
              styles.nextTitle
            }
          >
            {goal.nextAction.label}
          </Text>

          <Text
            style={
              styles.nextText
            }
          >
            {goal.nextAction.reason}
          </Text>
        </View>
      ) : null}
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
        {value}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      backgroundColor:
        "#020617",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        15,

      padding:
        14,

      marginTop:
        12
    },

    header: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        12
    },

    name: {
      color:
        "white",

      fontSize:
        17,

      fontWeight:
        "900",

      flex:
        1
    },

    status: {
      color:
        "#67e8f9",

      fontSize:
        11,

      fontWeight:
        "900"
    },

    incompleteBanner: {
      backgroundColor:
        "rgba(245,158,11,.10)",

      borderRadius:
        10,

      padding:
        10,

      marginTop:
        10
    },

    incompleteText: {
      color:
        "#fde68a",

      lineHeight:
        19,

      fontSize:
        12
    },

    metrics: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        8,

      marginTop:
        12
    },

    metric: {
      flexGrow:
        1,

      minWidth:
        100,

      backgroundColor:
        "#0f172a",

      borderRadius:
        10,

      padding:
        9
    },

    metricLabel: {
      color:
        "#94a3b8",

      fontSize:
        9
    },

    metricValue: {
      color:
        "white",

      fontWeight:
        "900",

      marginTop:
        4
    },

    narrative: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        12
    },

    next: {
      backgroundColor:
        "#0f172a",

      borderRadius:
        11,

      padding:
        11,

      marginTop:
        12
    },

    nextLabel: {
      color:
        "#22d3ee",

      fontSize:
        9,

      fontWeight:
        "900"
    },

    nextTitle: {
      color:
        "white",

      fontWeight:
        "900",

      marginTop:
        4
    },

    nextText: {
      color:
        "#94a3b8",

      lineHeight:
        19,

      marginTop:
        5
    }
  });
