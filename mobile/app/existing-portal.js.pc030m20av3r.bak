import React from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet
} from "react-native";
import { router } from "expo-router";

export default function ExistingPortal() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Secure Investor Portal</Text>

      <Text style={styles.subtitle}>
        Upload broker reports for real portfolio analysis. This path is for subscribed customers with existing broker accounts.
      </Text>

      <View style={styles.secureCard}>
        <Text style={styles.secureTitle}>Secure Data Area</Text>

        <Text style={styles.body}>
          Broker valuation, cash ledger, and transaction files may contain sensitive financial data. In production, this area will support stronger authentication, subscription access, audit logs, and encrypted document handling.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Required</Text>
        <Text style={styles.item}>• Valuation report</Text>
        <Text style={styles.helper}>
          Used for current security holdings, market value, P/L, and sector allocation.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recommended</Text>
        <Text style={styles.item}>• Cash statement / ledger</Text>
        <Text style={styles.item}>• Transaction or order history</Text>
        <Text style={styles.helper}>
          Used for available cash, investor behavior, deposits, withdrawals, and trading discipline.
        </Text>
      </View>

      <Pressable
        style={styles.primary}
        onPress={() => router.push("/import-portfolio")}
      >
        <Text style={styles.primaryText}>Continue to Secure Upload</Text>
      </Pressable>

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/investor-home")}
      >
        <Text style={styles.secondaryText}>Back to Investor Home</Text>
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
    paddingBottom: 40
  },
  title: {
    color: "white",
    fontSize: 32,
    fontWeight: "900"
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 10,
    lineHeight: 22
  },
  secureCard: {
    marginTop: 24,
    backgroundColor: "rgba(147,51,234,.14)",
    borderColor: "rgba(147,51,234,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  secureTitle: {
    color: "#c084fc",
    fontWeight: "900",
    fontSize: 18
  },
  body: {
    color: "#cbd5e1",
    marginTop: 10,
    lineHeight: 21
  },
  card: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18
  },
  cardTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 10
  },
  item: {
    color: "white",
    fontWeight: "800",
    marginTop: 6
  },
  helper: {
    color: "#94a3b8",
    marginTop: 10,
    lineHeight: 20
  },
  primary: {
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18,
    marginTop: 26
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
  }
});