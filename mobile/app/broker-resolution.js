import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import {
  buildBrokerResolutionWorkflow,
  resolveBrokerDiscrepancy,
  RESOLUTION_OPTIONS
} from "../src/features/broker-sync/brokerResolutionService";
import {
  CollapsibleSection, DeveloperIdentifier, IssuePager, JourneyStepper,
  MetricStrip, MobileHeader, MobileScreen, StatusBanner, StickyActionBar
} from "../src/components/mobile/MobileUI";

const STEPS = ["Evidence", "Compare", "Review", "Resolve", "Complete"];

export default function BrokerResolution() {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => { loadWorkflow(); }, []));

  async function loadWorkflow() {
    try {
      setLoading(true);
      setError("");
      setWorkflow(await buildBrokerResolutionWorkflow());
    } catch (loadError) {
      setError(loadError?.message || "Unable to load reconciliation resolutions.");
    } finally {
      setLoading(false);
    }
  }

  async function resolve(discrepancy, resolutionCode) {
    try {
      setSavingKey(discrepancy.discrepancyKey);
      setError("");
      setWorkflow(await resolveBrokerDiscrepancy({ discrepancy, resolutionCode }));
    } catch (saveError) {
      setError(saveError?.message || "Unable to save the resolution.");
    } finally {
      setSavingKey(null);
    }
  }

  const discrepancies = Array.isArray(workflow?.discrepancies) ? workflow.discrepancies : [];
  const openCount = Number(workflow?.summary?.open || 0);
  const complete = Boolean(workflow) && openCount === 0;

  return (
    <MobileScreen
      testID="broker-resolution-mobile"
      footer={
        <StickyActionBar
          secondaryLabel="Review"
          onSecondary={() => router.replace("/broker-reconciliation-case")}
          primaryLabel={complete ? "Continue to Completion" : `${openCount} ${openCount === 1 ? "Issue" : "Issues"} Remaining`}
          onPrimary={() => router.push("/broker-reconciliation-insight")}
          primaryDisabled={loading || !complete || Boolean(savingKey)}
        />
      }
    >
      <DeveloperIdentifier>PC-030M3B</DeveloperIdentifier>
      <MobileHeader title="Resolve Differences" subtitle="Step 4: document one explanation at a time without changing either portfolio." onBack={() => router.replace("/broker-reconciliation-case")} actionLabel="Refresh" onAction={loadWorkflow} />
      <JourneyStepper steps={STEPS} activeIndex={3} />
      <StatusBanner tone="warning" title="PRACTICE ONLY" message="Resolution choices are sandbox notes. They cannot import, trade, or modify the REAL portfolio." />

      {loading ? <StatusBanner tone="info" title="Loading resolutions…" message="Checking the current case and decision ledger." /> : null}
      {error ? <StatusBanner tone="danger" title="Resolution unavailable" message={error} /> : null}

      {workflow ? (
        <>
          <StatusBanner
            tone={complete ? "success" : "warning"}
            title={complete ? "Every difference is documented" : "Resolution required"}
            message={complete ? "Continue to Coach G's completion insight." : "Choose the explanation that best describes the displayed difference."}
          />

          <MetricStrip items={[
            { label: "Issues", value: workflow.summary?.total || 0 },
            { label: "Open", value: openCount },
            { label: "Resolved", value: workflow.summary?.resolved || 0 },
            { label: "Matched", value: workflow.reconciliation?.summary?.matched || 0 }
          ]} />

          {discrepancies.length ? (
            <IssuePager
              issues={discrepancies}
              renderIssue={(discrepancy) => (
                <ResolutionIssue
                  discrepancy={discrepancy}
                  saving={savingKey === discrepancy.discrepancyKey}
                  onResolve={resolve}
                />
              )}
            />
          ) : (
            <StatusBanner tone="success" title="Everything matches" message="There are no broker discrepancies requiring resolution." />
          )}

          <CollapsibleSection title="Read-Only Protection" summary="These decisions do not move money">
            <Text style={styles.protectionText}>Resolution choices document why a difference exists. They do not add, remove, buy, sell, transfer, or automatically import an investment.</Text>
          </CollapsibleSection>

          <CollapsibleSection title="Audit & History" summary="Review the permanent decision record">
            <RouteButton label="Resolution Ledger" onPress={() => router.push("/broker-resolution-ledger")} />
            <RouteButton label="Broker Sync History" onPress={() => router.push("/broker-sync-history")} />
          </CollapsibleSection>
        </>
      ) : null}
    </MobileScreen>
  );
}

