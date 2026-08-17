import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import {
  loadCanonicalGoalDetails,
  saveCanonicalGoalDetails
} from "../src/features/wealth-journey/goalDetailsService";

export default function GoalDetailsEditScreen() {
  const params = useLocalSearchParams();
  const goalId = Array.isArray(params?.goalId) ? params.goalId[0] : params?.goalId;
  const goalName = Array.isArray(params?.goalName)
    ? params.goalName[0]
    : params?.goalName;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(goalName || "Financial Goal");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    loadCanonicalGoalDetails({ goalId, name: goalName })
      .then((goal) => {
        setName(goal?.name || goalName || "Financial Goal");
        setTargetAmount(
          goal?.targetAmount === null || goal?.targetAmount === undefined
            ? ""
            : String(goal.targetAmount)
        );
        setTargetDate(goal?.targetDate || "");
      })
      .catch((error) => {
        Alert.alert("Goal Details", error?.message || "Unable to load the goal.");
      })
      .finally(() => setLoading(false));
  }, [goalId, goalName]);

  async function save() {
    try {
      setSaving(true);
      await saveCanonicalGoalDetails({
        goalId,
        name,
        targetAmount,
        targetDate
      });
      router.replace("/wealth-journey");
    } catch (error) {
      Alert.alert("Goal Details", error?.message || "Unable to save goal details.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text style={styles.muted}>Loading goal details...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>YOUR WEALTH JOURNEY</Text>
        <Text style={styles.title}>Complete Goal Details</Text>
        <Text style={styles.subtitle}>
          Add the amount and date Coach G needs to measure progress. This does
          not move money or change your portfolio.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Goal</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Financial goal"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.label}>Target Amount (KES)</Text>
          <TextInput
            value={targetAmount}
            onChangeText={(value) => setTargetAmount(value.replace(/[^0-9.]/g, ""))}
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="1000000"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.label}>Target Date</Text>
          <TextInput
            value={targetDate}
            onChangeText={setTargetDate}
            style={styles.input}
            keyboardType="numbers-and-punctuation"
            placeholder="2030-12-31"
            placeholderTextColor="#64748b"
            maxLength={10}
          />
          <Text style={styles.hint}>Use YYYY-MM-DD, for example 2030-12-31.</Text>

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Planning evidence only</Text>
            <Text style={styles.noticeText}>
              Coach G will calculate progress from your canonical REAL net worth.
              Practice Portfolio values are never used.
            </Text>
          </View>

          <Pressable
            disabled={saving}
            style={[styles.primary, saving && styles.disabled]}
            onPress={save}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.primaryText}>Save Goal Details</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondary}
            onPress={() => router.replace("/wealth-journey")}
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  content: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    padding: 20,
    paddingTop: 70,
    paddingBottom: 100
  },
  eyebrow: { color: "#22d3ee", fontWeight: "900", fontSize: 12 },
  title: { color: "white", fontSize: 30, fontWeight: "900", marginTop: 8 },
  subtitle: { color: "#94a3b8", lineHeight: 21, marginTop: 8, marginBottom: 20 },
  card: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 18
  },
  label: { color: "#bae6fd", fontWeight: "800", marginTop: 14, marginBottom: 7 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 13,
    backgroundColor: "#020617",
    color: "white",
    paddingHorizontal: 14,
    fontSize: 16
  },
  hint: { color: "#64748b", fontSize: 12, marginTop: 6 },
  notice: {
    backgroundColor: "rgba(34,211,238,.08)",
    borderColor: "#155e75",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 20
  },
  noticeTitle: { color: "#67e8f9", fontWeight: "900" },
  noticeText: { color: "#cbd5e1", lineHeight: 19, marginTop: 5 },
  primary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#9333ea",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20
  },
  primaryText: { color: "white", fontWeight: "900" },
  secondary: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10
  },
  secondaryText: { color: "#67e8f9", fontWeight: "900" },
  disabled: { opacity: 0.6 },
  muted: { color: "#94a3b8", marginTop: 12 }
});
