import {
  buildCorporateActionLifecycleAnalysis
} from "./corporateActionLifecycleEngine";

import {
  buildInvestorCorporateActionEntitlement
} from "./investorCorporateActionEntitlementEngine";

import {
  buildCorporateActionPortfolioImpact
} from "./corporateActionPortfolioImpactEngine";

import {
  buildCorporateActionReceivable
} from "./corporateActionIncomeReceivableEngine";

import {
  buildCorporateActionShareAdjustment
} from "./corporateActionShareAdjustmentEngine";

import {
  buildCorporateActionDecisionIntelligence
} from "./corporateActionDecisionIntelligenceEngine";

/*
 * ============================================================
 * PC-027H
 * COACH G CORPORATE ACTION ADVISOR
 * ============================================================
 *
 * Investor-first purpose:
 *
 * Unify PC-027B through PC-027G into one Coach G-ready advisory
 * object that answers:
 *
 * - What happened?
 * - Does it affect this investor?
 * - What are they entitled to?
 * - What is the portfolio impact?
 * - Is there income to monitor?
 * - Is there a share adjustment?
 * - Is a decision required?
 * - What does Coach G recommend?
 * - Why?
 * - What should happen next?
 *
 * Safeguards:
 * - advisory only
 * - no portfolio mutation
 * - no cash mutation
 * - no election execution
 * - no broker confirmation assumed
 * ============================================================
 */

export const COACH_G_CORPORATE_ACTION_PRIORITIES = Object.freeze({
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFO: "INFO"
});

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeText(value) {
  return value === null ||
    value === undefined
      ? null
      : String(value)
          .trim() ||
        null;
}

function buildEventSummary(action = {}) {
  return {
    actionId:
      action?.id ||
      null,

    symbol:
      action?.symbol ||
      null,

    companyName:
      action?.companyName ||
      null,

    type:
      action?.type ||
      null,

    status:
      action?.status ||
      null,

    title:
      action?.title ||
      `${action?.symbol || "Company"} corporate action`,

    announcementDate:
      action?.announcementDate ||
      null,

    exDate:
      action?.exDate ||
      null,

    recordDate:
      action?.recordDate ||
      null,

    paymentDate:
      action?.paymentDate ||
      null,

    effectiveDate:
      action?.effectiveDate ||
      null
  };
}

function classifyAdvicePriority({
  lifecycle,
  entitlement,
  receivable,
  decision
} = {}) {
  if (
    decision
      ?.decisionRequired
  ) {
    return COACH_G_CORPORATE_ACTION_PRIORITIES
      .HIGH;
  }

  if (
    entitlement
      ?.status ===
      "ELIGIBILITY_UNKNOWN" ||
    receivable
      ?.status ===
      "OVERDUE"
  ) {
    return COACH_G_CORPORATE_ACTION_PRIORITIES
      .HIGH;
  }

  if (
    lifecycle
      ?.investorAttention
      ?.level ===
      "MEDIUM" ||
    receivable
      ?.expectedAmount >
      0
  ) {
    return COACH_G_CORPORATE_ACTION_PRIORITIES
      .MEDIUM;
  }

  if (
    lifecycle
      ?.investorAttention
      ?.level ===
      "LOW"
  ) {
    return COACH_G_CORPORATE_ACTION_PRIORITIES
      .LOW;
  }

  return COACH_G_CORPORATE_ACTION_PRIORITIES
    .INFO;
}

