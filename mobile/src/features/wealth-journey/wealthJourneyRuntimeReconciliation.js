/*
 * ============================================================
 * PC-028J
 * WEALTH JOURNEY RUNTIME DATA RECONCILIATION
 * ============================================================
 *
 * Runtime findings from /wealth-journey:
 * - an intent-only goal ("family") was being treated as enough data
 * - missing target amount/date were rendered as KES 0
 * - NOT_ENOUGH_DATA was incorrectly escalating into recovery planning
 *
 * PC-028J fixes those semantics without inventing financial data.
 * ============================================================
 */

export const WEALTH_GOAL_COMPLETENESS = Object.freeze({
  INTENT_ONLY: "INTENT_ONLY",
  PARTIAL: "PARTIAL",
  PLANNABLE: "PLANNABLE"
});

function n(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function clean(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(value).trim();

  return text || null;
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

export function classifyWealthJourneyGoalCompleteness(
  goal = {}
) {
  const targetAmount =
    n(
      goal?.targetAmount ??
      goal?.targetValue
    );

  const targetDate =
    clean(
      goal?.targetDate
    );

  const hasIntent =
    Boolean(
      clean(
        goal?.name ??
        goal?.title
      )
    );

  if (
    targetAmount !== null &&
    targetAmount > 0 &&
    targetDate
  ) {
    return WEALTH_GOAL_COMPLETENESS
      .PLANNABLE;
  }

  if (
    targetAmount !== null ||
    targetDate
  ) {
    return WEALTH_GOAL_COMPLETENESS
      .PARTIAL;
  }

  return hasIntent
    ? WEALTH_GOAL_COMPLETENESS
        .INTENT_ONLY
    : WEALTH_GOAL_COMPLETENESS
        .PARTIAL;
}

export function buildMissingGoalPlanningFields(
  goal = {}
) {
  const missing = [];

  if (
    n(
      goal?.targetAmount ??
      goal?.targetValue
    ) === null ||
    n(
      goal?.targetAmount ??
      goal?.targetValue
    ) <= 0
  ) {
    missing.push(
      "TARGET_AMOUNT"
    );
  }

  if (
    !clean(
      goal?.targetDate
    )
  ) {
    missing.push(
      "TARGET_DATE"
    );
  }

  return missing;
}

export function reconcileGoalAdviceForRuntime(
  advice = {}
) {
  const goal =
    advice?.progress?.goal ??
    advice?.goal ??
    {};

  const completeness =
    classifyWealthJourneyGoalCompleteness(
      goal
    );

  const missingPlanningFields =
    buildMissingGoalPlanningFields(
      goal
    );

  if (
    completeness ===
    WEALTH_GOAL_COMPLETENESS
      .PLANNABLE
  ) {
    return {
      ...advice,

      goalCompleteness:
        completeness,

      missingPlanningFields
    };
  }

  const goalName =
    clean(
      goal?.name ??
      advice?.goal?.name
    ) ||
    "this goal";

  const message =
    completeness ===
    WEALTH_GOAL_COMPLETENESS
      .INTENT_ONLY
      ? `You told Coach G that "${goalName}" matters to you. GateCEP understands the goal intention, but still needs a target amount and target date before it can measure whether you are on track.`
      : `Coach G has part of the information for "${goalName}", but needs ${missingPlanningFields.join(" and ").toLowerCase().replaceAll("_", " ")} before progress can be measured reliably.`;

  const clarificationQuestion =
    completeness ===
    WEALTH_GOAL_COMPLETENESS
      .INTENT_ONLY
      ? `When you say "${goalName}", what would success look like financially, and by when would you like to achieve it?`
      : `Can we complete the missing details for "${goalName}" so I can measure your progress accurately?`;

  return {
    ...advice,

    priority:
      "MEDIUM",

    goalCompleteness:
      completeness,

    missingPlanningFields,

    progress: {
      ...(advice?.progress || {}),

      classification: {
        status:
          "NOT_ENOUGH_DATA",

        label:
          "Goal needs details",

        score:
          null
      },

      coachGContext: {
        ...(advice?.progress?.coachGContext || {}),

        shouldExplain:
          true,

        shouldAskInvestor:
          true,

        narrative:
          message
      }
    },

    recovery: {
      ...(advice?.recovery || {}),

      recoveryNeeded:
        false,

      scenarios:
        [],

      recommendedScenarioId:
        null,

      coachGContext: {
        shouldExplain:
          true,

        shouldAskInvestor:
          true,

        narrative:
          "Recovery planning should begin only after the goal has enough information to measure a real gap."
      }
    },

    nextAction: {
      action:
        "COMPLETE_GOAL",

      label:
        "Complete this goal with Coach G",

      reason:
        "Coach G needs enough goal detail to measure progress before recommending recovery changes."
    },

    narrative:
      message,

    conversation: {
      ...(advice?.conversation || {}),

      shouldEngage:
        true,

      questions: [
        clarificationQuestion,
        ...safeArray(
          advice?.conversation?.questions
        )
      ].filter(
        (
          value,
          index,
          array
        ) =>
          value &&
          array.indexOf(value) === index
      )
    }
  };
}

export function reconcileWealthJourneyGoalsSummary(
  summary = {},
  goalAdvice = []
) {
  const goals =
    safeArray(
      goalAdvice
    ).map(
      (item) => {
        const goal =
          item?.progress?.goal ??
          item?.goal ??
          {};

        const trajectory =
          item?.progress?.trajectory ??
          {};

        return {
          id:
            goal?.id ??
            null,

          name:
            goal?.name ??
            "Financial Goal",

          priority:
            item?.priority ??
            "INFO",

          completeness:
            item?.goalCompleteness ??
            classifyWealthJourneyGoalCompleteness(
              goal
            ),

          status:
            item
              ?.progress
              ?.classification
              ?.status ??
            "NOT_ENOUGH_DATA",

          statusLabel:
            item
              ?.progress
              ?.classification
              ?.label ??
            "Goal needs details",

          currentValue:
            n(
              trajectory
                ?.currentValue
            ),

          targetAmount:
            n(
              trajectory
                ?.targetAmount ??
              goal
                ?.targetAmount
            ),

          projectedValue:
            n(
              trajectory
                ?.projectedValue
            ),

          projectedGap:
            n(
              trajectory
                ?.projectedGap
            ),

          currency:
            goal?.currency ??
            item?.goal?.currency ??
            "KES",

          nextAction:
            item?.nextAction ??
            null,

          narrative:
            item?.narrative ??
            null,

          missingPlanningFields:
            item
              ?.missingPlanningFields ??
            []
        };
      }
    );

  return {
    ...summary,

    totalGoals:
      goals.length,

    plannableGoals:
      goals.filter(
        (goal) =>
          goal.completeness ===
          WEALTH_GOAL_COMPLETENESS
            .PLANNABLE
      ).length,

    incompleteGoals:
      goals.filter(
        (goal) =>
          goal.completeness !==
          WEALTH_GOAL_COMPLETENESS
            .PLANNABLE
      ).length,

    goals
  };
}

export function reconcileWealthJourneyRuntimeResult(
  result = {}
) {
  const journey =
    result?.experience?.journey ??
    {};

  const reconciledGoalAdvice =
    safeArray(
      journey?.goalAdvice
    ).map(
      reconcileGoalAdviceForRuntime
    );

  const topPriorityGoal =
    [...reconciledGoalAdvice]
      .sort(
        (
          first,
          second
        ) => {
          const rank = {
            CRITICAL: 5,
            HIGH: 4,
            MEDIUM: 3,
            LOW: 2,
            INFO: 1
          };

          return (
            rank[
              second?.priority
            ] || 0
          ) -
          (
            rank[
              first?.priority
            ] || 0
          );
        }
      )[0] ||
    null;

  const existingSummary =
    result
      ?.experience
      ?.goalsSummary ??
    {};

  const goalsSummary =
    reconcileWealthJourneyGoalsSummary(
      existingSummary,
      reconciledGoalAdvice
    );

  const hasPlannableGoal =
    goalsSummary
      .plannableGoals >
    0;

  const wealthContext =
    result?.wealthContext ??
    {};

  const readiness =
    wealthContext
      ?.readiness ??
    {};

  const contextStatus =
    wealthContext?.status ??
    result?.status ??
    "UNAVAILABLE";

  const reconciledStatus =
    contextStatus === "READY" &&
    !hasPlannableGoal
      ? "PARTIAL"
      : contextStatus;

  const missingForWealthJourney = [
    ...safeArray(
      readiness
        ?.missingForWealthJourney
    ),

    !hasPlannableGoal &&
    goalsSummary.totalGoals > 0
      ? "TRACKABLE_GOAL_DETAILS"
      : null
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
    );

  const coachGPrompt =
    topPriorityGoal
      ? {
          shouldSurface:
            true,

          priority:
            topPriorityGoal
              ?.priority ??
            "MEDIUM",

          title:
            topPriorityGoal
              ?.nextAction
              ?.label ??
            "Continue the conversation",

          message:
            topPriorityGoal
              ?.narrative ??
            "Coach G needs a little more context.",

          suggestedQuestion:
            safeArray(
              topPriorityGoal
                ?.conversation
                ?.questions
            )[0] ||
            `Coach G, help me complete ${topPriorityGoal?.goal?.name || "this goal"}.`,

          route:
            "/wealth-journey",

          goalId:
            topPriorityGoal
              ?.goal
              ?.id ??
            null
        }
      : {
          shouldSurface:
            false,

          title:
            "No active goal yet",

          message:
            null
        };

  return {
    ...result,

    status:
      reconciledStatus,

    wealthContext: {
      ...wealthContext,

      status:
        reconciledStatus,

      readiness: {
        ...readiness,

        coreReady:
          Boolean(
            readiness?.coreReady &&
            hasPlannableGoal
          ),

        missingForWealthJourney
      }
    },

    experience: {
      ...(result?.experience || {}),

      journey: {
        ...journey,

        goalAdvice:
          reconciledGoalAdvice,

        topPriorityGoal
      },

      goalsSummary,

      coachGPrompt
    }
  };
}
