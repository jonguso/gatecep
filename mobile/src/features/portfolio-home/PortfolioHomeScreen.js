import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../auth/hooks/useAuth";
import {
  loadPortfolioAccounts,
  loadUnifiedPortfolioRuntime
} from "../../portfolio/unifiedPortfolioApi";
import { calculatePortfolioSummary } from "../../shared/portfolio/engine";
import { CollapsibleSection, StatusBanner } from "../../components/mobile/MobileUI";
import { isNseMarketSessionOpen } from "../../services/markets/canonicalNseQuoteService";
import {
  derivePortfolioAccounts,
  mergePortfolioAccounts
} from "./portfolioAccountCatalogService";

const COLORS = ["#22d3ee", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];
const TABS = ["Allocation", "Holdings", "Performance", "More"];
const ALL_ACCOUNTS = { broker: "ALL", label: "All Accounts", type: "ALL" };

export default function PortfolioHomeScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState("Allocation");
  const [loading, setLoading] = useState(true);
  const [hasVerifiedData, setHasVerifiedData] = useState(false);
  const [holdings, setHoldings] = useState([]);
  const [cash, setCash] = useState(0);
  const [accounts, setAccounts] = useState([ALL_ACCOUNTS]);
  const [selectedAccount, setSelectedAccount] = useState(ALL_ACCOUNTS);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [notice, setNotice] = useState(null);
  const [marketData, setMarketData] = useState(null);

  useFocusEffect(useCallback(() => {
    loadHome(selectedAccount);
    if (!isNseMarketSessionOpen()) return undefined;
    const refreshTimer = setInterval(() => loadHome(selectedAccount), 60 * 1000);
    return () => clearInterval(refreshTimer);
  }, [selectedAccount]));

  async function loadHome(account = ALL_ACCOUNTS) {
    try {
      setLoading(true);
      const [accountResult, allAccountsPortfolio] = await Promise.all([
        loadPortfolioAccounts().catch(() => ({ accounts: [] })),
        loadUnifiedPortfolioRuntime({ broker: "ALL" })
      ]);

      const liveAccounts = Array.isArray(accountResult?.accounts) ? accountResult.accounts : [];
      const accountCatalog = mergePortfolioAccounts(
        liveAccounts,
        derivePortfolioAccounts(allAccountsPortfolio)
      );
      setAccounts([ALL_ACCOUNTS, ...accountCatalog]);

      const result = account?.type === "ALL" || account?.broker === "ALL"
        ? allAccountsPortfolio
        : await loadUnifiedPortfolioRuntime({ broker: account?.broker });
      const realHoldings = Array.isArray(result?.holdings) ? result.holdings : [];
      const resolvedCash = Number(
        result?.availableCash ?? result?.summary?.availableCash ?? 0
      );

      setHoldings(realHoldings);
      setCash(resolvedCash);
      setMarketData({
        status: result?.marketDataStatus || "UNAVAILABLE",
        source: result?.marketDataSource || null,
        updatedAt: result?.marketDataUpdatedAt || null,
        coverage: result?.marketPriceCoverage || null
      });
      setHasVerifiedData(true);
      setNotice(result?.runtimeStatus && result.runtimeStatus !== "LIVE"
        ? { status: result.runtimeStatus, message: result.runtimeMessage || "REAL portfolio data is temporarily unavailable." }
        : null);
    } catch (error) {
      setHoldings([]);
      setCash(0);
      setHasVerifiedData(false);
      setMarketData(null);
      setNotice({ status: error?.code || "REAL_DATA_UNAVAILABLE", message: error?.message || "REAL portfolio data is unavailable." });
    } finally {
      setLoading(false);
    }
  }

  const portfolio = useMemo(() => calculatePortfolioSummary({ holdings, cash }), [holdings, cash]);
  const valuedHoldings = portfolio?.holdings || [];
  const summary = portfolio?.summary || {};
  const sectorRows = useMemo(() => buildSectorRows(valuedHoldings, summary.totalValue), [valuedHoldings, summary.totalValue]);
  const topHoldings = useMemo(() => [...valuedHoldings].sort((a, b) => Number(b.marketValue || 0) - Number(a.marketValue || 0)).slice(0, 3), [valuedHoldings]);
  const largestSector = sectorRows[0] || null;
  const diversification = sectorRows.length >= 5 ? "Good" : sectorRows.length >= 3 ? "Moderate" : "Concentrated";
  const firstName = String(user?.username || user?.name || user?.email || "Investor").split(/[\s@.]/)[0];
  const chartSize = Math.min(Math.max(width - 84, 220), 286);
  const authenticatedAgain = notice?.status === "AUTH_REQUIRED" || notice?.status === "AUTH_EXPIRED";

  function selectAccount(account) {
    setSelectedAccount(account);
    setAccountModalOpen(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.push("/menu")}><Text style={styles.iconText}>☰</Text></Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Portfolio</Text>
            <Text style={styles.welcome}>Good {greeting()}, {firstName}</Text>
          </View>
          <Pressable style={styles.iconButton} onPress={() => router.push("/intelligence-center")}><Text style={styles.bell}>●</Text></Pressable>
        </View>

        <Pressable style={styles.accountSelector} onPress={() => setAccountModalOpen(true)}>
          <View style={styles.accountCopy}><Text style={styles.accountLabel}>REAL PORTFOLIO</Text><Text style={styles.accountName}>{selectedAccount.label}</Text></View>
          <Text style={styles.accountChevron}>⌄</Text>
        </Pressable>

        {notice ? (
          <StatusBanner tone="danger" title="REAL portfolio unavailable" message={`${notice.message} GateCEP did not switch to Practice.`} />
        ) : null}
        {authenticatedAgain ? <Pressable style={styles.signInButton} onPress={() => router.push("/login")}><Text style={styles.signInText}>Sign In Again</Text></Pressable> : null}

        {marketData ? (
          <StatusBanner
            tone={marketData.status === "LIVE" ? "success" : "warning"}
            title={marketData.status === "LIVE" ? "Market prices current" : "Using last verified prices"}
            message={marketData.status === "LIVE"
              ? `${marketData.coverage?.updated || 0} of ${marketData.coverage?.total || 0} holdings updated from ${marketData.source || "the NSE feed"}.`
              : "GateCEP retained broker valuation prices where a genuine current quote was unavailable."}
          />
        ) : null}

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>{selectedAccount.type === "ALL" ? "REAL NET WORTH" : "ACCOUNT NET WORTH"}</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.heroValue}>{loading ? "Loading…" : hasVerifiedData ? `KES ${money(summary.netWorth)}` : "Unavailable"}</Text>
          <Text style={Number(summary.totalGain || 0) >= 0 ? styles.gain : styles.loss}>
            {hasVerifiedData ? `${Number(summary.totalGain || 0) >= 0 ? "▲" : "▼"} KES ${money(summary.totalGain)} (${number(summary.totalGainPct).toFixed(2)}%) total return` : "N/A — REAL data unavailable"}
          </Text>
          <View style={styles.quickMetrics}>
            <QuickMetric label="Cash" value={hasVerifiedData ? `KES ${compactMoney(summary.totalCash)}` : "N/A"} />
            <QuickMetric label="Holdings" value={hasVerifiedData ? String(summary.holdingsCount || 0) : "N/A"} />
            <QuickMetric label="Largest" value={hasVerifiedData ? largestSector?.sector || "N/A" : "N/A"} />
          </View>
        </View>

        <View style={styles.tabs}>
          {TABS.map((item) => <Pressable key={item} style={[styles.tab, tab === item && styles.tabActive]} onPress={() => setTab(item)}><Text style={tab === item ? styles.tabTextActive : styles.tabText}>{item}</Text></Pressable>)}
        </View>

        {tab === "Allocation" ? (
          <>
            <View style={styles.primaryCard}>
              <View style={styles.cardHeader}><View style={styles.flex}><Text style={styles.cardTitle}>Allocation</Text><Text style={styles.cardHint}>{diversification} diversification • use the sector buttons below</Text></View><Text style={styles.sectorCount}>{sectorRows.length} sectors</Text></View>
              <View style={styles.allocationMetrics}>
                <AllocationMetric label="Largest Sector" value={largestSector?.sector || "N/A"} />
                <AllocationMetric label="Weight" value={largestSector ? `${number(largestSector.weight).toFixed(1)}%` : "N/A"} />
                <AllocationMetric label="Diversification" value={diversification} />
              </View>
              {sectorRows.length ? <SectorDonut data={sectorRows} total={number(summary.totalValue)} size={chartSize} onSelect={setSelectedSector} /> : <EmptyPortfolio />}
              {sectorRows.slice(0, showAllSectors ? sectorRows.length : 3).map((sector, index) => <SectorRow key={sector.sector} sector={sector} color={COLORS[index % COLORS.length]} onPress={() => setSelectedSector(sector)} />)}
              {sectorRows.length > 3 ? <Pressable accessibilityRole="button" style={styles.sectorToggle} onPress={() => setShowAllSectors((current) => !current)}><Text style={styles.sectorToggleText}>{showAllSectors ? "Show Top 3 Sectors" : `View All ${sectorRows.length} Sectors`}</Text></Pressable> : null}
            </View>
            <CoachSummary largestSector={largestSector} diversification={diversification} />
            <QuickDestinations />
          </>
        ) : null}

        {tab === "Holdings" ? (
          <View style={styles.primaryCard}>
            <View style={styles.cardHeader}><View><Text style={styles.cardTitle}>Top Holdings</Text><Text style={styles.cardHint}>{summary.holdingsCount || 0} positions in this portfolio</Text></View></View>
            {topHoldings.length ? topHoldings.map((holding) => <HoldingRow key={holding.symbol} holding={holding} />) : <EmptyPortfolio />}
            <PrimaryRoute label={`View All ${summary.holdingsCount || ""} Holdings`} route="/holding-details" />
          </View>
        ) : null}

        {tab === "Performance" ? (
          <View style={styles.primaryCard}>
            <Text style={styles.cardTitle}>Verified Performance</Text>
            <Text style={styles.cardHint}>Current value compared with the actual recorded cost basis.</Text>
            <View style={styles.performanceHero}><Text style={styles.performanceLabel}>TOTAL RETURN</Text><Text style={Number(summary.totalGain || 0) >= 0 ? styles.performanceGain : styles.performanceLoss}>KES {money(summary.totalGain)}</Text><Text style={styles.performancePct}>{number(summary.totalGainPct).toFixed(2)}%</Text></View>
            <StatusBanner tone="info" title="Historical periods and benchmark" message="Open Performance for genuine snapshot history. Unavailable periods remain N/A rather than becoming synthetic returns." />
            <PrimaryRoute label="Open Performance Details" route="/performance" />
          </View>
        ) : null}

        {tab === "More" ? <MoreDestinations /> : null}

        <AccountModal visible={accountModalOpen} accounts={accounts} selected={selectedAccount} onSelect={selectAccount} onClose={() => setAccountModalOpen(false)} />
        <SectorModal sector={selectedSector} onClose={() => setSelectedSector(null)} />
      </ScrollView>
    </SafeAreaView>
  );
}

