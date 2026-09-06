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
import { StatusBanner } from "../../components/mobile/MobileUI";
import { isNseMarketSessionOpen } from "../../services/markets/canonicalNseQuoteService";
import {
  derivePortfolioAccounts,
  mergePortfolioAccounts
} from "./portfolioAccountCatalogService";

const COLORS = ["#22d3ee", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];
const SECTORS_PER_PAGE = 5;
const ALL_ACCOUNTS = { broker: "ALL", label: "All Accounts", type: "ALL" };

export default function PortfolioHomeScreen() {
  const { user } = useAuth();
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [hasVerifiedData, setHasVerifiedData] = useState(false);
  const [holdings, setHoldings] = useState([]);
  const [cash, setCash] = useState(0);
  const [accounts, setAccounts] = useState([ALL_ACCOUNTS]);
  const [selectedAccount, setSelectedAccount] = useState(ALL_ACCOUNTS);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [sectorPage, setSectorPage] = useState(0);
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
  const largestSector = sectorRows[0] || null;
  const sectorPageCount = Math.max(1, Math.ceil(sectorRows.length / SECTORS_PER_PAGE));
  const currentSectorPage = Math.min(sectorPage, sectorPageCount - 1);
  const visibleSectorRows = sectorRows.slice(
    currentSectorPage * SECTORS_PER_PAGE,
    (currentSectorPage + 1) * SECTORS_PER_PAGE
  );
  const diversification = sectorRows.length >= 5 ? "Good" : sectorRows.length >= 3 ? "Moderate" : "Concentrated";
  const firstName = String(user?.username || user?.name || user?.email || "Investor").split(/[\s@.]/)[0];
  const chartSize = Math.min(Math.max(width - 140, 180), 230);
  const compactPhoneHeight = height < 850;
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

        <View style={styles.utilityRow}>
          <Pressable style={styles.accountSelector} onPress={() => setAccountModalOpen(true)}>
            <View style={styles.accountCopy}><Text style={styles.accountLabel}>REAL PORTFOLIO</Text><Text numberOfLines={1} style={styles.accountName}>{selectedAccount.label}</Text></View>
            <Text style={styles.accountChevron}>⌄</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View verified market price status"
            style={[styles.priceButton, marketData?.status === "LIVE" ? styles.priceButtonLive : styles.priceButtonVerified]}
            onPress={() => setPriceModalOpen(true)}
          >
            <Text style={styles.priceButtonLabel}>PRICES</Text>
            <Text numberOfLines={1} style={styles.priceButtonValue}>{marketData?.status === "LIVE" ? "Current ✓" : marketData ? "Verified ⓘ" : "Unavailable"}</Text>
          </Pressable>
        </View>

        {notice ? (
          <StatusBanner tone="danger" title="REAL portfolio unavailable" message={`${notice.message} GateCEP did not switch to Practice.`} />
        ) : null}
        {authenticatedAgain ? <Pressable style={styles.signInButton} onPress={() => router.push("/login")}><Text style={styles.signInText}>Sign In Again</Text></Pressable> : null}

        <View style={[styles.hero, compactPhoneHeight && styles.heroCompact]}>
          <Text style={styles.heroLabel}>{selectedAccount.type === "ALL" ? "REAL NET WORTH" : "ACCOUNT NET WORTH"}</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.heroValue, compactPhoneHeight && styles.heroValueCompact]}>{loading ? "Loading…" : hasVerifiedData ? `KES ${money(summary.netWorth)}` : "Unavailable"}</Text>
          <Text style={Number(summary.totalGain || 0) >= 0 ? styles.gain : styles.loss}>
            {hasVerifiedData ? `${Number(summary.totalGain || 0) >= 0 ? "▲" : "▼"} KES ${money(summary.totalGain)} (${number(summary.totalGainPct).toFixed(2)}%) total return` : "N/A — REAL data unavailable"}
          </Text>
          <View style={[styles.quickMetrics, compactPhoneHeight && styles.quickMetricsCompact]}>
            <QuickMetric label="Cash" value={hasVerifiedData ? `KES ${compactMoney(summary.totalCash)}` : "N/A"} />
            <QuickMetric label="Sectors" value={hasVerifiedData ? String(sectorRows.length || 0) : "N/A"} />
          </View>
        </View>

        <View style={styles.primaryCard}>
          <View style={styles.cardHeader}><View style={styles.flex}><Text style={styles.cardTitle}>Sector Allocation</Text><Text style={styles.cardHint}>{diversification} diversification • tap a sector for its securities</Text></View><View style={styles.largestSectorBadge}><Text style={styles.largestSectorLabel}>LARGEST</Text><Text numberOfLines={1} style={styles.largestSectorValue}>{largestSector ? `${largestSector.sector} ${number(largestSector.weight).toFixed(1)}%` : "N/A"}</Text></View></View>
          {sectorRows.length ? <SectorDonut data={sectorRows} total={number(summary.totalValue)} size={chartSize} onSelect={setSelectedSector} /> : <EmptyPortfolio />}
          {visibleSectorRows.map((sector) => {
            const colorIndex = sectorRows.findIndex((item) => item.sector === sector.sector);
            return <SectorRow key={sector.sector} sector={sector} color={COLORS[colorIndex % COLORS.length]} onPress={() => setSelectedSector(sector)} />;
          })}
          {sectorPageCount > 1 ? <View style={styles.sectorPager}><Pressable disabled={currentSectorPage === 0} style={[styles.pagerButton, currentSectorPage === 0 && styles.pagerButtonDisabled]} onPress={() => setSectorPage((page) => Math.max(0, page - 1))}><Text style={styles.pagerText}>‹ Previous</Text></Pressable><Text style={styles.pageStatus}>{currentSectorPage + 1} of {sectorPageCount}</Text><Pressable disabled={currentSectorPage >= sectorPageCount - 1} style={[styles.pagerButton, currentSectorPage >= sectorPageCount - 1 && styles.pagerButtonDisabled]} onPress={() => setSectorPage((page) => Math.min(sectorPageCount - 1, page + 1))}><Text style={styles.pagerText}>Next ›</Text></Pressable></View> : null}
        </View>

        <InvestorJourney />
        <PortfolioDestinations holdingsCount={summary.holdingsCount || 0} />

        <AccountModal visible={accountModalOpen} accounts={accounts} selected={selectedAccount} onSelect={selectAccount} onClose={() => setAccountModalOpen(false)} />
        <PriceStatusModal visible={priceModalOpen} marketData={marketData} onClose={() => setPriceModalOpen(false)} />
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

