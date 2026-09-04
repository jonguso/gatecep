import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import CompanyLogo from "./CompanyLogo";

const numeric = (value) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; };
const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = (value) => { const parsed = numeric(value); return parsed === null ? "N/A" : parsed.toLocaleString(); };

function normalizeLevels(levels) {
  if (!Array.isArray(levels)) return [];
  return levels.map((level) => ({
    price: numeric(level?.price ?? level?.rate),
    quantity: numeric(level?.quantity ?? level?.qty ?? level?.volume),
    splits: numeric(level?.splits ?? level?.orders ?? level?.orderCount),
    time: level?.time ?? level?.quotedAt ?? level?.timestamp ?? null
  })).filter((level) => level.price > 0 && level.quantity >= 0);
}

export function buildVerifiedDepthView(security) {
  const bids = normalizeLevels(security?.bids ?? security?.depth?.bids);
  const asks = normalizeLevels(security?.asks ?? security?.depth?.asks);
  return {
    bids, asks,
    available: bids.length > 0 || asks.length > 0,
    bestBid: bids[0]?.price ?? numeric(security?.bid),
    bestAsk: asks[0]?.price ?? numeric(security?.ask)
  };
}

export default function MarketDepthModal({ security, visible, onClose }) {
  const depth = useMemo(() => buildVerifiedDepthView(security), [security]);
  if (!security) return null;
  const changePct = numeric(security.changePct) || 0;
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={styles.dismissArea} onPress={onClose} />
      <View style={styles.sheet} testID="pc030m13a-market-depth-modal">
        <View style={styles.handle} />
        <View style={styles.header}>
          <CompanyLogo security={security} size={46} />
          <View style={styles.headerCopy}><Text style={styles.title}>{security.symbol} Market Depth</Text><Text style={styles.subtitle}>{security.name || "NSE Security"}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close market depth" style={styles.close} onPress={onClose}><Text style={styles.closeText}>Close</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.metrics}>
            <Metric label="Price" value={`KES ${money(security.price)}`} />
            <Metric label="Change" value={`${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`} tone={changePct >= 0 ? "positive" : "negative"} />
            <Metric label="Volume" value={whole(security.volume)} />
            <Metric label="Turnover" value={numeric(security.turnover) > 0 ? `KES ${whole(security.turnover)}` : "N/A"} />
            <Metric label="Best Bid" value={depth.bestBid > 0 ? `KES ${money(depth.bestBid)}` : "N/A"} />
            <Metric label="Best Ask" value={depth.bestAsk > 0 ? `KES ${money(depth.bestAsk)}` : "N/A"} />
          </View>
          {depth.available ? <><DepthTable title="ASKS (Supply)" levels={depth.asks} tone="ask" /><DepthTable title="BIDS (Demand)" levels={depth.bids} tone="bid" /></> : <View style={styles.unavailable}>
            <Text style={styles.unavailableTitle}>Verified Level 2 depth unavailable</Text>
            <Text style={styles.unavailableText}>LOCAL_VERIFIED_EOD provides the latest verified price and volume, but not bid/ask order levels. GateCEP will show depth here when a licensed NSE or broker feed supplies genuine orders.</Text>
          </View>}
          <View style={styles.evidence}>
            <Text style={styles.evidenceTitle}>Market evidence</Text>
            <EvidenceRow label="Provider" value={security.priceSource || security.provider || "LOCAL_VERIFIED_EOD"} />
            <EvidenceRow label="Quoted at" value={formatTime(security.quotedAt || security.marketDate)} />
            <Text style={styles.disclaimer}>Read-only market information. Opening this view does not place an order.</Text>
          </View>
          <Pressable style={styles.learnButton} onPress={() => { onClose?.(); router.push(`/security/${security.symbol}`); }}>
            <Text style={styles.learnButtonText}>Explore company & learn</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function Metric({ label, value, tone }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, tone === "positive" && styles.positive, tone === "negative" && styles.negative]}>{value}</Text></View>; }
