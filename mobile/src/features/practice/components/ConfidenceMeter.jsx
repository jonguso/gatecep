import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function ConfidenceMeter({
  level = 1,
  maxLevel = 8,
  label = "Beginning Investor"
}) {
  const safeLevel = Math.min(Math.max(Number(level || 0), 0), maxLevel);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Investor Confidence</Text>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.track}>
        {Array.from({ length: maxLevel }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              index < safeLevel && styles.segmentActive
            ]}
          />
        ))}
      </View>

      <Text style={styles.level}>
        Level {safeLevel} of {maxLevel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  title: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900"
  },
  label: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8
  },
  track: {
    flexDirection: "row",
    gap: 6,
    marginTop: 16
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    backgroundColor: "#334155"
  },
  segmentActive: {
    backgroundColor: "#9333ea"
  },
  level: {
    color: "#94a3b8",
    marginTop: 10,
    fontSize: 12
  }
});