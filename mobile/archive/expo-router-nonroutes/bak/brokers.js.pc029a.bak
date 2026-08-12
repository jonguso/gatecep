import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

export default function BrokerUpload() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Upload Center</Text>

      <Text style={styles.subtitle}>
        Choose what you want to upload. Gatecep uses each report to improve
        portfolio analysis, cash visibility, and Coach G behavior intelligence.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Required Uploads</Text>

        <Pressable
          style={styles.docOption}
          onPress={() => router.push("/import-portfolio")}
        >
          <Text style={styles.docTitle}>Portfolio Valuation</Text>
          <Text style={styles.required}>Required</Text>
          <Text style={styles.docDesc}>
            Upload valuation report and review holdings before saving to dashboard.
          </Text>
        </Pressable>

        <Pressable
          style={styles.docOption}
          onPress={() => router.push("/funds")}
        >
          <Text style={styles.docTitle}>Cash / Ledger Statement</Text>
          <Text style={styles.required}>Required</Text>
          <Text style={styles.docDesc}>
            Upload statement to calculate available cash and trading space.
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Optional Uploads</Text>

        <Pressable
          style={styles.docOption}
          onPress={() => router.push("/transaction-import")}
        >
          <Text style={styles.docTitle}>Transaction / Order History</Text>
          <Text style={styles.optional}>Optional</Text>
          <Text style={styles.docDesc}>
            Helps Coach G understand buying behavior, selling discipline, and goal alignment.
          </Text>
        </Pressable>

        <Pressable
          style={styles.docOption}
          onPress={() => router.push("/holdings-import")}
        >
          <Text style={styles.docTitle}>Holdings Report</Text>
          <Text style={styles.fallback}>Fallback</Text>
          <Text style={styles.docDesc}>
            Upload current holdings when full valuation is unavailable.
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.dashboardButton}
        onPress={() => router.replace("/dashboard")}
      >
        <Text style={styles.dashboardText}>Go to Dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },
  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 80
  },
  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900"
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 10,
    lineHeight: 22
  },
  card: {
    marginTop: 22,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  cardTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 12
  },
  docOption: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#020617",
    borderColor: "#9333ea",
    borderWidth: 1,
    marginTop: 12
  },
  docTitle: {
    color: "white",
    fontWeight: "900",
    fontSize: 16
  },
  docDesc: {
    color: "#94a3b8",
    marginTop: 8,
    lineHeight: 20
  },
  required: {
    color: "#fbbf24",
    fontWeight: "900",
    marginTop: 6
  },
  optional: {
    color: "#67e8f9",
    fontWeight: "900",
    marginTop: 6
  },
  fallback: {
    color: "#c084fc",
    fontWeight: "900",
    marginTop: 6
  },
  dashboardButton: {
    marginTop: 22,
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    padding: 16,
    borderRadius: 18
  },
  dashboardText: {
    color: "#cbd5e1",
    fontWeight: "900",
    textAlign: "center"
  }
});