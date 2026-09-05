import React, { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import { calculateExecutionReadiness } from "../src/execution/executionReadiness";

export default function ExecutionWizard() {
  const [readiness, setReadiness] = useState(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const result = await calculateExecutionReadiness();
    setReadiness(result);
  }

  const checks = readiness?.checks || {};

  const brokerReady =
  !!checks.brokerLinked &&
  !!checks.clientNumberPresent;

  const executionReady =
    brokerReady &&
    !!checks.basketExists &&
    !!checks.cashAvailable &&
    !!checks.holdingsLoaded;

  const missingItems = [];

  if (!checks.brokerLinked) missingItems.push("Broker account not linked");
  if (!checks.clientNumberPresent) missingItems.push("Client number missing");
  if (!checks.basketExists) missingItems.push("Trade basket not created");
  if (!checks.cashAvailable) missingItems.push("Cash balance missing");
  if (!checks.holdingsLoaded) missingItems.push("Portfolio not loaded");

  function goToBrokerSetup() {
    router.push("/broker-marketplace");
  }

  function continueFlow() {
    if (executionReady) {
      router.push("/orders-review");
      return;
    }

    goToBrokerSetup();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Execution Wizard</Text>

      <Text style={styles.subtitle}>
        Practice-only path from a Coach G idea to simulated order review. REAL execution occurs only at the broker.
      </Text>

      <ActiveUserBanner />

      <View style={executionReady ? styles.readyCard : styles.notReadyCard}>
        <Text style={styles.cardStatus}>
          {executionReady ? "Execution Ready" : "Execution Not Ready"}
        </Text>

        {executionReady ? (
          <>
            <Text style={styles.cardBody}>
              Broker: {readiness?.broker || "Connected Broker"}
            </Text>
            <Text style={styles.cardBody}>
              Client Number: {readiness?.clientNumber || "Available"}
            </Text>
            <Text style={styles.cardBody}>
              CDS Number: {readiness?.cdsNumber || "Available"}
            </Text>
            <Text style={styles.cardBody}>
              Orders Ready: {readiness?.basketCount || 0}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.cardBody}>
              Complete broker setup before reviewing orders.
            </Text>

            {missingItems.map((item) => (
              <Text key={item} style={styles.missingItem}>
                • {item}
              </Text>
            ))}
          </>
        )}
      </View>

      <Step
        title="Investor Profile"
        passed={checks.investorProfile}
      />

      <Step
        title="Broker Linked"
        passed={checks.brokerLinked}
        action={!checks.brokerLinked ? goToBrokerSetup : null}
      />
      
      <Step
        title="Client Number Present"
        passed={checks.clientNumberPresent}
        action={!checks.clientNumberPresent ? goToBrokerSetup : null}
      />

      <Step
        title="Trade Basket Created"
        passed={checks.basketExists}
      />

      <Step
        title="Cash Available"
        passed={checks.cashAvailable}
      />

      <Step
        title="Portfolio Loaded"
        passed={checks.holdingsLoaded}
      />

      <Pressable
        style={[
          styles.primary,
          !executionReady && styles.brokerSetupButton
        ]}
        onPress={continueFlow}
      >
        <Text style={styles.primaryText}>
          {executionReady
            ? "Continue To Order Review"
            : "Link Broker Account"}
        </Text>
      </Pressable>

      {!executionReady ? (
        <Text style={styles.footerNote}>
          Broker setup is required before orders can move to review and handoff.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function Step({ title, passed, action }) {
  const content = (
    <View style={[styles.step, !passed && action && styles.actionStep]}>
      <Text style={passed ? styles.stepPassed : styles.stepMissing}>
        {passed ? "✓" : "○"} {title}
        {!passed && action ? "  — Tap to complete" : ""}
      </Text>
    </View>
  );

  if (action) {
    return <Pressable onPress={action}>{content}</Pressable>;
  }

  return content;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },
  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 120
  },
  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900"
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 8,
    lineHeight: 22
  },
  readyCard: {
    marginTop: 20,
    backgroundColor: "rgba(34,197,94,.10)",
    borderColor: "rgba(34,197,94,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 20
  },
  notReadyCard: {
    marginTop: 20,
    backgroundColor: "rgba(245,158,11,.10)",
    borderColor: "rgba(245,158,11,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 20
  },
  cardStatus: {
    color: "white",
    fontSize: 24,
    fontWeight: "900"
  },
  cardBody: {
    color: "#cbd5e1",
    marginTop: 10,
    lineHeight: 21
  },
  missingItem: {
    color: "#fde68a",
    marginTop: 8,
    fontWeight: "800"
  },
  step: {
    marginTop: 12,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    padding: 16,
    borderRadius: 16
  },
  actionStep: {
    borderColor: "#9333ea",
    backgroundColor: "rgba(147,51,234,.12)"
  },
  stepPassed: {
    color: "white",
    fontWeight: "900"
  },
  stepMissing: {
    color: "#fbbf24",
    fontWeight: "900"
  },
  primary: {
    marginTop: 24,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  brokerSetupButton: {
    backgroundColor: "#475569",
    borderColor: "#64748b",
    borderWidth: 1
  },
  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  footerNote: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20
  }
});
