import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { userGetItem } from "../src/auth/userStorage";
import { loadUnifiedPortfolio } from "../src/portfolio/unifiedPortfolioApi";
import { loadBrokerMirror } from "../src/features/broker-sync/brokerSyncService";
import { buildBrokerReconciliation } from "../src/features/broker-sync/brokerReconciliationService";
import ActiveUserBanner from "../src/components/ActiveUserBanner";
import {
  CollapsibleSection,
  DeveloperIdentifier,
  JourneyStepper,
  MetricStrip,
  MobileHeader,
  MobileScreen,
  StatusBanner,
  StickyActionBar
} from "../src/components/mobile/MobileUI";

const STEPS = ["Evidence", "Compare", "Review", "Resolve", "Complete"];

export default function PortfolioSyncCenter() {
  const [state, setState] = useState({ loading: true, error: "", holdingsCount: 0, portfolioValue: 0, cash: 0, source: "", mirror: null, reconciliation: null });

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const [portfolio, cashRaw, mirror, reconciliation] = await Promise.all([
        loadUnifiedPortfolio(),
        userGetItem("availableCash"),
        loadBrokerMirror(),
        buildBrokerReconciliation()
      ]);
      const holdings = portfolio?.holdings || [];
      setState({
        loading: false,
        error: "",
        holdingsCount: holdings.length,
        portfolioValue: holdings.reduce((sum, item) => sum + Number(item.marketValue || item.value || 0), 0),
        cash: Number(cashRaw || 0),
        source: portfolio?.priceSource || portfolio?.source || "",
        mirror,
        reconciliation
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error?.message || "Unable to load the REAL synchronization state." }));
    }
  }

  const valuationReady = Boolean(state.mirror);
  const cashEvidenceReady = state.mirror?.cashEvidenceAvailable === true;
  const evidenceReady = valuationReady && cashEvidenceReady;

  function continueJourney() {
    if (!valuationReady) return router.push("/import-portfolio?mode=RECONCILE");
    if (!cashEvidenceReady) return router.push("/(tabs)/funds?mode=RECONCILE");
    router.push("/broker-reconciliation");
  }

  const primaryLabel = !valuationReady
    ? "Upload Portfolio Valuation"
    : !cashEvidenceReady
    ? "Upload Cash / Ledger Evidence"
    : "Continue to Comparison";

  return (
    <MobileScreen
      testID="portfolio-sync-mobile"
      footer={
        <StickyActionBar
          secondaryLabel="Portfolio"
          onSecondary={() => router.replace("/portfolio-hub")}
          primaryLabel={primaryLabel}
          onPrimary={continueJourney}
        />
      }
    >
      <DeveloperIdentifier>PC-030M3A</DeveloperIdentifier>
      <MobileHeader
        title="Sync & Reconcile"
        subtitle="Step 1: collect independent broker evidence without changing the canonical REAL portfolio."
        onBack={() => router.replace("/portfolio-hub")}
        actionLabel="History"
        onAction={() => router.push("/broker-sync-history")}
      />
      <JourneyStepper steps={STEPS} activeIndex={0} />
      <ActiveUserBanner />

      {state.error ? <StatusBanner tone="danger" title="REAL data unavailable" message={state.error} /> : null}

      <MetricStrip items={[
        { label: "REAL Holdings", value: state.loading ? "…" : state.holdingsCount },
        { label: "REAL Portfolio", value: `KES ${money(state.portfolioValue)}` },
        { label: "REAL Cash", value: `KES ${money(state.cash)}` }
      ]} />

      <StatusBanner
        tone={evidenceReady ? "success" : "warning"}
        title={evidenceReady ? "Broker evidence complete" : "Broker evidence required"}
        message={evidenceReady
          ? "Portfolio valuation and cash/ledger evidence are ready for comparison."
          : "Both the current portfolio valuation and cash/ledger statement are required."}
      />

      <View style={styles.card}>
        <EvidenceRow
          label="Portfolio Valuation"
          ready={valuationReady}
          value={valuationReady ? `${state.mirror.holdings?.length || 0} holdings • ${state.mirror.accountName || state.mirror.broker}` : "Required"}
          actionLabel={valuationReady ? "Replace" : "Upload"}
          onPress={() => router.push("/import-portfolio?mode=RECONCILE")}
        />
        <EvidenceRow
          label="Cash / Ledger Statement"
          ready={cashEvidenceReady}
          value={cashEvidenceReady ? `KES ${money(state.mirror.cashBalance)}` : valuationReady ? "Required to complete comparison" : "Upload valuation first"}
          actionLabel={cashEvidenceReady ? "Replace" : "Upload"}
          disabled={!valuationReady}
          onPress={() => router.push("/(tabs)/funds?mode=RECONCILE")}
        />
      </View>

      <CollapsibleSection title="Connected Broker API" summary="Optional when a live adapter is available">
        <Text style={styles.body}>A live broker adapter can supply both valuation and cash evidence. Pending API profiles do not count as synchronized.</Text>
        <ActionButton label="Open Connected Broker Sync" onPress={() => router.push("/broker-sync")} />
      </CollapsibleSection>

      <CollapsibleSection title="Manage Canonical REAL Data" summary="Initial portfolio, cash, transactions, and manual entry">
        <Text style={styles.body}>These actions change or establish GateCEP's REAL record. They are separate from read-only reconciliation evidence.</Text>
        <ActionButton label="Create Initial REAL Portfolio" onPress={() => router.push("/broker-upload")} />
        <ActionButton label="Update REAL Cash" onPress={() => router.push("/(tabs)/funds")} />
        <ActionButton label="Upload Transaction History" onPress={() => router.push("/transactions-upload")} />
        <ActionButton label="Manual Portfolio Entry" onPress={() => router.push("/manual-portfolio-entry")} />
      </CollapsibleSection>

      {state.reconciliation?.status && evidenceReady ? (
        <StatusBanner
          tone={state.reconciliation.status === "MATCHED" ? "success" : "info"}
          title={`Latest comparison: ${friendlyStatus(state.reconciliation.status)}`}
          message="Continue to review the current comparison."
        />
      ) : null}
    </MobileScreen>
  );
}

