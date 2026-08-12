import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

import {
  userGetItem
} from "../src/auth/userStorage";
import { buildSyncStatus } from "../src/portfolio/syncStatus";

export default function BrokerUpload() {
  const [portfolioUploaded, setPortfolioUploaded] = useState(false);
  const [cashUploaded, setCashUploaded] = useState(false);
  const [transactionsUploaded, setTransactionsUploaded] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    const portfolio = await userGetItem("statementUploaded");
    const cash = await userGetItem("cashStatementUploaded");
    const transactions = await userGetItem("transactionsUploaded");

    setPortfolioUploaded(portfolio === "true");
    setCashUploaded(cash === "true");
    setTransactionsUploaded(transactions === "true");

    await buildSyncStatus();
  }

  const canContinue = portfolioUploaded && cashUploaded;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Connect Your Portfolio</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Upload your broker valuation, cash statement, or transaction history so
        Coach G can build a more accurate portfolio view.
      </Text>

      <View style={styles.statusCard}>
        <Text style={styles.cardTitle}>Upload Status</Text>

        <StatusRow label="Portfolio Valuation" done={portfolioUploaded} />
        <StatusRow label="Cash / Ledger Statement" done={cashUploaded} />
        <StatusRow label="Transaction / Order History" done={transactionsUploaded} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Required Uploads</Text>

        <Pressable
          style={styles.docOption}
          onPress={() => router.push("/import-portfolio")}
        >
          <Text style={styles.docTitle}>Portfolio Valuation</Text>
          <Text style={portfolioUploaded ? styles.complete : styles.required}>
            {portfolioUploaded ? "Completed" : "Required"}
          </Text>
          <Text style={styles.docDesc}>
            Upload valuation report and review holdings before saving to
            dashboard.
          </Text>
        </Pressable>

        <Pressable
          style={styles.docOption}
          onPress={() => router.push("/funds")}
        >
          <Text style={styles.docTitle}>Cash / Ledger Statement</Text>
          <Text style={cashUploaded ? styles.complete : styles.required}>
            {cashUploaded ? "Completed" : "Required"}
          </Text>
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
          <Text style={transactionsUploaded ? styles.complete : styles.optional}>
            {transactionsUploaded ? "Completed" : "Optional"}
          </Text>
          <Text style={styles.docDesc}>
            Helps Coach G understand buying behavior, selling discipline, and
            goal alignment.
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.continueButton,
          !canContinue && styles.disabledButton
        ]}
        disabled={!canContinue}
        onPress={() => router.replace("/(tabs)/dashboard")}
      >
        <Text style={styles.continueText}>
          {canContinue
            ? "Continue to Dashboard"
            : "Upload Required Reports to Continue"}
        </Text>
      </Pressable>

      <Pressable
        style={styles.skipButton}
        onPress={() => router.replace("/onboarding/smart-portfolio")}
      >
        <Text style={styles.skipText}>Skip for Now</Text>
      </Pressable>
    </ScrollView>
  );
}

function StatusRow({ label, done }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={done ? styles.statusDone : styles.statusMissing}>
        {done ? "DONE" : "MISSING"}
      </Text>
    </View>
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
    paddingBottom: 90
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: {
    color: "white",
    fontSize: 30,
    fontWeight: "900",
    flex: 1
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 10,
    lineHeight: 22
  },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardButtonText: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  statusCard: {
    marginTop: 22,
    backgroundColor: "rgba(6,182,212,.08)",
    borderColor: "rgba(6,182,212,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
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
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomColor: "rgba(148,163,184,.18)",
    borderBottomWidth: 1,
    paddingVertical: 12,
    gap: 12
  },
  statusLabel: {
    color: "white",
    fontWeight: "800",
    flex: 1
  },
  statusDone: {
    color: "#86efac",
    fontWeight: "900"
  },
  statusMissing: {
    color: "#fca5a5",
    fontWeight: "900"
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
  complete: {
    color: "#86efac",
    fontWeight: "900",
    marginTop: 6
  },
  optional: {
    color: "#67e8f9",
    fontWeight: "900",
    marginTop: 6
  },
  continueButton: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    borderColor: "#c084fc",
    borderWidth: 1,
    padding: 16,
    borderRadius: 18
  },
  disabledButton: {
    opacity: 0.45
  },
  continueText: {
    color: "white",
    fontWeight: "900",
    textAlign: "center"
  },
  skipButton: {
    marginTop: 14,
    padding: 16
  },
  skipText: {
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "900"
  }
});