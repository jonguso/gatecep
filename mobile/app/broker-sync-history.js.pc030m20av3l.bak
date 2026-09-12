import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { loadBrokerSyncAuditHistory } from "../src/features/broker-sync/brokerSyncAuditStore";
import {
  DeveloperIdentifier, IssuePager, MetricStrip, MobileHeader,
  MobileScreen, StatusBanner, StickyActionBar
} from "../src/components/mobile/MobileUI";

export default function BrokerSyncHistory() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => { loadHistory(); }, []));

  async function loadHistory() {
    try {
      setLoading(true);
      setError("");
      const result = await loadBrokerSyncAuditHistory();
      setHistory(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(loadError?.message || "Unable to load broker synchronization history.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MobileScreen
      testID="broker-sync-history-mobile"
      footer={<StickyActionBar secondaryLabel="Completion" onSecondary={() => router.replace("/broker-reconciliation-insight")} primaryLabel="Return to Sync Center" onPrimary={() => router.replace("/portfolio-sync-center")} />}
    >
      <DeveloperIdentifier>PC-030M3C</DeveloperIdentifier>
      <MobileHeader title="Practice Sync History" subtitle="Review one sandbox reconciliation event at a time." onBack={() => router.replace("/broker-reconciliation-insight")} actionLabel="Refresh" onAction={loadHistory} />
      <StatusBanner tone="warning" title="PRACTICE ONLY" message="This history is isolated from REAL broker synchronization and portfolio evidence." />

      {loading ? <StatusBanner tone="info" title="Loading synchronization history…" /> : null}
      {error ? <StatusBanner tone="danger" title="History unavailable" message={error} /> : null}

      <MetricStrip items={[
        { label: "Events", value: history.length },
        { label: "Latest Status", value: friendly(history[0]?.classification || history[0]?.status || "None") },
        { label: "Latest Broker", value: history[0]?.broker || "None" }
      ]} />

      {history.length ? (
        <IssuePager issues={history} itemLabel="Event" getItemTitle={(event) => friendly(event.classification || event.status)} renderIssue={(event) => <AuditEvent event={event} />} />
      ) : (
        <StatusBanner tone="info" title="No audit events yet" message="Run a verified broker reconciliation to create the first audit record." />
      )}
    </MobileScreen>
  );
}

function AuditEvent({ event }) {
  const issues = Array.isArray(event.issues) ? event.issues : [];
  return (
    <View>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.eventType}>{friendly(event.type)}</Text>
          <Text style={styles.date}>{formatDate(event.createdAt)}</Text>
        </View>
        <Text style={styles.status}>{friendly(event.classification || event.status)}</Text>
      </View>

      <View style={styles.details}>
        <DataRow label="Broker" value={event.broker || "Unknown"} />
        <DataRow label="GateCEP Total" value={`KES ${money(event.gatecepTotal)}`} />
        <DataRow label="Broker Total" value={`KES ${money(event.brokerTotal)}`} />
        <DataRow label="Difference" value={`KES ${money(event.difference)}`} warning />
        <DataRow label="Matched / Different" value={`${event.matched || 0} / ${event.mismatched || 0}`} />
      </View>

      {issues.length ? (
        <View style={styles.issues}>
          <Text style={styles.issuesTitle}>Issues recorded</Text>
          {issues.slice(0, 4).map((issue, index) => <Text key={`${event.id}-${index}`} style={styles.issueText}>• {issue.message || friendly(issue.type)}</Text>)}
        </View>
      ) : <StatusBanner tone="success" title="No issues recorded" />}
    </View>
  );
}

function DataRow({ label, value, warning = false }) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={warning ? styles.rowWarning : styles.rowValue}>{String(value ?? "N/A")}</Text></View>;
}

function friendly(value) { return String(value || "Unknown").replaceAll("_", " "); }
function money(value) { return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatDate(value) { const date = new Date(value); return value && !Number.isNaN(date.getTime()) ? date.toLocaleString("en-US") : "Unknown"; }

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  flex: { flex: 1 },
  eventType: { color: "white", fontSize: 17, fontWeight: "900" },
  date: { color: "#94a3b8", marginTop: 5, fontSize: 12 },
  status: { color: "#fbbf24", fontSize: 11, fontWeight: "900", maxWidth: "42%", textAlign: "right" },
  details: { marginTop: 13, backgroundColor: "#020617", borderRadius: 14, paddingHorizontal: 12 },
  row: { minHeight: 45, flexDirection: "row", alignItems: "center", gap: 12, borderBottomColor: "#1e293b", borderBottomWidth: 1 },
  rowLabel: { color: "#94a3b8", flex: 1, fontSize: 12 },
  rowValue: { color: "white", flex: 1, textAlign: "right", fontWeight: "900" },
  rowWarning: { color: "#fbbf24", flex: 1, textAlign: "right", fontWeight: "900" },
  issues: { marginTop: 13, backgroundColor: "rgba(245,158,11,.08)", borderRadius: 14, padding: 13 },
  issuesTitle: { color: "#fbbf24", fontWeight: "900" },
  issueText: { color: "#cbd5e1", lineHeight: 19, marginTop: 7 }
});
