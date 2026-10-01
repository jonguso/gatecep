import { router, useFocusEffect } from "expo-router";
import { userGetItem } from "../../src/auth/userStorage";
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import CompanyLogo from "../../src/components/markets/CompanyLogo";
import { ResponsiveWorkingRegion } from "../../src/components/mobile/MobileUI";
import { generateSparkline }
from "../../src/markets/sparkline";
import {
  INDEX_ROWS,
  getMarketSummary,
  getRowsForTab,
  getTurnoverMetric
} from "../../src/markets/marketHubData";
import useMarketData from "../../src/services/markets/useMarketData";

// PC-031M4R4A — investor-facing Markets navigation.
// Keep the established internal "Equities" key so the proven
// contained-workspace and market-data contracts remain unchanged.
// Volume and Turnover remain available to deeper intelligence/Coach G,
// but are not primary investor navigation.
const INVESTOR_MARKET_TABS = [
  { key: "Equities", label: "Market" },
  { key: "Gainers", label: "Gainers" },
  { key: "Losers", label: "Losers" }
];

// PC-030M20AV3F RESPONSIVE CALIBRATION
export default function Markets() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const wideWeb = Platform.OS === "web" && windowWidth >= 1100;
  const [tab, setTab] = useState("Equities");
  const [search, setSearch] = useState("");
  const [activePanel, setActivePanel] = useState("market");
  const [watchlist, setWatchlist] = useState([]);
  const market = useMarketData();
  const resultsScrollRef = useRef(null);
  // PC-031M4R2 — analytical tabs retain their legacy bounded panel
  // during the Markets reference migration. Equities now receives
  // its height from the responsive flex layout instead.
  const analyticalPanelHeight =
    Math.min(430, Math.max(310, windowHeight * 0.38));

  const summary = useMemo(() => getMarketSummary(market.rows), [market.rows]);

  const rows = useMemo(() => {
    const data = getRowsForTab(tab, market.rows);

    if (tab === "Equities" || !search.trim()) {
      return data;
    }

    return data.filter(
      (row) =>
        row.symbol.toLowerCase().includes(search.toLowerCase()) ||
        row.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [tab, search, market.rows]);

  useEffect(() => {
    resultsScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab, search]);

  useFocusEffect(
  useCallback(() => {
    loadWatchlist();
    market.reload();
  }, [])
);

async function loadWatchlist() {
  const raw = await userGetItem("marketWatchlist");

  const saved = raw
    ? JSON.parse(raw)
    : ["SCOM", "EABL", "EQT", "KCB"];

  setWatchlist(saved);
}
const useContainedMarketWorkspace =
  tab === "Equities" ||
  (wideWeb && (tab === "Gainers" || tab === "Losers"));

const ScreenContainer =
  useContainedMarketWorkspace ? View : ScrollView;
  return (
<ScreenContainer
  style={[
    styles.screen,
    useContainedMarketWorkspace && styles.equitiesScreen
  ]}
  {...(useContainedMarketWorkspace
    ? {}
    : {
        contentContainerStyle: [
          styles.content,
          windowWidth >= 720 && {
            width: "100%",
            maxWidth: 960,
            alignSelf: "center"
          },
          windowWidth < 720 && {
            paddingHorizontal: 16,
            paddingTop: 32,
            paddingBottom: 128
          },
          windowWidth < 480 && {
            paddingHorizontal: 12,
            paddingTop: 24
          }
        ]
      })}
>
  <View
    style={
      useContainedMarketWorkspace
        ? [
            styles.content,
            styles.equitiesViewportContent,
            windowWidth >= 720 && {
              width: "100%",
              maxWidth: wideWeb ? 1240 : 960,
              alignSelf: "center"
            },
            windowWidth < 720 && {
              paddingHorizontal: 16,
              paddingTop: 24,
              paddingBottom: 128
            },
            windowWidth < 480 && {
              paddingHorizontal: 12,
              paddingTop: 20
            },
            styles.equitiesContainedContent
          ]
        : null
    }
  >
      <View
        style={[
          styles.marketHeaderCopy,
          windowWidth < 720 && styles.marketHeaderCopyCompact
        ]}
      >
        <Text style={[
          styles.title,
          windowWidth < 720 && { fontSize: 28, lineHeight: 34 },
          windowWidth < 480 && { fontSize: 25, lineHeight: 31 }
        ]}>Markets</Text>

        <Text style={styles.subtitle}>
          Market intelligence center
        </Text>

        <Text style={styles.educationPrompt}>
          Explore verified market prices and company information.
        </Text>
      </View>

      <View style={styles.marketStatus}>
        <View style={styles.marketStatusEvidence}>
          <Text style={styles.marketStatusTitle}>
            {market.loading
              ? "Loading verified NSE securities…"
              : market.connected
              ? `✓ ${market.rows.length} verified`
              : "Verified data unavailable"}
          </Text>

          <Text
            style={styles.marketStatusBody}
            numberOfLines={windowWidth < 520 ? 1 : 2}
          >
            {market.connected
              ? `${market.provider || "LOCAL_VERIFIED_EOD"}${market.lastUpdated ? ` • ${new Date(market.lastUpdated).toLocaleString()}` : ""}`
              : market.error || "No hard-coded market prices are displayed."}
          </Text>
        </View>

        <Pressable
          style={styles.refreshButton}
          onPress={market.reload}
          accessibilityRole="button"
          accessibilityLabel="Refresh verified market data"
        >
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroller}
        contentContainerStyle={styles.tabRow}
      >
        {INVESTOR_MARKET_TABS.map((item) => (
          <Pressable
            key={item.key}
            style={[
              styles.tabButton,
              tab === item.key && styles.activeTab
            ]}
            onPress={() => {
              setTab(item.key);
              setActivePanel("market");
            }}
          >
            <Text
              style={
                tab === item.key
                  ? styles.activeTabText
                  : styles.tabText
              }
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {activePanel === "market" && tab === "Summary" && (
        <>
          <View style={styles.card}>
            <View style={styles.summaryHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Market At a Glance
                </Text>
                <Text style={styles.summaryEvidence}>
                  Based on the current verified market snapshot
                </Text>
              </View>

              <View style={styles.breadthBadge}>
                <Text style={styles.breadthBadgeLabel}>
                  BREADTH
                </Text>
                <Text style={styles.breadthBadgeValue}>
                  {summary.breadth}
                </Text>
              </View>
            </View>

            <View style={styles.summaryStrip}>
              <SummaryBox
                label={summary.turnoverEstimated ? "Est. Turnover" : "Turnover"}
                value={`KES ${money(summary.turnover)}`}
                wide
              />
              <SummaryBox
                label="Volume"
                value={summary.volume.toLocaleString()}
              />
              <SummaryBox
                label="Gainers"
                value={summary.gainers}
                positive
              />
              <SummaryBox
                label="Decliners"
                value={summary.decliners}
                negative
              />
              <SummaryBox
                label="Verified"
                value={summary.securities.toLocaleString()}
              />
            </View>
          </View>

          <View style={styles.moversGrid}>
            <Pressable
              style={styles.moverCard}
              onPress={() => setTab("Gainers")}
            >
              <Text style={styles.moverLabel}>
                ▲ GAINERS
              </Text>
              <Text style={[styles.moverValue, styles.positive]}>
                {summary.gainers}
              </Text>
              <Text style={styles.moverHint}>
                View leading advances ›
              </Text>
            </Pressable>

            <Pressable
              style={styles.moverCard}
              onPress={() => setTab("Losers")}
            >
              <Text style={styles.moverLabel}>
                ▼ DECLINERS
              </Text>
              <Text style={[styles.moverValue, styles.negative]}>
                {summary.decliners}
              </Text>
              <Text style={styles.moverHint}>
                View leading declines ›
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.allSecuritiesCard}
            onPress={() => setTab("Equities")}
          >
            <View>
              <Text style={styles.allSecuritiesTitle}>
                Explore Verified Securities
              </Text>
              <Text style={styles.allSecuritiesBody}>
                Search all {summary.securities} securities in this verified snapshot
              </Text>
            </View>

            <Text style={styles.allSecuritiesChevron}>
              ›
            </Text>
          </Pressable>
        </>
      )}

       {(activePanel === "market" || wideWeb) && tab !== "Summary" && (
        <ResponsiveWorkingRegion
          style={
            useContainedMarketWorkspace
              ? styles.equitiesWorkingRegion
              : null
          }
        >
          {tab !== "Equities" ? (
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search stock..."
              placeholderTextColor="#64748b"
              style={styles.search}
            />
          ) : null}

          <View
            style={[
              styles.card,
              styles.resultsCard,
              useContainedMarketWorkspace
                ? styles.equitiesResultsCard
                : { height: analyticalPanelHeight }
            ]}
          >
            {tab !== "Equities" ? (
              <View style={styles.resultsHeader}>
                <Text style={styles.cardTitle}>
                  {tab} ({rows.length})
                </Text>
                <Text style={styles.scrollHint}>
                  {wideWeb ? "Verified securities" : "Scroll securities ↕"}
                </Text>
              </View>
            ) : null}

            {!market.loading && rows.length === 0 ? (
              <Text style={styles.emptyText}>
                {tab !== "Equities" && search.trim()
                  ? "No verified security matches this search."
                  : tab === "Volume"
                  ? "Verified traded-volume evidence is unavailable for this snapshot."
                  : tab === "Turnover"
                  ? "Verified turnover evidence is unavailable for this snapshot."
                  : `No verified ${tab.toLowerCase()} are available for this snapshot.`}
              </Text>
            ) : null}

            <ScrollView
              ref={resultsScrollRef}
              style={styles.resultsScroll}
              contentContainerStyle={styles.resultsContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
            {tab === "Equities" || wideWeb ? (
              <>
                <View style={styles.equitiesColumnHeader}>
                  <Text style={[styles.equitiesColumnLabel, styles.equitiesSecurityColumn]}>
                    Security
                  </Text>
                  <Text style={[styles.equitiesColumnLabel, styles.equitiesPriceColumn]}>
                    Price
                  </Text>
                  <Text style={[styles.equitiesColumnLabel, styles.equitiesChangeColumn]}>
                    Change
                  </Text>
                  <View style={styles.equitiesChevronColumn} />
                </View>

                {rows.map((row) => {
                  const changePct = Number(row.changePct || 0);

                  return (
                    <Pressable
                      key={row.symbol}
                      style={styles.equitiesRow}
                      onPress={() => router.push(`/security/${row.symbol}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`Explore ${row.symbol} company`}
                    >
                      <Text
                        style={[styles.symbol, styles.equitiesSecurityColumn]}
                        numberOfLines={1}
                      >
                        {row.symbol}
                      </Text>

                      <Text
                        style={[styles.price, styles.equitiesPriceColumn]}
                        numberOfLines={1}
                      >
                        {Number(row.price).toFixed(2)}
                      </Text>

                      <Text
                        style={[
                          styles.equitiesChangeColumn,
                          changePct >= 0 ? styles.positive : styles.negative
                        ]}
                        numberOfLines={1}
                      >
                        {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                      </Text>

                      <Text style={[styles.rowChevron, styles.equitiesChevronColumn]}>
                        ›
                      </Text>
                    </Pressable>
                  );
                })}
              </>
            ) : (
              rows.map((row) => (
                <Pressable
                  key={row.symbol}
                  style={[styles.stockRow, windowWidth < 480 && { flexWrap: "wrap" }]}
                  onPress={() => router.push(`/security/${row.symbol}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Explore ${row.symbol} company`}
                >
                  <CompanyLogo security={row} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.symbol}>
                      {row.symbol}
                    </Text>
                    <Text style={styles.company}>
                      {row.name}
                    </Text>
                  </View>
                  <MarketRowMetric tab={tab} row={row} />
                  <Text style={styles.rowChevron}>›</Text>
                </Pressable>
              ))
            )}
            </ScrollView>
          </View>
        </ResponsiveWorkingRegion>
      )}

      {tab !== "Equities" && (
        <>
      <Pressable
        style={styles.expandCard}
        onPress={() => setActivePanel(activePanel === "indices" ? "market" : "indices")}
      >
        <Text style={styles.expandTitle}>
          {activePanel === "indices" ? "−" : "+"} Indices
        </Text>
      </Pressable>

      {activePanel === "indices" && (
  <View style={styles.card}>
    {INDEX_ROWS.map((item) => (
      <View
        key={item.symbol}
        style={[
  styles.indexCard,
  item.changePct >= 0
    ? styles.indexPositive
    : styles.indexNegative
]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.symbol}>
            {item.symbol}
          </Text>

          <Text style={styles.company}>
            {item.name}
          </Text>

          <Text
            style={
              item.changePct >= 0
                ? styles.positive
                : styles.negative
            }
          >
            {item.changePct >= 0 ? "+" : ""}
            {item.changePct.toFixed(2)}%
          </Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.price}>
            {item.value}
          </Text>

          <Text
            style={
              item.changePct >= 0
                ? styles.positive
                : styles.negative
            }
          >
            {item.change >= 0 ? "+" : ""}
            {item.change}
          </Text>
        </View>
      </View>
    ))}
  </View>
)}

      <Pressable
  style={styles.expandCard}
  onPress={() => setActivePanel(activePanel === "watchlist" ? "market" : "watchlist")}
>
  <View style={styles.expandHeader}>
    <Text style={styles.expandTitle}>
      {activePanel === "watchlist" ? "−" : "+"} Watchlist
    </Text>

    {activePanel === "watchlist" ? (
      <Pressable
        style={styles.manageBtn}
        onPress={() => router.push("/watchlist")}
      >
        <Text style={styles.manageText}>Manage</Text>
      </Pressable>
    ) : null}
  </View>
</Pressable>

{activePanel === "watchlist" && (
  <View
    style={[
      styles.card,
      styles.resultsCard,
      wideWeb ? styles.desktopAuxiliaryCard : { height: analyticalPanelHeight }
    ]}
  >
    <View style={styles.resultsHeader}>
      <Text style={styles.cardTitle}>Watchlist ({watchlist.length})</Text>
      <Text style={styles.scrollHint}>Scroll securities ↕</Text>
    </View>
    {watchlist.length === 0 ? (
      <Text style={styles.emptyText}>
        No securities selected.
      </Text>
    ) : (
      <ScrollView
        style={styles.resultsScroll}
        contentContainerStyle={styles.resultsContent}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
      {watchlist.map((symbol) => {
  const stock =
    getRowsForTab("Equities", market.rows).find(
      (item) => item.symbol === symbol
    ) || {};

  return (
    <Pressable
  key={symbol}
  style={[styles.watchlistCard, windowWidth < 480 && { flexDirection: "column", alignItems: "stretch", gap: 10 }]}
  onPress={() => stock.symbol && router.push(`/security/${stock.symbol}`)}
  accessibilityRole="button"
  accessibilityLabel={`Explore ${symbol} company`}
>
  <View style={styles.watchlistLeft}>
    <View style={styles.logoCircle}>
      <Text style={styles.logoText}>
        {symbol.substring(0, 1)}
      </Text>
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.symbol}>
        {symbol}
      </Text>

      <Text style={styles.company}>
        {stock.name || "NSE Counter"}
      </Text>

      <Text style={styles.volumeText}>
        Vol {Number(stock.volume || 0).toLocaleString()}
      </Text>
    </View>
  </View>

  <View style={styles.watchlistRight}>
    <Text style={styles.price}>
      {Number(stock.price || 0).toFixed(2)}
    </Text>

    <Text
      style={
        Number(stock.changePct || 0) >= 0
          ? styles.positive
          : styles.negative
      }
    >
      {Number(stock.changePct || 0) >= 0 ? "+" : ""}
      {Number(stock.changePct || 0).toFixed(2)}%
    </Text>

   <Text
  style={[
    styles.sparkline,
    Number(stock.changePct || 0) >= 0
      ? styles.positive
      : styles.negative
  ]}
>
  {generateSparkline(
    Number(stock.changePct || 0)
  )}
</Text>
   
  </View>
</Pressable>
   );
})}
      </ScrollView>

    )}
  </View>
)}

        </>
      )}

    </View>
  </ScreenContainer>
  );
}

function SummaryBox({ label, value, positive, negative, wide = false }) {
  return (
    <View style={[styles.summaryBox, wide && styles.summaryBoxWide]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        style={[
          styles.summaryValue,
          positive && styles.positive,
          negative && styles.negative
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function MarketRowMetric({ tab, row }) {
  if (tab === "Volume") {
    return (
      <View style={styles.rowMetric}>
        <Text style={styles.metricCaption}>Volume</Text>
        <Text style={styles.activityValue}>{Number(row.volume || 0).toLocaleString()}</Text>
      </View>
    );
  }

  if (tab === "Turnover") {
    const turnover = getTurnoverMetric(row);
    return (
      <View style={styles.rowMetric}>
        <Text style={styles.metricCaption}>{turnover.estimated ? "Est. turnover" : "Turnover"}</Text>
        <Text style={styles.activityValue}>KES {money(turnover.value)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.rowMetric}>
      <Text style={styles.price}>{Number(row.price).toFixed(2)}</Text>
      <Text style={Number(row.changePct || 0) >= 0 ? styles.positive : styles.negative}>
        {Number(row.changePct || 0) >= 0 ? "+" : ""}{Number(row.changePct || 0).toFixed(2)}%
      </Text>
    </View>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>
        {label}
      </Text>

      <Text style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

function money(value) {
  return Number(value || 0).toLocaleString();
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },

  content: {
    padding: 22,
    paddingTop: 70,
    paddingBottom: 120
  },

  title: {
    color: "white",
    fontSize: 32,
    fontWeight: "900"
  },

  subtitle: {
    color: "#94a3b8",
    marginTop: 8
  },

  tabScroller: {
    marginTop: 12,
    flexGrow: 0
  },

  tabRow: {
    flexDirection: "row",
    gap: 7,
    paddingRight: 8
  },

  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#1e293b"
  },

  activeTab: {
    backgroundColor: "#9333ea"
  },

  tabText: {
    color: "#94a3b8",
    fontWeight: "900"
  },

  activeTabText: {
    color: "white",
    fontWeight: "900"
  },

  card: {
    marginTop: 16,
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 16
  },

  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },

  summaryEvidence: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4
  },

  breadthBadge: {
    minWidth: 86,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "#172554",
    alignItems: "flex-end"
  },

  breadthBadgeLabel: {
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "800"
  },

  breadthBadgeValue: {
    color: "#67e8f9",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2
  },

  moversGrid: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10
  },

  moverCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 14
  },

  moverLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "900"
  },

  moverValue: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 5
  },

  moverHint: {
    color: "#94a3b8",
    fontSize: 10,
    marginTop: 5
  },

  allSecuritiesCard: {
    marginTop: 12,
    backgroundColor: "#0c4a6e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#155e75",
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  allSecuritiesTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 14
  },

  allSecuritiesBody: {
    color: "#bae6fd",
    fontSize: 11,
    marginTop: 3
  },

  allSecuritiesChevron: {
    color: "#67e8f9",
    fontSize: 26,
    fontWeight: "900"
  },

  cardTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 12
  },

  resultsCard: {
    overflow: "hidden"
  },

  // PC-032F3 — desktop auxiliary market panels participate in
  // normal page flow. Compact/native retain the legacy bounded
  // analytical panel contract.
  desktopAuxiliaryCard: {
    flexGrow: 0,
    flexShrink: 0
  },

  // PC-031M4R2 — Equities is the reference contained-workspace
  // implementation. Available viewport space, not a calculated
  // pixel height, owns the securities results region.
  marketHeaderCopy: {
    minWidth: 0
  },

  // PC-031M4R4C2 — global tab chrome owns the hamburger at left.
  // Keep Markets copy in normal flow while clearing that control.
  marketHeaderCopyCompact: {
    paddingLeft: 68,
    paddingRight: 48,
    paddingTop: 8
  },

  equitiesViewportContent: {
    flex: 1,
    minHeight: 0
  },

  // PC-031M4R3B3 — contained Equities uses the viewport already
  // bounded by Expo Tabs. Legacy flow-page bottom clearance must
  // not reserve working space above the persistent tab bar.
  equitiesContainedContent: {
    paddingBottom: 0
  },

  equitiesWorkingRegion: {
    flex: 1,
    minHeight: 0
  },

  equitiesResultsCard: {
    flex: 1,
    minHeight: 0
  },

  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },

  scrollHint: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 12
  },

  resultsScroll: {
    flex: 1
  },

  resultsContent: {
    paddingBottom: 8
  },
  educationPrompt: {
    color: "#67e8f9",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5
  },

  marketStatus: {
    marginTop: 10,
    minHeight: 48,
    backgroundColor: "rgba(8,47,73,.72)",
    borderColor: "#155e75",
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },

  marketStatusEvidence: {
    flex: 1,
    minWidth: 0
  },

  marketStatusTitle: {
    color: "#67e8f9",
    fontSize: 12,
    fontWeight: "900"
  },

  marketStatusBody: {
    color: "#94a3b8",
    fontSize: 9,
    marginTop: 2
  },

  refreshButton: {
    backgroundColor: "#164e63",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9
  },

  refreshText: {
    color: "#67e8f9",
    fontSize: 11,
    fontWeight: "900"
  },

  emptyText: {
    color: "#94a3b8",
    paddingVertical: 16
  },

  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },

  metric: {
    width: "47%",
    backgroundColor: "#020617",
    borderRadius: 14,
    padding: 12
  },

  metricLabel: {
    color: "#94a3b8",
    fontSize: 12
  },

  metricValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 4
  },

  search: {
    marginTop: 16,
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 14,
    color: "white"
  },

  equitiesColumnHeader: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 30,
    paddingHorizontal: 2,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#334155"
  },

  equitiesColumnLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },

  equitiesRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 42,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b"
  },

  equitiesSecurityColumn: {
    flex: 1,
    minWidth: 64
  },

  equitiesPriceColumn: {
    width: 82,
    textAlign: "right"
  },

  equitiesChangeColumn: {
    width: 76,
    textAlign: "right",
    fontWeight: "900"
  },

  equitiesChevronColumn: {
    width: 24,
    textAlign: "right"
  },

  stockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    alignItems: "center",
    gap: 10
  },

  rowChevron: {
    color: "#67e8f9",
    fontSize: 24,
    fontWeight: "900"
  },

  symbol: {
    color: "white",
    fontWeight: "900"
  },

  company: {
    color: "#94a3b8",
    fontSize: 12
  },

  price: {
    color: "white",
    fontWeight: "900",
    textAlign: "right"
  },

  rowMetric: {
    minWidth: 118,
    alignItems: "flex-end"
  },

  metricCaption: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "800"
  },

  activityValue: {
    color: "#86efac",
    fontWeight: "900",
    marginTop: 3,
    textAlign: "right"
  },

  positive: {
    color: "#86efac",
    fontWeight: "900"
  },

  negative: {
    color: "#fca5a5",
    fontWeight: "900"
  },

  expandCard: {
    marginTop: 16,
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 16
  },

  expandTitle: {
    color: "white",
    fontWeight: "900"
  },

  manageBtn: {
    backgroundColor: "#9333ea",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },

expandHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center"
},

indexCard: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: "#1e293b"
},

watchlistCard: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingVertical: 14,
  borderBottomWidth: 1,
  borderBottomColor: "#1e293b"
},

summaryStrip: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8
},

summaryBox: {
  width: "31%",
  backgroundColor: "#020617",
  borderColor: "#1e293b",
  borderWidth: 1,
  borderRadius: 14,
  paddingVertical: 12,
  paddingHorizontal: 10
},

summaryBoxWide: {
  flexBasis: "62%",
  minWidth: 180
},

summaryLabel: {
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: "800"
},

summaryValue: {
  color: "white",
  fontWeight: "900",
  marginTop: 6,
  fontSize: 13
},

  manageText: {
    color: "white",
    fontWeight: "900"
  },

watchlistLeft: {
  flexDirection: "row",
  alignItems: "center",
  flex: 1
},

watchlistRight: {
  alignItems: "flex-end"
},

logoCircle: {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: "#9333ea",
  justifyContent: "center",
  alignItems: "center",
  marginRight: 12
},

logoText: {
  color: "white",
  fontWeight: "900"
},

volumeText: {
  color: "#64748b",
  fontSize: 11,
  marginTop: 4
},

sparkline: {
  color: "#22c55e",
  fontSize: 12,
  marginTop: 4
},

indexPositive: {
  borderLeftWidth: 4,
  borderLeftColor: "#22c55e"
},

indexNegative: {
  borderLeftWidth: 4,
  borderLeftColor: "#ef4444"
}

});
