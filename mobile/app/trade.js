import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  useWindowDimensions
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import useMarketData from "../src/services/markets/useMarketData";
import { validateOrder } from "../src/utils/orderValidator";
import { userGetItem, userSetItem } from "../src/auth/userStorage";
import { savePracticePortfolio } from "../src/features/investor/investorContextStore";
import {
  createBasketExecution,
  loadBasketExecution,
  markExecutionOrderFilled
} from "../src/trade/basketExecutionStore";
import { isActiveOrder } from "../src/trade/orderLifecycle";
import {
  preflightCanonicalPracticeExecutionOrders
} from "../src/services/trade/practiceExecutionAccountingService";
import {
  analyzeAverageCostSale,
  analyzeWeightedAverageBuy
} from "../src/features/trading/weightedAverageBuyGuardService";
import { buildHistoricalSecurityLotLedger } from "../src/features/trading/historicalSecurityLotLedgerService";
import { loadUnifiedPortfolioRuntime } from "../src/portfolio/unifiedPortfolioApi";
import { addBrokerActionPlanOrder } from "../src/services/trade/brokerActionPlanStore";
import { saveTradeBasket } from "../src/trade/tradeBasketStore";
import { loadBrokerLotHistoryEvidence } from "../src/features/trading/brokerLotHistoryEvidenceService";
import { buildProjectedImpactReview } from "../src/features/trading/coachGProjectedImpactService";
import { loadRealCurrentInvestorWealthJourney } from "../src/features/wealth-journey/realWealthJourneyRuntime";
import { buildGoalRiskStressImpact, extractVerifiedGoalEvidence } from "../src/features/trading/coachGGoalRiskStressImpactService";
import { canonicalSecuritySymbol } from "../src/features/trading/securityIdentityService";

import { deriveApproximateScenarioQuantity } from "../src/features/trading/decisionAmountQuantityService";
import { InvestorTopChromeHeader } from "../src/components/mobile/MobileUI";
import { buildVerifiedDepthView } from "../src/components/markets/MarketDepthModal";
const PRACTICE_FEE_POLICY = {
  commissionRatePct: 1.2,
  otherChargesRatePct: 0.2,
  minimumCommission: 0,
  fixedCharges: 0
};

const BROKER_EVIDENCED_FEE_POLICY = {
  commissionRatePct: 1.3,
  otherChargesRatePct: 0.34,
  minimumCommission: 0,
  fixedCharges: 0
};

