import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import {
  clearDecisionJournal,
  loadDecisionJournal
} from "./decisionJournalStore";

export default function DecisionJournal() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    try {
      setLoading(true);
      const journal = await loadDecisionJournal();
      setEntries(Array.isArray(journal) ? journal : []);
    } catch (error) {
      Alert.alert(
        "Coach G",
        error.message || "Unable to load your Decision Journal."
      );
    } finally {
      setLoading(false);
    }
  }

  function confirmClearJournal() {
    Alert.alert(
      "Clear Practice Journal?",
      "This will remove all saved practice decisions from this device.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await clearDecisionJournal();
              setEntries([]);
            } catch (error) {
              Alert.alert(
                "Coach G",
                error.message || "Unable to clear the journal."
              );
            }
          }
        }
      ]
    );
  }

  const summary = useMemo(() => {
    const total = entries.length;

    const averageConfidence =
      total > 0
        ? entries.reduce(
            (sum, entry) => sum + Number(entry.confidence || 0),
            0
          ) / total
        : 0;

    const practiceCount = entries.filter(
      (entry) => entry.isPractice !== false
    ).length;

    const reviewedCount = entries.filter(
      (entry) => entry.reviewStatus === "REVIEWED"
    ).length;

    return {
      total,
      averageConfidence,
      practiceCount,
      reviewedCount
    };
  }, [entries]);

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color="#67e8f9" />
        <Text style={styles.loadingTitle}>
          Coach G is opening your journal...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Reflection</Text>
          <Text style={styles.title}>My Decision Journal</Text>
        </View>

        <Pressable
          style={styles.closeButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        This journal records why you considered an investment, what you
        expected, and how confident you felt before acting.
      </Text>

      <View style={styles.coachCard}>
        <Text style={styles.coachLabel}>Coach G</Text>
        <Text style={styles.coachText}>
          Your journal is not a record of perfect decisions. It is a record
          of how your thinking develops over time.
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryMetric
          label="Decisions"
          value={String(summary.total)}
        />

        <SummaryMetric
          label="Practice"
          value={String(summary.practiceCount)}
        />

        <SummaryMetric
          label="Average Confidence"
          value={`${summary.averageConfidence.toFixed(1)}/5`}
        />

        <SummaryMetric
          label="Reviewed"
          value={String(summary.reviewedCount)}
        />
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>
            Your journal is ready.
          </Text>

          <Text style={styles.emptyText}>
            Record your first practice decision and Coach G will help you
            reflect on the reason behind it.
          </Text>

          <Pressable
            style={styles.primary}
            onPress={() => router.push("/practice-decision")}
          >
            <Text style={styles.primaryText}>
              Record First Practice Decision
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Decision History</Text>

            <Text style={styles.sectionCount}>
              {entries.length} saved
            </Text>
          </View>

          {entries.map((entry) => (
            <DecisionEntry
              key={entry.id}
              entry={entry}
            />
          ))}

          <Pressable
            style={styles.primary}
            onPress={() => router.push("/practice-decision")}
          >
            <Text style={styles.primaryText}>
              Record Another Practice Decision
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondary}
            onPress={confirmClearJournal}
          >
            <Text style={styles.dangerText}>
              Clear Practice Journal
            </Text>
          </Pressable>
        </>
      )}

      <Pressable
        style={styles.secondary}
        onPress={() => router.replace("/(tabs)/dashboard")}
      >
        <Text style={styles.secondaryText}>
          Return to My Journey
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function DecisionEntry({ entry }) {
  const decisionLabel = humanizeValue(
    entry.decision || "CONSIDER_BUY"
  );

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.symbol}>
            {entry.symbol || "N/A"}
          </Text>

          <Text style={styles.company}>
            {entry.companyName || "Practice Security"}
          </Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {entry.isPractice === false ? "LIVE" : "PRACTICE"}
          </Text>
        </View>
      </View>

      <Text style={styles.decisionLabel}>
        {decisionLabel}
      </Text>

      <JournalInfo
        label="Why it interested me"
        value={entry.reason}
      />

      <JournalInfo
        label="Expected outcome"
        value={entry.expectedOutcome}
      />

      <View style={styles.compactGrid}>
        <CompactInfo
          label="Confidence"
          value={`${Number(entry.confidence || 0)}/5`}
        />

        <CompactInfo
          label="Reference Price"
          value={`KES ${money(entry.priceAtDecision)}`}
        />
      </View>

      {entry.notes ? (
        <JournalInfo
          label="Note to myself"
          value={entry.notes}
        />
      ) : null}

      <View style={styles.entryFooter}>
        <Text style={styles.dateText}>
          {formatDate(entry.createdAt)}
        </Text>

        <Text
          style={
            entry.reviewStatus === "REVIEWED"
              ? styles.reviewedText
              : styles.pendingText
          }
        >
          {entry.reviewStatus === "REVIEWED"
            ? "Reviewed"
            : "Review pending"}
        </Text>
      </View>
    </View>
  );
}

