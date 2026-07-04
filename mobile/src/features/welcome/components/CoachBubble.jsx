import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function CoachBubble({ children }) {
  return (
    <View style={styles.bubble}>
      <Text style={styles.label}>Coach G</Text>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: "rgba(6,182,212,.10)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginTop: 18
  },
  label: { color: "#67e8f9", fontWeight: "900", marginBottom: 8 },
  text: { color: "white", fontSize: 17, lineHeight: 25, fontWeight: "700" }
});