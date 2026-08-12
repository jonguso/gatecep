import {
  GOAL_ACTION_TYPES,
  GOAL_PROGRESS_STATUSES,
  buildInvestorGoalProgress
} from "./goalProgressIntelligenceEngine";

/*
 * ============================================================
 * PC-028B
 * GOAL GAP & RECOVERY PLANNER
 * ============================================================
 *
 * Purpose:
 * When an investor is behind a goal, compare realistic recovery
 * paths instead of defaulting to "contribute more".
 *
 * Recovery paths can include:
 * - increase contribution
 * - extend timeline
 * - adjust target
 * - improve allocation / reduce concentration
 * - protect liquidity first
 * - combine several modest changes
 *
 * Coach G should explain trade-offs and let the investor choose.
 * ============================================================
 */

export const GOAL_RECOVERY_STRATEGIES = Object.freeze({
  INCREASE_CONTRIBUTION: "INCREASE_CONTRIBUTION",
  EXTEND_TIMELINE: "EXTEND_TIMELINE",
  ADJUST_TARGET: "ADJUST_TARGET",
  IMPROVE_ALLOCATION: "IMPROVE_ALLOCATION",
  PROTECT_LIQUIDITY: "PROTECT_LIQUIDITY",
  COMBINED: "COMBINED",
  CONTINUE_PLAN: "CONTINUE_PLAN",
  REVIEW_FURTHER: "REVIEW_FURTHER"
});

export const GOAL_RECOVERY_FEASIBILITY = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW"
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
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value, decimals = 2) {
  const parsed = n(value);

  return parsed === null
    ? null
    : Number(parsed.toFixed(decimals));
}

function addMonths(dateValue, monthsToAdd) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setMonth(
    date.getMonth() + monthsToAdd
  );

  return date.toISOString().slice(0, 10);
}

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function classifyFeasibility(score) {
  if (score >= 70) {
    return GOAL_RECOVERY_FEASIBILITY.HIGH;
  }

  if (score >= 45) {
    return GOAL_RECOVERY_FEASIBILITY.MEDIUM;
  }

  return GOAL_RECOVERY_FEASIBILITY.LOW;
}

function buildScenario({
  id,
  strategy,
  title,
  description,
  tradeoff,
  feasibilityScore,
  projectedGoal,
  projectedTrajectory,
  impact,
  coachGQuestion
}) {
  return {
    id,
    strategy,
    title,
    description,
    tradeoff,
    feasibilityScore,
    feasibility:
      classifyFeasibility(
        feasibilityScore
      ),
    projectedGoal,
    projectedTrajectory,
    impact,
    coachGQuestion
  };
}

export function buildContributionRecoveryScenario({
  progress,
  contributionBehavior = {},
  financialContext = {}
} = {}) {
  const required =
    n(
      progress
        ?.trajectory
        ?.requiredMonthlyContribution
    );

  const current =
    n(
      contributionBehavior
        ?.averageMonthlyContribution ??
      contributionBehavior
        ?.monthlyContribution
    ) || 0;

  if (required === null) {
    return null;
  }

  const increase =
    Math.max(
      required - current,
      0
    );

  const disposableMonthlyCash =
    n(
      financialContext
        ?.disposableMonthlyCash
    );

  let feasibilityScore = 60;

  if (
    disposableMonthlyCash !== null
  ) {
    if (
      increase <=
      disposableMonthlyCash * 0.5
    ) {
      feasibilityScore += 20;
    } else if (
      increase >
      disposableMonthlyCash
    ) {
      feasibilityScore -= 30;
    }
  }

  if (
    financialContext
      ?.cashBufferConcern
  ) {
    feasibilityScore -= 25;
  }

  return buildScenario({
    id:
      "RECOVERY_INCREASE_CONTRIBUTION",

    strategy:
      GOAL_RECOVERY_STRATEGIES
        .INCREASE_CONTRIBUTION,

    title:
      "Increase monthly contributions",

    description:
      `Increase the monthly contribution from about ${progress?.goal?.currency || "KES"} ${round(current)} to approximately ${progress?.goal?.currency || "KES"} ${round(required)}.`,

    tradeoff:
      "This may improve the goal trajectory without changing the goal date, but it can reduce short-term cash flexibility.",

    feasibilityScore,

    projectedGoal:
      progress?.goal,

    projectedTrajectory:
      {
        ...progress?.trajectory,
        monthlyContribution:
          round(required),
        requiredMonthlyContribution:
          round(required)
      },

    impact: {
      monthlyContributionIncrease:
        round(increase)
    },

    coachGQuestion:
      "Would increasing your regular contribution feel realistic without putting pressure on your day-to-day finances?"
  });
}