function InvestorJourney() {
  return <View style={styles.journey}><Text style={styles.journeyTitle}>Understand Your Portfolio</Text><Text style={styles.journeyHint}>Move from verified facts to explanation and then guidance.</Text><JourneyStep number="1" title="Portfolio Analysis" detail="Analyze portfolio numbers and performance." route="/unified-portfolio-analytics" accent="#22d3ee" /><JourneyStep number="2" title="Coach G Insights" detail="Understand risk and why the portfolio behaves this way." route="/(tabs)/coach" accent="#8b5cf6" /><JourneyStep number="3" title="Coach G Recommendations" detail="Review advisory-only rebalancing guidance." route="/portfolio-rebalancing" accent="#f59e0b" /></View>;
}

function JourneyStep({ number: stepNumber, title, detail, route, accent }) { return <Pressable style={styles.journeyStep} onPress={() => router.push(route)}><View style={[styles.stepNumber, { borderColor: accent }]}><Text style={[styles.stepNumberText, { color: accent }]}>{stepNumber}</Text></View><View style={styles.flex}><Text style={styles.journeyStepTitle}>{title}</Text><Text style={styles.journeyStepDetail}>{detail}</Text></View><Text style={styles.arrow}>›</Text></Pressable>; }

function PortfolioDestinations({ holdingsCount }) { return <View style={styles.portfolioDestinations}><Text style={styles.destinationHeading}>Portfolio Details</Text><View style={styles.destinationGrid}><Destination label={`Holdings (${holdingsCount})`} route="/holding-details" /><Destination label="Activity" route="/portfolio-activity" /><Destination label="Goals" route="/wealth-journey" /><Destination label="Sync" route="/portfolio-sync-center" /></View></View>; }