function buildSectorRows(holdings, totalValue) {
  const sectors = new Map();
  holdings.forEach((holding) => {
    const sector = holding.sector || "Other";
    const current = sectors.get(sector) || { sector, totalValue: 0, investedValue: 0, profitLoss: 0, securities: [] };
    current.totalValue += number(holding.marketValue || holding.value);
    current.investedValue += number(holding.investedValue || holding.costValue);
    current.profitLoss += number(holding.profitLoss);
    current.securities.push(holding);
    sectors.set(sector, current);
  });
  return [...sectors.values()].map((item) => ({
    ...item,
    weight: number(totalValue) > 0 ? item.totalValue / number(totalValue) * 100 : 0,
    profitLossPct: item.investedValue > 0 ? item.profitLoss / item.investedValue * 100 : null
  })).sort((a, b) => b.totalValue - a.totalValue);
}

function QuickMetric({ label, value }) { return <View style={styles.quickMetric}><Text style={styles.quickLabel}>{label}</Text><Text numberOfLines={1} style={styles.quickValue}>{value}</Text></View>; }

function AllocationMetric({ label, value }) { return <View style={styles.allocationMetric}><Text style={styles.allocationMetricLabel}>{label}</Text><Text numberOfLines={1} style={styles.allocationMetricValue}>{value}</Text></View>; }