export function buildTimelineRecoveryScenario({
  progress,
  contributionBehavior = {},
  planningAssumptions = {},
  extensionMonths = 12
} = {}) {
  const currentGoal =
    progress?.goal;

  if (
    !currentGoal?.targetDate
  ) {
    return null;
  }

  const extendedDate =
    addMonths(
      currentGoal.targetDate,
      extensionMonths
    );

  if (!extendedDate) {
    return null;
  }

  const projected =
    buildInvestorGoalProgress({
      goal: {
        ...currentGoal,
        targetDate:
          extendedDate
      },
      portfolio: {
        currentValue:
          progress
            ?.currentPosition
            ?.investedValue,
        availableCash:
          progress
            ?.currentPosition
            ?.availableCash
      },
      contributionBehavior,
      planningAssumptions
    });

  return buildScenario({
    id:
      `RECOVERY_EXTEND_${extensionMonths}_MONTHS`,

    strategy:
      GOAL_RECOVERY_STRATEGIES
        .EXTEND_TIMELINE,

    title:
      `Extend the goal timeline by ${extensionMonths} months`,

    description:
      `Move the target date from ${currentGoal.targetDate} to ${extendedDate}.`,

    tradeoff:
      "This reduces the required monthly contribution, but it delays when the investor reaches the goal.",

    feasibilityScore:
      75,

    projectedGoal:
      {
        ...currentGoal,
        targetDate:
          extendedDate
      },

    projectedTrajectory:
      projected
        ?.trajectory,

    impact: {
      extensionMonths,
      newTargetDate:
        extendedDate,
      newRequiredMonthlyContribution:
        projected
          ?.trajectory
          ?.requiredMonthlyContribution
    },

    coachGQuestion:
      "Would reaching this goal a little later be acceptable if it reduced the monthly financial pressure?"
  });
}

export function buildTargetRecoveryScenario({
  progress,
  reductionPercentage = 10,
  contributionBehavior = {},
  planningAssumptions = {}
} = {}) {
  const target =
    n(
      progress
        ?.goal
        ?.targetAmount
    );

  if (
    target === null ||
    target <= 0
  ) {
    return null;
  }

  const adjustedTarget =
    target *
    (
      1 -
      reductionPercentage /
      100
    );

  const projected =
    buildInvestorGoalProgress({
      goal: {
        ...progress.goal,
        targetAmount:
          adjustedTarget
      },
      portfolio: {
        currentValue:
          progress
            ?.currentPosition
            ?.investedValue,
        availableCash:
          progress
            ?.currentPosition
            ?.availableCash
      },
      contributionBehavior,
      planningAssumptions
    });

  return buildScenario({
    id:
      `RECOVERY_ADJUST_TARGET_${reductionPercentage}`,

    strategy:
      GOAL_RECOVERY_STRATEGIES
        .ADJUST_TARGET,

    title:
      `Review the target amount`,

    description:
      `A ${reductionPercentage}% lower target would be approximately ${progress?.goal?.currency || "KES"} ${round(adjustedTarget)}.`,

    tradeoff:
      "Changing the target can make the plan more achievable, but only makes sense if the original goal itself has changed or can genuinely cost less.",

    feasibilityScore:
      45,

    projectedGoal:
      {
        ...progress.goal,
        targetAmount:
          round(adjustedTarget)
      },

    projectedTrajectory:
      projected
        ?.trajectory,

    impact: {
      targetReductionPercentage:
        reductionPercentage,
      newTargetAmount:
        round(adjustedTarget)
    },

    coachGQuestion:
      "Has the goal itself changed, or is the original target still important to you?"
  });
}

