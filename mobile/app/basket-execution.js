import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import ActiveUserBanner from "../src/components/ActiveUserBanner";
import {
  InvestorTopChromeHeader,
  ResponsiveScreen,
  ResponsiveWorkingRegion
} from "../src/components/mobile/MobileUI";
import {
  clearBasketExecution,
  loadBasketExecution
} from "../src/trade/basketExecutionStore";
import {
  ORDER_STATUS
} from "../src/trade/orderLifecycle";
import {
  RECOMMENDATION_STATUS,
  loadRecommendationHistory,
  saveRecommendationRecord
} from "../src/services/coach/recommendationLifecycleStore";
import { buildBrokerActionPlanText, clearBrokerActionPlan, loadBrokerActionPlan } from "../src/services/trade/brokerActionPlanStore";
import { buildExecutionStatusReadModel } from "../src/services/trade/realExecutionStatusReadModel";

// PC-030M20AV3C RESPONSIVE CALIBRATION
export default function BasketExecution() {
  const { width: av3cWidth } = useWindowDimensions();
  const { mode } = useLocalSearchParams();
  const brokerPlanMode = String(mode || "").toUpperCase() === "BROKER_PLAN";
  const [execution, setExecution] = useState(null);
  const [showUatDiagnostics, setShowUatDiagnostics] = useState(false);

  // PC-032G4B1C7E1B:
  // Alert.alert is not a reliable investor interaction boundary on web.
  // Browser flows use explicit inline feedback/confirmation while native
  // retains the established Alert behavior.
  const webOrderReviewInteraction = Platform.OS === "web";
  const [recommendationFeedback, setRecommendationFeedback] = useState(null);
  const [recommendationConfirmation, setRecommendationConfirmation] = useState(null);
  const [savedRecommendation, setSavedRecommendation] = useState(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    if (brokerPlanMode) {
      const [plan, recommendationHistory] = await Promise.all([
        loadBrokerActionPlan(),
        loadRecommendationHistory()
      ]);

      setExecution(plan);

      const planId = String(plan?.id || "").trim();

      const existingRecommendation =
        planId
          ? (recommendationHistory || []).find(
              (item) =>
                item?.type === "GOAL_RECOVERY_REVIEW" &&
                item?.source === "GOAL_RECOVERY_REVIEW" &&
                String(item?.brokerActionPlanId || "").trim() === planId
            ) || null
          : null;

      setSavedRecommendation(existingRecommendation);
      return;
    }
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

  function statusViewFor(order) {
    return buildExecutionStatusReadModel(order, execution);
  }

  const executionOrders = execution?.orders || [];

  const isRealExecution =
    !brokerPlanMode &&
    executionOrders.some(
      (order) => statusViewFor(order).isReal
    );

  const recoveryOrders =
    brokerPlanMode
      ? []
      : executionOrders.filter(
          (order) => statusViewFor(order).recoveryRequired
        );

  const activeOrders = useMemo(() => {
    if (brokerPlanMode) {
      return execution?.orders || [];
    }

    return (execution?.orders || []).filter((order) => {
      const statusView =
        buildExecutionStatusReadModel(
          order,
          execution
        );

      return [
        "REVIEW",
        "QUEUED",
        "ROUTING_FAILED",
        "BROKER_SELECTED",
        "ROUTED",
        "BROKER_RECEIVED",
        "PARTIAL_FILL",
        "RECONCILIATION_REQUIRED"
      ].includes(statusView.phase);
    });
  }, [execution, brokerPlanMode]);

  const closedOrders =
    brokerPlanMode
      ? []
      : executionOrders.filter((order) =>
          [
            ORDER_STATUS.FILLED,
            ORDER_STATUS.CANCELLED,
            ORDER_STATUS.REJECTED,
            ORDER_STATUS.EXPIRED
          ].includes(
            statusViewFor(order).rawStatus
          )
        );

  const totalAmount = activeOrders.reduce(
    (sum, item) => sum + Number(item.amount || item.gross || 0),
    0
  );

  const reviewOrders =
    brokerPlanMode
      ? []
      : executionOrders.filter(
          (order) =>
            statusViewFor(order).phase === "REVIEW"
        );

  const hasReviewOrders = reviewOrders.length > 0;

  const isComplete =
    execution?.orders?.length > 0 &&
    activeOrders.length === 0 &&
    recoveryOrders.length === 0;

  async function clearExecution() {
    if (brokerPlanMode) {
      await clearBrokerActionPlan();
      setExecution(null);
      return;
    }

    if (recoveryOrders.length > 0) {
      Alert.alert(
        "REAL Broker Reconciliation Required",
        "This execution cannot be cleared while a REAL broker submission outcome is unresolved. Reconcile genuine broker evidence first."
      );
      return;
    }

    await clearBasketExecution();
    setExecution(null);
  }

  async function saveReviewedRecoveryRecommendation(reviewedActions) {
    try {
      const record = await saveRecommendationRecord({
        type: "GOAL_RECOVERY_REVIEW",
        source: "GOAL_RECOVERY_REVIEW",
        status: RECOMMENDATION_STATUS.SAVED,
        executionStatus: "NOT_STARTED",
        executionMode: "BROKER_HANDOFF_ONLY",
        goal: execution?.goalContext?.goal || execution?.goal || null,
        actions: reviewedActions,
        brokerActionPlanId: execution?.id || null,
        brokerActionPlanSource: execution?.source || "COACH_G_ADVISORY",
        scenarioSource: execution?.scenarioSource || "GOAL_RECOVERY",
        goalContext: execution?.goalContext || {},
        costSummary: execution?.costSummary || {},
        recommendationEvidence: {
          brokerPlanUpdatedAt: execution?.updatedAt || null,
          reviewedAt: new Date().toISOString(),
          advisoryOnly: true,
          brokerExecutionConfirmed: false,
          realPortfolioMutationAllowed: false,
          practicePortfolioMutationAllowed: false
        }
      });

      const message =
        "Reviewed recovery recommendation saved. This records the investor decision only. It does not create an OMS order, submit anything to a broker, or change REAL or Practice portfolio values.";

      setRecommendationConfirmation(null);
      setSavedRecommendation(record);

      if (webOrderReviewInteraction) {
        setRecommendationFeedback({
          title: "Recommendation Saved",
          message
        });
      } else {
        Alert.alert("Recommendation Saved", message);
      }

      return record;
    } catch (error) {
      console.error(
        "Unable to save reviewed recovery recommendation:",
        error
      );

      const message =
        error?.message ||
        "The reviewed recovery recommendation could not be saved.";

      if (webOrderReviewInteraction) {
        setRecommendationFeedback({
          title: "Recommendation Not Saved",
          message
        });
      } else {
        Alert.alert("Recommendation Not Saved", message);
      }

      return null;
    }
  }

  function prepareReviewedRecoveryRecommendation() {
    setRecommendationFeedback(null);
    setRecommendationConfirmation(null);

    if (savedRecommendation) {
      const message =
        "This reviewed recovery recommendation has already been saved.";

      if (webOrderReviewInteraction) {
        setRecommendationFeedback({
          title: "Recommendation Already Saved",
          message
        });
      } else {
        Alert.alert("Recommendation Already Saved", message);
      }

      return;
    }

    if (!brokerPlanMode || !execution?.orders?.length) {
      const message =
        "No reviewed recovery instructions are available to save.";

      if (webOrderReviewInteraction) {
        setRecommendationFeedback({
          title: "Reviewed Recommendation Unavailable",
          message
        });
      } else {
        Alert.alert("Reviewed Recommendation Unavailable", message);
      }

      return;
    }

    const reviewedActions = execution.orders
      .map((order) => ({
        symbol: String(order?.symbol || "").trim().toUpperCase(),
        action: String(
          order?.side ||
          order?.action ||
          "BUY"
        ).trim().toUpperCase(),
        sector: order?.sector || null,
        reason:
          order?.reason ||
          order?.message ||
          "Reviewed Goal Recovery allocation",
        quantity: Number(order?.quantity || 0),
        price: Number(
          order?.price ??
          order?.estimatedPrice ??
          0
        ),
        grossAmount: Number(
          order?.grossAmount ??
          order?.estimatedGross ??
          0
        ),
        estimatedCharges: Number(
          order?.estimatedCharges ??
          order?.charges ??
          0
        ),
        estimatedTotalCost: Number(
          order?.estimatedTotalCost ??
          order?.totalCost ??
          0
        ),
        feeEvidenceAvailable: order?.feeEvidenceAvailable === true,
        guardPrice:
          order?.guardPrice === null ||
          order?.guardPrice === undefined
            ? null
            : Number(order.guardPrice),
        costBasisMethod: order?.costBasisMethod || null
      }))
      .filter(
        (action) =>
          action.symbol &&
          action.action &&
          Number.isFinite(action.quantity) &&
          action.quantity > 0
      );

    if (!reviewedActions.length) {
      const message =
        "The reviewed recovery plan does not contain any valid recommendation actions.";

      if (webOrderReviewInteraction) {
        setRecommendationFeedback({
          title: "Recommendation Actions Unavailable",
          message
        });
      } else {
        Alert.alert("Recommendation Actions Unavailable", message);
      }

      return;
    }

    const message =
      "Save this reviewed recovery allocation as recommendation evidence? This will not create orders, submit trades, or change REAL or Practice portfolio values.";

    if (webOrderReviewInteraction) {
      setRecommendationConfirmation({
        title: "Save Reviewed Recommendation?",
        message,
        reviewedActions
      });
      return;
    }

    Alert.alert(
      "Save Reviewed Recommendation?",
      message,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save Recommendation",
          onPress: () =>
            saveReviewedRecoveryRecommendation(reviewedActions)
        }
      ]
    );
  }

  async function shareBrokerPlan() {
    const report = buildBrokerActionPlanText(execution);
    try {
      await Share.share({ title: "Coach G Broker Action Plan", message: report });
    } catch (error) {
      Alert.alert("Report unavailable", error.message || "The action plan could not be shared.");
    }
  }

  if (!execution || !execution.orders?.length) {
    return (
      <ResponsiveScreen
        mode="flow"
        testID="basket-execution-empty-screen"
      >
        <ResponsiveWorkingRegion>
          <Text style={[styles.title, av3cWidth < 720 && { fontSize: 28, lineHeight: 34 }, av3cWidth < 480 && { fontSize: 25, lineHeight: 31 }]}>
          {brokerPlanMode
            ? "Broker Action Plan Review"
            : isRealExecution
              ? "REAL Basket Execution Status"
              : "Practice Basket Simulation"}
        </Text>
        <Text style={styles.subtitle}>{brokerPlanMode ? "No advisory instructions have been saved yet." : "No active basket execution found."}</Text>

        <Pressable
          style={styles.primary}
          onPress={() => brokerPlanMode ? router.back() : router.push("/orders-review")}
        >
          <Text style={styles.primaryText}>{brokerPlanMode ? "Return to Cost Simulator" : "Open Orders Review"}</Text>
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
    <ResponsiveScreen
      mode="flow"
      testID="basket-execution-screen"
    >
      <ResponsiveWorkingRegion>
        <View style={[styles.headerRow, av3cWidth < 600 && { flexDirection: "column", alignItems: "stretch" }]}>
        <InvestorTopChromeHeader
          compact={av3cWidth < 720}
          style={styles.basketExecutionIdentity}
          testID="basket-execution-top-chrome"
        >
          <Text style={[styles.title, av3cWidth < 720 && { fontSize: 28, lineHeight: 34 }, av3cWidth < 480 && { fontSize: 25, lineHeight: 31 }]}>
            {brokerPlanMode
              ? "Broker Action Plan Review"
              : isRealExecution
                ? "REAL Basket Execution Status"
                : "Practice Basket Simulation"}
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
        {brokerPlanMode
          ? "Review scenario instructions prepared in Trade Lab. This is a broker handoff plan only; saving or sharing it does not place a trade or change any REAL or Practice portfolio."
          : isRealExecution
            ? "Track REAL broker-routing and execution status. Queueing or routing does not prove execution; genuine verified broker evidence remains authoritative."
            : "Track queued Practice orders and simulated fills. Practice records move to portfolio and trade history."}
      </Text>

      <ActiveUserBanner />

      {!brokerPlanMode && !isRealExecution ? (
        <View style={styles.practiceBrokerBanner}>
          <Text style={styles.practiceBrokerTitle}>
            Practice Execution Broker
          </Text>

          <Text style={styles.practiceBrokerText}>
            GateCEP Broker — Simulation Only
          </Text>

          <Text style={styles.practiceBrokerNote}>
            No connected REAL broker is required. These Practice orders
            cannot submit to or change a REAL brokerage account.
          </Text>
        </View>
      ) : null}

      {!brokerPlanMode && recoveryOrders.length > 0 ? (
        <View style={styles.recoveryCard}>
          <Text style={styles.recoveryTitle}>
            REAL Broker Reconciliation Required
          </Text>

          <Text style={styles.recoveryText}>
            {recoveryOrders.length} REAL order
            {recoveryOrders.length === 1 ? "" : "s"} require broker-evidence
            reconciliation. This may include an uncertain submission or a
            verified partial execution with quantity still remaining. Do not
            retry, clear, manually fill, or treat these orders as completed
            until genuine broker evidence establishes the remaining outcome.
          </Text>

          <Pressable
            style={styles.recoveryButton}
            onPress={() =>
              router.push(
                "/real-order-recovery"
              )
            }
          >
            <Text style={styles.recoveryButtonText}>
              Review REAL Submission Recovery
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{brokerPlanMode ? "Proposed Broker Instructions" : "Active Execution Orders"}</Text>
        <Text style={styles.summaryValue}>{activeOrders.length}</Text>
        <Text style={styles.body}>
          Status: {execution.status} • {brokerPlanMode ? "Planned Gross Purchases" : "Active Value"} KES {money(brokerPlanMode ? (execution?.costSummary?.plannedGrossPurchases ?? totalAmount) : totalAmount)}
        </Text>
        {brokerPlanMode && execution?.costSummary?.allChargesVerified ? (
          <>
            <Text style={styles.body}>Verified Estimated Charges: KES {money(execution.costSummary.verifiedEstimatedCharges)}</Text>
            <Text style={styles.body}>Estimated Total Basket Cost: KES {money(execution.costSummary.estimatedTotalBasketCost)}</Text>
          </>
        ) : null}
        <Text style={styles.body}>
          {brokerPlanMode ? "Execution confirmations: 0 — import required" : `Closed Orders: ${closedOrders.length}`}
        </Text>
        {brokerPlanMode && execution?.scenarioFunding?.amount ? (
          <Text style={styles.body}>
            Scenario Recovery Funding: KES {money(execution.scenarioFunding.amount)}
          </Text>
        ) : null}
        {brokerPlanMode && execution?.costSummary?.allChargesVerified && execution?.costSummary?.scenarioFundingRemainingAfterCharges !== null && execution?.costSummary?.scenarioFundingRemainingAfterCharges !== undefined ? (
          <Text style={styles.body}>
            Estimated Funding Remaining: KES {money(execution.costSummary.scenarioFundingRemainingAfterCharges)}
          </Text>
        ) : null}
        {brokerPlanMode && execution?.goalContext?.goalName ? (
          <Text style={styles.body}>Goal: {execution.goalContext.goalName}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {brokerPlanMode ? "Instructions for Broker Review" : isComplete ? "Execution Complete" : "Active Orders"}
        </Text>

        {!brokerPlanMode && isComplete ? (
          <>
            <Text style={styles.body}>
              {isRealExecution
                ? "No active REAL execution orders remain. REAL portfolio and trade-history effects remain determined by genuine verified broker execution evidence."
                : "No active execution orders remain. Filled Practice orders should now be reflected in portfolio and trade history."}
            </Text>

            <Pressable
              style={styles.secondary}
              onPress={() => router.push("/portfolio-hub")}
            >
              <Text style={styles.secondaryText}>
                {isRealExecution
                  ? "Open Portfolio"
                  : "View Practice Portfolio"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondary}
              onPress={() => router.push("/trade-history")}
            >
              <Text style={styles.secondaryText}>
                {isRealExecution
                  ? "Open Trade History"
                  : "View Practice Trade History"}
              </Text>
            </Pressable>

            {!isRealExecution ? (
              <Pressable
                style={styles.secondary}
                onPress={() => router.push("/first-trade")}
              >
                <Text style={styles.secondaryText}>
                  Make Another Practice Trade
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          activeOrders.map((order) => (
            <View key={order.id} style={[styles.orderRow, av3cWidth < 520 && { flexDirection: "column", alignItems: "stretch" }]}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>
                  {String(order.symbol || "?").slice(0, 2)}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.symbol}>{order.symbol}</Text>

                {brokerPlanMode ? (
                  <>
                    <Text style={styles.bodySmall}>
                      {order.side || "BUY"} • Qty {Number(order.quantity || 0).toLocaleString()} @ KES {money(order.price)}
                    </Text>
                    <Text style={styles.reason}>Gross purchase: KES {money(order.gross)}</Text>
                    {order?.feeEvidenceAvailable === true && order?.estimatedCharges !== null && order?.estimatedCharges !== undefined && order?.estimatedTotalCost !== null && order?.estimatedTotalCost !== undefined ? (
                      <>
                        <Text style={styles.reason}>Verified estimated charges: KES {money(order.estimatedCharges)}</Text>
                        <Text style={styles.reason}>Estimated total cost: KES {money(order.estimatedTotalCost)}</Text>
                      </>
                    ) : (
                      <Text style={styles.reason}>Verified estimated charges: Unavailable</Text>
                    )}
                    <Text style={styles.reason}>Broker: {order.brokerName || "Not assigned"}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.bodySmall}>
                      {order.side || "BUY"} • Qty {order.quantity} • KES{" "}
                      {money(order.amount || order.gross)}
                    </Text>
                    <Text style={styles.reason}>
                      Price KES {money(order.price)} •{" "}
                      {order.brokerName || "Broker not assigned"}
                    </Text>
                  </>
                )}

                <Text style={styles.reason}>
                  {brokerPlanMode
                    ? order.message || "Awaiting broker action"
                    : order.message || statusViewFor(order).explanation}
                </Text>
                {brokerPlanMode && order.guardPrice ? <Text style={styles.reason}>{order.side === "SELL" ? "Minimum net break-even limit" : "Maximum no-average-increase limit"}: KES {money(order.guardPrice)}</Text> : null}
                {brokerPlanMode && order.side === "SELL" && order.costBasisMethod ? <Text style={styles.reason}>{order.costBasisMethod} • removed-lot cost KES {money(order.soldCostPerShare)} • projected remaining WAP KES {money(order.projectedRemainingAverage)}</Text> : null}
              </View>

              <Text
                style={statusStyle(
                  brokerPlanMode
                    ? order.status
                    : statusViewFor(order).rawStatus
                )}
              >
                {brokerPlanMode
                  ? order.status
                  : statusViewFor(order).label}
              </Text>
            </View>
          ))
        )}
      </View>

      {brokerPlanMode ? <>
        <View style={styles.safeguardCard}>
          <Text style={styles.cardTitle}>Import-Gated Record</Text>
          <Text style={styles.body}>This is an advisory handoff, not an order, fill or execution confirmation. It cannot update REAL or Practice holdings, cash, cost basis, profit/loss or trade history. Only confirmed broker activity imported through reconciliation may update the REAL portfolio.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Step</Text>
          <Text style={styles.body}>
            Save this reviewed recovery allocation as recommendation evidence. You may also share the advisory plan with your broker. Saving it does not create an order, submit a trade, or change REAL or Practice portfolio values.
          </Text>

          <View style={styles.investorActionCard}>
            <Text style={styles.investorActionEyebrow}>
              Reviewed Recovery Decision
            </Text>

            <Text style={styles.investorActionTitle}>
              Save this reviewed recommendation?
            </Text>

            <Text style={styles.investorActionText}>
              Save the reviewed recovery allocation as recommendation
              evidence. This does not create an order, submit a trade,
              or change REAL or Practice portfolio values.
            </Text>

            <Pressable
              style={[
                styles.primary,
                savedRecommendation ? styles.disabledAction : null
              ]}
              onPress={prepareReviewedRecoveryRecommendation}
              disabled={Boolean(savedRecommendation)}
              accessibilityState={{
                disabled: Boolean(savedRecommendation)
              }}
            >
              <Text style={styles.primaryText}>
                {savedRecommendation
                  ? "Reviewed Recommendation Saved"
                  : "Save Reviewed Recommendation"}
              </Text>
            </Pressable>
          </View>

          {webOrderReviewInteraction && recommendationFeedback ? (
            <View style={styles.orderReviewFeedbackCard}>
              <Text style={styles.orderReviewFeedbackTitle}>
                {recommendationFeedback.title}
              </Text>

              <Text style={styles.orderReviewFeedbackText}>
                {recommendationFeedback.message}
              </Text>

              <View style={styles.orderReviewActionRow}>
                {recommendationFeedback.title === "Recommendation Saved" ? (
                  <Pressable
                    style={styles.primary}
                    onPress={() => router.push("/orders-review")}
                  >
                    <Text style={styles.primaryText}>
                      Continue to Orders Review
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  style={styles.secondary}
                  onPress={() => setRecommendationFeedback(null)}
                >
                  <Text style={styles.secondaryText}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {webOrderReviewInteraction && recommendationConfirmation ? (
            <View style={styles.orderReviewConfirmationCard}>
              <Text style={styles.orderReviewConfirmationTitle}>
                {recommendationConfirmation.title}
              </Text>

              <Text style={styles.orderReviewFeedbackText}>
                {recommendationConfirmation.message}
              </Text>

              <View style={styles.orderReviewActionRow}>
                <Pressable
                  style={styles.secondary}
                  onPress={() => setRecommendationConfirmation(null)}
                >
                  <Text style={styles.secondaryText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={styles.primary}
                  onPress={() =>
                    saveReviewedRecoveryRecommendation(
                      recommendationConfirmation.reviewedActions
                    )
                  }
                >
                  <Text style={styles.primaryText}>
                    Save Recommendation
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Pressable
            style={styles.secondary}
            onPress={() => router.replace("/wealth-journey")}
          >
            <Text style={styles.secondaryText}>Return to Wealth Journey</Text>
          </Pressable>
        </View>
        <Pressable style={styles.primary} onPress={shareBrokerPlan}><Text style={styles.primaryText}>Share Broker Action Report</Text></Pressable>
        <Pressable style={styles.secondary} onPress={() => router.back()}><Text style={styles.secondaryText}>Add or Revise an Instruction</Text></Pressable>
        <Pressable style={styles.secondary} onPress={clearExecution}><Text style={styles.secondaryText}>Clear Broker Action Plan</Text></Pressable>
      </> : <>

      {!isComplete ? (
        <View style={styles.investorActionCard}>
          <Text style={styles.investorActionEyebrow}>
            Next Step
          </Text>

          <Text style={styles.investorActionTitle}>
            {recoveryOrders.length > 0
              ? "Broker reconciliation is required"
              : hasReviewOrders
                ? `${reviewOrders.length} order${reviewOrders.length === 1 ? "" : "s"} still require review`
                : "Execution is in progress"}
          </Text>

          <Text style={styles.investorActionText}>
            {recoveryOrders.length > 0
              ? "Resolve the REAL broker-evidence recovery state before taking another execution action."
              : hasReviewOrders
                ? "Review the remaining order details before continuing the basket through execution."
                : "Track the persisted execution lifecycle while GateCEP processes the accepted orders."}
          </Text>

          {recoveryOrders.length > 0 ? (
            <Pressable
              style={styles.primary}
              onPress={() =>
                router.push("/real-order-recovery")
              }
            >
              <Text style={styles.primaryText}>
                Review REAL Submission Recovery
              </Text>
            </Pressable>
          ) : hasReviewOrders ? (
            <Pressable
              style={styles.primary}
              onPress={() => router.push("/orders-review")}
            >
              <Text style={styles.primaryText}>
                Open Orders Review ({reviewOrders.length})
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.primary}
              onPress={() => router.push("/(tabs)/trading")}
            >
              <Text style={styles.primaryText}>
                View Execution Progress
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <View style={styles.diagnosticsCard}>
        <Pressable
          style={styles.diagnosticsHeader}
          onPress={() =>
            setShowUatDiagnostics((current) => !current)
          }
          accessibilityRole="button"
          accessibilityState={{
            expanded: showUatDiagnostics
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.diagnosticsTitle}>
              UAT / Diagnostics
            </Text>

            <Text style={styles.diagnosticsSubtitle}>
              Operational inspection and guarded test controls
            </Text>
          </View>

          <Text style={styles.diagnosticsChevron}>
            {showUatDiagnostics ? "▲" : "▼"}
          </Text>
        </Pressable>

        {showUatDiagnostics ? (
          <View style={styles.diagnosticsBody}>
            <Text style={styles.diagnosticsNote}>
              These controls are for execution inspection and UAT.
              They do not replace the investor-facing lifecycle above.
            </Text>

            <Pressable
              style={styles.secondary}
              onPress={() => router.push("/(tabs)/trading")}
            >
              <Text style={styles.secondaryText}>
                Open Broker Routing
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondary}
              onPress={() => router.push("/queue-manager")}
            >
              <Text style={styles.secondaryText}>
                Open Queue Manager
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondary}
              onPress={() => router.push("/orders")}
            >
              <Text style={styles.secondaryText}>
                Open OMS Orders
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondary}
              onPress={() => router.push("/orders-review")}
            >
              <Text style={styles.secondaryText}>
                Open Orders Review
              </Text>
            </Pressable>

            <Pressable
              style={styles.diagnosticsDanger}
              onPress={clearExecution}
            >
              <Text style={styles.diagnosticsDangerText}>
                Clear Execution
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      </>}
      </ResponsiveWorkingRegion>
    </ResponsiveScreen>
  );
}

function statusStyle(status) {
  if (status === ORDER_STATUS.QUEUED) return styles.queued;
  if (status === ORDER_STATUS.ROUTED) return styles.routed;
  if (status === ORDER_STATUS.BROKER_RECEIVED) return styles.received;
  if (status === ORDER_STATUS.PARTIAL_FILL) return styles.partial;
  return styles.pending;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

const styles = StyleSheet.create({
  investorActionCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,.45)",
    backgroundColor: "rgba(88,28,135,.18)"
  },
  investorActionEyebrow: {
    color: "#c084fc",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  investorActionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 7
  },
  investorActionText: {
    color: "#cbd5e1",
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 4
  },
  orderReviewFeedbackCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#a16207",
    backgroundColor: "#221a09"
  },
  orderReviewFeedbackTitle: {
    color: "#facc15",
    fontSize: 16,
    fontWeight: "900"
  },
  orderReviewConfirmationCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,.45)",
    backgroundColor: "rgba(8,145,178,.10)"
  },
  orderReviewConfirmationTitle: {
    color: "#67e8f9",
    fontSize: 16,
    fontWeight: "900"
  },
  orderReviewFeedbackText: {
    color: "#cbd5e1",
    lineHeight: 20,
    marginTop: 7
  },
  orderReviewActionRow: {
    marginTop: 12,
    gap: 10
  },
  diagnosticsCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0f172a",
    overflow: "hidden"
  },
  diagnosticsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16
  },
  diagnosticsTitle: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "900"
  },
  diagnosticsSubtitle: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 3
  },
  diagnosticsChevron: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 12
  },
  diagnosticsBody: {
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    padding: 14
  },
  diagnosticsNote: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4
  },
  diagnosticsDanger: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#7f1d1d",
    backgroundColor: "rgba(127,29,29,.18)",
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center"
  },
  diagnosticsDangerText: {
    color: "#fca5a5",
    fontWeight: "900"
  },
  practiceBrokerBanner: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,.35)",
    backgroundColor: "rgba(34,211,238,.08)"
  },
  practiceBrokerTitle: {
    color: "#67e8f9",
    fontSize: 12,
    fontWeight: "900"
  },
  practiceBrokerText: {
    color: "white",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4
  },
  practiceBrokerNote: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5
  },
  recoveryCard: {
    borderWidth: 1,
    borderColor: "#a16207",
    backgroundColor: "#221a09",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16
  },
  recoveryTitle: {
    color: "#facc15",
    fontWeight: "900",
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  title: { color: "white", fontSize: 32, fontWeight: "900", flex: 1 },
  basketExecutionIdentity: {
    flex: 1,
    minWidth: 0
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
    backgroundColor: "rgba(147,51,234,.14)",
    borderColor: "rgba(147,51,234,.38)",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  summaryLabel: { color: "#cbd5e1" },
  summaryValue: {
    color: "white",
    fontSize: 38,
    fontWeight: "900",
    marginTop: 6
  },
  body: { color: "#cbd5e1", marginTop: 8, lineHeight: 21 },
  card: {
    marginTop: 20,
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18
  },
  safeguardCard: {
    marginTop: 20,
    backgroundColor: "rgba(8,47,73,.55)",
    borderColor: "#0891b2",
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
  orderRow: {
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
  bodySmall: { color: "#cbd5e1", marginTop: 4, fontSize: 12 },
  reason: { color: "#94a3b8", marginTop: 4, fontSize: 12 },
  pending: { color: "#94a3b8", fontWeight: "900", fontSize: 12 },
  queued: { color: "#67e8f9", fontWeight: "900", fontSize: 12 },
  routed: { color: "#c084fc", fontWeight: "900", fontSize: 12 },
  received: { color: "#38bdf8", fontWeight: "900", fontSize: 12 },
  partial: { color: "#fde68a", fontWeight: "900", fontSize: 12 },
  primary: {
    marginTop: 20,
    backgroundColor: "#9333ea",
    padding: 18,
    borderRadius: 18
  },
  disabledAction: {
    opacity: 0.42
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
