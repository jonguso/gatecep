import React from "react";

import {
  StyleSheet,
  Text,
  View
} from "react-native";

export default function PortfolioSourceBanner({
  state
}) {
  if (
    !state
      ?.presentation
      ?.showSimulationBanner
  ) {
    return null;
  }

  return (
    <View
      style={
        styles.card
      }
    >
      <Text
        style={
          styles.title
        }
      >
        Practice Portfolio
      </Text>

      <Text
        style={
          styles.text
        }
      >
        {state
          ?.presentation
          ?.simulationBannerText ||
          "Simulated learning portfolio · No real money"}
      </Text>

      <Text
        style={
          styles.note
        }
      >
        Practice activity does not affect your real Wealth Journey,
        Investor DNA reconciliation, or real investment performance.
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      backgroundColor:
        "rgba(245,158,11,.10)",

      borderColor:
        "rgba(245,158,11,.30)",

      borderWidth:
        1,

      borderRadius:
        13,

      padding:
        12,

      marginTop:
        10
    },

    title: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    text: {
      color:
        "#fef3c7",

      marginTop:
        4,

      lineHeight:
        19
    },

    note: {
      color:
        "#d6d3d1",

      marginTop:
        6,

      lineHeight:
        18,

      fontSize:
        11
    }
  });
