import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function CoachInsightCard({ title = "Coach G", children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{title}</Text>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    backgroundColor: "rgba(6,182,212,.10)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  label: {
    color: "#67e8f9",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 8
  },
  text: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24
  }
});