function JournalInfo({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>
        {String(value || "Not provided")}
      </Text>
    </View>
  );
}

function CompactInfo({ label, value }) {
  return (
    <View style={styles.compactInfo}>
      <Text style={styles.compactLabel}>{label}</Text>
      <Text style={styles.compactValue}>{value}</Text>
    </View>
  );
}

function SummaryMetric({ label, value }) {
  return (
    <View style={styles.summaryMetric}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function humanizeValue(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString();
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },

  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 110
  },

  centerScreen: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },

  loadingTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 18,
    textAlign: "center"
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center"
  },

  closeButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "900"
  },

  eyebrow: {
    color: "#c084fc",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2
  },

  title: {
    color: "white",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 8
  },

  subtitle: {
    color: "#94a3b8",
    marginTop: 10,
    lineHeight: 22
  },

  coachCard: {
    marginTop: 20,
    backgroundColor: "rgba(6,182,212,.10)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },

  coachLabel: {
    color: "#67e8f9",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8
  },

  coachText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24
  },

  summaryGrid: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },

  summaryMetric: {
    width: "47%",
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 15
  },

  summaryLabel: {
    color: "#94a3b8",
    fontSize: 12
  },

  summaryValue: {
    color: "white",
    fontWeight: "900",
    fontSize: 21,
    marginTop: 8
  },

  emptyCard: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 20
  },

  emptyTitle: {
    color: "#67e8f9",
    fontSize: 20,
    fontWeight: "900"
  },

  emptyText: {
    color: "#cbd5e1",
    marginTop: 10,
    lineHeight: 22
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },

  sectionTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "900"
  },

  sectionCount: {
    color: "#94a3b8",
    fontSize: 12
  },

  entryCard: {
    marginTop: 12,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },

  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },

  symbol: {
    color: "white",
    fontSize: 23,
    fontWeight: "900"
  },

  company: {
    color: "#94a3b8",
    marginTop: 4
  },

  badge: {
    backgroundColor: "rgba(147,51,234,.14)",
    borderColor: "rgba(192,132,252,.35)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7
  },

  badgeText: {
    color: "#c084fc",
    fontSize: 10,
    fontWeight: "900"
  },

  decisionLabel: {
    color: "#67e8f9",
    fontWeight: "900",
    marginTop: 14
  },

  infoRow: {
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12
  },

  infoLabel: {
    color: "#94a3b8",
    fontSize: 12
  },

  infoValue: {
    color: "white",
    fontWeight: "800",
    marginTop: 5,
    lineHeight: 20
  },

  compactGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },

  compactInfo: {
    flex: 1,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12
  },

  compactLabel: {
    color: "#94a3b8",
    fontSize: 11
  },

  compactValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 6
  },

  entryFooter: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },

  dateText: {
    color: "#64748b",
    fontSize: 11,
    flex: 1
  },

  reviewedText: {
    color: "#86efac",
    fontWeight: "900",
    fontSize: 11
  },

  pendingText: {
    color: "#fde68a",
    fontWeight: "900",
    fontSize: 11
  },

  primary: {
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18,
    marginTop: 22
  },

  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },

  secondary: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18,
    marginTop: 14
  },

  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  },

  dangerText: {
    color: "#fca5a5",
    textAlign: "center",
    fontWeight: "900"
  }
});