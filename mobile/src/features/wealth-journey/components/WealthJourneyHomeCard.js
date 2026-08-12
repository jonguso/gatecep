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

export default function WealthJourneyHomeCard({
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
          "/wealth-journey"
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
            styles.eyebrow
          }
        >
          YOUR WEALTH JOURNEY
        </Text>

        <Text
          style={
            styles.priority
          }
        >
          {card.priority}
        </Text>
      </View>

      <Text
        style={
          styles.title
        }
      >
        {card.title}
      </Text>

      <Text
        style={
          styles.message
        }
      >
        {card.message}
      </Text>

      <Text
        style={
          styles.action
        }
      >
        {card.actionLabel} →
      </Text>
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    card: {
      backgroundColor:
        "#0f172a",

      borderColor:
        "rgba(34,211,238,.35)",

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
        10
    },

    eyebrow: {
      color:
        "#22d3ee",

      fontSize:
        10,

      fontWeight:
        "900"
    },

    priority: {
      color:
        "#fde68a",

      fontSize:
        10,

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
        8
    },

    message: {
      color:
        "#cbd5e1",

      lineHeight:
        21,

      marginTop:
        8
    },

    action: {
      color:
        "#67e8f9",

      fontWeight:
        "900",

      marginTop:
        12
    }
  });
