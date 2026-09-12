import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { loadBrokerResolutionLedger } from "../src/features/broker-sync/brokerResolutionLedgerStore";
import {
  DeveloperIdentifier, IssuePager, MetricStrip, MobileHeader,
  MobileScreen, StatusBanner, StickyActionBar
} from "../src/components/mobile/MobileUI";

export default function BrokerResolutionLedger() {
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState([]);
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => { loadLedger(); }, []));

  async function loadLedger() {
    try {
      setLoading(true);
      setError("");
      const result = await loadBrokerResolutionLedger();
      setLedger(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(loadError?.message || "Unable to load the resolution ledger.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MobileScreen
      testID="resolution-ledger-mobile"
      footer={<StickyActionBar secondaryLabel="Completion" onSecondary={() => router.replace("/broker-reconciliation-insight")} primaryLabel="Sync History" onPrimary={() => router.push("/broker-sync-history")} />}
    >
      <DeveloperIdentifier>PC-030M3C</DeveloperIdentifier>
      <MobileHeader title="Practice Decision Ledger" subtitle="A sandbox record of how Practice reconciliation differences were explained." onBack={() => router.replace("/broker-reconciliation-insight")} actionLabel="Refresh" onAction={loadLedger} />
      <StatusBanner tone="warning" title="PRACTICE ONLY" message="These notes cannot modify REAL holdings, cash, performance, or broker records." />

      {loading ? <StatusBanner tone="info" title="Loading decision history…" /> : null}
      {error ? <StatusBanner tone="danger" title="Ledger unavailable" message={error} /> : null}

      <StatusBanner tone="info" title="Decisions, not transactions" message="This ledger does not modify holdings, move cash, or submit broker instructions." />

      <MetricStrip items={[
        { label: "Decisions", value: ledger.length },
        { label: "Latest Symbol", value: ledger[0]?.symbol || "None" },
        { label: "Latest Decision", value: ledger[0]?.resolutionLabel || "None" }
      ]} />

      {ledger.length ? (
        <IssuePager issues={ledger} itemLabel="Decision" getItemTitle={(event) => event.symbol || "ACCOUNT"} renderIssue={(event) => <LedgerEvent event={event} />} />
      ) : (
        <StatusBanner tone="info" title="No decisions yet" message="Document a reconciliation discrepancy and the decision will appear here." />
      )}
    </MobileScreen>
  );
}

function LedgerEvent({ event }) {
  return (
    <View>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.symbol}>{event.symbol || "ACCOUNT"}</Text>
          <Text style={styles.type}>{friendly(event.discrepancyType)}</Text>
        </View>
        <Text style={styles.status}>{event.status || "RECORDED"}</Text>
      </View>

      <StatusBanner tone="success" title="Documented explanation" message={event.resolutionLabel} />
      {event.previousResolutionCode ? <Text style={styles.previous}>Previous: {friendly(event.previousResolutionCode)}</Text> : null}

      <View style={styles.comparison}>
        <DataRow label="GateCEP Quantity" value={event.gatecepQuantity || 0} />
        <DataRow label="Broker Quantity" value={event.brokerQuantity || 0} />
        <DataRow label="GateCEP Value" value={`KES ${money(event.gatecepValue)}`} />
        <DataRow label="Broker Value" value={`KES ${money(event.brokerValue)}`} />
      </View>

      <Text style={styles.date}>Recorded {formatDate(event.createdAt)}</Text>
      <Text style={styles.source}>{event.source || "BROKER_RECONCILIATION"}</Text>
    </View>
  );
}

function DataRow({ label, value }) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{String(value ?? "N/A")}</Text></View>;
}

function friendly(value) { return String(value || "Unknown").replaceAll("_", " "); }
function money(value) { return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatDate(value) { const date = new Date(value); return value && !Number.isNaN(date.getTime()) ? date.toLocaleString("en-US") : "Unknown"; }

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  flex: { flex: 1 },
  symbol: { color: "white", fontSize: 18, fontWeight: "900" },
  type: { color: "#fbbf24", fontSize: 11, fontWeight: "900", marginTop: 4 },
  status: { color: "#86efac", fontSize: 11, fontWeight: "900" },
  previous: { color: "#94a3b8", marginTop: 12 },
  comparison: { marginTop: 13, backgroundColor: "#020617", borderRadius: 14, paddingHorizontal: 12 },
  row: { minHeight: 45, flexDirection: "row", alignItems: "center", gap: 12, borderBottomColor: "#1e293b", borderBottomWidth: 1 },
  rowLabel: { color: "#94a3b8", flex: 1, fontSize: 12 },
  rowValue: { color: "white", flex: 1, textAlign: "right", fontWeight: "900" },
  date: { color: "#94a3b8", marginTop: 13, fontSize: 12 },
  source: { color: "#67e8f9", marginTop: 4, fontSize: 10, fontWeight: "900" }
});