function Destination({ label, route }) { return <Pressable style={styles.destination} onPress={() => router.push(route)}><Text style={styles.destinationText}>{label}</Text><Text style={styles.destinationArrow}>›</Text></Pressable>; }

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
  function handleChartPress(event) {
    const x = number(event?.nativeEvent?.locationX);
    const y = number(event?.nativeEvent?.locationY);
    const distance = Math.hypot(x - center, y - center);
    if (distance < inner || distance > outer) return;
    const degrees = Math.atan2(y - center, x - center) * 180 / Math.PI;
    const position = (degrees + 180 + 360) % 360;
    let cumulative = 0;
    const selected = data.find((sector) => {
      cumulative += total > 0 ? number(sector.totalValue) / total * 360 : 0;
      return position <= cumulative;
    });
    if (selected) onSelect(selected);
  }
  return <View style={styles.chart}><Svg accessibilityRole="button" accessibilityLabel="Sector allocation chart. Tap a colored sector to view its securities" testID="portfolio-sector-donut" width={size} height={size} onPress={handleChartPress}><G>{data.map((sector, index) => { const start = angle; const sweep = total > 0 ? sector.totalValue / total * 360 : 0; const end = start + sweep; const path = describeArc(center, center, outer, inner, start, end); const labelPoint = polar(center, center, outer + size * 0.055, start + sweep / 2); angle = end; return <G key={sector.sector}><Path pointerEvents="none" d={path} fill={COLORS[index % COLORS.length]} stroke="#020617" strokeWidth={2} /><SvgText pointerEvents="none" x={labelPoint.x} y={labelPoint.y + 3} fill="#f8fafc" fontSize="9" fontWeight="900" textAnchor="middle">{number(sector.weight).toFixed(1)}%</SvgText></G>; })}<SvgText pointerEvents="none" x={center} y={center - 13} fill="#94a3b8" fontSize="10" textAnchor="middle">Total Value</SvgText><SvgText pointerEvents="none" x={center} y={center + 2} fill="#94a3b8" fontSize="9" textAnchor="middle">KES</SvgText><SvgText pointerEvents="none" x={center} y={center + 22} fill="#f8fafc" fontSize="14" fontWeight="900" textAnchor="middle">{money(total)}</SvgText></G></Svg><Text style={styles.chartHint}>Tap a colored sector or its row to view securities</Text></View>;
}

function AccountModal({ visible, accounts, selected, onSelect, onClose }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}><Text style={styles.modalTitle}>Portfolio Source</Text>{accounts.map((account, index) => { const active = selected?.broker === account?.broker && selected?.type === account?.type; return <Pressable key={`${account.broker}-${index}`} style={styles.modalOption} onPress={() => onSelect(account)}><Text style={styles.modalOptionText}>{active ? "✓  " : ""}{account.label || account.name || account.broker}</Text></Pressable>; })}</Pressable></Pressable></Modal>;
}

