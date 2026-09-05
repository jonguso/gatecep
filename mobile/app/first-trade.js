import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router } from "expo-router";

import { validateOrder } from "../src/utils/orderValidator";
import {
  loadInvestorContext,
  savePracticePortfolio
} from "../src/features/investor/investorContextStore";
import {
  userGetItem,
  userSetItem
} from "../src/auth/userStorage";

const STOCKS = [
  {
    symbol: "SCOM",
    name: "Safaricom",
    sector: "Telecom",
    price: 30.6,
    reason: "Beginner-friendly telecom and mobile money exposure."
  },
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
];

export default function FirstTrade() {
  const [portfolio, setPortfolio] = useState([]);
  const [cash, setCash] = useState(0);
  const [selectedStock, setSelectedStock] = useState(STOCKS[0]);
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("1");
  const [limitPrice, setLimitPrice] = useState(String(STOCKS[0].price));
  const [confirmedTrade, setConfirmedTrade] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const context = await loadInvestorContext();
    const practice = context?.practicePortfolio || {};

    setPortfolio(Array.isArray(practice?.holdings) ? practice.holdings : []);
    setCash(Number(practice?.availableCash || 0));
  }

  function selectStock(stock) {
    setSelectedStock(stock);
    setLimitPrice(String(stock.price));
    setConfirmedTrade(null);
  }

  const estimate = useMemo(() => {
    const qty = Number(quantity || 0);
    const price = Number(limitPrice || selectedStock.price || 0);
    const gross = qty * price;

    const brokerFee = gross * 0.012;
    const regulatoryFee = gross * 0.002;
    const totalFees = brokerFee + regulatoryFee;

    const totalCost =
      side === "BUY" ? gross + totalFees : Math.max(gross - totalFees, 0);

    const remainingCash = side === "BUY" ? cash - totalCost : cash + totalCost;

    return {
      qty,
      price,
      gross,
      brokerFee,
      regulatoryFee,
      totalFees,
      totalCost,
      remainingCash
    };
  }, [quantity, limitPrice, selectedStock, side, cash]);

  async function confirmTrade() {
    if (!estimate.qty || estimate.qty <= 0) {
      Alert.alert("Invalid Quantity", "Enter a valid quantity.");
      return;
    }

    if (!estimate.price || estimate.price <= 0) {
      Alert.alert("Invalid Price", "Enter a valid limit price.");
      return;
    }

    if (side === "BUY" && estimate.remainingCash < 0) {
      Alert.alert(
        "Insufficient Cash",
        `You need KES ${money(estimate.totalCost)} but only have KES ${money(cash)}.`
      );
      return;
    }

    const brokerProfile = {
      broker: "PRACTICE",
      nickname: "Practice Simulator",
      clientNumber: "PRACTICE",
      cdsNumber: "PRACTICE",
      defaultBroker: false,
      connectionMode: "SIMULATION"
    };

    const validation = validateOrder({
      side,
      symbol: selectedStock.symbol,
      quantity: estimate.qty,
      price: estimate.price,
      cash,
      totalCost: estimate.totalCost,
      portfolio,
      brokerProfile
    });

    if (!validation.ok) {
      Alert.alert("Order Blocked", validation.errors.join("\n"));
      return;
    }

    let nextPortfolio = [...portfolio];

    const existingIndex = nextPortfolio.findIndex(
      (item) => String(item.symbol).toUpperCase() === selectedStock.symbol
    );

    if (side === "BUY") {
      if (existingIndex >= 0) {
        const existing = nextPortfolio[existingIndex];

        const existingQty = Number(existing.quantity || 0);
        const existingAvgPrice = Number(
          existing.averagePrice || existing.averageCost || 0
        );
        const existingCostValue = existingQty * existingAvgPrice;

        const newQty = existingQty + estimate.qty;
        const newCostValue = existingCostValue + estimate.totalCost;
        const newAveragePrice = newQty > 0 ? newCostValue / newQty : 0;
        const newMarketValue = newQty * estimate.price;

        nextPortfolio[existingIndex] = {
          ...existing,
          quantity: newQty,
          averagePrice: newAveragePrice,
          averageCost: newAveragePrice,
          costValue: newCostValue,
          investedValue: newCostValue,
          marketPrice: estimate.price,
          price: estimate.price,
          marketValue: newMarketValue,
          value: newMarketValue,
          profitLoss: newMarketValue - newCostValue,
          profitLossPct:
            newCostValue > 0
              ? ((newMarketValue - newCostValue) / newCostValue) * 100
              : 0,
          source: "FIRST_TRADE_SIMULATION",
          updatedAt: new Date().toISOString()
        };
      } else {
        const averagePrice =
          estimate.qty > 0 ? estimate.totalCost / estimate.qty : estimate.price;

        nextPortfolio.push({
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          sector: selectedStock.sector,
          quantity: estimate.qty,
          averagePrice,
          averageCost: averagePrice,
          costValue: estimate.totalCost,
          investedValue: estimate.totalCost,
          marketPrice: estimate.price,
          price: estimate.price,
          marketValue: estimate.gross,
          value: estimate.gross,
          profitLoss: estimate.gross - estimate.totalCost,
          profitLossPct:
            estimate.totalCost > 0
              ? ((estimate.gross - estimate.totalCost) / estimate.totalCost) * 100
              : 0,
          source: "FIRST_TRADE_SIMULATION",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    if (side === "SELL") {
      if (existingIndex < 0) {
        Alert.alert("No Holding", `You do not hold ${selectedStock.symbol}.`);
        return;
      }

      const existing = nextPortfolio[existingIndex];
      const existingQty = Number(existing.quantity || 0);

      if (estimate.qty > existingQty) {
        Alert.alert(
          "Too Many Shares",
          `You only hold ${existingQty} shares of ${selectedStock.symbol}.`
        );
        return;
      }

      const remainingQty = existingQty - estimate.qty;

      if (remainingQty <= 0) {
        nextPortfolio.splice(existingIndex, 1);
      } else {
        nextPortfolio[existingIndex] = {
          ...existing,
          quantity: remainingQty,
          marketPrice: estimate.price,
          price: estimate.price,
          marketValue: remainingQty * estimate.price,
          value: remainingQty * estimate.price,
          source: "FIRST_TRADE_SIMULATION",
          updatedAt: new Date().toISOString()
        };
      }
    }

    const trade = {
      id: `TRD-${Date.now()}`,
      symbol: selectedStock.symbol,
      name: selectedStock.name,
      sector: selectedStock.sector,
      side,
      quantity: estimate.qty,
      price: estimate.price,
      gross: estimate.gross,
      brokerFee: estimate.brokerFee,
      regulatoryFee: estimate.regulatoryFee,
      totalFees: estimate.totalFees,
      totalCost: estimate.totalCost,
      cashBefore: cash,
      cashAfter: estimate.remainingCash,
      tradedAt: new Date().toISOString(),
      status: "SIMULATED_EXECUTED",
      orderType: "MARKET",
      settlementStatus: "SETTLED",
      source: "FIRST_TRADE_SIMULATION",
      isPractice: true,
      isReal: false,
      sourceType: "PRACTICE"
    };

    const tradeRaw = await userGetItem("practiceSimulatedTrades");
    const trades = tradeRaw ? JSON.parse(tradeRaw) : [];

    trades.unshift(trade);

    await savePracticePortfolio({
      ...(await loadInvestorContext())?.practicePortfolio,
      holdings: nextPortfolio,
      availableCash: estimate.remainingCash,
      status: "ACTIVE",
      lastActivityType: "FIRST_TRADE_SIMULATION"
    });
    await userSetItem("practiceSimulatedTrades", JSON.stringify(trades));
    await userSetItem("practiceFirstTradeCompleted", "true");

    setPortfolio(nextPortfolio);
    setCash(estimate.remainingCash);
    setConfirmedTrade(trade);

    Alert.alert(
      "Trade Complete",
      `${side} ${estimate.qty} ${selectedStock.symbol} simulated.`
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Practice First Trade</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Practice your first buy or sell safely. This simulation never changes your REAL broker holdings, cash, readiness, or history.
      </Text>

      <View style={styles.summaryCard}>
        <Metric label="Available Cash" value={`KES ${money(cash)}`} />
        <Metric label="Selected Stock" value={selectedStock.symbol} />
        <Metric label="Side" value={side} />
        <Metric label="Portfolio Positions" value={String(portfolio.length)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Choose Security</Text>

        {STOCKS.map((stock) => (
          <Pressable
            key={stock.symbol}
            style={[
              styles.stockRow,
              selectedStock.symbol === stock.symbol && styles.stockActive
            ]}
            onPress={() => selectStock(stock)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.symbol}>{stock.symbol}</Text>
              <Text style={styles.small}>
                {stock.name} • {stock.sector}
              </Text>
              <Text style={styles.reason}>{stock.reason}</Text>
            </View>

            <Text style={styles.price}>KES {money(stock.price)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Ticket</Text>

        <View style={styles.sideRow}>
          {["BUY", "SELL"].map((item) => (
            <Pressable
              key={item}
              style={[styles.sideChip, side === item && styles.sideActive]}
              onPress={() => {
                setSide(item);
                setConfirmedTrade(null);
              }}
            >
              <Text style={side === item ? styles.sideTextActive : styles.sideText}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        {side === "BUY" && estimate.remainingCash < 0 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Insufficient Cash</Text>
            <Text style={styles.warningText}>
              Reduce quantity or add funds. You need KES{" "}
              {money(estimate.totalCost)} but only have KES {money(cash)}.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Quantity</Text>
        <TextInput
          value={quantity}
          onChangeText={(value) => {
            setQuantity(value);
            setConfirmedTrade(null);
          }}
          keyboardType="numeric"
          placeholder="Quantity"
          placeholderTextColor="#64748b"
          style={styles.input}
        />

        <Text style={styles.label}>Limit Price</Text>
        <TextInput
          value={limitPrice}
          onChangeText={(value) => {
            setLimitPrice(value);
            setConfirmedTrade(null);
          }}
          keyboardType="numeric"
          placeholder="Limit Price"
          placeholderTextColor="#64748b"
          style={styles.input}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trade Estimate</Text>

        <Info label="Gross Value" value={`KES ${money(estimate.gross)}`} />
        <Info label="Broker Fee" value={`KES ${money(estimate.brokerFee)}`} />
        <Info label="Regulatory Fee" value={`KES ${money(estimate.regulatoryFee)}`} />
        <Info label="Total Fees" value={`KES ${money(estimate.totalFees)}`} />
        <Info
          label={side === "BUY" ? "Cash Required" : "Estimated Proceeds"}
          value={`KES ${money(estimate.totalCost)}`}
        />
        <Info
          label="Cash After Trade"
          value={`KES ${money(estimate.remainingCash)}`}
          valueStyle={estimate.remainingCash >= 0 ? styles.green : styles.red}
        />
      </View>

      <Pressable
        style={[
          styles.primary,
          side === "BUY" && estimate.remainingCash < 0 && styles.disabledButton
        ]}
        disabled={side === "BUY" && estimate.remainingCash < 0}
        onPress={confirmTrade}
      >
        <Text style={styles.primaryText}>
          {side === "BUY" && estimate.remainingCash < 0
            ? "Insufficient Cash"
            : `Confirm Simulated ${side}`}
        </Text>
      </Pressable>

      {confirmedTrade && (
        <View style={styles.confirmCard}>
          <Text style={styles.cardTitle}>Trade Complete</Text>

          <Text style={styles.body}>
            {confirmedTrade.side} {confirmedTrade.quantity}{" "}
            {confirmedTrade.symbol} at KES {money(confirmedTrade.price)} has
            been simulated.
          </Text>

          <Text style={styles.body}>
            Portfolio and cash have been updated for Coach G monitoring.
          </Text>

          <Pressable
            style={styles.secondary}
            onPress={() => router.replace("/(tabs)/dashboard")}
          >
            <Text style={styles.secondaryText}>Open Dashboard</Text>
          </Pressable>

          <Pressable
            style={styles.secondary}
            onPress={() => router.push("/trade-history")}
          >
            <Text style={styles.secondaryText}>View Trade History</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        style={styles.backButton}
        onPress={() => router.replace("/broker-status")}
      >
        <Text style={styles.backText}>Back to Broker Readiness</Text>
      </Pressable>
    </ScrollView>
  );
}

function Metric({ label, value }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{String(value || "N/A")}</Text>
    </View>
  );
}

function Info({ label, value, valueStyle }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 30, fontWeight: "900", flex: 1 },
  subtitle: { color: "#94a3b8", marginTop: 10, lineHeight: 22 },
  dashboardButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  dashboardButtonText: {
    color: "#67e8f9",
    fontWeight: "900"
  },
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
  metricValue: { color: "white", fontWeight: "900", marginTop: 6 },
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
  stockRow: {
    marginTop: 12,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  stockActive: {
    borderColor: "#9333ea",
    backgroundColor: "rgba(147,51,234,.14)"
  },
  symbol: { color: "white", fontWeight: "900", fontSize: 17 },
  small: { color: "#94a3b8", marginTop: 4 },
  reason: { color: "#cbd5e1", marginTop: 6, lineHeight: 19, fontSize: 12 },
  price: { color: "#86efac", fontWeight: "900", marginTop: 2 },
  sideRow: { flexDirection: "row", gap: 10 },
  sideChip: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1
  },
  sideActive: {
    backgroundColor: "#9333ea",
    borderColor: "#c084fc"
  },
  sideText: { color: "#94a3b8", textAlign: "center", fontWeight: "900" },
  sideTextActive: { color: "white", textAlign: "center", fontWeight: "900" },
  label: { color: "#94a3b8", marginTop: 14 },
  input: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    color: "white",
    marginTop: 8
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1
  },
  infoLabel: { color: "#94a3b8", fontSize: 12 },
  infoValue: { color: "white", fontWeight: "900", marginTop: 4 },
  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  disabledButton: { opacity: 0.45 },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" },
  confirmCard: {
    marginTop: 22,
    backgroundColor: "rgba(34,197,94,.10)",
    borderColor: "rgba(34,197,94,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
  secondary: {
    marginTop: 18,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  secondaryText: { color: "#67e8f9", textAlign: "center", fontWeight: "900" },
  backButton: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  backText: { color: "#cbd5e1", textAlign: "center", fontWeight: "900" },
  warningBox: {
    marginTop: 18,
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  warningTitle: {
    color: "#fca5a5",
    fontWeight: "900"
  },
  warningText: {
    color: "#cbd5e1",
    marginTop: 6,
    lineHeight: 20
  },
  green: { color: "#86efac" },
  red: { color: "#fca5a5" }
});
