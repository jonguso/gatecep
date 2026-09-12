import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { buildBrokerReconciliation } from "../src/features/broker-sync/brokerReconciliationService";
import {
  CollapsibleSection,
  DeveloperIdentifier,
  IssuePager,
  JourneyStepper,
  MetricStrip,
  MobileHeader,
  MobileScreen,
  StatusBanner,
  StickyActionBar
} from "../src/components/mobile/MobileUI";

const STEPS = ["Evidence", "Compare", "Review", "Resolve", "Complete"];

export default function BrokerReconciliation() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => { loadReconciliation(); }, []));

  async function loadReconciliation() {
    try {
      setLoading(true);
      setError("");
      setResult(await buildBrokerReconciliation());
    } catch (loadError) {
      setError(loadError?.message || "Unable to compare the Practice broker evidence.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const status = result?.status || "NOT_READY";
  const cashRequired = status === "CASH_EVIDENCE_REQUIRED";
  const matched = status === "MATCHED";
  const issues = (result?.holdings || []).filter((item) => item.status !== "MATCHED");

  function primaryAction() {
    if (!result?.brokerMirror) return router.replace("/starter-plan");
    if (cashRequired) return router.push("/starter-plan");
    if (matched) return router.push("/broker-reconciliation-insight");
    return router.push("/broker-reconciliation-case");
  }

  const primaryLabel = !result?.brokerMirror
    ? "Return to Evidence"
    : cashRequired
    ? "Upload Cash / Ledger Evidence"
    : matched
    ? "Continue to Completion"
    : "Review Differences";

  return (
    <MobileScreen
      testID="broker-reconciliation-mobile"
      footer={
        <StickyActionBar
          secondaryLabel="Evidence"
          onSecondary={() => router.replace("/starter-plan")}
          primaryLabel={primaryLabel}
          onPrimary={primaryAction}
          primaryDisabled={loading}
        />
      }
    >
      <DeveloperIdentifier>PC-030M3A</DeveloperIdentifier>
      <MobileHeader
        title="Practice Reconciliation"
        subtitle="Practice only: compare sandbox evidence without touching your REAL portfolio."
        onBack={() => router.replace("/starter-plan")}
        actionLabel="Refresh"
        onAction={loadReconciliation}
      />
      <JourneyStepper steps={STEPS} activeIndex={1} />
      <StatusBanner tone="warning" title="PRACTICE ONLY" message="This journey cannot read or update REAL holdings, cash, performance history, or connected-broker source-of-truth records." />

      {loading ? <StatusBanner tone="info" title="Comparing evidence…" message="Checking holdings, cash, and total account value." /> : null}
      {error ? <StatusBanner tone="danger" title="Comparison unavailable" message={error} /> : null}

      {result ? (
        <>
          <StatusBanner
            tone={statusTone(status)}
            title={friendlyStatus(status)}
            message={result.message}
          />

          <MetricStrip items={[
            { label: "Matched", value: result.summary?.matched || 0 },
            { label: "Differences", value: result.summary?.mismatched || 0 },
            { label: "Practice Total", value: `KES ${money(result.realPortfolio?.totalValue)}` },
            { label: "Practice Mirror", value: result.summary?.cashEvidenceAvailable ? `KES ${money(result.brokerMirror?.totalValue)}` : "Practice evidence required" }
          ]} />

          <View style={styles.summaryCard}>
            <ComparisonRow label="Holdings" value={`${result.summary?.matched || 0} matched • ${result.summary?.mismatched || 0} different`} tone={result.summary?.mismatched ? "warning" : "success"} />
            <ComparisonRow
              label="Cash / Ledger"
              value={result.summary?.cashReconciliationStatus === "EVIDENCE_REQUIRED"
                ? "Evidence required"
                : result.summary?.cashReconciliationStatus === "MATCHED"
                ? "Matched"
                : `Difference: KES ${money(result.summary?.cashDifference)}`}
              tone={result.summary?.cashReconciliationStatus === "MATCHED" ? "success" : "warning"}
            />
            <ComparisonRow
              label="Total Difference"
              value={result.summary?.cashEvidenceAvailable ? `KES ${money(result.summary?.totalDifference)}` : "N/A until cash evidence is supplied"}
              tone={result.summary?.cashEvidenceAvailable && Math.abs(Number(result.summary?.totalDifference || 0)) < 0.01 ? "success" : "warning"}
            />
          </View>

          {issues.length ? (
            <IssuePager issues={issues} renderIssue={(issue) => <IssueCard issue={issue} />} />
          ) : null}

          <CollapsibleSection title="History & Operations" summary="Cases, actions, and synchronization history">
            <ActionButton label="Current Reconciliation Case" onPress={() => router.push("/broker-reconciliation-case")} />
            <ActionButton label="Correction Action Center" onPress={() => router.push("/broker-reconciliation-actions")} />
            <ActionButton label="Case History" onPress={() => router.push("/broker-reconciliation-cases")} />
            <ActionButton label="Sync History" onPress={() => router.push("/broker-sync-history")} />
          </CollapsibleSection>
        </>
      ) : null}
    </MobileScreen>
  );
}

function ComparisonRow({ label, value, tone }) {
  return (
    <View style={styles.comparisonRow}>
      <View style={styles.holdingText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.meta}>{value}</Text>
      </View>
      <View style={[styles.statusDot, tone === "success" ? styles.dotGood : styles.dotWarn]} />
    </View>
  );
}

function IssueCard({ issue }) {
  return (
    <View>
      <Text style={styles.issueTitle}>{friendlyStatus(issue.status)}</Text>
      <ComparisonRow label="GateCEP Quantity" value={String(issue.real?.quantity || 0)} tone="info" />
      <ComparisonRow label="Broker Quantity" value={String(issue.broker?.quantity || 0)} tone="info" />
      <ComparisonRow label="Quantity Difference" value={String(issue.quantityDifference || 0)} tone="warning" />
      <ComparisonRow label="Value Difference" value={`KES ${money(issue.valueDifference)}`} tone="warning" />
    </View>
  );
}

function ActionButton({ label, onPress }) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionText}>{label}</Text>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

function statusTone(status) {
  if (status === "MATCHED") return "success";
  if (status === "OUT_OF_SYNC") return "danger";
  return "warning";
}

function friendlyStatus(value) { return String(value || "").replaceAll("_", " "); }
function money(value) { return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const styles = StyleSheet.create({
  summaryCard: { marginTop: 4, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  comparisonRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomColor: "#1e293b", borderBottomWidth: 1 },
  holdingText: { flex: 1 },
  rowLabel: { color: "white", fontWeight: "900" },
  meta: { color: "#94a3b8", marginTop: 4, fontSize: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dotGood: { backgroundColor: "#22c55e" },
  dotWarn: { backgroundColor: "#f59e0b" },
  issueTitle: { color: "#fbbf24", fontSize: 17, fontWeight: "900", marginBottom: 6 },
  actionButton: { marginTop: 9, backgroundColor: "#020617", padding: 14, borderRadius: 14, flexDirection: "row", alignItems: "center" },
  actionText: { color: "white", fontWeight: "900", flex: 1 },
  arrow: { color: "#c084fc", fontSize: 24, fontWeight: "900" }
});
