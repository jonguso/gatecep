import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function InvestorJourneyCard({
  milestones = []
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your Investor Journey</Text>

      {milestones.map((item) => (
        <View key={item.label} style={styles.row}>
          <Text style={item.complete ? styles.completeIcon : styles.pendingIcon}>
            {item.complete ? "✓" : "○"}
          </Text>

          <View style={styles.content}>
            <Text style={item.complete ? styles.completeText : styles.pendingText}>
              {item.label}
            </Text>

            {item.description ? (
              <Text style={styles.description}>{item.description}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  title: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1
  },
  completeIcon: {
    color: "#86efac",
    fontSize: 18,
    fontWeight: "900"
  },
  pendingIcon: {
    color: "#64748b",
    fontSize: 18,
    fontWeight: "900"
  },
  content: {
    flex: 1
  },
  completeText: {
    color: "white",
    fontWeight: "800"
  },
  pendingText: {
    color: "#94a3b8",
    fontWeight: "800"
  },
  description: {
    color: "#64748b",
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18
  }
});