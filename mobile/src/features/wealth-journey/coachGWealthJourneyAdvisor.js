import {
  GOAL_PROGRESS_STATUSES,
  buildInvestorGoalProgress,
  buildInvestorGoalProgressBatch
} from "./goalProgressIntelligenceEngine";

import {
  buildGoalRecoveryPlan,
  buildGoalRecoveryPlanBatch
} from "./goalGapRecoveryPlanner";

import {
  GOAL_BEHAVIOR_ALIGNMENT_STATUSES,
  buildGoalBehaviorAlignmentAnalysis,
  buildGoalBehaviorAlignmentBatch
} from "./goalBehaviorAlignmentEngine";

import {
  INVESTOR_DNA_EVIDENCE_STATUSES,
  buildInvestorDNAEvidenceReview,
  buildInvestorDNAEvidenceReviewBatch,
  buildInvestorDNAUpdateProposal,
  loadInvestorDNAEvidenceNeedingClarification
} from "./investorDNAEvidenceUpdateEngine";

/*
 * ============================================================
 * PC-028E
 * COACH G WEALTH JOURNEY ADVISOR
 * ============================================================
 *
 * GateCEP purpose:
 *
 * Unify PC-028A through PC-028D into one investor-centered
 * wealth journey service.
 *
 * Coach G should be able to answer:
 *
 * - Where am I now?
 * - Where am I trying to go?
 * - Am I on track?
 * - What behavior supports or conflicts with my goal?
 * - If I am behind, what realistic recovery options exist?
 * - What has GateCEP learned about me?
 * - What still needs clarification?
 * - What should we discuss next?
 *
 * Important:
 * This service coordinates guidance. It does not automatically:
 * - change a goal,
 * - change Investor DNA,
 * - change contributions,
 * - rebalance a portfolio,
 * - place a trade.
 * ============================================================
 */

export const COACH_G_WEALTH_JOURNEY_PRIORITIES =
  Object.freeze({
    CRITICAL: "CRITICAL",
    HIGH: "HIGH",
    MEDIUM: "MEDIUM",
    LOW: "LOW",
    INFO: "INFO"
  });

export const COACH_G_WEALTH_JOURNEY_ACTIONS =
  Object.freeze({
    CELEBRATE_PROGRESS:
      "CELEBRATE_PROGRESS",

    CONTINUE_PLAN:
      "CONTINUE_PLAN",

    REVIEW_GOAL_GAP:
      "REVIEW_GOAL_GAP",

    REVIEW_BEHAVIOR:
      "REVIEW_BEHAVIOR",

    CLARIFY_DNA:
      "CLARIFY_DNA",

    REVIEW_RECOVERY_OPTIONS:
      "REVIEW_RECOVERY_OPTIONS",

    UPDATE_PLAN:
      "UPDATE_PLAN",

    NEED_MORE_CONTEXT:
      "NEED_MORE_CONTEXT"
  });

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

function classifyGoalJourneyPriority({
  progress,
  alignment,
  recovery,
  dnaReview
} = {}) {
  const status =
    progress
      ?.classification
      ?.status;

  if (
    status ===
      GOAL_PROGRESS_STATUSES
        .CRITICAL_GAP
  ) {
    return COACH_G_WEALTH_JOURNEY_PRIORITIES
      .CRITICAL;
  }

  if (
    status ===
      GOAL_PROGRESS_STATUSES
        .BEHIND ||
    alignment
      ?.classification
      ?.status ===
      GOAL_BEHAVIOR_ALIGNMENT_STATUSES
        .MISALIGNED
  ) {
    return COACH_G_WEALTH_JOURNEY_PRIORITIES
      .HIGH;
  }

  if (
    status ===
      GOAL_PROGRESS_STATUSES
        .SLIGHTLY_BEHIND ||
    alignment
      ?.classification
      ?.status ===
      GOAL_BEHAVIOR_ALIGNMENT_STATUSES
        .NEEDS_CLARIFICATION ||
    dnaReview
      ?.needsClarificationCount >
      0
  ) {
    return COACH_G_WEALTH_JOURNEY_PRIORITIES
      .MEDIUM;
  }

  if (
    status ===
      GOAL_PROGRESS_STATUSES
        .ON_TRACK ||
    status ===
      GOAL_PROGRESS_STATUSES
        .AHEAD
  ) {
    return COACH_G_WEALTH_JOURNEY_PRIORITIES
      .LOW;
  }

  if (
    status ===
      GOAL_PROGRESS_STATUSES
        .ACHIEVED
  ) {
    return COACH_G_WEALTH_JOURNEY_PRIORITIES
      .INFO;
  }

  return COACH_G_WEALTH_JOURNEY_PRIORITIES
    .MEDIUM;
}