function PriceStatusModal({ visible, marketData, onClose }) {
  const live = marketData?.status === "LIVE";
  const coverage = marketData?.coverage;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}><View style={styles.cardHeader}><View style={styles.flex}><Text style={styles.modalTitle}>{live ? "Market prices current" : marketData ? "Using last verified prices" : "Price status unavailable"}</Text><Text style={styles.cardHint}>Verified valuation evidence for this REAL portfolio</Text></View><Pressable accessibilityRole="button" style={styles.closeButton} onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable></View>{marketData ? <View style={styles.priceDetails}><PriceDetail label="Coverage" value={`${coverage?.updated || 0} of ${coverage?.total || 0} holdings`} /><PriceDetail label="Source" value={marketData.source || "Verified broker/NSE evidence"} /><PriceDetail label="Effective time" value={formatEffectiveTime(marketData.updatedAt)} /></View> : null}<Text style={styles.priceExplanation}>{live ? "The displayed holdings were valued using current verified market prices." : marketData ? "Where a genuine current quote was unavailable, GateCEP retained the latest verified broker valuation price. No price was fabricated." : "GateCEP cannot confirm the current valuation source at this time."}</Text><Pressable style={styles.modalDone} onPress={onClose}><Text style={styles.modalDoneText}>Done</Text></Pressable></Pressable></Pressable></Modal>;
}

function PriceDetail({ label, value }) { return <View style={styles.priceDetail}><Text style={styles.priceDetailLabel}>{label}</Text><Text numberOfLines={2} style={styles.priceDetailValue}>{value}</Text></View>; }

function SectorModal({ sector, onClose }) {
  if (!sector) return null;
  return <Modal visible transparent presentationStyle="overFullScreen" animationType="slide" onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable style={styles.sectorModal} onPress={(event) => event.stopPropagation()}><View style={styles.cardHeader}><View style={styles.flex}><Text style={styles.modalTitle}>{sector.sector} Securities</Text><Text style={styles.cardHint}>{sector.securities.length} holdings • {number(sector.weight).toFixed(2)}% • KES {money(sector.totalValue)}</Text></View><Pressable accessibilityRole="button" style={styles.closeButton} onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable></View><ScrollView showsVerticalScrollIndicator={false}>{sector.securities.map((holding) => <HoldingRow key={holding.symbol} holding={holding} />)}</ScrollView></Pressable></Pressable></Modal>;
}

function EmptyPortfolio() { return <StatusBanner tone="info" title="No REAL holdings available" message="Connect or import a REAL portfolio to see allocation and holdings." />; }

