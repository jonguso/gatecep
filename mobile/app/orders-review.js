import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
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
  ContainedPanel,
  InvestorTopChromeHeader,
  ResponsiveScreen,
  ResponsiveWorkingRegion
} from "../src/components/mobile/MobileUI";
import {
  deleteExecutionOrder,
  loadBasketExecution,
  queueExecutionOrders,
  queueSingleOrder,
  replacePracticeReviewOrderSecurity,
  updateExecutionOrder
} from "../src/trade/basketExecutionStore";
import { ORDER_STATUS } from "../src/trade/orderLifecycle";
import { buildRealOrderBrokerEligibility } from "../src/services/trade/brokerExecutionEligibilityService";
import { buildExecutionStatusReadModel } from "../src/services/trade/realExecutionStatusReadModel";
import {
  analyzeCanonicalPracticeExecutionFunding,
  preflightCanonicalPracticeExecutionOrders
} from "../src/services/trade/practiceExecutionAccountingService";
import { runPracticeExecutionOrchestrator } from "../src/services/trade/practiceExecutionOrchestrator";
import useMarketData from "../src/services/markets/useMarketData";
import { isCurrentNseSecurity } from "../src/utils/nseSecurityMaster";

export default function OrdersReview() {
  const market = useMarketData();
  const [execution, setExecution] = useState(null);
  const [query, setQuery] = useState("");
  const [brokerEligibility, setBrokerEligibility] = useState({});
  const [brokerEligibilityLoading, setBrokerEligibilityLoading] = useState(false);
  const [practiceFundingFeedback, setPracticeFundingFeedback] = useState(null);

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
    await refreshBrokerEligibility(saved);
  }

  const orders = execution?.orders || [];
  const executionMode = String(
    execution?.executionMode || orders[0]?.executionMode || "PRACTICE"
  ).toUpperCase();
  const isRealExecution = executionMode === "REAL";

  function statusViewFor(order) {
    return buildExecutionStatusReadModel(order, execution);
  }

  const recoveryOrders = orders.filter(
    (order) => statusViewFor(order).recoveryRequired
  );

  const queuedOrders = orders.filter(
    (order) => order.status === ORDER_STATUS.QUEUED
  );

  const reviewOrders = useMemo(() => {
    const search = query.trim().toLowerCase();

    return orders
      .filter((order) =>
        [ORDER_STATUS.DRAFT, ORDER_STATUS.REVIEW, ORDER_STATUS.PENDING].includes(
          order.status
        )
      )
      .filter((order) => {
        if (!search) return true;

        const statusView = statusViewFor(order);

        return (
          String(order.symbol || "").toLowerCase().includes(search) ||
          String(order.name || "").toLowerCase().includes(search) ||
          String(order.side || "").toLowerCase().includes(search) ||
          String(statusView.label || "").toLowerCase().includes(search) ||
          String(statusView.phase || "").toLowerCase().includes(search) ||
          String(statusView.rawStatus || "").toLowerCase().includes(search) ||
          String(statusView.brokerStatus || "").toLowerCase().includes(search)
        );
      });
  }, [orders, query]);

  async function refreshBrokerEligibility(nextExecution = execution) {
    const nextOrders = nextExecution?.orders || [];
    const nextMode = String(
      nextExecution?.executionMode || nextOrders[0]?.executionMode || "PRACTICE"
    ).toUpperCase();

    if (nextMode !== "REAL") {
      setBrokerEligibility({});
      return;
    }

    setBrokerEligibilityLoading(true);

    try {
      const entries = await Promise.all(
        nextOrders
          .filter((order) =>
            [ORDER_STATUS.DRAFT, ORDER_STATUS.REVIEW, ORDER_STATUS.PENDING].includes(
              order.status
            )
          )
          .map(async (order) => [
            order.id,
            await buildRealOrderBrokerEligibility({
              order,
              executionOrders: nextOrders
            })
          ])
      );

      setBrokerEligibility(Object.fromEntries(entries));
    } finally {
      setBrokerEligibilityLoading(false);
    }
  }

  const totalAmount = reviewOrders.reduce(
    (sum, order) => sum + Number(order.amount || order.gross || 0),
    0
  );

  /*
   * PC-032G8D4A
   *
   * Investor-facing REAL handoff readiness.
   *
   * This is intentionally a UI/read-model gate only.
   * queueExecutionOrders() remains the canonical mutation authority
   * and assertRealOrderBrokerAssignment() remains the final
   * service-level safety boundary.
   */
  const realHandoffEligibility = useMemo(() => {
    if (!isRealExecution) {
      return {
        ready: true,
        blockedOrders: []
      };
    }

    if (brokerEligibilityLoading) {
      return {
        ready: false,
        blockedOrders: reviewOrders
      };
    }

    const blockedOrders = reviewOrders.filter((order) => {
      const result = brokerEligibility[order.id];

      const selected = (result?.candidates || []).find(
        (candidate) =>
          candidate.brokerAccountId === order.brokerAccountId
      );

      return (
        !order.brokerAccountId ||
        !selected ||
        selected.eligible !== true
      );
    });

    return {
      ready: blockedOrders.length === 0,
      blockedOrders
    };
  }, [
    isRealExecution,
    brokerEligibilityLoading,
    brokerEligibility,
    reviewOrders
  ]);

  const handoffDisabled =
    reviewOrders.length === 0 ||
    (isRealExecution && !realHandoffEligibility.ready);

  async function updateOrder(order, patch) {
    const updated = await updateExecutionOrder(order.id, patch);
    setExecution(updated);
    await refreshBrokerEligibility(updated);
  }

  async function replacePracticeSecurity(
    order,
    security
  ) {
    if (isRealExecution) {
      return;
    }

    try {
      const updated =
        await replacePracticeReviewOrderSecurity(
          order.id,
          security
        );

      setExecution(updated);
      setPracticeFundingFeedback(null);
    } catch (error) {
      const message =
        error?.code ===
        "PRACTICE_SECURITY_REPLACEMENT_STATUS_FORBIDDEN"
          ? "This Practice order has already left review. Its security can no longer be changed."
          : error?.code ===
            "PRACTICE_SECURITY_NOT_CURRENTLY_AVAILABLE"
          ? `${error?.symbol || "This security"} is not currently available for a new Practice order. Historical holdings and trade evidence are preserved.`
          : error?.message ||
            "The Practice security could not be changed.";

      if (
        Platform.OS === "web" &&
        typeof window !== "undefined"
      ) {
        window.alert(message);
      } else {
        Alert.alert(
          "Unable to Change Security",
          message
        );
      }
    }
  }

  async function deleteOrder(order) {
    const title = "Delete Order";
    const message = `Remove ${order.symbol} from this basket?`;

    const executeDelete = async () => {
      const updated = await deleteExecutionOrder(order.id);
      setExecution(updated);
      await refreshBrokerEligibility(updated);
    };

    /*
     * PC-032G8D4A
     *
     * React Native Web Alert button callbacks are not a reliable
     * mutation trigger. Use the same explicit web-confirm pattern
     * already established by the handoff workflow.
     *
     * deleteExecutionOrder() remains the canonical OMS authority.
     */
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof window.confirm === "function"
    ) {
      if (!window.confirm(`${title}\n\n${message}`)) {
        return;
      }

      await executeDelete();
      return;
    }

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: executeDelete
      }
    ]);
  }

  async function queueOrder(order) {
    setPracticeFundingFeedback(null);

    if (isRealExecution) {
      const result = brokerEligibility[order.id];
      const selected = (result?.candidates || []).find(
        (candidate) => candidate.brokerAccountId === order.brokerAccountId
      );

      if (!order.brokerAccountId || !selected || !selected.eligible) {
        Alert.alert(
          "Eligible Broker Required",
          !order.brokerAccountId
            ? "Choose an eligible connected broker for this REAL order before preparing it."
            : "The selected broker no longer has enough broker-specific trading space or holdings for this order."
        );
        return;
      }
    }

    /*
     * PC-031B4M7C5D7F5J2D6
     *
     * "Prepare This Order" is an OMS acceptance transition.
     *
     * For Practice, validate the prospective accepted batch before
     * moving this order to QUEUED:
     *
     *   already QUEUED Practice orders
     *   + this order
     *
     * This prevents individually prepared BUY orders from each
     * passing against the same unreserved Practice cash.
     *
     * queueSingleOrder() remains the sole owner of the actual
     * REVIEW -> QUEUED mutation.
     *
     * REAL retains its existing broker-eligibility path.
     */
    if (!isRealExecution) {
      const prospectiveOrders = [
        ...queuedOrders,
        order
      ];

      try {
        const funding =
          await preflightCanonicalPracticeExecutionOrders(
            prospectiveOrders
          );

        const required = Number(
          funding?.additionalCashRequired || 0
        );

        if (
          funding?.ok === false ||
          required > 0
        ) {
          setPracticeFundingFeedback({
            title: "Practice Funds Required",
            message:
              required > 0
                ? `Add KES ${money(required)} to Practice Funds before preparing ${order.symbol || "this order"}. The order remains in Review.`
                : "Current Practice cash cannot fund the prepared Practice orders. The order remains in Review.",
            required
          });

          return;
        }
      } catch (error) {
        const required = Number(
          error?.preflight
            ?.additionalCashRequired ||
            error?.additionalCashRequired ||
            0
        );

        if (
          error?.code ===
            "INSUFFICIENT_PRACTICE_CASH" ||
          required > 0
        ) {
          let explanatoryRequired = required;

          if (
            explanatoryRequired <= 0 &&
            error?.code ===
              "INSUFFICIENT_PRACTICE_CASH"
          ) {
            try {
              const analysis =
                await analyzeCanonicalPracticeExecutionFunding(
                  prospectiveOrders
                );

              explanatoryRequired = Number(
                analysis?.additionalCashRequired || 0
              );
            } catch {
              /*
               * Explanation enrichment is best-effort only.
               *
               * The canonical preflight has already rejected
               * the acceptance transition, so failure to obtain
               * explanatory analysis must never permit queueing.
               */
            }
          }

          setPracticeFundingFeedback({
            title: "Practice Funds Required",
            message:
              explanatoryRequired > 0
                ? `Add KES ${money(explanatoryRequired)} to Practice Funds before preparing ${order.symbol || "this order"}. The order remains in Review.`
                : "Current Practice cash cannot fund this prepared Practice batch. The order remains in Review.",
            required: explanatoryRequired
          });

          return;
        }

        setPracticeFundingFeedback({
          title: "Practice Funding Check Unavailable",
          message:
            error?.message ||
            "GateCEP could not verify Practice funding. The order remains in Review.",
          required: 0
        });

        return;
      }
    }

    const updated =
      await queueSingleOrder(order.id);

    setExecution(updated);
    await refreshBrokerEligibility(updated);
  }

  /*
   * PC-031B4M7C5D7F5C
   *
   * The confirmed handoff body is platform-independent.
   *
   * Web confirmation must not depend on a React Native Alert button
   * callback. Native retains Alert.alert().
   *
   * Execution ownership is unchanged:
   * - Practice funding gate before QUEUED
   * - queueExecutionOrders() owns QUEUED
   * - D7F2 orchestrator owns automatic Practice progression
   * - REAL retains its existing post-queue route
   */
  async function executeConfirmedHandoff() {
    /*
     * PC-031B4M7C5D7F3
     *
     * Practice acceptance is funding-gated before QUEUED.
     * This is the investor-facing acceptance check.
     *
     * The D7F2 orchestrator performs a second canonical
     * aggregate preflight after broker receipt and before
     * the first economic settlement.
     *
     * REAL remains on its existing queue/routing path.
     */
    if (!isRealExecution) {
      try {
        const funding =
          await preflightCanonicalPracticeExecutionOrders(
            reviewOrders
          );

        if (
          funding?.ok === false ||
          Number(
            funding?.additionalCashRequired || 0
          ) > 0
        ) {
          const required =
            Number(
              funding?.additionalCashRequired || 0
            );

          Alert.alert(
            "Practice Funds Required",
            required > 0
              ? `Add KES ${money(required)} to Practice Funds before submitting this basket. No Practice order has been queued, routed, or filled.`
              : "This Practice basket cannot be funded from the current Practice cash balance. No Practice order has been queued, routed, or filled.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Practice Funds",
                onPress: () =>
                  router.push(
                    "/(tabs)/funds?source=PRACTICE&returnTo=ORDERS_REVIEW"
                  )
              }
            ]
          );

          return;
        }
      } catch (error) {
        const required =
          Number(
            error?.preflight?.additionalCashRequired ||
              error?.additionalCashRequired ||
              0
          );

        if (
          error?.code === "INSUFFICIENT_PRACTICE_CASH" ||
          required > 0
        ) {
          Alert.alert(
            "Practice Funds Required",
            required > 0
              ? `Add KES ${money(required)} to Practice Funds before submitting this basket. No Practice order has been queued, routed, or filled.`
              : "This Practice basket cannot be funded from the current Practice cash balance. No Practice order has been queued, routed, or filled.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Practice Funds",
                onPress: () =>
                  router.push(
                    "/(tabs)/funds?source=PRACTICE&returnTo=ORDERS_REVIEW"
                  )
              }
            ]
          );

          return;
        }

        Alert.alert(
          "Practice Funding Check Unavailable",
          error?.message ||
            "GateCEP could not verify Practice funding. No Practice order has been queued, routed, or filled."
        );

        return;
      }
    }

    const updated =
      await queueExecutionOrders();

    setExecution(updated);

    if (isRealExecution) {
      router.push("/(tabs)/trading");
      return;
    }

    /*
     * Persisted QUEUED state now exists.
     *
     * D7F2 owns automatic Practice progression:
     * QUEUED -> BROKER_RECEIVED -> canonical settlement -> FILLED.
     *
     * If this pass is interrupted, persisted OMS state remains
     * recoverable by the same orchestrator.
     */
    try {
      const result =
        await runPracticeExecutionOrchestrator();

      if (result?.execution) {
        setExecution(result.execution);
      }

      router.push("/basket-execution");
    } catch (error) {
      /*
       * PC-031B4M7C5D7F4B
       *
       * Observational runtime evidence only.
       * Never changes OMS, accounting, routing or recovery state.
       */
      console.error(
        "PRACTICE_EXECUTION_ORCHESTRATOR_PAUSED",
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

      /*
       * Do not manufacture a success state.
       *
       * The execution remains at its last persisted OMS state.
       * Queue Manager stays the explicit UAT/recovery surface.
       */
      const required =
        Number(
          error?.preflight?.additionalCashRequired ||
            error?.additionalCashRequired ||
            0
        );

      if (
        error?.code === "INSUFFICIENT_PRACTICE_CASH" ||
        required > 0
      ) {
        Alert.alert(
          "Practice Funds Required",
          required > 0
            ? `Practice cash changed before settlement. Add KES ${money(required)} and resume the persisted Practice execution.`
            : "Practice cash changed before settlement. Add Practice Funds and resume the persisted Practice execution.",
          [
            {
              text: "Queue Manager",
              onPress: () => router.push("/queue-manager")
            },
            {
              text: "Open Practice Funds",
              onPress: () =>
                router.push(
                  "/(tabs)/funds?source=PRACTICE&returnTo=ORDERS_REVIEW"
                )
            }
          ]
        );

        return;
      }

      Alert.alert(
        "Practice Execution Paused",
        error?.message ||
          "The Practice execution stopped at its last persisted state. It has not been marked complete. Open Queue Manager to inspect or resume it.",
        [
          {
            text: "Queue Manager",
            onPress: () => router.push("/queue-manager")
          }
        ]
      );
    }
  }

  /*
   * PC-031B4M7C5D7F5J2D1
   *
   * Individual "Prepare This Order" actions may leave the
   * persisted Practice execution with zero REVIEW orders and
   * one or more QUEUED orders.
   *
   * Continue from that persisted OMS state through the same
   * D7F2 orchestrator used by the batch handoff path.
   *
   * This handler does NOT queue orders again, route directly,
   * settle directly, write storage directly, or manufacture
   * FILLED state.
   *
   * D7F2 remains the authority for:
   *   QUEUED -> broker receipt -> canonical pre-settlement
   *   funding check -> canonical settlement -> FILLED.
   */
  async function continueQueuedPracticeExecution() {
    if (isRealExecution || queuedOrders.length === 0) {
      return;
    }

    try {
      const result =
        await runPracticeExecutionOrchestrator();

      if (result?.execution) {
        setExecution(result.execution);
      }

      router.push("/basket-execution");
    } catch (error) {
      console.error(
        "PRACTICE_QUEUED_CONTINUATION_PAUSED",
        {
          name: error?.name || null,
          code: error?.code || null,
          message:
            error?.message ||
            String(error),
          orderId:
            error?.orderId || null,
          status:
            error?.status || null,
          preflight:
            error?.preflight || null,
          stack:
            error?.stack || null
        }
      );

      const required =
        Number(
          error?.preflight
            ?.additionalCashRequired ||
            error?.additionalCashRequired ||
            0
        );

      if (
        error?.code ===
          "INSUFFICIENT_PRACTICE_CASH" ||
        required > 0
      ) {
        Alert.alert(
          "Practice Funds Required",
          required > 0
            ? `Practice cash changed before settlement. Add KES ${money(required)} and continue the persisted Practice execution.`
            : "Practice cash is insufficient to continue this persisted execution. Add Practice Funds before continuing.",
          [
            {
              text: "Queue Manager",
              onPress: () =>
                router.push(
                  "/queue-manager"
                )
            },
            {
              text: "Open Practice Funds",
              onPress: () =>
                router.push(
                  "/(tabs)/funds?source=PRACTICE&returnTo=ORDERS_REVIEW"
                )
            }
          ]
        );

        return;
      }

      Alert.alert(
        "Practice Execution Paused",
        error?.message ||
          "The Practice execution remains at its last persisted OMS state. It has not been marked complete.",
        [
          {
            text: "Queue Manager",
            onPress: () =>
              router.push(
                "/queue-manager"
              )
          }
        ]
      );
    }
  }

  async function prepareHandoff() {
    if (!reviewOrders.length) {
      Alert.alert(
        "No Orders",
        "There are no review orders to submit."
      );
      return;
    }

    if (
      isRealExecution &&
      !realHandoffEligibility.ready
    ) {
      const blockedCount =
        realHandoffEligibility.blockedOrders.length;

      const message = brokerEligibilityLoading
        ? "GateCEP is still checking REAL broker eligibility. Wait for the broker check to finish before continuing."
        : `${blockedCount} REAL order${blockedCount === 1 ? "" : "s"} ${blockedCount === 1 ? "does" : "do"} not have an eligible broker assignment. Select an eligible broker with sufficient broker-specific cash/trading space or holdings before continuing.`;

      if (
        Platform.OS === "web" &&
        typeof window !== "undefined"
      ) {
        window.alert(message);
      } else {
        Alert.alert(
          "Eligible Broker Required",
          message
        );
      }

      return;
    }

    const title = "Prepare Order Handoff";
    const message = isRealExecution
      ? `${reviewOrders.length} REAL order${reviewOrders.length === 1 ? "" : "s"} will be queued for broker routing. Queueing does not mean the broker has received or executed the order.`
      : `${reviewOrders.length} Practice order${reviewOrders.length === 1 ? "" : "s"} will be queued for GateCEP Broker.`;

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      typeof window.confirm === "function"
    ) {
      if (!window.confirm(`${title}\n\n${message}`)) {
        return;
      }

      await executeConfirmedHandoff();
      return;
    }

    Alert.alert(
      title,
      message,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: executeConfirmedHandoff
        }
      ]
    );
  }

  if (!execution || !orders.length) {
    return (
      <ResponsiveScreen mode="flow" testID="orders-review-empty-screen">
        <ResponsiveWorkingRegion style={styles.workingRegion}>
          <Text style={styles.title}>{isRealExecution ? "REAL Orders Review" : "Practice Orders Review"}</Text>

        <Text style={styles.subtitle}>
          No basket orders found. Create a Coach G trade basket first.
        </Text>

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
        </ResponsiveWorkingRegion>
      </ResponsiveScreen>
    );
  }

  return (
    <ResponsiveScreen mode="flow" testID="orders-review-screen">
      <ResponsiveWorkingRegion style={styles.workingRegion}>
      <View style={styles.headerRow}>
        <InvestorTopChromeHeader
          style={styles.ordersReviewIdentity}
          testID="orders-review-top-chrome"
        >
          <Text style={[styles.title, styles.ordersReviewTitle]}>
            {isRealExecution ? "REAL Orders Review" : "Practice Orders Review"}
          </Text>
        </InvestorTopChromeHeader>

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)/dashboard")}
        >
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        {isRealExecution
          ? "Review REAL orders before queueing them for broker routing. Queueing does not create broker receipt or execution evidence."
          : "Review Practice orders before sending them through GateCEP Broker."}
      </Text>

      <ActiveUserBanner />

      {recoveryOrders.length > 0 ? (
        <View style={styles.recoveryCard}>
          <Text style={styles.recoveryTitle}>
            REAL Broker Reconciliation Required
          </Text>

          <Text style={styles.recoveryText}>
            {recoveryOrders.length} REAL order
            {recoveryOrders.length === 1 ? "" : "s"} require broker-evidence
            reconciliation. This may include an uncertain submission or a
            verified partial execution. These orders are not editable review
            orders and must not be queued, manually filled, or resubmitted
            while recovery is required.
          </Text>

          <Pressable
            style={styles.recoveryButton}
            onPress={() => router.push("/real-order-recovery")}
          >
            <Text style={styles.recoveryButtonText}>
              Review REAL Submission Recovery
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.summaryCard}>
        <Metric label="Review Orders" value={String(reviewOrders.length)} />
        <Metric label="Basket Orders" value={String(orders.length)} />
        <Metric label="Estimated Value" value={`KES ${money(totalAmount)}`} />
        <Metric label="Status" value={execution.status} />
      </View>

      {!isRealExecution && practiceFundingFeedback ? (
        <View style={styles.practiceFundingFeedback}>
          <Text style={styles.practiceFundingFeedbackTitle}>
            {practiceFundingFeedback.title}
          </Text>

          <Text style={styles.practiceFundingFeedbackText}>
            {practiceFundingFeedback.message}
          </Text>

          {Number(practiceFundingFeedback.required || 0) > 0 ? (
            <Text style={styles.practiceFundingFeedbackAmount}>
              Additional Practice cash required: KES{" "}
              {money(practiceFundingFeedback.required)}
            </Text>
          ) : null}

          <View style={styles.practiceFundingFeedbackActions}>
            <Pressable
              style={styles.practiceFundingFeedbackButton}
              onPress={() => {
                const required = Number(
                  practiceFundingFeedback?.required || 0
                );

                router.push(
                  required > 0
                    ? `/(tabs)/funds?source=PRACTICE&returnTo=ORDERS_REVIEW&amount=${encodeURIComponent(
                        required.toFixed(2)
                      )}`
                    : "/(tabs)/funds?source=PRACTICE&returnTo=ORDERS_REVIEW"
                );
              }}
            >
              <Text style={styles.practiceFundingFeedbackButtonText}>
                Open Practice Funds
              </Text>
            </Pressable>

            <Pressable
              style={styles.practiceFundingDismissButton}
              onPress={() => setPracticeFundingFeedback(null)}
            >
              <Text style={styles.practiceFundingDismissText}>
                Dismiss
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search symbol, name, or side"
        placeholderTextColor="#64748b"
        style={styles.search}
      />

      <ContainedPanel
        title="Orders Awaiting Review"
        subtitle={`${reviewOrders.length} editable order${reviewOrders.length === 1 ? "" : "s"}`}
        emptyMessage="All orders have already been prepared, submitted, filled, cancelled, or removed."
        minHeight={340}
        maxHeight={500}
        heightRatio={0.48}
        testID="orders-review-panel"
      >
      {reviewOrders.length === 0 ? null : (
        reviewOrders.map((order) => (
          <ReviewOrderCard
            key={order.id}
            order={order}
            executionMode={executionMode}
            statusView={statusViewFor(order)}
            brokerEligibility={brokerEligibility[order.id]}
            brokerEligibilityLoading={brokerEligibilityLoading}
            marketRows={market.rows || []}
            marketLoading={market.loading}
            marketError={market.error}
            onChange={(patch) => updateOrder(order, patch)}
            onReplaceSecurity={(security) =>
              replacePracticeSecurity(order, security)
            }
            onDelete={() => deleteOrder(order)}
            onQueue={() => queueOrder(order)}
          />
        ))
      )}
      </ContainedPanel>

      {isRealExecution ? (
        reviewOrders.length > 0 ? (
          <Pressable
            style={[
              styles.primary,
              handoffDisabled && styles.disabledButton
            ]}
            disabled={handoffDisabled}
            onPress={prepareHandoff}
          >
            <Text style={styles.primaryText}>
              {brokerEligibilityLoading
                ? "Checking Broker Eligibility…"
                : !realHandoffEligibility.ready
                  ? `Eligible Broker Required (${reviewOrders.length})`
                  : `Continue to Order Handoff (${reviewOrders.length})`}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.primary, styles.disabledButton]}
            disabled
          >
            <Text style={styles.primaryText}>
              No Orders to Submit
            </Text>
          </Pressable>
        )
      ) : (
        <Pressable
          style={[
            styles.primary,
            queuedOrders.length === 0 && styles.disabledButton
          ]}
          disabled={queuedOrders.length === 0}
          onPress={continueQueuedPracticeExecution}
        >
          <Text style={styles.primaryText}>
            {queuedOrders.length > 0
              ? `Continue to Order Handoff (${queuedOrders.length})`
              : "Continue to Order Handoff"}
          </Text>
        </Pressable>
      )}
      </ResponsiveWorkingRegion>
    </ResponsiveScreen>
  );
}

