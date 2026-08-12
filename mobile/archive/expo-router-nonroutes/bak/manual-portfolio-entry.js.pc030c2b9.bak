import React, { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  View,
  Pressable,
  StyleSheet,
  Alert
} from "react-native";
import { savePortfolio } from "../src/portfolio/portfolioStore";
import { userSetItem } from "../src/auth/userStorage";
import { buildSyncStatus } from "../src/portfolio/syncStatus";
import { router } from "expo-router";

const market = {
  ABSA: { price: 29, sector: "Banking" },
  BAT: { price: 520, sector: "Mfg. and Allied" },
  COOP: { price: 31.6, sector: "Banking" },
  EQT: { price: 75.25, sector: "Banking" },
  KCB: { price: 67.75, sector: "Banking" },
  SCOM: { price: 30.6, sector: "Telecom" },
  KPLC: { price: 16.1, sector: "Energy and Petroleum" },
  KEGN: { price: 9.12, sector: "Energy and Petroleum" },
  KNRE: { price: 3.34, sector: "Insurance" },
  GLD: { price: 5650, sector: "ETF" }
};

export default function ManualPortfolioEntry() {
  const [symbol, setSymbol] = useState("SCOM");
  const [quantity, setQuantity] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [rows, setRows] = useState([]);

  const enrichedRows = useMemo(() => {
    return rows.map((row) => {
      const m = market[row.symbol] || { price: 0, sector: "Unknown" };

      const qty = Number(row.quantity || 0);
      const avg = Number(row.avgPrice || 0);
      const price = Number(m.price || 0);

      const marketValue = qty * price;
      const costValue = qty * avg;
      const profitLoss = marketValue - costValue;
      const profitLossPct =
        costValue > 0 ? (profitLoss / costValue) * 100 : 0;

      return {
        broker: "MANUAL",
        symbol: row.symbol,
        sector: m.sector,
        quantity: qty,
        averagePrice: avg,
        marketPrice: price,
        marketValue,
        value: marketValue,
        profitLoss,
        profitLossPct,
        changePct: profitLossPct
      };
    });
  }, [rows]);

  function addRow() {
    if (!symbol || !quantity || !avgPrice) {
      Alert.alert("Missing data", "Enter security, quantity, and weighted average price.");
      return;
    }

    setRows([
      ...rows,
      {
        id: Date.now(),
        symbol: symbol.toUpperCase().trim(),
        quantity,
        avgPrice
      }
    ]);

    setQuantity("");
    setAvgPrice("");
  }

  function removeRow(id) {
    setRows(rows.filter((row) => row.id !== id));
  }

  async function submitPortfolio() {
  if (enrichedRows.length === 0) {
    Alert.alert("No holdings", "Add at least one holding.");
    return;
  }

  await savePortfolio(enrichedRows);

  await userSetItem(
    "latestUpload",
    JSON.stringify({
      uploadedAt: new Date().toISOString(),
      valuation: {
        reportType: "manual",
        fileName: "Manual Portfolio Entry",
        uploadedAt: new Date().toISOString(),
        backendStored: false,
        manualEntry: true,
        parsedHoldings: enrichedRows
      }
    })
  );

  await userSetItem(
    "statementSummary",
    JSON.stringify({
      count: enrichedRows.length,
      fileName: "Manual Portfolio Entry",
      source: "MANUAL_PORTFOLIO_ENTRY",
      uploadedAt: new Date().toISOString()
    })
  );

  await userSetItem("statementUploaded", "true");

  await userSetItem(
    "brokerProfile",
    JSON.stringify({
      broker: "MANUAL",
      name: "MANUAL",
      brokerName: "MANUAL",
      clientNumber: "",
      cdsNumber: "",
      source: "MANUAL_PORTFOLIO_ENTRY",
      updatedAt: new Date().toISOString()
    })
  );

  await userSetItem("brokerProfileSkipped", "false");

  await buildSyncStatus();

  router.push("/(tabs)/dashboard");
}

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Confirm Portfolio Holdings</Text>

      <Text style={styles.subtitle}>
        Add your holdings manually. Later, uploaded files will populate this same screen for review and correction.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Security Symbol</Text>
        <TextInput
          value={symbol}
          onChangeText={setSymbol}
          autoCapitalize="characters"
          style={styles.input}
          placeholder="SCOM"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Quantity</Text>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          style={styles.input}
          placeholder="900"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Weighted Average Price</Text>
        <TextInput
          value={avgPrice}
          onChangeText={setAvgPrice}
          keyboardType="numeric"
          style={styles.input}
          placeholder="29.84"
          placeholderTextColor="#64748b"
        />

        <Pressable style={styles.secondary} onPress={addRow}>
          <Text style={styles.secondaryText}>Add Holding</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Review Holdings</Text>

      {enrichedRows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No holdings added yet.</Text>
        </View>
      ) : (
        enrichedRows.map((row) => (
          <View key={`${row.symbol}-${row.quantity}-${row.averagePrice}`} style={styles.holdingCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.symbol}>{row.symbol}</Text>
              <Text style={row.profitLoss >= 0 ? styles.green : styles.red}>
                KES {money(row.profitLoss)}
              </Text>
            </View>

            <Text style={styles.muted}>{row.sector}</Text>

            <View style={styles.grid}>
              <Info label="Qty" value={row.quantity} />
              <Info label="Avg" value={`KES ${money(row.averagePrice)}`} />
              <Info label="Market" value={`KES ${money(row.marketPrice)}`} />
              <Info label="Value" value={`KES ${money(row.marketValue)}`} />
            </View>

            <Pressable
              style={styles.remove}
              onPress={() =>
                removeRow(
                  rows.find(
                    (x) =>
                      x.symbol === row.symbol &&
                      Number(x.quantity) === row.quantity &&
                      Number(x.avgPrice) === row.averagePrice
                  )?.id
                )
              }
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}

      <Pressable style={styles.primary} onPress={submitPortfolio}>
        <Text style={styles.primaryText}>Submit Portfolio for Coach G Analysis</Text>
      </Pressable>

      <Pressable style={styles.linkButton} onPress={() => router.push("/(tabs)/dashboard")}>
        <Text style={styles.linkText}>Back to Dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

function Info({ label, value }) {
  return (
    <View style={styles.info}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.white}>{String(value)}</Text>
    </View>
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
  content: { padding: 22, paddingTop: 70, paddingBottom: 40 },
  title: { color: "white", fontSize: 32, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  card: {
    marginTop: 22,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  label: { color: "#67e8f9", fontWeight: "900", marginTop: 12 },
  input: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    color: "white",
    marginTop: 8
  },
  secondary: {
    marginTop: 18,
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 16
  },
  secondaryText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" },
  sectionTitle: { color: "white", fontSize: 24, fontWeight: "900", marginTop: 28 },
  emptyCard: {
    marginTop: 14,
    backgroundColor: "#0f172a",
    borderRadius: 18,
    padding: 18
  },
  emptyText: { color: "#94a3b8" },
  holdingCard: {
    marginTop: 14,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  symbol: { color: "white", fontSize: 20, fontWeight: "900" },
  green: { color: "#86efac", fontWeight: "900" },
  red: { color: "#fca5a5", fontWeight: "900" },
  muted: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  info: {
    width: "47%",
    backgroundColor: "#020617",
    borderRadius: 12,
    padding: 10
  },
  white: { color: "white", fontWeight: "900", marginTop: 4 },
  remove: {
    marginTop: 12,
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    padding: 12,
    borderRadius: 14
  },
  removeText: { color: "#fca5a5", textAlign: "center", fontWeight: "900" },
  primary: {
    marginTop: 24,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" },
  linkButton: { marginTop: 18, padding: 14 },
  linkText: { color: "#c084fc", textAlign: "center", fontWeight: "900" }
});