function number(value) { const parsed = Number(value || 0); return Number.isFinite(parsed) ? parsed : 0; }
function money(value) { return number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function compactMoney(value) { return number(value).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 }); }
function formatEffectiveTime(value) { if (!value) return "Not reported"; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString(); }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"; }
function polar(cx, cy, radius, angle) { const radians = (angle - 90) * Math.PI / 180; return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }; }
function describeArc(cx, cy, outer, inner, start, end) { const safeEnd = end - start >= 360 ? end - 0.01 : end; const o1 = polar(cx, cy, outer, safeEnd); const o2 = polar(cx, cy, outer, start); const i1 = polar(cx, cy, inner, start); const i2 = polar(cx, cy, inner, safeEnd); const large = safeEnd - start > 180 ? 1 : 0; return `M ${o1.x} ${o1.y} A ${outer} ${outer} 0 ${large} 0 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${inner} ${inner} 0 ${large} 1 ${i2.x} ${i2.y} Z`; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" }, screen: { flex: 1 }, content: { padding: 16, paddingBottom: 36, width: "100%", maxWidth: 760, alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 }, iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" }, iconText: { color: "#67e8f9", fontSize: 22, fontWeight: "900" }, bell: { color: "#fbbf24", fontSize: 17 }, headerCopy: { flex: 1 }, title: { color: "white", fontSize: 25, fontWeight: "900" }, welcome: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  utilityRow: { flexDirection: "row", gap: 8, marginTop: 8 }, accountSelector: { flex: 1.65, minWidth: 0, minHeight: 54, paddingHorizontal: 13, borderRadius: 16, borderColor: "#334155", borderWidth: 1, backgroundColor: "#0f172a", flexDirection: "row", alignItems: "center" }, accountCopy: { flex: 1, minWidth: 0 }, accountLabel: { color: "#64748b", fontSize: 9, fontWeight: "900" }, accountName: { color: "#f8fafc", fontWeight: "900", marginTop: 3 }, accountChevron: { color: "#67e8f9", fontSize: 22, fontWeight: "900" }, priceButton: { flex: 1, minWidth: 0, minHeight: 54, borderRadius: 16, borderWidth: 1, paddingHorizontal: 11, justifyContent: "center" }, priceButtonLive: { backgroundColor: "#052e2b", borderColor: "#0f766e" }, priceButtonVerified: { backgroundColor: "#23180b", borderColor: "#92400e" }, priceButtonLabel: { color: "#94a3b8", fontSize: 9, fontWeight: "900" }, priceButtonValue: { color: "#f8fafc", fontSize: 12, fontWeight: "900", marginTop: 3 },
  signInButton: { backgroundColor: "#7f1d1d", borderRadius: 13, minHeight: 46, marginTop: 8, alignItems: "center", justifyContent: "center" }, signInText: { color: "white", fontWeight: "900" },
  hero: { marginTop: 8, backgroundColor: "#1d0b38", borderColor: "#6b21a8", borderWidth: 1, borderRadius: 18, paddingVertical: 10, paddingHorizontal: 13 }, heroCompact: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16 }, heroLabel: { color: "#d8b4fe", fontSize: 9, fontWeight: "900" }, heroValue: { color: "white", fontSize: 25, fontWeight: "900", marginTop: 2 }, heroValueCompact: { fontSize: 23, marginTop: 1 }, gain: { color: "#86efac", fontWeight: "900", fontSize: 11, marginTop: 2 }, loss: { color: "#fca5a5", fontWeight: "900", fontSize: 11, marginTop: 2 }, quickMetrics: { flexDirection: "row", gap: 6, marginTop: 7 }, quickMetricsCompact: { marginTop: 6 }, quickMetric: { flex: 1, minWidth: 0, backgroundColor: "#09051d", borderRadius: 10, paddingVertical: 6, paddingHorizontal: 8 }, quickLabel: { color: "#94a3b8", fontSize: 8 }, quickValue: { color: "white", fontWeight: "900", fontSize: 11, marginTop: 2 },
  primaryCard: { marginTop: 10, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 20, padding: 15 }, cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 }, cardTitle: { color: "#67e8f9", fontSize: 18, fontWeight: "900" }, cardHint: { color: "#94a3b8", fontSize: 11, marginTop: 4 }, largestSectorBadge: { maxWidth: "42%", borderRadius: 11, borderWidth: 1, borderColor: "#6b21a8", backgroundColor: "#1d0b38", paddingHorizontal: 9, paddingVertical: 7 }, largestSectorLabel: { color: "#94a3b8", fontSize: 7, fontWeight: "900" }, largestSectorValue: { color: "#d8b4fe", fontSize: 10, fontWeight: "900", marginTop: 2 }, flex: { flex: 1 }, chart: { alignItems: "center", justifyContent: "center", marginVertical: 2 }, chartHint: { color: "#94a3b8", fontSize: 9, marginTop: -3, marginBottom: 3 },
  sectorRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 7, borderTopColor: "#1e293b", borderTopWidth: 1, paddingHorizontal: 4 }, sectorRowPressed: { backgroundColor: "#1e293b" }, dot: { width: 10, height: 10, borderRadius: 5 }, sectorDirection: { width: 13, fontWeight: "900", textAlign: "center" }, sectorUp: { color: "#86efac", fontWeight: "900", fontSize: 10 }, sectorDown: { color: "#fca5a5", fontWeight: "900", fontSize: 10 }, sectorFlat: { color: "#94a3b8", fontWeight: "900", fontSize: 10 }, sectorName: { color: "#e2e8f0", fontWeight: "800", flex: 1 }, sectorNumbers: { alignItems: "flex-end", minWidth: 64 }, sectorValue: { color: "white", fontWeight: "900", fontSize: 10 }, sectorWeight: { color: "#e2e8f0", fontWeight: "900", fontSize: 10, width: 43, textAlign: "right" }, sectorArrow: { color: "#67e8f9", fontWeight: "900", fontSize: 22 }, sectorPager: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }, pagerButton: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" }, pagerButtonDisabled: { opacity: 0.35 }, pagerText: { color: "#67e8f9", fontWeight: "900", fontSize: 11 }, pageStatus: { color: "#94a3b8", fontWeight: "800", fontSize: 10 },
  arrow: { color: "#c084fc", fontSize: 24, fontWeight: "900", marginLeft: 8 }, journey: { marginTop: 12, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 20, padding: 15 }, journeyTitle: { color: "#67e8f9", fontSize: 18, fontWeight: "900" }, journeyHint: { color: "#94a3b8", fontSize: 11, marginTop: 4, marginBottom: 4 }, journeyStep: { minHeight: 66, flexDirection: "row", alignItems: "center", borderTopColor: "#1e293b", borderTopWidth: 1, marginTop: 8, paddingTop: 8 }, stepNumber: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center", marginRight: 10 }, stepNumberText: { fontWeight: "900" }, journeyStepTitle: { color: "white", fontWeight: "900" }, journeyStepDetail: { color: "#94a3b8", fontSize: 10, marginTop: 3, lineHeight: 14 }, portfolioDestinations: { marginTop: 12 }, destinationHeading: { color: "#e2e8f0", fontWeight: "900", marginBottom: 8 }, destinationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, destination: { width: "48%", flexGrow: 1, backgroundColor: "#1e293b", minHeight: 48, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center" }, destinationText: { color: "white", fontWeight: "900", fontSize: 12, flex: 1 }, destinationArrow: { color: "#67e8f9", fontSize: 19 },
  holdingRow: { minHeight: 64, flexDirection: "row", alignItems: "center", borderBottomColor: "#1e293b", borderBottomWidth: 1, paddingVertical: 9 }, symbol: { color: "white", fontWeight: "900", fontSize: 16 }, holdingMeta: { color: "#94a3b8", fontSize: 11, marginTop: 4 }, alignRight: { alignItems: "flex-end" }, holdingValue: { color: "white", fontWeight: "900", fontSize: 12 }, gainSmall: { color: "#86efac", fontWeight: "900", fontSize: 11, marginTop: 4 }, lossSmall: { color: "#fca5a5", fontWeight: "900", fontSize: 11, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: "rgba(2,6,23,.82)", justifyContent: "center", padding: 20 }, modal: { backgroundColor: "#0f172a", borderColor: "#334155", borderWidth: 1, borderRadius: 20, padding: 16 }, modalTitle: { color: "white", fontSize: 19, fontWeight: "900" }, modalOption: { minHeight: 50, justifyContent: "center", borderTopColor: "#1e293b", borderTopWidth: 1 }, modalOptionText: { color: "#f8fafc", fontWeight: "800" }, priceDetails: { marginTop: 14, gap: 8 }, priceDetail: { backgroundColor: "#020617", borderRadius: 12, padding: 11 }, priceDetailLabel: { color: "#94a3b8", fontSize: 9, fontWeight: "800" }, priceDetailValue: { color: "#f8fafc", fontWeight: "900", marginTop: 4 }, priceExplanation: { color: "#cbd5e1", lineHeight: 19, marginTop: 14 }, modalDone: { minHeight: 46, borderRadius: 13, backgroundColor: "#0891b2", alignItems: "center", justifyContent: "center", marginTop: 16 }, modalDoneText: { color: "white", fontWeight: "900" }, sectorModal: { backgroundColor: "#0f172a", borderColor: "#334155", borderWidth: 1, borderRadius: 22, padding: 16, maxHeight: "80%" }, closeButton: { width: 42, height: 42, backgroundColor: "#1e293b", borderRadius: 13, alignItems: "center", justifyContent: "center" }, closeText: { color: "white", fontSize: 25 }
});
