/*
 * ============================================================
 * PC-028C
 * GOAL-TO-BEHAVIOR ALIGNMENT ENGINE
 * ============================================================
 *
 * GateCEP purpose:
 *
 * Compare:
 * - what the investor says they want,
 * - what Investor DNA currently understands,
 * - what the investor is actually doing.
 *
 * Important:
 * A mismatch is NOT automatically treated as bad behavior.
 * It creates a hypothesis and a Coach G discussion point.
 *
 * The objective is to learn whether:
 * - behavior should change,
 * - the goal changed,
 * - circumstances changed,
 * - Investor DNA needs to evolve.
 * ============================================================
 */

export const GOAL_BEHAVIOR_ALIGNMENT_STATUSES = Object.freeze({
  NOT_ENOUGH_DATA: "NOT_ENOUGH_DATA",
  STRONGLY_ALIGNED: "STRONGLY_ALIGNED",
  ALIGNED: "ALIGNED",
  MIXED: "MIXED",
  MISALIGNED: "MISALIGNED",
  NEEDS_CLARIFICATION: "NEEDS_CLARIFICATION"
});

export const GOAL_BEHAVIOR_SIGNAL_TYPES = Object.freeze({
  CONTRIBUTION_CONSISTENCY: "CONTRIBUTION_CONSISTENCY",
  TRADING_FREQUENCY: "TRADING_FREQUENCY",
  HOLDING_PERIOD: "HOLDING_PERIOD",
  CONCENTRATION: "CONCENTRATION",
  CASH_USAGE: "CASH_USAGE",
  LOSS_RESPONSE: "LOSS_RESPONSE",
  PROFIT_TAKING: "PROFIT_TAKING",
  PORTFOLIO_DRIFT: "PORTFOLIO_DRIFT",
  GOAL_FUNDING: "GOAL_FUNDING",
  DISCIPLINE: "DISCIPLINE"
});

