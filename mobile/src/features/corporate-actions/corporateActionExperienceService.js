import {
  buildCoachGCorporateActionAdviceBatch,
  buildCoachGCorporateActionSummary
} from "./coachGCorporateActionAdvisor";

import {
  loadCorporateActions
} from "./corporateActionRegistry";

/*
 * ============================================================
 * PC-027I
 * CORPORATE ACTION INVESTOR EXPERIENCE SERVICE
 * ============================================================
 *
 * Purpose:
 * Convert the PC-027 intelligence stack into a small set of
 * investor-facing surfaces for Home, Portfolio and Coach G.
 *
 * This service intentionally hides the implementation engines.
 * The investor receives meaning:
 *
 * - what needs attention,
 * - expected income,
 * - decisions to review,
 * - important share changes,
 * - what Coach G wants them to do next.
 * ============================================================
 */

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function priorityRank(value) {
  const rank = {
    CRITICAL: 5,
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    INFO: 1
  };

  return rank[value] || 0;
}

function formatActionType(type) {
  return String(type || "Corporate action")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function buildCorporateActionInvestorExperience({
  actions = null,
  holdings = [],
  portfolio = {},
  investorContext = {}
} = {}) {
  const resolvedActions =
    actions === null
      ? loadCorporateActions()
      : safeArray(actions);

  const advice =
    await buildCoachGCorporateActionAdviceBatch({
      actions: resolvedActions,
      holdings,
      portfolio,
      investorContext
    });

  const summary =
    await buildCoachGCorporateActionSummary({
      actions: resolvedActions,
      holdings,
      portfolio,
      investorContext
    });

  const attentionItems =
    advice
      .filter(
        (item) =>
          item?.priority === "CRITICAL" ||
          item?.priority === "HIGH" ||
          item?.decision?.decisionRequired ||
          item?.entitlement?.status === "ELIGIBILITY_UNKNOWN" ||
          item?.receivable?.status === "OVERDUE"
      )
      .sort(
        (first, second) =>
          priorityRank(second?.priority) -
          priorityRank(first?.priority)
      );

  const incomeItems =
    advice.filter(
      (item) =>
        Number(
          item?.receivable?.expectedAmount
        ) > 0
    );

  const decisionItems =
    advice.filter(
      (item) =>
        Boolean(
          item?.decision?.decisionRequired
        )
    );

  const shareChangeItems =
    advice.filter(
      (item) =>
        Boolean(
          item?.shareAdjustment?.applicable
        )
    );

  const homeCard = buildHomeCorporateActionCard({
    summary,
    advice,
    attentionItems
  });

  const portfolioCard = buildPortfolioCorporateActionCard({
    advice,
    incomeItems,
    decisionItems,
    shareChangeItems
  });

  const coachGPrompt = buildCoachGCorporateActionPrompt({
    advice,
    attentionItems,
    investorContext
  });

  return {
    generatedAt:
      new Date().toISOString(),

    total:
      advice.length,

    summary,

    advice,

    attentionItems,

    incomeItems,

    decisionItems,

    shareChangeItems,

    homeCard,

    portfolioCard,

    coachGPrompt,

    route:
      "/corporate-actions"
  };
}

export function buildHomeCorporateActionCard({
  summary,
  advice = [],
  attentionItems = []
} = {}) {
  const top =
    attentionItems[0] ||
    safeArray(advice)[0] ||
    null;

  if (!top) {
    return {
      visible:
        false,

      title:
        "Corporate Actions",

      message:
        "No investor-relevant corporate actions currently require attention.",

      route:
        "/corporate-actions"
    };
  }

  const next =
    top?.nextBestAction;

  return {
    visible:
      true,

    badge:
      top?.priority || "INFO",

    title:
      `${top?.event?.symbol || "Portfolio"} · ${formatActionType(
        top?.event?.type
      )}`,

    message:
      top?.narrative ||
      next?.reason ||
      "Coach G is monitoring a corporate action that may affect your portfolio.",

    actionLabel:
      next?.label ||
      "Review with Coach G",

    route:
      "/corporate-actions",

    count:
      summary?.total || safeArray(advice).length,

    highPriorityCount:
      summary?.highPriority || 0
  };
}

export function buildPortfolioCorporateActionCard({
  advice = [],
  incomeItems = [],
  decisionItems = [],
  shareChangeItems = []
} = {}) {
  const expectedIncome =
    safeArray(incomeItems).reduce(
      (total, item) =>
        total +
        (
          Number(
            item?.receivable?.expectedAmount
          ) || 0
        ),
      0
    );

  return {
    visible:
      safeArray(advice).length > 0,

    title:
      "Corporate Actions",

    expectedIncome,

    incomeCurrency:
      incomeItems?.[0]?.receivable?.currency ||
      "KES",

    decisionCount:
      safeArray(decisionItems).length,

    shareChangeCount:
      safeArray(shareChangeItems).length,

    message:
      safeArray(advice).length
        ? `Coach G is monitoring ${safeArray(advice).length} corporate action(s) affecting your investments.`
        : "No corporate actions currently affect this portfolio.",

    route:
      "/corporate-actions"
  };
}

export function buildCoachGCorporateActionPrompt({
  advice = [],
  attentionItems = [],
  investorContext = {}
} = {}) {
  const focus =
    attentionItems[0] ||
    safeArray(advice)[0] ||
    null;

  if (!focus) {
    return {
      shouldSurface:
        false,

      title:
        "No corporate action needs attention",

      message:
        null
    };
  }

  return {
    shouldSurface:
      true,

    priority:
      focus?.priority ||
      "INFO",

    title:
      focus?.nextBestAction?.label ||
      "Review corporate action",

    message:
      focus?.narrative ||
      "A corporate action may affect your investments.",

    suggestedQuestion:
      focus?.decision?.decisionRequired
        ? `Coach G, help me understand whether ${focus?.decision?.recommendation?.decision || "this election"} is right for my goals.`
        : `Coach G, explain how this ${formatActionType(
            focus?.event?.type
          ).toLowerCase()} affects me.`,

    route:
      "/corporate-actions",

    investorGoal:
      investorContext?.goal ||
      null
  };
}

export function loadInvestorCorporateActionHomeCard(
  options = {}
) {
  return buildCorporateActionInvestorExperience(
    options
  ).then(
    (experience) =>
      experience.homeCard
  );
}

export function loadInvestorCorporateActionPortfolioCard(
  options = {}
) {
  return buildCorporateActionInvestorExperience(
    options
  ).then(
    (experience) =>
      experience.portfolioCard
  );
}

export function loadCoachGCorporateActionExperiencePrompt(
  options = {}
) {
  return buildCorporateActionInvestorExperience(
    options
  ).then(
    (experience) =>
      experience.coachGPrompt
  );
}