export function buildCoachGWealthJourneyNextAction({
  progress,
  alignment,
  recovery,
  dnaReview
} = {}) {
  const status =
    progress
      ?.classification
      ?.status;

  if (
    status ===
    GOAL_PROGRESS_STATUSES
      .ACHIEVED
  ) {
    return {
      action:
        COACH_G_WEALTH_JOURNEY_ACTIONS
          .CELEBRATE_PROGRESS,

      label:
        "Celebrate and plan the next chapter",

      reason:
        "This goal has been achieved. Coach G should help the investor decide what comes next."
    };
  }

  if (
    dnaReview
      ?.needsClarificationCount >
    0
  ) {
    return {
      action:
        COACH_G_WEALTH_JOURNEY_ACTIONS
          .CLARIFY_DNA,

      label:
        "Clarify what GateCEP has learned",

      reason:
        "Recent behavior may suggest an Investor DNA update, but Coach G should understand the reason before anything changes."
    };
  }

  if (
    alignment
      ?.coachGContext
      ?.shouldDiscuss
  ) {
    return {
      action:
        COACH_G_WEALTH_JOURNEY_ACTIONS
          .REVIEW_BEHAVIOR,

      label:
        "Talk about the behavior-goal mismatch",

      reason:
        "Recent behavior may not fully align with the current goal. Coach G should first determine whether behavior, circumstances, DNA, or the goal changed."
    };
  }

  if (
    recovery
      ?.recoveryNeeded
  ) {
    return {
      action:
        COACH_G_WEALTH_JOURNEY_ACTIONS
          .REVIEW_RECOVERY_OPTIONS,

      label:
        "Review realistic recovery options",

      reason:
        recovery
          ?.coachGContext
          ?.narrative ||
        "The investor is behind the current goal trajectory and has several possible recovery paths."
    };
  }

  if (
    status ===
      GOAL_PROGRESS_STATUSES
        .ON_TRACK ||
    status ===
      GOAL_PROGRESS_STATUSES
        .AHEAD
  ) {
    return {
      action:
        COACH_G_WEALTH_JOURNEY_ACTIONS
          .CONTINUE_PLAN,

      label:
        "Keep doing what is working",

      reason:
        "The current goal trajectory is healthy. Coach G should reinforce discipline rather than manufacture unnecessary action."
    };
  }

  return {
    action:
      COACH_G_WEALTH_JOURNEY_ACTIONS
        .NEED_MORE_CONTEXT,

    label:
      "Continue the conversation",

    reason:
      "GateCEP needs more context before recommending a meaningful change."
  };
}

function buildGoalJourneyNarrative({
  goal,
  progress,
  alignment,
  recovery,
  dnaReview,
  nextAction
} = {}) {
  const pieces = [];

  pieces.push(
    progress
      ?.coachGContext
      ?.narrative ||
    `Coach G is reviewing progress toward ${goal?.name || goal?.title || "this goal"}.`
  );

  if (
    alignment
      ?.coachGContext
      ?.shouldDiscuss
  ) {
    pieces.push(
      alignment
        ?.coachGContext
        ?.narrative ||
      "Recent behavior may deserve clarification."
    );
  }

  if (
    recovery
      ?.recoveryNeeded
  ) {
    const topScenario =
      safeArray(
        recovery
          ?.scenarios
      )[0];

    if (topScenario) {
      pieces.push(
        `The most feasible recovery option to discuss first is "${topScenario.title}".`
      );
    }
  }

  if (
    dnaReview
      ?.needsClarificationCount >
    0
  ) {
    pieces.push(
      `GateCEP found ${dnaReview.needsClarificationCount} possible Investor DNA evidence item(s) that should be clarified before the profile changes.`
    );
  }

  if (nextAction?.label) {
    pieces.push(
      `Next: ${nextAction.label}.`
    );
  }

  return pieces.join(" ");
}

