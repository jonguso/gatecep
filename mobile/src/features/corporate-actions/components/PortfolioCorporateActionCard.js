import React from "react";

import {
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  router
} from "expo-router";

/*
 * Portfolio-facing corporate action summary.
 *
 * Feed this component `portfolioCard` from
 * buildCorporateActionInvestorExperience().
 */

export default function PortfolioCorporateActionCard({
  card
}) {
  if (!card?.visible) {
    return null;
  }

  return (
    <Pressable
      style={
        styles.card
      }
      onPress={() =>
        router.push(
          card.route ||
          "/corporate-actions"
        )
      }
    >
      <View
        style={
          styles.header
        }
      >
        <Text
          style={
            styles.title
          }
        >
          Corporate Actions
        </Text>

        <Text
          style={
            styles.link
          }
        >
          View →
        </Text>
      </View>

      <Text
        style={
          styles.message
        }
      >
        {card.message}
      </Text>

      <View
        style={
          styles.metrics
        }
      >
        <Metric
          label="Expected income"
          value={`${card.incomeCurrency || "KES"} ${Number(
            card.expectedIncome || 0
          ).toLocaleString()}`}
        />

        <Metric
          label="Decisions"
          value={
            card.decisionCount || 0
          }
        />

        <Metric
          label="Share changes"
          value={
            card.shareChangeCount || 0
          }
        />
      </View>
    </Pressable>
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

const styles =
  StyleSheet.create({
    card: {
      backgroundColor:
        "#0f172a",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        18,

      padding:
        16,

      marginTop:
        14
    },

    header: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        12
    },

    title: {
      color:
        "#67e8f9",

      fontWeight:
        "900",

      fontSize:
        17
    },

    link: {
      color:
        "#c084fc",

      fontWeight:
        "900"
    },

    message: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        8
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
      backgroundColor:
        "#020617",

      borderRadius:
        11,

      padding:
        10,

      minWidth:
        105,

      flexGrow:
        1
    },

    metricLabel: {
      color:
        "#94a3b8",

      fontSize:
        10
    },

    metricValue: {
      color:
        "white",

      fontWeight:
        "900",

      marginTop:
        5
    }
  });
