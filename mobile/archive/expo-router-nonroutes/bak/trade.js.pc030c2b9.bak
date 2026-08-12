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
import { loadPortfolio, savePortfolio } from "../src/portfolio/portfolioStore";
import { userGetItem, userSetItem } from "../src/auth/userStorage";
import {
  loadBasketExecution,
  saveBasketExecution,
  updateExecutionOrder
} from "../src/trade/basketExecutionStore";
import { buildSyncStatus } from "../src/portfolio/syncStatus";

const STOCKS = [
  { symbol: "SCOM", name: "Safaricom", sector: "Telecom", price: 30.6, reason: "Beginner-friendly telecom and mobile money exposure." },
  { symbol: "KCB", name: "KCB Group", sector: "Banking", price: 45, reason: "Large banking exposure with regional presence." },
  { symbol: "EQTY", name: "Equity Group", sector: "Banking", price: 48, reason: "Strong retail and regional banking franchise." },
  { symbol: "COOP", name: "Co-operative Bank", sector: "Banking", price: 16, reason: "Lower-priced banking exposure for starter portfolios." },
  { symbol: "EABL", name: "East African Breweries", sector: "Mfg. and Allied", price: 248, reason: "Defensive consumer income exposure." },
  { symbol: "BAT", name: "BAT Kenya", sector: "Mfg. and Allied", price: 520, reason: "High dividend defensive stock." }
];

