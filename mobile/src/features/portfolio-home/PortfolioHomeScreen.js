import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import Svg, { G, Path, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../auth/hooks/useAuth";
import {
  loadPortfolioAccounts,
  loadUnifiedPortfolioRuntime
} from "../../portfolio/unifiedPortfolioApi";
import { calculatePortfolioSummary } from "../../shared/portfolio/engine";
import { loadInvestorContext } from "../investor/investorContextStore";
import { StatusBanner } from "../../components/mobile/MobileUI";
import {
  isNseMarketSessionOpen,
  loadCanonicalNseQuotes,
  overlayCanonicalNseQuotes
} from "../../services/markets/canonicalNseQuoteService";
import {
  applySecurityMaster,
  isCurrentNseSecurity
} from "../../utils/nseSecurityMaster";
import {
  derivePortfolioAccounts,
  mergePortfolioAccounts
} from "./portfolioAccountCatalogService";
import { unreadAlertCount } from "../../services/alerts/alertStore";

const COLORS = ["#22d3ee", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899"];
const SECTORS_PER_PAGE = 5;
const ALL_ACCOUNTS = { broker: "ALL", label: "All Accounts", type: "ALL" };
const PRACTICE_ACCOUNT = {
  broker: "GATECEP_PRACTICE",
  label: "Practice Portfolio",
  type: "PRACTICE",
  isPractice: true
};

export default function PortfolioHomeScreen() {
  const { user } = useAuth();
  const { width, height } = useWindowDimensions();
  const wideWeb = Platform.OS === "web" && width >= 1100;
  const [loading, setLoading] = useState(true);
  const [hasVerifiedData, setHasVerifiedData] = useState(false);
  const [holdings, setHoldings] = useState([]);
  const [cash, setCash] = useState(0);
  const [accounts, setAccounts] = useState([ALL_ACCOUNTS]);
  const [selectedAccount, setSelectedAccount] = useState(ALL_ACCOUNTS);
  const [practiceAvailable, setPracticeAvailable] = useState(false);
  const [dashboardSourceResolved, setDashboardSourceResolved] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [sectorPage, setSectorPage] = useState(0);
  const [notice, setNotice] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!dashboardSourceResolved) {
      resolveInitialDashboardSource();
      return undefined;
    }

    loadHome(selectedAccount);
    unreadAlertCount().then(setUnreadAlerts).catch(() => setUnreadAlerts(0));

    if (selectedAccount?.type === "PRACTICE") {
      return undefined;
    }

    if (!isNseMarketSessionOpen()) return undefined;

    const refreshTimer = setInterval(
      () => loadHome(selectedAccount),
      60 * 1000
    );

    return () => clearInterval(refreshTimer);
  }, [selectedAccount, dashboardSourceResolved]));

  async function resolveInitialDashboardSource() {
    try {
      setLoading(true);

      const context = await loadInvestorContext();
      const practice = context?.practicePortfolio || null;
      const hasPractice =
        practice?.status === "ACTIVE" &&
        Array.isArray(practice?.holdings) &&
        practice.holdings.length > 0;

      setPracticeAvailable(hasPractice);

      let realAccounts = [];

      try {
        const accountResult = await loadPortfolioAccounts();
        realAccounts = Array.isArray(accountResult?.accounts)
          ? accountResult.accounts
          : [];
      } catch {
        realAccounts = [];
      }

      /*
       * New Practice-only investors enter Practice automatically.
       * Existing investors with REAL account evidence remain REAL.
       *
       * This is source selection, not a fallback:
       * a later REAL runtime failure never changes the selected source.
       */
      if (hasPractice && realAccounts.length === 0) {
        setSelectedAccount(PRACTICE_ACCOUNT);
      } else {
        setSelectedAccount(ALL_ACCOUNTS);
      }
    } finally {
      setDashboardSourceResolved(true);
      setLoading(false);
    }
  }

  async function loadHome(account = ALL_ACCOUNTS) {
    if (account?.type === "PRACTICE") {
      return loadPracticeHome();
    }

    return loadRealHome(account);
  }

  async function loadPracticeHome() {
    try {
      setLoading(true);

      const context = await loadInvestorContext();
      const practice = context?.practicePortfolio || {};
      const practiceHoldings = Array.isArray(practice?.holdings)
        ? practice.holdings
        : [];
      const practiceCash = Number(practice?.availableCash || 0);

      setPracticeAvailable(
        practice?.status === "ACTIVE" &&
        practiceHoldings.length > 0
      );

      setAccounts((current) => {
        const realAccounts = current.filter(
          (item) => item?.type !== "PRACTICE"
        );

        return practiceHoldings.length
          ? [PRACTICE_ACCOUNT, ...realAccounts]
          : realAccounts;
      });

      /*
       * PC-031B4M7C5D7I6C
       *
       * Practice accounting remains persisted exactly as executed.
       * Current market valuation is an observational overlay only:
       * no quote movement writes back to practicePortfolio.
       */
      const quoteSnapshot =
        await loadCanonicalNseQuotes().catch(() => ({
          status: "UNAVAILABLE",
          source: null,
          generatedAt: null,
          receivedAt: null,
          quotes: [],
          error: "Market prices are unavailable."
        }));

      /*
       * PC-031B4M7C5D7I6E3
       *
       * Normalize security identity for presentation/valuation
       * without rewriting persisted Practice holdings.
       *
       * This also repairs legacy "NSE" sector placeholders at
       * read time when the symbol exists in the canonical
       * security master.
       */
      const canonicalPracticeHoldings =
        practiceHoldings.map((holding) => {
          const canonicalHolding =
            applySecurityMaster(holding);

          /*
           * PC-031B4M7C5D7I6E4D5C2
           *
           * Current eligibility is presentation evidence only.
           * A security absent from the current canonical NSE
           * universe remains readable as historical Practice
           * evidence and is never rewritten or deleted here.
           *
           * Do not infer DELISTED or SUSPENDED from absence
           * alone; those lifecycle states require separate
           * verified corporate-action evidence.
           */
          return {
            ...canonicalHolding,
            currentSecurityAvailable:
              isCurrentNseSecurity(
                canonicalHolding?.symbol
              )
          };
        });

      const practiceValuation =
        overlayCanonicalNseQuotes(
          canonicalPracticeHoldings,
          quoteSnapshot
        );

      setHoldings(practiceValuation.holdings);
      setCash(practiceCash);

      setMarketData({
        status: quoteSnapshot?.status || "UNAVAILABLE",
        source: quoteSnapshot?.source || null,
        updatedAt:
          quoteSnapshot?.generatedAt ||
          quoteSnapshot?.receivedAt ||
          null,
        coverage: {
          updated: practiceValuation.updatedCount,
          total: practiceValuation.totalCount
        },
        practice: true
      });

      setHasVerifiedData(true);
      setNotice(null);
    } catch (error) {
      setHoldings([]);
      setCash(0);
      setHasVerifiedData(false);
      setMarketData(null);
      setNotice({
        status: "PRACTICE_DATA_UNAVAILABLE",
        message:
          error?.message ||
          "Practice portfolio data is unavailable."
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadRealHome(account = ALL_ACCOUNTS) {
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
      setAccounts([
        ...(practiceAvailable ? [PRACTICE_ACCOUNT] : []),
        ALL_ACCOUNTS,
        ...accountCatalog
      ]);

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
  const authenticatedAgain =
    notice?.status === "AUTH_REQUIRED" ||
    notice?.status === "AUTH_EXPIRED";
  const isPractice = selectedAccount?.type === "PRACTICE";

  function selectAccount(account) {
    setSelectedAccount(account);
    setAccountModalOpen(false);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          wideWeb && styles.contentWideWeb
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {!wideWeb ? (
            <Pressable
              style={styles.iconButton}
              onPress={() => router.push("/menu")}
            >
              <Text style={styles.iconText}>\u2630</Text>
            </Pressable>
          ) : null}
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Portfolio</Text>
            <Text style={styles.welcome}>Good {greeting()}, {firstName}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unreadAlerts > 0
                ? `${unreadAlerts} unread Coach G alerts`
                : "Coach G alerts"
            }
            accessibilityHint="Opens Intelligence Center alerts"
            style={[styles.iconButton, styles.alertButton]}
            onPress={() => router.push("/intelligence-center")}
          >
            <Ionicons
              name="notifications-outline"
              size={17}
              color="#fbbf24"
            />
            {unreadAlerts > 0 ? (
              <Text style={styles.alertCount}>
                {unreadAlerts > 99 ? "99+" : unreadAlerts}
              </Text>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.utilityRow}>
          <Pressable style={styles.accountSelector} onPress={() => setAccountModalOpen(true)}>
            <View style={styles.accountCopy}><Text style={styles.accountLabel}>{isPractice ? "PRACTICE PORTFOLIO" : "REAL PORTFOLIO"}</Text><Text numberOfLines={1} style={styles.accountName}>{selectedAccount.label}</Text></View>
            <Text style={styles.accountChevron}>⌄</Text>
          </Pressable>
          {isPractice ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Practice market price status"
              style={[
                styles.priceButton,
                marketData?.status === "LIVE"
                  ? styles.priceButtonLive
                  : marketData?.status === "STALE"
                    ? styles.priceButtonVerified
                    : styles.practiceBadge
              ]}
              onPress={() => setPriceModalOpen(true)}
            >
              <Text style={styles.priceButtonLabel}>
                PRACTICE PRICES
              </Text>

              <Text
                numberOfLines={1}
                style={styles.priceButtonValue}
              >
                {marketData?.status === "LIVE"
                  ? "Current ✓"
                  : marketData?.status === "STALE"
                    ? "Last Verified ⓘ"
                    : "Unavailable"}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View verified market price status"
              style={[styles.priceButton, marketData?.status === "LIVE" ? styles.priceButtonLive : styles.priceButtonVerified]}
              onPress={() => setPriceModalOpen(true)}
            >
              <Text style={styles.priceButtonLabel}>PRICES</Text>
              <Text numberOfLines={1} style={styles.priceButtonValue}>{marketData?.status === "LIVE" ? "Current ✓" : marketData ? "Verified ⓘ" : "Unavailable"}</Text>
            </Pressable>
          )}
        </View>

        {notice ? (
          <StatusBanner
            tone="danger"
            title={isPractice ? "Practice portfolio unavailable" : "REAL portfolio unavailable"}
            message={
              isPractice
                ? notice.message
                : `${notice.message} GateCEP did not switch to Practice.`
            }
          />
        ) : null}

        {isPractice && !notice ? (
          <StatusBanner
            tone="info"
            title="Practice Portfolio"
            message="SIMULATED — NO REAL MONEY. Practice activity never changes your REAL broker holdings, cash, or history."
          />
        ) : null}

        {authenticatedAgain ? <Pressable style={styles.signInButton} onPress={() => router.push("/login")}><Text style={styles.signInText}>Sign In Again</Text></Pressable> : null}

        <View style={wideWeb ? styles.webSummaryRow : null}>
          {isPractice && !notice ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Practice Funds"
              style={[
                styles.practiceFundsAction,
                wideWeb && styles.practiceFundsActionWide
              ]}
              onPress={() =>
                router.push(
                  "/(tabs)/funds?source=PRACTICE"
                )
              }
            >
              <View style={styles.flex}>
                <Text style={styles.practiceFundsEyebrow}>
                  PRACTICE BUYING POWER
                </Text>

                <Text style={styles.practiceFundsTitle}>
                  Practice Funds
                </Text>

                <Text style={styles.practiceFundsText}>
                  Available Cash: KES {money(summary.totalCash)}
                  {"\n"}
                  Deposit or withdraw simulated funds before Practice execution.
                </Text>
              </View>

              <Text style={styles.practiceFundsArrow}>
                ›
              </Text>
            </Pressable>
          ) : null}

          <View
            style={[
              styles.hero,
              compactPhoneHeight && styles.heroCompact,
              wideWeb && styles.heroWide
            ]}
          >
            <Text style={styles.heroLabel}>{isPractice ? "PRACTICE NET WORTH" : selectedAccount.type === "ALL" ? "REAL NET WORTH" : "ACCOUNT NET WORTH"}</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.heroValue, compactPhoneHeight && styles.heroValueCompact]}>{loading ? "Loading…" : hasVerifiedData ? `KES ${money(summary.netWorth)}` : "Unavailable"}</Text>
            <Text style={Number(summary.totalGain || 0) >= 0 ? styles.gain : styles.loss}>
              {hasVerifiedData ? `${Number(summary.totalGain || 0) >= 0 ? "▲" : "▼"} KES ${money(summary.totalGain)} (${number(summary.totalGainPct).toFixed(2)}%)` : isPractice ? "N/A — Practice data unavailable" : "N/A — REAL data unavailable"}
            </Text>
            <View style={[styles.quickMetrics, compactPhoneHeight && styles.quickMetricsCompact]}>
              <QuickMetric label="Cash" value={hasVerifiedData ? `KES ${compactMoney(summary.totalCash)}` : "N/A"} />
              <QuickMetric label="Sectors" value={hasVerifiedData ? String(sectorRows.length || 0) : "N/A"} />
            </View>
          </View>
        </View>

        <View style={styles.primaryCard}>
          <View style={styles.cardHeader}><View style={styles.flex}><Text style={styles.cardTitle}>Sector Allocation</Text><Text style={styles.cardHint}>{diversification} diversification • tap a sector for its securities</Text></View><View style={styles.largestSectorBadge}><Text style={styles.largestSectorLabel}>LARGEST</Text><Text numberOfLines={1} style={styles.largestSectorValue}>{largestSector ? `${largestSector.sector} ${number(largestSector.weight).toFixed(1)}%` : "N/A"}</Text></View></View>
          <View style={wideWeb ? styles.sectorWorkspaceWide : null}>
            <View style={wideWeb ? styles.sectorChartPaneWide : null}>
              {sectorRows.length ? (
                <SectorDonut
                  data={sectorRows}
                  total={number(summary.totalValue)}
                  size={chartSize}
                  onSelect={setSelectedSector}
                />
              ) : (
                <EmptyPortfolio isPractice={isPractice} />
              )}
            </View>

            <View style={wideWeb ? styles.sectorRowsPaneWide : null}>
              {visibleSectorRows.map((sector) => {
                const colorIndex = sectorRows.findIndex(
                  (item) => item.sector === sector.sector
                );

                return (
                  <SectorRow
                    key={sector.sector}
                    sector={sector}
                    color={COLORS[colorIndex % COLORS.length]}
                    onPress={() => setSelectedSector(sector)}
                  />
                );
              })}

              {sectorPageCount > 1 ? (
                <View style={styles.sectorPager}>
                  <Pressable
                    disabled={currentSectorPage === 0}
                    style={[
                      styles.pagerButton,
                      currentSectorPage === 0 && styles.pagerButtonDisabled
                    ]}
                    onPress={() =>
                      setSectorPage((page) => Math.max(0, page - 1))
                    }
                  >
                    <Text style={styles.pagerText}>‹ Previous</Text>
                  </Pressable>

                  <Text style={styles.pageStatus}>
                    {currentSectorPage + 1} of {sectorPageCount}
                  </Text>

                  <Pressable
                    disabled={currentSectorPage >= sectorPageCount - 1}
                    style={[
                      styles.pagerButton,
                      currentSectorPage >= sectorPageCount - 1 &&
                        styles.pagerButtonDisabled
                    ]}
                    onPress={() =>
                      setSectorPage((page) =>
                        Math.min(sectorPageCount - 1, page + 1)
                      )
                    }
                  >
                    <Text style={styles.pagerText}>Next ›</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <CoachInsightsHandoff isPractice={isPractice} />

        <AccountModal visible={accountModalOpen} accounts={accounts} selected={selectedAccount} onSelect={selectAccount} onClose={() => setAccountModalOpen(false)} />
        <PriceStatusModal
          visible={priceModalOpen}
          marketData={marketData}
          isPractice={isPractice}
          onClose={() => setPriceModalOpen(false)}
        />
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

function CoachInsightsHandoff({ isPractice = false }) {
  const route = isPractice
    ? "/coach-insights"
    : "/(tabs)/coach";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        isPractice
          ? "Open Practice Coach G Lab"
          : "Open REAL Coach G Analysis Center"
      }
      style={styles.coachHandoff}
      onPress={() => router.push(route)}
    >
      <View style={styles.flex}>
        <Text style={styles.coachHandoffEyebrow}>
          {isPractice ? "PRACTICE NEXT" : "NEXT"}
        </Text>

        <Text style={styles.coachHandoffTitle}>
          {isPractice
            ? "Explore this Practice Portfolio with Coach G"
            : "Understand this portfolio with Coach G"}
        </Text>

        <Text style={styles.coachHandoffText}>
          {isPractice
            ? "Open the Practice Coach G Lab for simulated portfolio guidance. No REAL holdings, cash, orders, or history are changed."
            : "Open analysis, performance, risk, holdings, goals, and evidence in one guided place."}
        </Text>
      </View>

      <Text style={styles.coachHandoffArrow}>›</Text>
    </Pressable>
  );
}

function HoldingRow({ holding }) {
  const gain = number(holding.profitLoss);

  const historicalSecurity =
    holding?.currentSecurityAvailable === false;

  return (
    <View style={styles.holdingRow}>
      <View style={styles.flex}>
        <View style={styles.holdingIdentityRow}>
          <Text style={styles.symbol}>
            {holding.symbol || "N/A"}
          </Text>

          {historicalSecurity ? (
            <View
              style={styles.historicalSecurityBadge}
              accessibilityLabel="Historical security, not currently available"
            >
              <Text
                style={
                  styles.historicalSecurityBadgeText
                }
              >
                HISTORICAL
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.holdingMeta}>
          Qty {number(holding.quantity).toLocaleString()}
          {" • "}
          {holding.sector || "Other"}
        </Text>

        {historicalSecurity ? (
          <Text
            style={styles.historicalSecurityNote}
          >
            Not currently available for new Practice orders
          </Text>
        ) : null}
      </View>

      <View style={styles.alignRight}>
        <Text style={styles.holdingValue}>
          KES {money(holding.marketValue)}
        </Text>

        <Text
          style={
            gain >= 0
              ? styles.gainSmall
              : styles.lossSmall
          }
        >
          {gain >= 0 ? "+" : ""}
          KES {money(gain)}
        </Text>
      </View>
    </View>
  );
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
  if (Platform.OS === "web") {
    return <WebSectorDonut data={data} total={total} size={size} onSelect={onSelect} />;
  }

  const center = size / 2;
  const outer = size * 0.39;
  const inner = size * 0.245;
  let angle = -90;
  function handleChartPress(event) {
    const x = number(
      event?.nativeEvent?.locationX ??
      event?.nativeEvent?.offsetX
    );
    const y = number(
      event?.nativeEvent?.locationY ??
      event?.nativeEvent?.offsetY
    );
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
  return <View style={styles.chart}><View style={[styles.chartCanvas, { width: size, height: size }]}><Svg accessibilityRole="button" accessibilityLabel="Sector allocation chart. Tap a colored sector to view its securities" testID="portfolio-sector-donut" width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet" style={styles.chartSvg} onPress={handleChartPress}><G>{data.map((sector, index) => { const start = angle; const sweep = total > 0 ? sector.totalValue / total * 360 : 0; const end = start + sweep; const path = describeArc(center, center, outer, inner, start, end); const labelPoint = polar(center, center, outer + size * 0.055, start + sweep / 2); angle = end; return <G key={sector.sector}><Path pointerEvents="none" d={path} fill={COLORS[index % COLORS.length]} stroke="#020617" strokeWidth={2} /><SvgText pointerEvents="none" x={labelPoint.x} y={labelPoint.y + 3} fill="#f8fafc" fontSize="9" fontWeight="900" textAnchor="middle">{number(sector.weight).toFixed(1)}%</SvgText></G>; })}<SvgText pointerEvents="none" x={center} y={center - 13} fill="#94a3b8" fontSize="10" textAnchor="middle">Total Value</SvgText><SvgText pointerEvents="none" x={center} y={center + 2} fill="#94a3b8" fontSize="9" textAnchor="middle">KES</SvgText><SvgText pointerEvents="none" x={center} y={center + 22} fill="#f8fafc" fontSize="14" fontWeight="900" textAnchor="middle">{money(total)}</SvgText></G></Svg></View><Text style={styles.chartHint}>Tap a colored sector or its row to view securities</Text></View>;
}

function WebSectorDonut({ data, total, size, onSelect }) {
  const center = size / 2;
  const outer = size * 0.39;
  const inner = size * 0.245;
  let angle = -90;
  const element = React.createElement;
  const segments = data.map((sector, index) => {
    const start = angle;
    const sweep = total > 0 ? number(sector.totalValue) / total * 360 : 0;
    const end = start + sweep;
    angle = end;
    return {
      sector,
      color: COLORS[index % COLORS.length],
      path: describeArc(center, center, outer, inner, start, end),
      labelPoint: polar(center, center, outer + size * 0.055, start + sweep / 2)
    };
  });

  function handleClick(event) {
    const bounds = event?.currentTarget?.getBoundingClientRect?.();
    if (!bounds?.width || !bounds?.height) return;
    const x = ((number(event?.clientX) - bounds.left) / bounds.width) * size;
    const y = ((number(event?.clientY) - bounds.top) / bounds.height) * size;
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

  const svgChildren = [];
  segments.forEach(({ sector, color, path, labelPoint }, index) => {
    svgChildren.push(element("path", { key: "path-" + index, d: path, fill: color, stroke: "#020617", strokeWidth: 2, pointerEvents: "none" }));
    svgChildren.push(element("text", { key: "label-" + index, x: labelPoint.x, y: labelPoint.y + 3, fill: "#f8fafc", fontSize: 9, fontWeight: 900, textAnchor: "middle", pointerEvents: "none" }, number(sector.weight).toFixed(1) + "%"));
  });
  svgChildren.push(
    element("text", { key: "title", x: center, y: center - 13, fill: "#94a3b8", fontSize: 10, textAnchor: "middle", pointerEvents: "none" }, "Total Value"),
    element("text", { key: "currency", x: center, y: center + 2, fill: "#94a3b8", fontSize: 9, textAnchor: "middle", pointerEvents: "none" }, "KES"),
    element("text", { key: "value", x: center, y: center + 22, fill: "#f8fafc", fontSize: 14, fontWeight: 900, textAnchor: "middle", pointerEvents: "none" }, money(total))
  );

  const svg = element("svg", {
    role: "button",
    "aria-label": "Sector allocation chart. Click a colored sector to view its securities",
    "data-testid": "portfolio-sector-donut-web",
    width: size,
    height: size,
    viewBox: "0 0 " + size + " " + size,
    preserveAspectRatio: "xMidYMid meet",
    onClick: handleClick,
    style: { display: "block", width: "100%", height: "100%", background: "transparent", cursor: "pointer" }
  }, ...svgChildren);

  return <View style={styles.chart}><View style={[styles.chartCanvas, { width: size, height: size }]}>{svg}</View><Text style={styles.chartHint}>Click a colored sector or its row to view securities</Text></View>;
}

function AccountModal({ visible, accounts, selected, onSelect, onClose }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}><Text style={styles.modalTitle}>Portfolio Source</Text>{accounts.map((account, index) => { const active = selected?.broker === account?.broker && selected?.type === account?.type; return <Pressable key={`${account.broker}-${index}`} style={styles.modalOption} onPress={() => onSelect(account)}><Text style={styles.modalOptionText}>{active ? "✓  " : ""}{account.label || account.name || account.broker}</Text></Pressable>; })}</Pressable></Pressable></Modal>;
}

function PriceStatusModal({
  visible,
  marketData,
  isPractice = false,
  onClose
}) {
  const live = marketData?.status === "LIVE";
  const stale = marketData?.status === "STALE";
  const coverage = marketData?.coverage;

  const title = live
    ? "Market prices current"
    : stale
      ? "Using last verified prices"
      : "Price status unavailable";

  const explanation = isPractice
    ? live
      ? "Your Practice holdings are being valued with current verified market prices. Price movement changes the simulated portfolio value but never changes your recorded Practice trade cost."
      : stale
        ? "Current market prices are temporarily unavailable. GateCEP is using the last verified prices for this Practice valuation and does not fabricate market movement."
        : "GateCEP cannot verify market prices for this Practice portfolio right now. Your recorded Practice trades and cost basis remain unchanged."
    : live
      ? "The displayed holdings were valued using current verified market prices."
      : marketData
        ? "Where a genuine current quote was unavailable, GateCEP retained the latest verified broker valuation price. No price was fabricated."
        : "GateCEP cannot confirm the current valuation source at this time.";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable
          style={styles.modal}
          onPress={(event) =>
            event.stopPropagation()
          }
        >
          <View style={styles.cardHeader}>
            <View style={styles.flex}>
              <Text style={styles.modalTitle}>
                {title}
              </Text>

              <Text style={styles.cardHint}>
                {isPractice
                  ? "Verified market valuation for this simulated portfolio"
                  : "Verified valuation evidence for this REAL portfolio"}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeText}>
                ×
              </Text>
            </Pressable>
          </View>

          {marketData ? (
            <View style={styles.priceDetails}>
              <PriceDetail
                label="Coverage"
                value={`${coverage?.updated || 0} of ${coverage?.total || 0} holdings`}
              />

              <PriceDetail
                label="Source"
                value={
                  marketData.source ||
                  "Verified NSE evidence"
                }
              />

              <PriceDetail
                label="Effective time"
                value={formatEffectiveTime(
                  marketData.updatedAt
                )}
              />
            </View>
          ) : null}

          <Text style={styles.priceExplanation}>
            {explanation}
          </Text>

          <Pressable
            style={styles.modalDone}
            onPress={onClose}
          >
            <Text style={styles.modalDoneText}>
              Done
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PriceDetail({ label, value }) { return <View style={styles.priceDetail}><Text style={styles.priceDetailLabel}>{label}</Text><Text numberOfLines={2} style={styles.priceDetailValue}>{value}</Text></View>; }

function SectorModal({ sector, onClose }) {
  if (!sector) return null;
  return <Modal visible transparent presentationStyle="overFullScreen" animationType="slide" onRequestClose={onClose}><Pressable style={styles.overlay} onPress={onClose}><Pressable style={styles.sectorModal} onPress={(event) => event.stopPropagation()}><View style={styles.cardHeader}><View style={styles.flex}><Text style={styles.modalTitle}>{sector.sector} Securities</Text><Text style={styles.cardHint}>{sector.securities.length} holdings • {number(sector.weight).toFixed(2)}% • KES {money(sector.totalValue)}</Text></View><Pressable accessibilityRole="button" style={styles.closeButton} onPress={onClose}><Text style={styles.closeText}>×</Text></Pressable></View><ScrollView showsVerticalScrollIndicator={false}>{sector.securities.map((holding) => <HoldingRow key={holding.symbol} holding={holding} />)}</ScrollView></Pressable></Pressable></Modal>;
}

function EmptyPortfolio({ isPractice = false }) {
  return (
    <StatusBanner
      tone="info"
      title={
        isPractice
          ? "No Practice holdings available"
          : "No REAL holdings available"
      }
      message={
        isPractice
          ? "Build or restore your Practice Portfolio to see simulated allocation and holdings."
          : "Connect or import a REAL portfolio to see allocation and holdings."
      }
    />
  );
}

function number(value) { const parsed = Number(value || 0); return Number.isFinite(parsed) ? parsed : 0; }
function money(value) { return number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function compactMoney(value) { return number(value).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 }); }
function formatEffectiveTime(value) { if (!value) return "Not reported"; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString(); }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"; }
function polar(cx, cy, radius, angle) { const radians = (angle - 90) * Math.PI / 180; return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) }; }
function describeArc(cx, cy, outer, inner, start, end) { const safeEnd = end - start >= 360 ? end - 0.01 : end; const o1 = polar(cx, cy, outer, safeEnd); const o2 = polar(cx, cy, outer, start); const i1 = polar(cx, cy, inner, start); const i2 = polar(cx, cy, inner, safeEnd); const large = safeEnd - start > 180 ? 1 : 0; return `M ${o1.x} ${o1.y} A ${outer} ${outer} 0 ${large} 0 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${inner} ${inner} 0 ${large} 1 ${i2.x} ${i2.y} Z`; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" }, screen: { flex: 1 }, content: { /* PC-030M20AV3AN RESPONSIVE UAT CALIBRATION */ padding: 16, paddingBottom: 128, width: "100%", maxWidth: 960, alignSelf: "center" },
  // PC-032E — desktop Portfolio presentation only.
  // Native and compact web continue to use the established 960px contract.
  contentWideWeb: { maxWidth: 1240, paddingHorizontal: 24, paddingTop: 18 },
  // PC-031M4R4E3 — reserve the global Coach G top-right lane.
  // Local menu/title/alert remain in normal flow.
  header: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingRight: 54 },
  iconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" }, iconText: { color: "#67e8f9", fontSize: 22, fontWeight: "900" },
  alertButton: { flexDirection: "row", gap: 3 },
  alertCount: { color: "#fbbf24", fontSize: 12, fontWeight: "900" },
  headerCopy: { flex: 1 }, title: { color: "white", fontSize: 25, fontWeight: "900" }, welcome: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  // PC-031M4R4E1 — compact investor utility row.
  // Account selection and price-evidence behavior are unchanged.
  utilityRow: { flexDirection: "row", flexWrap: "nowrap", gap: 8, marginTop: 8 },
  accountSelector: { flex: 1, minWidth: 0, minHeight: 46, paddingHorizontal: 12, borderRadius: 14, borderColor: "#334155", borderWidth: 1, backgroundColor: "#0f172a", flexDirection: "row", alignItems: "center" },
  accountCopy: { flex: 1, minWidth: 0 },
  accountLabel: { color: "#64748b", fontSize: 8, fontWeight: "900" },
  accountName: { color: "#f8fafc", fontWeight: "900", fontSize: 13, marginTop: 2 },
  accountChevron: { color: "#67e8f9", fontSize: 20, fontWeight: "900" },
  priceButton: { flexShrink: 0, minWidth: 118, minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 10, justifyContent: "center" },
  priceButtonLive: { backgroundColor: "#052e2b", borderColor: "#0f766e" }, priceButtonVerified: { backgroundColor: "#23180b", borderColor: "#92400e" }, practiceBadge: { backgroundColor: "#082f49", borderColor: "#0891b2" }, priceButtonLabel: { color: "#94a3b8", fontSize: 9, fontWeight: "900" }, priceButtonValue: { color: "#f8fafc", fontSize: 12, fontWeight: "900", marginTop: 3 },
  signInButton: { backgroundColor: "#7f1d1d", borderRadius: 13, minHeight: 46, marginTop: 8, alignItems: "center", justifyContent: "center" }, signInText: { color: "white", fontWeight: "900" },
  practiceFundsAction: { marginTop: 8, minHeight: 72, borderRadius: 16, borderWidth: 1, borderColor: "#0e7490", backgroundColor: "#082f49", paddingHorizontal: 13, paddingVertical: 10, flexDirection: "row", alignItems: "center" },
  practiceFundsEyebrow: { color: "#67e8f9", fontSize: 8, fontWeight: "900" },
  practiceFundsTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "900", marginTop: 2 },
  practiceFundsText: { color: "#bae6fd", fontSize: 10, lineHeight: 14, marginTop: 3 },
  practiceFundsArrow: { color: "#67e8f9", fontSize: 27, fontWeight: "900", marginLeft: 10 },
  webSummaryRow: { flexDirection: "row", alignItems: "stretch", gap: 12, marginTop: 8 },
  practiceFundsActionWide: { flex: 1, marginTop: 0, minHeight: 112 },
  heroWide: { flex: 1, marginTop: 0, minHeight: 112, justifyContent: "center" },
  // PC-031M4R4E1 — preserve the canonical portfolio summary while
  // reducing vertical chrome above the investor working content.
  hero: { marginTop: 8, backgroundColor: "#1d0b38", borderColor: "#6b21a8", borderWidth: 1, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 },
  heroCompact: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 15 },
  heroLabel: { color: "#d8b4fe", fontSize: 8, fontWeight: "900" },
  heroValue: { color: "white", fontSize: 23, fontWeight: "900", marginTop: 1 },
  heroValueCompact: { fontSize: 22, marginTop: 1 },
  gain: { color: "#86efac", fontWeight: "900", fontSize: 10, marginTop: 1 },
  loss: { color: "#fca5a5", fontWeight: "900", fontSize: 10, marginTop: 1 },
  quickMetrics: { flexDirection: "row", flexWrap: "nowrap", gap: 6, marginTop: 5 },
  quickMetricsCompact: { marginTop: 4 },
  quickMetric: { flex: 1, minWidth: 0, backgroundColor: "#09051d", borderRadius: 9, paddingVertical: 5, paddingHorizontal: 8 },
  quickLabel: { color: "#94a3b8", fontSize: 8 },
  quickValue: { color: "white", fontWeight: "900", fontSize: 11, marginTop: 1 },
  primaryCard: { marginTop: 10, backgroundColor: "#0f172a", borderColor: "#1e293b", borderWidth: 1, borderRadius: 20, padding: 15 }, cardHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }, cardTitle: { color: "#67e8f9", fontSize: 18, fontWeight: "900" }, cardHint: { color: "#94a3b8", fontSize: 11, marginTop: 4 }, largestSectorBadge: { maxWidth: "42%", borderRadius: 11, borderWidth: 1, borderColor: "#6b21a8", backgroundColor: "#1d0b38", paddingHorizontal: 9, paddingVertical: 7 }, largestSectorLabel: { color: "#94a3b8", fontSize: 7, fontWeight: "900" }, largestSectorValue: { color: "#d8b4fe", fontSize: 10, fontWeight: "900", marginTop: 2 }, flex: { flex: 1 }, chart: { alignItems: "center", justifyContent: "center", marginVertical: 2 }, chartCanvas: { flexGrow: 0, flexShrink: 0, overflow: "visible", backgroundColor: "transparent" }, chartSvg: { backgroundColor: "transparent" }, chartHint: { color: "#94a3b8", fontSize: 9, marginTop: -3, marginBottom: 3 },
  sectorWorkspaceWide: { flexDirection: "row", alignItems: "stretch", gap: 24, marginTop: 10 },
  sectorChartPaneWide: { flex: 0.9, minWidth: 0, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  sectorRowsPaneWide: { flex: 1.35, minWidth: 0, justifyContent: "center" },
  sectorRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 7, borderTopColor: "#1e293b", borderTopWidth: 1, paddingHorizontal: 4 }, sectorRowPressed: { backgroundColor: "#1e293b" }, dot: { width: 10, height: 10, borderRadius: 5 }, sectorDirection: { width: 13, fontWeight: "900", textAlign: "center" }, sectorUp: { color: "#86efac", fontWeight: "900", fontSize: 10 }, sectorDown: { color: "#fca5a5", fontWeight: "900", fontSize: 10 }, sectorFlat: { color: "#94a3b8", fontWeight: "900", fontSize: 10 }, sectorName: { color: "#e2e8f0", fontWeight: "800", flex: 1 }, sectorNumbers: { alignItems: "flex-end", minWidth: 64 }, sectorValue: { color: "white", fontWeight: "900", fontSize: 10 }, sectorWeight: { color: "#e2e8f0", fontWeight: "900", fontSize: 10, width: 43, textAlign: "right" }, sectorArrow: { color: "#67e8f9", fontWeight: "900", fontSize: 22 }, sectorPager: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }, pagerButton: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" }, pagerButtonDisabled: { opacity: 0.35 }, pagerText: { color: "#67e8f9", fontWeight: "900", fontSize: 11 }, pageStatus: { color: "#94a3b8", fontWeight: "800", fontSize: 10 },
  arrow: { color: "#c084fc", fontSize: 24, fontWeight: "900", marginLeft: 8 }, coachHandoff: { marginTop: 12, minHeight: 82, borderRadius: 18, borderWidth: 1, borderColor: "#164e63", backgroundColor: "#062033", paddingHorizontal: 15, paddingVertical: 13, flexDirection: "row", alignItems: "center" }, coachHandoffEyebrow: { color: "#67e8f9", fontSize: 9, fontWeight: "900" }, coachHandoffTitle: { color: "white", fontSize: 15, fontWeight: "900", marginTop: 3 }, coachHandoffText: { color: "#94a3b8", fontSize: 10, lineHeight: 14, marginTop: 4 }, coachHandoffArrow: { color: "#c084fc", fontSize: 28, fontWeight: "900", marginLeft: 12 },
  holdingRow: { minHeight: 64, flexDirection: "row", alignItems: "center", borderBottomColor: "#1e293b", borderBottomWidth: 1, paddingVertical: 9 },
  holdingIdentityRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  symbol: { color: "white", fontWeight: "900", fontSize: 16 },
  holdingMeta: { color: "#94a3b8", fontSize: 11, marginTop: 4 },
  historicalSecurityBadge: { borderColor: "#64748b", borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: "#1e293b" },
  historicalSecurityBadgeText: { color: "#cbd5e1", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  historicalSecurityNote: { color: "#94a3b8", fontSize: 9, fontWeight: "700", marginTop: 3 },
  alignRight: { alignItems: "flex-end" },
  holdingValue: { color: "white", fontWeight: "900", fontSize: 12 },
  gainSmall: { color: "#86efac", fontWeight: "900", fontSize: 11, marginTop: 4 },
  lossSmall: { color: "#fca5a5", fontWeight: "900", fontSize: 11, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: "rgba(2,6,23,.82)", justifyContent: "center", padding: 20 }, modal: { width: "100%", maxWidth: 720, alignSelf: "center", backgroundColor: "#0f172a", borderColor: "#334155", borderWidth: 1, borderRadius: 20, padding: 16 }, modalTitle: { color: "white", fontSize: 19, fontWeight: "900" }, modalOption: { minHeight: 50, justifyContent: "center", borderTopColor: "#1e293b", borderTopWidth: 1 }, modalOptionText: { color: "#f8fafc", fontWeight: "800" }, priceDetails: { marginTop: 14, gap: 8 }, priceDetail: { backgroundColor: "#020617", borderRadius: 12, padding: 11 }, priceDetailLabel: { color: "#94a3b8", fontSize: 9, fontWeight: "800" }, priceDetailValue: { color: "#f8fafc", fontWeight: "900", marginTop: 4 }, priceExplanation: { color: "#cbd5e1", lineHeight: 19, marginTop: 14 }, modalDone: { minHeight: 46, borderRadius: 13, backgroundColor: "#0891b2", alignItems: "center", justifyContent: "center", marginTop: 16 }, modalDoneText: { color: "white", fontWeight: "900" }, sectorModal: { width: "100%", maxWidth: 720, alignSelf: "center", backgroundColor: "#0f172a", borderColor: "#334155", borderWidth: 1, borderRadius: 22, padding: 16, maxHeight: "80%" }, closeButton: { width: 42, height: 42, backgroundColor: "#1e293b", borderRadius: 13, alignItems: "center", justifyContent: "center" }, closeText: { color: "white", fontSize: 25 }
});
