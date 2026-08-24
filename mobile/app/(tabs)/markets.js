import { router, useFocusEffect } from "expo-router";
import { userGetItem } from "../../src/auth/userStorage";
import React, { useMemo, useState, useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import ActiveUserBanner from "../../src/components/ActiveUserBanner";
import MarketDepthModal from "../../src/components/markets/MarketDepthModal";
import { generateSparkline }
from "../../src/markets/sparkline";
import {
  MARKET_TABS,
  INDEX_ROWS,
  getMarketSummary,
  getRowsForTab
} from "../../src/markets/marketHubData";
import useMarketData from "../../src/services/markets/useMarketData";

export default function Markets() {
  const [tab, setTab] = useState("Equities");
  const [search, setSearch] = useState("");
  const [showIndices, setShowIndices] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  const market = useMarketData();

  const summary = useMemo(() => getMarketSummary(market.rows), [market.rows]);

  const rows = useMemo(() => {
    const data = getRowsForTab(tab, market.rows);

    if (!search.trim()) {
      return data;
    }

    return data.filter(
      (row) =>
        row.symbol.toLowerCase().includes(search.toLowerCase()) ||
        row.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [tab, search, market.rows]);

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
    : ["SCOM", "EABL", "EQTY", "COOP"];

  setWatchlist(saved);
}

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Markets</Text>

      <Text style={styles.subtitle}>
        Market intelligence center
      </Text>

      <ActiveUserBanner />

      <View style={styles.marketStatus}>
        <View style={{ flex: 1 }}>
          <Text style={styles.marketStatusTitle}>
            {market.loading
              ? "Loading verified NSE securities…"
              : market.connected
              ? `${market.rows.length} verified securities`
              : "Verified market data unavailable"}
          </Text>
          <Text style={styles.marketStatusBody}>
            {market.connected
              ? `${market.provider || "LOCAL_VERIFIED_EOD"}${market.lastUpdated ? ` • ${new Date(market.lastUpdated).toLocaleString()}` : ""}`
              : market.error || "No hard-coded market prices are displayed."}
          </Text>
        </View>
        <Pressable style={styles.refreshButton} onPress={market.reload}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {MARKET_TABS.map((item) => (
          <Pressable
            key={item}
            style={[
              styles.tabButton,
              tab === item && styles.activeTab
            ]}
            onPress={() => setTab(item)}
          >
            <Text
              style={
                tab === item
                  ? styles.activeTabText
                  : styles.tabText
              }
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "Summary" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Market Summary
          </Text>

          <View style={styles.summaryStrip}>
  <SummaryBox label="Turnover" value={`KES ${money(summary.turnover)}`} />
  <SummaryBox label="Volume" value={summary.volume.toLocaleString()} />
  <SummaryBox label="Securities" value={summary.securities.toLocaleString()} />
  <SummaryBox label="Gainers" value={summary.gainers} positive />
  <SummaryBox label="Decliners" value={summary.decliners} negative />
  <SummaryBox label="Breadth" value={summary.breadth} />
</View>
        </View>
      )}

       {tab !== "Summary" && (
        <>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search stock..."
            placeholderTextColor="#64748b"
            style={styles.search}
          />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {tab} ({rows.length})
            </Text>

            {!market.loading && rows.length === 0 ? (
              <Text style={styles.emptyText}>
                {search.trim()
                  ? "No verified security matches this search."
                  : "No verified securities are available for this view."}
              </Text>
            ) : null}

            {rows.map((row) => (
              <Pressable
                key={row.symbol}
                style={styles.stockRow}
                onPress={() => setSelectedSecurity(row)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${row.symbol} market depth`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.symbol}>
                    {row.symbol}
                  </Text>

                  <Text style={styles.company}>
                    {row.name}
                  </Text>
                </View>

                <View>
                  <Text style={styles.price}>
                    {Number(row.price).toFixed(2)}
                  </Text>

                  <Text
                    style={
                      row.changePct >= 0
                        ? styles.positive
                        : styles.negative
                    }
                  >
                    {row.changePct >= 0 ? "+" : ""}
                    {row.changePct.toFixed(2)}%
                  </Text>
                </View>
                <Text style={styles.rowChevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Pressable
        style={styles.expandCard}
        onPress={() =>
          setShowIndices(!showIndices)
        }
      >
        <Text style={styles.expandTitle}>
          {showIndices ? "−" : "+"} Indices
        </Text>
      </Pressable>

      {showIndices && (
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
  onPress={() => setShowWatchlist(!showWatchlist)}
>
  <View style={styles.expandHeader}>
    <Text style={styles.expandTitle}>
      {showWatchlist ? "−" : "+"} Watchlist
    </Text>

    {showWatchlist ? (
      <Pressable
        style={styles.manageBtn}
        onPress={() => router.push("/watchlist")}
      >
        <Text style={styles.manageText}>Manage</Text>
      </Pressable>
    ) : null}
  </View>
</Pressable>

{showWatchlist && (
  <View style={styles.card}>
    {watchlist.length === 0 ? (
      <Text style={styles.body}>
        No securities selected.
      </Text>
    ) : (
     watchlist.map((symbol) => {
  const stock =
    getRowsForTab("Equities", market.rows).find(
      (item) => item.symbol === symbol
    ) || {};

  return (
    <Pressable
  key={symbol}
  style={styles.watchlistCard}
  onPress={() => stock.symbol && setSelectedSecurity(stock)}
  accessibilityRole="button"
  accessibilityLabel={`Open ${symbol} market depth`}
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
})

    )}
  </View>
)}

      <MarketDepthModal
        security={selectedSecurity}
        visible={Boolean(selectedSecurity)}
        onClose={() => setSelectedSecurity(null)}
      />
    </ScrollView>
  );
}

function SummaryBox({ label, value, positive, negative }) {
  return (
    <View style={styles.summaryBox}>
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

  tabRow: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },

  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
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

  cardTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 12
  },

  marketStatus: {
    marginTop: 16,
    backgroundColor: "#082f49",
    borderColor: "#0e7490",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },

  marketStatusTitle: {
    color: "#67e8f9",
    fontWeight: "900"
  },

  marketStatusBody: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 4
  },

  refreshButton: {
    backgroundColor: "#164e63",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10
  },

  refreshText: {
    color: "#67e8f9",
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