export const GOAL_BEHAVIOR_HYPOTHESIS_TYPES = Object.freeze({
  BEHAVIOR_MAY_NEED_CHANGE: "BEHAVIOR_MAY_NEED_CHANGE",
  GOAL_MAY_HAVE_CHANGED: "GOAL_MAY_HAVE_CHANGED",
  CIRCUMSTANCES_MAY_HAVE_CHANGED: "CIRCUMSTANCES_MAY_HAVE_CHANGED",
  DNA_MAY_NEED_UPDATE: "DNA_MAY_NEED_UPDATE",
  NEED_MORE_EVIDENCE: "NEED_MORE_EVIDENCE"
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

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function round(value, decimals = 0) {
  const parsed = n(value);

  return parsed === null
    ? null
    : Number(
        parsed.toFixed(decimals)
      );
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function buildSignal({
  type,
  label,
  observed,
  expected,
  score,
  evidence,
  interpretation,
  confidence = "MEDIUM"
}) {
  return {
    type,
    label,
    observed,
    expected,
    score:
      clamp(
        round(score, 0),
        0,
        100
      ),
    evidence:
      safeArray(evidence),
    interpretation,
    confidence
  };
}

export function buildContributionAlignmentSignal({
  goal = {},
  behavior = {}
} = {}) {
  const averageMonthlyContribution =
    n(
      behavior?.averageMonthlyContribution
    );

  const requiredMonthlyContribution =
    n(
      behavior?.requiredMonthlyContribution
    );

  const consistencyPercentage =
    n(
      behavior?.contributionConsistencyPercentage
    );

  if (
    averageMonthlyContribution === null &&
    requiredMonthlyContribution === null &&
    consistencyPercentage === null
  ) {
    return null;
  }

  let score = 70;
  const evidence = [];

  if (
    requiredMonthlyContribution !== null &&
    requiredMonthlyContribution > 0 &&
    averageMonthlyContribution !== null
  ) {
    const ratio =
      averageMonthlyContribution /
      requiredMonthlyContribution;

    score =
      clamp(
        ratio * 100,
        0,
        100
      );

    evidence.push(
      `Average monthly contribution: ${goal?.currency || "KES"} ${round(averageMonthlyContribution, 2)}.`
    );

    evidence.push(
      `Estimated contribution required by current goal plan: ${goal?.currency || "KES"} ${round(requiredMonthlyContribution, 2)}.`
    );
  }

  if (
    consistencyPercentage !== null
  ) {
    score =
      (
        score +
        consistencyPercentage
      ) /
      2;

    evidence.push(
      `Contribution consistency: ${round(consistencyPercentage, 0)}%.`
    );
  }

  return buildSignal({
    type:
      GOAL_BEHAVIOR_SIGNAL_TYPES
        .CONTRIBUTION_CONSISTENCY,

    label:
      "Contribution consistency",

    observed:
      {
        averageMonthlyContribution,
        consistencyPercentage
      },

    expected:
      {
        requiredMonthlyContribution
      },

    score,

    evidence,

    interpretation:
      score >= 75
        ? "Contribution behavior appears broadly supportive of the current goal."
        : "Contribution behavior may not currently be sufficient or consistent enough for the stated goal.",

    confidence:
      requiredMonthlyContribution !== null
        ? "HIGH"
        : "MEDIUM"
  });
}

export function buildTradingFrequencyAlignmentSignal({
  goal = {},
  behavior = {},
  investorDNA = {}
} = {}) {
  const tradesPerMonth =
    n(
      behavior?.tradesPerMonth
    );

  const turnoverPercentage =
    n(
      behavior?.turnoverPercentage
    );

  if (
    tradesPerMonth === null &&
    turnoverPercentage === null
  ) {
    return null;
  }

  const longTerm =
    goal?.timeHorizon === "LONG_TERM" ||
    n(goal?.monthsRemaining) >= 60;

  const dnaStyle =
    investorDNA?.investmentStyle ||
    investorDNA?.behaviorProfile ||
    null;

  let score = 75;
  const evidence = [];

  if (
    longTerm &&
    tradesPerMonth !== null
  ) {
    if (tradesPerMonth > 8) {
      score -= 35;
    } else if (tradesPerMonth > 4) {
      score -= 20;
    } else if (tradesPerMonth > 2) {
      score -= 8;
    }

    evidence.push(
      `Observed trading frequency: ${round(tradesPerMonth, 1)} trades per month.`
    );
  }

  if (
    longTerm &&
    turnoverPercentage !== null
  ) {
    if (turnoverPercentage > 100) {
      score -= 25;
    } else if (turnoverPercentage > 60) {
      score -= 15;
    }

    evidence.push(
      `Observed portfolio turnover: ${round(turnoverPercentage, 1)}%.`
    );
  }

  if (
    dnaStyle &&
    String(dnaStyle)
      .toUpperCase()
      .includes("ACTIVE")
  ) {
    score += 10;

    evidence.push(
      "Investor DNA currently reflects a relatively active investing style."
    );
  }

  return buildSignal({
    type:
      GOAL_BEHAVIOR_SIGNAL_TYPES
        .TRADING_FREQUENCY,

    label:
      "Trading frequency",

    observed:
      {
        tradesPerMonth,
        turnoverPercentage
      },

    expected:
      {
        timeHorizon:
          goal?.timeHorizon ||
          null
      },

    score,

    evidence,

    interpretation:
      score >= 70
        ? "Trading activity is not currently showing a major conflict with the stated goal."
        : "Trading activity may be more active than the stated goal appears to require. Coach G should understand why before judging the behavior.",

    confidence:
      tradesPerMonth !== null &&
      turnoverPercentage !== null
        ? "HIGH"
        : "MEDIUM"
  });
}

export function buildHoldingPeriodAlignmentSignal({
  goal = {},
  behavior = {}
} = {}) {
  const averageHoldingDays =
    n(
      behavior?.averageHoldingDays
    );

  if (
    averageHoldingDays === null
  ) {
    return null;
  }

  const longTerm =
    goal?.timeHorizon === "LONG_TERM" ||
    n(goal?.monthsRemaining) >= 60;

  let score = 75;

  if (longTerm) {
    if (averageHoldingDays < 30) {
      score = 30;
    } else if (averageHoldingDays < 90) {
      score = 50;
    } else if (averageHoldingDays < 180) {
      score = 65;
    } else {
      score = 85;
    }
  }

  return buildSignal({
    type:
      GOAL_BEHAVIOR_SIGNAL_TYPES
        .HOLDING_PERIOD,

    label:
      "Holding period",

    observed:
      {
        averageHoldingDays
      },

    expected:
      {
        timeHorizon:
          goal?.timeHorizon ||
          null
      },

    score,

    evidence: [
      `Average observed holding period: ${round(averageHoldingDays, 0)} days.`
    ],

    interpretation:
      score >= 70
        ? "Observed holding periods are broadly compatible with the current goal."
        : "Observed holding periods appear shorter than expected for the current goal. Coach G should clarify the investor's intent."
  });
}

export function buildConcentrationAlignmentSignal({
  portfolioHealth = {},
  investorDNA = {}
} = {}) {
  const topHoldingWeight =
    n(
      portfolioHealth?.topHoldingWeightPercentage
    );

  const topSectorWeight =
    n(
      portfolioHealth?.topSectorWeightPercentage
    );

  const concentrationRisk =
    portfolioHealth?.concentrationRisk ||
    null;

  if (
    topHoldingWeight === null &&
    topSectorWeight === null &&
    concentrationRisk === null
  ) {
    return null;
  }

  let score = 80;
  const evidence = [];

  if (
    topHoldingWeight !== null
  ) {
    if (topHoldingWeight > 40) {
      score -= 40;
    } else if (topHoldingWeight > 30) {
      score -= 25;
    } else if (topHoldingWeight > 20) {
      score -= 10;
    }

    evidence.push(
      `Largest holding weight: ${round(topHoldingWeight, 1)}%.`
    );
  }

  if (
    topSectorWeight !== null
  ) {
    if (topSectorWeight > 60) {
      score -= 25;
    } else if (topSectorWeight > 45) {
      score -= 12;
    }

    evidence.push(
      `Largest sector weight: ${round(topSectorWeight, 1)}%.`
    );
  }

  if (
    concentrationRisk === "HIGH"
  ) {
    score -= 15;
  }

  if (
    investorDNA?.concentrationPreference === "FOCUSED"
  ) {
    score += 5;

    evidence.push(
      "Investor DNA currently indicates a preference for a more focused portfolio."
    );
  }

  return buildSignal({
    type:
      GOAL_BEHAVIOR_SIGNAL_TYPES
        .CONCENTRATION,

    label:
      "Portfolio concentration",

    observed:
      {
        topHoldingWeight,
        topSectorWeight,
        concentrationRisk
      },

    expected:
      {
        diversifiedGoalSupport:
          true
      },

    score,

    evidence,

    interpretation:
      score >= 70
        ? "Portfolio concentration does not currently appear to create a major goal-alignment concern."
        : "Portfolio concentration may make the goal overly dependent on a small number of investments."
  });
}

export function buildCashUsageAlignmentSignal({
  behavior = {},
  financialContext = {}
} = {}) {
  const emergencyWithdrawals =
    n(
      behavior?.emergencyWithdrawals
    );

  const cashBufferMonths =
    n(
      financialContext?.cashBufferMonths
    );

  const liquidityNeed =
    financialContext?.liquidityNeed ||
    null;

  if (
    emergencyWithdrawals === null &&
    cashBufferMonths === null &&
    liquidityNeed === null
  ) {
    return null;
  }

  let score = 80;
  const evidence = [];

  if (
    emergencyWithdrawals !== null &&
    emergencyWithdrawals > 0
  ) {
    score -=
      Math.min(
        emergencyWithdrawals * 10,
        30
      );

    evidence.push(
      `${emergencyWithdrawals} emergency or unplanned withdrawal(s) were observed.`
    );
  }

  if (
    cashBufferMonths !== null
  ) {
    if (cashBufferMonths < 1) {
      score -= 35;
    } else if (cashBufferMonths < 3) {
      score -= 20;
    }

    evidence.push(
      `Estimated cash buffer: ${round(cashBufferMonths, 1)} month(s).`
    );
  }

  if (
    liquidityNeed === "HIGH"
  ) {
    score -= 20;
  }

  return buildSignal({
    type:
      GOAL_BEHAVIOR_SIGNAL_TYPES
        .CASH_USAGE,

    label:
      "Cash and liquidity behavior",

    observed:
      {
        emergencyWithdrawals,
        cashBufferMonths,
        liquidityNeed
      },

    expected:
      {
        sustainableInvestmentFunding:
          true
      },

    score,

    evidence,

    interpretation:
      score >= 70
        ? "Cash behavior does not currently show a major threat to goal consistency."
        : "Liquidity pressure may be interfering with the investment plan and deserves discussion before increasing contributions."
  });
}

export function buildLossResponseAlignmentSignal({
  behavior = {},
  investorDNA = {}
} = {}) {
  const soldAfterLossPercentage =
    n(
      behavior?.soldAfterLossPercentage
    );

  const averageLossBeforeSale =
    n(
      behavior?.averageLossBeforeSalePercentage
    );

  if (
    soldAfterLossPercentage === null &&
    averageLossBeforeSale === null
  ) {
    return null;
  }

  let score = 75;
  const evidence = [];

  if (
    soldAfterLossPercentage !== null
  ) {
    if (soldAfterLossPercentage > 70) {
      score -= 30;
    } else if (soldAfterLossPercentage > 50) {
      score -= 20;
    }

    evidence.push(
      `${round(soldAfterLossPercentage, 1)}% of observed losing positions were sold after losses.`
    );
  }

  if (
    investorDNA?.lossSensitivity === "HIGH"
  ) {
    score += 5;

    evidence.push(
      "Investor DNA currently indicates higher sensitivity to losses."
    );
  }

  return buildSignal({
    type:
      GOAL_BEHAVIOR_SIGNAL_TYPES
        .LOSS_RESPONSE,

    label:
      "Response to losses",

    observed:
      {
        soldAfterLossPercentage,
        averageLossBeforeSale
      },

    expected:
      {
        disciplinedResponse:
          true
      },

    score,

    evidence,

    interpretation:
      score >= 70
        ? "Observed loss behavior is not currently showing a major conflict with the plan."
        : "The investor may be reacting quickly to losses. Coach G should determine whether this reflects discomfort, liquidity needs, changing conviction, or another reason."
  });
}

export function buildPortfolioDriftAlignmentSignal({
  portfolioHealth = {}
} = {}) {
  const driftPercentage =
    n(
      portfolioHealth?.driftPercentage
    );

  if (
    driftPercentage === null
  ) {
    return null;
  }

  let score = 90;

  if (
    Math.abs(driftPercentage) > 20
  ) {
    score = 40;
  } else if (
    Math.abs(driftPercentage) > 10
  ) {
    score = 60;
  } else if (
    Math.abs(driftPercentage) > 5
  ) {
    score = 75;
  }

  return buildSignal({
    type:
      GOAL_BEHAVIOR_SIGNAL_TYPES
        .PORTFOLIO_DRIFT,

    label:
      "Portfolio drift",

    observed:
      {
        driftPercentage
      },

    expected:
      {
        alignedAllocation:
          true
      },

    score,

    evidence: [
      `Observed allocation drift: ${round(driftPercentage, 1)}%.`
    ],

    interpretation:
      score >= 70
        ? "Portfolio drift is currently within a manageable range."
        : "Portfolio drift may be moving the investor away from the intended goal-supporting allocation."
  });
}

export function buildGoalBehaviorSignals({
  goal = {},
  behavior = {},
  portfolioHealth = {},
  investorDNA = {},
  financialContext = {}
} = {}) {
  return [
    buildContributionAlignmentSignal({
      goal,
      behavior
    }),

    buildTradingFrequencyAlignmentSignal({
      goal,
      behavior,
      investorDNA
    }),

    buildHoldingPeriodAlignmentSignal({
      goal,
      behavior
    }),

    buildConcentrationAlignmentSignal({
      portfolioHealth,
      investorDNA
    }),

    buildCashUsageAlignmentSignal({
      behavior,
      financialContext
    }),

    buildLossResponseAlignmentSignal({
      behavior,
      investorDNA
    }),

    buildPortfolioDriftAlignmentSignal({
      portfolioHealth
    })
  ].filter(Boolean);
}

export function calculateGoalBehaviorAlignmentScore({
  signals = []
} = {}) {
  const normalized =
    safeArray(signals);

  if (!normalized.length) {
    return null;
  }

  const weighted =
    normalized.reduce(
      (total, signal) => {
        const weight =
          signal?.confidence === "HIGH"
            ? 1.25
            : signal?.confidence === "LOW"
              ? 0.75
              : 1;

        return {
          score:
            total.score +
            (
              n(signal?.score) || 0
            ) *
            weight,

          weight:
            total.weight +
            weight
        };
      },
      {
        score: 0,
        weight: 0
      }
    );

  return weighted.weight > 0
    ? round(
        weighted.score /
        weighted.weight,
        0
      )
    : null;
}

export function classifyGoalBehaviorAlignment({
  score,
  signals = []
} = {}) {
  if (
    score === null ||
    !safeArray(signals).length
  ) {
    return {
      status:
        GOAL_BEHAVIOR_ALIGNMENT_STATUSES
          .NOT_ENOUGH_DATA,

      label:
        "Not enough evidence"
    };
  }

  const weakSignals =
    safeArray(signals).filter(
      (item) =>
        n(item?.score) !== null &&
        item.score < 55
    );

  if (
    weakSignals.length >= 2
  ) {
    return {
      status:
        GOAL_BEHAVIOR_ALIGNMENT_STATUSES
          .NEEDS_CLARIFICATION,

      label:
        "Needs discussion"
    };
  }

  if (score >= 85) {
    return {
      status:
        GOAL_BEHAVIOR_ALIGNMENT_STATUSES
          .STRONGLY_ALIGNED,

      label:
        "Strongly aligned"
    };
  }

  if (score >= 70) {
    return {
      status:
        GOAL_BEHAVIOR_ALIGNMENT_STATUSES
          .ALIGNED,

      label:
        "Aligned"
    };
  }

  if (score >= 55) {
    return {
      status:
        GOAL_BEHAVIOR_ALIGNMENT_STATUSES
          .MIXED,

      label:
        "Mixed alignment"
    };
  }

  return {
    status:
      GOAL_BEHAVIOR_ALIGNMENT_STATUSES
        .MISALIGNED,

    label:
      "Possible mismatch"
  };
}

export function buildGoalBehaviorHypotheses({
  classification,
  signals = [],
  investorDNA = {},
  recentLifeChanges = []
} = {}) {
  const hypotheses = [];
  const weak =
    safeArray(signals).filter(
      (item) =>
        n(item?.score) !== null &&
        item.score < 60
    );

  if (!weak.length) {
    return hypotheses;
  }

  if (
    safeArray(recentLifeChanges).length
  ) {
    hypotheses.push({
      type:
        GOAL_BEHAVIOR_HYPOTHESIS_TYPES
          .CIRCUMSTANCES_MAY_HAVE_CHANGED,

      confidence:
        "MEDIUM",

      reason:
        "Recent life changes may explain why observed behavior differs from the current plan."
    });
  }

  if (
    weak.some(
      (item) =>
        item.type ===
          GOAL_BEHAVIOR_SIGNAL_TYPES
            .TRADING_FREQUENCY ||
        item.type ===
          GOAL_BEHAVIOR_SIGNAL_TYPES
            .HOLDING_PERIOD
    )
  ) {
    hypotheses.push({
      type:
        GOAL_BEHAVIOR_HYPOTHESIS_TYPES
          .BEHAVIOR_MAY_NEED_CHANGE,

      confidence:
        "MEDIUM",

      reason:
        "Observed trading behavior may not currently support the stated goal."
    });

    hypotheses.push({
      type:
        GOAL_BEHAVIOR_HYPOTHESIS_TYPES
          .DNA_MAY_NEED_UPDATE,

      confidence:
        "LOW",

      reason:
        "The investor may prefer a more active style than Investor DNA currently reflects."
    });
  }

  if (
    weak.some(
      (item) =>
        item.type ===
          GOAL_BEHAVIOR_SIGNAL_TYPES
            .CONTRIBUTION_CONSISTENCY ||
        item.type ===
          GOAL_BEHAVIOR_SIGNAL_TYPES
            .CASH_USAGE
    )
  ) {
    hypotheses.push({
      type:
        GOAL_BEHAVIOR_HYPOTHESIS_TYPES
          .CIRCUMSTANCES_MAY_HAVE_CHANGED,

      confidence:
        "MEDIUM",

      reason:
        "Cash-flow or contribution changes may reflect a change in the investor's financial circumstances."
    });
  }

  if (
    classification?.status ===
    GOAL_BEHAVIOR_ALIGNMENT_STATUSES
      .MISALIGNED
  ) {
    hypotheses.push({
      type:
        GOAL_BEHAVIOR_HYPOTHESIS_TYPES
          .GOAL_MAY_HAVE_CHANGED,

      confidence:
        "LOW",

      reason:
        "The current goal may no longer fully reflect what the investor is trying to achieve."
    });
  }

  if (!hypotheses.length) {
    hypotheses.push({
      type:
        GOAL_BEHAVIOR_HYPOTHESIS_TYPES
          .NEED_MORE_EVIDENCE,

      confidence:
        "LOW",

      reason:
        "GateCEP sees a possible mismatch but does not yet have enough evidence to explain it."
    });
  }

  return hypotheses;
}

export function buildCoachGAlignmentQuestions({
  goal = {},
  signals = [],
  hypotheses = []
} = {}) {
  const questions = [];

  const weak =
    safeArray(signals).filter(
      (item) =>
        n(item?.score) !== null &&
        item.score < 60
    );

  if (
    weak.some(
      (item) =>
        item.type ===
        GOAL_BEHAVIOR_SIGNAL_TYPES
          .TRADING_FREQUENCY
    )
  ) {
    questions.push(
      `I noticed your recent trading has become more active than I would normally expect for ${goal?.name || "this goal"}. Has your strategy changed, or have recent market conditions influenced how you've been investing?`
    );
  }

  if (
    weak.some(
      (item) =>
        item.type ===
        GOAL_BEHAVIOR_SIGNAL_TYPES
          .CONTRIBUTION_CONSISTENCY
    )
  ) {
    questions.push(
      "Your recent contributions are below the current plan. Has anything changed in your income, expenses, or priorities?"
    );
  }

  if (
    weak.some(
      (item) =>
        item.type ===
        GOAL_BEHAVIOR_SIGNAL_TYPES
          .CASH_USAGE
    )
  ) {
    questions.push(
      "I've noticed more pressure on your cash position. Would you rather strengthen your cash buffer before we focus on increasing investments?"
    );
  }

  if (
    weak.some(
      (item) =>
        item.type ===
        GOAL_BEHAVIOR_SIGNAL_TYPES
          .LOSS_RESPONSE
    )
  ) {
    questions.push(
      "I noticed several positions were sold after losses. Was that because the market moves made you uncomfortable, your view of the investments changed, or you needed the money for something else?"
    );
  }

  if (
    weak.some(
      (item) =>
        item.type ===
        GOAL_BEHAVIOR_SIGNAL_TYPES
          .CONCENTRATION
    )
  ) {
    questions.push(
      "Your portfolio has become more concentrated. Is that intentional because you have stronger conviction in those investments, or did it happen gradually?"
    );
  }

  if (
    safeArray(hypotheses).some(
      (item) =>
        item.type ===
        GOAL_BEHAVIOR_HYPOTHESIS_TYPES
          .GOAL_MAY_HAVE_CHANGED
    )
  ) {
    questions.push(
      `Is ${goal?.name || "this goal"} still as important to you, or has what you're trying to achieve changed?`
    );
  }

  return questions;
}

export function buildGoalBehaviorAlignmentAnalysis({
  goal = {},
  behavior = {},
  portfolioHealth = {},
  investorDNA = {},
  financialContext = {},
  recentLifeChanges = []
} = {}) {
  const signals =
    buildGoalBehaviorSignals({
      goal,
      behavior,
      portfolioHealth,
      investorDNA,
      financialContext
    });

  const score =
    calculateGoalBehaviorAlignmentScore({
      signals
    });

  const classification =
    classifyGoalBehaviorAlignment({
      score,
      signals
    });

  const hypotheses =
    buildGoalBehaviorHypotheses({
      classification,
      signals,
      investorDNA,
      recentLifeChanges
    });

  const coachGQuestions =
    buildCoachGAlignmentQuestions({
      goal,
      signals,
      hypotheses
    });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    goal: {
      id:
        goal?.id ||
        null,

      name:
        goal?.name ||
        goal?.title ||
        "Financial Goal"
    },

    score,

    classification,

    signals,

    hypotheses,

    coachGQuestions,

    coachGContext: {
      shouldDiscuss:
        classification.status ===
          GOAL_BEHAVIOR_ALIGNMENT_STATUSES
            .MISALIGNED ||
        classification.status ===
          GOAL_BEHAVIOR_ALIGNMENT_STATUSES
            .MIXED ||
        classification.status ===
          GOAL_BEHAVIOR_ALIGNMENT_STATUSES
            .NEEDS_CLARIFICATION,

      narrative:
        buildGoalBehaviorAlignmentNarrative({
          goal,
          score,
          classification,
          signals,
          hypotheses
        })
    },

    safeguards: {
      behaviorJudgedWrong:
        false,

      goalAutomaticallyChanged:
        false,

      dnaAutomaticallyChanged:
        false,

      clarificationRequiredBeforeMajorUpdate:
        true
    }
  };
}

export function buildGoalBehaviorAlignmentNarrative({
  goal = {},
  score,
  classification,
  signals = [],
  hypotheses = []
} = {}) {
  if (
    classification?.status ===
    GOAL_BEHAVIOR_ALIGNMENT_STATUSES
      .NOT_ENOUGH_DATA
  ) {
    return `Coach G does not yet have enough observed behavior to judge alignment with ${goal?.name || goal?.title || "this goal"}.`;
  }

  const weakCount =
    safeArray(signals).filter(
      (item) =>
        n(item?.score) !== null &&
        item.score < 60
    ).length;

  return `Your observed behavior is currently rated ${classification?.label || "being reviewed"} with an alignment score of ${score ?? "unknown"}/100 for ${goal?.name || goal?.title || "this goal"}. GateCEP found ${weakCount} area(s) that may deserve discussion. These are hypotheses, not conclusions: Coach G should understand whether your behavior, goal, circumstances, or Investor DNA has changed before recommending a major adjustment.`;
}

export function buildGoalBehaviorAlignmentBatch({
  goals = [],
  ...context
} = {}) {
  return (
    Array.isArray(goals)
      ? goals
      : []
  ).map(
    (goal) =>
      buildGoalBehaviorAlignmentAnalysis({
        goal,
        ...context
      })
  );
}

export function loadGoalBehaviorMismatches({
  goals = [],
  ...context
} = {}) {
  return buildGoalBehaviorAlignmentBatch({
    goals,
    ...context
  }).filter(
    (item) =>
      item
        ?.coachGContext
        ?.shouldDiscuss
  );
}
