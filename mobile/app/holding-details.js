import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { loadUnifiedPortfolioRuntime } from "../src/portfolio/unifiedPortfolioApi";
import { calculatePortfolioSummary } from "../src/shared/portfolio/engine";
import { ContainedPanel, StatusBanner } from "../src/components/mobile/MobileUI";

export default function HoldingDetails() {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasVerifiedData, setHasVerifiedData] = useState(false);
  const [notice, setNotice] = useState(null);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  async function load() {
    try {
      setLoading(true);
      const result = await loadUnifiedPortfolioRuntime({ broker: "ALL" });
      setHoldings(Array.isArray(result?.holdings) ? result.holdings : []);
      setHasVerifiedData(true);
      setNotice(result?.runtimeStatus && result.runtimeStatus !== "LIVE"
        ? {
            status: result.runtimeStatus,
            message: result.runtimeMessage || "REAL holdings are temporarily unavailable."
          }
        : null);
    } catch (error) {
      setHoldings([]);
      setHasVerifiedData(false);
      setNotice({
        status: error?.code || "REAL_DATA_UNAVAILABLE",
        message: error?.message || "REAL holdings are unavailable."
      });
    } finally {
      setLoading(false);
    }
  }

  const portfolio = useMemo(
    () => calculatePortfolioSummary({ holdings, cash: 0 }),
    [holdings]
  );

  const securities = useMemo(
    () => [...(portfolio?.holdings || [])].sort(
      (a, b) => number(b.marketValue) - number(a.marketValue)
    ),
    [portfolio]
  );

  const summary = portfolio?.summary || {};
  const authRequired = notice?.status === "AUTH_REQUIRED" || notice?.status === "AUTH_EXPIRED";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            style={styles.backIcon}
            onPress={() => router.back()}
          >
            <Text style={styles.backIconText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Holdings</Text>
            <Text style={styles.subtitle}>Individual securities in your REAL portfolio</Text>
          </View>
          <Text style={styles.count}>{securities.length}</Text>
        </View>

        {notice ? (
          <StatusBanner
            tone="danger"
            title="REAL holdings status"
            message={`${notice.message} GateCEP did not switch to Practice.`}
          />
        ) : null}

        {authRequired ? (
          <Pressable style={styles.signIn} onPress={() => router.push("/login")}>
            <Text style={styles.signInText}>Sign In Again</Text>
          </Pressable>
        ) : null}

        <View style={styles.summary}>
          <Summary label="Current Value" value={loading ? "Loading…" : hasVerifiedData ? `KES ${money(summary.totalValue)}` : "N/A"} />
          <Summary label="Invested" value={loading ? "Loading…" : hasVerifiedData ? `KES ${money(summary.investedValue)}` : "N/A"} />
          <Summary
            label="Total Return"
            value={loading ? "Loading…" : hasVerifiedData ? `${number(summary.totalGain) >= 0 ? "+" : ""}KES ${money(summary.totalGain)}` : "N/A"}
            positive={hasVerifiedData ? number(summary.totalGain) >= 0 : undefined}
          />
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#67e8f9" />
            <Text style={styles.muted}>Loading REAL securities…</Text>
          </View>
        ) : securities.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No REAL securities available</Text>
            <Text style={styles.muted}>Import, enter, or synchronize a REAL portfolio to populate this list.</Text>
            <Pressable style={styles.primary} onPress={() => router.push("/portfolio-sync-center")}>
              <Text style={styles.primaryText}>Open Portfolio Sync</Text>
            </Pressable>
          </View>
        ) : (
          <ContainedPanel
            title={`All Securities (${securities.length})`}
            subtitle="Broker position details • scroll holdings"
            testID="holdings-contained-panel"
          >
            {securities.map((security, index) => {
              const symbol = security.symbol || `SECURITY-${index}`;
              const gain = number(security.profitLoss);
              const returnPct = number(security.profitLossPct);
              const quantity = number(security.quantity);
              const averagePrice = number(security.averageCost || security.averagePrice);
              const investedValue = number(security.investedValue || security.costValue) || quantity * averagePrice;
              const currentPrice = number(security.marketPrice || security.price || security.lastPrice);
              const currentValue = number(security.marketValue || security.value) || quantity * currentPrice;
              const sellableQuantity = number(security.settledQuantity ?? security.sellableQuantity ?? security.quantity);

              return (
                <View
                  key={`${symbol}-${index}`}
                  style={styles.security}
                >
                  <View style={styles.securityHeader}>
                    <View style={styles.securityCopy}>
                      <Text style={styles.symbol}>{symbol}</Text>
                      <Text numberOfLines={1} style={styles.name}>{security.name || security.securityName || "Listed security"}</Text>
                      <Text style={styles.sector}>{security.sector || "Other"}{security.broker ? ` • ${security.broker}` : ""}</Text>
                    </View>
                    <View style={styles.securityValue}>
                      <Text style={styles.value}>KES {money(currentValue)}</Text>
                      <Text style={gain >= 0 ? styles.positive : styles.negative}>{gain >= 0 ? "+" : ""}KES {money(gain)}</Text>
                    </View>
                  </View>

                  <View style={styles.details}>
                    <Detail label="Quantity" value={quantity.toLocaleString()} />
                    <Detail label="Avg. Price" value={`KES ${money(averagePrice)}`} />
                    <Detail label="Invested Value" value={`KES ${money(investedValue)}`} />
                    <Detail label="LTP / Current Price" value={`KES ${money(currentPrice)}`} />
                    <Detail label="Current Value" value={`KES ${money(currentValue)}`} />
                    <Detail label="P&L Value" value={`${gain >= 0 ? "+" : ""}KES ${money(gain)}`} positive={gain >= 0} />
                    <Detail label="P&L %" value={`${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(2)}%`} positive={returnPct >= 0} />
                    <Detail label="Sellable Qty" value={sellableQuantity.toLocaleString()} />
                    <Detail label="Settlement" value={security.settlementStatus || "SETTLED"} />
                  </View>
                </View>
              );
            })}
          </ContainedPanel>
        )}

        <Pressable style={styles.homeButton} onPress={() => router.replace("/(tabs)/dashboard")}>
          <Text style={styles.homeText}>Back to Home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Summary({ label, value, positive }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={positive === undefined ? styles.summaryValue : positive ? styles.positive : styles.negative}>{value}</Text>
    </View>
  );
}

