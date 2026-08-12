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

export default function CoachGWealthJourneyCard({
  prompt
}) {
  if (!prompt?.shouldSurface) {
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
          styles.eyebrow
        }
      >
        COACH G · WEALTH JOURNEY
      </Text>

      <Text
        style={
          styles.title
        }
      >
        {prompt.title}
      </Text>

      <Text
        style={
          styles.message
        }
      >
        {prompt.message}
      </Text>

      {prompt.suggestedQuestion ? (
        <View
          style={
            styles.question
          }
        >
          <Text
            style={
              styles.questionLabel
            }
          >
            Ask Coach G:
          </Text>

          <Text
            style={
              styles.questionText
            }
          >
            {prompt.suggestedQuestion}
          </Text>
        </View>
      ) : null}

      <Pressable
        style={
          styles.button
        }
        onPress={() =>
          router.push(
            prompt.route ||
            "/wealth-journey"
          )
        }
      >
        <Text
          style={
            styles.buttonText
          }
        >
          Review My Journey
        </Text>
      </Pressable>
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      backgroundColor:
        "rgba(124,58,237,.12)",

      borderColor:
        "rgba(167,139,250,.40)",

      borderWidth:
        1,

      borderRadius:
        18,

      padding:
        16,

      marginTop:
        14
    },

    eyebrow: {
      color:
        "#c4b5fd",

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
        "#ddd6fe",

      lineHeight:
        21,

      marginTop:
        8
    },

    question: {
      backgroundColor:
        "#020617",

      borderRadius:
        12,

      padding:
        12,

      marginTop:
        12
    },

    questionLabel: {
      color:
        "#94a3b8",

      fontSize:
        10,

      fontWeight:
        "900"
    },

    questionText: {
      color:
        "#e9d5ff",

      lineHeight:
        20,

      marginTop:
        5
    },

    button: {
      backgroundColor:
        "#7c3aed",

      borderRadius:
        13,

      padding:
        13,

      marginTop:
        13
    },

    buttonText: {
      color:
        "white",

      textAlign:
        "center",

      fontWeight:
        "900"
    }
  });
