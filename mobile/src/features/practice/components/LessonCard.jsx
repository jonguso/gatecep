import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function LessonCard({
  title,
  summary,
  duration = "90 sec",
  onPress
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Today's Lesson</Text>
        <Text style={styles.duration}>{duration}</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.summary}>{summary}</Text>

      <Text style={styles.link}>Learn with Coach G →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 20,
    backgroundColor: "rgba(147,51,234,.12)",
    borderColor: "rgba(147,51,234,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  eyebrow: {
    color: "#c084fc",
    fontWeight: "900",
    fontSize: 13
  },
  duration: {
    color: "#94a3b8",
    fontSize: 12
  },
  title: {
    color: "white",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 12
  },
  summary: {
    color: "#cbd5e1",
    lineHeight: 21,
    marginTop: 8
  },
  link: {
    color: "#67e8f9",
    fontWeight: "900",
    marginTop: 14
  }
});