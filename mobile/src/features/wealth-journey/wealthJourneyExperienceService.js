import {
  buildCoachGWealthJourneyAdvice
} from "./coachGWealthJourneyAdvisor";

/*
 * ============================================================
 * PC-028F
 * WEALTH JOURNEY INVESTOR EXPERIENCE SERVICE
 * ============================================================
 *
 * Purpose:
 * Turn the PC-028 intelligence stack into a small set of simple,
 * investor-facing surfaces.
 *
 * The investor should see:
 * - am I on track?
 * - what matters now?
 * - what should I discuss with Coach G?
 * - what is the next best action?
 *
 * The investor should NOT have to navigate the underlying engines.
 * ============================================================
 */

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function priorityRank(value) {
  return {
    CRITICAL: 5,
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    INFO: 1
  }[value] || 0;
}

function statusLabel(status) {
  const map = {
    ACHIEVED: "Goal achieved",
    AHEAD: "Ahead of plan",
    ON_TRACK: "On track",
    SLIGHTLY_BEHIND: "Slightly behind",
    BEHIND: "Behind plan",
    CRITICAL_GAP: "Needs attention",
    NOT_ENOUGH_DATA: "Still learning"
  };

  return map[status] || "Being reviewed";
}

export function buildWealthJourneyHomeCard({
  journey
} = {}) {
  const top =
    journey?.topPriorityGoal ||
    journey?.goalAdvice?.[0] ||
    null;

  if (!top) {
    return {
      visible: false,
      title: "Your Wealth Journey",
      message:
        "Coach G is ready to help you define and track your first financial goal.",
      actionLabel:
        "Talk to Coach G",
      route:
        "/wealth-journey"
    };
  }

  const status =
    top
      ?.progress
      ?.classification
      ?.status;

  return {
    visible: true,

    priority:
      top?.priority ||
      "INFO",

    title:
      `${top?.goal?.name || "Your goal"} · ${statusLabel(status)}`,

    message:
      top?.narrative ||
      top
        ?.progress
        ?.coachGContext
        ?.narrative ||
      "Coach G is monitoring this goal.",

    actionLabel:
      top
        ?.nextAction
        ?.label ||
      "Review with Coach G",

    route:
      "/wealth-journey",

    goalId:
      top?.goal?.id ||
      null
  };
}

export function buildWealthJourneyCoachGPrompt({
  journey
} = {}) {
  const top =
    journey?.topPriorityGoal ||
    null;

  if (!top) {
    return {
      shouldSurface: false,
      title: "No active goal yet",
      message: null
    };
  }

  const questions =
    safeArray(
      top
        ?.conversation
        ?.questions
    );

  return {
    shouldSurface: true,

    priority:
      top?.priority ||
      "INFO",

    title:
      top
        ?.nextAction
        ?.label ||
      "Review your wealth journey",

    message:
      top?.narrative ||
      "Coach G has an update on your progress.",

    suggestedQuestion:
      questions[0] ||
      `Coach G, am I still on track for ${top?.goal?.name || "my goal"}?`,

    route:
      "/wealth-journey",

    goalId:
      top?.goal?.id ||
      null
  };
}

export function buildWealthJourneyGoalsSummary({
  journey
} = {}) {
  const goalAdvice =
    safeArray(
      journey?.goalAdvice
    );

  return {
    totalGoals:
      goalAdvice.length,

    achieved:
      safeArray(
        journey?.achievedGoals
      ).length,

    onTrack:
      safeArray(
        journey?.onTrackGoals
      ).length,

    needsAttention:
      safeArray(
        journey?.needsAttention
      ).length,

    goals:
      goalAdvice.map(
        (item) => ({
          id:
            item?.goal?.id ||
            null,

          name:
            item?.goal?.name ||
            "Financial Goal",

          priority:
            item?.priority ||
            "INFO",

          status:
            item
              ?.progress
              ?.classification
              ?.status ||
            "NOT_ENOUGH_DATA",

          statusLabel:
            item
              ?.progress
              ?.classification
              ?.label ||
            "Being reviewed",

          currentValue:
            item
              ?.progress
              ?.trajectory
              ?.currentValue ??
            null,

          targetAmount:
            item
              ?.progress
              ?.trajectory
              ?.targetAmount ??
            null,

          projectedValue:
            item
              ?.progress
              ?.trajectory
              ?.projectedValue ??
            null,

          projectedGap:
            item
              ?.progress
              ?.trajectory
              ?.projectedGap ??
            null,

          currency:
            item
              ?.goal
              ?.currency ||
            "KES",

          nextAction:
            item?.nextAction ||
            null,

          narrative:
            item?.narrative ||
            null
        })
      )
  };
}

