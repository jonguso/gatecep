import React from "react";

import {
  StyleSheet,
  Text,
  View
} from "react-native";

import PortfolioSourceSelector from "./PortfolioSourceSelector";
import PortfolioSourceBanner from "./PortfolioSourceBanner";

export default function DashboardPortfolioSourcePanel({
  state,
  onSourceChange
}) {
  if (!state) {
    return null;
  }

  const options =
    (state.sourceOptions || []).map(
      (source) => ({
        id:
          source.id,

        label:
          source.name,

        type:
          source.type,

        isPractice:
          source.type ===
          "PRACTICE"
      })
    );

  return (
    <View>
      <View
        style={
          styles.header
        }
      >
        <View
          style={
            styles.titleWrap
          }
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            PORTFOLIO
          </Text>

          <Text
            style={
              styles.title
            }
          >
            {state
              ?.label
              ?.title ||
              "Portfolio"}
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            {state
              ?.label
              ?.subtitle ||
              ""}
          </Text>
        </View>

        <PortfolioSourceSelector
          compact
          options={
            options
          }
          selectedSourceId={
            state
              .selectedSourceId
          }
          onChange={
            onSourceChange
          }
        />
      </View>

      <PortfolioSourceBanner
        state={
          state
        }
      />
    </View>
  );
}

const styles =
  StyleSheet.create({
    header: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      justifyContent:
        "space-between",

      gap:
        14
    },

    titleWrap: {
      flex:
        1
    },

    eyebrow: {
      color:
        "#22d3ee",

      fontSize:
        9,

      fontWeight:
        "900"
    },

    title: {
      color:
        "white",

      fontSize:
        18,

      fontWeight:
        "900",

      marginTop:
        4
    },

    subtitle: {
      color:
        "#94a3b8",

      marginTop:
        3,

      lineHeight:
        18,

      fontSize:
        11
    }
  });