function Detail({ label, value, positive }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={positive === undefined ? styles.detailValue : positive ? styles.positive : styles.negative}>{value}</Text>
    </View>
  );
}

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" },
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, width: "100%", maxWidth: 760, alignSelf: "center" },
  header: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12 },
  backIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  backIconText: { color: "#67e8f9", fontSize: 30, fontWeight: "900", marginTop: -3 },
  headerCopy: { flex: 1 },
  title: { color: "white", fontSize: 26, fontWeight: "900" },
  subtitle: { color: "#94a3b8", fontSize: 11, marginTop: 3 },
  count: { color: "#c084fc", fontWeight: "900", fontSize: 18 },
  signIn: { minHeight: 48, marginTop: 10, borderRadius: 14, backgroundColor: "#7f1d1d", alignItems: "center", justifyContent: "center" },
  signInText: { color: "white", fontWeight: "900" },
  summary: { flexDirection: "row", gap: 8, marginTop: 12 },
  summaryItem: { flex: 1, minWidth: 0, backgroundColor: "#1d0b38", borderColor: "#6b21a8", borderWidth: 1, borderRadius: 14, padding: 10 },
  summaryLabel: { color: "#c4b5fd", fontSize: 9, fontWeight: "800" },
  summaryValue: { color: "white", fontSize: 11, fontWeight: "900", marginTop: 5 },
  loading: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: 12 },
  empty: { marginTop: 14, backgroundColor: "#0f172a", borderRadius: 19, padding: 18 },
  emptyTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  muted: { color: "#94a3b8", lineHeight: 19, marginTop: 6 },
  primary: { minHeight: 50, marginTop: 15, backgroundColor: "#9333ea", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "white", fontWeight: "900" },
  list: { marginTop: 14, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 20, padding: 14 },
  listTitle: { color: "#67e8f9", fontSize: 19, fontWeight: "900" },
  listHint: { color: "#94a3b8", fontSize: 11, marginTop: 4, marginBottom: 5 },
  security: { borderTopColor: "#334155", borderTopWidth: 1, paddingVertical: 15, paddingHorizontal: 3 },
  securityHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  securityCopy: { flex: 1, minWidth: 0 },
  symbol: { color: "white", fontSize: 17, fontWeight: "900" },
  name: { color: "#cbd5e1", fontSize: 11, marginTop: 3 },
  sector: { color: "#67e8f9", fontSize: 10, marginTop: 3 },
  securityValue: { alignItems: "flex-end" },
  value: { color: "white", fontWeight: "900", fontSize: 12 },
  positive: { color: "#86efac", fontWeight: "900", fontSize: 11, marginTop: 4 },
  negative: { color: "#fca5a5", fontWeight: "900", fontSize: 11, marginTop: 4 },
  details: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detail: { width: "31.5%", minWidth: 138, flexGrow: 1, minHeight: 58, borderRadius: 12, backgroundColor: "#020617", borderColor: "#1e293b", borderWidth: 1, padding: 10 },
  detailLabel: { color: "#94a3b8", fontSize: 9 },
  detailValue: { color: "white", fontWeight: "900", fontSize: 11, marginTop: 5 },
  homeButton: { minHeight: 50, marginTop: 16, borderRadius: 15, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  homeText: { color: "#67e8f9", fontWeight: "900" }
});