export function buildCoachGGoalJourneyAdvice({
  goal,
  portfolio = {},
  cash = {},
  contributionBehavior = {},
  behavior = {},
  portfolioHealth = {},
  investorDNA = {},
  financialContext = {},
  allocationAdvice = {},
  planningAssumptions = {},
  recentLifeChanges = [],
  source = {},
  asOfDate = new Date()
    .toISOString()
    .slice(0, 10)
} = {}) {
  const progress =
    buildInvestorGoalProgress({
      goal,
      portfolio,
      cash,
      contributionBehavior,
      behavior,
      portfolioHealth,
      investorDNA,
      planningAssumptions,
      asOfDate
    });

  const alignment =
    buildGoalBehaviorAlignmentAnalysis({
      goal: {
        ...goal,

        monthsRemaining:
          progress
            ?.trajectory
            ?.monthsRemaining
      },
      behavior: {
        ...behavior,

        requiredMonthlyContribution:
          progress
            ?.trajectory
            ?.requiredMonthlyContribution,

        averageMonthlyContribution:
          behavior
            ?.averageMonthlyContribution ??
          contributionBehavior
            ?.averageMonthlyContribution ??
          contributionBehavior
            ?.monthlyContribution
      },
      portfolioHealth,
      investorDNA,
      financialContext,
      recentLifeChanges
    });

  const recovery =
    buildGoalRecoveryPlan({
      goal,
      portfolio,
      cash,
      contributionBehavior,
      behavior,
      portfolioHealth,
      investorDNA,
      financialContext,
      allocationAdvice,
      planningAssumptions,
      asOfDate
    });

  const dnaReview =
    buildInvestorDNAEvidenceReview({
      goal,
      behavior: {
        ...behavior,

        requiredMonthlyContribution:
          progress
            ?.trajectory
            ?.requiredMonthlyContribution,

        averageMonthlyContribution:
          behavior
            ?.averageMonthlyContribution ??
          contributionBehavior
            ?.averageMonthlyContribution ??
          contributionBehavior
            ?.monthlyContribution
      },
      portfolioHealth,
      investorDNA,
      financialContext,
      recentLifeChanges,
      source
    });

  const priority =
    classifyGoalJourneyPriority({
      progress,
      alignment,
      recovery,
      dnaReview
    });

  const nextAction =
    buildCoachGWealthJourneyNextAction({
      progress,
      alignment,
      recovery,
      dnaReview
    });

  const narrative =
    buildGoalJourneyNarrative({
      goal,
      progress,
      alignment,
      recovery,
      dnaReview,
      nextAction
    });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    advisor:
      "Coach G",

    goal: {
      id:
        progress
          ?.goal
          ?.id ||
        goal?.id ||
        null,

      name:
        progress
          ?.goal
          ?.name ||
        goal?.name ||
        goal?.title ||
        "Financial Goal",

      currency:
        progress
          ?.goal
          ?.currency ||
        goal?.currency ||
        "KES"
    },

    priority,

    progress,

    alignment,

    recovery,

    dnaReview,

    nextAction,

    narrative,

    conversation: {
      questions: [
        ...safeArray(
          alignment
            ?.coachGQuestions
        ),

        ...safeArray(
          dnaReview
            ?.coachGContext
            ?.questions
        )
      ]
        .filter(Boolean)
        .filter(
          (
            value,
            index,
            array
          ) =>
            array.indexOf(
              value
            ) === index
        ),

      shouldEngage:
        Boolean(
          alignment
            ?.coachGContext
            ?.shouldDiscuss ||
          dnaReview
            ?.coachGContext
            ?.shouldDiscuss ||
          recovery
            ?.recoveryNeeded
        )
    },

    safeguards: {
      advisoryOnly:
        true,

      goalAutomaticallyChanged:
        false,

      dnaAutomaticallyChanged:
        false,

      contributionAutomaticallyChanged:
        false,

      portfolioAutomaticallyChanged:
        false,

      investorDecisionRequired:
        true
    }
  };
}