function CoachSummary({ largestSector, diversification }) {
  const message = largestSector
    ? `${largestSector.sector} represents ${number(largestSector.weight).toFixed(1)}% of your portfolio. Your current diversification is ${diversification.toLowerCase()}.`
    : "Add or synchronize REAL holdings to receive a portfolio explanation.";
  return <Pressable style={styles.coachCard} onPress={() => router.push("/coach-insights")}><View style={styles.flex}><Text style={styles.coachLabel}>COACH G</Text><Text style={styles.coachText}>{message}</Text></View><Text style={styles.arrow}>›</Text></Pressable>;
}

function QuickDestinations() {
  return <View style={styles.destinationRow}><Destination label="Goal" route="/wealth-journey" /><Destination label="Journey" route="/investor-timeline" /><Destination label="Sync" route="/portfolio-sync-center" /></View>;
}

function Destination({ label, route }) { return <Pressable style={styles.destination} onPress={() => router.push(route)}><Text style={styles.destinationText}>{label}</Text><Text style={styles.destinationArrow}>›</Text></Pressable>; }

function MoreDestinations() {
  return <View>
    <CollapsibleSection title="Portfolio Details" summary="Holdings, activity, analytics, and synchronization" initiallyOpen>
      <Tool label="Portfolio Activity" route="/portfolio-activity" /><Tool label="Portfolio Analytics" route="/unified-portfolio-analytics" /><Tool label="Sync & Reconcile" route="/portfolio-sync-center" />
    </CollapsibleSection>
    <CollapsibleSection title="Journey & Guidance" summary="Goals, Coach G, profile, and investor timeline">
      <Tool label="Wealth Journey" route="/wealth-journey" /><Tool label="Coach G Insights" route="/coach-insights" /><Tool label="Investor Timeline" route="/investor-timeline" /><Tool label="My Profile" route="/my-profile" />
    </CollapsibleSection>
    <CollapsibleSection title="Actions" summary="Funds, trading, and separate Practice demo">
      <Tool label="Funds & Cash" route="/(tabs)/funds" /><Tool label="Trading" route="/(tabs)/trading" /><Tool label="Separate Practice Demo" route="/starter-plan" />
    </CollapsibleSection>
  </View>;
}

