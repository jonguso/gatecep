import React from "react";
import { StyleSheet, Text, View } from "react-native";

const labels = [
  "Getting to know you",
  "Learning your dream",
  "Understanding your timeline",
  "Understanding your comfort",
  "Learning your journey",
  "Building your plan"
];

export default function ProgressHeader({ step }) {
  const count = 5;
  const active = Math.min(Math.max(step, 0), count);

  return (
    <View style={styles.card}>
      <Text style={styles.text}>{labels[Math.min(step, labels.length - 1)]}</Text>
      <View style={styles.dots}>
        {Array.from({ length: count }).map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index <= active && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16
  },
  text: { color: "#c084fc", fontWeight: "900" },
  dots: { flexDirection: "row", gap: 8, marginTop: 12 },
  dot: {
    width: 28,
    height: 6,
    borderRadius: 10,
    backgroundColor: "#334155"
  },
  dotActive: { backgroundColor: "#9333ea" }
});