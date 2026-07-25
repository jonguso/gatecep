import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

import { loadInvestorContext } from "./investorContextStore";

export default function InvestorDNAReview() {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const result = await loadInvestorContext();
      setContext(result);
    } catch (error) {
      console.error("Unable to load Investor DNA:", error);
      setContext(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#67e8f9" />
        <Text style={styles.loadingText}>
          Coach G is opening your Investor DNA...
        </Text>
      </View>
    );
  }

  const dna = context?.investorDNA || {};
  const profile = context?.profile || {};

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.eyebrow}>Investor Discovery</Text>

      <Text style={styles.title}>My Investor DNA</Text>

      <Text style={styles.subtitle}>
        This is the profile Coach G built from your Welcome Journey.
      </Text>

      <View style={styles.coachCard}>
        <Text style={styles.coachLabel}>Coach G</Text>

        <Text style={styles.coachText}>
          This is not a label or a permanent diagnosis. It is a starting
          point that helps us shape your learning and investing plan.
        </Text>
      </View>

      <View style={styles.card}>
        <InfoRow
          label="Investor Type"
          value={
            dna?.investorType ||
            profile?.investorType ||
            "Developing Investor"
          }
        />

        <InfoRow
          label="Primary Goal"
          value={humanize(dna?.goal)}
        />

        <InfoRow
          label="Time Horizon"
          value={humanize(dna?.timeHorizon)}
        />

        <InfoRow
          label="Risk Profile"
          value={humanize(dna?.riskProfile)}
        />

        <InfoRow
          label="Experience"
          value={humanize(dna?.experience)}
        />

        <InfoRow
          label="Contribution Style"
          value={humanize(dna?.contribution)}
        />

        <InfoRow
          label="Starting Amount"
          value={`KES ${money(dna?.amount || profile?.amount)}`}
        />

        <InfoRow
          label="Confidence Score"
          value={
            dna?.confidenceScore !== undefined
              ? `${dna.confidenceScore}%`
              : "Not available"
          }
        />
      </View>

      <View style={styles.promiseCard}>
        <Text style={styles.promiseTitle}>
          Remember
        </Text>

        <Text style={styles.promiseText}>
          Coach G uses your Investor DNA to explain options and help you
          think. You remain in control of every decision.
        </Text>

        <Text style={styles.promiseTagline}>
          We advise. You decide.
        </Text>
      </View>

      <Pressable
        style={styles.primary}
        onPress={() => router.back()}
      >
        <Text style={styles.primaryText}>
          Back to Practice Portfolio
        </Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/new-investor")}
      >
        <Text style={styles.secondaryText}>
          Update My Investor DNA
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>
        {value || "Not available"}
      </Text>
    </View>
  );
}

function humanize(value) {
  if (!value) {
    return "Not available";
  }

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

  center: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },

  loadingText: {
    color: "#94a3b8",
    marginTop: 12
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
    fontWeight: "900"
  },

  coachText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
    marginTop: 8
  },

  card: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },

  row: {
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 13
  },

  label: {
    color: "#94a3b8",
    fontSize: 12
  },

  value: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5
  },

  promiseCard: {
    marginTop: 20,
    backgroundColor: "rgba(245,158,11,.10)",
    borderColor: "rgba(245,158,11,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },

  promiseTitle: {
    color: "#fde68a",
    fontSize: 18,
    fontWeight: "900"
  },

  promiseText: {
    color: "#fef3c7",
    lineHeight: 22,
    marginTop: 10
  },

  promiseTagline: {
    color: "white",
    fontWeight: "900",
    marginTop: 14
  },

  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },

  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },

  secondary: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },

  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  }
});