function Tool({ label, route }) { return <Pressable style={styles.tool} onPress={() => router.push(route)}><Text style={styles.toolText}>{label}</Text><Text style={styles.arrow}>›</Text></Pressable>; }
function PrimaryRoute({ label, route }) { return <Pressable style={styles.primaryButton} onPress={() => router.push(route)}><Text style={styles.primaryText}>{label}</Text></Pressable>; }

function HoldingRow({ holding }) {
  const gain = number(holding.profitLoss);
  return <View style={styles.holdingRow}><View style={styles.flex}><Text style={styles.symbol}>{holding.symbol || "N/A"}</Text><Text style={styles.holdingMeta}>Qty {number(holding.quantity).toLocaleString()} • {holding.sector || "Other"}</Text></View><View style={styles.alignRight}><Text style={styles.holdingValue}>KES {money(holding.marketValue)}</Text><Text style={gain >= 0 ? styles.gainSmall : styles.lossSmall}>{gain >= 0 ? "+" : ""}KES {money(gain)}</Text></View></View>;
}

function SectorRow({ sector, color, onPress }) {
  const direction = sector.profitLossPct === null || Math.abs(number(sector.profitLoss)) < 0.005
    ? "flat"
    : sector.profitLoss > 0 ? "up" : "down";
  const indicator = direction === "up" ? "▲" : direction === "down" ? "▼" : "—";
  const indicatorStyle = direction === "up" ? styles.sectorUp : direction === "down" ? styles.sectorDown : styles.sectorFlat;
  const returnLabel = sector.profitLossPct === null ? "return unavailable" : `${indicator} ${Math.abs(number(sector.profitLossPct)).toFixed(1)}%`;

  return <Pressable accessibilityRole="button" accessibilityLabel={`${sector.sector}, ${returnLabel}. Open sector securities`} hitSlop={4} style={({ pressed }) => [styles.sectorRow, pressed && styles.sectorRowPressed]} onPress={onPress}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={[styles.sectorDirection, indicatorStyle]}>{indicator}</Text><Text style={styles.sectorName}>{sector.sector}</Text><View style={styles.sectorNumbers}><Text style={styles.sectorValue}>KES {compactMoney(sector.totalValue)}</Text><Text style={indicatorStyle}>{sector.profitLossPct === null ? "N/A" : `${number(sector.profitLossPct) >= 0 ? "+" : ""}${number(sector.profitLossPct).toFixed(1)}%`}</Text></View><Text style={styles.sectorWeight}>{number(sector.weight).toFixed(1)}%</Text><Text style={styles.sectorArrow}>›</Text></Pressable>;
}