function buildNextBestAction({
  lifecycle,
  entitlement,
  receivable,
  shareAdjustment,
  decision
} = {}) {
  if (
    entitlement
      ?.status ===
      "ELIGIBILITY_UNKNOWN"
  ) {
    return {
      action:
        "CONFIRM_ELIGIBILITY",

      label:
        "Confirm eligibility",

      reason:
        "GateCEP needs record-date or equivalent evidence before treating the entitlement as confirmed."
    };
  }

  if (
    decision
      ?.decisionRequired
  ) {
    return {
      action:
        "DISCUSS_DECISION",

      label:
        "Review the decision with Coach G",

      reason:
        decision
          ?.recommendation
          ?.rationale ||
        "The investor has a real election to consider."
    };
  }

  if (
    receivable
      ?.status ===
      "OVERDUE"
  ) {
    return {
      action:
        "REVIEW_MISSING_PAYMENT",

      label:
        "Review expected payment",

      reason:
        "The expected payment date has passed and the income has not yet been matched."
    };
  }

  if (
    receivable
      ?.expectedAmount >
      0
  ) {
    return {
      action:
        "MONITOR_INCOME",

      label:
        "Monitor expected income",

      reason:
        "The investor has expected cash income from this corporate action."
    };
  }

  if (
    shareAdjustment
      ?.applicable
  ) {
    return {
      action:
        "EXPLAIN_SHARE_CHANGE",

      label:
        "Explain the share adjustment",

      reason:
        "The holding quantity may change mechanically and should not be interpreted as investor trading behavior."
    };
  }

  if (
    lifecycle
      ?.terminal
  ) {
    return {
      action:
        "NO_ACTION",

      label:
        "No action required",

      reason:
        "The corporate action lifecycle is complete."
    };
  }

  return {
    action:
      "MONITOR_EVENT",

    label:
      "Continue monitoring",

    reason:
      "The corporate action is still progressing through its lifecycle."
  };
}

function buildCoachGNarrative({
  action,
  lifecycle,
  entitlement,
  portfolioImpact,
  receivable,
  shareAdjustment,
  decision,
  nextBestAction,
  investorContext
} = {}) {
  const pieces = [];

  pieces.push(
    `${action?.symbol || "This company"} has a ${String(
      action?.type ||
      "corporate action"
    )
      .replaceAll("_", " ")
      .toLowerCase()} event.`
  );

  if (
    entitlement
      ?.status ===
      "INELIGIBLE"
  ) {
    pieces.push(
      "Based on the information available, this investor does not appear eligible."
    );
  } else if (
    entitlement
      ?.status ===
      "ELIGIBILITY_UNKNOWN"
  ) {
    pieces.push(
      "GateCEP cannot yet confirm eligibility because record-date or equivalent evidence is missing."
    );
  } else if (
    entitlement
      ?.eligibleQuantity !==
      null &&
    entitlement
      ?.eligibleQuantity !==
      undefined
  ) {
    pieces.push(
      `The current eligible quantity is ${entitlement.eligibleQuantity}.`
    );
  }

  if (
    receivable
      ?.expectedAmount >
      0
  ) {
    pieces.push(
      `Expected cash income is approximately ${receivable.currency || action?.currency || "KES"} ${receivable.expectedAmount}.`
    );
  }

  if (
    shareAdjustment
      ?.applicable
  ) {
    pieces.push(
      shareAdjustment
        ?.coachGContext
        ?.explanation ||
      "The share quantity may change because of the corporate action."
    );
  }

  if (
    portfolioImpact
      ?.goalImpact
      ?.progressChangePercentagePoints !==
      null &&
    portfolioImpact
      ?.goalImpact
      ?.progressChangePercentagePoints !==
      undefined
  ) {
    pieces.push(
      `The projected effect changes estimated goal progress by ${portfolioImpact.goalImpact.progressChangePercentagePoints} percentage point(s).`
    );
  }

  if (
    decision
      ?.decisionRequired
  ) {
    pieces.push(
      `Coach G currently leans toward ${decision?.recommendation?.decision || "further review"} with ${decision?.confidence || "low"} confidence.`
    );

    if (
      decision
        ?.recommendation
        ?.rationale
    ) {
      pieces.push(
        decision
          .recommendation
          .rationale
      );
    }
  }

  if (
    investorContext?.goal
  ) {
    pieces.push(
      `Any recommendation should remain aligned with the investor's goal: ${investorContext.goal}.`
    );
  }

  pieces.push(
    `Next: ${nextBestAction?.label || "continue monitoring"}.`
  );

  return pieces.join(" ");
}

