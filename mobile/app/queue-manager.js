import AsyncStorage from "@react-native-async-storage/async-storage";

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import {
  getStoredUser
} from "../src/features/auth/storage/authStorage";
import {
  clearBasketExecution,
  loadBasketExecution,
  markExecutionOrderFilled,
  markExecutionOrderPartial,
  routeExecutionOrderByMode,
  updateExecutionOrder
} from "../src/trade/basketExecutionStore";
import { ORDER_STATUS } from "../src/trade/orderLifecycle";
import {
  analyzeCanonicalPracticeExecutionFunding,
  preflightCanonicalPracticeExecutionOrders
} from "../src/services/trade/practiceExecutionAccountingService";
import { buildExecutionStatusReadModel } from "../src/services/trade/realExecutionStatusReadModel";


import {
  resumePracticeExecutionOrchestrator
} from "../src/services/trade/practiceExecutionOrchestrator";
const FLOW = [
  ORDER_STATUS.REVIEW,
  ORDER_STATUS.BROKER_SELECTED,
  ORDER_STATUS.QUEUED,
  ORDER_STATUS.ROUTED,
  ORDER_STATUS.BROKER_RECEIVED,
  ORDER_STATUS.PARTIAL_FILL,
  ORDER_STATUS.FILLED
];

export default function QueueManager() {
  const [execution, setExecution] = useState(null);
  const [query, setQuery] = useState("");

  const [
    practicePrefillEvidence,
    setPracticePrefillEvidence
  ] = useState(null);

  const [
    practiceNamespaceEvidence,
    setPracticeNamespaceEvidence
  ] = useState(null);

  const [
    practiceIdentityEvidence,
    setPracticeIdentityEvidence
  ] = useState(null);

  const [
    postSettlementEvidence,
    setPostSettlementEvidence
  ] = useState(null);

  /*
   * PC-031B4M7C5D7F5K1A
   *
   * Read-only correlation between the current closed Practice
   * execution and durable practiceExecutionHistory.
   */
  const [
    practiceExecutionArchiveEvidence,
    setPracticeExecutionArchiveEvidence
  ] = useState(null);

  /*
   * PC-031B4M7C5D7F5J2B2
   *
   * UAT evidence for one guarded release through the
   * canonical clearBasketExecution() boundary.
   */
  const [
    practiceExecutionReleaseEvidence,
    setPracticeExecutionReleaseEvidence
  ] = useState(null);

  const [
    postSettlementValuationEvidence,
    setPostSettlementValuationEvidence
  ] = useState(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const saved = await loadBasketExecution();

    /*
     * PC-031B4M7C5D7F5J2C1:
     *
     * This screen is an OMS observer, not an execution
     * creation authority.
     *
     * An empty activeBasketExecution slot must remain empty.
     * In particular, do not recreate OMS REVIEW orders from
     * a previously persisted activeTradeBasket merely because
     * this screen is opened, focused, refreshed, or revisited.
     *
     * Fresh execution creation belongs to an explicit investor
     * workflow such as Coach G / Trade basket confirmation.
     */
    setExecution(saved);
  }

  const orders = execution?.orders || [];

  function statusViewFor(order) {
    return buildExecutionStatusReadModel(order, execution);
  }

  const realRecoveryOrders = orders.filter(
    (order) => statusViewFor(order).recoveryRequired
  );


  const filteredOrders = useMemo(() => {
    const search = query.trim().toLowerCase();

    return orders.filter((order) => {
      if (!search) return true;

      const statusView = statusViewFor(order);

      return (
        String(order.symbol || "").toLowerCase().includes(search) ||
        String(order.name || "").toLowerCase().includes(search) ||
        String(statusView.rawStatus || "").toLowerCase().includes(search) ||
        String(statusView.label || "").toLowerCase().includes(search) ||
        String(statusView.phase || "").toLowerCase().includes(search) ||
        String(statusView.brokerStatus || "").toLowerCase().includes(search) ||
        String(order.brokerName || "").toLowerCase().includes(search)
      );
    });
  }, [orders, query]);

  const counts = useMemo(() => {
    return FLOW.reduce((acc, status) => {
      acc[status] = orders.filter((order) => order.status === status).length;
      return acc;
    }, {});
  }, [orders]);

  async function routeQueuedOrders() {
    const queued = orders.filter(
      (order) => statusViewFor(order).canRetryRouting
    );

    if (!queued.length) {
      Alert.alert("No Queued Orders", "Queue or select broker orders before routing.");
      return;
    }

    const realCount = queued.filter(
      (order) => statusViewFor(order).isReal
    ).length;
    const practiceCount = queued.length - realCount;

    const routeSummary = [
      practiceCount ? `${practiceCount} Practice order${practiceCount === 1 ? "" : "s"} through GateCEP Broker` : null,
      realCount ? `${realCount} REAL order${realCount === 1 ? "" : "s"} through the selected connected broker adapter` : null
    ]
      .filter(Boolean)
      .join(" and ");

    Alert.alert(
      "Route Orders",
      `${routeSummary}. REAL orders remain pending until genuine broker confirmation is available.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Route",
          onPress: async () => {
            let latest = execution;

            for (const order of queued) {
              try {
                latest = await routeExecutionOrderByMode(order.id);
              } catch (error) {
              if (
                error?.code === "INSUFFICIENT_PRACTICE_CASH"
              ) {
                Alert.alert(
                  "Practice Funds Required",
                  `This Practice basket needs KES ${
                    Number(error?.requiredCash || 0).toFixed(2)
                  } for the next required settlement, but only KES ${
                    Number(error?.availableCash || 0).toFixed(2)
                  } is available. Deposit Practice funds before filling these orders.`,
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

                const code = error?.code || error?.message;

                Alert.alert(
                  "Order Not Routed",
                  code === "CONNECTED_REAL_BROKER_REQUIRED"
                    ? `${order.symbol}: connect or select a REAL broker account before routing this REAL order.`
                    : `${order.symbol}: ${error?.message || "Broker routing failed."}`
                );
              }
            }

            setExecution(latest);
          }
        }
      ]
    );
  }

  async function inspectPracticeNamespace() {
    try {
      const allKeys =
        await AsyncStorage.getAllKeys();

      const gatecepKeys =
        allKeys
          .filter((key) =>
            String(key || "").startsWith(
              "gatecep:"
            )
          )
          .sort();

      const practiceKeys =
        gatecepKeys.filter((key) =>
          key.endsWith(
            ":practicePortfolio"
          )
        );

      const executionKeys =
        gatecepKeys.filter((key) =>
          key.endsWith(
            ":activeBasketExecution"
          )
        );

      const practiceEntries =
        await Promise.all(
          practiceKeys.map(
            async (key) => {
              const raw =
                await AsyncStorage.getItem(
                  key
                );

              let value = null;

              try {
                value = raw
                  ? JSON.parse(raw)
                  : null;
              } catch {
                value = null;
              }

              return {
                key,
                exists:
                  raw !== null,
                parseable:
                  value !== null,
                status:
                  value?.status || null,
                type:
                  value?.type || null,
                capitalModel:
                  value?.capitalModel || null,
                holdingsCount:
                  Array.isArray(
                    value?.holdings
                  )
                    ? value.holdings.length
                    : 0,
                availableCash:
                  Number(
                    value?.availableCash || 0
                  ),
                initialInvestmentCapital:
                  Number(
                    value
                      ?.initialInvestmentCapital ||
                    0
                  ),
                createdAt:
                  value?.createdAt || null,
                updatedAt:
                  value?.updatedAt || null
              };
            }
          )
        );

      const executionEntries =
        await Promise.all(
          executionKeys.map(
            async (key) => {
              const raw =
                await AsyncStorage.getItem(
                  key
                );

              let value = null;

              try {
                value = raw
                  ? JSON.parse(raw)
                  : null;
              } catch {
                value = null;
              }

              const orders =
                Array.isArray(value?.orders)
                  ? value.orders
                  : [];

              return {
                key,
                exists:
                  raw !== null,
                parseable:
                  value !== null,
                executionId:
                  value?.id || null,
                executionMode:
                  value?.executionMode ||
                  null,
                status:
                  value?.status || null,
                orderCount:
                  orders.length,
                brokerReceivedCount:
                  orders.filter(
                    (order) =>
                      String(
                        order?.status || ""
                      ).toUpperCase() ===
                      "BROKER_RECEIVED"
                  ).length,
                partialFillCount:
                  orders.filter(
                    (order) =>
                      String(
                        order?.status || ""
                      ).toUpperCase() ===
                      "PARTIAL_FILL"
                  ).length,
                filledCount:
                  orders.filter(
                    (order) =>
                      String(
                        order?.status || ""
                      ).toUpperCase() ===
                      "FILLED"
                  ).length,
                createdAt:
                  value?.createdAt || null,
                updatedAt:
                  value?.updatedAt || null
              };
            }
          )
        );

      const namespaceFromKey = (
        key,
        suffix
      ) =>
        String(key || "")
          .replace(/^gatecep:/, "")
          .replace(
            new RegExp(
              `:${suffix}$`
            ),
            ""
          );

      const practiceNamespaces =
        practiceEntries.map(
          (item) =>
            namespaceFromKey(
              item.key,
              "practicePortfolio"
            )
        );

      const executionNamespaces =
        executionEntries.map(
          (item) =>
            namespaceFromKey(
              item.key,
              "activeBasketExecution"
            )
        );

      const sharedNamespaces =
        practiceNamespaces.filter(
          (namespace) =>
            executionNamespaces.includes(
              namespace
            )
        );

      const evidence = {
        gatecepKeyCount:
          gatecepKeys.length,

        practiceEntries,

        executionEntries,

        practiceNamespaces,

        executionNamespaces,

        sharedNamespaces
      };

      setPracticeNamespaceEvidence(
        evidence
      );

      console.log(
        "PC-031B4M7C5D5 PRACTICE NAMESPACE EVIDENCE",
        evidence
      );

      Alert.alert(
        "Practice Namespace Evidence",
        `Practice portfolio namespaces: ${practiceNamespaces.length}

Execution namespaces: ${executionNamespaces.length}

Shared namespaces: ${sharedNamespaces.length}

No storage value was changed.`
      );
    } catch (error) {
      console.error(
        "Practice namespace inspection failed:",
        error
      );

      Alert.alert(
        "Namespace Inspection Failed",
        error?.message ||
          "Runtime storage could not be inspected."
      );
    }
  }

  async function inspectPracticeIdentity() {
    try {
      /*
       * Read authenticated session identity directly.
       *
       * Compatibility storage helpers are deliberately
       * excluded because legacy reads may migrate data.
       */
      const authUser =
        await getStoredUser();

      const backendUserId =
        String(
          authUser?.id || ""
        )
          .trim()
          .toLowerCase();

      const allKeys =
        await AsyncStorage.getAllKeys();

      const gatecepKeys =
        allKeys
          .filter((key) =>
            String(key || "").startsWith(
              "gatecep:"
            )
          )
          .sort();

      const canonicalPrefix =
        backendUserId
          ? `gatecep:${backendUserId}:`
          : null;

      const canonicalPracticeKey =
        canonicalPrefix
          ? `${canonicalPrefix}practicePortfolio`
          : null;

      const canonicalExecutionKey =
        canonicalPrefix
          ? `${canonicalPrefix}activeBasketExecution`
          : null;

      const practiceExists =
        canonicalPracticeKey
          ? gatecepKeys.includes(
              canonicalPracticeKey
            )
          : false;

      const executionExists =
        canonicalExecutionKey
          ? gatecepKeys.includes(
              canonicalExecutionKey
            )
          : false;

      let practice = null;
      let execution = null;

      if (practiceExists) {
        const raw =
          await AsyncStorage.getItem(
            canonicalPracticeKey
          );

        try {
          practice =
            raw ? JSON.parse(raw) : null;
        } catch {
          practice = null;
        }
      }

      if (executionExists) {
        const raw =
          await AsyncStorage.getItem(
            canonicalExecutionKey
          );

        try {
          execution =
            raw ? JSON.parse(raw) : null;
        } catch {
          execution = null;
        }
      }

      const executionOrders =
        Array.isArray(execution?.orders)
          ? execution.orders
          : [];

      const brokerReceivedCount =
        executionOrders.filter(
          (order) =>
            String(
              order?.status || ""
            ).toUpperCase() ===
            "BROKER_RECEIVED"
        ).length;

      const partialFillCount =
        executionOrders.filter(
          (order) =>
            String(
              order?.status || ""
            ).toUpperCase() ===
            "PARTIAL_FILL"
        ).length;

      const filledCount =
        executionOrders.filter(
          (order) =>
            String(
              order?.status || ""
            ).toUpperCase() ===
            "FILLED"
        ).length;

      const activePractice =
        practice?.status === "ACTIVE";

      const practiceExecution =
        String(
          execution?.executionMode || ""
        ).toUpperCase() === "PRACTICE";

      const ready =
        Boolean(backendUserId) &&
        practiceExists &&
        executionExists &&
        activePractice &&
        practiceExecution &&
        (
          brokerReceivedCount +
          partialFillCount
        ) > 0;

      const evidence = {
        authenticated:
          Boolean(backendUserId),

        userIdDisplay:
          backendUserId
            ? `${backendUserId.slice(0, 8)}…${backendUserId.slice(-4)}`
            : "NONE",

        practiceExists,
        executionExists,

        practiceStatus:
          practice?.status || null,

        practiceHoldings:
          Array.isArray(practice?.holdings)
            ? practice.holdings.length
            : 0,

        practiceCash:
          Number(
            practice?.availableCash || 0
          ),

        capitalModel:
          practice?.capitalModel || null,

        executionMode:
          execution?.executionMode || null,

        executionOrderCount:
          executionOrders.length,

        brokerReceivedCount,
        partialFillCount,
        filledCount,

        ready
      };

      setPracticeIdentityEvidence(
        evidence
      );

      console.log(
        "PC-031B4M7C5D7B2 PRACTICE IDENTITY CORRELATION",
        evidence
      );

      Alert.alert(
        "Practice Settlement Identity",
        `Authenticated backend user: ${evidence.authenticated ? "YES" : "NO"}

Current-user Practice portfolio: ${practiceExists ? "FOUND" : "MISSING"}
Practice status: ${evidence.practiceStatus || "N/A"}
Practice cash: KES ${money(evidence.practiceCash)}

Current-user execution: ${executionExists ? "FOUND" : "MISSING"}
Execution mode: ${evidence.executionMode || "N/A"}
Broker received: ${brokerReceivedCount}
Partial fill: ${partialFillCount}
Filled: ${filledCount}

Settlement namespace ready: ${ready ? "YES" : "NO"}

READ ONLY — no migration, funding, settlement, or storage write was performed.`
      );
    } catch (error) {
      console.error(
        "Practice identity inspection failed:",
        error
      );

      setPracticeIdentityEvidence({
        ready: false,
        error:
          error?.message ||
          "IDENTITY_INSPECTION_FAILED"
      });

      Alert.alert(
        "Practice Identity Inspection Failed",
        error?.message ||
          "Current Practice identity could not be inspected."
      );
    }
  }

  async function inspectPracticePrefill() {
    const received = orders.filter((order) => {
      const statusView = statusViewFor(order);

      return (
        [
          ORDER_STATUS.BROKER_RECEIVED,
          ORDER_STATUS.PARTIAL_FILL
        ].includes(statusView.rawStatus) &&
        !statusView.isReal
      );
    });

    if (!received.length) {
      setPracticePrefillEvidence({
        ok: false,
        code: "NO_PRACTICE_ORDERS_READY",
        orderCount: 0
      });

      Alert.alert(
        "Practice Prefill Evidence",
        "No Practice broker-received orders are ready for preflight."
      );

      return;
    }

    const statuses =
      received.map((order) => ({
        id: order.id,
        symbol: order.symbol,
        status:
          statusViewFor(order).rawStatus,
        quantity:
          Number(order.quantity || 0),
        price:
          Number(order.price || 0)
      }));

    try {
      /*
       * D6B funding analysis is read-only and deliberately
       * continues across cash deficits so the complete basket
       * requirement can be shown.
       *
       * It does NOT replace the canonical fail-closed preflight
       * used by Fill Received.
       */
      const funding =
        await analyzeCanonicalPracticeExecutionFunding(
          received
        );

      const evidence = {
        ok:
          funding.additionalCashRequired <= 0,

        code:
          funding.additionalCashRequired > 0
            ? "INSUFFICIENT_PRACTICE_CASH"
            : "AFFORDABLE",

        orderCount:
          received.length,

        statuses,

        startingCash:
          Number(
            funding.startingCash || 0
          ),

        totalBuyCost:
          Number(
            funding.totalBuyCost || 0
          ),

        totalSellProceeds:
          Number(
            funding.totalSellProceeds || 0
          ),

        additionalCashRequired:
          Number(
            funding
              .additionalCashRequired || 0
          ),

        projectedEndingCash:
          Number(
            funding.projectedEndingCash || 0
          ),

        failingOrderId:
          funding
            .firstBlockedOrder
            ?.orderId || null,

        failingSymbol:
          funding
            .firstBlockedOrder
            ?.symbol || null,

        requiredCash:
          Number(
            funding
              .firstBlockedOrder
              ?.requiredCash || 0
          ),

        availableCash:
          Number(
            funding
              .firstBlockedOrder
              ?.availableCash || 0
          ),

        estimates:
          funding.estimates || []
      };

      setPracticePrefillEvidence(
        evidence
      );

      console.log(
        "PC-031B4M7C5D6B PRACTICE FULL-BATCH FUNDING EVIDENCE",
        evidence
      );

      if (
        evidence.additionalCashRequired > 0
      ) {
        Alert.alert(
          "Practice Prefill — Funds Required",
          `${received.length} Practice orders were inspected.

Starting cash: KES ${money(evidence.startingCash)}
Total BUY cost incl. fees: KES ${money(evidence.totalBuyCost)}
Total SELL net proceeds: KES ${money(evidence.totalSellProceeds)}
Additional Practice cash required: KES ${money(evidence.additionalCashRequired)}
Projected cash after complete batch: KES ${money(evidence.projectedEndingCash)}

First blocked order: ${evidence.failingSymbol || "N/A"}

No settlement or funding was performed.`
        );

        return;
      }

      /*
       * When the funding analysis says the complete batch is
       * affordable, prove that the actual canonical execution
       * preflight agrees. This remains read-only.
       */
      const result =
        await preflightCanonicalPracticeExecutionOrders(
          received
        );

      Alert.alert(
        "Practice Prefill — Affordable",
        `${received.length} Practice orders passed the canonical read-only preflight.

Starting cash: KES ${money(evidence.startingCash)}
Total BUY cost incl. fees: KES ${money(evidence.totalBuyCost)}
Total SELL net proceeds: KES ${money(evidence.totalSellProceeds)}
Additional Practice cash required: KES 0.00
Cash after batch: KES ${money(result.endingCash)}

No settlement was performed.`
      );
    } catch (error) {
      const evidence = {
        ok: false,

        code:
          error?.code ||
          error?.message ||
          "PREFLIGHT_FAILED",

        orderCount:
          received.length,

        statuses,

        requiredCash:
          Number(
            error?.requiredCash || 0
          ),

        availableCash:
          Number(
            error?.availableCash || 0
          ),

        failingOrderId:
          error?.orderId || null,

        failingSymbol:
          error?.symbol || null
      };

      setPracticePrefillEvidence(
        evidence
      );

      console.log(
        "PC-031B4M7C5D6B PRACTICE PREFILL FAILURE",
        evidence
      );

      Alert.alert(
        "Practice Prefill Failed",
        error?.message ||
          "Practice preflight could not be completed."
      );
    }
  }

  async function inspectPostSettlementValuation() {
    try {
      /*
       * PC-031B4M7C5D7E3B2
       *
       * Strictly read-only valuation reconciliation.
       *
       * Mirrors the canonical portfolio engine semantics
       * without calling a storage compatibility helper.
       */
      const authRaw =
        await AsyncStorage.getItem(
          "gatecep.auth.user"
        );

      let authUser = null;

      try {
        authUser =
          authRaw
            ? JSON.parse(authRaw)
            : null;
      } catch {
        authUser = null;
      }

      const userId =
        String(authUser?.id || "")
          .trim()
          .toLowerCase();

      if (!userId) {
        setPostSettlementValuationEvidence({
          error:
            "AUTHENTICATED_BACKEND_USER_ID_REQUIRED"
        });
        return;
      }

      const prefix =
        `gatecep:${userId}:`;

      const practiceKey =
        `${prefix}practicePortfolio`;

      const executionKey =
        `${prefix}activeBasketExecution`;

      const values =
        await AsyncStorage.multiGet([
          practiceKey,
          executionKey
        ]);

      const rawByKey =
        Object.fromEntries(values);

      function parseJson(raw, fallback) {
        try {
          return raw
            ? JSON.parse(raw)
            : fallback;
        } catch {
          return fallback;
        }
      }

      function n(value) {
        const parsed = Number(value);

        return Number.isFinite(parsed)
          ? parsed
          : 0;
      }

      function money2(value) {
        return (
          Math.round(
            (n(value) + Number.EPSILON) *
              100
          ) / 100
        );
      }

      const practice =
        parseJson(
          rawByKey[practiceKey],
          null
        );

      const execution =
        parseJson(
          rawByKey[executionKey],
          null
        );

      if (
        !practice ||
        practice?.status !== "ACTIVE"
      ) {
        setPostSettlementValuationEvidence({
          error:
            "ACTIVE_PRACTICE_PORTFOLIO_REQUIRED"
        });
        return;
      }

      const holdings =
        Array.isArray(practice?.holdings)
          ? practice.holdings
          : [];

      const orders =
        Array.isArray(execution?.orders)
          ? execution.orders
          : [];

      const filledOrders =
        orders.filter(
          (order) =>
            String(
              order?.status || ""
            ).toUpperCase() === "FILLED"
        );

      const filledSymbols =
        new Set(
          filledOrders.map(
            (order) =>
              String(
                order?.symbol || ""
              )
                .trim()
                .toUpperCase()
          )
        );

      const holdingValuationEvidence =
        holdings.map((holding) => {
          const symbol =
            String(
              holding?.symbol || ""
            )
              .trim()
              .toUpperCase();

          const quantity =
            n(holding?.quantity);

          const averageCost =
            n(
              holding?.averageCost ??
                holding?.averagePrice
            );

          const marketPrice =
            n(
              holding?.marketPrice ??
                holding?.price
            );

          const expectedInvestedValue =
            quantity * averageCost;

          const expectedMarketValue =
            quantity * marketPrice;

          /*
           * Per-holding investedValue/costValue is optional
           * legacy evidence. Absence must not be converted
           * into a fabricated zero-cost contradiction.
           *
           * Canonical cost basis remains:
           * quantity × average cost.
           */
          const storedInvestedRaw =
            holding?.investedValue ??
              holding?.costValue;

          const hasStoredInvestedValue =
            storedInvestedRaw !==
              null &&
            storedInvestedRaw !==
              undefined &&
            storedInvestedRaw !== "";

          const storedInvestedValue =
            hasStoredInvestedValue
              ? n(storedInvestedRaw)
              : null;

          const storedMarketValue =
            n(
              holding?.marketValue ??
                holding?.value
            );

          const investedDifference =
            hasStoredInvestedValue
              ? storedInvestedValue -
                expectedInvestedValue
              : null;

          const marketDifference =
            storedMarketValue -
            expectedMarketValue;

          const expectedGain =
            expectedMarketValue -
            expectedInvestedValue;

          const storedGain =
            n(
              holding?.profitLoss ??
                holding?.gain
            );

          /*
           * Stored fields may have been normalized at a
           * different point than Dashboard rendering.
           * Currency-level agreement is the invariant.
           */
          /*
           * Missing optional stored cost is DERIVED evidence,
           * not a failed reconciliation.
           *
           * If a stored value exists, it must reconcile.
           */
          const investedConsistent =
            !hasStoredInvestedValue ||
            Math.abs(
              money2(investedDifference)
            ) <= 0.01;

          const investedEvidenceStatus =
            hasStoredInvestedValue
              ? (
                  investedConsistent
                    ? "PASS"
                    : "CHECK"
                )
              : "DERIVED";

          const marketConsistent =
            Math.abs(
              money2(marketDifference)
            ) <= 0.01;

          return {
            symbol,
            quantity,
            averageCost,
            marketPrice,

            expectedInvestedValue,
            storedInvestedValue,
            hasStoredInvestedValue,
            investedDifference,
            investedEvidenceStatus,

            expectedMarketValue,
            storedMarketValue,
            marketDifference,

            expectedGain,
            storedGain,

            investedConsistent,
            marketConsistent,

            touchedByFilledBasket:
              filledSymbols.has(symbol)
          };
        });

      /*
       * These are the same aggregate semantics used by
       * calculatePortfolioSummary():
       *
       * totalValue    = sum calculated marketValue
       * investedValue = sum calculated investedValue
       * netWorth      = totalValue + cash
       * totalGain     = totalValue - investedValue
       */
      const calculatedHoldingsValue =
        holdingValuationEvidence.reduce(
          (sum, item) =>
            sum +
            item.expectedMarketValue,
          0
        );

      const calculatedInvestedValue =
        holdingValuationEvidence.reduce(
          (sum, item) =>
            sum +
            item.expectedInvestedValue,
          0
        );

      const availableCash =
        n(practice?.availableCash);

      const calculatedNetWorth =
        calculatedHoldingsValue +
        availableCash;

      const calculatedGain =
        calculatedHoldingsValue -
        calculatedInvestedValue;

      const storedHoldingsValue =
        n(practice?.holdingsValue);

      const storedInvestedAmount =
        n(
          practice?.investedAmount ??
            practice?.investedValue
        );

      const storedTotalValue =
        n(
          practice?.totalValue ??
            practice?.netWorth
        );

      const holdingsTotalConsistent =
        Math.abs(
          money2(
            storedHoldingsValue -
              calculatedHoldingsValue
          )
        ) <= 0.01;

      const investedTotalConsistent =
        Math.abs(
          money2(
            storedInvestedAmount -
              calculatedInvestedValue
          )
        ) <= 0.01;

      const netWorthConsistent =
        Math.abs(
          money2(
            storedTotalValue -
              calculatedNetWorth
          )
        ) <= 0.01;

      const allHoldingsConsistent =
        holdingValuationEvidence.every(
          (item) =>
            item.investedConsistent &&
            item.marketConsistent
        );

      const filledSymbolsRepresented =
        filledSymbols.size > 0 &&
        [...filledSymbols].every(
          (symbol) =>
            holdingValuationEvidence.some(
              (item) =>
                item.symbol === symbol
            )
        );

      const overallPass =
        holdings.length > 0 &&
        filledOrders.length > 0 &&
        allHoldingsConsistent &&
        holdingsTotalConsistent &&
        investedTotalConsistent &&
        netWorthConsistent &&
        filledSymbolsRepresented;

      setPostSettlementValuationEvidence({
        error: null,

        userIdDisplay:
          userId.length > 12
            ? `${userId.slice(
                0,
                8
              )}…${userId.slice(-4)}`
            : userId,

        holdingCount:
          holdings.length,

        filledOrderCount:
          filledOrders.length,

        filledSymbolCount:
          filledSymbols.size,

        availableCash,

        calculatedHoldingsValue,
        storedHoldingsValue,

        calculatedInvestedValue,
        storedInvestedAmount,

        calculatedNetWorth,
        storedTotalValue,

        calculatedGain,

        allHoldingsConsistent,
        holdingsTotalConsistent,
        investedTotalConsistent,
        netWorthConsistent,
        filledSymbolsRepresented,
        overallPass,

        holdingValuationEvidence
      });
    } catch (error) {
      console.error(
        "Post-settlement valuation inspection failed:",
        error
      );

      setPostSettlementValuationEvidence({
        error:
          error?.message ||
          "POST_SETTLEMENT_VALUATION_INSPECTION_FAILED"
      });
    }
  }

  async function releaseClosedPracticeExecutionForUAT() {
    const currentExecution = execution;

    const currentOrders =
      Array.isArray(currentExecution?.orders)
        ? currentExecution.orders
        : [];

    const currentMode =
      String(
        currentExecution?.executionMode || ""
      ).toUpperCase();

    const allFilled =
      currentOrders.length > 0 &&
      currentOrders.every(
        (order) =>
          String(
            order?.status || ""
          ).toUpperCase() === "FILLED"
      );

    if (
      !currentExecution?.id ||
      currentMode !== "PRACTICE" ||
      !allFilled
    ) {
      Alert.alert(
        "Release Blocked",
        "J2B UAT release requires the current PRACTICE execution to contain only FILLED orders."
      );
      return;
    }

    const title =
      "Release Closed Practice Execution";

    const message =
      `Release ${currentExecution.id} from the active OMS slot?\n\n` +
      "The hardened central release boundary will verify closure and durable Practice archive first. " +
      "This UAT action does not route, fill, settle, fund, or create a new basket.";

    const executeRelease =
      async () => {
        try {
          setPracticeExecutionReleaseEvidence(
            null
          );

          /*
           * The ONLY release mutation authority in this
           * UAT handler.
           */
          const released =
            await clearBasketExecution();

          /*
           * Keep the released execution out of local observer
           * state while post-release evidence is collected.
           *
           * Queue Manager and the other OMS observer screens
           * load persisted execution state only; they do not
           * create replacement executions.
           */
          setExecution(null);

          const authRaw =
            await AsyncStorage.getItem(
              "gatecep.auth.user"
            );

          let authUser = null;

          try {
            authUser =
              authRaw
                ? JSON.parse(authRaw)
                : null;
          } catch {
            authUser = null;
          }

          const userId =
            String(authUser?.id || "")
              .trim()
              .toLowerCase();

          if (!userId) {
            setPracticeExecutionReleaseEvidence({
              error:
                "AUTHENTICATED_BACKEND_USER_ID_REQUIRED_AFTER_RELEASE"
            });
            return;
          }

          const prefix =
            `gatecep:${userId}:`;

          const executionKey =
            `${prefix}activeBasketExecution`;

          const historyKey =
            `${prefix}practiceExecutionHistory`;

          const values =
            await AsyncStorage.multiGet([
              executionKey,
              historyKey
            ]);

          const rawByKey =
            Object.fromEntries(values);

          function parseJson(
            raw,
            fallback
          ) {
            try {
              return raw
                ? JSON.parse(raw)
                : fallback;
            } catch {
              return fallback;
            }
          }

          const activeRaw =
            rawByKey[executionKey];

          const historyRaw =
            parseJson(
              rawByKey[historyKey],
              []
            );

          const history =
            Array.isArray(historyRaw)
              ? historyRaw
              : [];

          const releasedExecutionId =
            String(
              released?.id ||
                currentExecution.id ||
                ""
            );

          const matchingRecords =
            history.filter(
              (record) =>
                String(
                  record?.executionId ||
                    record?.id ||
                    ""
                ) ===
                releasedExecutionId
            );

          const archivedExecution =
            matchingRecords[0]
              ?.execution || null;

          const archivedOrders =
            Array.isArray(
              archivedExecution?.orders
            )
              ? archivedExecution.orders
              : [];

          const archivedFilled =
            archivedOrders.filter(
              (order) =>
                String(
                  order?.status || ""
                ).toUpperCase() ===
                "FILLED"
            );

          const activeSlotReleased =
            activeRaw === null ||
            activeRaw === undefined ||
            String(activeRaw).trim() ===
              "";

          /*
           * PC-031B4M7C5D7H6A
           *
           * Release evidence is scoped to the execution that
           * was just released.
           *
           * The investor may legitimately have multiple
           * historical Practice execution archives. Therefore
           * total archive cardinality is observational only.
           *
           * Exactly one archive must match this released
           * execution ID.
           */
          const releasePass =
            activeSlotReleased &&
            matchingRecords.length === 1 &&
            String(
              archivedExecution
                ?.executionMode || ""
            ).toUpperCase() ===
              "PRACTICE" &&
            archivedOrders.length === 2 &&
            archivedFilled.length === 2;

          setPracticeExecutionReleaseEvidence({
            error: null,
            releasedExecutionId,
            releasedMode:
              released?.executionMode ||
              currentExecution
                ?.executionMode ||
              null,
            activeSlotReleased,
            totalArchiveRecords:
              history.length,
            matchingArchiveRecords:
              matchingRecords.length,
            archivedOrderCount:
              archivedOrders.length,
            archivedFilledCount:
              archivedFilled.length,
            releasePass
          });
        } catch (error) {
          console.error(
            "Closed Practice execution release failed:",
            error
          );

          setPracticeExecutionReleaseEvidence({
            error:
              error?.code ||
              error?.message ||
              "PRACTICE_EXECUTION_RELEASE_FAILED"
          });
        }
      };

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof window.confirm === "function"
    ) {
      if (
        !window.confirm(
          `${title}\n\n${message}`
        )
      ) {
        return;
      }

      await executeRelease();
      return;
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Release",
          style: "destructive",
          onPress: executeRelease
        }
      ]
    );
  }

  async function inspectPracticeExecutionArchive() {
    try {
      /*
       * PC-031B4M7C5D7F5K1A
       *
       * Strictly read-only.
       *
       * Direct AsyncStorage reads deliberately avoid userGetItem()
       * and other compatibility helpers that may perform migration.
       *
       * This inspector has no routing, fill, settlement, archive,
       * clear, portfolio, funding, history-repair, or REAL authority.
       */
      const authRaw =
        await AsyncStorage.getItem(
          "gatecep.auth.user"
        );

      let authUser = null;

      try {
        authUser =
          authRaw
            ? JSON.parse(authRaw)
            : null;
      } catch {
        authUser = null;
      }

      const userId =
        String(authUser?.id || "")
          .trim()
          .toLowerCase();

      if (!userId) {
        setPracticeExecutionArchiveEvidence({
          error:
            "AUTHENTICATED_BACKEND_USER_ID_REQUIRED"
        });
        return;
      }

      const prefix =
        `gatecep:${userId}:`;

      const executionKey =
        `${prefix}activeBasketExecution`;

      const historyKey =
        `${prefix}practiceExecutionHistory`;

      const values =
        await AsyncStorage.multiGet([
          executionKey,
          historyKey
        ]);

      const rawByKey =
        Object.fromEntries(values);

      function parseJson(raw, fallback) {
        try {
          return raw
            ? JSON.parse(raw)
            : fallback;
        } catch {
          return fallback;
        }
      }

      const execution =
        parseJson(
          rawByKey[executionKey],
          null
        );

      const historyRaw =
        parseJson(
          rawByKey[historyKey],
          []
        );

      const history =
        Array.isArray(historyRaw)
          ? historyRaw
          : [];

      const executionId =
        String(
          execution?.id || ""
        );

      const liveOrders =
        Array.isArray(execution?.orders)
          ? execution.orders
          : [];

      const matchingRecords =
        executionId
          ? history.filter(
              (record) =>
                String(
                  record?.executionId ||
                    record?.id ||
                    ""
                ) === executionId
            )
          : [];

      const archivedExecution =
        matchingRecords[0]?.execution ||
        null;

      const archivedOrders =
        Array.isArray(
          archivedExecution?.orders
        )
          ? archivedExecution.orders
          : [];

      const liveFilled =
        liveOrders.filter(
          (order) =>
            String(
              order?.status || ""
            ).toUpperCase() ===
            "FILLED"
        );

      const archivedFilled =
        archivedOrders.filter(
          (order) =>
            String(
              order?.status || ""
            ).toUpperCase() ===
            "FILLED"
        );

      const archivedSymbolCount =
        (symbol) =>
          archivedOrders.filter(
            (order) =>
              String(
                order?.symbol || ""
              ).toUpperCase() ===
              symbol
          ).length;

      const liveMode =
        String(
          execution?.executionMode || ""
        ).toUpperCase();

      const archivedMode =
        String(
          archivedExecution
            ?.executionMode || ""
        ).toUpperCase();

      const archivePass =
        Boolean(executionId) &&
        liveMode === "PRACTICE" &&
        liveOrders.length === 2 &&
        liveFilled.length === 2 &&
        matchingRecords.length === 1 &&
        archivedMode === "PRACTICE" &&
        archivedOrders.length === 2 &&
        archivedFilled.length === 2 &&
        archivedSymbolCount("SCOM") ===
          1 &&
        archivedSymbolCount("BAMB") ===
          1;

      setPracticeExecutionArchiveEvidence({
        error: null,

        userIdDisplay:
          userId.length > 12
            ? `${userId.slice(
                0,
                8
              )}…${userId.slice(-4)}`
            : userId,

        executionKeyPresent:
          rawByKey[executionKey] !==
            null &&
          rawByKey[executionKey] !==
            undefined,

        historyKeyPresent:
          rawByKey[historyKey] !==
            null &&
          rawByKey[historyKey] !==
            undefined,

        executionId:
          executionId || null,

        liveExecutionMode:
          liveMode || null,

        liveOrderCount:
          liveOrders.length,

        liveFilledCount:
          liveFilled.length,

        totalArchiveRecords:
          history.length,

        matchingArchiveRecords:
          matchingRecords.length,

        archivedExecutionMode:
          archivedMode || null,

        archivedOrderCount:
          archivedOrders.length,

        archivedFilledCount:
          archivedFilled.length,

        archivedSCOMCount:
          archivedSymbolCount(
            "SCOM"
          ),

        archivedBAMBCount:
          archivedSymbolCount(
            "BAMB"
          ),

        archivePass
      });
    } catch (error) {
      console.error(
        "Practice execution archive inspection failed:",
        error
      );

      setPracticeExecutionArchiveEvidence({
        error:
          error?.message ||
          "PRACTICE_EXECUTION_ARCHIVE_INSPECTION_FAILED"
      });
    }
  }

  async function inspectPostSettlementIntegrity() {
    try {
      /*
       * PC-031B4M7C5D7E2C
       *
       * Strictly read-only post-settlement evidence.
       * Direct AsyncStorage reads avoid compatibility
       * helpers that may perform legacy migration.
       */
      const authRaw =
        await AsyncStorage.getItem(
          "gatecep.auth.user"
        );

      let authUser = null;

      try {
        authUser =
          authRaw
            ? JSON.parse(authRaw)
            : null;
      } catch {
        authUser = null;
      }

      const userId =
        String(authUser?.id || "")
          .trim()
          .toLowerCase();

      if (!userId) {
        setPostSettlementEvidence({
          error:
            "AUTHENTICATED_BACKEND_USER_ID_REQUIRED"
        });
        return;
      }

      const prefix =
        `gatecep:${userId}:`;

      const keys = {
        practice:
          `${prefix}practicePortfolio`,
        history:
          `${prefix}practiceSimulatedTrades`,
        execution:
          `${prefix}activeBasketExecution`,
        realCash:
          `${prefix}availableCash`,
        realPortfolio:
          `${prefix}portfolio`
      };

      const values =
        await AsyncStorage.multiGet(
          Object.values(keys)
        );

      const rawByKey =
        Object.fromEntries(values);

      function parseJson(raw, fallback) {
        try {
          return raw
            ? JSON.parse(raw)
            : fallback;
        } catch {
          return fallback;
        }
      }

      const practice =
        parseJson(
          rawByKey[keys.practice],
          null
        );

      const history =
        parseJson(
          rawByKey[keys.history],
          []
        );

      const execution =
        parseJson(
          rawByKey[keys.execution],
          null
        );

      const settlements =
        practice?.practiceSettlements &&
        typeof practice.practiceSettlements ===
          "object" &&
        !Array.isArray(
          practice.practiceSettlements
        )
          ? practice.practiceSettlements
          : {};

      const executionOrders =
        Array.isArray(execution?.orders)
          ? execution.orders
          : [];

      const practiceHistory =
        Array.isArray(history)
          ? history
          : [];

      const orderEvidence =
        executionOrders.map((order) => {
          const orderId =
            String(order?.id || "");

          const marker =
            settlements[orderId] || null;

          const historyMatches =
            practiceHistory.filter(
              (trade) =>
                String(
                  trade?.executionOrderId ||
                    ""
                ) === orderId
            );

          return {
            id: orderId,

            symbol:
              String(
                order?.symbol || "N/A"
              ).toUpperCase(),

            status:
              String(
                order?.status || "UNKNOWN"
              ).toUpperCase(),

            settlementApplied:
              marker?.applied === true,

            accountingApplied:
              marker?.practiceAccounting
                ?.applied === true,

            markerHasTrade:
              Boolean(
                marker?.simulatedTrade
                  ?.executionOrderId
              ),

            historyCount:
              historyMatches.length,

            omsAccountingApplied:
              order?.practiceAccounting
                ?.applied === true
          };
        });

      const filledOrders =
        orderEvidence.filter(
          (item) =>
            item.status === "FILLED"
        );

      const fullyCorrelated =
        filledOrders.length > 0 &&
        filledOrders.every(
          (item) =>
            item.settlementApplied &&
            item.accountingApplied &&
            item.markerHasTrade &&
            item.historyCount === 1 &&
            item.omsAccountingApplied
        );

      setPostSettlementEvidence({
        error: null,

        userIdDisplay:
          userId.length > 12
            ? `${userId.slice(
                0,
                8
              )}…${userId.slice(-4)}`
            : userId,

        practiceStatus:
          practice?.status || null,

        practiceCash:
          Number(
            practice?.availableCash || 0
          ),

        practiceHoldings:
          Array.isArray(
            practice?.holdings
          )
            ? practice.holdings.length
            : 0,

        settlementCount:
          Object.values(
            settlements
          ).filter(
            (marker) =>
              marker?.applied === true
          ).length,

        historyCount:
          practiceHistory.length,

        executionMode:
          execution?.executionMode ||
          null,

        executionOrderCount:
          executionOrders.length,

        filledCount:
          filledOrders.length,

        fullyCorrelated,

        orderEvidence,

        realCashKeyPresent:
          rawByKey[keys.realCash] !==
            null &&
          rawByKey[keys.realCash] !==
            undefined,

        realPortfolioKeyPresent:
          rawByKey[keys.realPortfolio] !==
            null &&
          rawByKey[keys.realPortfolio] !==
            undefined
      });
    } catch (error) {
      console.error(
        "Post-settlement inspection failed:",
        error
      );

      setPostSettlementEvidence({
        error:
          error?.message ||
          "POST_SETTLEMENT_INSPECTION_FAILED"
      });
    }
  }

  async function executeBrokerReceivedFills(
    received
  ) {
    let latest = execution;

    /*
     * PC-031B4M7C3 / D7D3B
     *
     * Native and web confirmation paths converge here.
     *
     * The complete Practice batch is preflighted before
     * the first settlement. Economic mutation remains
     * owned by markExecutionOrderFilled().
     */
    await preflightCanonicalPracticeExecutionOrders(
      received
    );

    for (const order of received) {
      latest =
        await markExecutionOrderFilled(
          order.id,
          {
            symbol: order.symbol,
            side: order.side,
            quantity: order.quantity,
            price: order.price,
            brokerId: order.brokerId,
            brokerName: order.brokerName,
            brokerOrderId:
              order.brokerOrderId,
            filledAt:
              new Date().toISOString(),
            source:
              "GATECEP_BROKER_PRACTICE"
          }
        );
    }

    setExecution(latest);
  }

  async function runConfirmedBrokerReceivedFills(
    received
  ) {
    try {
      await executeBrokerReceivedFills(
        received
      );
    } catch (error) {
      console.error(
        "Practice Fill Received failed:",
        error
      );

      if (
        error?.code ===
        "INSUFFICIENT_PRACTICE_CASH"
      ) {
        Alert.alert(
          "Practice Funds Required",
          "The complete Practice fill batch is no longer affordable. Recheck Practice Prefill before settlement."
        );

        return;
      }

      Alert.alert(
        "Practice Fill Failed",
        error?.message ||
          "The Practice orders could not be filled."
      );
    }
  }

  async function fillBrokerReceivedOrders() {
    const received = orders.filter((order) => {
      const statusView = statusViewFor(order);

      return (
        [
          ORDER_STATUS.BROKER_RECEIVED,
          ORDER_STATUS.PARTIAL_FILL
        ].includes(statusView.rawStatus) &&
        !statusView.isReal
      );
    });

    if (!received.length) {
      Alert.alert(
        "No Broker Received Orders",
        "No broker received orders are ready to fill."
      );
      return;
    }

    const message =
      `${received.length} broker-received orders ` +
      "will be marked as filled.";

    /*
     * React Native Alert button callbacks are not a
     * reliable confirmation boundary on Expo Web.
     *
     * Web uses the browser confirmation dialog.
     * Native retains Alert.alert().
     *
     * Confirmation itself performs no settlement.
     */
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      const confirmed =
        window.confirm(
          `Mark Filled\n\n${message}`
        );

      if (!confirmed) {
        return;
      }

      await runConfirmedBrokerReceivedFills(
        received
      );

      return;
    }

    Alert.alert(
      "Mark Filled",
      message,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Fill",
          onPress: () => {
            void runConfirmedBrokerReceivedFills(
              received
            );
          }
        }
      ]
    );
  }

  async function markPartial(order) {
    const statusView = statusViewFor(order);

    if (statusView.isReal) {
      Alert.alert(
        "Verified Broker Evidence Required",
        "REAL orders cannot be manually marked as partially filled. GateCEP must receive genuine broker execution evidence."
      );
      return;
    }

    const filledQty = Math.max(1, Math.floor(Number(order.quantity || 0) / 2));

    const updated = await markExecutionOrderPartial(order.id, {
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      price: order.price,
      filledQuantity: filledQty,
      remainingQuantity:
        Number(order.quantity || 0) - filledQty,
      message:
        `Partial fill: ${filledQty}/${order.quantity}`,
      source: "GATECEP_BROKER_PRACTICE"
    });

    setExecution(updated);
  }

  if (!execution || !orders.length) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Order Queue</Text>

        <Text style={styles.subtitle}>
          No active OMS queue found. Create a basket first.
        </Text>

        {practiceExecutionReleaseEvidence ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Practice Execution Release — UAT
            </Text>

            {practiceExecutionReleaseEvidence.error ? (
              <Text style={styles.reason}>
                {
                  practiceExecutionReleaseEvidence
                    .error
                }
              </Text>
            ) : (
              <>
                <Text style={styles.body}>
                  Result:{" "}
                  {
                    practiceExecutionReleaseEvidence
                      .releasePass
                      ? "PASS"
                      : "CHECK"
                  }
                </Text>

                <Text style={styles.body}>
                  Released execution:{" "}
                  {
                    practiceExecutionReleaseEvidence
                      .releasedExecutionId
                  }
                </Text>

                <Text style={styles.body}>
                  Released mode:{" "}
                  {
                    practiceExecutionReleaseEvidence
                      .releasedMode
                  }
                </Text>

                <Text style={styles.body}>
                  Active OMS slot released:{" "}
                  {
                    practiceExecutionReleaseEvidence
                      .activeSlotReleased
                      ? "YES"
                      : "NO"
                  }
                </Text>

                <Text style={styles.body}>
                  Total archive records:{" "}
                  {
                    practiceExecutionReleaseEvidence
                      .totalArchiveRecords
                  }
                </Text>

                <Text style={styles.body}>
                  Matching execution archives:{" "}
                  {
                    practiceExecutionReleaseEvidence
                      .matchingArchiveRecords
                  }
                </Text>

                <Text style={styles.body}>
                  Archived orders:{" "}
                  {
                    practiceExecutionReleaseEvidence
                      .archivedOrderCount
                  }
                </Text>

                <Text style={styles.body}>
                  Archived FILLED:{" "}
                  {
                    practiceExecutionReleaseEvidence
                      .archivedFilledCount
                  }
                </Text>
              </>
            )}

            <Text style={styles.reason}>
              POST-RELEASE UAT EVIDENCE — the active OMS slot
              remains empty. No execution is recreated by this
              evidence view.
            </Text>
          </View>
        ) : null}

        <Pressable
          style={styles.primary}
          onPress={() => router.push("/trade-basket")}
        >
          <Text style={styles.primaryText}>Open Trade Basket</Text>
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.secondaryText}>Dashboard</Text>
        </Pressable>
      </ScrollView>
    );
  }

  /*
   * PC-031B4M7C5D7F4D
   *
   * Explicit UAT/recovery entry into the persisted D7F2
   * Practice execution orchestrator.
   *
   * This handler owns no OMS transition, broker routing,
   * settlement, portfolio write or history write.
   */
  async function resumeAutomaticPracticeExecution() {
    try {
      const result =
        await resumePracticeExecutionOrchestrator();

      if (result?.execution) {
        setExecution(result.execution);
      } else {
        await load();
      }

      Alert.alert(
        "Practice Execution Resume",
        result?.state === "COMPLETE"
          ? "Persisted Practice execution completed through the automatic orchestrator."
          : `Practice execution resume finished with state ${String(
              result?.state || "UNKNOWN"
            )}.`
      );
    } catch (error) {
      console.error(
        "PRACTICE_EXECUTION_ORCHESTRATOR_RESUME_FAILED",
        {
          name: error?.name || null,
          code: error?.code || null,
          message: error?.message || String(error),
          orderId: error?.orderId || null,
          status: error?.status || null,
          preflight: error?.preflight || null,
          stack: error?.stack || null
        }
      );

      await load();

      const required =
        Number(
          error?.preflight?.additionalCashRequired ||
            error?.additionalCashRequired ||
            0
        );

      Alert.alert(
        "Practice Execution Resume Failed",
        required > 0
          ? `${error?.message || "Practice execution paused."}\nAdditional Practice cash required: KES ${required.toFixed(
              2
            )}`
          : error?.message ||
              "Practice execution paused. Inspect the browser console for the recorded orchestrator error."
      );
    }
  }



  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Queue Manager</Text>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        Practice-only lifecycle simulator. It does not call broker adapters or create REAL execution evidence.
      </Text>

      <ActiveUserBanner />

      {realRecoveryOrders.length > 0 ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#a16207",
            backgroundColor: "#221a09",
            borderRadius: 14,
            padding: 14,
            marginBottom: 14
          }}
        >
          <Text
            style={{
              color: "#facc15",
              fontWeight: "800",
              fontSize: 16,
              marginBottom: 6
            }}
          >
            REAL Broker Reconciliation Required
          </Text>

          <Text
            style={{
              color: "#d6c9a4",
              lineHeight: 19,
              marginBottom: 10
            }}
          >
            {realRecoveryOrders.length} REAL order
            {realRecoveryOrders.length === 1 ? "" : "s"} require broker-evidence
            reconciliation. This may include an uncertain submission or a
            verified partial execution. Do not manually fill, retry, or
            resubmit them while recovery is required.
          </Text>

          <Pressable
            style={styles.primary}
            onPress={() => router.push("/real-order-recovery")}
          >
            <Text style={styles.primaryText}>
              Review REAL Submission Recovery
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.flowCard}>
        <Text style={styles.cardTitle}>Lifecycle Flow</Text>

        {FLOW.map((status, index) => (
          <View key={status} style={styles.flowRow}>
            <View style={styles.flowStep}>
              <Text style={styles.flowStepText}>{index + 1}</Text>
            </View>

            <Text style={styles.flowLabel}>{status}</Text>

            <Text style={styles.flowCount}>{counts[status] || 0}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionGrid}>
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/orders-review")}
        >
          <Text style={styles.actionText}>Review Orders</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/(tabs)/trading")}
        >
          <Text style={styles.actionText}>Broker Routing</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/orders")}
        >
          <Text style={styles.actionText}>OMS Orders</Text>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={routeQueuedOrders}>
          <Text style={styles.actionText}>Route Queued</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={inspectPracticeNamespace}
        >
          <Text style={styles.actionText}>
            Inspect Practice Storage
          </Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={inspectPracticePrefill}
        >
          <Text style={styles.actionText}>
            Inspect Practice Prefill
          </Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={inspectPracticeIdentity}
        >
          <Text style={styles.actionText}>
            Inspect Settlement Identity
          </Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={inspectPostSettlementValuation}
        >
          <Text style={styles.actionText}>
            Inspect Post-Settlement Valuation
          </Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={inspectPostSettlementIntegrity}
        >
          <Text style={styles.actionText}>
            Inspect Post-Settlement Integrity
          </Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={inspectPracticeExecutionArchive}
        >
          <Text style={styles.actionText}>
            Inspect Practice Execution Archive
          </Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={releaseClosedPracticeExecutionForUAT}
        >
          <Text style={styles.actionText}>
            Release Closed Practice Execution — UAT
          </Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={fillBrokerReceivedOrders}
        >
          <Text style={styles.actionText}>Fill Received</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => router.push("/basket-execution")}
        >
          <Text style={styles.actionText}>Basket Execution</Text>
        </Pressable>

          <Pressable
            onPress={resumeAutomaticPracticeExecution} style={styles.primary}
          >
            <Text style={styles.buttonText}>
              Resume Automatic Practice Execution
            </Text>
          </Pressable>

      </View>

      {practiceNamespaceEvidence ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Practice Storage Evidence
          </Text>

          <Text style={styles.body}>
            Practice namespaces:{" "}
            {
              practiceNamespaceEvidence
                .practiceNamespaces.length
            }
          </Text>

          <Text style={styles.body}>
            Execution namespaces:{" "}
            {
              practiceNamespaceEvidence
                .executionNamespaces.length
            }
          </Text>

          <Text style={styles.body}>
            Shared namespaces:{" "}
            {
              practiceNamespaceEvidence
                .sharedNamespaces.length
            }
          </Text>

          {practiceNamespaceEvidence
            .practiceEntries.map(
              (item) => (
                <View
                  key={item.key}
                  style={styles.card}
                >
                  <Text style={styles.small}>
                    PRACTICE KEY: {item.key}
                  </Text>

                  <Text style={styles.small}>
                    Status:{" "}
                    {item.status || "NONE"}
                    {" • "}
                    Holdings:{" "}
                    {item.holdingsCount}
                  </Text>

                  <Text style={styles.small}>
                    Cash: KES{" "}
                    {money(
                      item.availableCash
                    )}
                  </Text>

                  <Text style={styles.small}>
                    Capital model:{" "}
                    {item.capitalModel ||
                      "NONE"}
                  </Text>
                </View>
              )
            )}

          {practiceNamespaceEvidence
            .executionEntries.map(
              (item) => (
                <View
                  key={item.key}
                  style={styles.card}
                >
                  <Text style={styles.small}>
                    EXECUTION KEY: {item.key}
                  </Text>

                  <Text style={styles.small}>
                    Mode:{" "}
                    {item.executionMode ||
                      "NONE"}
                    {" • "}
                    Orders:{" "}
                    {item.orderCount}
                  </Text>

                  <Text style={styles.small}>
                    BROKER_RECEIVED:{" "}
                    {
                      item
                        .brokerReceivedCount
                    }
                    {" • "}
                    PARTIAL_FILL:{" "}
                    {
                      item.partialFillCount
                    }
                    {" • "}
                    FILLED:{" "}
                    {item.filledCount}
                  </Text>
                </View>
              )
            )}

          <Text style={styles.reason}>
            READ ONLY — direct AsyncStorage
            inspection. No migration, settlement,
            funding, or portfolio mutation.
          </Text>
        </View>
      ) : null}

      {practiceIdentityEvidence ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Practice Settlement Identity
          </Text>

          {practiceIdentityEvidence.error ? (
            <Text style={styles.body}>
              Result:{" "}
              {practiceIdentityEvidence.error}
            </Text>
          ) : (
            <>
              <Text style={styles.body}>
                Authenticated backend user:{" "}
                {practiceIdentityEvidence.authenticated
                  ? "YES"
                  : "NO"}
              </Text>

              <Text style={styles.body}>
                User ID:{" "}
                {practiceIdentityEvidence.userIdDisplay}
              </Text>

              <Text style={styles.body}>
                Current-user Practice key:{" "}
                {practiceIdentityEvidence.practiceExists
                  ? "FOUND"
                  : "MISSING"}
              </Text>

              <Text style={styles.body}>
                Practice status:{" "}
                {practiceIdentityEvidence.practiceStatus ||
                  "N/A"}
              </Text>

              <Text style={styles.body}>
                Holdings:{" "}
                {practiceIdentityEvidence.practiceHoldings}
              </Text>

              <Text style={styles.body}>
                Available cash: KES{" "}
                {money(
                  practiceIdentityEvidence.practiceCash
                )}
              </Text>

              <Text style={styles.body}>
                Capital model:{" "}
                {practiceIdentityEvidence.capitalModel ||
                  "NONE"}
              </Text>

              <Text style={styles.body}>
                Current-user execution key:{" "}
                {practiceIdentityEvidence.executionExists
                  ? "FOUND"
                  : "MISSING"}
              </Text>

              <Text style={styles.body}>
                Execution mode:{" "}
                {practiceIdentityEvidence.executionMode ||
                  "N/A"}
              </Text>

              <Text style={styles.body}>
                Execution orders:{" "}
                {practiceIdentityEvidence.executionOrderCount}
              </Text>

              <Text style={styles.body}>
                BROKER_RECEIVED:{" "}
                {practiceIdentityEvidence.brokerReceivedCount}
              </Text>

              <Text style={styles.body}>
                PARTIAL_FILL:{" "}
                {practiceIdentityEvidence.partialFillCount}
              </Text>

              <Text style={styles.body}>
                FILLED:{" "}
                {practiceIdentityEvidence.filledCount}
              </Text>

              <Text style={styles.body}>
                Settlement namespace ready:{" "}
                {practiceIdentityEvidence.ready
                  ? "YES"
                  : "NO"}
              </Text>
            </>
          )}

          <Text style={styles.reason}>
            READ ONLY — current authenticated identity
            is correlated directly with raw storage.
            No migration, funding, settlement, or
            portfolio mutation is performed.
          </Text>
        </View>
      ) : null}

      {postSettlementValuationEvidence ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Post-Settlement Valuation Reconciliation
          </Text>

          {postSettlementValuationEvidence.error ? (
            <Text style={styles.reason}>
              {
                postSettlementValuationEvidence
                  .error
              }
            </Text>
          ) : (
            <>
              <Text style={styles.body}>
                Auth namespace:{" "}
                {
                  postSettlementValuationEvidence
                    .userIdDisplay
                }
              </Text>

              <Text style={styles.body}>
                Result:{" "}
                {
                  postSettlementValuationEvidence
                    .overallPass
                    ? "PASS"
                    : "CHECK"
                }
              </Text>

              <Text style={styles.body}>
                Holdings:{" "}
                {
                  postSettlementValuationEvidence
                    .holdingCount
                }
                {" • "}FILLED orders:{" "}
                {
                  postSettlementValuationEvidence
                    .filledOrderCount
                }
              </Text>

              <Text style={styles.body}>
                Available cash: KES{" "}
                {money(
                  postSettlementValuationEvidence
                    .availableCash
                )}
              </Text>

              <Text style={styles.body}>
                Holdings market value: KES{" "}
                {money(
                  postSettlementValuationEvidence
                    .calculatedHoldingsValue
                )}
              </Text>

              <Text style={styles.small}>
                Stored holdings value: KES{" "}
                {money(
                  postSettlementValuationEvidence
                    .storedHoldingsValue
                )}
                {" • "}
                {
                  postSettlementValuationEvidence
                    .holdingsTotalConsistent
                    ? "PASS"
                    : "CHECK"
                }
              </Text>

              <Text style={styles.body}>
                Cost basis: KES{" "}
                {money(
                  postSettlementValuationEvidence
                    .calculatedInvestedValue
                )}
              </Text>

              <Text style={styles.small}>
                Stored invested amount: KES{" "}
                {money(
                  postSettlementValuationEvidence
                    .storedInvestedAmount
                )}
                {" • "}
                {
                  postSettlementValuationEvidence
                    .investedTotalConsistent
                    ? "PASS"
                    : "CHECK"
                }
              </Text>

              <Text style={styles.body}>
                Practice net worth: KES{" "}
                {money(
                  postSettlementValuationEvidence
                    .calculatedNetWorth
                )}
              </Text>

              <Text style={styles.small}>
                Stored total value: KES{" "}
                {money(
                  postSettlementValuationEvidence
                    .storedTotalValue
                )}
                {" • "}
                {
                  postSettlementValuationEvidence
                    .netWorthConsistent
                    ? "PASS"
                    : "CHECK"
                }
              </Text>

              <Text style={styles.body}>
                Calculated P&amp;L: KES{" "}
                {money(
                  postSettlementValuationEvidence
                    .calculatedGain
                )}
              </Text>

              <Text style={styles.body}>
                Filled symbols represented:{" "}
                {
                  postSettlementValuationEvidence
                    .filledSymbolsRepresented
                    ? "PASS"
                    : "CHECK"
                }
              </Text>

              {(
                postSettlementValuationEvidence
                  .holdingValuationEvidence ||
                []
              ).map((item) => (
                <View
                  key={item.symbol}
                  style={styles.card}
                >
                  <Text style={styles.small}>
                    {item.symbol}
                    {item.touchedByFilledBasket
                      ? " • FILLED BASKET"
                      : ""}
                  </Text>

                  <Text style={styles.small}>
                    Qty {item.quantity}
                    {" • "}Avg KES{" "}
                    {money(item.averageCost)}
                    {" • "}Market KES{" "}
                    {money(item.marketPrice)}
                  </Text>

                  <Text style={styles.small}>
                    Cost KES{" "}
                    {money(
                      item.expectedInvestedValue
                    )}
                    {" • "}Stored{" "}
                    {item.hasStoredInvestedValue
                      ? `KES ${money(
                          item.storedInvestedValue
                        )}`
                      : "N/A"}
                    {" • "}
                    {
                      item.investedEvidenceStatus
                    }
                  </Text>

                  {!item.hasStoredInvestedValue ? (
                    <Text style={styles.small}>
                      Cost basis derived from quantity ×
                      average cost.
                    </Text>
                  ) : null}

                  <Text style={styles.small}>
                    Value KES{" "}
                    {money(
                      item.expectedMarketValue
                    )}
                    {" • "}Stored KES{" "}
                    {money(
                      item.storedMarketValue
                    )}
                    {" • "}
                    {item.marketConsistent
                      ? "PASS"
                      : "CHECK"}
                  </Text>

                  <Text style={styles.small}>
                    P&amp;L KES{" "}
                    {money(item.expectedGain)}
                  </Text>
                </View>
              ))}
            </>
          )}

          <Text style={styles.reason}>
            READ ONLY — canonical Practice valuation
            reconciliation. No quote refresh, migration,
            settlement, funding, portfolio write, OMS
            mutation, history repair, or REAL mutation.
          </Text>
        </View>
      ) : null}

      {practiceExecutionReleaseEvidence ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Practice Execution Release — UAT
          </Text>

          {practiceExecutionReleaseEvidence.error ? (
            <Text style={styles.reason}>
              {
                practiceExecutionReleaseEvidence
                  .error
              }
            </Text>
          ) : (
            <>
              <Text style={styles.body}>
                Result:{" "}
                {
                  practiceExecutionReleaseEvidence
                    .releasePass
                    ? "PASS"
                    : "CHECK"
                }
              </Text>

              <Text style={styles.body}>
                Released execution:{" "}
                {
                  practiceExecutionReleaseEvidence
                    .releasedExecutionId
                }
              </Text>

              <Text style={styles.body}>
                Released mode:{" "}
                {
                  practiceExecutionReleaseEvidence
                    .releasedMode
                }
              </Text>

              <Text style={styles.body}>
                Active OMS slot released:{" "}
                {
                  practiceExecutionReleaseEvidence
                    .activeSlotReleased
                    ? "YES"
                    : "NO"
                }
              </Text>

              <Text style={styles.body}>
                Total archive records:{" "}
                {
                  practiceExecutionReleaseEvidence
                    .totalArchiveRecords
                }
              </Text>

              <Text style={styles.body}>
                Matching execution archives:{" "}
                {
                  practiceExecutionReleaseEvidence
                    .matchingArchiveRecords
                }
              </Text>

              <Text style={styles.body}>
                Archived orders:{" "}
                {
                  practiceExecutionReleaseEvidence
                    .archivedOrderCount
                }
              </Text>

              <Text style={styles.body}>
                Archived FILLED:{" "}
                {
                  practiceExecutionReleaseEvidence
                    .archivedFilledCount
                }
              </Text>
            </>
          )}

          <Text style={styles.reason}>
            UAT evidence — release is owned by canonical
            clearBasketExecution(). Post-release inspection
            uses direct authenticated AsyncStorage reads.
            No routing, fill, settlement, funding, or new
            basket creation is performed here.
          </Text>
        </View>
      ) : null}

      {practiceExecutionArchiveEvidence ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Practice Execution Archive
          </Text>

          {practiceExecutionArchiveEvidence.error ? (
            <Text style={styles.reason}>
              {
                practiceExecutionArchiveEvidence
                  .error
              }
            </Text>
          ) : (
            <>
              <Text style={styles.body}>
                Result:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .archivePass
                    ? "PASS"
                    : "CHECK"
                }
              </Text>

              <Text style={styles.body}>
                Auth namespace:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .userIdDisplay
                }
              </Text>

              <Text style={styles.body}>
                Active execution key:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .executionKeyPresent
                    ? "PRESENT"
                    : "MISSING"
                }
              </Text>

              <Text style={styles.body}>
                Practice history key:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .historyKeyPresent
                    ? "PRESENT"
                    : "MISSING"
                }
              </Text>

              <Text style={styles.body}>
                Execution ID:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .executionId ||
                  "MISSING"
                }
              </Text>

              <Text style={styles.body}>
                Live execution mode:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .liveExecutionMode ||
                  "MISSING"
                }
              </Text>

              <Text style={styles.body}>
                Live orders:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .liveOrderCount
                }
              </Text>

              <Text style={styles.body}>
                Live FILLED:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .liveFilledCount
                }
              </Text>

              <Text style={styles.body}>
                Total archive records:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .totalArchiveRecords
                }
              </Text>

              <Text style={styles.body}>
                Matching execution archives:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .matchingArchiveRecords
                }
              </Text>

              <Text style={styles.body}>
                Archived mode:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .archivedExecutionMode ||
                  "MISSING"
                }
              </Text>

              <Text style={styles.body}>
                Archived orders:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .archivedOrderCount
                }
              </Text>

              <Text style={styles.body}>
                Archived FILLED:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .archivedFilledCount
                }
              </Text>

              <Text style={styles.body}>
                Archived SCOM:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .archivedSCOMCount
                }
              </Text>

              <Text style={styles.body}>
                Archived BAMB:{" "}
                {
                  practiceExecutionArchiveEvidence
                    .archivedBAMBCount
                }
              </Text>
            </>
          )}

          <Text style={styles.reason}>
            READ ONLY — direct authenticated AsyncStorage
            correlation. No migration, archive write,
            history repair, settlement, routing, fill,
            clear, Practice portfolio mutation, OMS
            mutation, or REAL mutation is performed.
          </Text>
        </View>
      ) : null}

      {postSettlementEvidence ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Post-Settlement Integrity
          </Text>

          {postSettlementEvidence.error ? (
            <Text style={styles.reason}>
              {postSettlementEvidence.error}
            </Text>
          ) : (
            <>
              <Text style={styles.body}>
                Auth namespace:{" "}
                {
                  postSettlementEvidence
                    .userIdDisplay
                }
              </Text>

              <Text style={styles.body}>
                Practice status:{" "}
                {
                  postSettlementEvidence
                    .practiceStatus ||
                  "MISSING"
                }
              </Text>

              <Text style={styles.body}>
                Practice available cash: KES{" "}
                {money(
                  postSettlementEvidence
                    .practiceCash
                )}
              </Text>

              <Text style={styles.body}>
                Practice holdings:{" "}
                {
                  postSettlementEvidence
                    .practiceHoldings
                }
              </Text>

              <Text style={styles.body}>
                Durable settlements:{" "}
                {
                  postSettlementEvidence
                    .settlementCount
                }
              </Text>

              <Text style={styles.body}>
                Practice history records:{" "}
                {
                  postSettlementEvidence
                    .historyCount
                }
              </Text>

              <Text style={styles.body}>
                Execution mode:{" "}
                {
                  postSettlementEvidence
                    .executionMode ||
                  "MISSING"
                }
              </Text>

              <Text style={styles.body}>
                Execution orders:{" "}
                {
                  postSettlementEvidence
                    .executionOrderCount
                }
              </Text>

              <Text style={styles.body}>
                FILLED orders:{" "}
                {
                  postSettlementEvidence
                    .filledCount
                }
              </Text>

              <Text style={styles.body}>
                Settlement correlation:{" "}
                {
                  postSettlementEvidence
                    .fullyCorrelated
                    ? "PASS"
                    : "CHECK"
                }
              </Text>

              {(
                postSettlementEvidence
                  .orderEvidence || []
              ).map((item) => (
                <Text
                  key={item.id}
                  style={styles.small}
                >
                  {item.symbol} • {item.status}
                  {" • "}Marker{" "}
                  {item.settlementApplied
                    ? "✓"
                    : "✗"}
                  {" • "}Accounting{" "}
                  {item.accountingApplied
                    ? "✓"
                    : "✗"}
                  {" • "}History{" "}
                  {item.historyCount}
                  {" • "}OMS{" "}
                  {item.omsAccountingApplied
                    ? "✓"
                    : "✗"}
                </Text>
              ))}

              <Text style={styles.body}>
                REAL cash key present:{" "}
                {
                  postSettlementEvidence
                    .realCashKeyPresent
                    ? "YES"
                    : "NO"
                }
              </Text>

              <Text style={styles.body}>
                REAL portfolio key present:{" "}
                {
                  postSettlementEvidence
                    .realPortfolioKeyPresent
                    ? "YES"
                    : "NO"
                }
              </Text>
            </>
          )}

          <Text style={styles.reason}>
            READ ONLY — direct authenticated
            AsyncStorage inspection. No migration,
            settlement, funding, history repair,
            Practice mutation, OMS mutation, or REAL
            mutation is performed.
          </Text>
        </View>
      ) : null}

      {practicePrefillEvidence ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Practice Prefill Evidence
          </Text>

          <Text style={styles.body}>
            Orders inspected:{" "}
            {practicePrefillEvidence.orderCount || 0}
          </Text>

          <Text style={styles.body}>
            Result:{" "}
            {practicePrefillEvidence.ok
              ? "AFFORDABLE"
              : practicePrefillEvidence.code}
          </Text>

          {Number.isFinite(
            practicePrefillEvidence.startingCash
          ) ? (
            <>
              <Text style={styles.body}>
                Starting cash: KES{" "}
                {money(
                  practicePrefillEvidence.startingCash
                )}
              </Text>

              <Text style={styles.body}>
                Total BUY cost incl. fees: KES{" "}
                {money(
                  practicePrefillEvidence.totalBuyCost
                )}
              </Text>

              <Text style={styles.body}>
                Total SELL net proceeds: KES{" "}
                {money(
                  practicePrefillEvidence.totalSellProceeds
                )}
              </Text>

              <Text style={styles.body}>
                Additional cash required: KES{" "}
                {money(
                  practicePrefillEvidence
                    .additionalCashRequired
                )}
              </Text>

              <Text style={styles.body}>
                Projected cash after batch: KES{" "}
                {money(
                  practicePrefillEvidence
                    .projectedEndingCash
                )}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.body}>
                Required at failure: KES{" "}
                {money(
                  practicePrefillEvidence.requiredCash
                )}
              </Text>

              <Text style={styles.body}>
                Available at failure: KES{" "}
                {money(
                  practicePrefillEvidence.availableCash
                )}
              </Text>
            </>
          )}

          {practicePrefillEvidence.failingSymbol ? (
            <Text style={styles.body}>
              First blocked order:{" "}
              {
                practicePrefillEvidence
                  .failingSymbol
              }
            </Text>
          ) : null}

          {(practicePrefillEvidence.statuses || []).map(
            (item) => (
              <Text
                key={item.id}
                style={styles.small}
              >
                {item.symbol} • {item.status} • Qty{" "}
                {item.quantity} @ KES{" "}
                {money(item.price)}
              </Text>
            )
          )}

          <Text style={styles.reason}>
            READ ONLY — full-batch funding analysis.
            No Practice settlement, funding, or REAL
            mutation is performed by this inspection.
          </Text>
        </View>
      ) : null}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search symbol, broker, or status"
        placeholderTextColor="#64748b"
        style={styles.search}
      />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Queue Orders</Text>

        {filteredOrders.length === 0 ? (
          <Text style={styles.body}>No orders found.</Text>
        ) : (
          filteredOrders.map((order) => (
            <View key={order.id} style={styles.orderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.symbol}>
                  {order.side} {order.symbol}
                </Text>

                <Text style={styles.small}>
                  Qty {order.quantity} @ KES {money(order.price)}
                </Text>

                <Text style={styles.small}>
                  Broker: {order.brokerName || "Not routed"}
                </Text>

                {order.brokerOrderId ? (
                  <Text style={styles.small}>
                    Broker Order: {order.brokerOrderId}
                  </Text>
                ) : null}

                {statusViewFor(order).brokerStatus ? (
                  <Text style={styles.small}>
                    Broker Status: {statusViewFor(order).brokerStatus}
                  </Text>
                ) : null}

                {Number(order.submissionAttemptCount || 0) > 0 ? (
                  <Text style={styles.small}>
                    Submission Attempts: {order.submissionAttemptCount}
                  </Text>
                ) : null}

                <Text style={styles.reason}>
                  {order.message || statusViewFor(order).explanation}
                </Text>
              </View>

              <View style={styles.right}>
                <Text style={statusStyle(statusViewFor(order).rawStatus)}>
                  {statusViewFor(order).label}
                </Text>

                {statusViewFor(order).rawStatus ===
                  ORDER_STATUS.BROKER_RECEIVED &&
                !statusViewFor(order).isReal ? (
                  <Pressable
                    style={styles.miniButton}
                    onPress={() => markPartial(order)}
                  >
                    <Text style={styles.miniButtonText}>Partial</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function statusStyle(status) {
  if (status === ORDER_STATUS.FILLED) return styles.filled;
  if (status === ORDER_STATUS.QUEUED) return styles.queued;
  if (status === ORDER_STATUS.ROUTED) return styles.routed;
  if (status === ORDER_STATUS.BROKER_RECEIVED) return styles.received;
  if (status === ORDER_STATUS.PARTIAL_FILL) return styles.partial;
  if (status === ORDER_STATUS.BROKER_SELECTED) return styles.selected;
  return styles.pending;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { /* PC-030M20AV3T RESPONSIVE CALIBRATION */ width: "100%", maxWidth: 960, alignSelf: "center", padding: 22, paddingTop: 70, paddingBottom: 128 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 32, fontWeight: "900", flex: 1 },
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
  flowCard: {
    marginTop: 20,
    backgroundColor: "rgba(147,51,234,.14)",
    borderColor: "rgba(147,51,234,.38)",
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
  flowRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomColor: "rgba(148,163,184,.18)",
    borderBottomWidth: 1,
    paddingVertical: 10,
    gap: 12
  },
  flowStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#9333ea",
    alignItems: "center",
    justifyContent: "center"
  },
  flowStepText: {
    color: "white",
    fontWeight: "900"
  },
  flowLabel: {
    color: "white",
    fontWeight: "900",
    flex: 1,
    fontSize: 12
  },
  flowCount: {
    color: "#86efac",
    fontWeight: "900"
  },
  actionGrid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  actionButton: {
    width: "47%",
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    padding: 14,
    borderRadius: 16
  },
  actionText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 12
  },
  search: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    color: "white",
    padding: 16,
    borderRadius: 16
  },
  card: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
  orderRow: {
    flexDirection: "row",
    gap: 12,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
    paddingVertical: 14
  },
  symbol: {
    color: "white",
    fontWeight: "900",
    fontSize: 17
  },
  small: {
    color: "#94a3b8",
    marginTop: 5,
    fontSize: 12
  },
  reason: {
    color: "#cbd5e1",
    marginTop: 6,
    lineHeight: 19,
    fontSize: 12
  },
  right: {
    alignItems: "flex-end",
    minWidth: 105
  },
  miniButton: {
    marginTop: 10,
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  miniButtonText: {
    color: "#67e8f9",
    fontWeight: "900",
    fontSize: 11
  },
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
  secondaryText: {
    color: "#67e8f9",
    textAlign: "center",
    fontWeight: "900"
  },
  pending: { color: "#fbbf24", fontWeight: "900", fontSize: 12 },
  selected: { color: "#86efac", fontWeight: "900", fontSize: 12 },
  queued: { color: "#67e8f9", fontWeight: "900", fontSize: 12 },
  routed: { color: "#c084fc", fontWeight: "900", fontSize: 12 },
  received: { color: "#38bdf8", fontWeight: "900", fontSize: 12 },
  partial: { color: "#fde68a", fontWeight: "900", fontSize: 12 },
  filled: { color: "#86efac", fontWeight: "900", fontSize: 12 }
});