export default function Trade() {
  const { width: tradeViewportWidth } = useWindowDimensions();

  const wideWeb =
    Platform.OS === "web" &&
    tradeViewportWidth >= 1100;

  const { symbol: requestedSymbol, mode, side: requestedSide /* PC-030M20AQ2 requestedSide */, decisionAmount: requestedDecisionAmount, decisionLab: decisionLabParam, proposedAmount: requestedProposedAmount, amount: requestedAmount } = useLocalSearchParams();

  // PC-030M20AT2A route-contract correction
  // PC-030M20AT2C buy-auto-quantity correction
  const firstRouteNumber = (...values) => {
    for (const value of values) {
      const raw = Array.isArray(value) ? value[0] : value;
      const parsed = Number(raw || 0);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return 0;
  };

  const decisionAmountParam = firstRouteNumber(
    requestedDecisionAmount,
    requestedProposedAmount,
    requestedAmount
  );
  const decisionLabHandoff =
    String(
      Array.isArray(decisionLabParam)
        ? decisionLabParam[0]
        : decisionLabParam || ""
    ) === "1";

  const averageCostMode = String(mode || "").toUpperCase() === "AVERAGE_COST";

  const market = useMarketData();
  const stocks = market.rows;

  const [portfolio, setPortfolio] = useState([]);
  const [realHoldings, setRealHoldings] = useState([]);
  const [cash, setCash] = useState(0);
  const [selectedStock, setSelectedStock] = useState({
    symbol: "",
    name: "",
    sector: "NSE",
    price: 0
  });
  const [side, setSide] = useState("BUY");

  React.useEffect(() => {
    const normalizedRequestedSide = String(requestedSide || "").toUpperCase();
    if (normalizedRequestedSide === "BUY" || normalizedRequestedSide === "SELL") {
      setSide(normalizedRequestedSide);
    }
  }, [requestedSide]);

  const [quantity, setQuantity] = useState("0");
  const [quantityManuallyEdited, setQuantityManuallyEdited] = useState(false);
  const [limitPrice, setLimitPrice] = useState("");
  const [confirmedTrade, setConfirmedTrade] = useState(null);
  const [activeExecution, setActiveExecution] = useState(null);
  const [reviewBlockedFeedback, setReviewBlockedFeedback] = useState(null);
  const [securityPickerOpen, setSecurityPickerOpen] = useState(false);
  const [realTransactions, setRealTransactions] = useState([]);
  const [saleCostMethod, setSaleCostMethod] = useState("FIFO");
  const [removedLotAveragePrice, setRemovedLotAveragePrice] = useState("");
  const [scenarioExtraCharges, setScenarioExtraCharges] = useState("0");
  const [projectedImpactOpen, setProjectedImpactOpen] = useState(false); // PC-030M20AR8 projected impact modal
  const [goalEvidence, setGoalEvidence] = useState({ available: false, reason: "NOT_LOADED" }); // PC-030M20AS
  const [stressLossPercent, setStressLossPercent] = useState(20); // PC-030M20AS deterministic stress

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!stocks.length) return;

    const target = canonicalSecuritySymbol(
      requestedSymbol || selectedStock?.symbol || ""
    );

    const currentMarketSecurity =
      stocks.find(
        (item) =>
          canonicalSecuritySymbol(item.symbol) === target
      ) || null;

    const historicalPracticeHolding =
      String(requestedSide || "").toUpperCase() === "SELL"
        ? portfolio.find(
            (item) =>
              canonicalSecuritySymbol(item.symbol) === target
          ) || null
        : null;

    const verified =
      currentMarketSecurity ||
      historicalPracticeHolding;

    /*
     * PC-032G4B1B — Intentional Security Selection
     *
     * A generic /trade entry does not imply an investor security decision.
     * Explicit route symbols, historical SELL evidence, basket-order
     * loading and manual picker selection remain authoritative.
     */

    if (!verified) return;

    const historicalReferencePrice =
      Number(
        verified.marketPrice ||
          verified.price ||
          verified.averagePrice ||
          verified.averageCost ||
          0
      );

    const selectedPrice =
      currentMarketSecurity
        ? Number(currentMarketSecurity.price || 0)
        : historicalReferencePrice;

    setSelectedStock({
      ...verified,
      providerSymbol:
        verified.providerSymbol ||
        (
          canonicalSecuritySymbol(verified.symbol) !==
          String(verified.symbol || "").toUpperCase()
            ? verified.symbol
            : undefined
        ),
      symbol: canonicalSecuritySymbol(verified.symbol),
      price: selectedPrice,
      historicalPracticeHolding:
        Boolean(
          historicalPracticeHolding &&
          !currentMarketSecurity
        ),
      currentMarketQuoteAvailable:
        Boolean(currentMarketSecurity)
    });

    if (selectedPrice > 0) {
      setLimitPrice(String(selectedPrice));
    }

    setConfirmedTrade(null);
  }, [
    stocks,
    requestedSymbol,
    requestedSide,
    portfolio
  ]);



  function executionModeOf(execution) {
    return String(
      execution?.executionMode ||
        execution?.orders?.[0]?.executionMode ||
        "PRACTICE"
    ).toUpperCase() === "REAL"
      ? "REAL"
      : "PRACTICE";
  }

  function isRealExecution(execution) {
    return executionModeOf(execution) === "REAL";
  }

  async function load() {
    const practiceRaw = await userGetItem("practicePortfolio");
    const practice = practiceRaw ? JSON.parse(practiceRaw) : {};

    const [execution, realPortfolio, lotHistory, wealthJourney] = await Promise.all([
      loadBasketExecution(),
      loadUnifiedPortfolioRuntime({ broker: "ALL" }).catch(() => null),
      loadBrokerLotHistoryEvidence().catch(() => ({ records: [] })),
      loadRealCurrentInvestorWealthJourney().catch(() => null)
    ]);

    setPortfolio(Array.isArray(practice?.holdings) ? practice.holdings : []);
    setCash(Number(practice?.availableCash || 0));
    setRealHoldings(
      Array.isArray(realPortfolio?.holdings) ? realPortfolio.holdings : []
    );
    setRealTransactions(
      Array.isArray(lotHistory?.records) ? lotHistory.records : []
    );
    setGoalEvidence(extractVerifiedGoalEvidence(wealthJourney || {}));

    if (
      !averageCostMode &&
      execution?.orders?.length &&
      !isRealExecution(execution)
    ) {
      setActiveExecution(execution);

      const nextOrder =
        execution.orders.find(
          (order) =>
            [
              "ROUTED",
              "BROKER_RECEIVED",
              "PARTIAL_FILL"
            ].includes(
              String(order?.status || "").toUpperCase()
            )
        ) ||
        null;

      loadOrderIntoTicket(nextOrder);
    } else if (
      !averageCostMode &&
      execution?.orders?.length &&
      isRealExecution(execution)
    ) {
      // PC-031A20:
      // REAL OMS executions belong to Orders Review / Queue Manager /
      // verified broker-evidence recovery. They must never become
      // active Practice simulator baskets.
      setActiveExecution(null);
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

    const normalizedSymbol = canonicalSecuritySymbol(normalized.symbol);
    const stock =
      stocks.find(
        (item) => canonicalSecuritySymbol(item.symbol) === normalizedSymbol
      ) || {
        symbol: normalizedSymbol,
        name: normalized.name || normalizedSymbol,
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
    const canonical = canonicalSecuritySymbol(stock?.symbol);
    setSelectedStock({
      ...stock,
      providerSymbol:
        stock?.providerSymbol ||
        (canonical !== String(stock?.symbol || "").toUpperCase() ? stock.symbol : undefined),
      symbol: canonical
    });
    setLimitPrice(String(stock.price));
    setConfirmedTrade(null);
    setSecurityPickerOpen(false);
  }

  const activeFeePolicy = useMemo(
    () =>
      averageCostMode
        ? {
            ...BROKER_EVIDENCED_FEE_POLICY,
            fixedCharges: Number(scenarioExtraCharges || 0)
          }
        : PRACTICE_FEE_POLICY,
    [averageCostMode, scenarioExtraCharges]
  );

  const verifiedMarketDepth = useMemo(
    () => buildVerifiedDepthView(selectedStock),
    [selectedStock]
  );

  const estimate = useMemo(() => {
    return buildEstimate({
      side,
      quantity: Number(quantity || 0),
      price: Number(limitPrice || selectedStock.price || 0),
      cash,
      feePolicy: activeFeePolicy
    });
  }, [
    quantity,
    limitPrice,
    selectedStock,
    side,
    cash,
    activeFeePolicy
  ]);

  const practiceHolding = useMemo(
    () =>
      portfolio.find(
        (item) =>
          canonicalSecuritySymbol(item.symbol) ===
          canonicalSecuritySymbol(selectedStock.symbol)
      ) || null,
    [portfolio, selectedStock.symbol]
  );

  const realHolding = useMemo(
    () =>
      realHoldings.find(
        (item) =>
          canonicalSecuritySymbol(item.symbol) ===
          canonicalSecuritySymbol(selectedStock.symbol)
      ) || null,
    [realHoldings, selectedStock.symbol]
  );

  const existingHolding =
    averageCostMode ? realHolding : practiceHolding;

  /*
   * PC-031B4M7C5D7I6E4D6F2
   *
   * Presentation-only Practice SELL validation.
   *
   * The canonical Practice accounting service remains the
   * final authority for settlement and independently rejects
   * overselling with PRACTICE_SELL_QUANTITY_EXCEEDED.
   */
  const practiceHeldQuantity =
    Number(
      practiceHolding?.quantity ||
      practiceHolding?.shares ||
      0
    );

  const practiceSellQuantityExceeded =
    !averageCostMode &&
    side === "SELL" &&
    Number(estimate.qty || 0) >
      practiceHeldQuantity;

  const practiceSellHoldingMissing =
    !averageCostMode &&
    side === "SELL" &&
    practiceHeldQuantity <= 0;

  const practiceSellBlocked =
    practiceSellHoldingMissing ||
    practiceSellQuantityExceeded;

  const hasSelectedSecurity = Boolean(
    canonicalSecuritySymbol(selectedStock.symbol || "")
  );

  const holdingSource = !hasSelectedSecurity
    ? "—"
    : existingHolding
      ? averageCostMode
        ? "REAL READ-ONLY"
        : "PRACTICE"
      : "NOT HELD";

  const currentPositionQuantity = existingHolding
    ? Number(
        existingHolding.quantity ??
        existingHolding.shares ??
        0
      )
    : null;

  const currentPositionAverage = existingHolding
    ? Number(
        existingHolding.averagePrice ??
        existingHolding.averageCost ??
        0
      )
    : null;

  const currentPositionValue =
    currentPositionQuantity !== null &&
    Number(selectedStock?.price || 0) > 0
      ? currentPositionQuantity *
        Number(selectedStock.price)
      : null;

  // PC-030M20AT2B initialization-order hotfix
  // Must stay after existingHolding is initialized.
  useEffect(() => {
    if (!decisionLabHandoff) return;
    if (!(decisionAmountParam > 0)) return;
    if (quantityManuallyEdited) return;

    const currentScenarioPrice = Number(
      selectedStock?.price ||
      selectedStock?.lastPrice ||
      selectedStock?.currentPrice ||
      0
    );

    if (!(currentScenarioPrice > 0)) return;

    const derived = deriveApproximateScenarioQuantity({
      side,
      decisionAmount: decisionAmountParam,
      currentPrice: currentScenarioPrice,
      availableQuantity:
        side === "SELL"
          ? Number(
              existingHolding?.quantity ||
              existingHolding?.shares ||
              0
            )
          : null,
      percentChargeRate:
        side === "BUY"
          ? (Number(BROKER_EVIDENCED_FEE_POLICY.commissionRatePct || 0) +
             Number(BROKER_EVIDENCED_FEE_POLICY.otherChargesRatePct || 0)) / 100
          : 0,
      fixedCharges: Number(scenarioExtraCharges || 0),
      existingQuantityText: ""
    });

    if (derived.available && derived.quantity > 0) {
      setQuantity(String(derived.quantity));
      setConfirmedTrade(null);
    }
  }, [
    decisionLabHandoff,
    decisionAmountParam,
    side,
    selectedStock?.symbol,
    selectedStock?.price,
    existingHolding?.quantity,
    existingHolding?.shares,
    scenarioExtraCharges,
    quantityManuallyEdited
  ]);

  const fifoEvidence = useMemo(
    () =>
      existingHolding
        ? buildHistoricalSecurityLotLedger({
            transactions: realTransactions,
            symbol: selectedStock.symbol,
            currentQuantity: existingHolding.quantity,
            currentAveragePrice:
              existingHolding.averagePrice ?? existingHolding.averageCost,
            costBasisMethod: "FIFO"
          })
        : null,
    [realTransactions, selectedStock.symbol, existingHolding]
  );

  useEffect(() => {
    if (!fifoEvidence || selectedStock?.symbol !== "JUB") return;

    const acquisitions = Array.isArray(fifoEvidence?.acquisitions)
      ? fifoEvidence.acquisitions
      : [];

    const historicalSales = Array.isArray(fifoEvidence?.historicalSales)
      ? fifoEvidence.historicalSales
      : [];

    const issues = Array.isArray(fifoEvidence?.issues)
      ? fifoEvidence.issues
      : [];

    console.log("M20AG JUB RECONCILIATION", {
      brokerQty: Number(existingHolding?.quantity || 0),
      ledgerQty: Number(fifoEvidence?.reconstructedQuantity || 0),
      difference:
        Number(fifoEvidence?.reconstructedQuantity || 0) -
        Number(existingHolding?.quantity || 0),
      status: fifoEvidence?.status || "UNKNOWN",
      available: fifoEvidence?.available === true,
      issues,
      buyCount: acquisitions.length,
      sellCount: historicalSales.length,
      buys: acquisitions.map((lot) => ({
        date: lot?.acquisitionDate || null,
        ref: lot?.brokerReference || null,
        originalQty: Number(lot?.originalQuantity || 0),
        consumedQty: Number(lot?.historicallyConsumedQuantity || 0),
        remainingQty: Number(lot?.remainingQuantity || 0),
        status: lot?.status || null
      })),
      sells: historicalSales.map((sale) => ({
        date: sale?.saleDate || null,
        ref: sale?.saleBrokerReference || null,
        qty: Number(sale?.saleQuantity || 0),
        consumedLots: Array.isArray(sale?.consumedLots)
          ? sale.consumedLots
          : []
      }))
    });
  }, [
    fifoEvidence,
    selectedStock?.symbol,
    existingHolding?.quantity
  ]);

  const averageGuard = useMemo(() => {
    if (!existingHolding) return null;

    const input = {
      holding: existingHolding,
      proposedQuantity: Number(quantity || 0),
      proposedPrice: Number(limitPrice || selectedStock.price || 0),
      feePolicy: activeFeePolicy,
      estimatedCharges: estimate.totalFees
    };

    return side === "SELL"
      ? analyzeAverageCostSale({
          ...input,
          costBasisMethod: saleCostMethod,
          acquisitionLots:
            fifoEvidence?.available && Array.isArray(fifoEvidence?.openLots)
              ? fifoEvidence.openLots
              : [],
          removedLotAveragePrice
        })
      : analyzeWeightedAverageBuy(input);
  }, [
    side,
    existingHolding,
    quantity,
    limitPrice,
    selectedStock.price,
    estimate.totalFees,
    saleCostMethod,
    fifoEvidence,
    removedLotAveragePrice,
    activeFeePolicy
  ]);


  const projectedImpact = useMemo(() =>
    buildProjectedImpactReview({
      holdings: averageCostMode ? realHoldings : portfolio,
      selectedStock,
      side,
      estimate,
      existingHolding,
      averageGuard,
      availableCash: cash
    }),
  [averageCostMode, realHoldings, portfolio, selectedStock, side, estimate, existingHolding, averageGuard, cash]);

  // PC-030M20AS goal+risk stress — scenario + verified goal evidence only.
  const goalRiskImpact = useMemo(() =>
    buildGoalRiskStressImpact({
      holdings: averageCostMode ? realHoldings : portfolio,
      projectedImpact,
      goalEvidence,
      stressLossPercent
    }),
  [averageCostMode, realHoldings, portfolio, projectedImpact, goalEvidence, stressLossPercent]);

  async function addToBrokerActionPlan() {
    if (!hasSelectedSecurity) {
      Alert.alert(
        "Select Security",
        "Choose a verified NSE security before continuing."
      );
      return;
    }

    if (!averageGuard?.available) {
      Alert.alert(
        "Scenario Incomplete",
        averageGuard?.message ||
          "Choose an existing holding and enter a valid quantity and limit price."
      );
      return;
    }

    await addBrokerActionPlanOrder({
      symbol: selectedStock.symbol,
      name: selectedStock.name,
      sector: selectedStock.sector,
      side,
      quantity: estimate.qty,
      price: estimate.price,
      amount: estimate.totalCost,
      estimatedCharges: estimate.totalFees,
      guardPrice:
        side === "SELL"
          ? averageGuard.minimumSalePrice
          : averageGuard.maximumBuyPrice,
      guardStatus: averageGuard.status,
      reason:
        side === "SELL"
          ? `${averageGuard.recommendation} ${averageGuard.accountingNote}`
          : averageGuard.recommendation,
      costBasisSource: holdingSource,
      costBasisMethod: averageGuard.costBasisMethod,
      soldCostPerShare: averageGuard.soldCostPerShare,
      projectedRemainingAverage: averageGuard.remainingAveragePrice,
      removedLots: averageGuard.removedLots || []
    });

    router.push({
      pathname: "/basket-execution",
      params: { mode: "BROKER_PLAN" }
    });
  }

  async function proceedRealOrderToReview() {
    if (!hasSelectedSecurity) {
      Alert.alert(
        "Select Security",
        "Choose a verified NSE security before continuing."
      );
      return;
    }

    setReviewBlockedFeedback(null);

    if (!averageCostMode) {
      Alert.alert(
        "REAL Decision Review Required",
        "Proceed to Trade from the REAL Average Cost / FIFO decision view."
      );
      return;
    }

    if (!averageGuard?.available) {
      Alert.alert(
        "Scenario Incomplete",
        averageGuard?.message ||
          "Choose an existing holding and enter a valid quantity and limit price."
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

    /*
     * PC-031B4M7C5D7F5H2
     *
     * Caller UX guard only.
     *
     * Use the canonical active-order status contract rather than relying
     * on an aggregate activeOrders field.
     *
     * This check runs before saveTradeBasket(); D7F5G remains the final
     * store-level authority against active execution replacement.
     */
    const existingExecution = await loadBasketExecution();
    const activeExistingOrders =
      existingExecution?.orders?.filter((order) =>
        isActiveOrder(order.status)
      ) || [];

    const hasActiveExecution =
      activeExistingOrders.length > 0;

    if (hasActiveExecution) {
      if (wideWeb) {
        setReviewBlockedFeedback({
          title: "Existing Order Review In Progress",
          message:
            `${activeExistingOrders.length} active order${
              activeExistingOrders.length === 1 ? "" : "s"
            } already ${
              activeExistingOrders.length === 1 ? "requires" : "require"
            } review or completion. Your ${side} ${selectedStock.symbol} order was not created.`,
          orderCount: activeExistingOrders.length
        });
      } else {
        Alert.alert(
          "Active Orders Already Exist",
          "Review or complete the current order execution before creating another REAL order.",
          [
            {
              text: "Cancel",
              style: "cancel"
            },
            {
              text: "Open Current Execution",
              onPress: () =>
                router.push("/basket-execution")
            }
          ]
        );
      }
      return;
    }

    const guardPrice =
      side === "SELL"
        ? averageGuard.minimumSalePrice
        : averageGuard.maximumBuyPrice;

    const decisionSupport = {
      advisoryOnly: true,
      source: "AVERAGE_COST_DECISION_SUPPORT",
      holdingSource,
      guardStatus: averageGuard.status || null,
      guardPrice: guardPrice ?? null,
      minimumSalePrice:
        side === "SELL" ? averageGuard.minimumSalePrice ?? null : null,
      maximumBuyPrice:
        side === "BUY" ? averageGuard.maximumBuyPrice ?? null : null,
      estimatedCharges: estimate.totalFees,
      estimatedGross: estimate.gross,
      estimatedTotalCost: estimate.totalCost,
      costBasisMethod: averageGuard.costBasisMethod || null,
      soldCostPerShare: averageGuard.soldCostPerShare ?? null,
      projectedRemainingQuantity:
        averageGuard.remainingQuantity ?? null,
      projectedRemainingAverage:
        averageGuard.remainingAveragePrice ?? null,
      projectedAveragePrice:
        averageGuard.projectedAveragePrice ?? null,
      projectedRealizedProfitLoss:
        averageGuard.estimatedRealizedProfitLoss ?? null,
      removedLots: Array.isArray(averageGuard.removedLots)
        ? averageGuard.removedLots
        : [],
      note:
        side === "SELL"
          ? averageGuard.accountingNote || averageGuard.recommendation || null
          : averageGuard.recommendation || null
    };

    await saveTradeBasket(
      [
        {
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          sector: selectedStock.sector,
          side,
          quantity: estimate.qty,
          price: estimate.price,
          amount: estimate.totalCost,
          reason:
            side === "SELL"
              ? `${averageGuard.recommendation || ""} ${averageGuard.accountingNote || ""}`.trim()
              : averageGuard.recommendation || "Coach G REAL decision review",
          decisionSupport
        }
      ],
      "COACH_G_REAL_DECISION",
      {
        executionMode: "REAL",
        brokerId: null,
        brokerAccountId: null
      }
    );

    const nextExecution = await createBasketExecution({ forceNew: true });

    if (!nextExecution?.orders?.length) {
      Alert.alert(
        "Order Review Unavailable",
        "GateCEP could not create the REAL order review record."
      );
      return;
    }

    router.push("/orders-review");
  }

  async function getBrokerProfile() {
    return {
      broker: "GATECEP_PRACTICE",
      nickname: "Practice Account",
      clientNumber: "PRACTICE",
      cdsNumber: "PRACTICE",
      defaultBroker: false,
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
        const newAveragePrice =
          newQty > 0 ? newCostValue / newQty : price;
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
            totalCost > 0
              ? ((gross - totalCost) / totalCost) * 100
              : 0,
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
        throw new Error(
          `You only hold ${existingQty} shares of ${stock.symbol}.`
        );
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
    const tradeRaw = await userGetItem("practiceSimulatedTrades");
    const trades = tradeRaw ? JSON.parse(tradeRaw) : [];

    trades.unshift(trade);

    await savePracticePortfolio({
      holdings: nextPortfolio,
      availableCash: nextCash,
      status: "ACTIVE",
      lastActivityType: "TRADE_SIMULATION"
    });

    await userSetItem(
      "practiceSimulatedTrades",
      JSON.stringify(trades)
    );
  }

  async function confirmTrade() {
    try {
      if (!hasSelectedSecurity) {
        Alert.alert(
          "Select Security",
          "Choose a verified NSE security before continuing."
        );
        return;
      }

      if (isRealExecution(activeExecution)) {
        Alert.alert(
          "Verified Broker Evidence Required",
          "A REAL execution cannot be completed in the Practice Trade simulator. Continue through Orders Review and verified broker execution evidence."
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
          `You need KES ${money(
            estimate.totalCost
          )} but only have KES ${money(cash)}.`
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
        Alert.alert(
          "Order Blocked",
          validation.errors.join("\n")
        );
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

      const executionOrder =
        findCurrentPracticeExecutionOrder();

      if (executionOrder) {
        /*
         * PC-031B4M7C4
         *
         * OMS-backed Practice orders have exactly one
         * accounting authority:
         *
         * markExecutionOrderFilled()
         *   -> settlePracticeExecutionOrder()
         *   -> canonical Practice Portfolio
         *
         * Do NOT call persistTrade() first or the same
         * economic fill would be applied twice.
         */
        await markBasketOrderFilled(
          trade,
          executionOrder
        );

        await reloadPracticeState();
      } else {
        /*
         * PC-031B4M7C5D7I6E4D6C
         *
         * A new Practice order must enter the persisted OMS
         * lifecycle before any economic mutation occurs.
         *
         * Historical holdings may be disposed through SELL,
         * but this does not make an unavailable security
         * eligible for a new BUY.
         *
         * saveTradeBasket()
         *   -> createBasketExecution()
         *   -> REVIEW
         *   -> Orders Review
         *   -> canonical Practice orchestrator
         *   -> markExecutionOrderFilled()
         *   -> canonical Practice settlement
         *
         * Do NOT call persistTrade() here.
         */
        if (
          side === "BUY" &&
          selectedStock?.historicalPracticeHolding === true &&
          selectedStock?.currentMarketQuoteAvailable !== true
        ) {
          const error = new Error(
            "PRACTICE_SECURITY_NOT_CURRENTLY_AVAILABLE"
          );
          error.code =
            "PRACTICE_SECURITY_NOT_CURRENTLY_AVAILABLE";
          throw error;
        }

        const existingExecution =
          await loadBasketExecution();

        const hasActiveExecution =
          existingExecution?.orders?.some(
            (order) => isActiveOrder(order?.status)
          ) === true;

        if (hasActiveExecution) {
          const error = new Error(
            "ACTIVE_EXECUTION_REPLACEMENT_FORBIDDEN"
          );
          error.code =
            "ACTIVE_EXECUTION_REPLACEMENT_FORBIDDEN";
          throw error;
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
              reason:
                side === "SELL" &&
                selectedStock
                  ?.historicalPracticeHolding
                  ? "Practice disposal of an existing historical holding"
                  : "Practice investor order"
            }
          ],
          "PRACTICE_TRADE",
          {
            executionMode: "PRACTICE",
            brokerId:
              "GATECEP_PRACTICE"
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

        setActiveExecution(nextExecution);
        setConfirmedTrade(null);

        router.push("/orders-review");
        return;
      }

      setConfirmedTrade(trade);

      Alert.alert(
        "Trade Complete",
        `${side} ${estimate.qty} ${selectedStock.symbol} simulated.`
      );
    } catch (error) {
      Alert.alert(
        "Trade Failed",
        error.message || "Trade could not be completed."
      );
    }
  }

  function findCurrentPracticeExecutionOrder() {
    if (!activeExecution?.orders?.length) {
      return null;
    }

    if (isRealExecution(activeExecution)) {
      return null;
    }

    return (
      activeExecution.orders.find(
        (order) =>
          String(order.symbol || "").toUpperCase() ===
            String(selectedStock.symbol || "").toUpperCase() &&
          [
            "ROUTED",
            "BROKER_RECEIVED",
            "PARTIAL_FILL"
          ].includes(
            String(order?.status || "").toUpperCase()
          )
      ) || null
    );
  }

  async function reloadPracticeState() {
    const practiceRaw =
      await userGetItem("practicePortfolio");

    const practice =
      practiceRaw ? JSON.parse(practiceRaw) : {};

    setPortfolio(
      Array.isArray(practice?.holdings)
        ? practice.holdings
        : []
    );

    setCash(
      Number(practice?.availableCash || 0)
    );
  }

  async function markBasketOrderFilled(
    trade,
    explicitOrder = null
  ) {
    if (!activeExecution?.orders?.length) return null;

    const currentOrder =
      explicitOrder ||
      findCurrentPracticeExecutionOrder();

    if (!currentOrder) return null;

    const updated = await markExecutionOrderFilled(
      currentOrder.id,
      {
        ...trade,
        source:
          trade?.source || "GATECEP_BROKER_PRACTICE"
      }
    );

    setActiveExecution(updated);

    const nextOrder = updated?.orders?.find(
      (order) =>
        [
          "ROUTED",
          "BROKER_RECEIVED",
          "PARTIAL_FILL"
        ].includes(
          String(order?.status || "").toUpperCase()
        )
    );

    if (nextOrder) {
      setTimeout(() => {
        loadOrderIntoTicket(nextOrder);
      }, 300);
    }
  }

  async function executeEntireBasket() {
    if (!activeExecution?.orders?.length) {
      Alert.alert(
        "No Basket",
        "No active basket execution found."
      );
      return;
    }

    if (isRealExecution(activeExecution)) {
      Alert.alert(
        "Verified Broker Evidence Required",
        "A REAL basket cannot be executed in the Practice Trade simulator. Route and reconcile REAL orders through the broker execution workflow."
      );
      return;
    }

    const pendingOrders = activeExecution.orders
      .filter(
        (order) =>
          [
            "ROUTED",
            "BROKER_RECEIVED",
            "PARTIAL_FILL"
          ].includes(
            String(order?.status || "").toUpperCase()
          )
      )
      .map(normalizeBasketOrder)
      .filter(
        (order) => order.quantity > 0 && order.price > 0
      );

    if (!pendingOrders.length) {
      Alert.alert(
        "Basket Complete",
        "There are no pending basket orders."
      );
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
      if (isRealExecution(activeExecution)) {
        const error = new Error(
          "REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION"
        );
        error.code =
          "REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION";
        throw error;
      }

      /*
       * PC-031B4M7C4
       *
       * Validate the complete Practice basket against one
       * canonical cash/holdings view before the first order
       * can settle.
       */
      await preflightCanonicalPracticeExecutionOrders(
        pendingOrders
      );

      let latestExecution = activeExecution;

      for (const order of pendingOrders) {
        latestExecution =
          await markExecutionOrderFilled(
            order.id,
            {
              symbol: order.symbol,
              side: order.side || "BUY",
              quantity: order.quantity,
              price: order.price,
              brokerId:
                order.brokerId ||
                "GATECEP_PRACTICE",
              brokerName:
                order.brokerName ||
                "GateCEP Broker",
              brokerOrderId:
                order.brokerOrderId || null,
              filledAt:
                new Date().toISOString(),
              source:
                "GATECEP_BROKER_PRACTICE"
            }
          );
      }

      setActiveExecution(latestExecution);
      await reloadPracticeState();
      setConfirmedTrade(null);

      Alert.alert(
        "Basket Complete",
        `${pendingOrders.length} basket orders executed successfully.`
      );
    } catch (error) {
      if (
        error?.code ===
        "INSUFFICIENT_PRACTICE_CASH"
      ) {
        Alert.alert(
          "Practice Funds Required",
          `This Practice basket needs KES ${
            Number(
              error?.requiredCash || 0
            ).toFixed(2)
          } for the next required settlement, but only KES ${
            Number(
              error?.availableCash || 0
            ).toFixed(2)
          } is available. Deposit Practice funds before executing this basket.`,
          [
            {
              text: "Cancel",
              style: "cancel"
            },
            {
              text: "Open Practice Funds",
              onPress: () =>
                router.push(
                  "/(tabs)/funds?source=PRACTICE"
                )
            }
          ]
        );
        return;
      }

      Alert.alert(
        "Basket Execution Failed",
        error.message ||
          "Practice basket could not be executed."
      );
    }
  }

  const basketRemaining =
    activeExecution?.orders?.filter(
      (order) =>
        [
          "ROUTED",
          "BROKER_RECEIVED",
          "PARTIAL_FILL"
        ].includes(
          String(order?.status || "").toUpperCase()
        )
    ).length || 0;

  const normalizedExecutionOrders =
    activeExecution?.orders?.map(normalizeBasketOrder) || [];

  const fifoOpenLots = Array.isArray(fifoEvidence?.openLots)
    ? fifoEvidence.openLots
    : [];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        wideWeb && styles.contentWideWeb
      ]}
    >
      <View style={styles.headerRow}>
        <InvestorTopChromeHeader
          reserveRight={false}
          style={{ flex: 1, minWidth: 0 }}
          testID="trade-lab-top-chrome"
        >
          <Text style={styles.title}>
            {wideWeb
              ? "Trading"
              : averageCostMode
              ? "Trade Lab — Average Cost Scenario"
              : "Practice Trade"}
          </Text>
        </InvestorTopChromeHeader>

        <Pressable
          style={styles.dashboardButton}
          onPress={() =>
            router.replace("/(tabs)/dashboard")
          }
        >
          <Text style={styles.dashboardButtonText}>
            Dashboard
          </Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        {averageCostMode
          ? "Test price, quantity and temporary cash without creating a trade or changing any saved portfolio record."
          : "Simulate decisions using Practice cash and holdings. Nothing here changes your REAL broker portfolio."}
      </Text>

      {wideWeb ? (
        <View style={styles.terminalContextBar}>
          <View style={styles.terminalContextPrimary}>
            <Text style={styles.terminalSectionEyebrow}>
              {averageCostMode ? "REAL DECISION PREVIEW" : "PRACTICE EXECUTION"}
            </Text>
            <Text style={styles.terminalContextSymbol}>
              {selectedStock.symbol || "Select a security"}
            </Text>
            <Text style={styles.small}>
              {selectedStock.name || "Choose a verified NSE security to begin"}
              {selectedStock.sector ? ` • ${selectedStock.sector}` : ""}
            </Text>
          </View>

          <View style={styles.terminalContextMetric}>
            <Text style={styles.metricLabel}>Market Price</Text>
            <Text style={styles.metricValue}>
              {selectedStock.price
                ? `KES ${money(selectedStock.price)}`
                : "Unavailable"}
            </Text>
          </View>

          <View style={styles.terminalContextMetric}>
            <Text style={styles.metricLabel}>Position Source</Text>
            <Text style={styles.metricValue}>{holdingSource}</Text>
          </View>

          <View style={styles.terminalContextMetric}>
            <Text style={styles.metricLabel}>
              {averageCostMode ? "Scenario Cash" : "Practice Cash"}
            </Text>
            <Text style={styles.metricValue}>KES {money(cash)}</Text>
          </View>
        </View>
      ) : null}

      {activeExecution ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Active Basket Execution
          </Text>

          <Text style={styles.body}>
            {activeExecution.source} •{" "}
            {activeExecution.status}
          </Text>

          <Text style={styles.body}>
            Remaining orders: {basketRemaining}
          </Text>

          {normalizedExecutionOrders
            .slice(0, 5)
            .map((order) => (
              <View
                key={order.id}
                style={styles.basketMiniRow}
              >
                <View>
                  <Text style={styles.basketSymbol}>
                    {order.symbol}
                  </Text>
                  <Text style={styles.small}>
                    {order.side} • Qty {order.quantity} • KES{" "}
                    {money(order.amount || order.gross)}
                  </Text>
                </View>

                <Text
                  style={
                    order.status === "FILLED"
                      ? styles.greenText
                      : styles.cyanText
                  }
                >
                  {order.status}
                </Text>
              </View>
            ))}

          {basketRemaining > 1 ? (
            <Pressable
              style={styles.primary}
              onPress={executeEntireBasket}
            >
              <Text style={styles.primaryText}>
                Buy All Basket Orders ({basketRemaining})
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={styles.secondary}
            onPress={() =>
              router.push("/basket-execution")
            }
          >
            <Text style={styles.secondaryText}>
              Review Basket Execution
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!wideWeb ? (
      <View style={styles.summaryCard}>
        {averageCostMode ? (
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>
              Scenario Cash (editable)
            </Text>
            <TextInput
              value={String(cash)}
              onChangeText={(value) =>
                setCash(value.replace(/[^0-9.]/g, ""))
              }
              keyboardType="numeric"
              style={styles.cashInput}
              accessibilityLabel="Editable scenario cash"
            />
            <Text style={styles.metricHint}>
              Temporary only; WAP works even at zero
            </Text>
          </View>
        ) : (
          <Metric
            label="Available Practice Cash"
            value={`KES ${money(cash)}`}
          />
        )}

        <Metric
          label="Selected Stock"
          value={
            selectedStock.symbol ||
            "Awaiting verified market"
          }
        />
        <Metric label="Side" value={side} />
        <Metric
          label="Cost Basis Source"
          value={holdingSource}
        />
      </View>
      ) : null}

      <View style={wideWeb ? styles.terminalGrid : null}>
        <View style={wideWeb ? styles.terminalMarketColumn : null}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {wideWeb ? "Security & Position" : "Choose Security"}
            </Text>

        {market.loading ? (
          <Text style={styles.small}>
            Loading verified NSE securities…
          </Text>
        ) : null}

        {!market.loading && !stocks.length ? (
          <Text style={styles.reason}>
            {market.error ||
              "Verified market prices are unavailable. Trading is disabled."}
          </Text>
        ) : null}

        <Pressable
          style={styles.securityDropdown}
          onPress={() =>
            setSecurityPickerOpen(true)
          }
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.symbol}>
              {selectedStock.symbol ||
                "Select a security"}
            </Text>
            <Text style={styles.small}>
              {selectedStock.name ||
                "Open the verified NSE list"}
              {selectedStock.sector
                ? ` • ${selectedStock.sector}`
                : ""}
            </Text>
          </View>

          <Text style={styles.dropdownValue}>
            {selectedStock.price
              ? `KES ${money(
                  selectedStock.price
                )}  ▾`
              : "▾"}
          </Text>
        </Pressable>

            {wideWeb ? (
              <View style={styles.terminalPositionEvidence}>
                <Text style={styles.terminalSectionEyebrow}>
                  CURRENT POSITION
                </Text>

                <View style={styles.terminalPositionRow}>
                  <Text style={styles.metricLabel}>Shares Owned</Text>
                  <Text style={styles.terminalPositionValue}>
                    {!hasSelectedSecurity
                      ? "—"
                      : currentPositionQuantity === null
                        ? "Not held"
                        : currentPositionQuantity.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.terminalPositionRow}>
                  <Text style={styles.metricLabel}>Weighted Average</Text>
                  <Text style={styles.terminalPositionValue}>
                    {!hasSelectedSecurity
                      ? "—"
                      : currentPositionAverage === null ||
                        !(currentPositionAverage > 0)
                        ? "N/A"
                        : `KES ${money(currentPositionAverage)}`}
                  </Text>
                </View>

                <View style={styles.terminalPositionRow}>
                  <Text style={styles.metricLabel}>Position Value</Text>
                  <Text style={styles.terminalPositionValue}>
                    {!hasSelectedSecurity
                      ? "—"
                      : currentPositionValue === null
                        ? "N/A"
                        : `KES ${money(currentPositionValue)}`}
                  </Text>
                </View>

                <View style={styles.terminalPositionRow}>
                  <Text style={styles.metricLabel}>Portfolio Weight</Text>
                  <Text style={styles.terminalPositionValue}>
                    {!hasSelectedSecurity
                      ? "—"
                      : projectedImpact?.available
                        ? `${projectedImpact.current.portfolioWeightPct.toFixed(2)}%`
                        : "N/A"}
                  </Text>
                </View>

                <View style={styles.terminalPositionRow}>
                  <Text style={styles.metricLabel}>
                    {hasSelectedSecurity && selectedStock?.sector
                      ? `${selectedStock.sector} Exposure`
                      : "Sector Exposure"}
                  </Text>
                  <Text style={styles.terminalPositionValue}>
                    {!hasSelectedSecurity
                      ? "—"
                      : projectedImpact?.available
                        ? `${projectedImpact.current.sectorExposurePct.toFixed(2)}%`
                        : "N/A"}
                  </Text>
                </View>

                <View style={styles.terminalPositionRow}>
                  <Text style={styles.metricLabel}>Evidence Source</Text>
                  <Text style={styles.terminalPositionValue}>
                    {holdingSource}
                  </Text>
                </View>

                {averageCostMode ? (
                  <View style={styles.terminalScenarioCash}>
                    <Text style={styles.metricLabel}>
                      Scenario Cash (editable)
                    </Text>
                    <TextInput
                      value={String(cash)}
                      onChangeText={(value) =>
                        setCash(value.replace(/[^0-9.]/g, ""))
                      }
                      keyboardType="numeric"
                      style={styles.cashInput}
                      accessibilityLabel="Editable scenario cash"
                    />
                    <Text style={styles.metricHint}>
                      Temporary scenario input — not verified broker buying power.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.terminalScenarioCash}>
                    <Text style={styles.metricLabel}>
                      Available Practice Cash
                    </Text>
                    <Text style={styles.terminalPositionValue}>
                      KES {money(cash)}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        </View>

      <Modal
        visible={securityPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSecurityPickerOpen(false)
        }
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() =>
            setSecurityPickerOpen(false)
          }
        >
          <Pressable
            style={styles.pickerModal}
            onPress={(event) =>
              event.stopPropagation()
            }
          >
            <View style={styles.pickerHeader}>
              <Text style={styles.cardTitle}>
                Select Security
              </Text>
              <Pressable
                style={styles.pickerClose}
                onPress={() =>
                  setSecurityPickerOpen(false)
                }
              >
                <Text style={styles.pickerCloseText}>
                  ×
                </Text>
              </Pressable>
            </View>

            <ScrollView style={styles.pickerList}>
              {stocks.map((stock) => (
                <Pressable
                  key={stock.symbol}
                  style={[
                    styles.pickerRow,
                    selectedStock.symbol ===
                      stock.symbol &&
                      styles.stockActive
                  ]}
                  onPress={() => selectStock(stock)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.symbol}>
                      {stock.symbol}
                    </Text>
                    <Text style={styles.small}>
                      {stock.name} • {stock.sector}
                    </Text>
                  </View>
                  <Text style={styles.price}>
                    KES {money(stock.price)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

        <View style={wideWeb ? styles.terminalTicketColumn : null}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {wideWeb
                ? `${side} Order`
                : averageCostMode
                ? "Scenario Inputs"
                : "Order Ticket"}
            </Text>

        <View style={styles.sideRow}>
          {["BUY", "SELL"].map((item) => (
            <Pressable
              key={item}
              style={[
                styles.sideChip,
                side === item && styles.sideActive
              ]}
              onPress={() => {
                setSide(item);
                setConfirmedTrade(null);
              }}
            >
              <Text
                style={
                  side === item
                    ? styles.sideTextActive
                    : styles.sideText
                }
              >
                {averageCostMode ? `Simulate ${item}` : item}
              </Text>
            </Pressable>
          ))}
        </View>

        {!averageCostMode &&
          side === "BUY" &&
          estimate.remainingCash < 0 && (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>
                Insufficient Cash
              </Text>
              <Text style={styles.warningText}>
                Reduce quantity or add funds. You need
                KES {money(estimate.totalCost)} but only
                have KES {money(cash)}.
              </Text>
            </View>
          )}

        <Text style={styles.label}>Quantity</Text>
        <TextInput
          value={quantity}
          onChangeText={(value) => {
            setQuantityManuallyEdited(true);
            setQuantity(value);
            setConfirmedTrade(null);
          }}
          keyboardType="numeric"
          placeholder="Quantity"
          placeholderTextColor="#64748b"
          style={styles.input}
        />
        {decisionLabHandoff &&
        decisionAmountParam > 0 &&
        Number(quantity) > 0 &&
        Number(selectedStock?.price || 0) > 0 ? (
          <Text style={styles.small}>
            Approx. {Number(quantity).toLocaleString()} shares from KES{" "}
            {decisionAmountParam.toLocaleString()} at KES{" "}
            {Number(selectedStock.price).toFixed(2)}.
            {side === "BUY"
              ? " Known percentage charges are included in the quantity estimate."
              : ""}
            {" "}Editable; scenario estimate only.
          </Text>
        ) : null}

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

        {averageCostMode && side === "SELL" ? (
          <>
            <Text style={styles.label}>
              Broker Cost-Basis Method
            </Text>

            <View style={styles.sideRow}>
              {[
                { id: "FIFO", label: "FIFO" },
                {
                  id: "AVERAGE_COST",
                  label: "Average"
                },
                {
                  id: "SPECIFIC_LOT",
                  label: "Specific Lot"
                }
              ].map((item) => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.methodChip,
                    saleCostMethod === item.id &&
                      styles.sideActive
                  ]}
                  onPress={() =>
                    setSaleCostMethod(item.id)
                  }
                >
                  <Text
                    style={
                      saleCostMethod === item.id
                        ? styles.sideTextActive
                        : styles.sideText
                    }
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {saleCostMethod === "FIFO" ? (
              <>
                <Text style={styles.small}>
                  {fifoEvidence?.available
                    ? `Reconciled FIFO evidence: ${
                        fifoOpenLots.length
                      } remaining acquisition lot${
                        fifoOpenLots.length === 1 ? "" : "s"
                      }.`
                    : "Complete transaction history does not reconcile to the current broker holding. Coach G will not fabricate the FIFO result; review the transaction reconciliation report or use Specific Lot."}
                </Text>
                {!fifoEvidence?.available ? (
                  <Pressable
                    style={styles.reconciliationButton}
                    onPress={() => router.push({ pathname: "/transactions", params: { symbol: selectedStock.symbol } })}
                  >
                    <Text style={styles.reconciliationButtonText}>Review Transaction Reconciliation</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            {saleCostMethod === "SPECIFIC_LOT" ? (
              <>
                <Text style={styles.label}>
                  Expected Average Cost of Shares Removed
                </Text>
                <TextInput
                  value={removedLotAveragePrice}
                  onChangeText={(value) =>
                    setRemovedLotAveragePrice(
                      value.replace(/[^0-9.]/g, "")
                    )
                  }
                  keyboardType="numeric"
                  placeholder="Cost per sold share"
                  placeholderTextColor="#64748b"
                  style={styles.input}
                />
              </>
            ) : null}
          </>
        ) : null}

        {averageCostMode ? (
          <>
            <Text style={styles.label}>
              Additional Fixed / Stamp Charges
            </Text>
            <TextInput
              value={scenarioExtraCharges}
              onChangeText={(value) =>
                setScenarioExtraCharges(
                  value.replace(/[^0-9.]/g, "")
                )
              }
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#64748b"
              style={styles.input}
            />
            <Text style={styles.small}>
              Contract-note evidence: 1.30% brokerage +
              0.34% levies. Enter any quoted fixed or
              stamp charge separately.
            </Text>
          </>
        ) : null}
          </View>
        </View>
      </View>

      {wideWeb && averageCostMode ? (
        <View style={styles.terminalMarketEvidence}>
          <Text style={styles.terminalSectionEyebrow}>
            MARKET EVIDENCE
          </Text>

          <View style={styles.terminalMarketEvidenceGrid}>
            <View style={styles.terminalMarketEvidenceMetric}>
              <Text style={styles.metricLabel}>Last Price</Text>
              <Text style={styles.terminalMarketEvidenceValue}>
                {Number(selectedStock?.price || 0) > 0
                  ? `KES ${money(selectedStock.price)}`
                  : "N/A"}
              </Text>
            </View>

            <View style={styles.terminalMarketEvidenceMetric}>
              <Text style={styles.metricLabel}>Best Bid</Text>
              <Text style={styles.terminalMarketEvidenceValue}>
                {Number(verifiedMarketDepth?.bestBid || 0) > 0
                  ? `KES ${money(verifiedMarketDepth.bestBid)}`
                  : "N/A"}
              </Text>
            </View>

            <View style={styles.terminalMarketEvidenceMetric}>
              <Text style={styles.metricLabel}>Best Ask</Text>
              <Text style={styles.terminalMarketEvidenceValue}>
                {Number(verifiedMarketDepth?.bestAsk || 0) > 0
                  ? `KES ${money(verifiedMarketDepth.bestAsk)}`
                  : "N/A"}
              </Text>
            </View>

            <View style={styles.terminalMarketEvidenceMetric}>
              <Text style={styles.metricLabel}>Volume</Text>
              <Text style={styles.terminalMarketEvidenceValue}>
                {Number(selectedStock?.volume || 0) > 0
                  ? Number(selectedStock.volume).toLocaleString()
                  : "N/A"}
              </Text>
            </View>

            <View style={styles.terminalMarketEvidenceMetric}>
              <Text style={styles.metricLabel}>Turnover</Text>
              <Text style={styles.terminalMarketEvidenceValue}>
                {Number(selectedStock?.turnover || 0) > 0
                  ? `KES ${Number(selectedStock.turnover).toLocaleString()}`
                  : "N/A"}
              </Text>
            </View>
          </View>

          {!verifiedMarketDepth?.available ? (
            <View style={styles.terminalDepthUnavailable}>
              <Text style={styles.terminalDepthUnavailableTitle}>
                Verified Level 2 depth unavailable
              </Text>
              <Text style={styles.small}>
                The current verified market evidence does not include genuine
                bid/ask order levels. GateCEP will not fabricate market depth.
              </Text>
            </View>
          ) : (
            <Text style={styles.terminalMarketEvidenceHint}>
              Genuine bid/ask evidence is available for this security.
            </Text>
          )}
        </View>
      ) : null}

      <View
        style={wideWeb && averageCostMode ? styles.terminalDecisionGrid : null}
      >
        <View
          style={wideWeb && averageCostMode ? styles.terminalDecisionColumn : null}
        >
          {wideWeb && averageCostMode ? (
            <Text style={styles.terminalSectionEyebrow}>PROJECTED TRADE</Text>
          ) : null}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {averageCostMode ? "Scenario Estimate" : "Trade Estimate"}
        </Text>

        <Info
          label="Gross Value"
          value={`KES ${money(estimate.gross)}`}
        />
        <Info
          label="Broker Fee"
          value={`KES ${money(
            estimate.brokerFee
          )}`}
        />
        <Info
          label="Regulatory Fee"
          value={`KES ${money(
            estimate.regulatoryFee
          )}`}
        />
        <Info
          label="Total Fees"
          value={`KES ${money(
            estimate.totalFees
          )}`}
        />
        <Info
          label={
            side === "BUY"
              ? "Cash Required"
              : "Estimated Proceeds"
          }
          value={`KES ${money(
            estimate.totalCost
          )}`}
        />
        <Info
          label={
            averageCostMode
              ? "Projected Available Cash"
              : "Cash After Trade"
          }
          value={`KES ${money(
            estimate.remainingCash
          )}`}
          valueStyle={
            estimate.remainingCash >= 0
              ? styles.green
              : styles.red
          }
        />
      </View>

      {averageCostMode ? (
        <Pressable
          style={styles.impactReviewButton}
          onPress={() => setProjectedImpactOpen(true)}
        >
          <Text style={styles.primaryText}>
            {wideWeb && averageCostMode
              ? "View Full Projected Impact"
              : "View Projected Impact"}
          </Text>
        </Pressable>
      ) : null}

        </View>

        <View
          style={wideWeb && averageCostMode ? styles.terminalDecisionColumn : null}
        >
          {wideWeb && averageCostMode ? (
            <Text style={styles.terminalSectionEyebrow}>COACH G</Text>
          ) : null}
      {averageGuard ? (
        <View
          style={[
            styles.card,
            averageGuard.raisesAverage ||
            averageGuard.realizesLoss
              ? styles.averageGuardWarning
              : styles.averageGuardSafe
          ]}
        >
          <Text style={styles.cardTitle}>
            {side === "SELL"
              ? "Coach G Sale Break-Even Check"
              : "Coach G Weighted Average Check"}
          </Text>

          {!averageGuard.available ? (
            <Text style={styles.body}>
              {averageGuard.message}
            </Text>
          ) : (
            <>
              <Info
                label="Current Weighted Average"
                value={`KES ${money(
                  averageGuard.currentAveragePrice
                )}`}
              />

              {side === "BUY" ? (
                <>
                  <Info
                    label="All-in Cost Per New Share"
                    value={`KES ${money(
                      averageGuard.allInUnitCost
                    )}`}
                  />
                  <Info
                    label="Projected Weighted Average"
                    value={`KES ${money(
                      averageGuard.projectedAveragePrice
                    )}`}
                    valueStyle={
                      averageGuard.raisesAverage
                        ? styles.red
                        : styles.green
                    }
                  />
                  <Info
                    label="Average Price Change"
                    value={`${
                      averageGuard.averagePriceChange >= 0
                        ? "+"
                        : ""
                    }KES ${money(
                      averageGuard.averagePriceChange
                    )}`}
                    valueStyle={
                      averageGuard.raisesAverage
                        ? styles.red
                        : styles.green
                    }
                  />
                  <Info
                    label="Maximum Limit Price Without Raising Average"
                    value={
                      averageGuard.maximumBuyPrice ===
                      null
                        ? "Verified fee schedule required"
                        : `KES ${money(
                            averageGuard.maximumBuyPrice
                          )}`
                    }
                  />
                </>
              ) : (
                <>
                  <Info
                    label="Net Proceeds Per Share"
                    value={`KES ${money(
                      averageGuard.netProceedsPerShare
                    )}`}
                  />
                  <Info
                    label="Projected Cost Basis Released"
                    value={`KES ${money(
                      averageGuard.releasedCostBasis
                    )}`}
                  />
                  <Info
                    label="Projected Cost of Shares Removed"
                    value={`KES ${money(
                      averageGuard.soldCostPerShare
                    )}`}
                  />
                  <Info
                    label="Projected Realized Gain / Loss"
                    value={`${
                      averageGuard.estimatedRealizedProfitLoss >=
                      0
                        ? "+"
                        : ""
                    }KES ${money(
                      averageGuard.estimatedRealizedProfitLoss
                    )}`}
                    valueStyle={
                      averageGuard.realizesLoss
                        ? styles.red
                        : styles.green
                    }
                  />
                  <Info
                    label="Projected Remaining Quantity"
                    value={String(
                      averageGuard.remainingQuantity
                    )}
                  />
                  <Info
                    label="Projected Remaining WAP"
                    value={
                      averageGuard.remainingAveragePrice ===
                      null
                        ? "No shares remaining"
                        : `KES ${money(
                            averageGuard.remainingAveragePrice
                          )}`
                    }
                  />
                  <Info
                    label="Projected WAP Change"
                    value={
                      averageGuard.remainingAverageChange ===
                      null
                        ? "N/A"
                        : `${
                            averageGuard.remainingAverageChange >=
                            0
                              ? "+"
                              : ""
                          }KES ${money(
                            averageGuard.remainingAverageChange
                          )}`
                    }
                    valueStyle={
                      averageGuard.remainingAverageChange > 0
                        ? styles.red
                        : styles.green
                    }
                  />
                  <Info
                    label="Minimum Gross Limit to Avoid Cost-Basis Loss"
                    value={
                      averageGuard.minimumSalePrice === null
                        ? "Verified fee schedule required"
                        : `KES ${money(
                            averageGuard.minimumSalePrice
                          )}`
                    }
                  />

                  {averageGuard.removedLots?.length ? (
                    <View style={styles.lotList}>
                      <Text style={styles.lotTitle}>
                        FIFO shares expected to be sold first
                      </Text>

                      {averageGuard.removedLots.map(
                        (lot, index) => (
                          <Text
                            key={`${lot.date}-${index}`}
                            style={styles.small}
                          >
                            {lot.normalizedDate ||
                              lot.date ||
                              "Date unavailable"}
                            : {lot.quantity} shares bought
                            at KES{" "}
                            {money(
                              lot.originalUnitPrice
                            )}
                            ; calibrated cost KES{" "}
                            {money(lot.unitCost)}
                          </Text>
                        )
                      )}
                    </View>
                  ) : null}
                </>
              )}

              <Text style={styles.body}>
                {averageGuard.recommendation}
              </Text>

              {side === "SELL" ? (
                <Text style={styles.small}>
                  {averageGuard.accountingNote}
                </Text>
              ) : null}

              <Text style={styles.small}>
                This is an advisory scenario using the
                displayed fee assumptions. Cost basis
                alone is not a reason to buy, hold or
                sell.
              </Text>
            </>
          )}
        </View>
      ) : null}

        </View>
      </View>

      {wideWeb && averageCostMode ? (
        <View style={styles.terminalSection}>
          <Text style={styles.terminalSectionEyebrow}>
            PORTFOLIO IMPACT
          </Text>

          <Text style={styles.cardTitle}>
            Current → After → Change
          </Text>

          <Text style={styles.small}>
            Advisory scenario only. REAL portfolio evidence has not changed.
          </Text>

          {!projectedImpact?.available ? (
            <View style={styles.impactNotice}>
              <Text style={styles.body}>
                {projectedImpact?.evidenceMessage ||
                  "Projected impact is unavailable until the scenario has valid security, quantity and price evidence."}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.terminalImpactHeaderRow}>
                <Text style={styles.terminalImpactMetricLabel}>
                  Metric
                </Text>
                <Text style={styles.terminalImpactMetricValue}>
                  Current
                </Text>
                <Text style={styles.terminalImpactMetricValue}>
                  After
                </Text>
                <Text style={styles.terminalImpactMetricValue}>
                  Change
                </Text>
              </View>

              {[
                {
                  label: "Quantity",
                  current: String(projectedImpact.current.quantity),
                  projected: String(projectedImpact.projected.quantity),
                  change: `${
                    projectedImpact.projected.quantity -
                      projectedImpact.current.quantity >=
                    0
                      ? "+"
                      : ""
                  }${
                    projectedImpact.projected.quantity -
                    projectedImpact.current.quantity
                  }`
                },
                {
                  label: "Weighted Average Price",
                  current:
                    projectedImpact.current.weightedAveragePrice == null
                      ? "N/A"
                      : `KES ${money(
                          projectedImpact.current.weightedAveragePrice
                        )}`,
                  projected:
                    projectedImpact.projected.weightedAveragePrice == null
                      ? "N/A"
                      : `KES ${money(
                          projectedImpact.projected.weightedAveragePrice
                        )}`,
                  change:
                    projectedImpact.current.weightedAveragePrice == null ||
                    projectedImpact.projected.weightedAveragePrice == null
                      ? "N/A"
                      : `${
                          projectedImpact.projected.weightedAveragePrice -
                            projectedImpact.current.weightedAveragePrice >=
                          0
                            ? "+"
                            : ""
                        }KES ${money(
                          projectedImpact.projected.weightedAveragePrice -
                            projectedImpact.current.weightedAveragePrice
                        )}`
                },
                {
                  label: "Portfolio Weight",
                  current: `${projectedImpact.current.portfolioWeightPct.toFixed(
                    2
                  )}%`,
                  projected: `${projectedImpact.projected.portfolioWeightPct.toFixed(
                    2
                  )}%`,
                  change: `${
                    projectedImpact.projected.portfolioWeightPct -
                      projectedImpact.current.portfolioWeightPct >=
                    0
                      ? "+"
                      : ""
                  }${(
                    projectedImpact.projected.portfolioWeightPct -
                    projectedImpact.current.portfolioWeightPct
                  ).toFixed(2)} pp`
                },
                {
                  label: `${projectedImpact.sector} Exposure`,
                  current: `${projectedImpact.current.sectorExposurePct.toFixed(
                    2
                  )}%`,
                  projected: `${projectedImpact.projected.sectorExposurePct.toFixed(
                    2
                  )}%`,
                  change: `${
                    projectedImpact.projected.sectorExposurePct -
                      projectedImpact.current.sectorExposurePct >=
                    0
                      ? "+"
                      : ""
                  }${(
                    projectedImpact.projected.sectorExposurePct -
                    projectedImpact.current.sectorExposurePct
                  ).toFixed(2)} pp`
                },
                {
                  label: "Available Cash",
                  current: `KES ${money(
                    projectedImpact.current.availableCash
                  )}`,
                  projected: `KES ${money(
                    projectedImpact.projected.availableCash
                  )}`,
                  change: `${
                    projectedImpact.projected.availableCash -
                      projectedImpact.current.availableCash >=
                    0
                      ? "+"
                      : ""
                  }KES ${money(
                    projectedImpact.projected.availableCash -
                      projectedImpact.current.availableCash
                  )}`
                }
              ].map((row) => (
                <View
                  key={`terminal-impact-${row.label}`}
                  style={styles.terminalImpactRow}
                >
                  <Text style={styles.terminalImpactMetricLabel}>
                    {row.label}
                  </Text>

                  <Text style={styles.terminalImpactMetricValue}>
                    {row.current}
                  </Text>

                  <Text style={styles.terminalImpactMetricValue}>
                    {row.projected}
                  </Text>

                  <Text style={styles.terminalImpactChangeValue}>
                    {row.change}
                  </Text>
                </View>
              ))}

              {side === "SELL" ? (
                <View style={styles.terminalImpactEvidence}>
                  <Text style={styles.terminalImpactEvidenceLabel}>
                    FIFO IMPACT
                  </Text>

                  <View style={styles.terminalImpactEvidenceRow}>
                    <Text style={styles.terminalImpactEvidenceMetric}>
                      Cost Basis Released
                    </Text>
                    <Text style={styles.terminalImpactEvidenceValue}>
                      KES{" "}
                      {money(projectedImpact.projected.costBasisReleased)}
                    </Text>
                  </View>

                  <View style={styles.terminalImpactEvidenceRow}>
                    <Text style={styles.terminalImpactEvidenceMetric}>
                      Projected Realized Gain / Loss
                    </Text>
                    <Text style={styles.terminalImpactEvidenceValue}>
                      {Number(projectedImpact.projected.realizedGainLoss) > 0
                        ? "+"
                        : ""}
                      KES{" "}
                      {money(projectedImpact.projected.realizedGainLoss)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}

      <Modal
        visible={projectedImpactOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setProjectedImpactOpen(false)}
      >
        <View style={styles.impactModalBackdrop}>
          <View style={styles.impactModalCard}>
            <ScrollView
              contentContainerStyle={[
                styles.impactModalScrollContent,
                wideWeb && styles.impactModalScrollContentWide
              ]}
            >
              <Text style={styles.impactEyebrow}>COACH G — PROJECTED IMPACT</Text>
              <Text style={styles.cardTitle}>Current vs Projected</Text>
              <Text style={styles.small}>Advisory scenario only. REAL portfolio evidence has not changed.</Text>

              {!projectedImpact?.available ? (
                <View style={styles.impactNotice}>
                  <Text style={styles.body}>{projectedImpact?.evidenceMessage || "Projected impact is unavailable until the scenario has valid security, quantity and price evidence."}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.impactHeaderRow}>
                    <Text style={styles.impactMetricLabel}>Metric</Text>
                    <Text style={styles.impactMetricValue}>Current</Text>
                    <Text style={styles.impactMetricValue}>Projected</Text>
                  </View>
                  {[["Quantity", projectedImpact.current.quantity, projectedImpact.projected.quantity],
                    ["Weighted Average Price", projectedImpact.current.weightedAveragePrice == null ? "N/A" : `KES ${money(projectedImpact.current.weightedAveragePrice)}`, projectedImpact.projected.weightedAveragePrice == null ? "N/A" : `KES ${money(projectedImpact.projected.weightedAveragePrice)}`],
                    ["Portfolio Weight", `${projectedImpact.current.portfolioWeightPct.toFixed(2)}%`, `${projectedImpact.projected.portfolioWeightPct.toFixed(2)}%`],
                    [`${projectedImpact.sector} Exposure`, `${projectedImpact.current.sectorExposurePct.toFixed(2)}%`, `${projectedImpact.projected.sectorExposurePct.toFixed(2)}%`],
                    ["Available Cash", `KES ${money(projectedImpact.current.availableCash)}`, `KES ${money(projectedImpact.projected.availableCash)}`]
                  ].map(([label, current, projected]) => (
                    <View key={label} style={styles.impactRow}>
                      <Text style={styles.impactMetricLabel}>{label}</Text>
                      <Text style={styles.impactMetricValue}>{current}</Text>
                      <Text style={styles.impactMetricValue}>{projected}</Text>
                    </View>
                  ))}

                  {side === "SELL" ? (
                    <View style={styles.impactNotice}>
                      <Text style={styles.small}>Projected Cost Basis Released: KES {money(projectedImpact.projected.costBasisReleased)}</Text>
                      <Text style={styles.small}>Projected Realized Gain / Loss: KES {money(projectedImpact.projected.realizedGainLoss)}</Text>
                    </View>
                  ) : null}

                  {/* PC-030M20AR10 Coach G projected interpretation */}
                  <View style={styles.impactCoachCard}>
                    <Text style={styles.impactCoachLabel}>COACH G — WHAT THIS MEANS</Text>
                    <Text style={styles.cardTitle}>{projectedImpact.interpretation?.headline}</Text>
                    <Text style={styles.body}>{projectedImpact.interpretation?.summary}</Text>
                    <Text style={styles.impactQuestion}>{projectedImpact.interpretation?.question}</Text>
                    {(projectedImpact.interpretation?.evidenceBoundaries || []).map((boundary, index) => (
                      <Text key={`impact-boundary-${index}`} style={styles.small}>• {boundary}</Text>
                    ))}
                  {/* PC-030M20AS goal+risk stress */}
                  <View style={styles.impactCoachCard}>
                    <Text style={styles.impactCoachLabel}>COACH G — GOAL + RISK STRESS</Text>
                    <Text style={styles.cardTitle}>What if the projected portfolio falls?</Text>
                    <Text style={styles.small}>Deterministic stress only — no probability or return forecast is being invented.</Text>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, marginBottom: 12 }}>
                      {[10, 20, 30, 40, 50].map((loss) => (
                        <Pressable key={`stress-${loss}`} onPress={() => setStressLossPercent(loss)} style={[styles.secondary, { paddingVertical: 8, paddingHorizontal: 10, marginTop: 0 }, stressLossPercent === loss ? { borderWidth: 2 } : null]}>
                          <Text style={styles.secondaryText}>-{loss}%</Text>
                        </Pressable>
                      ))}
                    </View>

                    {goalRiskImpact?.available ? (
                      <>
                        <Text style={styles.body}>Scenario Risk: {goalRiskImpact.risk?.classification || "N/A"}</Text>
                        <Text style={styles.small}>Holdings stress: -{goalRiskImpact.selectedStressLossPercent}% • Required recovery on stressed holdings: {goalRiskImpact.risk?.recoveryPercent == null ? "N/A" : `${goalRiskImpact.risk.recoveryPercent}%`}</Text>
                        <Text style={styles.small}>Modeled net worth drawdown: {goalRiskImpact.modeledNetWorthDrawdownPercent.toFixed(2)}% • Projected liquidity: {goalRiskImpact.projectedCashPercent.toFixed(2)}%</Text>
                        {(goalRiskImpact.risk?.reasons || []).map((reason, index) => (
                          <Text key={`risk-reason-${index}`} style={styles.small}>• {reason}</Text>
                        ))}

                        <View style={styles.impactNotice}>
                          {goalRiskImpact.goal?.available ? (
                            <>
                              <Text style={styles.body}>{goalRiskImpact.goal.goalName}</Text>
                              <Text style={styles.small}>Goal progress: {goalRiskImpact.goal.currentProgressPercent.toFixed(2)}% → {goalRiskImpact.goal.projectedProgressPercent.toFixed(2)}%</Text>
                              <Text style={styles.small}>Under -{goalRiskImpact.selectedStressLossPercent}% holdings stress: {goalRiskImpact.goal.stressedProgressPercent.toFixed(2)}%</Text>
                              <Text style={styles.small}>Projected remaining amount: KES {money(goalRiskImpact.goal.projectedRemainingAmount)}</Text>
                              <Text style={styles.small}>{goalRiskImpact.goal.message}</Text>
                            </>
                          ) : (
                            <Text style={styles.small}>{goalRiskImpact.goal?.message || "Verified saved goal evidence is unavailable."}</Text>
                          )}
                        </View>

                        <Text style={styles.small}>Risk label describes this modeled scenario, not your permanent Investor DNA risk profile.</Text>
                      </>
                    ) : (
                      <Text style={styles.small}>{goalRiskImpact?.message || "Complete projected-impact evidence before running stress."}</Text>
                    )}
                  </View>
                  </View>
                </>
              )}

              <Pressable style={styles.primary} onPress={() => setProjectedImpactOpen(false)}>
                <Text style={styles.primaryText}>Back to Scenario</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {!averageCostMode ? (
        <Pressable
          style={[
            styles.primary,
            !hasSelectedSecurity && styles.disabledButton,
            (
              (
                side === "BUY" &&
                estimate.remainingCash < 0
              ) ||
              practiceSellBlocked
            ) &&
              styles.disabledButton
          ]}
          disabled={
            !hasSelectedSecurity ||
            (
              side === "BUY" &&
              estimate.remainingCash < 0
            ) ||
            practiceSellBlocked
          }
          onPress={confirmTrade}
        >
          <Text style={styles.primaryText}>
            {side === "BUY" &&
            estimate.remainingCash < 0
              ? "Insufficient Cash"
              : practiceSellHoldingMissing
              ? "No Shares Available to Sell"
              : practiceSellQuantityExceeded
              ? `Maximum ${practiceHeldQuantity} Shares`
              : `Confirm Simulated ${side}`}
          </Text>
        </Pressable>
      ) : (
        <View
          style={[
            styles.previewOnly,
            wideWeb && styles.terminalReviewCheckpoint
          ]}
        >
          {wideWeb ? (
            <Text style={styles.terminalSectionEyebrow}>DECISION CHECKPOINT</Text>
          ) : null}
          {wideWeb ? (
            <>
              <Text style={styles.previewOnlyTitle}>
                Review Before Creating REAL Order
              </Text>

              <View style={styles.terminalDecisionSummary}>
                <View style={styles.terminalDecisionSummaryHeader}>
                  <View style={styles.terminalDecisionIdentity}>
                    <Text style={styles.terminalDecisionSecurity}>
                      {selectedStock?.symbol || "Security"} · {side}
                    </Text>
                    <Text style={styles.small}>
                      {estimate.qty} shares @ KES {money(estimate.price)}
                    </Text>
                  </View>

                  <Text style={styles.terminalDecisionMode}>
                    REAL REVIEW
                  </Text>
                </View>

                <View style={styles.terminalDecisionSummaryGrid}>
                  <View style={styles.terminalDecisionSummaryColumn}>
                    <Text style={styles.terminalImpactEvidenceLabel}>
                      ORDER
                    </Text>

                    <View style={styles.terminalDecisionSummaryRow}>
                      <Text style={styles.small}>
                        {side === "SELL"
                          ? "Estimated Proceeds"
                          : "Cash Required"}
                      </Text>
                      <Text style={styles.terminalDecisionSummaryValue}>
                        KES{" "}
                        {money(estimate.totalCost)}
                      </Text>
                    </View>

                    <View style={styles.terminalDecisionSummaryRow}>
                      <Text style={styles.small}>
                        Estimated Charges
                      </Text>
                      <Text style={styles.terminalDecisionSummaryValue}>
                        KES {money(estimate.totalFees)}
                      </Text>
                    </View>

                    <View style={styles.terminalDecisionSummaryRow}>
                      <Text style={styles.small}>
                        Cost Basis Method
                      </Text>
                      <Text style={styles.terminalDecisionSummaryValue}>
                        {averageGuard?.costBasisMethod || "N/A"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.terminalDecisionSummaryColumn}>
                    <Text style={styles.terminalImpactEvidenceLabel}>
                      COACH G DECISION CONTEXT
                    </Text>

                    <View style={styles.terminalDecisionSummaryRow}>
                      <Text style={styles.small}>
                        Portfolio Weight
                      </Text>
                      <Text style={styles.terminalDecisionSummaryValue}>
                        {projectedImpact?.available
                          ? `${projectedImpact.current.portfolioWeightPct.toFixed(
                              2
                            )}% → ${projectedImpact.projected.portfolioWeightPct.toFixed(
                              2
                            )}%`
                          : "N/A"}
                      </Text>
                    </View>

                    <View style={styles.terminalDecisionSummaryRow}>
                      <Text style={styles.small}>
                        {projectedImpact?.available
                          ? `${projectedImpact.sector} Exposure`
                          : "Sector Exposure"}
                      </Text>
                      <Text style={styles.terminalDecisionSummaryValue}>
                        {projectedImpact?.available
                          ? `${projectedImpact.current.sectorExposurePct.toFixed(
                              2
                            )}% → ${projectedImpact.projected.sectorExposurePct.toFixed(
                              2
                            )}%`
                          : "N/A"}
                      </Text>
                    </View>

                    <View style={styles.terminalDecisionSummaryRow}>
                      <Text style={styles.small}>
                        {side === "SELL"
                          ? "Projected Realized G/L"
                          : "Projected Weighted Average"}
                      </Text>
                      <Text style={styles.terminalDecisionSummaryValue}>
                        {side === "SELL"
                          ? averageGuard?.estimatedRealizedProfitLoss == null
                            ? "N/A"
                            : `${Number(
                                averageGuard.estimatedRealizedProfitLoss
                              ) >= 0
                                ? "+"
                                : "-"}KES ${money(
                                Math.abs(
                                  Number(
                                    averageGuard.estimatedRealizedProfitLoss
                                  )
                                )
                              )}`
                          : averageGuard?.projectedAveragePrice == null
                          ? "N/A"
                          : `KES ${money(
                              averageGuard.projectedAveragePrice
                            )}`}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <Text style={styles.terminalDecisionBoundary}>
                No REAL trade has been executed. Continuing creates a REAL
                order for review only. REAL holdings, cash, P&amp;L and FIFO
                remain unchanged until genuine broker execution evidence is
                verified.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.previewOnlyTitle}>
                Decision Preview — No REAL Trade Executed
              </Text>
              <Text style={styles.body}>
                Coach G is showing the projected Average Cost, FIFO,
                charges and portfolio impact before you decide.
                Proceeding creates a REAL order for review only. It
                does not change REAL holdings, cash, P&amp;L or FIFO until
                genuine broker execution evidence is verified.
              </Text>
            </>
          )}

          {wideWeb && reviewBlockedFeedback ? (
            <View style={styles.reviewBlockedBox}>
              <Text style={styles.reviewBlockedTitle}>
                {reviewBlockedFeedback.title}
              </Text>

              <Text style={styles.warningText}>
                {reviewBlockedFeedback.message}
              </Text>

              <Pressable
                style={styles.reviewBlockedAction}
                onPress={() => router.push("/orders-review")}
              >
                <Text style={styles.reviewBlockedActionText}>
                  Open Current Review
                </Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            style={[styles.primary, !hasSelectedSecurity && styles.disabledButton]}
            disabled={!hasSelectedSecurity}
            onPress={proceedRealOrderToReview}
          >
            <Text style={styles.primaryText}>
              {wideWeb ? `Review ${side} Order` : "Proceed to Trade"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.secondary, !hasSelectedSecurity && styles.disabledButton]}
            disabled={!hasSelectedSecurity}
            onPress={addToBrokerActionPlan}
          >
            <Text style={styles.secondaryText}>
              Save to Broker Action Plan
            </Text>
          </Pressable>
        </View>
      )}

      {confirmedTrade && (
        <View style={styles.confirmCard}>
          <Text style={styles.cardTitle}>
            Trade Complete
          </Text>

          <Text style={styles.body}>
            {confirmedTrade.side}{" "}
            {confirmedTrade.quantity}{" "}
            {confirmedTrade.symbol} at KES{" "}
            {money(confirmedTrade.price)} has been
            simulated.
          </Text>

          {basketRemaining > 0 ? (
            <Text style={styles.body}>
              Next basket order has been loaded into the
              ticket.
            </Text>
          ) : (
            <Text style={styles.body}>
              Portfolio and cash have been updated for
              Coach G monitoring.
            </Text>
          )}

          <Pressable
            style={styles.secondary}
            onPress={() =>
              router.replace("/(tabs)/dashboard")
            }
          >
            <Text style={styles.secondaryText}>
              Open Dashboard
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondary}
            onPress={() =>
              router.push("/trade-history")
            }
          >
            <Text style={styles.secondaryText}>
              View Trade History
            </Text>
          </Pressable>
        </View>
      )}

      <Pressable
        style={styles.backButton}
        onPress={() =>
          averageCostMode
            ? router.replace({ pathname: "/basket-execution", params: { mode: "BROKER_PLAN" } })
            : router.replace("/basket-execution")
        }
      >
        <Text style={styles.backText}>
          {averageCostMode ? "Back to Broker Action Plan" : "Back to Basket Execution"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function buildEstimate({
  side,
  quantity,
  price,
  cash,
  feePolicy = PRACTICE_FEE_POLICY
}) {
  const qty = Number(quantity || 0);
  const tradePrice = Number(price || 0);
  const gross = qty * tradePrice;

  const brokerFee =
    gross *
    (Number(feePolicy.commissionRatePct || 0) / 100);

  const regulatoryFee =
    gross *
    (Number(feePolicy.otherChargesRatePct || 0) / 100);

  const fixedCharges = Number(
    feePolicy.fixedCharges || 0
  );

  const totalFees =
    brokerFee + regulatoryFee + fixedCharges;

  const totalCost =
    side === "BUY"
      ? gross + totalFees
      : Math.max(gross - totalFees, 0);

  const remainingCash =
    side === "BUY"
      ? Number(cash || 0) - totalCost
      : Number(cash || 0) + totalCost;

  return {
    qty,
    price: tradePrice,
    gross,
    brokerFee,
    regulatoryFee,
    fixedCharges,
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
      <Text style={styles.metricValue}>
        {String(value || "N/A")}
      </Text>
    </View>
  );
}

function Info({ label, value, valueStyle }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>
        {value}
      </Text>
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
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },
  content: {
    /* PC-030M20AV3AL RESPONSIVE UAT CALIBRATION */
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
    padding: 22,
    paddingTop: 70,
    paddingBottom: 128
  },

  /* PC-032G4A — wide-web investor trading terminal foundation.
     Presentation only. Existing Trade calculations, accounting,
     evidence boundaries and order-review contracts remain authoritative. */
  contentWideWeb: {
    maxWidth: 1240,
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 64
  },

  terminalContextBar: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14
  },

  terminalContextPrimary: {
    flex: 1.7,
    minWidth: 0,
    justifyContent: "center"
  },

  terminalContextSymbol: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 3
  },

  terminalContextMetric: {
    flex: 1,
    minWidth: 150,
    justifyContent: "center",
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 10
  },

  terminalGrid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 18
  },

  terminalMarketColumn: {
    flex: 1.15,
    minWidth: 0
  },

  terminalTicketColumn: {
    flex: 0.85,
    minWidth: 360,
    maxWidth: 460
  },

  terminalPositionEvidence: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#334155"
  },

  terminalPositionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b"
  },

  terminalPositionValue: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right"
  },

  terminalScenarioCash: {
    marginTop: 16,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14
  },

  terminalSection: {
    marginTop: 22,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },

  terminalSectionEyebrow: {
    color: "#59dcff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginBottom: 7
  },

  terminalImpactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },

  terminalImpactCell: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 190,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14
  },

  terminalImpactHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingVertical: 10,
    marginTop: 14
  },

  terminalImpactRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#243247",
    paddingVertical: 12
  },

  terminalImpactMetricLabel: {
    flex: 1.5,
    color: "#dbeafe",
    fontSize: 13
  },

  terminalImpactMetricValue: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right"
  },

  terminalImpactChangeValue: {
    flex: 1,
    color: "#67e8f9",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "right"
  },

  terminalImpactEvidence: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#132641",
    gap: 8
  },

  terminalImpactEvidenceLabel: {
    color: "#67e8f9",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6
  },

  terminalImpactEvidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#334155"
  },

  terminalImpactEvidenceMetric: {
    flex: 1,
    color: "#bfdbfe",
    fontSize: 13
  },

  terminalImpactEvidenceValue: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right"
  },

  terminalMarketEvidence: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    backgroundColor: "#0f172a",
    padding: 18
  },

  terminalMarketEvidenceGrid: {
    flexDirection: "row",
    gap: 12
  },

  terminalMarketEvidenceMetric: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    padding: 12
  },

  terminalMarketEvidenceValue: {
    color: "#f8fafc",
    fontWeight: "900",
    marginTop: 5
  },

  terminalDepthUnavailable: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#92400e",
    backgroundColor: "#1c1417"
  },

  terminalDepthUnavailableTitle: {
    color: "#fbbf24",
    fontWeight: "900",
    marginBottom: 5
  },

  terminalMarketEvidenceHint: {
    color: "#67e8f9",
    marginTop: 12,
    fontSize: 12
  },

  terminalDecisionGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 18
  },

  terminalDecisionColumn: {
    flex: 1,
    minWidth: 0
  },

  terminalReviewCheckpoint: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 18,
    backgroundColor: "#0f172a",
    padding: 18
  },
  terminalDecisionSummary: {
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    backgroundColor: "#020617",
    padding: 16
  },
  terminalDecisionSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#334155"
  },
  terminalDecisionIdentity: {
    flex: 1,
    minWidth: 0
  },
  terminalDecisionSecurity: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "900"
  },
  terminalDecisionMode: {
    color: "#67e8f9",
    fontSize: 11,
    fontWeight: "900"
  },
  terminalDecisionSummaryGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 24,
    paddingTop: 14
  },
  terminalDecisionSummaryColumn: {
    flex: 1,
    minWidth: 0
  },
  terminalDecisionSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b"
  },
  terminalDecisionSummaryValue: {
    color: "#f8fafc",
    fontWeight: "900",
    textAlign: "right"
  },
  terminalDecisionBoundary: {
    color: "#cbd5e1",
    lineHeight: 20,
    marginBottom: 16
  },
  title: {
    color: "white",
    fontSize: 34,
    fontWeight: "900"
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: 10,
    lineHeight: 22
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
  metricLabel: {
    color: "#94a3b8",
    fontSize: 12
  },
  metricValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 6
  },
  metricHint: {
    color: "#67e8f9",
    fontSize: 10,
    marginTop: 4
  },
  cashInput: {
    color: "white",
    fontWeight: "900",
    fontSize: 16,
    marginTop: 5,
    paddingVertical: 2,
    borderBottomColor: "#475569",
    borderBottomWidth: 1
  },
  card: {
    marginTop: 22,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  impactReviewButton: {
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 8,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#1f9bbf"
  },
  impactModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    padding: 18
  },
  impactModalCard: {
    maxHeight: "88%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2fb7dc",
    backgroundColor: "#0b1728",
    padding: 18
  },

  impactModalScrollContent: {
    paddingBottom: 18
  },

  impactModalScrollContentWide: {
    paddingRight: 18
  },
  impactEyebrow: {
    color: "#59dcff",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 8
  },
  impactHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    paddingVertical: 10,
    marginTop: 12
  },
  impactRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#243247",
    paddingVertical: 12
  },
  impactMetricLabel: {
    flex: 1.45,
    color: "#dbeafe",
    fontSize: 13
  },
  impactMetricValue: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right"
  },
  impactNotice: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#132641"
  },
  impactCoachCard: {
    marginTop: 14,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#101f34"
  },
  impactCoachLabel: {
    color: "#59dcff",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 7
  },
  impactQuestion: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 10
  },
  averageGuardWarning: {
    borderColor: "#b45309",
    backgroundColor: "rgba(120,53,15,.18)"
  },
  averageGuardSafe: {
    borderColor: "#047857",
    backgroundColor: "rgba(6,78,59,.18)"
  },
  methodChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 12,
    alignItems: "center"
  },
  reconciliationButton: {
    marginTop: 10,
    borderColor: "#0891b2",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: "center"
  },
  reconciliationButtonText: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  lotList: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
    gap: 6
  },
  lotTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    marginBottom: 2
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
    flexWrap: "wrap",
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
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between"
  },
  stockActive: {
    borderColor: "#9333ea",
    backgroundColor: "rgba(147,51,234,.14)"
  },
  securityDropdown: {
    marginTop: 8,
    minHeight: 70,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  dropdownValue: {
    color: "#86efac",
    fontWeight: "900"
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,.86)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18
  },
  pickerModal: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "78%",
    backgroundColor: "#0f172a",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 22,
    padding: 16
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  pickerClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center"
  },
  pickerCloseText: {
    color: "white",
    fontWeight: "900",
    fontSize: 24
  },
  pickerList: {
    flexGrow: 0
  },
  pickerRow: {
    marginTop: 8,
    minHeight: 62,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  symbol: {
    color: "white",
    fontWeight: "900",
    fontSize: 17
  },
  small: {
    color: "#94a3b8",
    marginTop: 4
  },
  reason: {
    color: "#cbd5e1",
    marginTop: 6,
    lineHeight: 19,
    fontSize: 12
  },
  price: {
    color: "#86efac",
    fontWeight: "900",
    marginTop: 2
  },
  sideRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
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
  sideText: {
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "900"
  },
  sideTextActive: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  label: {
    color: "#94a3b8",
    marginTop: 14
  },
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
  infoLabel: {
    color: "#94a3b8",
    fontSize: 12
  },
  infoValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 4
  },
  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  disabledButton: {
    opacity: 0.45
  },
  primaryText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900"
  },
  confirmCard: {
    marginTop: 22,
    backgroundColor: "rgba(34,197,94,.10)",
    borderColor: "rgba(34,197,94,.35)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  previewOnly: {
    marginTop: 22,
    backgroundColor: "rgba(6,182,212,.10)",
    borderColor: "#0891b2",
    borderWidth: 1,
    borderRadius: 18,
    padding: 16
  },
  previewOnlyTitle: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 16
  },
  body: {
    color: "#cbd5e1",
    marginTop: 8,
    lineHeight: 21
  },
  secondary: {
    marginTop: 18,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  },
  backButton: {
    marginTop: 14,
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 18
  },
  backText: {
    color: "#cbd5e1",
    textAlign: "center",
    fontWeight: "900"
  },
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

  reviewBlockedBox: {
    marginTop: 18,
    backgroundColor: "rgba(245,158,11,.10)",
    borderColor: "rgba(245,158,11,.45)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },

  reviewBlockedTitle: {
    color: "#fbbf24",
    fontWeight: "900",
    fontSize: 14
  },

  reviewBlockedAction: {
    alignSelf: "flex-start",
    marginTop: 12,
    backgroundColor: "#1e293b",
    borderColor: "#475569",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14
  },

  reviewBlockedActionText: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
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
  dashboardButtonText: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  green: {
    color: "#86efac"
  },
  red: {
    color: "#fca5a5"
  },
  greenText: {
    color: "#86efac",
    fontWeight: "900"
  },
  cyanText: {
    color: "#67e8f9",
    fontWeight: "900"
  }
});
