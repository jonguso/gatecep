import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { MobileHeader, MobileScreen, StatusBanner } from "../src/components/mobile/MobileUI";

export default function AccountEdit() {
  return (
    <MobileScreen testID="account-edit-screen">
      <MobileHeader title="Account Edit" subtitle="Account identity settings" onBack={() => router.back()} />
      <StatusBanner tone="info" title="Account editing is not yet available" message="Use Investor Profile Edit for investing goals and Broker Profile for broker details." />

      <Pressable style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Back</Text>
      </Pressable>
    </MobileScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617",
    padding: 24,
    justifyContent: "center"
  },
  title: {
    color: "#f8fafc",
    fontSize: 26,
    fontWeight: "900"
  },
  body: {
    color: "#cbd5e1",
    marginTop: 10,
    fontSize: 15
  },
  button: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    borderRadius: 16,
    padding: 14,
    alignItems: "center"
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "900"
  }
});
