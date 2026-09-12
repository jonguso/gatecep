import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router } from "expo-router";
import {
  userGetItem,
  userSetItem
} from "../src/auth/userStorage";
import { addUserBroker } from "../src/features/brokers/api/userBrokerApi";
import { BROKERS, getDefaultBroker } from "../src/constants/brokers";
import { ContainedPanel } from "../src/components/mobile/MobileUI";

const brokers = [
"GATECEP-DEMO",
"AIB-AXYS",
"ABC",
"Dyer & Blair",
"NCBA Investment Bank",
"Standard Investment Bank",
"Other"
];

export default function BrokerProfile() {
  const [form, setForm] = useState({
    broker: getDefaultBroker().code,
    clientNumber: "",
    cdsNumber: "",
    brokerEmail: ""
  });

  const [status, setStatus] = useState("");

  useEffect(() => {
    loadExistingProfile();
  }, []);

  async function loadExistingProfile() {
    try {
      const raw = await userGetItem("brokerProfile");

      if (raw) {
        const saved = JSON.parse(raw);

        setForm({
          broker: saved.broker || saved.name || saved.brokerName || "AIB-AXYS",
          clientNumber: saved.clientNumber || "",
          cdsNumber: saved.cdsNumber || "",
          brokerEmail: saved.brokerEmail || ""
        });

        setStatus("Existing broker profile loaded.");
      }
    } catch (error) {
      setStatus(`Could not load broker profile: ${error.message}`);
    }
  }

  async function saveProfile() {
    try {
      const baseProfile = {
        id: `BP-${Date.now()}`,
        broker: form.broker,
        name: form.broker,
        brokerName: form.broker,
        nickname: form.broker,
        clientNumber: form.clientNumber.trim(),
        cdsNumber: form.cdsNumber.trim(),
        brokerEmail: form.brokerEmail.trim(),
        defaultBroker: true,
        linked: false,
        status: "CONNECTED_MANUAL",
        connectionMode: "MANUAL_PROFILE",
        verificationMode: "STATEMENT_MATCH",
        source: "USER_PROVIDED",
        updatedAt: new Date().toISOString()
      };

      await userSetItem("brokerProfile", JSON.stringify(baseProfile));
      await userSetItem("brokerProfileSkipped", "false");
      await userSetItem("defaultBrokerProfile", JSON.stringify(baseProfile));
      await userSetItem("brokerProfiles", JSON.stringify([baseProfile]));

      const cloudBroker = await addUserBroker({
  broker: baseProfile.broker,
  clientNumber: baseProfile.clientNumber,
  cdsNumber: baseProfile.cdsNumber
});

await userSetItem(
  "cloudBrokerProfile",
  JSON.stringify(cloudBroker)
);

      const verify = await userGetItem("brokerProfile");

      if (!verify) {
        throw new Error("Save verification failed.");
      }

      setStatus("Broker profile saved successfully.");
      return true;
    } catch (error) {
      setStatus(`Save failed: ${error.message}`);
      Alert.alert("Save failed", error.message);
      return false;
    }
  }

  async function saveAndContinue() {
    const ok = await saveProfile();

    if (ok) {
      router.push("/broker-upload");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Broker Profile</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        This does not connect to your broker yet. It helps Gatecep match your
        uploaded valuation or statement to the correct broker profile.
      </Text>

      <ContainedPanel title="Broker Identity" subtitle="Scroll to review and save broker matching details" minHeight={420} maxHeight={610} heightRatio={0.66} testID="broker-profile-form-panel">

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Informational Only</Text>
        <Text style={styles.noticeText}>
          Gatecep uses this information to reduce statement mix-ups, especially
          if you use more than one broker.
        </Text>
      </View>

      <Text style={styles.label}>Broker</Text>

      <View style={styles.brokerGrid}>
        {BROKERS.map((broker) => {
  const active = form.broker === broker.code;

  return (
    <Pressable
      key={broker.code}
      onPress={() => setForm({ ...form, broker: broker.code })}
      style={[styles.brokerOption, active && styles.brokerOptionActive]}
    >
      <Text
        style={[
          styles.brokerOptionText,
          active && styles.brokerOptionTextActive
        ]}
      >
        {broker.name}
      </Text>
    </Pressable>
  );
})}
      </View>

      <Input
        label="Client / Account Number"
        placeholder="Optional"
        value={form.clientNumber}
        onChangeText={(value) =>
          setForm({
            ...form,
            clientNumber: value
          })
        }
      />

      <Input
        label="CDS Number"
        placeholder="Optional"
        value={form.cdsNumber}
        onChangeText={(value) =>
          setForm({
            ...form,
            cdsNumber: value
          })
        }
      />

      <Input
        label="Broker Email"
        placeholder="Optional"
        value={form.brokerEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={(value) =>
          setForm({
            ...form,
            brokerEmail: value
          })
        }
      />

      {status ? (
        <View
          style={[
            styles.statusBox,
            status.toLowerCase().includes("failed") ||
            status.toLowerCase().includes("could not")
              ? styles.statusError
              : styles.statusSuccess
          ]}
        >
          <Text style={styles.statusText}>{status}</Text>
        </View>
      ) : null}

      <Pressable style={styles.primaryButton} onPress={saveAndContinue}>
        <Text style={styles.primaryText}>Save and Continue to Upload</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={saveProfile}>
        <Text style={styles.secondaryText}>Save Broker Profile Only</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/broker-account-center")}>
        <Text style={styles.backLink}>Back to Broker Account Center</Text>
      </Pressable>
      </ContainedPanel>
    </ScrollView>
  );
}

function Input({ label, ...props }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        {...props}
        placeholderTextColor="#64748b"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 60 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 32, fontWeight: "900", flex: 1 },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
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
  notice: {
    marginTop: 22,
    backgroundColor: "rgba(6, 182, 212, 0.10)",
    borderColor: "rgba(6, 182, 212, 0.35)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16
  },
  noticeTitle: { color: "#67e8f9", fontWeight: "900" },
  noticeText: { color: "#cbd5e1", marginTop: 8, lineHeight: 20 },
  label: { color: "#94a3b8", fontSize: 13, marginTop: 20, marginBottom: 8 },
  brokerGrid: { gap: 10 },
  brokerOption: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  brokerOptionActive: {
    borderColor: "#9333ea",
    backgroundColor: "rgba(147, 51, 234, 0.18)"
  },
  brokerOptionText: { color: "#cbd5e1", fontWeight: "800" },
  brokerOptionTextActive: { color: "#c084fc" },
  inputWrap: { marginTop: 2 },
  input: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    color: "white"
  },
  statusBox: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  statusSuccess: {
    backgroundColor: "rgba(34, 197, 94, 0.10)",
    borderColor: "rgba(34, 197, 94, 0.35)"
  },
  statusError: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderColor: "rgba(239, 68, 68, 0.35)"
  },
  statusText: { color: "#e2e8f0", lineHeight: 20 },
  primaryButton: {
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18,
    marginTop: 24
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" },
  secondaryButton: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18,
    marginTop: 12
  },
  secondaryText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" },
  backLink: { color: "#94a3b8", textAlign: "center", marginTop: 24 }
});
