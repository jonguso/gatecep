import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function CoachReflectionCard({ message }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Coach G Reflection</Text>
      <Text style={styles.message}>
        {message || "Your goal matters more than today’s market noise."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    backgroundColor: "rgba(6,182,212,.10)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  label: {
    color: "#67e8f9",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8
  },
  message: {
    color: "white",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 25
  }
});