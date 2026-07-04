import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export default function OptionCard({ icon, title, subtitle, onPress }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginTop: 12
  },
  icon: { fontSize: 26, marginBottom: 8 },
  title: { color: "white", fontWeight: "900", fontSize: 16 },
  subtitle: { color: "#94a3b8", marginTop: 6, lineHeight: 19 }
});