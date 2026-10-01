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
import useMarketData from "../src/services/markets/useMarketData";

import {
  loadInvestorContext
} from "../src/features/investor/investorContextStore";
import {
  userGetItem,
  userSetItem
} from "../src/auth/userStorage";
import {
  createBasketExecution,
  loadBasketExecution
} from "../src/trade/basketExecutionStore";
import { isActiveOrder } from "../src/trade/orderLifecycle";
import { saveTradeBasket } from "../src/trade/tradeBasketStore";

export default function FirstTrade() {
  const marketRuntime = useMarketData();
  const marketRows = Array.isArray(marketRuntime?.rows)
    ? marketRuntime.rows
    : [];

  const quoteBySymbol = useMemo(
    () =>
      new Map(
        marketRows
          .filter((row) => row?.symbol)
          .map((row) => [
            String(row.symbol).trim().toUpperCase(),
            row
          ])
      ),
    [marketRows]
  );

  const liveStocks = useMemo(
    () =>
      marketRows
        .filter((row) => row?.symbol)
        .map((row) => {
          const resolvedPrice = Number(
            row?.price ?? row?.lastPrice ?? row?.currentPrice ?? NaN
          );

          return {
            ...row,
            symbol: String(row.symbol).trim().toUpperCase(),
            name: row?.name || row?.companyName || row?.symbol,
            sector: row?.sector || "NSE",
            reason: row?.reason || "NSE listed security.",
            price:
              Number.isFinite(resolvedPrice) && resolvedPrice > 0
                ? resolvedPrice
                : null,
            priceSource:
              row?.source ||
              row?.provider ||
              row?.priceSource ||
              marketRuntime?.provider ||
              null,
            priceAsOf:
              row?.asOf ||
              row?.marketDate ||
              row?.updatedAt ||
              row?.timestamp ||
              marketRuntime?.lastUpdated ||
              null
          };
        }),
    [
      marketRows,
      marketRuntime?.provider,
      marketRuntime?.lastUpdated
    ]
  );

  const [portfolio, setPortfolio] = useState([]);
  const [cash, setCash] = useState(0);
  const [selectedStock, setSelectedStock] = useState(null);
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("1");
  const [limitPrice, setLimitPrice] = useState("");
  const [confirmedTrade, setConfirmedTrade] = useState(null);
  const [securityDropdownOpen, setSecurityDropdownOpen] = useState(false);
  const [securityQuery, setSecurityQuery] = useState("");

  useEffect(() => {
    load();
  }, []);

  const heldSymbols = useMemo(
    () =>
      new Set(
        portfolio
          .filter((holding) => Number(holding?.quantity || 0) > 0)
          .map((holding) => String(holding?.symbol || "").trim().toUpperCase())
          .filter(Boolean)
      ),
    [portfolio]
  );

  const selectableStocks = useMemo(
    () =>
      side === "SELL"
        ? liveStocks.filter((stock) => heldSymbols.has(stock.symbol))
        : liveStocks,
    [side, liveStocks, heldSymbols]
  );

  useEffect(() => {
    if (!selectableStocks.length) {
      setSelectedStock(null);
      setLimitPrice("");
      return;
    }

    const currentSymbol = String(selectedStock?.symbol || "")
      .trim()
      .toUpperCase();

    if (
      currentSymbol &&
      selectableStocks.some((stock) => stock.symbol === currentSymbol)
    ) {
      return;
    }

    setSelectedStock(null);
    setLimitPrice("");
    setConfirmedTrade(null);
    setSecurityDropdownOpen(false);
    setSecurityQuery("");
  }, [side, selectableStocks, selectedStock?.symbol]);

  useEffect(() => {
    if (!selectedStock?.symbol) {
      return;
    }

    const resolved = liveStocks.find(
      (stock) => stock.symbol === selectedStock.symbol
    );

    if (!resolved) {
      return;
    }

    const resolvedPrice = Number(resolved.price);

    setSelectedStock((current) => {
      const currentPrice = Number(current?.price);

      if (
        current?.symbol === resolved.symbol &&
        currentPrice === resolvedPrice &&
        current?.priceSource === resolved.priceSource &&
        current?.priceAsOf === resolved.priceAsOf
      ) {
        return current;
      }

      return {
        ...current,
        ...resolved
      };
    });

    if (Number.isFinite(resolvedPrice) && resolvedPrice > 0) {
      setLimitPrice((current) => {
        const currentPrice = Number(current);

        return Number.isFinite(currentPrice) && currentPrice > 0
          ? current
          : String(resolvedPrice);
      });
    }
  }, [marketRuntime?.rows, selectedStock?.symbol]);

  async function load() {
    const context = await loadInvestorContext();
    const practice = context?.practicePortfolio || {};

    setPortfolio(Array.isArray(practice?.holdings) ? practice.holdings : []);
    setCash(Number(practice?.availableCash || 0));
  }

  const filteredSelectableStocks = useMemo(() => {
    const query = String(securityQuery || "").trim().toUpperCase();

    if (!query) {
      return selectableStocks;
    }

    return selectableStocks.filter((stock) => {
      const symbol = String(stock?.symbol || "").toUpperCase();
      const name = String(stock?.name || "").toUpperCase();
      const sector = String(stock?.sector || "").toUpperCase();

      return (
        symbol.includes(query) ||
        name.includes(query) ||
        sector.includes(query)
      );
    });
  }, [selectableStocks, securityQuery]);

  function selectStock(stock) {
    setSelectedStock(stock);

    const resolvedPrice = Number(stock?.price);

    setLimitPrice(
      Number.isFinite(resolvedPrice) && resolvedPrice > 0
        ? String(resolvedPrice)
        : ""
    );

    setConfirmedTrade(null);
    setSecurityDropdownOpen(false);
    setSecurityQuery("");
  }

  const selectedMarketQuote = selectedStock?.symbol
    ? quoteBySymbol.get(String(selectedStock.symbol).trim().toUpperCase()) ||
      liveStocks.find((stock) => stock.symbol === selectedStock.symbol)
    : null;

  const verifiedMarketPrice = Number(selectedMarketQuote?.price);
  const hasVerifiedMarketPrice =
    Number.isFinite(verifiedMarketPrice) && verifiedMarketPrice > 0;

  const estimate = useMemo(() => {
    const qty = Number(quantity || 0);
    const price = Number(limitPrice || 0);
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
    if (!selectedStock?.symbol) {
      Alert.alert(
        "Security Required",
        side === "SELL"
          ? "Select one of your owned Practice positions."
          : "Select a security before confirming the simulated trade."
      );
      return;
    }

    if (!hasVerifiedMarketPrice) {
      Alert.alert(
        "Verified Price Unavailable",
        `A verified market price is not available for ${selectedStock?.symbol || "the selected security"}. Simulation is disabled until market evidence is available.`
      );
      return;
    }

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

    /*
     * PC-032G8D7D2B9
     *
     * First Trade is an order-entry experience only.
     *
     * It must not mutate Practice holdings, Practice cash,
     * simulated trade history, or manufacture a completed fill.
     *
     * Canonical ownership:
     *
     * First Trade
     *   -> saveTradeBasket()
     *   -> createBasketExecution()
     *   -> REVIEW
     *   -> Orders Review
     *   -> Practice funding acceptance
     *   -> QUEUED
     *   -> canonical Practice orchestrator
     *   -> BROKER_RECEIVED
     *   -> canonical Practice settlement
     *   -> FILLED
     */
    const existingExecution =
      await loadBasketExecution();

    const activeOrders =
      existingExecution?.orders?.filter(
        (order) => isActiveOrder(order?.status)
      ) || [];

    if (activeOrders.length > 0) {
      Alert.alert(
        "Active Orders Already Exist",
        "Review or complete the current Practice order execution before creating another First Trade.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Open Orders Review",
            onPress: () =>
              router.push("/orders-review")
          }
        ]
      );

      return;
    }

    await saveTradeBasket(
      [
        {
          symbol: selectedStock.symbol,
          name:
            selectedStock.name ||
            selectedStock.symbol,
          sector:
            selectedStock.sector ||
            "Unknown",
          side,
          quantity: estimate.qty,
          price: estimate.price,
          amount: estimate.totalCost,
          reason: "Practice First Trade"
        }
      ],
      "FIRST_TRADE_PRACTICE",
      {
        executionMode: "PRACTICE",
        brokerId: "GATECEP_PRACTICE"
      }
    );

    const nextExecution =
      await createBasketExecution({
        forceNew: true
      });

    if (!nextExecution?.orders?.length) {
      throw new Error(
        "PRACTICE_EXECUTION_CREATION_FAILED"
      );
    }

    setConfirmedTrade(null);

    router.push("/orders-review");
    return;
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
        <Metric
          label="Selected Stock"
          value={selectedStock?.symbol || "None"}
        />
        <Metric label="Side" value={side} />
        <Metric label="Portfolio Positions" value={String(portfolio.length)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Choose Security</Text>

        {selectableStocks.length === 0 ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>
              {side === "SELL"
                ? "No Practice Holdings Available"
                : "Security Universe Unavailable"}
            </Text>
            <Text style={styles.warningText}>
              {side === "SELL"
                ? "There are no owned Practice positions available to sell."
                : marketRuntime?.loading
                ? "Loading the canonical NSE security universe…"
                : "GateCEP could not load the canonical NSE security universe."}
            </Text>
          </View>
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select NSE security"
              style={[
                styles.securityDropdown,
                securityDropdownOpen && styles.securityDropdownOpen
              ]}
              onPress={() =>
                setSecurityDropdownOpen((current) => !current)
              }
            >
              <View style={styles.securityDropdownValue}>
                <Text
                  style={[
                    styles.securityDropdownSymbol,
                    !selectedStock && styles.securityDropdownPlaceholder
                  ]}
                >
                  {selectedStock
                    ? `${selectedStock.symbol} — ${selectedStock.name}`
                    : side === "SELL"
                    ? "Select Practice holding"
                    : "Select NSE security"}
                </Text>

                {selectedStock ? (
                  <Text style={styles.securityDropdownMeta}>
                    {selectedStock.sector || "NSE listed security"}
                    {" • "}
                    {Number.isFinite(Number(selectedStock.price)) &&
                    Number(selectedStock.price) > 0
                      ? `KES ${money(selectedStock.price)}`
                      : "Price unavailable"}
                  </Text>
                ) : null}
              </View>

              <Text style={styles.securityDropdownArrow}>
                {securityDropdownOpen ? "▲" : "▼"}
              </Text>
            </Pressable>

            {securityDropdownOpen ? (
              <View style={styles.securityDropdownPanel}>
                <TextInput
                  value={securityQuery}
                  onChangeText={setSecurityQuery}
                  placeholder="Search symbol, company, or sector"
                  placeholderTextColor="#64748b"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={styles.securitySearchInput}
                />

                <ScrollView
                  style={styles.securityDropdownList}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredSelectableStocks.length ? (
                    filteredSelectableStocks.map((stock) => (
                      <Pressable
                        key={stock.symbol}
                        style={[
                          styles.securityDropdownItem,
                          selectedStock?.symbol === stock.symbol &&
                            styles.stockActive
                        ]}
                        onPress={() => selectStock(stock)}
                      >
                        <View style={styles.securityDropdownItemBody}>
                          <Text style={styles.symbol}>
                            {stock.symbol}
                          </Text>
                          <Text style={styles.small}>
                            {stock.name} • {stock.sector}
                          </Text>
                        </View>

                        <Text style={styles.price}>
                          {Number.isFinite(Number(stock.price)) &&
                          Number(stock.price) > 0
                            ? `KES ${money(stock.price)}`
                            : marketRuntime?.loading
                            ? "Loading…"
                            : "Unavailable"}
                        </Text>
                      </Pressable>
                    ))
                  ) : (
                    <View style={styles.securityNoResults}>
                      <Text style={styles.warningText}>
                        No security matches "{securityQuery}".
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            ) : null}
          </>
        )}
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

        {!hasVerifiedMarketPrice && (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Verified Price Unavailable</Text>
            <Text style={styles.warningText}>
              GateCEP does not have verified market evidence for{" "}
              {selectedStock?.symbol || "the selected security"}. Simulated execution is disabled until a
              verified price is available.
            </Text>
          </View>
        )}

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
          (!hasVerifiedMarketPrice ||
            (side === "BUY" && estimate.remainingCash < 0)) &&
            styles.disabledButton
        ]}
        disabled={
          !hasVerifiedMarketPrice ||
          (side === "BUY" && estimate.remainingCash < 0)
        }
        accessibilityState={{
          disabled:
            !hasVerifiedMarketPrice ||
            (side === "BUY" && estimate.remainingCash < 0)
        }}
        onPress={confirmTrade}
      >
        <Text style={styles.primaryText}>
          {!hasVerifiedMarketPrice
            ? "Verified Price Unavailable"
            : side === "BUY" && estimate.remainingCash < 0
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

// PC-030M20AV3AQ — Final Responsive UAT Closure: First Trade calibrated for compact and desktop widths
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 22, paddingTop: 70, paddingBottom: 128, width: "100%", maxWidth: 960, alignSelf: "center" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
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
    minWidth: 140,
    flexGrow: 1,
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
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between"
  },
  securityDropdown: {
    marginTop: 14,
    minHeight: 64,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  securityDropdownOpen: {
    borderColor: "#9333ea"
  },
  securityDropdownValue: {
    flex: 1,
    minWidth: 0
  },
  securityDropdownSymbol: {
    color: "white",
    fontWeight: "900",
    fontSize: 15
  },
  securityDropdownPlaceholder: {
    color: "#94a3b8"
  },
  securityDropdownMeta: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 5
  },
  securityDropdownArrow: {
    color: "#67e8f9",
    fontWeight: "900",
    marginLeft: 12
  },
  securityDropdownPanel: {
    marginTop: 8,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 10
  },
  securitySearchInput: {
    backgroundColor: "#0f172a",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    color: "white",
    marginBottom: 8
  },
  securityDropdownList: {
    maxHeight: 320
  },
  securityDropdownItem: {
    minHeight: 62,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  securityDropdownItemBody: {
    flex: 1,
    minWidth: 0
  },
  securityNoResults: {
    paddingVertical: 18,
    paddingHorizontal: 10
  },
  stockActive: {
    borderColor: "#9333ea",
    backgroundColor: "rgba(147,51,234,.14)"
  },
  symbol: { color: "white", fontWeight: "900", fontSize: 17 },
  small: { color: "#94a3b8", marginTop: 4 },
  reason: { color: "#cbd5e1", marginTop: 6, lineHeight: 19, fontSize: 12 },
  price: { color: "#86efac", fontWeight: "900", marginTop: 2 },
  sideRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
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