export function buildWealthJourneyPortfolioContext({
  journey
} = {}) {
  const attention =
    safeArray(
      journey?.needsAttention
    );

  const top =
    journey?.topPriorityGoal ||
    journey?.goalAdvice?.[0] ||
    null;

  if (!top) {
    return {
      visible: false,
      route:
        "/wealth-journey"
    };
  }

  const concentrationIssue =
    top
      ?.alignment
      ?.signals
      ?.find(
        (signal) =>
          signal?.type ===
          "CONCENTRATION" &&
          Number(
            signal?.score
          ) < 60
      ) ||
    null;

  const driftIssue =
    top
      ?.alignment
      ?.signals
      ?.find(
        (signal) =>
          signal?.type ===
          "PORTFOLIO_DRIFT" &&
          Number(
            signal?.score
          ) < 60
      ) ||
    null;

  return {
    visible: true,

    title:
      "Portfolio & Goals",

    message:
      attention.length
        ? `${attention.length} goal(s) currently need attention.`
        : "Your portfolio is currently supporting your tracked goals.",

    concentrationIssue:
      concentrationIssue
        ?.interpretation ||
      null,

    driftIssue:
      driftIssue
        ?.interpretation ||
      null,

    nextAction:
      top?.nextAction ||
      null,

    route:
      "/wealth-journey"
  };
}

export function buildWealthJourneyDNAContext({
  journey
} = {}) {
  const evidence =
    safeArray(
      journey?.dnaEvidence
    );

  const clarifications =
    evidence.filter(
      (item) =>
        item
          ?.clarification
          ?.required
    );

  return {
    visible:
      evidence.length >
      0,

    evidenceCount:
      evidence.length,

    clarificationCount:
      clarifications.length,

    proposedUpdateCount:
      journey
        ?.dnaProposal
        ?.updateCount ||
      0,

    message:
      clarifications.length
        ? `Coach G has ${clarifications.length} Investor DNA question(s) to clarify from your recent behavior.`
        : evidence.length
          ? "GateCEP is continuing to learn from your observed behavior."
          : "No new Investor DNA evidence currently needs attention.",

    route:
      "/wealth-journey"
  };
}

export function buildWealthJourneyInvestorExperience(
  options = {}
) {
  const journey =
    buildCoachGWealthJourneyAdvice(
      options
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    journey,

    homeCard:
      buildWealthJourneyHomeCard({
        journey
      }),

    coachGPrompt:
      buildWealthJourneyCoachGPrompt({
        journey
      }),

    goalsSummary:
      buildWealthJourneyGoalsSummary({
        journey
      }),

    portfolioContext:
      buildWealthJourneyPortfolioContext({
        journey
      }),

    dnaContext:
      buildWealthJourneyDNAContext({
        journey
      }),

    route:
      "/wealth-journey"
  };
}

export function loadWealthJourneyHomeCard(
  options = {}
) {
  return buildWealthJourneyInvestorExperience(
    options
  ).homeCard;
}

export function loadWealthJourneyCoachGPrompt(
  options = {}
) {
  return buildWealthJourneyInvestorExperience(
    options
  ).coachGPrompt;
}

export function loadWealthJourneyGoalsSummary(
  options = {}
) {
  return buildWealthJourneyInvestorExperience(
    options
  ).goalsSummary;
}

export function loadWealthJourneyPortfolioContext(
  options = {}
) {
  return buildWealthJourneyInvestorExperience(
    options
  ).portfolioContext;
}

export function loadWealthJourneyDNAContext(
  options = {}
) {
  return buildWealthJourneyInvestorExperience(
    options
  ).dnaContext;
}
