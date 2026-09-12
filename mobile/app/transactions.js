import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View,
  useWindowDimensions
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { loadTransactionLedgerReconciliation } from "../src/features/trading/transactionLedgerReconciliationService";

// PC-030M20AV3D RESPONSIVE CALIBRATION
export default function Transactions() {
  const { width: av3dWidth } = useWindowDimensions();
  const params = useLocalSearchParams();
  const requested = String(params.symbol || "").trim().toUpperCase();
  const [report, setReport] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState(requested);
  const [showOnlyGaps, setShowOnlyGaps] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const next = await loadTransactionLedgerReconciliation();
    setReport(next);
    if (!requested && next.securities?.length) {
      const firstGap = next.securities.find((item) => !item.reconciled);
      setSelectedSymbol(firstGap?.symbol || next.securities[0].symbol);
    }
  }

  const visibleSecurities = useMemo(() => {
    const rows = report?.securities || [];
    return showOnlyGaps ? rows.filter((item) => !item.reconciled) : rows;
  }, [report, showOnlyGaps]);

  const selected = useMemo(
    () => (report?.securities || []).find((item) => item.symbol === selectedSymbol) || null,
    [report, selectedSymbol]
  );

  if (!report) {
    return <View style={styles.loading}><Text style={styles.body}>Building transaction reconciliation report…</Text></View>;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[
      styles.content,
      av3dWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
      av3dWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
      av3dWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
    ]}>
      <View style={[styles.headerRow, av3dWidth < 600 && { flexDirection: "column", alignItems: "stretch" }]}>
        <View style={{ flex: 1 }}>
          <Text style={[
      styles.title,
      av3dWidth < 720 && { fontSize: 28, lineHeight: 34 },
      av3dWidth < 480 && { fontSize: 25, lineHeight: 31 }
    ]}>Transaction Reconciliation</Text>
          <Text style={styles.subtitle}>Read-only broker evidence audit with source-aware date normalization and CDSC anchor-window reconciliation. Raw imported dates are preserved; normalized dates are used only for analysis.</Text>
        </View>
        <Pressable style={styles.dashboardButton} onPress={() => router.replace("/(tabs)/dashboard")}>
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <Metric label="Securities" value={report.summary.securityCount} />
        <Metric label="Reconciled" value={report.summary.reconciledCount} good />
        <Metric label="Gaps" value={report.summary.gapCount} bad={report.summary.gapCount > 0} />
        <Metric label="Evidence Rows" value={report.summary.evidenceRowCount} />
      </View>

      <View style={styles.card}>
        <View style={[styles.sectionHeader, av3dWidth < 520 && { flexDirection: "column", alignItems: "stretch" }]}>
          <Text style={styles.cardTitle}>Authoritative Position Anchors</Text>
          <Pressable style={styles.filterButton} onPress={() => router.push("/cdsc-position-register")}>
            <Text style={styles.filterText}>CDSC Register</Text>
          </Pressable>
        </View>
        {report.threeWay?.latestStatement ? (
          <>
            <Text style={styles.small}>Latest settled ownership anchor: {report.threeWay.latestStatement.periodEnd}. Broker valuation is compared independently against this dated CDSC closing position.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Cell width={90}>Security</Cell><Cell width={120}>CDSC Closing</Cell><Cell width={120}>Broker Qty</Cell><Cell width={120}>Position Diff</Cell><Cell width={160}>Anchor Qty</Cell><Cell width={170}>Anchor Status</Cell><Cell width={190}>History Status</Cell>
                </View>
                {(report.threeWay.securities || []).map((item) => (
                  <View key={`anchor-${item.symbol}`} style={styles.tableRow}>
                    <Cell width={90} strong>{item.symbol}</Cell><Cell width={120}>{item.registeredQuantity === null ? "—" : qty(item.registeredQuantity)}</Cell><Cell width={120}>{item.brokerQuantity === null ? "—" : qty(item.brokerQuantity)}</Cell><Cell width={120} bad={item.positionDifference !== null && Math.abs(item.positionDifference) > 0.000001}>{item.positionDifference === null ? "—" : signedQty(item.positionDifference)}</Cell><Cell width={160}>{item.anchorWindowLedgerQuantity === null ? "—" : qty(item.anchorWindowLedgerQuantity)}</Cell><Cell width={170} good={item.anchorWindowReconciled} bad={!item.anchorWindowReconciled}>{item.anchorWindowStatus}</Cell><Cell width={190} good={item.transactionHistoryReconciled} bad={!item.transactionHistoryReconciled}>{item.transactionHistoryStatus}</Cell>
                  </View>
                ))}
              </View>
            </ScrollView>
          </>
        ) : (
          <Text style={styles.small}>No monthly CDSC position statement has been saved yet. Transaction/FIFO reconciliation continues to work, but settled ownership has no monthly register anchor.</Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={[styles.sectionHeader, av3dWidth < 520 && { flexDirection: "column", alignItems: "stretch" }]}>
          <Text style={styles.cardTitle}>Portfolio Reconciliation</Text>
          <Pressable style={[styles.filterButton, showOnlyGaps && styles.filterActive]} onPress={() => setShowOnlyGaps((value) => !value)}>
            <Text style={styles.filterText}>{showOnlyGaps ? "Show All" : "Show Gaps Only"}</Text>
          </Pressable>
        </View>
        <Text style={styles.small}>Select a security to inspect every included and excluded transaction row.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Cell width={90}>Security</Cell><Cell width={110}>Broker Qty</Cell><Cell width={110}>Ledger Qty</Cell><Cell width={110}>Difference</Cell><Cell width={150}>Status</Cell><Cell width={90}>Excluded</Cell>
            </View>
            {visibleSecurities.map((item) => (
              <Pressable key={item.symbol} onPress={() => setSelectedSymbol(item.symbol)} style={[styles.tableRow, selectedSymbol === item.symbol && styles.selectedRow]}>
                <Cell width={90} strong>{item.symbol}</Cell><Cell width={110}>{qty(item.brokerQuantity)}</Cell><Cell width={110}>{qty(item.ledgerQuantity)}</Cell><Cell width={110} bad={!item.reconciled}>{signedQty(item.difference)}</Cell><Cell width={150} good={item.reconciled} bad={!item.reconciled}>{item.status}</Cell><Cell width={90}>{item.excludedCount}</Cell>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {selected ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selected.symbol} — Evidence Detail</Text>
          <View style={styles.reconBox}>
            <Info label="Ledger Closing Quantity" value={qty(selected.ledgerQuantity)} />
            <Info label="Current Broker Quantity" value={qty(selected.brokerQuantity)} />
            <Info label="Reconciliation Difference" value={signedQty(selected.difference)} bad={!selected.reconciled} />
            <Info label="Status" value={selected.status} good={selected.reconciled} bad={!selected.reconciled} />
          </View>

          {report.threeWay?.latestStatement ? (() => {
            const anchor = (report.threeWay.securities || []).find((item) => item.symbol === selected.symbol);
            if (!anchor) return null;
            return <View style={styles.reconBox}>
              <Info label="CDSC Statement As Of" value={anchor.statementAsOf || "—"} />
              <Info label="Registered Closing Quantity" value={anchor.registeredQuantity === null ? "—" : qty(anchor.registeredQuantity)} />
              <Info label="Position Integrity" value={anchor.positionStatus} good={anchor.positionReconciled} bad={!anchor.positionReconciled} />
              <Info label="Transaction History Integrity" value={anchor.transactionHistoryStatus} good={anchor.transactionHistoryReconciled} bad={!anchor.transactionHistoryReconciled} />
              <Info label="Anchor-Window Ledger Quantity" value={anchor.anchorWindowLedgerQuantity === null ? "—" : qty(anchor.anchorWindowLedgerQuantity)} good={anchor.anchorWindowReconciled} bad={!anchor.anchorWindowReconciled} />
              <Info label="Anchor-Window Difference" value={anchor.anchorWindowDifference === null ? "—" : signedQty(anchor.anchorWindowDifference)} good={anchor.anchorWindowReconciled} bad={!anchor.anchorWindowReconciled} />
              <Info label="Pre-Statement Evidence Rows" value={String(anchor.preAnchorEvidenceCount || 0)} />
              <Info label="Settlement-Date Alignment Matches" value={String(anchor.provisionalDateMatchCount || 0)} />
            </View>;
          })() : null}

          {report.threeWay?.latestStatement ? (() => {
            const anchor = (report.threeWay.securities || []).find((item) => item.symbol === selected.symbol);
            if (!anchor?.dateBuckets?.length) return null;
            return <>
              <Text style={[styles.cardTitle, { marginTop: 18 }]}>CDSC ↔ Broker Date Buckets</Text>
              <Text style={styles.small}>CDSC dates are settlement dates. When broker evidence contains only trade/execution dates, a quantity-equivalent match within the settlement window is labelled as an alignment match; the source date is never overwritten.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Cell width={120}>CDSC Date</Cell><Cell width={120}>Broker Date</Cell><Cell width={75}>Side</Cell><Cell width={100}>CDSC Qty</Cell><Cell width={110}>Broker Qty</Cell><Cell width={210}>Status</Cell><Cell width={90}>Lag Days</Cell>
                  </View>
                  {anchor.dateBuckets.map((bucket, index) => (
                    <View key={`bucket-${index}`} style={styles.tableRow}>
                      <Cell width={120}>{bucket.date || "—"}</Cell><Cell width={120}>{bucket.transactionDate || bucket.transactionRows?.[0]?.effectiveDate || bucket.date || "—"}</Cell><Cell width={75}>{bucket.side}</Cell><Cell width={100}>{qty(bucket.cdscQuantity)}</Cell><Cell width={110}>{qty(bucket.transactionQuantity)}</Cell><Cell width={210} good={bucket.reconciled} bad={!bucket.reconciled}>{bucket.status}</Cell><Cell width={90}>{bucket.dateGapDays ?? "—"}</Cell>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>;
          })() : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Cell width={120}>Normalized Date</Cell><Cell width={120}>Raw Date</Cell><Cell width={135}>Date Method</Cell><Cell width={75}>Type</Cell><Cell width={80}>Qty</Cell><Cell width={105}>Price</Cell><Cell width={110}>Running Qty</Cell><Cell width={135}>Status</Cell><Cell width={105}>FIFO</Cell><Cell width={120}>REAL Eligible</Cell><Cell width={230}>Reason / Evidence</Cell><Cell width={160}>Broker Ref</Cell>
              </View>
              {selected.rows.map((row, index) => (
                <View key={`${row.id}-${index}`} style={[styles.tableRow, (!row.fifoIncluded || !row.canonicalEligible) && styles.excludedRow]}>
                  <Cell width={120}>{row.effectiveDate || row.date || "—"}</Cell><Cell width={120}>{String(row.rawExecutionDate ?? "—")}</Cell><Cell width={135}>{row.dateNormalizationMethod || "—"}</Cell><Cell width={75} good={row.side === "BUY"} bad={row.side === "SELL"}>{row.side}</Cell><Cell width={80}>{qty(row.quantity)}</Cell><Cell width={105}>KES {money(row.price)}</Cell><Cell width={110}>{row.runningQuantity === null ? "—" : qty(row.runningQuantity)}</Cell><Cell width={135}>{row.status}</Cell><Cell width={105} good={row.fifoIncluded} bad={!row.fifoIncluded}>{row.fifoIncluded ? "INCLUDED" : "EXCLUDED"}</Cell><Cell width={120} good={row.canonicalEligible} bad={!row.canonicalEligible}>{row.canonicalEligible ? "YES" : "NO"}</Cell><Cell width={230}>{row.exclusionReasons.length ? row.exclusionReasons.join(", ") : "Accepted broker execution evidence"}</Cell><Cell width={160}>{row.brokerReference || "—"}</Cell>
                </View>
              ))}
            </View>
          </ScrollView>

          {!selected.reconciled ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Reconciliation action required</Text>
              <Text style={styles.body}>Do not force the full-history ledger to match the broker quantity. First review the dated CDSC anchor window, normalized transaction dates, unmatched buckets, excluded rows, duplicates, transfers or corporate actions. Correct only underlying evidence.</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyTitle}>Integrity Boundary</Text>
        <Text style={styles.body}>This report is derived from transaction evidence and current broker holdings. It cannot create trades, invent adjustment shares, or mutate REAL or Practice portfolios.</Text>
      </View>
    </ScrollView>
  );
}

function Metric({ label, value, good, bad }) { return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, good && styles.good, bad && styles.bad]}>{String(value)}</Text></View>; }
function Info({ label, value, good, bad }) { return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={[styles.infoValue, good && styles.good, bad && styles.bad]}>{value}</Text></View>; }
function Cell({ children, width, strong, good, bad }) { return <Text style={[styles.cell, { width }, strong && styles.strong, good && styles.good, bad && styles.bad]} numberOfLines={3}>{String(children ?? "")}</Text>; }
function qty(value) { return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 4 }); }
function signedQty(value) { const v = Number(value || 0); return `${v > 0 ? "+" : ""}${qty(v)}`; }
function money(value) { return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function shortDate(value) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(); }

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:"#020617"},content:{padding:22,paddingTop:70,paddingBottom:100},loading:{flex:1,backgroundColor:"#020617",alignItems:"center",justifyContent:"center",padding:24},
  headerRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:12},title:{color:"white",fontSize:34,fontWeight:"900"},subtitle:{color:"#94a3b8",marginTop:10,lineHeight:22,maxWidth:900},dashboardButton:{backgroundColor:"#1e293b",borderColor:"#334155",borderWidth:1,paddingVertical:10,paddingHorizontal:14,borderRadius:14},dashboardButtonText:{color:"#67e8f9",fontWeight:"900"},
  summaryCard:{marginTop:22,backgroundColor:"#0f172a",borderColor:"#1e293b",borderWidth:1,borderRadius:22,padding:18,flexDirection:"row",flexWrap:"wrap",gap:10},metric:{minWidth:150,flex:1,backgroundColor:"#020617",borderColor:"#334155",borderWidth:1,borderRadius:16,padding:14},metricLabel:{color:"#94a3b8",fontSize:12},metricValue:{color:"white",fontWeight:"900",fontSize:18,marginTop:6},
  card:{marginTop:22,backgroundColor:"#0f172a",borderColor:"#1e293b",borderWidth:1,borderRadius:22,padding:18},sectionHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:12},cardTitle:{color:"#67e8f9",fontSize:18,fontWeight:"900"},small:{color:"#94a3b8",marginTop:6},body:{color:"#cbd5e1",marginTop:7,lineHeight:21},filterButton:{backgroundColor:"#1e293b",paddingVertical:9,paddingHorizontal:12,borderRadius:12},filterActive:{backgroundColor:"#7e22ce"},filterText:{color:"white",fontWeight:"800"},
  table:{borderColor:"#334155",borderWidth:1,borderRadius:12,overflow:"hidden"},tableHeader:{flexDirection:"row",backgroundColor:"#1e293b",paddingVertical:10},tableRow:{flexDirection:"row",backgroundColor:"#020617",borderTopColor:"#1e293b",borderTopWidth:1,paddingVertical:10},selectedRow:{backgroundColor:"rgba(147,51,234,.18)"},excludedRow:{backgroundColor:"rgba(127,29,29,.14)"},cell:{color:"#cbd5e1",paddingHorizontal:10,fontSize:12},strong:{color:"white",fontWeight:"900"},good:{color:"#86efac"},bad:{color:"#fca5a5"},
  reconBox:{marginTop:12,borderColor:"#334155",borderWidth:1,borderRadius:14,paddingHorizontal:14},infoRow:{paddingVertical:10,borderBottomColor:"#1e293b",borderBottomWidth:1},infoLabel:{color:"#94a3b8",fontSize:12},infoValue:{color:"white",fontWeight:"900",marginTop:4},warningBox:{marginTop:18,backgroundColor:"rgba(127,29,29,.18)",borderColor:"#ef4444",borderWidth:1,borderRadius:14,padding:14},warningTitle:{color:"#fca5a5",fontWeight:"900"},readOnlyBox:{marginTop:22,backgroundColor:"rgba(6,182,212,.08)",borderColor:"#0891b2",borderWidth:1,borderRadius:18,padding:16},readOnlyTitle:{color:"#67e8f9",fontWeight:"900"}
});