export async function buildCoachGCorporateActionAdvice({
  action,
  holding,
  portfolio = {},
  investorContext = {}
} = {}) {
  if (!action) {
    return {
      valid:
        false,

      error:
        "CORPORATE_ACTION_REQUIRED"
    };
  }

  const lifecycle =
    buildCorporateActionLifecycleAnalysis(
      action
    );

  const entitlement =
    buildInvestorCorporateActionEntitlement({
      action,
      holding,
      investorContext: {
        ...investorContext,

        availableCash:
          investorContext
            ?.availableCash ??
          portfolio
            ?.availableCash
      }
    });

  const portfolioImpact =
    buildCorporateActionPortfolioImpact({
      action,
      holding,
      portfolio,
      investorContext,
      entitlement
    });

  const receivable =
    buildCorporateActionReceivable({
      action,
      holding,
      investorContext,
      entitlement
    });

  const shareAdjustment =
    buildCorporateActionShareAdjustment({
      action,
      holding,
      investorContext,
      entitlement
    });

  const decision =
    buildCorporateActionDecisionIntelligence({
      action,
      holding,
      portfolio,
      investorContext,
      entitlement
    });

  const priority =
    classifyAdvicePriority({
      lifecycle,
      entitlement,
      receivable,
      decision
    });

  const nextBestAction =
    buildNextBestAction({
      lifecycle,
      entitlement,
      receivable,
      shareAdjustment,
      decision
    });

  const narrative =
    buildCoachGNarrative({
      action,
      lifecycle,
      entitlement,
      portfolioImpact,
      receivable,
      shareAdjustment,
      decision,
      nextBestAction,
      investorContext
    });

  return {
    valid:
      true,

    generatedAt:
      new Date()
        .toISOString(),

    advisor:
      "Coach G",

    event:
      buildEventSummary(
        action
      ),

    priority,

    lifecycle,

    entitlement,

    portfolioImpact,

    receivable,

    shareAdjustment,

    decision,

    nextBestAction,

    narrative,

    investorContext: {
      goal:
        investorContext
          ?.goal ||
        null,

      timeHorizon:
        investorContext
          ?.timeHorizon ||
        null,

      incomePreference:
        investorContext
          ?.incomePreference ||
        null,

      liquidityNeed:
        investorContext
          ?.liquidityNeed ||
        null
    },

    safeguards: {
      advisoryOnly:
        true,

      portfolioMutated:
        false,

      cashMutated:
        false,

      decisionExecuted:
        false,

      brokerConfirmationAssumed:
        false
    }
  };
}

export async function buildCoachGCorporateActionAdviceBatch({
  actions = [],
  holdings = [],
  portfolio = {},
  investorContext = {}
} = {}) {
  const normalizedActions =
    safeArray(
      actions
    );

  const normalizedHoldings =
    safeArray(
      holdings
    );

  const advice =
    await Promise.all(
      normalizedActions.map(
        async (
          action
        ) => {
          const holding =
            normalizedHoldings.find(
              (
                item
              ) =>
                String(
                  item?.symbol ||
                  ""
                )
                  .trim()
                  .toUpperCase() ===
                String(
                  action?.symbol ||
                  ""
                )
                  .trim()
                  .toUpperCase()
            ) || {
              symbol:
                action?.symbol,
              quantity:
                0
            };

          return buildCoachGCorporateActionAdvice({
            action,
            holding,
            portfolio,
            investorContext
          });
        }
      )
    );

  const rank = {
    CRITICAL:
      5,

    HIGH:
      4,

    MEDIUM:
      3,

    LOW:
      2,

    INFO:
      1
  };

  return advice
    .filter(
      (
        item
      ) =>
        item?.valid
    )
    .sort(
      (
        first,
        second
      ) =>
        (
          rank[
            second
              ?.priority
          ] ||
          0
        ) -
        (
          rank[
            first
              ?.priority
          ] ||
          0
        )
    );
}

