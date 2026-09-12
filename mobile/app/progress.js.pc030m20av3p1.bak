import React, { useCallback, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";

export default function Progress() {
  const [state, setState] = useState({
    account: null,
    upload: null,
    history: []
  });

  useFocusEffect(
    useCallback(() => {
      loadProgress();
    }, [])
  );

  async function loadProgress() {
    const accountRaw = await AsyncStorage.getItem("gatecepAccount");
    const userRaw = await AsyncStorage.getItem("gatecepUser");
    const uploadRaw = await AsyncStorage.getItem("gatecepLatestUpload");
    const historyRaw = await AsyncStorage.getItem("gatecepRecommendationHistory");

    setState({
      account: accountRaw
        ? JSON.parse(accountRaw)
        : userRaw
        ? JSON.parse(userRaw)
        : null,
      upload: uploadRaw ? JSON.parse(uploadRaw) : null,
      history: historyRaw ? JSON.parse(historyRaw) : []
    });
  }

  const hasAccount = !!state.account;
  const hasUpload = !!state.upload?.valuation;
  const hasHistory = state.history.length > 0;

  const items = [
    {
      title: "Account Setup",
      status: hasAccount ? "COMPLETE" : "MISSING",
      detail: hasAccount
        ? "Your Gatecep account is active."
        : "Create an account or login first.",
      action: hasAccount ? "Investor Home" : "Login",
      route: hasAccount ? "/investor-home" : "/login"
    },
    {
      title: "Latest Valuation Upload",
      status: hasUpload ? "COMPLETE" : "MISSING",
      detail: hasUpload
        ? `Latest valuation uploaded: ${state.upload.valuation.fileName || "valuation report"}`
        : "Existing investors should upload a valuation report before portfolio analysis.",
      action: hasUpload ? "Review Upload" : "Secure Upload",
      route: "/existing-portal"
    },
    {
      title: "Portfolio Analysis",
      status: hasUpload ? "READY" : "PENDING",
      detail: hasUpload
        ? "Coach G can analyze your uploaded valuation data."
        : "Portfolio analysis unlocks after valuation upload.",
      action: hasUpload ? "Open Analysis" : "Upload First",
      route: hasUpload ? "/dashboard" : "/existing-portal"
    },
    {
      title: "Recommendation History",
      status: hasHistory ? "ACTIVE" : "EMPTY",
      detail: hasHistory
        ? `${state.history.length} saved Coach G recommendation(s).`
        : "Saved recommendations will appear after portfolio analysis.",
      action: hasHistory ? "View History" : "Go to Investor Home",
      route: hasHistory ? "/recommendation-history" : "/investor-home"
    }
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Gatecep Checklist</Text>

      <Text style={styles.subtitle}>
        Your checklist now separates demo exploration from secure investor analysis.
      </Text>

      {items.map((item) => (
        <View key={item.title} style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.detail}>{item.detail}</Text>
            </View>

            <Text
              style={[
                styles.status,
                item.status === "COMPLETE" ||
                item.status === "READY" ||
                item.status === "ACTIVE"
                  ? styles.good
                  : styles.warn
              ]}
            >
              {item.status}
            </Text>
          </View>

          <Pressable
            style={styles.button}
            onPress={() => router.push(item.route)}
          >
            <Text style={styles.buttonText}>{item.action}</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>New Investor?</Text>

        <Text style={styles.noticeText}>
          Use Coach G Demo from Investor Home. No upload or broker profile is required for demo exploration.
        </Text>

        <Pressable
          style={styles.demoButton}
          onPress={() => router.push("/demo")}
        >
          <Text style={styles.demoButtonText}>Open Demo</Text>
        </Pressable>
      </View>
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
    fontSize: 34,
    fontWeight: "900"
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 10,
    marginBottom: 22,
    lineHeight: 22
  },
  card: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginTop: 16
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  cardTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 18
  },
  detail: {
    color: "#94a3b8",
    marginTop: 8,
    lineHeight: 20
  },
  status: {
    fontSize: 11,
    fontWeight: "900"
  },
  good: {
    color: "#86efac"
  },
  warn: {
    color: "#fde68a"
  },
  button: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 16,
    marginTop: 16
  },
  buttonText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  },
  notice: {
    marginTop: 24,
    backgroundColor: "rgba(147,51,234,.12)",
    borderColor: "rgba(147,51,234,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  noticeTitle: {
    color: "#c084fc",
    fontWeight: "900",
    fontSize: 18
  },
  noticeText: {
    color: "#cbd5e1",
    marginTop: 10,
    lineHeight: 21
  },
  demoButton: {
    marginTop: 16,
    backgroundColor: "#9333ea",
    padding: 15,
    borderRadius: 16
  },
  demoButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  }
});