function ResolutionIssue({ discrepancy, saving, onResolve }) {
  const resolved = discrepancy?.resolution?.status === "RESOLVED";
  return (
    <View>
      <View style={styles.issueHeader}>
        <View style={styles.flex}>
          <Text style={styles.issueTitle}>{discrepancy.title}</Text>
          <Text style={styles.issueType}>{friendly(discrepancy.type)}</Text>
        </View>
        <Text style={resolved ? styles.resolved : styles.open}>{resolved ? "RESOLVED" : "OPEN"}</Text>
      </View>

      <Text style={styles.description}>{discrepancy.description}</Text>

      {discrepancy.resolution ? <StatusBanner tone="success" title="Current explanation" message={discrepancy.resolution.resolutionLabel} /> : null}

      <Text style={styles.chooseLabel}>Choose an explanation</Text>
      {RESOLUTION_OPTIONS.map((option) => {
        const selected = discrepancy?.resolution?.resolutionCode === option.code;
        return (
          <Pressable key={option.code} disabled={saving} style={[styles.option, selected && styles.optionSelected]} onPress={() => onResolve(discrepancy, option.code)}>
            <View style={[styles.radio, selected && styles.radioSelected]} />
            <View style={styles.flex}>
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
          </Pressable>
        );
      })}
      {saving ? <ActivityIndicator color="#67e8f9" style={styles.saving} /> : null}
    </View>
  );
}

function RouteButton({ label, onPress }) {
  return <Pressable style={styles.routeButton} onPress={onPress}><Text style={styles.routeText}>{label}</Text><Text style={styles.arrow}>›</Text></Pressable>;
}

function friendly(value) { return String(value || "Unknown").replaceAll("_", " "); }

const styles = StyleSheet.create({
  issueHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  flex: { flex: 1 },
  issueTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  issueType: { color: "#fbbf24", fontSize: 11, fontWeight: "900", marginTop: 5 },
  resolved: { color: "#86efac", fontWeight: "900", fontSize: 11 },
  open: { color: "#fbbf24", fontWeight: "900", fontSize: 11 },
  description: { color: "#cbd5e1", lineHeight: 20, marginTop: 12 },
  chooseLabel: { color: "#94a3b8", fontWeight: "900", marginTop: 18, marginBottom: 7 },
  option: { flexDirection: "row", alignItems: "flex-start", gap: 11, backgroundColor: "#020617", borderColor: "#334155", borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 8, minHeight: 58 },
  optionSelected: { backgroundColor: "rgba(16,185,129,.10)", borderColor: "#10b981" },
  radio: { width: 18, height: 18, borderRadius: 9, borderColor: "#64748b", borderWidth: 2, marginTop: 2 },
  radioSelected: { borderColor: "#34d399", backgroundColor: "#34d399" },
  optionTitle: { color: "white", fontWeight: "900" },
  optionTitleSelected: { color: "#86efac" },
  optionDescription: { color: "#94a3b8", lineHeight: 18, marginTop: 4, fontSize: 12 },
  saving: { marginTop: 14 },
  protectionText: { color: "#fde68a", lineHeight: 21 },
  routeButton: { marginTop: 9, backgroundColor: "#020617", padding: 14, borderRadius: 14, flexDirection: "row", alignItems: "center", minHeight: 48 },
  routeText: { color: "white", fontWeight: "900", flex: 1 },
  arrow: { color: "#c084fc", fontSize: 24, fontWeight: "900" }
});
