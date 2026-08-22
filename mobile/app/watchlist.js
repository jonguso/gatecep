import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import { userGetItem, userSetItem } from "../src/auth/userStorage";
import useMarketData from "../src/services/markets/useMarketData";

const WATCHLIST_KEY = "marketWatchlist";

export default function WatchlistManager() {
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const market = useMarketData();

  useFocusEffect(
    useCallback(() => {
      load();
      market.reload();
    }, [])
  );

  async function load() {
    const raw = await userGetItem(WATCHLIST_KEY);
    const saved = raw ? JSON.parse(raw) : ["SCOM", "EABL", "EQTY", "COOP"];
    setSelected(Array.isArray(saved) ? saved : []);
  }

  const rows = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return market.rows;

    return market.rows.filter(
      (row) =>
        row.symbol.toLowerCase().includes(search) ||
        row.name.toLowerCase().includes(search)
    );
  }, [query, market.rows]);

  function toggle(symbol) {
    setSelected((current) =>
      current.includes(symbol)
        ? current.filter((item) => item !== symbol)
        : [...current, symbol]
    );
  }

  async function save() {
    await userSetItem(WATCHLIST_KEY, JSON.stringify(selected));
    Alert.alert("Saved", "Watchlist updated.");
    router.replace("/(tabs)/markets");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <Text style={styles.title}>My Watchlist</Text>

        <Pressable style={styles.saveButton} onPress={save}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search securities"
        placeholderTextColor="#64748b"
        style={styles.search}
      />

      <Text style={styles.section}>Active Counters</Text>

      {market.loading ? (
        <Text style={styles.message}>Loading verified NSE securities…</Text>
      ) : null}

      {!market.loading && !market.connected ? (
        <Text style={styles.message}>
          {market.error || "Verified market securities are unavailable."}
        </Text>
      ) : null}

      {rows.map((row) => {
        const checked = selected.includes(row.symbol);

        return (
          <Pressable
            key={row.symbol}
            style={styles.row}
            onPress={() => toggle(row.symbol)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.symbol}>{row.symbol}</Text>
              <Text style={styles.name}>{row.name}</Text>
            </View>

            <Text style={checked ? styles.checked : styles.unchecked}>
              {checked ? "✓" : ""}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 120 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center"
  },
  backText: { color: "white", fontSize: 30, fontWeight: "900" },
  title: { color: "white", fontSize: 30, fontWeight: "900", flex: 1 },
  saveButton: {
    backgroundColor: "#9333ea",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14
  },
  saveText: { color: "white", fontWeight: "900" },
  search: {
    marginTop: 22,
    backgroundColor: "#0f172a",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    color: "white"
  },
  section: {
    color: "#86efac",
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 8,
    textTransform: "uppercase"
  },
  message: { color: "#94a3b8", paddingVertical: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomColor: "#334155",
    borderBottomWidth: 1,
    paddingVertical: 14,
    gap: 12
  },
  symbol: { color: "white", fontWeight: "900", fontSize: 17 },
  name: { color: "#94a3b8", marginTop: 3 },
  checked: {
    color: "white",
    fontSize: 28,
    fontWeight: "900"
  },
  unchecked: {
    width: 24
  }
});