export function buildAllocationRecoveryScenario({
  progress,
  portfolioHealth = {},
  allocationAdvice = {}
} = {}) {
  const concentrationRisk =
    portfolioHealth
      ?.concentrationRisk;

  const drift =
    n(
      allocationAdvice
        ?.driftPercentage
    );

  if (
    concentrationRisk !== "HIGH" &&
    (
      drift === null ||
      Math.abs(drift) < 5
    )
  ) {
    return null;
  }

  return buildScenario({
    id:
      "RECOVERY_IMPROVE_ALLOCATION",

    strategy:
      GOAL_RECOVERY_STRATEGIES
        .IMPROVE_ALLOCATION,

    title:
      "Improve portfolio alignment",

    description:
      "Reduce concentration or allocation drift so progress depends less on a small number of investments.",

    tradeoff:
      "Rebalancing may improve resilience, but Coach G should avoid unnecessary selling or taking more risk merely to close a projected goal gap.",

    feasibilityScore:
      65,

    projectedGoal:
      progress?.goal,

    projectedTrajectory:
      progress?.trajectory,

    impact: {
      concentrationRisk:
        concentrationRisk ||
        null,
      driftPercentage:
        drift
    },

    coachGQuestion:
      "Would you like Coach G to explain which parts of the portfolio are creating the most risk to this goal?"
  });
}

export function buildLiquidityProtectionScenario({
  progress,
  financialContext = {}
} = {}) {
  if (
    !financialContext
      ?.cashBufferConcern &&
    financialContext
      ?.liquidityNeed !==
      "HIGH"
  ) {
    return null;
  }

  return buildScenario({
    id:
      "RECOVERY_PROTECT_LIQUIDITY",

    strategy:
      GOAL_RECOVERY_STRATEGIES
        .PROTECT_LIQUIDITY,

    title:
      "Protect short-term liquidity first",

    description:
      "Temporarily avoid forcing higher investment contributions until the investor has a more comfortable cash position.",

    tradeoff:
      "Goal progress may be slower in the short term, but protecting liquidity can reduce the risk of having to sell investments unexpectedly.",

    feasibilityScore:
      90,

    projectedGoal:
      progress?.goal,

    projectedTrajectory:
      progress?.trajectory,

    impact: {
      contributionIncreaseRecommended:
        false
    },

    coachGQuestion:
      "Would it be more helpful to strengthen your cash buffer first before increasing investments?"
  });
}

export function buildCombinedRecoveryScenario({
  progress,
  scenarios = []
} = {}) {
  const contribution =
    scenarios.find(
      (item) =>
        item?.strategy ===
        GOAL_RECOVERY_STRATEGIES
          .INCREASE_CONTRIBUTION
    );

  const timeline =
    scenarios.find(
      (item) =>
        item?.strategy ===
        GOAL_RECOVERY_STRATEGIES
          .EXTEND_TIMELINE
    );

  if (
    !contribution ||
    !timeline
  ) {
    return null;
  }

  const currentContribution =
    n(
      progress
        ?.trajectory
        ?.monthlyContribution
    ) || 0;

  const fullRequired =
    n(
      contribution
        ?.projectedTrajectory
        ?.requiredMonthlyContribution
    );

  const reducedRequired =
    n(
      timeline
        ?.projectedTrajectory
        ?.requiredMonthlyContribution
    );

  if (
    fullRequired === null ||
    reducedRequired === null
  ) {
    return null;
  }

  const blendedContribution =
    Math.max(
      currentContribution +
      (
        reducedRequired -
        currentContribution
      ) *
      0.5,
      currentContribution
    );

  return buildScenario({
    id:
      "RECOVERY_COMBINED",

    strategy:
      GOAL_RECOVERY_STRATEGIES
        .COMBINED,

    title:
      "Use a balanced recovery plan",

    description:
      `Combine a modest increase in monthly contributions with a modest extension of the timeline instead of making one large change.`,

    tradeoff:
      "A blended plan can reduce pressure on any single part of the investor's finances, but requires agreement on both contribution and timing changes.",

    feasibilityScore:
      80,

    projectedGoal:
      timeline
        .projectedGoal,

    projectedTrajectory: {
      ...timeline
        .projectedTrajectory,
      monthlyContribution:
        round(
          blendedContribution
        )
    },

    impact: {
      blendedMonthlyContribution:
        round(
          blendedContribution
        ),
      extensionMonths:
        timeline
          ?.impact
          ?.extensionMonths
    },

    coachGQuestion:
      "Would a smaller contribution increase combined with a little more time feel more realistic?"
  });
}