export async function buildCoachGCorporateActionSummary({
  actions = [],
  holdings = [],
  portfolio = {},
  investorContext = {}
} = {}) {
  const advice =
    await buildCoachGCorporateActionAdviceBatch({
      actions,
      holdings,
      portfolio,
      investorContext
    });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    total:
      advice.length,

    highPriority:
      advice.filter(
        (
          item
        ) =>
          item.priority ===
            COACH_G_CORPORATE_ACTION_PRIORITIES
              .CRITICAL ||
          item.priority ===
            COACH_G_CORPORATE_ACTION_PRIORITIES
              .HIGH
      ).length,

    decisionRequired:
      advice.filter(
        (
          item
        ) =>
          item
            ?.decision
            ?.decisionRequired
      ).length,

    expectedIncomeEvents:
      advice.filter(
        (
          item
        ) =>
          item
            ?.receivable
            ?.expectedAmount >
          0
      ).length,

    eligibilityUnknown:
      advice.filter(
        (
          item
        ) =>
          item
            ?.entitlement
            ?.status ===
          "ELIGIBILITY_UNKNOWN"
      ).length,

    topAdvice:
      advice[0] ||
      null,

    narrative:
      advice.length
        ? `Coach G is monitoring ${advice.length} corporate action(s). ${advice.filter((item) => item?.decision?.decisionRequired).length} require an investor decision and ${advice.filter((item) => item?.receivable?.expectedAmount > 0).length} include expected cash income.`
        : "Coach G is not currently monitoring any investor-relevant corporate actions."
  };
}

export async function loadCoachGCorporateActionAdvice({
  actions = [],
  holdings = [],
  portfolio = {},
  investorContext = {}
} = {}) {
  return buildCoachGCorporateActionAdviceBatch({
    actions,
    holdings,
    portfolio,
    investorContext
  });
}

export async function loadCoachGHighPriorityCorporateActions({
  actions = [],
  holdings = [],
  portfolio = {},
  investorContext = {}
} = {}) {
  const advice =
    await buildCoachGCorporateActionAdviceBatch({
      actions,
      holdings,
      portfolio,
      investorContext
    });

  return advice.filter(
    (
      item
    ) =>
      item.priority ===
        COACH_G_CORPORATE_ACTION_PRIORITIES
          .CRITICAL ||
      item.priority ===
        COACH_G_CORPORATE_ACTION_PRIORITIES
          .HIGH
  );
}

export async function loadCoachGCorporateActionsRequiringDecision({
  actions = [],
  holdings = [],
  portfolio = {},
  investorContext = {}
} = {}) {
  const advice =
    await buildCoachGCorporateActionAdviceBatch({
      actions,
      holdings,
      portfolio,
      investorContext
    });

  return advice.filter(
    (
      item
    ) =>
      item
        ?.decision
        ?.decisionRequired
  );
}

export async function loadCoachGCorporateActionIncomeEvents({
  actions = [],
  holdings = [],
  portfolio = {},
  investorContext = {}
} = {}) {
  const advice =
    await buildCoachGCorporateActionAdviceBatch({
      actions,
      holdings,
      portfolio,
      investorContext
    });

  return advice.filter(
    (
      item
    ) =>
      item
        ?.receivable
        ?.expectedAmount >
      0
  );
}

export async function loadCoachGTopCorporateAction({
  actions = [],
  holdings = [],
  portfolio = {},
  investorContext = {}
} = {}) {
  const advice =
    await buildCoachGCorporateActionAdviceBatch({
      actions,
      holdings,
      portfolio,
      investorContext
    });

  return advice[0] ||
    null;
}