function SectorDonut({ data, total, size, onSelect }) {
  const center = size / 2;
  const outer = size * 0.39;
  const inner = size * 0.245;
  let angle = -90;
  return <View style={styles.chart}><Svg width={size} height={size}><G>{data.map((sector, index) => { const start = angle; const sweep = total > 0 ? sector.totalValue / total * 360 : 0; const end = start + sweep; const path = describeArc(center, center, outer, inner, start, end); const labelPoint = polar(center, center, outer + size * 0.055, start + sweep / 2); angle = end; return <G key={sector.sector}><Path d={path} fill={COLORS[index % COLORS.length]} stroke="#020617" strokeWidth={2} onPress={() => onSelect(sector)} /><SvgText pointerEvents="none" x={labelPoint.x} y={labelPoint.y + 3} fill="#f8fafc" fontSize="9" fontWeight="900" textAnchor="middle">{number(sector.weight).toFixed(1)}%</SvgText></G>; })}<SvgText pointerEvents="none" x={center} y={center - 13} fill="#94a3b8" fontSize="10" textAnchor="middle">Total Value</SvgText><SvgText pointerEvents="none" x={center} y={center + 2} fill="#94a3b8" fontSize="9" textAnchor="middle">KES</SvgText><SvgText pointerEvents="none" x={center} y={center + 22} fill="#f8fafc" fontSize="14" fontWeight="900" textAnchor="middle">{money(total)}</SvgText></G></Svg><Text style={styles.chartHint}>Tap a colored sector or its row to view securities</Text></View>;
}

function AccountModal({ visible, accounts, selected, onSelect, onClose }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}><Text style={styles.modalTitle}>Portfolio Source</Text>{accounts.map((account, index) => { const active = selected?.broker === account?.broker && selected?.type === account?.type; return <Pressable key={`${account.broker}-${index}`} style={styles.modalOption} onPress={() => onSelect(account)}><Text style={styles.modalOptionText}>{active ? "✓  " : ""}{account.label || account.name || account.broker}</Text></Pressable>; })}</Pressable></Pressable></Modal>;
}

function SectorModal({ sector, onClose }) {
  if (!sector) return null;
  return <Modal visible transparent presentationStyle="overFullScreen" animationType="slide" onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable style={styles.sectorModal} onPress={(event) => event.stopPropagation()}><View style={styles.cardHeader}><View style={styles.flex}><Text style={styles.modalTitle}>{sector.sector} Securities</Text><Text style={styles.cardHint}>{sector.securities.length} holdings • {number(sector.weight).toFixed(2)}% • KES {money(sector.totalValue)}</Text></View><Pressable accessibilityRole="button" style={styles.closeButton} onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable></View><ScrollView showsVerticalScrollIndicator={false}>{sector.securities.map((holding) => <HoldingRow key={holding.symbol} holding={holding} />)}</ScrollView></Pressable></Pressable></Modal>;
}

function EmptyPortfolio() { return <StatusBanner tone="info" title="No REAL holdings available" message="Connect or import a REAL portfolio to see allocation and holdings." />; }