function DepthTable({ title, levels, tone }) { return <View style={styles.depthCard}><Text style={[styles.depthTitle, tone === "ask" ? styles.ask : styles.bid]}>{title}</Text><View style={styles.tableHeader}><Text style={styles.cell}>Quantity</Text><Text style={styles.cell}>Price</Text><Text style={styles.cell}>Splits</Text><Text style={styles.cell}>Time</Text></View>{levels.length ? levels.map((level, index) => <View key={`${level.price}-${index}`} style={styles.tableRow}><Text style={[styles.cell, styles.quantity]}>{whole(level.quantity)}</Text><Text style={[styles.cell, styles.strong]}>{money(level.price)}</Text><Text style={styles.cell}>{level.splits ?? "N/A"}</Text><Text style={styles.cell}>{formatClock(level.time)}</Text></View>) : <Text style={styles.empty}>No verified levels supplied.</Text>}</View>; }
function EvidenceRow({ label, value }) { return <View style={styles.evidenceRow}><Text style={styles.evidenceLabel}>{label}</Text><Text style={styles.evidenceValue}>{value || "N/A"}</Text></View>; }
function formatTime(value) { if (!value) return "N/A"; const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString() : String(value); }
function formatClock(value) { if (!value) return "N/A"; const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : String(value); }

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(2,6,23,0.78)", justifyContent: "flex-end" }, dismissArea: { flex: 1 },
  sheet: { maxHeight: "88%", backgroundColor: "#0f172a", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: "#334155", paddingTop: 8 },
  handle: { width: 48, height: 5, borderRadius: 3, backgroundColor: "#475569", alignSelf: "center", marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#1e293b" }, headerCopy: { flex: 1 },
  title: { color: "white", fontSize: 21, fontWeight: "900" }, subtitle: { color: "#94a3b8", marginTop: 3 }, close: { backgroundColor: "#1e293b", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 }, closeText: { color: "#67e8f9", fontWeight: "900" },
  scrollContent: { padding: 18, paddingBottom: 36 }, metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, metric: { width: "31%", minWidth: 105, flexGrow: 1, backgroundColor: "#020617", borderWidth: 1, borderColor: "#1e293b", borderRadius: 13, padding: 11 },
  metricLabel: { color: "#94a3b8", fontSize: 11 }, metricValue: { color: "white", fontWeight: "900", marginTop: 5 }, positive: { color: "#6ee7b7" }, negative: { color: "#fca5a5" },
  depthCard: { marginTop: 14, backgroundColor: "#020617", borderWidth: 1, borderColor: "#334155", borderRadius: 16, padding: 13 }, depthTitle: { fontSize: 16, fontWeight: "900", marginBottom: 10 }, ask: { color: "#fca5a5" }, bid: { color: "#67e8f9" },
  tableHeader: { flexDirection: "row", paddingBottom: 7, borderBottomWidth: 1, borderBottomColor: "#334155" }, tableRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#172033" }, cell: { color: "#94a3b8", fontSize: 11, flex: 1, textAlign: "right" }, quantity: { color: "#67e8f9" }, strong: { color: "white", fontWeight: "900" }, empty: { color: "#94a3b8", paddingVertical: 12 },
  unavailable: { marginTop: 14, backgroundColor: "#1c1417", borderWidth: 1, borderColor: "#92400e", borderRadius: 16, padding: 15 }, unavailableTitle: { color: "#fbbf24", fontWeight: "900" }, unavailableText: { color: "#cbd5e1", marginTop: 7, lineHeight: 20 },
  evidence: { marginTop: 14, backgroundColor: "#082032", borderWidth: 1, borderColor: "#155e75", borderRadius: 16, padding: 14 }, evidenceTitle: { color: "#67e8f9", fontWeight: "900", marginBottom: 7 }, evidenceRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 5 }, evidenceLabel: { color: "#94a3b8" }, evidenceValue: { color: "white", fontWeight: "700", flex: 1, textAlign: "right" }, disclaimer: { color: "#94a3b8", marginTop: 10, lineHeight: 18 },
  learnButton: { marginTop: 14, padding: 15, borderRadius: 14, backgroundColor: "#0891b2", alignItems: "center" }, learnButtonText: { color: "white", fontWeight: "900" }
});