export function buildCoachGWealthJourneyAdvice({
  goals = [],
  portfolio = {},
  cash = {},
  contributionBehavior = {},
  behavior = {},
  portfolioHealth = {},
  investorDNA = {},
  financialContext = {},
  allocationAdvice = {},
  planningAssumptions = {},
  recentLifeChanges = [],
  source = {},
  asOfDate = new Date()
    .toISOString()
    .slice(0, 10)
} = {}) {
  const goalAdvice =
    safeArray(
      goals
    )
      .map(
        (goal) =>
          buildCoachGGoalJourneyAdvice({
            goal,
            portfolio,
            cash,
            contributionBehavior,
            behavior,
            portfolioHealth,
            investorDNA,
            financialContext,
            allocationAdvice,
            planningAssumptions,
            recentLifeChanges,
            source,
            asOfDate
          })
      )
      .sort(
        (
          first,
          second
        ) =>
          priorityRank(
            second
              ?.priority
          ) -
          priorityRank(
            first
              ?.priority
          )
      );

  const allEvidence =
    goalAdvice.flatMap(
      (item) =>
        safeArray(
          item
            ?.dnaReview
            ?.evidence
        )
    );

  const dnaProposal =
    buildInvestorDNAUpdateProposal({
      currentDNA:
        investorDNA,
      evidence:
        allEvidence
    });

  const topGoal =
    goalAdvice[0] ||
    null;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    advisor:
      "Coach G",

    totalGoals:
      goalAdvice.length,

    goalAdvice,

    topPriorityGoal:
      topGoal,

    needsAttention:
      goalAdvice.filter(
        (item) =>
          item.priority ===
            COACH_G_WEALTH_JOURNEY_PRIORITIES
              .CRITICAL ||
          item.priority ===
            COACH_G_WEALTH_JOURNEY_PRIORITIES
              .HIGH
      ),

    onTrackGoals:
      goalAdvice.filter(
        (item) =>
          item
            ?.progress
            ?.classification
            ?.status ===
            GOAL_PROGRESS_STATUSES
              .ON_TRACK ||
          item
            ?.progress
            ?.classification
            ?.status ===
            GOAL_PROGRESS_STATUSES
              .AHEAD
      ),

    achievedGoals:
      goalAdvice.filter(
        (item) =>
          item
            ?.progress
            ?.classification
            ?.status ===
          GOAL_PROGRESS_STATUSES
            .ACHIEVED
      ),

    dnaEvidence:
      allEvidence,

    dnaProposal,

    executiveSummary:
      buildCoachGWealthJourneySummary({
        goalAdvice,
        dnaProposal
      }),

    safeguards: {
      advisoryOnly:
        true,

      noAutomaticPlanMutation:
        true,

      noAutomaticDNAMutation:
        true
    }
  };
}

export function buildCoachGWealthJourneySummary({
  goalAdvice = [],
  dnaProposal = null
} = {}) {
  const normalized =
    safeArray(
      goalAdvice
    );

  const attention =
    normalized.filter(
      (item) =>
        item.priority ===
          COACH_G_WEALTH_JOURNEY_PRIORITIES
            .CRITICAL ||
        item.priority ===
          COACH_G_WEALTH_JOURNEY_PRIORITIES
            .HIGH
    );

  const conversations =
    normalized.filter(
      (item) =>
        item
          ?.conversation
          ?.shouldEngage
    );

  const top =
    normalized[0] ||
    null;

  return {
    totalGoals:
      normalized.length,

    attentionCount:
      attention.length,

    conversationCount:
      conversations.length,

    proposedDNAUpdates:
      dnaProposal
        ?.updateCount ||
      0,

    topGoal:
      top
        ?.goal ||
      null,

    topPriority:
      top
        ?.priority ||
      null,

    topNextAction:
      top
        ?.nextAction ||
      null,

    narrative:
      normalized.length
        ? `Coach G is tracking ${normalized.length} goal(s). ${attention.length} currently need higher-priority attention, ${conversations.length} would benefit from conversation, and ${dnaProposal?.updateCount || 0} Investor DNA update(s) may be ready for review once supporting evidence is confirmed.`
        : "Coach G does not yet have an active financial goal to monitor."
  };
}

export function loadCoachGGoalsNeedingAttention(
  options = {}
) {
  return buildCoachGWealthJourneyAdvice(
    options
  ).needsAttention;
}

export function loadCoachGTopWealthJourneyAction(
  options = {}
) {
  return (
    buildCoachGWealthJourneyAdvice(
      options
    )
      ?.topPriorityGoal
      ?.nextAction ||
    null
  );
}

export function loadCoachGWealthJourneyQuestions(
  options = {}
) {
  const journey =
    buildCoachGWealthJourneyAdvice(
      options
    );

  return journey.goalAdvice
    .flatMap(
      (item) =>
        safeArray(
          item
            ?.conversation
            ?.questions
        )
    )
    .filter(
      (
        value,
        index,
        array
      ) =>
        array.indexOf(
          value
        ) === index
    );
}

export function loadCoachGInvestorDNAClarifications(
  options = {}
) {
  const journey =
    buildCoachGWealthJourneyAdvice(
      options
    );

  return loadInvestorDNAEvidenceNeedingClarification({
    reviews:
      journey
        .goalAdvice
        .map(
          (item) =>
            item
              .dnaReview
        )
  });
}
