import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import useMarketData from "../src/markets/useMarketData";
import {
  WATCHLIST_NAMES,
  loadWatchlists,
  saveWatchlists
} from "../src/watchlist/watchlistStore";
import { buildWatchlistScores } from "../src/watchlist/watchlistScoring";
import { generateWatchlistSignals } from "../src/utils/watchlistSignals";

export default function Watchlist() {
  const { rows, connected, loading, lastUpdated, reload } = useMarketData();

  const [watchlists, setWatchlists] = useState({});
  const [activeList, setActiveList] = useState("Balanced Growth");
  const [search, setSearch] = useState("");
  const [modalSearch, setModalSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUserWatchlists();
    }, [])
  );

  async function loadUserWatchlists() {
    const saved = await loadWatchlists();
    setWatchlists(saved);
  }

  const activeSymbols = useMemo(() => {
    return watchlists[activeList] || [];
  }, [watchlists, activeList]);

  const marketMap = useMemo(() => {
    const map = new Map();

    rows.forEach((item) => {
      map.set(String(item.symbol || "").toUpperCase(), item);
    });

    return map;
  }, [rows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return activeSymbols
      .map((symbol) => marketMap.get(String(symbol).toUpperCase()))
      .filter(Boolean)
      .filter((item) => {
        if (!q) return true;

        return (
          String(item.symbol || "").toLowerCase().includes(q) ||
          String(item.name || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)));
  }, [activeSymbols, marketMap, search]);

  const scoredRows = useMemo(() => {
    const generated = generateWatchlistSignals(
      visibleRows.map((item) => ({
        ...item,
        currentPrice: Number(item.price || item.lastPrice || 0),
        changePct: Number(item.changePct || 0)
      }))
    );

    return buildWatchlistScores(generated);
  }, [visibleRows]);

  const availableToAdd = useMemo(() => {
    const q = modalSearch.trim().toLowerCase();

    return rows
      .filter((item) => {
        if (!q) return true;

        return (
          String(item.symbol || "").toLowerCase().includes(q) ||
          String(item.name || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => String(a.symbol).localeCompare(String(b.symbol)));
  }, [rows, modalSearch]);

  async function toggleSymbol(symbol) {
    const normalized = String(symbol || "").toUpperCase();

    if (!normalized) return;

    const current = watchlists[activeList] || [];

    const nextSymbols = current.includes(normalized)
      ? current.filter((x) => x !== normalized)
      : [...current, normalized];

    const next = {
      ...watchlists,
      [activeList]: nextSymbols
    };

    setWatchlists(next);
    await saveWatchlists(next);
  }

  async function resetActiveList() {
    const next = {
      ...watchlists,
      [activeList]: []
    };

    setWatchlists(next);
    await saveWatchlists(next);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#67e8f9" />
        <Text style={styles.loading}>Loading watchlist...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Watchlist</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Strategy watchlists powered by the NSE market feed and Coach G signals.
      </Text>

      <Text style={connected ? styles.connected : styles.disconnected}>
        {connected ? "Market connected" : "Market fallback"} • Updated{" "}
        {lastUpdated ? new Date(lastUpdated).toLocaleString() : "N/A"}
      </Text>

      <ActiveUserBanner />

      <View style={styles.tabs}>
        {WATCHLIST_NAMES.map((name) => (
          <Pressable
            key={name}
            style={[styles.tab, activeList === name && styles.tabActive]}
            onPress={() => setActiveList(name)}
          >
            <Text
              style={
                activeList === name ? styles.tabTextActive : styles.tabText
              }
            >
              {name}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search current strategy watchlist"
        placeholderTextColor="#64748b"
        style={styles.search}
      />

      <View style={styles.actionRow}>
        <Pressable
          style={styles.actionButton}
          onPress={() => {
            setModalSearch("");
            setShowAddModal(true);
          }}
        >
          <Text style={styles.actionText}>+ Add Securities</Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={resetActiveList}>
          <Text style={styles.actionText}>Clear List</Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={reload}>
          <Text style={styles.actionText}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {activeList} Strategy • {scoredRows.length} securities
        </Text>

        {scoredRows.length === 0 ? (
          <Text style={styles.empty}>
            No securities in this strategy watchlist. Tap + Add Securities.
          </Text>
        ) : (
          scoredRows.map((item) => (
            <Pressable
              key={item.symbol}
              style={styles.stockRow}
              onPress={() => router.push(`/security/${item.symbol}`)}
            >
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>
                  {String(item.symbol || "?").slice(0, 2)}
                </Text>
              </View>

              <View style={styles.stockLeft}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.name}>{item.name || item.symbol}</Text>
                <Text style={styles.reason}>{item.reason}</Text>
              </View>

              <View style={styles.stockRight}>
                <Text style={styles.price}>
                  KES {money(item.currentPrice || item.price || item.lastPrice)}
                </Text>

                <Text
                  style={
                    Number(item.changePct || 0) >= 0
                      ? styles.green
                      : styles.red
                  }
                >
                  {Number(item.changePct || 0) >= 0 ? "▲" : "▼"}{" "}
                  {Number(item.changePct || 0).toFixed(2)}%
                </Text>

                <Text style={actionStyle(item.action)}>{item.action}</Text>
                <Text style={styles.confidence}>{item.confidence}%</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <Pressable
        style={styles.primary}
        onPress={() => router.push("/coach-insights")}
      >
        <Text style={styles.primaryText}>Open Coach G Insights</Text>
      </Pressable>

      <AddSecuritiesModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        query={modalSearch}
        setQuery={setModalSearch}
        rows={availableToAdd}
        activeSymbols={activeSymbols}
        toggleSymbol={toggleSymbol}
      />
    </ScrollView>
  );
}

function AddSecuritiesModal({
  visible,
  onClose,
  query,
  setQuery,
  rows,
  activeSymbols,
  toggleSymbol
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Securities</Text>

            <Pressable onPress={onClose}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search NSE securities"
            placeholderTextColor="#64748b"
            style={styles.search}
          />

          <ScrollView style={{ maxHeight: 520 }}>
            {rows.map((item) => {
              const selected = activeSymbols.includes(item.symbol);

              return (
                <Pressable
                  key={item.symbol}
                  style={styles.modalRow}
                  onPress={() => toggleSymbol(item.symbol)}
                >
                  <View style={styles.logoCircle}>
                    <Text style={styles.logoText}>
                      {String(item.symbol || "?").slice(0, 2)}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.symbol}>{item.symbol}</Text>
                    <Text style={styles.name}>{item.name || item.symbol}</Text>
                    <Text style={styles.reason}>{item.sector || "NSE"}</Text>
                  </View>

                  <Text style={selected ? styles.selected : styles.add}>
                    {selected ? "Added" : "Add"}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function actionStyle(action) {
  if (action === "BUY") return styles.buy;
  if (action === "ACCUMULATE") return styles.accumulate;
  if (action === "INCOME") return styles.income;
  if (action === "HOLD") return styles.hold;
  return styles.caution;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 110 },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center"
  },
  loading: { color: "#cbd5e1", marginTop: 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 34, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  connected: {
    color: "#86efac",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "900"
  },
  disconnected: {
    color: "#fca5a5",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "900"
  },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardButtonText: { color: "#67e8f9", fontWeight: "900" },
  tabs: {
    marginTop: 18,
    flexDirection: "row",
    gap: 8
  },
  tab: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 14
  },
  tabActive: {
    backgroundColor: "rgba(147,51,234,.25)",
    borderColor: "#9333ea"
  },
  tabText: {
    color: "#cbd5e1",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 11
  },
  tabTextActive: {
    color: "white",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 11
  },
  search: {
    marginTop: 16,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    color: "white",
    padding: 16,
    borderRadius: 16
  },
  actionRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 12
  },
  actionText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 12
  },
  card: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  cardTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 14
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  logoText: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 13
  },
  stockLeft: { flex: 1 },
  stockRight: { alignItems: "flex-end", minWidth: 105 },
  symbol: {
    color: "white",
    fontWeight: "900",
    fontSize: 16
  },
  name: { color: "#cbd5e1", marginTop: 4 },
  reason: {
    color: "#94a3b8",
    marginTop: 4,
    lineHeight: 18,
    fontSize: 12
  },
  price: { color: "white", fontWeight: "900" },
  green: { color: "#86efac", fontWeight: "900", marginTop: 4 },
  red: { color: "#fca5a5", fontWeight: "900", marginTop: 4 },
  buy: { color: "#22c55e", fontWeight: "900", marginTop: 4 },
  accumulate: { color: "#67e8f9", fontWeight: "900", marginTop: 4 },
  income: { color: "#fbbf24", fontWeight: "900", marginTop: 4 },
  hold: { color: "#a78bfa", fontWeight: "900", marginTop: 4 },
  caution: { color: "#f87171", fontWeight: "900", marginTop: 4 },
  confidence: { color: "white", fontWeight: "900", marginTop: 2 },
  empty: { color: "#94a3b8", marginTop: 12, lineHeight: 20 },
  primary: {
    marginTop: 18,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.72)",
    justifyContent: "center",
    padding: 18
  },
  modal: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    maxHeight: "88%"
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalTitle: { color: "white", fontSize: 24, fontWeight: "900" },
  close: { color: "#94a3b8", fontWeight: "900" },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 14
  },
  selected: { color: "#86efac", fontWeight: "900" },
  add: { color: "#67e8f9", fontWeight: "900" }
});