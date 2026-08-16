import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { buildBrokerReconciliationInsight } from "../src/features/broker-sync/brokerReconciliationInsightService";
import {
  CollapsibleSection, DeveloperIdentifier, IssuePager, JourneyStepper,
  MetricStrip, MobileHeader, MobileScreen, StatusBanner, StickyActionBar
} from "../src/components/mobile/MobileUI";

const STEPS = ["Evidence", "Compare", "Review", "Resolve", "Complete"];

export default function BrokerReconciliationInsight() {
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => { loadInsight(); }, []));

  async function loadInsight() {
    try {
      setLoading(true);
      setError("");
      setInsight(await buildBrokerReconciliationInsight());
    } catch (loadError) {
      setError(loadError?.message || "Coach G could not analyze the broker reconciliation.");
      setInsight(null);
    } finally {
      setLoading(false);
    }
  }

  const summary = insight?.reconciliation?.summary || {};
  const issues = Array.isArray(insight?.issues) ? insight.issues : [];
  const inSync = insight?.classification === "IN_SYNC";

  return (
    <MobileScreen
      testID="broker-completion-mobile"
      footer={
        <StickyActionBar
          secondaryLabel="Resolution"
          onSecondary={() => router.replace("/broker-resolution")}
          primaryLabel="Finish & Return to Portfolio"
          onPrimary={() => router.replace("/portfolio-hub")}
          primaryDisabled={loading}
        />
      }
    >
      <DeveloperIdentifier>PC-030M3C</DeveloperIdentifier>
      <MobileHeader title="Reconciliation Insight" subtitle="Step 5: understand the result and the next responsible action." onBack={() => router.replace("/broker-resolution")} actionLabel="Refresh" onAction={loadInsight} />
      <JourneyStepper steps={STEPS} activeIndex={4} />

      {loading ? <StatusBanner tone="info" title="Coach G is interpreting…" message="Reviewing the current REAL portfolio and verified broker evidence." /> : null}
      {error ? <StatusBanner tone="danger" title="Insight unavailable" message={error} /> : null}

      {insight ? (
        <>
          <StatusBanner
            tone={inSync ? "success" : "warning"}
            title={insight.coachG?.headline || friendly(insight.classification)}
            message={insight.coachG?.explanation}
          />

          <View style={styles.classificationCard}>
            <Text style={styles.classificationLabel}>CLASSIFICATION</Text>
            <Text style={inSync ? styles.classificationGood : styles.classificationReview}>{friendly(insight.classification)}</Text>
          </View>

          <MetricStrip items={[
            { label: "Matched", value: summary.matched || 0 },
            { label: "Different", value: summary.mismatched || 0 },
            { label: "Missing", value: summary.missingAtBroker || 0 },
            { label: "Extra", value: summary.extraAtBroker || 0 }
          ]} />

          <StatusBanner tone={inSync ? "success" : "info"} title="Coach G's next action" message={insight.coachG?.nextAction} />

          {issues.length ? (
            <IssuePager issues={issues} renderIssue={(issue) => <InsightIssue issue={issue} />} />
          ) : (
            <StatusBanner tone="success" title="No reconciliation issues" message="The current holdings and cash evidence match the GateCEP REAL record." />
          )}

          <CollapsibleSection title="Read-Only Protection" summary="Coach G explains; it does not modify portfolios">
            <Text style={styles.caution}>{insight.coachG?.caution}</Text>
          </CollapsibleSection>

          <CollapsibleSection title="History" summary="Decision ledger and synchronization audit">
            <HistoryLink label="Resolution Decision Ledger" route="/broker-resolution-ledger" />
            <HistoryLink label="Broker Sync History" route="/broker-sync-history" />
          </CollapsibleSection>
        </>
      ) : null}
    </MobileScreen>
  );
}

function InsightIssue({ issue }) {
  return (
    <View>
      <Text style={styles.issueType}>{friendly(issue.type)}</Text>
      <Text style={styles.issueMessage}>{issue.message}</Text>
      {Array.isArray(issue.symbols) && issue.symbols.length ? <Text style={styles.symbols}>{issue.symbols.join(" • ")}</Text> : null}
    </View>
  );
}

function HistoryLink({ label, route }) {
  return <Pressable style={styles.historyLink} onPress={() => router.push(route)}><Text style={styles.historyText}>{label}</Text><Text style={styles.arrow}>›</Text></Pressable>;
}

function friendly(value) { return String(value || "Unknown").replaceAll("_", " "); }

const styles = StyleSheet.create({
  classificationCard: { marginTop: 14, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 18, padding: 14 },
  classificationLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "900" },
  classificationGood: { color: "#86efac", fontSize: 19, fontWeight: "900", marginTop: 5 },
  classificationReview: { color: "#fbbf24", fontSize: 19, fontWeight: "900", marginTop: 5 },
  issueType: { color: "#fbbf24", fontWeight: "900" },
  issueMessage: { color: "#cbd5e1", lineHeight: 21, marginTop: 8 },
  symbols: { color: "#67e8f9", fontWeight: "900", marginTop: 10 },
  caution: { color: "#fde68a", lineHeight: 21 },
  historyLink: { backgroundColor: "#020617", padding: 15, borderRadius: 14, marginTop: 8, minHeight: 48, flexDirection: "row", alignItems: "center" },
  historyText: { color: "white", fontWeight: "900", flex: 1 },
  arrow: { color: "#c084fc", fontSize: 23, fontWeight: "900" }
});