export default function Trade() {
  const [portfolio, setPortfolio] = useState([]);
  const [cash, setCash] = useState(0);
  const [selectedStock, setSelectedStock] = useState(STOCKS[0]);
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("0");
  const [limitPrice, setLimitPrice] = useState(String(STOCKS[0].price));
  const [confirmedTrade, setConfirmedTrade] = useState(null);
  const [activeExecution, setActiveExecution] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const savedPortfolio = await loadPortfolio({ revalue: false });
    const cashRaw = await userGetItem("availableCash");
    const execution = await loadBasketExecution();

    setPortfolio(savedPortfolio);
    setCash(Number(cashRaw || 0));

    if (execution?.orders?.length) {
      setActiveExecution(execution);

      const nextOrder =
        execution.orders.find((order) => order.status !== "FILLED") ||
        execution.orders[0];

      loadOrderIntoTicket(nextOrder);
    }
  }

  function normalizeBasketOrder(order) {
    const price = Number(order?.price || order?.limitPrice || 0);
    const amount = Number(order?.amount || 0);

    const qty =
      Number(order?.quantity || 0) > 0
        ? Number(order.quantity)
        : price > 0 && amount > 0
        ? Math.floor(amount / price)
        : 1;

    return {
      ...order,
      side: order?.side || "BUY",
      price,
      quantity: qty,
      gross: qty * price,
      amount: amount || qty * price
    };
  }

  function loadOrderIntoTicket(order) {
    if (!order) return;

    const normalized = normalizeBasketOrder(order);

    const stock =
      STOCKS.find((item) => item.symbol === normalized.symbol) || {
        symbol: normalized.symbol,
        name: normalized.name || normalized.symbol,
        sector: normalized.sector || "NSE",
        price: normalized.price,
        reason: normalized.reason || "Coach G basket order"
      };

    setSelectedStock(stock);
    setSide(normalized.side);
    setQuantity(String(normalized.quantity || 1));
    setLimitPrice(String(normalized.price || stock.price || 0));
    setConfirmedTrade(null);
  }

  function selectStock(stock) {
    setSelectedStock(stock);
    setLimitPrice(String(stock.price));
    setConfirmedTrade(null);
  }

  const estimate = useMemo(() => {
    return buildEstimate({
      side,
      quantity: Number(quantity || 0),
      price: Number(limitPrice || selectedStock.price || 0),
      cash
    });
  }, [quantity, limitPrice, selectedStock, side, cash]);

  async function getBrokerProfile() {
    const brokerRaw = await userGetItem("defaultBrokerProfile");

    return brokerRaw
      ? JSON.parse(brokerRaw)
      : {
          broker: "AIB-AXYS",
          nickname: "Demo Broker",
          clientNumber: "DEMO",
          cdsNumber: "DEMO",
          defaultBroker: true,
          connectionMode: "SIMULATION"
        };
  }

  function applyTradeToPortfolio({
    currentPortfolio,
    stock,
    tradeSide,
    qty,
    price,
    totalCost,
    gross
  }) {
    const nextPortfolio = [...currentPortfolio];

    const existingIndex = nextPortfolio.findIndex(
      (item) => String(item.symbol).toUpperCase() === stock.symbol
    );

    if (tradeSide === "BUY") {
      if (existingIndex >= 0) {
        const existing = nextPortfolio[existingIndex];

        const existingQty = Number(existing.quantity || 0);
        const existingAvgPrice = Number(
          existing.averagePrice || existing.averageCost || 0
        );
        const existingCostValue = existingQty * existingAvgPrice;

        const newQty = existingQty + qty;
        const newCostValue = existingCostValue + totalCost;
        const newAveragePrice = newQty > 0 ? newCostValue / newQty : price;
        const newMarketValue = newQty * price;

        nextPortfolio[existingIndex] = {
          ...existing,
          quantity: newQty,
          averagePrice: newAveragePrice,
          averageCost: newAveragePrice,
          costValue: newCostValue,
          investedValue: newCostValue,
          marketPrice: price,
          price,
          marketValue: newMarketValue,
          value: newMarketValue,
          profitLoss: newMarketValue - newCostValue,
          profitLossPct:
            newCostValue > 0
              ? ((newMarketValue - newCostValue) / newCostValue) * 100
              : 0,
          source: "TRADE_SIMULATION",
          updatedAt: new Date().toISOString()
        };
      } else {
        const averagePrice = qty > 0 ? totalCost / qty : price;

        nextPortfolio.push({
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          quantity: qty,
          averagePrice,
          averageCost: averagePrice,
          costValue: totalCost,
          investedValue: totalCost,
          marketPrice: price,
          price,
          marketValue: gross,
          value: gross,
          profitLoss: gross - totalCost,
          profitLossPct:
            totalCost > 0 ? ((gross - totalCost) / totalCost) * 100 : 0,
          source: "TRADE_SIMULATION",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    if (tradeSide === "SELL") {
      if (existingIndex < 0) {
        throw new Error(`You do not hold ${stock.symbol}.`);
      }

      const existing = nextPortfolio[existingIndex];
      const existingQty = Number(existing.quantity || 0);

      if (qty > existingQty) {
        throw new Error(`You only hold ${existingQty} shares of ${stock.symbol}.`);
      }

      const remainingQty = existingQty - qty;

      if (remainingQty <= 0) {
        nextPortfolio.splice(existingIndex, 1);
      } else {
        nextPortfolio[existingIndex] = {
          ...existing,
          quantity: remainingQty,
          marketPrice: price,
          price,
          marketValue: remainingQty * price,
          value: remainingQty * price,
          source: "TRADE_SIMULATION",
          updatedAt: new Date().toISOString()
        };
      }
    }

    return nextPortfolio;
  }

  async function persistTrade({
    trade,
    nextPortfolio,
    nextCash
  }) {
    const tradeRaw = await userGetItem("simulatedTrades");
    const trades = tradeRaw ? JSON.parse(tradeRaw) : [];

    trades.unshift(trade);

    await savePortfolio(nextPortfolio);
    await userSetItem("availableCash", String(nextCash));
    await userSetItem("statementUploaded", "true");
    await userSetItem("simulatedTrades", JSON.stringify(trades));
    await userSetItem("firstTradeCompleted", "true");

    await userSetItem(
      "brokerReadiness",
      JSON.stringify({
        brokerSelected: true,
        cdsCreated: false,
        brokerOpened: false,
        brokerFunded: true,
        starterPortfolioReady: true,
        readyToInvest: true,
        firstTradeCompleted: true
      })
    );

    await buildSyncStatus();
  }

  async function confirmTrade() {
    try {
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

      const brokerProfile = await getBrokerProfile();

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

      const nextPortfolio = applyTradeToPortfolio({
        currentPortfolio: portfolio,
        stock: selectedStock,
        tradeSide: side,
        qty: estimate.qty,
        price: estimate.price,
        totalCost: estimate.totalCost,
        gross: estimate.gross
      });

      const trade = buildTrade({
        stock: selectedStock,
        tradeSide: side,
        estimate,
        cashBefore: cash,
        cashAfter: estimate.remainingCash,
        source: "TRADE_SIMULATION"
      });

      await persistTrade({
        trade,
        nextPortfolio,
        nextCash: estimate.remainingCash
      });

      await markBasketOrderFilled(trade);

      setPortfolio(nextPortfolio);
      setCash(estimate.remainingCash);
      setConfirmedTrade(trade);

      Alert.alert(
        "Trade Complete",
        `${side} ${estimate.qty} ${selectedStock.symbol} simulated.`
      );
    } catch (error) {
      Alert.alert("Trade Failed", error.message || "Trade could not be completed.");
    }
  }

  async function markBasketOrderFilled(trade) {
    if (!activeExecution?.orders?.length) return;

    const currentOrder = activeExecution.orders.find(
      (order) =>
        String(order.symbol).toUpperCase() === selectedStock.symbol &&
        order.status !== "FILLED"
    );

    if (!currentOrder) return;

    const updated = await updateExecutionOrder(currentOrder.id, {
      status: "FILLED",
      message: "Simulated trade completed",
      trade
    });

    setActiveExecution(updated);

    const nextOrder = updated?.orders?.find(
      (order) => order.status !== "FILLED"
    );

    if (nextOrder) {
      setTimeout(() => {
        loadOrderIntoTicket(nextOrder);
      }, 300);
    }
  }

  async function executeEntireBasket() {
    if (!activeExecution?.orders?.length) {
      Alert.alert("No Basket", "No active basket execution found.");
      return;
    }

    const pendingOrders = activeExecution.orders
      .filter((order) => order.status !== "FILLED")
      .map(normalizeBasketOrder)
      .filter((order) => order.quantity > 0 && order.price > 0);

    if (!pendingOrders.length) {
      Alert.alert("Basket Complete", "There are no pending basket orders.");
      return;
    }

    Alert.alert(
      "Buy All Basket Orders",
      `${pendingOrders.length} basket orders will be executed using available cash.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Execute All",
          onPress: async () => {
            await runBasketExecution(pendingOrders);
          }
        }
      ]
    );
  }

  async function runBasketExecution(pendingOrders) {
    try {
      const brokerProfile = await getBrokerProfile();

      let workingPortfolio = [...portfolio];
      let workingCash = Number(cash || 0);

      const tradeRaw = await userGetItem("simulatedTrades");
      const trades = tradeRaw ? JSON.parse(tradeRaw) : [];

      const updatedOrders = activeExecution.orders.map(normalizeBasketOrder);

      for (const order of pendingOrders) {
        const stock =
          STOCKS.find((item) => item.symbol === order.symbol) || {
            symbol: order.symbol,
            name: order.name || order.symbol,
            sector: order.sector || "NSE",
            price: order.price,
            reason: order.reason || "Coach G basket order"
          };

        const itemEstimate = buildEstimate({
          side: order.side || "BUY",
          quantity: order.quantity,
          price: order.price,
          cash: workingCash
        });

        const validation = validateOrder({
          side: order.side || "BUY",
          symbol: stock.symbol,
          quantity: itemEstimate.qty,
          price: itemEstimate.price,
          cash: workingCash,
          totalCost: itemEstimate.totalCost,
          portfolio: workingPortfolio,
          brokerProfile
        });

        if (!validation.ok) {
          throw new Error(`${stock.symbol}: ${validation.errors.join(", ")}`);
        }

        if ((order.side || "BUY") === "BUY" && itemEstimate.remainingCash < 0) {
          throw new Error(
            `${stock.symbol}: insufficient cash. Required KES ${money(
              itemEstimate.totalCost
            )}.`
          );
        }

        workingPortfolio = applyTradeToPortfolio({
          currentPortfolio: workingPortfolio,
          stock,
          tradeSide: order.side || "BUY",
          qty: itemEstimate.qty,
          price: itemEstimate.price,
          totalCost: itemEstimate.totalCost,
          gross: itemEstimate.gross
        });

        const trade = buildTrade({
          stock,
          tradeSide: order.side || "BUY",
          estimate: itemEstimate,
          cashBefore: workingCash,
          cashAfter: itemEstimate.remainingCash,
          source: "BASKET_EXECUTION"
        });

        trades.unshift(trade);
        workingCash = itemEstimate.remainingCash;

        const index = updatedOrders.findIndex((item) => item.id === order.id);

        if (index >= 0) {
          updatedOrders[index] = {
            ...updatedOrders[index],
            status: "FILLED",
            message: "Executed through Buy All",
            trade,
            filledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        }
      }

      const completedOrders = updatedOrders.filter(
        (order) => order.status === "FILLED"
      ).length;

      const updatedExecution = {
        ...activeExecution,
        status:
          completedOrders === updatedOrders.length ? "COMPLETED" : "IN_PROGRESS",
        completedOrders,
        failedOrders: updatedOrders.filter((order) => order.status === "FAILED")
          .length,
        totalOrders: updatedOrders.length,
        orders: updatedOrders,
        updatedAt: new Date().toISOString(),
        completedAt:
          completedOrders === updatedOrders.length
            ? new Date().toISOString()
            : activeExecution.completedAt
      };

      await savePortfolio(workingPortfolio);
      await userSetItem("availableCash", String(workingCash));
      await userSetItem("statementUploaded", "true");
      await userSetItem("simulatedTrades", JSON.stringify(trades));
      await saveBasketExecution(updatedExecution);
      await buildSyncStatus();

      setPortfolio(workingPortfolio);
      setCash(workingCash);
      setActiveExecution(updatedExecution);
      setConfirmedTrade(null);

      Alert.alert(
        "Basket Complete",
        `${pendingOrders.length} basket orders executed successfully.`
      );
    } catch (error) {
      Alert.alert("Basket Execution Failed", error.message);
    }
  }

  const basketRemaining =
    activeExecution?.orders?.filter((order) => order.status !== "FILLED")
      .length || 0;

  const normalizedExecutionOrders =
    activeExecution?.orders?.map(normalizeBasketOrder) || [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Trade</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Buy or sell securities using your available cash and portfolio holdings.
      </Text>

      {activeExecution ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Basket Execution</Text>

          <Text style={styles.body}>
            {activeExecution.source} • {activeExecution.status}
          </Text>

          <Text style={styles.body}>Remaining orders: {basketRemaining}</Text>

          {normalizedExecutionOrders.slice(0, 5).map((order) => (
            <View key={order.id} style={styles.basketMiniRow}>
              <View>
                <Text style={styles.basketSymbol}>{order.symbol}</Text>
                <Text style={styles.small}>
                  {order.side} • Qty {order.quantity} • KES{" "}
                  {money(order.amount || order.gross)}
                </Text>
              </View>

              <Text style={order.status === "FILLED" ? styles.greenText : styles.cyanText}>
                {order.status}
              </Text>
            </View>
          ))}

          {basketRemaining > 1 ? (
            <Pressable style={styles.primary} onPress={executeEntireBasket}>
              <Text style={styles.primaryText}>
                Buy All Basket Orders ({basketRemaining})
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={styles.secondary}
            onPress={() => router.push("/basket-execution")}
          >
            <Text style={styles.secondaryText}>Review Basket Execution</Text>
          </Pressable>
        </View>
      ) : null}

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
              <Text
                style={side === item ? styles.sideTextActive : styles.sideText}
              >
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
        <Info
          label="Regulatory Fee"
          value={`KES ${money(estimate.regulatoryFee)}`}
        />
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

          {basketRemaining > 0 ? (
            <Text style={styles.body}>
              Next basket order has been loaded into the ticket.
            </Text>
          ) : (
            <Text style={styles.body}>
              Portfolio and cash have been updated for Coach G monitoring.
            </Text>
          )}

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
        onPress={() => router.replace("/basket-execution")}
      >
        <Text style={styles.backText}>Back to Basket Execution</Text>
      </Pressable>
    </ScrollView>
  );
}

function buildEstimate({ side, quantity, price, cash }) {
  const qty = Number(quantity || 0);
  const tradePrice = Number(price || 0);
  const gross = qty * tradePrice;

  const brokerFee = gross * 0.012;
  const regulatoryFee = gross * 0.002;
  const totalFees = brokerFee + regulatoryFee;

  const totalCost =
    side === "BUY" ? gross + totalFees : Math.max(gross - totalFees, 0);

  const remainingCash =
    side === "BUY" ? Number(cash || 0) - totalCost : Number(cash || 0) + totalCost;

  return {
    qty,
    price: tradePrice,
    gross,
    brokerFee,
    regulatoryFee,
    totalFees,
    totalCost,
    remainingCash
  };
}

function buildTrade({
  stock,
  tradeSide,
  estimate,
  cashBefore,
  cashAfter,
  source
}) {
  return {
    id: `TRD-${Date.now()}-${stock.symbol}`,
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    side: tradeSide,
    quantity: estimate.qty,
    price: estimate.price,
    gross: estimate.gross,
    brokerFee: estimate.brokerFee,
    regulatoryFee: estimate.regulatoryFee,
    totalFees: estimate.totalFees,
    totalCost: estimate.totalCost,
    cashBefore,
    cashAfter,
    tradedAt: new Date().toISOString(),
    status: "SIMULATED_EXECUTED",
    orderType: "MARKET",
    settlementStatus: "SETTLED",
    source
  };
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
  basketMiniRow: {
    marginTop: 10,
    paddingVertical: 10,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  basketSymbol: {
    color: "white",
    fontWeight: "900"
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
  warningTitle: { color: "#fca5a5", fontWeight: "900" },
  warningText: { color: "#cbd5e1", marginTop: 6, lineHeight: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
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
  green: { color: "#86efac" },
  red: { color: "#fca5a5" },
  greenText: { color: "#86efac", fontWeight: "900" },
  cyanText: { color: "#67e8f9", fontWeight: "900" }
});