function EvidenceRow({ label, ready, value, actionLabel, onPress, disabled = false }) {
  return (
    <View style={styles.evidenceRow}>
      <View style={styles.evidenceText}>
        <Text style={styles.evidenceLabel}>{label}</Text>
        <Text style={styles.evidenceValue}>{value}</Text>
        <Text style={ready ? styles.ready : styles.required}>{ready ? "READY" : "REQUIRED"}</Text>
      </View>
      <Pressable style={[styles.smallButton, disabled && styles.disabled]} disabled={disabled} onPress={onPress}>
        <Text style={styles.smallButtonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function ActionButton({ label, onPress }) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionButtonText}>{label}</Text>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

function friendlyStatus(value) { return String(value || "").replaceAll("_", " "); }
function money(value) { return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const styles = StyleSheet.create({
  card: { marginTop: 14, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  evidenceRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, borderBottomColor: "#1e293b", borderBottomWidth: 1 },
  evidenceText: { flex: 1 },
  evidenceLabel: { color: "white", fontWeight: "900", fontSize: 15 },
  evidenceValue: { color: "#94a3b8", marginTop: 4, lineHeight: 18, fontSize: 12 },
  ready: { color: "#86efac", fontWeight: "900", fontSize: 10, marginTop: 6 },
  required: { color: "#fbbf24", fontWeight: "900", fontSize: 10, marginTop: 6 },
  smallButton: { backgroundColor: "#1e293b", borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13 },
  smallButtonText: { color: "#67e8f9", fontWeight: "900", fontSize: 12 },
  disabled: { opacity: 0.4 },
  body: { color: "#cbd5e1", lineHeight: 20 },
  actionButton: { marginTop: 10, backgroundColor: "#020617", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center" },
  actionButtonText: { color: "white", fontWeight: "900", flex: 1 },
  arrow: { color: "#c084fc", fontSize: 24, fontWeight: "900" }
});
