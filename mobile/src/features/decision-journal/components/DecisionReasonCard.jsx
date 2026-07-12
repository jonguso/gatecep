import React from "react";
import {
  Pressable,
  StyleSheet,
  Text
} from "react-native";

export default function DecisionReasonCard({
  icon,
  title,
  description,
  selected = false,
  onPress
}) {
  return (
    <Pressable
      style={[
        styles.card,
        selected && styles.selectedCard
      ]}
      onPress={onPress}
    >
      {icon ? (
        <Text style={styles.icon}>{icon}</Text>
      ) : null}

      <Text
        style={[
          styles.title,
          selected && styles.selectedTitle
        ]}
      >
        {title}
      </Text>

      {description ? (
        <Text style={styles.description}>
          {description}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginTop: 12
  },

  selectedCard: {
    borderColor: "#67e8f9",
    backgroundColor: "rgba(6,182,212,.10)"
  },

  icon: {
    fontSize: 24,
    marginBottom: 8
  },

  title: {
    color: "white",
    fontWeight: "900",
    fontSize: 16
  },

  selectedTitle: {
    color: "#67e8f9"
  },

  description: {
    color: "#94a3b8",
    marginTop: 6,
    lineHeight: 19
  }
});