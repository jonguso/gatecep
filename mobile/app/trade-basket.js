import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import {
  clearTradeBasket,
  loadTradeBasket,
  saveTradeBasket
} from "../src/trade/tradeBasketStore";

export default function TradeBasket() {
  const [basket, setBasket] = useState(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const saved = await loadTradeBasket();
    setBasket(saved);
  }

  const items = basket?.items || [];

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [items]);

  async function removeItem(itemId) {
    const nextItems = items.filter((item) => item.id !== itemId);

    if (!nextItems.length) {
      await clearBasket();
      return;
    }

    const nextBasket = {
      ...basket,
      items: nextItems,
      updatedAt: new Date().toISOString()
    };

    await saveTradeBasket(nextItems, basket?.source || "COACH_G");
    setBasket(nextBasket);
  }

  async function clearBasket() {
    await clearTradeBasket();
    setBasket(null);
  }

  function sendToTrade() {
    if (!items.length) {
      Alert.alert("Empty Basket", "Create a basket from Coach G first.");
      return;
    }

    router.push("/orders-review");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Practice Trade Basket</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Review Coach G recommendations before sending them to the trade screen.
      </Text>

      <ActiveUserBanner />

      {!items.length ? (
        <View style={styles.emptyCard}>
          <Text style={styles.cardTitle}>No Active Basket</Text>
          <Text style={styles.body}>
            Create a trade basket from Coach G recommendations first.
          </Text>

          <Pressable
            style={styles.primary}
            onPress={() => router.push("/coach-insights")}
          >
            <Text style={styles.primaryText}>Open Coach G Insights</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Basket Total</Text>
            <Text style={styles.summaryValue}>KES {money(totalAmount)}</Text>
            <Text style={styles.body}>
              {basket?.source || "COACH_G"} • {items.length} orders
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basket Orders</Text>

            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoText}>
                    {String(item.symbol || "?").slice(0, 2)}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.symbol}>{item.symbol}</Text>
                  <Text style={styles.name}>{item.name || item.symbol}</Text>
                  <Text style={styles.reason}>{item.reason}</Text>
                  <Text style={styles.small}>
                    {item.side || "BUY"} • KES {money(item.amount)}
                  </Text>
                </View>

                <Pressable
                  style={styles.removeButton}
                  onPress={() => removeItem(item.id)}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable style={styles.primary} onPress={sendToTrade}>
            <Text style={styles.primaryText}>Send Basket to Trade</Text>
          </Pressable>

          <Pressable style={styles.secondary} onPress={clearBasket}>
            <Text style={styles.secondaryText}>Clear Basket</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 34, fontWeight: "900", flex: 1 },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardButtonText: { color: "#67e8f9", fontWeight: "900" },
  emptyCard: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  summaryCard: {
    marginTop: 20,
    backgroundColor: "rgba(147,51,234,.14)",
    borderColor: "rgba(147,51,234,.38)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  summaryLabel: { color: "#cbd5e1" },
  summaryValue: {
    color: "white",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6
  },
  card: {
    marginTop: 20,
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
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
  itemRow: {
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
  logoText: { color: "#67e8f9", fontWeight: "900", fontSize: 13 },
  symbol: { color: "white", fontWeight: "900", fontSize: 16 },
  name: { color: "#cbd5e1", marginTop: 4 },
  reason: { color: "#94a3b8", marginTop: 4, fontSize: 12, lineHeight: 18 },
  small: { color: "#67e8f9", marginTop: 5, fontWeight: "900", fontSize: 12 },
  removeButton: {
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12
  },
  removeText: { color: "#fca5a5", fontWeight: "900", fontSize: 12 },
  primary: {
    marginTop: 20,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" },
  secondary: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  secondaryText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" }
});