export function buildGoalRecoveryPlan({
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

  if (
    [
      GOAL_PROGRESS_STATUSES
        .ACHIEVED,
      GOAL_PROGRESS_STATUSES
        .AHEAD,
      GOAL_PROGRESS_STATUSES
        .ON_TRACK
    ].includes(
      progress
        ?.classification
        ?.status
    )
  ) {
    return {
      generatedAt:
        new Date()
          .toISOString(),

      progress,

      recoveryNeeded:
        false,

      scenarios: [
        buildScenario({
          id:
            "CONTINUE_CURRENT_PLAN",
          strategy:
            GOAL_RECOVERY_STRATEGIES
              .CONTINUE_PLAN,
          title:
            "Continue the current plan",
          description:
            "The investor is currently on track or ahead.",
          tradeoff:
            "Avoid taking unnecessary risk simply because progress is good.",
          feasibilityScore:
            95,
          projectedGoal:
            progress.goal,
          projectedTrajectory:
            progress.trajectory,
          impact: {},
          coachGQuestion:
            "Would you like to review whether anything in your life or priorities has changed before we simply continue?"
        })
      ],

      recommendedScenarioId:
        "CONTINUE_CURRENT_PLAN"
    };
  }

  const scenarios = [
    buildLiquidityProtectionScenario({
      progress,
      financialContext
    }),

    buildContributionRecoveryScenario({
      progress,
      contributionBehavior,
      financialContext
    }),

    buildTimelineRecoveryScenario({
      progress,
      contributionBehavior,
      planningAssumptions,
      extensionMonths:
        12
    }),

    buildTimelineRecoveryScenario({
      progress,
      contributionBehavior,
      planningAssumptions,
      extensionMonths:
        24
    }),

    buildAllocationRecoveryScenario({
      progress,
      portfolioHealth,
      allocationAdvice
    }),

    buildTargetRecoveryScenario({
      progress,
      reductionPercentage:
        10,
      contributionBehavior,
      planningAssumptions
    })
  ].filter(Boolean);

  const combined =
    buildCombinedRecoveryScenario({
      progress,
      scenarios
    });

  if (combined) {
    scenarios.push(
      combined
    );
  }

  const ranked =
    scenarios.sort(
      (
        first,
        second
      ) =>
        second
          .feasibilityScore -
        first
          .feasibilityScore
    );

  const recommended =
    ranked[0] ||
    null;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    progress,

    recoveryNeeded:
      true,

    scenarios:
      ranked,

    recommendedScenarioId:
      recommended
        ?.id ||
      null,

    coachGContext: {
      shouldExplain:
        true,

      shouldAskInvestor:
        true,

      narrative:
        buildGoalRecoveryNarrative({
          progress,
          scenarios:
            ranked,
          recommended
        })
    },

    safeguards: {
      advisoryOnly:
        true,

      goalChanged:
        false,

      contributionChanged:
        false,

      portfolioChanged:
        false,

      investorApprovalRequired:
        true
    }
  };
}

export function buildGoalRecoveryNarrative({
  progress,
  scenarios = [],
  recommended = null
} = {}) {
  const status =
    progress
      ?.classification
      ?.label ||
    "being reviewed";

  if (!scenarios.length) {
    return `You are currently ${status}. Coach G needs more information before suggesting a realistic recovery path.`;
  }

  return `You are currently ${status} for ${progress?.goal?.name || "this goal"}. GateCEP found ${scenarios.length} possible ways to improve the plan. The most feasible option currently appears to be "${recommended?.title || "further review"}". This is not an automatic change: Coach G should discuss the trade-offs with you and learn what is realistic before the plan is updated.`;
}

export function buildGoalRecoveryPlanBatch({
  goals = [],
  ...context
} = {}) {
  return (
    Array.isArray(goals)
      ? goals
      : []
  ).map(
    (goal) =>
      buildGoalRecoveryPlan({
        goal,
        ...context
      })
  );
}

export function loadGoalRecoveryPlansNeedingDiscussion({
  goals = [],
  ...context
} = {}) {
  return buildGoalRecoveryPlanBatch({
    goals,
    ...context
  }).filter(
    (plan) =>
      plan?.recoveryNeeded ||
      plan
        ?.progress
        ?.coachGContext
        ?.shouldAskInvestor
  );
}
