import React, { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { buildBrokerReconciliationCaseWorkflow } from "../src/features/broker-sync/brokerReconciliationCaseService";
import {
  CollapsibleSection, DeveloperIdentifier, IssuePager, JourneyStepper,
  MetricStrip, MobileHeader, MobileScreen, StatusBanner, StickyActionBar
} from "../src/components/mobile/MobileUI";

const STEPS = ["Evidence", "Compare", "Review", "Resolve", "Complete"];

export default function BrokerReconciliationCase() {
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState(null);
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => { loadCase(); }, []));

  async function loadCase() {
    try {
      setLoading(true);
      setError("");
      setWorkflow(await buildBrokerReconciliationCaseWorkflow());
    } catch (loadError) {
      setError(loadError?.message || "Unable to load the broker reconciliation case.");
      setWorkflow(null);
    } finally {
      setLoading(false);
    }
  }

  const currentCase = workflow?.case || null;
  const issues = Array.isArray(currentCase?.issues) ? currentCase.issues : [];
  const evidenceRequired = workflow?.workflowStatus === "EVIDENCE_REQUIRED";
  const inSync = workflow?.workflowStatus === "IN_SYNC";

  function continueJourney() {
    if (evidenceRequired) return router.push("/(tabs)/funds?mode=RECONCILE");
    if (!currentCase || inSync) return router.push("/broker-reconciliation-insight");
    if (currentCase.openCount > 0) return router.push("/broker-resolution");
    return router.push("/broker-reconciliation-insight");
  }

  const primaryLabel = evidenceRequired
    ? "Upload Cash / Ledger Evidence"
    : currentCase?.openCount > 0
    ? `Resolve ${currentCase.openCount} Open ${currentCase.openCount === 1 ? "Issue" : "Issues"}`
    : "Continue to Completion";

  return (
    <MobileScreen
      testID="broker-case-mobile"
      footer={<StickyActionBar secondaryLabel="Comparison" onSecondary={() => router.replace("/broker-reconciliation")} primaryLabel={primaryLabel} onPrimary={continueJourney} primaryDisabled={loading} />}
    >
      <DeveloperIdentifier>PC-030M3B</DeveloperIdentifier>
      <MobileHeader title="Review Reconciliation" subtitle="Step 3: confirm the case evidence before documenting each difference." onBack={() => router.replace("/broker-reconciliation")} actionLabel="Refresh" onAction={loadCase} />
      <JourneyStepper steps={STEPS} activeIndex={2} />

      {loading ? <StatusBanner tone="info" title="Preparing the case…" message="Grouping current discrepancies into one auditable review." /> : null}
      {error ? <StatusBanner tone="danger" title="Case unavailable" message={error} /> : null}
      {evidenceRequired ? <StatusBanner tone="warning" title="Cash evidence required" message="Holdings match, but the cash/ledger statement is still required before GateCEP can open a complete case." /> : null}
      {inSync ? <StatusBanner tone="success" title="Broker account in sync" message="No reconciliation discrepancies currently require a case." /> : null}

      {currentCase ? (
        <>
          <StatusBanner tone={currentCase.status === "RESOLVED" ? "success" : "warning"} title={`Case ${currentCase.status}`} message={currentCase.id} />
          <MetricStrip items={[
            { label: "Issues", value: currentCase.issueCount || 0 },
            { label: "Open", value: currentCase.openCount || 0 },
            { label: "Resolved", value: currentCase.resolvedCount || 0 },
            { label: "Matched", value: currentCase.matched || 0 }
          ]} />

          <View style={styles.valueCard}>
            <DataRow label="GateCEP Total" value={`KES ${money(currentCase.gatecepTotal)}`} />
            <DataRow label="Broker Total" value={`KES ${money(currentCase.brokerTotal)}`} />
            <DataRow label="Total Difference" value={`KES ${money(currentCase.difference)}`} warning />
            <DataRow label="Cash Difference" value={`KES ${money(currentCase.cashDifference)}`} warning />
          </View>

          {issues.length ? <IssuePager issues={issues} renderIssue={(issue) => <CaseIssue issue={issue} />} /> : <StatusBanner tone="success" title="No open evidence issues" message="The case contains no discrepancies requiring review." />}

          <CollapsibleSection title="Case Details" summary={`${currentCase.broker || "Broker"} • ${currentCase.accountName || "Account"}`}>
            <DataRow label="Case ID" value={currentCase.id} />
            <DataRow label="Initial Status" value={friendly(currentCase.initialReconciliationStatus)} />
            <DataRow label="Latest Status" value={friendly(currentCase.latestReconciliationStatus)} />
            <DataRow label="Opened" value={formatDate(currentCase.openedAt)} />
            <DataRow label="Resolved" value={currentCase.resolvedAt ? formatDate(currentCase.resolvedAt) : "Not yet"} />
          </CollapsibleSection>

          <StatusBanner tone="info" title="Review is explanatory" message="Understanding or closing this case does not change broker holdings, cash, or GateCEP portfolio positions." />
        </>
      ) : null}
    </MobileScreen>
  );
}

function CaseIssue({ issue }) {
  const resolved = issue?.resolutionStatus === "RESOLVED";
  return (
    <View>
      <View style={styles.issueHeader}>
        <View style={styles.flex}><Text style={styles.issueTitle}>{issue?.symbol || "ACCOUNT"}</Text><Text style={styles.issueType}>{friendly(issue?.discrepancyType)}</Text></View>
        <Text style={resolved ? styles.resolved : styles.open}>{resolved ? "RESOLVED" : "OPEN"}</Text>
      </View>
      <DataRow label="GateCEP Quantity" value={issue?.gatecepQuantity || 0} />
      <DataRow label="Broker Quantity" value={issue?.brokerQuantity || 0} />
      <DataRow label="GateCEP Value" value={`KES ${money(issue?.gatecepValue)}`} />
      <DataRow label="Broker Value" value={`KES ${money(issue?.brokerValue)}`} />
      {issue?.resolutionLabel ? <StatusBanner tone="success" title="Documented resolution" message={issue.resolutionLabel} /> : null}
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
  valueCard: { marginTop: 2, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 18, overflow: "hidden", paddingHorizontal: 14 },
  row: { minHeight: 48, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 12, borderBottomColor: "#1e293b", borderBottomWidth: 1 },
  rowLabel: { color: "#94a3b8", flex: 1, fontSize: 12 },
  rowValue: { color: "white", flex: 1, textAlign: "right", fontWeight: "900" },
  rowWarning: { color: "#fbbf24", flex: 1, textAlign: "right", fontWeight: "900" },
  issueHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  flex: { flex: 1 },
  issueTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  issueType: { color: "#fbbf24", fontSize: 11, fontWeight: "900", marginTop: 4 },
  open: { color: "#fbbf24", fontWeight: "900", fontSize: 11 },
  resolved: { color: "#86efac", fontWeight: "900", fontSize: 11 }
});
