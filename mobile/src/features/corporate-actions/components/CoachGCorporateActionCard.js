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
 * Small Coach G surface.
 *
 * Feed this component the `coachGPrompt` returned by
 * buildCorporateActionInvestorExperience().
 */

export default function CoachGCorporateActionCard({
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
        COACH G · CORPORATE ACTION
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
            You can ask:
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
            "/corporate-actions"
          )
        }
      >
        <Text
          style={
            styles.buttonText
          }
        >
          Review with Coach G
        </Text>
      </Pressable>
    </View>
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

    eyebrow: {
      color:
        "#22d3ee",

      fontSize:
        11,

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
        7
    },

    message: {
      color:
        "#cbd5e1",

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
        11,

      fontWeight:
        "800"
    },

    questionText: {
      color:
        "#ddd6fe",

      lineHeight:
        20,

      marginTop:
        5
    },

    button: {
      backgroundColor:
        "#0891b2",

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
