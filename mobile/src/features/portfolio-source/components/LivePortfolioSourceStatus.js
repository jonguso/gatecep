import React from "react";

import {
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  usePortfolioSource
} from "../PortfolioSourceContext";

export default function LivePortfolioSourceStatus() {
  const {
    selectedPortfolio,
    isPracticeSelected,
    hasRealSources
  } =
    usePortfolioSource();

  if (!selectedPortfolio) {
    return null;
  }

  return (
    <View
      style={[
        styles.card,
        isPracticeSelected &&
          styles.practiceCard
      ]}
    >
      <Text
        style={[
          styles.title,
          isPracticeSelected &&
            styles.practiceTitle
        ]}
      >
        {selectedPortfolio
          ?.name ||
          "Portfolio"}
      </Text>

      <Text
        style={
          styles.text
        }
      >
        {isPracticeSelected
          ? "Simulation only · No real money · Excluded from Wealth Journey and Investor DNA reconciliation."
          : selectedPortfolio?.type === "ALL"
            ? "All real broker and imported investment accounts combined. Practice is excluded."
            : "Real investment account view."}
      </Text>

      {isPracticeSelected &&
      hasRealSources ? (
        <Text
          style={
            styles.note
          }
        >
          Your real Wealth Journey continues to use All Accounts even while you are viewing Practice.
        </Text>
      ) : null}
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      marginTop:
        10,

      backgroundColor:
        "rgba(34,211,238,.08)",

      borderColor:
        "rgba(34,211,238,.25)",

      borderWidth:
        1,

      borderRadius:
        12,

      padding:
        11
    },

    practiceCard: {
      backgroundColor:
        "rgba(245,158,11,.10)",

      borderColor:
        "rgba(245,158,11,.30)"
    },

    title: {
      color:
        "#67e8f9",

      fontWeight:
        "900"
    },

    practiceTitle: {
      color:
        "#fde68a"
    },

    text: {
      color:
        "#cbd5e1",

      marginTop:
        4,

      lineHeight:
        18,

      fontSize:
        11
    },

    note: {
      color:
        "#fde68a",

      marginTop:
        6,

      lineHeight:
        17,

      fontSize:
        10
    }
  });
