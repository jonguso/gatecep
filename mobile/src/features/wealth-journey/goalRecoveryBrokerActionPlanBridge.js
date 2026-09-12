/*
 * PC-030M20AV2C — Recovery Basket -> Broker Action Plan Bridge
 */
export function buildRecoveryBrokerActionPlan({
  execution = null,
  recoveryAmount = 0,
  goalContext = {}
} = {}) {
  const orders = Array.isArray(execution?.orders) ? execution.orders : [];

  if (orders.length < 2) {
    return {
      ok: false,
      reason: "DIVERSIFIED_RECOVERY_BASKET_REQUIRED",
      plan: null
    };
  }

  const now = new Date().toISOString();

  const allChargesVerified =
    orders.length > 0 &&
    orders.every((order) =>
      order?.feeEvidenceAvailable === true &&
      order?.estimatedCharges !== null &&
      order?.estimatedCharges !== undefined &&
      order?.estimatedTotalCost !== null &&
      order?.estimatedTotalCost !== undefined
    );

  const plannedGrossPurchases = orders.reduce(
    (sum, order) => sum + Number(order?.gross || 0),
    0
  );

  const verifiedEstimatedCharges = allChargesVerified
    ? orders.reduce((sum, order) => sum + Number(order?.estimatedCharges || 0), 0)
    : null;

  const estimatedTotalBasketCost = allChargesVerified
    ? orders.reduce((sum, order) => sum + Number(order?.estimatedTotalCost || 0), 0)
    : null;

  const planOrders = orders.map((order, index) => ({
    ...order,
    id: order.id || `BAP-RECOVERY-${Date.now()}-${index}`,
    status: "REVIEW",
    message: "Prepared for manual broker review; not executed",
    advisoryOnly: true,
    brokerExecutionConfirmed: false,
    realPortfolioMutationAllowed: false,
    practicePortfolioMutationAllowed: false,
    scenarioFundingOnly: true,
    createdAt: order.createdAt || now,
    updatedAt: now
  }));

  return {
    ok: true,
    reason: "RECOVERY_BROKER_ACTION_PLAN_READY",
    plan: {
      id: `BROKER-PLAN-RECOVERY-${Date.now()}`,
      executionMode: "BROKER_HANDOFF_ONLY",
      source: "COACH_G_ADVISORY",
      scenarioSource: "GOAL_RECOVERY",
      status: "REVIEW",
      scenarioFunding: {
        amount: Number(recoveryAmount || 0),
        source: "NEW_RECOVERY_FUNDING",
        temporaryOnly: true,
        realCashMutationAllowed: false
      },
      costSummary: {
        allChargesVerified,
        plannedGrossPurchases,
        verifiedEstimatedCharges,
        estimatedTotalBasketCost,
        grossFundingRemainingBeforeCharges: Math.max(0, Number(recoveryAmount || 0) - plannedGrossPurchases),
        scenarioFundingRemainingAfterCharges:
          allChargesVerified && estimatedTotalBasketCost !== null
            ? Math.max(0, Number(recoveryAmount || 0) - estimatedTotalBasketCost)
            : null,
        chargesInvented: false
      },
      goalContext: {
        ...goalContext,
        preserveGoal: true,
        preserveTargetDate: true,
        preserveContribution: true
      },
      advisoryOnly: true,
      brokerExecutionConfirmed: false,
      realPortfolioMutationAllowed: false,
      practicePortfolioMutationAllowed: false,
      createdAt: now,
      updatedAt: now,
      orders: planOrders
    }
  };
}

export const RECOVERY_BROKER_PLAN_INTEGRITY = Object.freeze({
  executionMode: "BROKER_HANDOFF_ONLY",
  advisoryOnly: true,
  brokerExecutionConfirmed: false,
  realCashMutationAllowed: false,
  realPortfolioMutationAllowed: false,
  practicePortfolioMutationAllowed: false,
  goalMutationAllowed: false,
  investorDNAMutationAllowed: false
});
