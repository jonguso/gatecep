import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import {
  loadCurrentGoalRecoveryOptions
} from "../src/features/wealth-journey/goalRecoveryOptionsService";

export default function GoalRecoveryOptionsScreen() {
  const params = useLocalSearchParams();
  const goalId = first(params?.goalId);
  const goalName = first(params?.goalName);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    loadCurrentGoalRecoveryOptions({ goalId, goalName })
      .then(setData)
      .catch((loadError) =>
        setError(loadError?.message || "Unable to load recovery options.")
      )
      .finally(() => setLoading(false));
  }, [goalId, goalName]);

  const scenarios = useMemo(
    () => (Array.isArray(data?.scenarios) ? data.scenarios : []),
    [data]
  );
  const scenario = scenarios[index] || null;
  const recommended = scenario?.id === data?.recommendedScenarioId;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22d3ee" />
        <Text style={styles.muted}>Reviewing realistic recovery options...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>COACH G • GOAL RECOVERY</Text>
          <Text style={styles.title}>Recovery Options</Text>
          <Text style={styles.subtitle}>
            Compare realistic ways to improve {data?.goal?.name || goalName || "this goal"}.
          </Text>
        </View>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.replace("/wealth-journey")}
        >
          <Text style={styles.headerButtonText}>Back</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!error && !data?.available ? (
        <View style={styles.emptyCard}>
          <Text style={styles.sectionTitle}>No recovery plan is required</Text>
          <Text style={styles.bodyText}>
            Coach G does not currently have ranked recovery options for this goal.
          </Text>
        </View>
      ) : null}

      {!error && data?.available && scenario ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              {scenarios.length} possible ways to improve the plan
            </Text>
            <Text style={styles.bodyText}>{data?.narrative}</Text>
          </View>

          <View style={styles.pagerHeader}>
            <Text style={styles.pagerLabel}>
              Option {index + 1} of {scenarios.length}
            </Text>
            {recommended ? (
              <Text style={styles.recommendedBadge}>COACH G RECOMMENDS FIRST</Text>
            ) : null}
          </View>

          <View style={[styles.optionCard, recommended && styles.optionRecommended]}>
            <Text style={styles.optionTitle}>{scenario.title}</Text>
            <Text style={styles.strategy}>{label(scenario.strategy)}</Text>

            <Metric label="Feasibility" value={label(scenario.feasibility)} />
            <Metric
              label="Feasibility Score"
              value={`${Number(scenario?.feasibilityScore || 0).toFixed(0)}/100`}
            />

            <Info title="What this changes" text={scenario.description} />
            <Info title="Trade-off" text={scenario.tradeoff} warning />

            {scenario?.impact && Object.keys(scenario.impact).length ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Modeled impact</Text>
                {Object.entries(scenario.impact).map(([name, value]) => (
                  <View key={name} style={styles.row}>
                    <Text style={styles.rowLabel}>{label(name)}</Text>
                    <Text style={styles.rowValue}>{formatValue(name, value)}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Info
              title="Discuss with Coach G"
              text={scenario.coachGQuestion}
              coach
            />
          </View>

          <View style={styles.pagerActions}>
            <Pressable
              disabled={index === 0}
              style={[styles.pagerButton, index === 0 && styles.disabled]}
              onPress={() => setIndex((value) => Math.max(value - 1, 0))}
            >
              <Text style={styles.pagerButtonText}>Previous</Text>
            </Pressable>
            <Pressable
              disabled={index >= scenarios.length - 1}
              style={[
                styles.pagerButton,
                index >= scenarios.length - 1 && styles.disabled
              ]}
              onPress={() =>
                setIndex((value) => Math.min(value + 1, scenarios.length - 1))
              }
            >
              <Text style={styles.pagerButtonText}>Next</Text>
            </Pressable>
          </View>

          <View style={styles.protectionCard}>
            <Text style={styles.protectionTitle}>Review only—nothing changes automatically</Text>
            <Text style={styles.protectionText}>
              These are planning comparisons. Opening an option does not change
              your goal, contribution, holdings, cash, or broker instructions.
            </Text>
          </View>
        </>
      ) : null}

      <Pressable
        style={styles.backButton}
        onPress={() => router.replace("/wealth-journey")}
      >
        <Text style={styles.backButtonText}>Back to Wealth Journey</Text>
      </Pressable>
    </ScrollView>
  );
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function label(value) {
  return String(value || "Not available")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatValue(name, value) {
  if (value === null || value === undefined) return "Not available";
  if (typeof value === "number") {
    const formatted = value.toLocaleString("en-US", { maximumFractionDigits: 2 });
    return /amount|contribution/i.test(name) ? `KES ${formatted}` : formatted;
  }
  return String(value);
}

function Metric({ label: title, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{title}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Info({ title, text, warning = false, coach = false }) {
  if (!text) return null;
  return (
    <View
      style={[
        styles.infoCard,
        warning && styles.warningCard,
        coach && styles.coachCard
      ]}
    >
      <Text style={[styles.infoTitle, coach && styles.coachTitle]}>{title}</Text>
      <Text style={styles.bodyText}>{text}</Text>
    </View>
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
    maxWidth: 720,
    alignSelf: "center",
    padding: 18,
    paddingTop: 64,
    paddingBottom: 100
  },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  headerText: { flex: 1 },
  eyebrow: { color: "#22d3ee", fontSize: 11, fontWeight: "900" },
  title: { color: "white", fontSize: 30, fontWeight: "900", marginTop: 7 },
  subtitle: { color: "#94a3b8", lineHeight: 20, marginTop: 7 },
  headerButton: {
    minHeight: 44,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center"
  },
  headerButtonText: { color: "#67e8f9", fontWeight: "900" },
  summaryCard: {
    backgroundColor: "rgba(147,51,234,.12)",
    borderColor: "#6b21a8",
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    marginTop: 20
  },
  summaryTitle: { color: "#e9d5ff", fontSize: 17, fontWeight: "900" },
  pagerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
    marginBottom: 8
  },
  pagerLabel: { color: "#94a3b8", fontWeight: "800" },
  recommendedBadge: { color: "#86efac", fontSize: 10, fontWeight: "900" },
  optionCard: {
    backgroundColor: "#0f172a",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16
  },
  optionRecommended: { borderColor: "#16a34a" },
  optionTitle: { color: "white", fontSize: 21, fontWeight: "900" },
  strategy: { color: "#c084fc", fontSize: 11, fontWeight: "900", marginTop: 5 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 10,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1
  },
  rowLabel: { color: "#94a3b8", flex: 1 },
  rowValue: { color: "white", fontWeight: "900", textAlign: "right", flex: 1 },
  infoCard: { backgroundColor: "#020617", borderRadius: 13, padding: 13, marginTop: 12 },
  warningCard: { borderColor: "#92400e", borderWidth: 1 },
  coachCard: { borderColor: "#0e7490", borderWidth: 1 },
  infoTitle: { color: "#67e8f9", fontWeight: "900", marginBottom: 5 },
  coachTitle: { color: "#86efac" },
  bodyText: { color: "#cbd5e1", lineHeight: 20, marginTop: 6 },
  pagerActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  pagerButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: "#9333ea",
    alignItems: "center",
    justifyContent: "center"
  },
  pagerButtonText: { color: "white", fontWeight: "900" },
  disabled: { opacity: 0.35 },
  protectionCard: {
    backgroundColor: "rgba(245,158,11,.08)",
    borderColor: "#92400e",
    borderWidth: 1,
    borderRadius: 15,
    padding: 14,
    marginTop: 16
  },
  protectionTitle: { color: "#fde68a", fontWeight: "900" },
  protectionText: { color: "#cbd5e1", lineHeight: 19, marginTop: 6 },
  backButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16
  },
  backButtonText: { color: "#67e8f9", fontWeight: "900" },
  errorCard: { backgroundColor: "#450a0a", borderRadius: 14, padding: 14, marginTop: 18 },
  errorText: { color: "#fecaca" },
  emptyCard: { backgroundColor: "#0f172a", borderRadius: 16, padding: 16, marginTop: 18 },
  sectionTitle: { color: "#67e8f9", fontWeight: "900", fontSize: 17 },
  muted: { color: "#94a3b8", marginTop: 12 }
});