function ReviewOrderCard({
  order,
  executionMode,
  statusView,
  brokerEligibility,
  brokerEligibilityLoading,
  marketRows,
  marketLoading,
  marketError,
  onChange,
  onReplaceSecurity,
  onDelete,
  onQueue
}) {
  const [securityPickerOpen, setSecurityPickerOpen] =
    useState(false);
  const [securityQuery, setSecurityQuery] =
    useState("");

  const qty = String(order.quantity || "");
  const price = String(order.price || "");
  const amount = Number(order.quantity || 0) * Number(order.price || 0);
  const isRealOrder = statusView.isReal;
  const candidates = brokerEligibility?.candidates || [];
  const selectedCandidate = candidates.find(
    (candidate) => candidate.brokerAccountId === order.brokerAccountId
  );

  /*
   * PC-032G8D4C2B
   *
   * Investor-facing presentation gate only.
   *
   * A REAL order must not present "Prepare This Order" as an
   * actionable primary CTA while broker eligibility is loading,
   * absent, or ineligible.
   *
   * queueOrder() retains the defensive REAL eligibility guard.
   * queueSingleOrder() remains the canonical OMS transition owner.
   *
   * Practice behavior is intentionally unchanged.
   */
  const prepareDisabled =
    isRealOrder &&
    (
      brokerEligibilityLoading ||
      !selectedCandidate ||
      selectedCandidate.eligible !== true
    );

  const practiceSecurityRows =
    useMemo(() => {
      const search =
        securityQuery.trim().toLowerCase();

      const rows =
        (Array.isArray(marketRows)
          ? marketRows
          : [])
          .filter((row) => {
            const symbol =
              String(row?.symbol || "").trim();
            const price =
              Number(
                row?.price ??
                  row?.lastPrice ??
                  row?.currentPrice
              );

            return (
              symbol &&
              isCurrentNseSecurity(symbol) &&
              Number.isFinite(price) &&
              price > 0
            );
          });

      if (!search) {
        return rows;
      }

      return rows.filter((row) =>
        String(row?.symbol || "")
          .toLowerCase()
          .includes(search) ||
        String(row?.name || "")
          .toLowerCase()
          .includes(search)
      );
    }, [marketRows, securityQuery]);

  function choosePracticeSecurity(security) {
    setSecurityPickerOpen(false);
    setSecurityQuery("");
    onReplaceSecurity(security);
  }

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.symbol}>
            {order.side} {order.symbol}
          </Text>

          <Text style={styles.small}>
            {order.name || order.symbol} • {order.sector || "NSE"}
          </Text>
        </View>

        <Text style={styles.status}>{statusView.label}</Text>
      </View>

      {!isRealOrder ? (
        <Pressable
          style={styles.changeSecurityButton}
          onPress={() =>
            setSecurityPickerOpen(true)
          }
        >
          <Text style={styles.changeSecurityButtonText}>
            Change Security
          </Text>
          <Text style={styles.changeSecurityButtonMeta}>
            Select from verified market data
          </Text>
        </Pressable>
      ) : null}

      <Text style={styles.reason}>
        {order.reason || statusView.explanation}
      </Text>

      {statusView.brokerStatus ? (
        <Text style={styles.brokerState}>
          Broker Status: {statusView.brokerStatus}
        </Text>
      ) : null}

      {!isRealOrder ? (
        <Modal
          visible={securityPickerOpen}
          transparent
          animationType="fade"
          onRequestClose={() =>
            setSecurityPickerOpen(false)
          }
        >
          <Pressable
            style={styles.securityPickerOverlay}
            onPress={() =>
              setSecurityPickerOpen(false)
            }
          >
            <Pressable
              style={styles.securityPickerModal}
              onPress={(event) =>
                event.stopPropagation()
              }
            >
              <View style={styles.securityPickerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.securityPickerTitle}>
                    Change Practice Security
                  </Text>
                  <Text style={styles.securityPickerHelp}>
                    Choose a verified market security. This is
                    available only while the order is in review.
                  </Text>
                </View>

                <Pressable
                  style={styles.securityPickerClose}
                  onPress={() =>
                    setSecurityPickerOpen(false)
                  }
                >
                  <Text style={styles.securityPickerCloseText}>
                    ×
                  </Text>
                </Pressable>
              </View>

              <TextInput
                value={securityQuery}
                onChangeText={setSecurityQuery}
                autoCapitalize="characters"
                placeholder="Search symbol or company name"
                placeholderTextColor="#64748b"
                style={styles.securityPickerSearch}
              />

              {marketLoading ? (
                <Text style={styles.securityPickerMessage}>
                  Loading verified NSE securities…
                </Text>
              ) : null}

              {!marketLoading &&
              !practiceSecurityRows.length ? (
                <Text style={styles.securityPickerMessage}>
                  {securityQuery.trim()
                    ? "No matching verified security."
                    : marketError ||
                      "Verified market securities are unavailable."}
                </Text>
              ) : null}

              <ScrollView
                style={styles.securityPickerList}
                keyboardShouldPersistTaps="handled"
              >
                {practiceSecurityRows.map(
                  (security) => {
                    const marketPrice =
                      Number(
                        security?.price ??
                          security?.lastPrice ??
                          security?.currentPrice
                      );

                    const selected =
                      String(
                        security?.symbol || ""
                      ).toUpperCase() ===
                      String(
                        order?.symbol || ""
                      ).toUpperCase();

                    return (
                      <Pressable
                        key={security.symbol}
                        style={[
                          styles.securityPickerRow,
                          selected &&
                            styles.securityPickerRowSelected
                        ]}
                        onPress={() =>
                          choosePracticeSecurity(
                            security
                          )
                        }
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.securityPickerSymbol}>
                            {security.symbol}
                          </Text>

                          <Text style={styles.securityPickerName}>
                            {security.name ||
                              security.symbol}
                            {security.sector
                              ? ` • ${security.sector}`
                              : ""}
                          </Text>
                        </View>

                        <Text style={styles.securityPickerPrice}>
                          KES {money(marketPrice)}
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      <View style={styles.sideRow}>
        {["BUY", "SELL"].map((side) => (
          <Pressable
            key={side}
            style={[styles.sideChip, order.side === side && styles.sideChipActive]}
            onPress={() => onChange({ side })}
          >
            <Text
              style={order.side === side ? styles.sideTextActive : styles.sideText}
            >
              {side}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.editGrid}>
        <View style={styles.editBox}>
          <Text style={styles.inputLabel}>Quantity</Text>

          <TextInput
            value={qty}
            keyboardType="numeric"
            placeholder="Qty"
            placeholderTextColor="#64748b"
            style={styles.input}
            onChangeText={(value) => {
              const quantity = cleanNumber(value);
              const gross = quantity * Number(order.price || 0);

              onChange({
                quantity,
                gross,
                amount: gross
              });
            }}
          />
        </View>

        <View style={styles.editBox}>
          <Text style={styles.inputLabel}>Limit Price</Text>

          <TextInput
            value={price}
            keyboardType="numeric"
            placeholder="Price"
            placeholderTextColor="#64748b"
            style={styles.input}
            onChangeText={(value) => {
              const nextPrice = cleanNumber(value);
              const gross = Number(order.quantity || 0) * nextPrice;

              onChange({
                price: nextPrice,
                gross,
                amount: gross
              });
            }}
          />
        </View>
      </View>

      <View style={styles.amountBox}>
        <Text style={styles.amountLabel}>Estimated Value</Text>
        <Text style={styles.amountValue}>KES {money(amount)}</Text>
      </View>

      {isRealOrder ? (
        <View style={styles.brokerBox}>
          <Text style={styles.inputLabel}>Broker Route</Text>
          <Text style={styles.brokerHelp}>
            Choose one connected REAL broker for this order. GateCEP checks that broker's own cash/trading space for BUY orders and that broker's own holding quantity for SELL orders.
          </Text>

          {brokerEligibilityLoading && !candidates.length ? (
            <Text style={styles.brokerHelp}>Checking broker eligibility…</Text>
          ) : null}

          {!brokerEligibilityLoading && !candidates.length ? (
            <Text style={styles.brokerBlocked}>
              No connected REAL broker is currently eligible for review.
            </Text>
          ) : null}

          {candidates.map((candidate) => {
            const selected =
              candidate.brokerAccountId === order.brokerAccountId;
            const cashMode = String(order.side || "BUY").toUpperCase() === "BUY";

            return (
              <Pressable
                key={candidate.brokerAccountId}
                disabled={!candidate.eligible}
                style={[
                  styles.brokerOption,
                  selected && styles.brokerOptionSelected,
                  !candidate.eligible && styles.brokerOptionDisabled
                ]}
                onPress={() =>
                  onChange({
                    brokerAccountId: candidate.brokerAccountId,
                    brokerId: candidate.brokerId,
                    brokerName: candidate.brokerName,
                    estimatedCharges: candidate.estimatedCharges,
                    estimatedTotalCost: cashMode
                      ? candidate.requiredCash
                      : candidate.gross,
                    executionEligibility: {
                      checked: true,
                      side: candidate.side,
                      reason: candidate.reason,
                      requiredCash: cashMode ? candidate.requiredCash : null,
                      availableCash: cashMode ? candidate.availableCash : null,
                      reservedCash: cashMode ? candidate.reservedCash : null,
                      projectedAvailableCash: cashMode
                        ? candidate.projectedAvailableCash
                        : null,
                      requiredQuantity: cashMode
                        ? null
                        : candidate.requiredQuantity,
                      heldQuantity: cashMode ? null : candidate.heldQuantity,
                      reservedQuantity: cashMode
                        ? null
                        : candidate.reservedQuantity,
                      projectedAvailableQuantity: cashMode
                        ? null
                        : candidate.projectedAvailableQuantity,
                      feeEvidenceAvailable:
                        candidate.feeEvidenceAvailable === true,
                      feeEvidenceSource: candidate.feeEvidenceSource || null,
                      feeVerifiedAt: candidate.feeVerifiedAt || null
                    }
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.brokerName}>
                    {candidate.brokerName}
                    {candidate.defaultBroker ? " • Default" : ""}
                  </Text>

                  {cashMode ? (
                    <Text style={styles.brokerMeta}>
                      Cash KES {money(candidate.availableCash)} • Reserved KES {money(candidate.reservedCash)} • Available KES {money(candidate.projectedAvailableCash)}
                    </Text>
                  ) : (
                    <Text style={styles.brokerMeta}>
                      Holding {candidate.heldQuantity} • Reserved {candidate.reservedQuantity} • Available {candidate.projectedAvailableQuantity}
                    </Text>
                  )}

                  <Text style={styles.brokerMeta}>
                    {candidate.estimatedCharges == null
                      ? "Verified broker charges unavailable"
                      : `Verified est. charges KES ${money(candidate.estimatedCharges)}`}
                  </Text>
                </View>

                <Text
                  style={
                    candidate.eligible
                      ? styles.brokerEligible
                      : styles.brokerBlocked
                  }
                >
                  {candidate.eligible
                    ? selected
                      ? "SELECTED"
                      : "ELIGIBLE"
                    : candidate.reason === "INSUFFICIENT_TRADING_SPACE"
                    ? "INSUFFICIENT CASH"
                    : "INSUFFICIENT HOLDING"}
                </Text>
              </Pressable>
            );
          })}

          {selectedCandidate ? (
            <Text
              style={
                selectedCandidate.eligible
                  ? styles.brokerEligibleSummary
                  : styles.brokerBlocked
              }
            >
              {selectedCandidate.eligible
                ? `Route selected: ${selectedCandidate.brokerName}`
                : "Selected broker is no longer eligible. Choose another broker."}
            </Text>
          ) : (
            <Text style={styles.brokerBlocked}>
              Select an eligible broker before preparing this REAL order.
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        <Pressable
          style={[
            styles.queueButton,
            prepareDisabled && styles.queueButtonDisabled
          ]}
          disabled={prepareDisabled}
          onPress={onQueue}
        >
          <Text
            style={[
              styles.queueText,
              prepareDisabled && styles.queueTextDisabled
            ]}
          >
            {isRealOrder && brokerEligibilityLoading
              ? "Checking Broker Eligibility…"
              : "Prepare This Order"}
          </Text>
        </Pressable>

        <Pressable style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </View>
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

function cleanNumber(value) {
  const number = Number(
    String(value || "")
      .replaceAll(",", "")
      .replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(number) ? number : 0;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  recoveryCard: {
    borderWidth: 1,
    borderColor: "#a16207",
    backgroundColor: "#221a09",
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    marginBottom: 14
  },
  recoveryTitle: {
    color: "#facc15",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 6
  },
  recoveryText: {
    color: "#d6c9a4",
    lineHeight: 19,
    marginBottom: 10
  },
  recoveryButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#854d0e"
  },
  recoveryButtonText: {
    color: "#fef3c7",
    fontWeight: "800"
  },
  brokerState: {
    color: "#94a3b8",
    marginBottom: 10,
    fontSize: 12
  },
  // PC-032G8D4E — ResponsiveScreen owns the route shell.
  workingRegion: {
    width: "100%"
  },
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 32, fontWeight: "900", flex: 1 },
  ordersReviewIdentity: {
    flex: 1,
    minWidth: 0
  },
  ordersReviewTitle: {
    fontSize: 28,
    lineHeight: 34
  },
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
  summaryCard: {
    marginTop: 20,
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
    fontSize: 13
  },
  practiceFundingFeedback: {
    marginTop: 18,
    backgroundColor: "#221a09",
    borderColor: "#a16207",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16
  },
  practiceFundingFeedbackTitle: {
    color: "#facc15",
    fontSize: 16,
    fontWeight: "900"
  },
  practiceFundingFeedbackText: {
    color: "#fef3c7",
    marginTop: 7,
    lineHeight: 20
  },
  practiceFundingFeedbackAmount: {
    color: "#fde68a",
    marginTop: 9,
    fontWeight: "900"
  },
  practiceFundingFeedbackActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14
  },
  practiceFundingFeedbackButton: {
    backgroundColor: "#9333ea",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  practiceFundingFeedbackButtonText: {
    color: "white",
    fontWeight: "900"
  },
  practiceFundingDismissButton: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14
  },
  practiceFundingDismissText: {
    color: "#cbd5e1",
    fontWeight: "800"
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
  cardTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12
  },
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
  orderCard: {
    marginTop: 18,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  orderTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12
  },
  symbol: {
    color: "white",
    fontWeight: "900",
    fontSize: 18
  },
  small: {
    color: "#94a3b8",
    marginTop: 5
  },
  status: {
    color: "#fbbf24",
    fontWeight: "900",
    fontSize: 12
  },
  reason: {
    color: "#cbd5e1",
    marginTop: 12,
    lineHeight: 20
  },
  changeSecurityButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "rgba(103,232,249,.08)",
    borderColor: "rgba(103,232,249,.35)",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12
  },
  changeSecurityButtonText: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  changeSecurityButtonMeta: {
    color: "#94a3b8",
    fontSize: 10,
    marginTop: 2
  },
  securityPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,.82)",
    justifyContent: "center",
    padding: 18
  },
  securityPickerModal: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "82%",
    alignSelf: "center",
    backgroundColor: "#0f172a",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16
  },
  securityPickerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  securityPickerTitle: {
    color: "#67e8f9",
    fontSize: 18,
    fontWeight: "900"
  },
  securityPickerHelp: {
    color: "#94a3b8",
    marginTop: 5,
    lineHeight: 18
  },
  securityPickerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center"
  },
  securityPickerCloseText: {
    color: "white",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24
  },
  securityPickerSearch: {
    marginTop: 14,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    color: "white"
  },
  securityPickerMessage: {
    color: "#94a3b8",
    marginTop: 14,
    lineHeight: 19
  },
  securityPickerList: {
    marginTop: 12
  },
  securityPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1
  },
  securityPickerRowSelected: {
    backgroundColor: "rgba(147,51,234,.12)"
  },
  securityPickerSymbol: {
    color: "white",
    fontWeight: "900",
    fontSize: 15
  },
  securityPickerName: {
    color: "#94a3b8",
    marginTop: 3,
    fontSize: 12
  },
  securityPickerPrice: {
    color: "#67e8f9",
    fontWeight: "900"
  },
  sideRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16
  },
  sideChip: {
    flexGrow: 1,
    flexBasis: 120,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13
  },
  sideChipActive: {
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
  editGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16
  },
  editBox: {
    flexGrow: 1,
    flexBasis: 140
  },
  inputLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 6
  },
  input: {
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    color: "white"
  },
  amountBox: {
    marginTop: 16,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14
  },
  amountLabel: {
    color: "#94a3b8",
    fontSize: 12
  },
  amountValue: {
    color: "white",
    fontWeight: "900",
    marginTop: 4
  },
  brokerBox: {
    marginTop: 14,
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12
  },
  brokerHelp: { color: "#94a3b8", marginTop: 6, lineHeight: 18, fontSize: 12 },
  brokerOption: {
    marginTop: 10,
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  brokerOptionSelected: {
    borderColor: "#67e8f9",
    backgroundColor: "rgba(103,232,249,.08)"
  },
  brokerOptionDisabled: { opacity: 0.48 },
  brokerName: { color: "white", fontWeight: "900" },
  brokerMeta: { color: "#94a3b8", marginTop: 4, fontSize: 11, lineHeight: 16 },
  brokerEligible: { color: "#86efac", fontWeight: "900", fontSize: 10 },
  brokerEligibleSummary: { color: "#86efac", fontWeight: "900", marginTop: 10 },
  brokerBlocked: { color: "#fbbf24", fontWeight: "800", marginTop: 8, fontSize: 11 },

  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16
  },
  queueButton: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: "#9333ea",
    padding: 14,
    borderRadius: 16
  },
  queueButtonDisabled: {
    backgroundColor: "#334155",
    borderColor: "#475569",
    borderWidth: 1
  },
  queueText: {
    color: "white",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 12
  },
  queueTextDisabled: {
    color: "#94a3b8"
  },
  deleteButton: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: "rgba(239,68,68,.12)",
    borderColor: "rgba(239,68,68,.35)",
    borderWidth: 1,
    padding: 14,
    borderRadius: 16
  },
  deleteText: {
    color: "#fca5a5",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 12
  },
  primary: {
    marginTop: 22,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  primaryText: { color: "white", textAlign: "center", fontWeight: "900" },
  disabledButton: { opacity: 0.45 },
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
  }
});
