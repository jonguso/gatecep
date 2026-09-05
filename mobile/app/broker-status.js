import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router } from "expo-router";
import {
  userGetItem,
  userSetItem
} from "../src/auth/userStorage";

const steps = [
  {
    key: "brokerSelected",
    title: "Broker Selected",
    detail: "Coach G recommends a broker based on your profile."
  },
  {
    key: "cdsCreated",
    title: "CDS Account Created",
    detail: "Required before buying NSE securities."
  },
  {
    key: "brokerOpened",
    title: "Broker Account Opened",
    detail: "Your broker account is active and ready."
  },
  {
    key: "brokerFunded",
    title: "Broker Account Funded",
    detail: "Cash is available for your first investment."
  },
  {
    key: "starterPortfolioReady",
    title: "Starter Portfolio Ready",
    detail: "Coach G has built your starter allocation."
  }
];

export default function BrokerStatus() {
  const [profile, setProfile] = useState(null);
  const [brokerProfile, setBrokerProfile] = useState(null);
  const [status, setStatus] = useState({
    brokerSelected: false,
    cdsCreated: false,
    brokerOpened: false,
    brokerFunded: false,
    starterPortfolioReady: false,
    readyToInvest: false
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const profileRaw = await userGetItem("investorProfile");
    const statusRaw = await userGetItem("brokerReadiness");
    const portfolioRaw = await userGetItem("portfolio");
    const cashRaw = await userGetItem("availableCash");
    const brokerRaw = await userGetItem("brokerProfile");

    let nextStatus = { ...status };

    if (profileRaw) {
      setProfile(JSON.parse(profileRaw));
    }

    if (brokerRaw) {
      const savedBroker = JSON.parse(brokerRaw);
      setBrokerProfile(savedBroker);

      if (
        savedBroker?.broker ||
        savedBroker?.name ||
        savedBroker?.brokerName
      ) {
        nextStatus.brokerSelected = true;
      }
    }

    if (portfolioRaw) {
      const holdings = JSON.parse(portfolioRaw);
      nextStatus.starterPortfolioReady =
        Array.isArray(holdings) && holdings.length > 0;
    }

    if (cashRaw && Number(cashRaw || 0) > 0) {
      nextStatus.brokerFunded = true;
    }

    if (statusRaw) {
      nextStatus = {
        ...nextStatus,
        ...JSON.parse(statusRaw)
      };
    }

    nextStatus.readyToInvest = isReady(nextStatus);

    setStatus(nextStatus);
  }

  function isReady(nextStatus) {
    return (
      nextStatus.brokerSelected &&
      nextStatus.cdsCreated &&
      nextStatus.brokerOpened &&
      nextStatus.brokerFunded &&
      nextStatus.starterPortfolioReady
    );
  }

  async function toggleStep(key) {
    const nextStatus = {
      ...status,
      [key]: !status[key]
    };

    nextStatus.readyToInvest = isReady(nextStatus);

    setStatus(nextStatus);
    await userSetItem("brokerReadiness", JSON.stringify(nextStatus));
  }

  async function saveAndContinue() {
    const nextStatus = {
      ...status,
      readyToInvest: isReady(status)
    };

    await userSetItem("brokerReadiness", JSON.stringify(nextStatus));
    setStatus(nextStatus);

    if (nextStatus.readyToInvest) {
      Alert.alert("Ready", "You are ready for first trade simulation.");
      router.push("/first-trade");
      return;
    }

    Alert.alert("Saved", "Broker readiness checklist saved.");
    router.replace("/onboarding/smart-portfolio");
  }

  const completed = useMemo(() => {
    return steps.filter((step) => status[step.key]).length;
  }, [status]);

  const recommendedBroker =
    brokerProfile?.broker ||
    brokerProfile?.name ||
    brokerProfile?.brokerName ||
    profile?.broker?.name ||
    "Not selected yet";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Practice Broker Readiness</Text>

      <Text style={styles.subtitle}>
        Practice-only checklist for learning before your first simulated investment. This is separate from REAL broker synchronization.
      </Text>

      <View style={styles.brokerCard}>
        <Text style={styles.cardTitle}>Recommended Broker</Text>
        <Text style={styles.brokerName}>{recommendedBroker}</Text>

        <Text style={styles.body}>
          This does not connect to a broker yet. It helps Coach G guide you from
          profile completion to first trade readiness.
        </Text>
      </View>

      <View style={styles.progressCard}>
        <Text style={styles.cardTitle}>Readiness Progress</Text>

        <Text style={styles.progressBig}>
          {completed}/{steps.length}
        </Text>

        <Text style={styles.body}>
          {status.readyToInvest
            ? "You are ready to simulate your first trade."
            : "Complete the checklist before placing your first simulated trade."}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Checklist</Text>

        {steps.map((step) => (
          <Pressable
            key={step.key}
            style={[
              styles.stepRow,
              status[step.key] && styles.stepRowDone
            ]}
            onPress={() => toggleStep(step.key)}
          >
            <View style={styles.checkCircle}>
              <Text style={styles.checkText}>
                {status[step.key] ? "✓" : ""}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDetail}>{step.detail}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Future Integration</Text>

        <Text style={styles.noticeText}>
          Later, this page can connect directly to broker APIs to verify account
          status, pull reports, and execute approved buy or sell orders.
        </Text>
      </View>

      <Pressable style={styles.primary} onPress={saveAndContinue}>
        <Text style={styles.primaryText}>
          {status.readyToInvest
            ? "Go to First Trade Simulation"
            : "Save Readiness Status"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 100 },
  title: { color: "white", fontSize: 34, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  brokerCard: {
    marginTop: 22,
    backgroundColor: "rgba(147,51,234,.12)",
    borderColor: "rgba(147,51,234,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  progressCard: {
    marginTop: 22,
    backgroundColor: "rgba(6,182,212,.10)",
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
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  brokerName: {
    color: "white",
    fontSize: 24,
    fontWeight: "900"
  },
  progressBig: {
    color: "white",
    fontSize: 42,
    fontWeight: "900"
  },
  body: {
    color: "#cbd5e1",
    marginTop: 8,
    lineHeight: 21
  },
  stepRow: {
    marginTop: 12,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    gap: 14,
    alignItems: "center"
  },
  stepRowDone: {
    borderColor: "rgba(34,197,94,.45)",
    backgroundColor: "rgba(34,197,94,.08)"
  },
  checkCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderColor: "#67e8f9",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  checkText: {
    color: "#86efac",
    fontWeight: "900"
  },
  stepTitle: {
    color: "white",
    fontWeight: "900"
  },
  stepDetail: {
    color: "#94a3b8",
    marginTop: 4,
    lineHeight: 19
  },
  notice: {
    marginTop: 22,
    backgroundColor: "rgba(245,158,11,.10)",
    borderColor: "rgba(245,158,11,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  noticeTitle: {
    color: "#fde68a",
    fontWeight: "900"
  },
  noticeText: {
    color: "#cbd5e1",
    marginTop: 8,
    lineHeight: 20
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
  }
});
