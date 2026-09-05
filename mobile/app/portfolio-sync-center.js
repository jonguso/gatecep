import React, { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { userGetItem } from "../src/auth/userStorage";
import { loadUnifiedPortfolio } from "../src/portfolio/unifiedPortfolioApi";
import { loadBrokerMirror } from "../src/features/broker-sync/brokerSyncService";
import { adoptVerifiedBrokerSnapshot, loadAuthoritativeBrokerSnapshotPreview } from "../src/features/broker-sync/brokerAuthoritativeSnapshotService";
import { loadBrokerAccounts } from "../src/services/brokers/brokerAccountStore";
import { hasConnectedRealBrokerAccount } from "../src/features/broker-sync/brokerCashEvidencePolicy";
import ActiveUserBanner from "../src/components/ActiveUserBanner";
import {
  CollapsibleSection,
  DeveloperIdentifier,
  JourneyStepper,
  MetricStrip,
  MobileHeader,
  MobileScreen,
  StatusBanner,
  StickyActionBar,
  ContainedPanel
} from "../src/components/mobile/MobileUI";

const STEPS = ["Verify", "Confirm", "Complete"];

export default function PortfolioSyncCenter() {
  const [state, setState] = useState({ loading: true, saving: false, error: "", holdingsCount: 0, portfolioValue: 0, cash: 0, source: "", mirror: null, preview: null, connectedRealBroker: false });
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [activePanel, setActivePanel] = useState("evidence");

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      const [portfolio, cashRaw, mirror, preview, brokerAccounts] = await Promise.all([
        loadUnifiedPortfolio(),
        userGetItem("availableCash"),
        loadBrokerMirror(),
        loadAuthoritativeBrokerSnapshotPreview(),
        loadBrokerAccounts()
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
        preview,
        connectedRealBroker: hasConnectedRealBrokerAccount(brokerAccounts)
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
    confirmReplacement();
  }

  function confirmReplacement() {
    const next = state.preview?.next;
    if (!next || state.saving) return;
    setConfirmVisible(true);
  }

  async function applyReplacement() {
    try {
      setConfirmVisible(false);
      setState((current) => ({ ...current, saving: true, error: "" }));
      await adoptVerifiedBrokerSnapshot();
      router.replace("/portfolio-hub?brokerSnapshot=ADOPTED");
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error?.message || "Unable to adopt broker snapshot." }));
    }
  }

  const primaryLabel = !valuationReady
    ? "Upload Portfolio Valuation"
    : !cashEvidenceReady
    ? "Upload Cash / Ledger Evidence"
    : state.saving ? "Applying Broker Snapshot…" : "Confirm Broker Snapshot";

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
        subtitle="Verify the broker account, preview its current records, then confirm one authoritative replacement."
        onBack={() => router.replace("/portfolio-hub")}
        actionLabel="History"
        onAction={() => router.push("/broker-sync-history")}
      />
      <JourneyStepper steps={STEPS} activeIndex={evidenceReady ? 1 : 0} />
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
          ? "Identity, portfolio valuation, and cash statement are verified. Confirm once to replace the REAL record."
          : "Both the current portfolio valuation and cash/ledger statement are required."}
      />

      <View style={styles.panelTabs}>
        {["evidence", "api", "manage", "preview"].map((item) => (
          <Pressable key={item} style={[styles.panelTab, activePanel === item && styles.panelTabActive]} onPress={() => setActivePanel(item)}>
            <Text style={[styles.panelTabText, activePanel === item && styles.panelTabTextActive]}>{item === "api" ? "Broker API" : item[0].toUpperCase() + item.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      {activePanel === "evidence" ? <ContainedPanel title="Required Broker Evidence" subtitle="Complete both records before confirmation" testID="real-sync-evidence-panel">
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
      </ContainedPanel> : null}

      {activePanel === "api" ? <ContainedPanel title="Connected Broker API" subtitle="Optional when a live adapter is available" testID="real-sync-api-panel">
        <Text style={styles.body}>A live broker adapter can supply both valuation and cash evidence. Pending API profiles do not count as synchronized.</Text>
        <ActionButton label="Open Connected Broker Sync" onPress={() => router.push("/broker-sync")} />
      </ContainedPanel> : null}

      {activePanel === "manage" ? <ContainedPanel title="Manage Canonical REAL Data" subtitle="Initial portfolio, cash, transactions, and manual entry" testID="real-sync-manage-panel">
        <Text style={styles.body}>These actions change or establish GateCEP's REAL record. They are separate from read-only reconciliation evidence.</Text>
        {state.connectedRealBroker ? (
          <Text style={styles.protection}>A REAL broker is connected. Holdings and cash must now come through verified broker evidence or the live broker adapter.</Text>
        ) : (
          <>
            <ActionButton label="Create Initial REAL Portfolio" onPress={() => router.push("/broker-upload")} />
            <ActionButton label="Set Initial REAL Cash" onPress={() => router.push("/(tabs)/funds")} />
            <ActionButton label="Manual Initial Portfolio" onPress={() => router.push("/manual-portfolio-entry")} />
          </>
        )}
        <ActionButton label="Upload Transaction History" onPress={() => router.push("/transactions-upload")} />
      </ContainedPanel> : null}

      {activePanel === "preview" ? <ContainedPanel title="Authoritative Replacement Preview" subtitle="No change occurs until explicit confirmation" emptyMessage="Complete verified valuation and cash evidence to create a replacement preview." testID="real-sync-preview-panel">
      {state.preview ? (
        <View>
          <Text style={styles.previewTitle}>Replacement preview</Text>
          <Text style={styles.body}>Current: {state.preview.current.holdingsCount} holdings • KES {money(state.preview.current.holdingsValue)} • cash KES {money(state.preview.current.cash)}</Text>
          <Text style={styles.body}>Broker: {state.preview.next.holdingsCount} holdings • KES {money(state.preview.next.holdingsValue)} • cash KES {money(state.preview.next.cash)}</Text>
          <Text style={styles.protection}>Daily prices change current value only. They never change broker quantity, cost basis, or cash.</Text>
        </View>
      ) : null}
      </ContainedPanel> : null}

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !state.saving && setConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="broker-snapshot-confirmation">
            <Text style={styles.modalTitle}>Use broker snapshot as REAL portfolio?</Text>
            <Text style={styles.modalBody}>
              {state.preview?.next?.holdingsCount || 0} holdings (KES {money(state.preview?.next?.holdingsValue)}) and KES {money(state.preview?.next?.cash)} cash will replace GateCEP's current REAL record.
            </Text>
            <Text style={styles.protection}>Broker quantities, cost basis, and cash become authoritative. Daily market prices may change valuation only.</Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                disabled={state.saving}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="confirm-broker-snapshot-replacement"
                style={[styles.modalButton, styles.confirmButton, state.saving && styles.disabled]}
                disabled={state.saving}
                onPress={applyReplacement}
              >
                <Text style={styles.confirmText}>{state.saving ? "Applying…" : "Confirm Replacement"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </MobileScreen>
  );
}

function EvidenceRow({ label, ready, value, actionLabel, onPress, disabled = false }) {
  return (
    <View style={styles.evidenceRow}>
      <View style={styles.evidenceText}>
        <Text style={styles.evidenceLabel}>{label}</Text>
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
  panelTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  panelTab: { minHeight: 42, minWidth: "47%", flexGrow: 1, borderRadius: 13, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  panelTabActive: { backgroundColor: "#9333ea" },
  panelTabText: { color: "#94a3b8", fontWeight: "900", fontSize: 12 },
  panelTabTextActive: { color: "white" },
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
  ,previewTitle: { color: "#67e8f9", fontSize: 17, fontWeight: "900", padding: 15, paddingBottom: 8 },
  protection: { color: "#fbbf24", lineHeight: 19, padding: 15, paddingTop: 8 }
  ,modalBackdrop: { flex: 1, backgroundColor: "rgba(2, 6, 23, 0.86)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 520, backgroundColor: "#0f172a", borderColor: "#7e22ce", borderWidth: 1, borderRadius: 20, padding: 20 },
  modalTitle: { color: "white", fontSize: 20, fontWeight: "900" },
  modalBody: { color: "#cbd5e1", lineHeight: 21, marginTop: 10 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  modalButton: { flex: 1, minHeight: 48, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  cancelButton: { backgroundColor: "#1e293b" },
  confirmButton: { backgroundColor: "#9333ea" },
  cancelText: { color: "#67e8f9", fontWeight: "900" },
  confirmText: { color: "white", fontWeight: "900", textAlign: "center" }
});
