import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import {
  userGetItem,
  userSetItem,
  userRemoveItem
} from "../src/auth/userStorage";

import {
  getUserBrokers,
  addUserBroker
} from "../src/features/brokers/api/userBrokerApi";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import { BROKERS } from "../src/constants/brokers";
import { ContainedPanel } from "../src/components/mobile/MobileUI";


export default function BrokerAccountCenter() {
  const [broker, setBroker] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activePanel, setActivePanel] = useState("connected");

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
  const brokerResult = await getUserBrokers();
const brokerList = brokerResult?.brokers || [];

setBroker(brokerList.length ? brokerList[0] : null);

  const profileRaw = await userGetItem("investorProfile");

  setProfile(
    profileRaw
      ? JSON.parse(profileRaw)
      : null
  );
}

  async function connectBroker(item) {
  try {
    const broker = await addUserBroker({
  broker: item.code,
  brokerName: item.name,
  clientNumber: "",
  cdsNumber: ""
});

    setBroker(broker);

    Alert.alert(
      "Broker Added",
      `${item.name} added successfully`
    );
  } catch (error) {
    Alert.alert(
      "Unable to add broker",
      error.message
    );
  }
}

  async function disconnectBroker() {
    await userRemoveItem("brokerProfile");
    await userSetItem("brokerProfileSkipped", "true");

    setBroker(null);

    Alert.alert("Broker Removed", "Broker profile removed.");
  }

  function recommendedBroker() {
    const goal = String(profile?.goal || "").toLowerCase();
    const risk = String(profile?.riskTolerance || "").toLowerCase();

    if (goal.includes("income") || goal.includes("retirement")) return "AIB";
    if (risk.includes("aggressive")) return "ABC Capital";
    if (goal.includes("growth")) return "NCBA";

    return "AIB";
  }

  const recommended = recommendedBroker();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Broker Account Center</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Connect, change, or review your broker profile. This is demo linking for
        the POC; real broker APIs come later.
      </Text>

      <ActiveUserBanner />

      <View style={styles.panelTabs}>
        {["connected", "recommendation", "supported"].map((item) => (
          <Pressable key={item} style={[styles.panelTab, activePanel === item && styles.panelTabActive]} onPress={() => setActivePanel(item)}>
            <Text style={[styles.panelTabText, activePanel === item && styles.panelTabTextActive]}>{item === "connected" ? "Connected" : item === "recommendation" ? "Coach G" : "Brokers"}</Text>
          </Pressable>
        ))}
      </View>

      {activePanel === "connected" ? <ContainedPanel title="Connected Broker" testID="broker-center-connected-panel">

        {broker ? (
          <>
            <Info label="Broker" value={broker.broker || broker.name} />
            <Info label="Status" value={broker.status || "CONNECTED"} />
            <Info label="Best For" value={broker.bestFor || "N/A"} />

            <Pressable style={styles.danger} onPress={disconnectBroker}>
              <Text style={styles.dangerText}>Disconnect Broker</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.body}>No broker connected yet.</Text>
        )}
      </ContainedPanel> : null}

      {activePanel === "recommendation" ? <ContainedPanel title="Coach G Recommendation" testID="broker-center-coach-panel">
        <Text style={styles.body}>
          Based on your current profile, Coach G recommends:
        </Text>

        <Text style={styles.recommended}>{recommended}</Text>
      </ContainedPanel> : null}

      {activePanel === "supported" ? <ContainedPanel title="Supported Brokers" subtitle="Scroll available broker profiles" testID="broker-center-supported-panel">
        {BROKERS.map((item) => (
          <View key={item.name} style={styles.brokerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brokerName}>
              {item.name} {item.recommended ? "★" : ""}
             </Text>
              <Text style={styles.brokerDesc}>{item.bestFor}</Text>
            </View>

            <Pressable
              style={styles.connectButton}
              onPress={() => connectBroker(item)}
            >
              <Text style={styles.connectText}>
                {broker?.broker === item.name ? "Selected" : "Connect"}
              </Text>
            </Pressable>
          </View>
        ))}
      </ContainedPanel> : null}

      <Pressable
        style={styles.secondary}
        onPress={() => router.push("/broker-profile")}
      >
        <Text style={styles.secondaryText}>Open Broker Profile</Text>
      </Pressable>
    </ScrollView>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "N/A"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 100 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 30, fontWeight: "900", flex: 1 },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardButtonText: { color: "#67e8f9", fontWeight: "900" },
  card: {
    marginTop: 20,
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
  panelTabs: { flexDirection: "row", gap: 8, marginTop: 18 },
  panelTab: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  panelTabActive: { backgroundColor: "#9333ea" },
  panelTabText: { color: "#94a3b8", fontWeight: "900", fontSize: 12 },
  panelTabTextActive: { color: "white" },
  body: { color: "#cbd5e1", lineHeight: 21, marginTop: 8 },
  recommended: {
    color: "#fbbf24",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 10
  },
  infoRow: {
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 12
  },
  infoLabel: { color: "#94a3b8", fontSize: 12 },
  infoValue: { color: "white", fontWeight: "900", marginTop: 4 },
  brokerRow: {
    marginTop: 12,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  brokerName: { color: "white", fontWeight: "900", fontSize: 16 },
  brokerDesc: { color: "#94a3b8", marginTop: 5, fontSize: 12 },
  connectButton: {
    backgroundColor: "#9333ea",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12
  },
  connectText: { color: "white", fontWeight: "900", fontSize: 12 },
  secondary: {
    marginTop: 18,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 16
  },
  secondaryText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" },
  danger: {
    marginTop: 16,
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    padding: 15,
    borderRadius: 16
  },
  dangerText: { color: "#fca5a5", textAlign: "center", fontWeight: "900" }
});