function number(value) { const parsed = Number(value || 0); return Number.isFinite(parsed) ? parsed : 0; }
function money(value) { return number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function compactMoney(value) { return number(value).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 }); }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"; }
function polar(cx, cy, radius, angle) { const radians = (angle - 90) * Math.PI / 180; return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }; }
function describeArc(cx, cy, outer, inner, start, end) { const safeEnd = end - start >= 360 ? end - 0.01 : end; const o1 = polar(cx, cy, outer, safeEnd); const o2 = polar(cx, cy, outer, start); const i1 = polar(cx, cy, inner, start); const i2 = polar(cx, cy, inner, safeEnd); const large = safeEnd - start > 180 ? 1 : 0; return `M ${o1.x} ${o1.y} A ${outer} ${outer} 0 ${large} 0 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${inner} ${inner} 0 ${large} 1 ${i2.x} ${i2.y} Z`; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" }, screen: { flex: 1 }, content: { padding: 16, paddingBottom: 36, width: "100%", maxWidth: 760, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 }, iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" }, iconText: { color: "#67e8f9", fontSize: 22, fontWeight: "900" }, bell: { color: "#fbbf24", fontSize: 17 }, headerCopy: { flex: 1 }, title: { color: "white", fontSize: 25, fontWeight: "900" }, welcome: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  accountSelector: { marginTop: 8, minHeight: 54, paddingHorizontal: 14, borderRadius: 16, borderColor: "#334155", borderWidth: 1, backgroundColor: "#0f172a", flexDirection: "row", alignItems: "center" }, accountCopy: { flex: 1 }, accountLabel: { color: "#64748b", fontSize: 9, fontWeight: "900" }, accountName: { color: "#f8fafc", fontWeight: "900", marginTop: 3 }, accountChevron: { color: "#67e8f9", fontSize: 22, fontWeight: "900" },
  signInButton: { backgroundColor: "#7f1d1d", borderRadius: 13, minHeight: 46, marginTop: 8, alignItems: "center", justifyContent: "center" }, signInText: { color: "white", fontWeight: "900" },
  hero: { marginTop: 12, backgroundColor: "#1d0b38", borderColor: "#6b21a8", borderWidth: 1, borderRadius: 21, padding: 16 }, heroLabel: { color: "#d8b4fe", fontSize: 10, fontWeight: "900" }, heroValue: { color: "white", fontSize: 30, fontWeight: "900", marginTop: 4 }, gain: { color: "#86efac", fontWeight: "900", fontSize: 12, marginTop: 4 }, loss: { color: "#fca5a5", fontWeight: "900", fontSize: 12, marginTop: 4 }, quickMetrics: { flexDirection: "row", gap: 8, marginTop: 13 }, quickMetric: { flex: 1, minWidth: 0, backgroundColor: "#09051d", borderRadius: 12, padding: 10 }, quickLabel: { color: "#94a3b8", fontSize: 9 }, quickValue: { color: "white", fontWeight: "900", fontSize: 12, marginTop: 4 },
  tabs: { flexDirection: "row", gap: 6, marginTop: 12 }, tab: { flex: 1, minWidth: 0, minHeight: 44, borderRadius: 13, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }, tabActive: { backgroundColor: "#9333ea" }, tabText: { color: "#94a3b8", fontWeight: "900", fontSize: 11 }, tabTextActive: { color: "white", fontWeight: "900", fontSize: 11 },
  primaryCard: { marginTop: 12, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 20, padding: 15 }, cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 }, cardTitle: { color: "#67e8f9", fontSize: 18, fontWeight: "900" }, cardHint: { color: "#94a3b8", fontSize: 11, marginTop: 4 }, sectorCount: { color: "#c084fc", fontSize: 11, fontWeight: "900" }, flex: { flex: 1 }, allocationMetrics: { flexDirection: "row", gap: 7, marginTop: 12 }, allocationMetric: { flex: 1, minWidth: 0, minHeight: 62, borderRadius: 13, borderColor: "#334155", borderWidth: 1, backgroundColor: "#020617", padding: 9, justifyContent: "center" }, allocationMetricLabel: { color: "#94a3b8", fontSize: 9 }, allocationMetricValue: { color: "white", fontSize: 11, fontWeight: "900", marginTop: 5 }, chart: { alignItems: "center", justifyContent: "center", marginVertical: 5 }, chartHint: { color: "#94a3b8", fontSize: 10, marginTop: -4, marginBottom: 5 },
  sectorRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 7, borderTopColor: "#1e293b", borderTopWidth: 1, paddingHorizontal: 4 }, sectorRowPressed: { backgroundColor: "#1e293b" }, dot: { width: 10, height: 10, borderRadius: 5 }, sectorDirection: { width: 13, fontWeight: "900", textAlign: "center" }, sectorUp: { color: "#86efac", fontWeight: "900", fontSize: 10 }, sectorDown: { color: "#fca5a5", fontWeight: "900", fontSize: 10 }, sectorFlat: { color: "#94a3b8", fontWeight: "900", fontSize: 10 }, sectorName: { color: "#e2e8f0", fontWeight: "800", flex: 1 }, sectorNumbers: { alignItems: "flex-end", minWidth: 64 }, sectorValue: { color: "white", fontWeight: "900", fontSize: 10 }, sectorWeight: { color: "#e2e8f0", fontWeight: "900", fontSize: 10, width: 43, textAlign: "right" }, sectorArrow: { color: "#67e8f9", fontWeight: "900", fontSize: 22 }, sectorToggle: { minHeight: 46, marginTop: 10, borderRadius: 13, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" }, sectorToggleText: { color: "#67e8f9", fontWeight: "900" }, moreHint: { color: "#94a3b8", textAlign: "center", marginTop: 12, fontSize: 11 },
  coachCard: { marginTop: 12, backgroundColor: "#062031", borderColor: "#0e7490", borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center" }, coachLabel: { color: "#67e8f9", fontSize: 10, fontWeight: "900" }, coachText: { color: "white", lineHeight: 19, fontWeight: "700", marginTop: 5 }, arrow: { color: "#c084fc", fontSize: 24, fontWeight: "900", marginLeft: 8 },
  destinationRow: { flexDirection: "row", gap: 8, marginTop: 12 }, destination: { flex: 1, backgroundColor: "#1e293b", minHeight: 48, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center" }, destinationText: { color: "white", fontWeight: "900", fontSize: 12, flex: 1 }, destinationArrow: { color: "#67e8f9", fontSize: 19 },
  holdingRow: { minHeight: 64, flexDirection: "row", alignItems: "center", borderBottomColor: "#1e293b", borderBottomWidth: 1, paddingVertical: 9 }, symbol: { color: "white", fontWeight: "900", fontSize: 16 }, holdingMeta: { color: "#94a3b8", fontSize: 11, marginTop: 4 }, alignRight: { alignItems: "flex-end" }, holdingValue: { color: "white", fontWeight: "900", fontSize: 12 }, gainSmall: { color: "#86efac", fontWeight: "900", fontSize: 11, marginTop: 4 }, lossSmall: { color: "#fca5a5", fontWeight: "900", fontSize: 11, marginTop: 4 },
  primaryButton: { minHeight: 50, backgroundColor: "#9333ea", borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 15 }, primaryText: { color: "white", fontWeight: "900" }, performanceHero: { backgroundColor: "#020617", borderRadius: 16, padding: 16, marginTop: 14 }, performanceLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "900" }, performanceGain: { color: "#86efac", fontSize: 25, fontWeight: "900", marginTop: 5 }, performanceLoss: { color: "#fca5a5", fontSize: 25, fontWeight: "900", marginTop: 5 }, performancePct: { color: "white", fontWeight: "900", marginTop: 3 },
  tool: { minHeight: 48, backgroundColor: "#020617", borderRadius: 13, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", marginTop: 8 }, toolText: { color: "white", fontWeight: "900", flex: 1 },
  overlay: { flex: 1, backgroundColor: "rgba(2,6,23,.82)", justifyContent: "center", padding: 20 }, modal: { backgroundColor: "#0f172a", borderColor: "#334155", borderWidth: 1, borderRadius: 20, padding: 16 }, modalTitle: { color: "white", fontSize: 19, fontWeight: "900" }, modalOption: { minHeight: 50, justifyContent: "center", borderTopColor: "#1e293b", borderTopWidth: 1 }, modalOptionText: { color: "#f8fafc", fontWeight: "800" }, sectorModal: { backgroundColor: "#0f172a", borderColor: "#334155", borderWidth: 1, borderRadius: 22, padding: 16, maxHeight: "80%" }, closeButton: { width: 42, height: 42, backgroundColor: "#1e293b", borderRadius: 13, alignItems: "center", justifyContent: "center" }, closeText: { color: "white", fontSize: 25 }
});
