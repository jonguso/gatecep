import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  userGetItem,
  userSetItem
} from "../src/auth/userStorage";


export default function StarterPlan() {
  const [profile, setProfile] = useState(null);
  const [planRows, setPlanRows] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const raw = userGetItem("investorProfile");

    if (!raw) return;

    const saved = JSON.parse(raw);
    setProfile(saved);

    const rows = buildStarterHoldings(saved.starterPlan.allocations);
    setPlanRows(rows);
  }

  async function createPortfolio() {
    if (!planRows.length) {
      Alert.alert("No Plan", "No starter portfolio available.");
      return;
    }

    const holdings = planRows
      .filter((x) => x.symbol !== "CASH" && x.quantity > 0)
      .map((x) => ({
        symbol: x.symbol,
        sector: x.sector,
        quantity: String(x.quantity),
        averagePrice: String(x.price),
        marketPrice: String(x.price),
        marketValue: x.invested,
        profitLoss: 0,
        source: "NEW_INVESTOR_STARTER_PLAN"
      }));

    const cash = planRows
      .filter((x) => x.symbol === "CASH")
      .reduce((sum, x) => sum + Number(x.invested || 0), 0);

    await AsyncStorage.setItem("gatecepManualPortfolio", JSON.stringify(holdings));
    await userGetItem("availableCash", String(cash));
    await AsyncStorage.setItem("gatecepStatementUploaded", "true");

    Alert.alert("Portfolio Created", "Your starter portfolio is now ready.");

    router.replace("/dashboard");
  }

  if (!profile) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Starter Plan</Text>
        <Text style={styles.subtitle}>No starter profile found yet.</Text>

        <Pressable style={styles.primary} onPress={() => router.replace("/new-investor")}>
          <Text style={styles.primaryText}>Create New Investor Profile</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const totalInvested = planRows
    .filter((x) => x.symbol !== "CASH")
    .reduce((sum, x) => sum + Number(x.invested || 0), 0);

  const cashReserve = planRows
    .filter((x) => x.symbol === "CASH")
    .reduce((sum, x) => sum + Number(x.invested || 0), 0);

  const totalPlan = totalInvested + cashReserve;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Starter Portfolio</Text>

      <Text style={styles.subtitle}>
        Coach G converted your starter allocation into estimated holdings.
      </Text>

      <View style={styles.summaryCard}>
        <Metric label="Starting Amount" value={`KES ${money(profile.profile.amount)}`} />
        <Metric label="Estimated Invested" value={`KES ${money(totalInvested)}`} />
        <Metric label="Cash Reserve" value={`KES ${money(cashReserve)}`} />
        <Metric label="Risk Profile" value={profile.profile.risk} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recommended Holdings</Text>

        {planRows.map((row, index) => (
          <View key={`${row.symbol}-${index}`} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.symbol}>{row.symbol}</Text>
              <Text style={styles.small}>{row.name}</Text>
              <Text style={styles.reason}>{row.reason}</Text>
            </View>

            <View style={styles.right}>
              <Text style={styles.qty}>
                {row.symbol === "CASH" ? "Reserve" : `${row.quantity} shares`}
              </Text>
              <Text style={styles.value}>KES {money(row.invested)}</Text>
              {row.symbol !== "CASH" && (
                <Text style={styles.price}>@ KES {money(row.price)}</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coach G Notes</Text>

        <Text style={styles.body}>
          • This is a starter model, not a live broker order.
        </Text>
        <Text style={styles.body}>
          • Prices are demo reference prices until real market feed is connected.
        </Text>
        <Text style={styles.body}>
          • Cash reserve remains available for safety and future opportunities.
        </Text>
        <Text style={styles.body}>
          • Review your portfolio after 30 days or after adding new cash.
        </Text>
      </View>

      <Pressable style={styles.primary} onPress={createPortfolio}>
  <Text style={styles.primaryText}>Create My Starter Portfolio</Text>
</Pressable>

<Pressable
  style={styles.secondary}
  onPress={() => router.push("/portfolio-simulator")}
>
  <Text style={styles.secondaryText}>Simulate My Portfolio</Text>
</Pressable>

<Pressable
  style={styles.secondary}
  onPress={() => router.replace("/new-investor")}
>
  <Text style={styles.secondaryText}>Back to Profile</Text>
</Pressable>

    </ScrollView>
  );
}

function buildStarterHoldings(allocations = []) {
  const ideas = {
    "Dividend Stocks": [
      {
        symbol: "SCOM",
        name: "Safaricom",
        sector: "Telecom",
        price: 30.6,
        reason: "Beginner-friendly telecom and dividend exposure."
      },
      {
        symbol: "EABL",
        name: "East African Breweries",
        sector: "Mfg. and Allied",
        price: 248,
        reason: "Defensive consumer income exposure."
      },
      {
        symbol: "BAT",
        name: "BAT Kenya",
        sector: "Mfg. and Allied",
        price: 520,
        reason: "High dividend defensive stock."
      }
    ],
    Banking: [
      {
        symbol: "KCB",
        name: "KCB Group",
        sector: "Banking",
        price: 45,
        reason: "Large banking exposure with regional presence."
      },
      {
        symbol: "EQTY",
        name: "Equity Group",
        sector: "Banking",
        price: 48,
        reason: "Strong retail and regional banking franchise."
      },
      {
        symbol: "COOP",
        name: "Co-operative Bank",
        sector: "Banking",
        price: 16,
        reason: "Lower-priced banking exposure for starter portfolios."
      }
    ],
    "ETF / Diversifier": [
      {
        symbol: "GLD",
        name: "Gold ETF",
        sector: "ETF",
        price: 5690,
        reason: "Gold ETF diversification."
      },
      {
        symbol: "SMWF",
        name: "Satrix MSCI World Feeder",
        sector: "ETF",
        price: 950,
        reason: "Broad market diversification."
      }
    ],
    "Growth Stocks": [
      {
        symbol: "SCOM",
        name: "Safaricom",
        sector: "Telecom",
        price: 30.6,
        reason: "Growth and mobile money exposure."
      },
      {
        symbol: "KEGN",
        name: "KenGen",
        sector: "Energy and Petroleum",
        price: 45.5,
        reason: "Energy infrastructure exposure."
      },
      {
        symbol: "KQ",
        name: "Kenya Airways",
        sector: "Comm. and Services",
        price: 3.8,
        reason: "Speculative turnaround exposure; higher risk."
      }
    ]
  };

  const output = [];

  allocations.forEach((allocation) => {
    if (allocation.name === "Cash Reserve") {
      output.push({
        symbol: "CASH",
        name: "Cash Reserve",
        sector: "Cash",
        price: 1,
        quantity: Math.floor(allocation.amount),
        invested: allocation.amount,
        reason: "Held for safety, flexibility, and future opportunities."
      });

      return;
    }

    const list = ideas[allocation.name] || [];
    const perStock = list.length ? allocation.amount / list.length : 0;

    list.forEach((item) => {
      const quantity = Math.floor(perStock / item.price);
      const invested = quantity * item.price;

      if (quantity > 0) {
        output.push({
          ...item,
          quantity,
          invested
        });
      }
    });
  });

  return output;
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{String(value || "N/A")}</Text>
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
  content: { padding: 22, paddingTop: 70, paddingBottom: 100 },
  title: { color: "white", fontSize: 34, fontWeight: "900" },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  summaryCard: {
    marginTop: 22,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metric: {
    width: "47%",
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  metricLabel: { color: "#94a3b8", fontSize: 12 },
  metricValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 6,
    textTransform: "capitalize"
  },
  card: {
    marginTop: 22,
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 14
  },
  symbol: { color: "white", fontSize: 17, fontWeight: "900" },
  small: { color: "#94a3b8", marginTop: 4 },
  reason: { color: "#cbd5e1", marginTop: 6, lineHeight: 19, fontSize: 12 },
  right: { alignItems: "flex-end", minWidth: 100 },
  qty: { color: "#67e8f9", fontWeight: "900" },
  value: { color: "white", fontWeight: "900", marginTop: 4 },
  price: { color: "#94a3b8", fontSize: 12, marginTop: 4 },
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
  primary: {
    marginTop: 22,
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