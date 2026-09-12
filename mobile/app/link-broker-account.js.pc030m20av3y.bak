import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { router } from "expo-router";

import { upsertBrokerAccount } from "../src/brokers/brokerAccountStore";

export default function LinkBrokerAccount() {
  const [brokerId, setBrokerId] = useState("AIB");
  const [clientNumber, setClientNumber] = useState("");
  const [nickname, setNickname] = useState("");

  async function save() {
    await upsertBrokerAccount({
      brokerId,
      clientNumber,
      nickname,
      defaultBroker: true
    });

    Alert.alert("Broker Linked", "Broker account saved.");
    router.replace("/broker-accounts");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Link Broker Account</Text>
      <Text style={styles.subtitle}>
        Add your broker client number. CDS is user-level and not used as the broker account key.
      </Text>

      <Text style={styles.label}>Broker ID</Text>
      <TextInput value={brokerId} onChangeText={setBrokerId} style={styles.input} />

      <Text style={styles.label}>Client Number</Text>
      <TextInput value={clientNumber} onChangeText={setClientNumber} style={styles.input} />

      <Text style={styles.label}>Nickname</Text>
      <TextInput value={nickname} onChangeText={setNickname} style={styles.input} />

      <Pressable style={styles.primary} onPress={save}>
        <Text style={styles.primaryText}>Save Broker Account</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 100 },
  title: { color: "white", fontSize: 32, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  label: { color: "#94a3b8", marginTop: 18 },
  input: {
    marginTop: 8,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    color: "white"
  },
  primary: {
    marginTop: 24,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" }
});