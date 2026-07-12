import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function PortfolioAllocationCard({
  name,
  weight,
  amount,
  reason
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.weight}>{weight}%</Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.min(Math.max(Number(weight || 0), 0), 100)}%` }
          ]}
        />
      </View>

      <Text style={styles.amount}>
        KES {Number(amount || 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}
      </Text>

      {reason ? <Text style={styles.reason}>{reason}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  name: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
    paddingRight: 12
  },
  weight: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  track: {
    height: 8,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 14
  },
  fill: {
    height: "100%",
    backgroundColor: "#9333ea",
    borderRadius: 10
  },
  amount: {
    color: "#cbd5e1",
    fontWeight: "800",
    marginTop: 10
  },
  reason: {
    color: "#94a3b8",
    lineHeight: 20,
    marginTop: 8
  }
});