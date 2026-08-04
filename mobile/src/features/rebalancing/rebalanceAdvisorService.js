import {
  buildRebalanceRecommendations
} from "./rebalanceRecommendationService";

function number(value) {
  const parsed =
    Number(value || 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function roundMoney(value) {
  return Number(
    number(value).toFixed(2)
  );
}

function roundPercent(value) {
  return Number(
    number(value).toFixed(2)
  );
}

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    Math.max(
      number(value),
      minimum
    ),
    maximum
  );
}

function normalizeText(value) {
  return String(
    value || ""
  ).trim();
}

function formatMoney(value) {
  return number(
    value
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

function formatPercent(value) {
  return `${roundPercent(
    value
  ).toFixed(2)}%`;
}

function formatLabel(value) {
  return String(
    value || ""
  )
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

/*
 * ============================================================
 * SCORE: TARGET ALIGNMENT
 * ============================================================
 */

function calculateAlignmentScore({
  totalAbsoluteDrift,
  actionableCount
}) {
  const driftPenalty =
    Math.min(
      number(
        totalAbsoluteDrift
      ) * 2.5,
      60
    );

  const actionPenalty =
    Math.min(
      number(
        actionableCount
      ) * 4,
      20
    );

  return Math.round(
    clamp(
      100 -
        driftPenalty -
        actionPenalty,
      0,
      100
    )
  );
}

/*
 * ============================================================
 * SCORE: DIVERSIFICATION
 * ============================================================
 */

function calculateDiversificationScore({
  holdingsCount,
  largestHoldingPercentage,
  topThreePercentage,
  largestSectorPercentage
}) {
  let score =
    100;

  const count =
    number(
      holdingsCount
    );

  if (
    count <= 1
  ) {
    score -= 55;
  } else if (
    count <= 3
  ) {
    score -= 35;
  } else if (
    count <= 5
  ) {
    score -= 15;
  }

  const largestHolding =
    number(
      largestHoldingPercentage
    );

  if (
    largestHolding > 50
  ) {
    score -= 35;
  } else if (
    largestHolding > 35
  ) {
    score -= 22;
  } else if (
    largestHolding > 25
  ) {
    score -= 12;
  }

  const topThree =
    number(
      topThreePercentage
    );

  if (
    topThree > 85
  ) {
    score -= 20;
  } else if (
    topThree > 70
  ) {
    score -= 12;
  }

  const largestSector =
    number(
      largestSectorPercentage
    );

  if (
    largestSector > 60
  ) {
    score -= 25;
  } else if (
    largestSector > 45
  ) {
    score -= 15;
  } else if (
    largestSector > 35
  ) {
    score -= 8;
  }

  return Math.round(
    clamp(
      score,
      0,
      100
    )
  );
}

/*
 * ============================================================
 * SCORE: LIQUIDITY
 * ============================================================
 */

function calculateLiquidityScore({
  cashPercentage,
  targetCashPercentage,
  preserveCashFloor,
  currentCash,
  fundingGap
}) {
  let score =
    100;

  const currentCashPercentage =
    number(
      cashPercentage
    );

  const targetCash =
    number(
      targetCashPercentage
    );

  const percentageDifference =
    Math.abs(
      currentCashPercentage -
      targetCash
    );

  score -= Math.min(
    percentageDifference * 3,
    40
  );

  if (
    number(
      currentCash
    ) <
    number(
      preserveCashFloor
    )
  ) {
    score -= 30;
  }

  if (
    number(
      fundingGap
    ) > 0
  ) {
    score -= 25;
  }

  return Math.round(
    clamp(
      score,
      0,
      100
    )
  );
}

/*
 * ============================================================
 * TARGET CASH
 * ============================================================
 */

function findTargetCashPercentage(
  target
) {
  const targets =
    Array.isArray(
      target?.targets
    )
      ? target.targets
      : [];

  const cashTarget =
    targets.find(
      (item) =>
        String(
          item?.key ||
          item?.assetClass ||
          ""
        )
          .trim()
          .toUpperCase() ===
        "CASH"
    );

  return number(
    cashTarget?.percentage
  );
}

/*
 * ============================================================
 * GRADE
 * ============================================================
 */

function getScoreGrade(
  score
) {
  const safeScore =
    number(
      score
    );

  if (
    safeScore >= 85
  ) {
    return {
      code:
        "STRONG",

      label:
        "Strong",

      description:
        "The portfolio is well positioned against the selected target."
    };
  }

  if (
    safeScore >= 70
  ) {
    return {
      code:
        "GOOD",

      label:
        "Good",

      description:
        "The portfolio is generally healthy, with a few areas that may benefit from attention."
    };
  }

  if (
    safeScore >= 50
  ) {
    return {
      code:
        "REVIEW",

      label:
        "Needs Review",

      description:
        "The portfolio has meaningful allocation or concentration issues to review."
    };
  }

  return {
    code:
      "HIGH_ATTENTION",

    label:
      "High Attention",

    description:
      "The portfolio has significant allocation, concentration, or funding concerns."
  };
}

/*
 * ============================================================
 * CONCENTRATION ADVICE
 * ============================================================
 */

function buildConcentrationAssessment({
  concentration,
  holdingsCount
}) {
  const largestHolding =
    concentration
      ?.largestHolding ||
    null;

  const largestHoldingPercentage =
    number(
      concentration
        ?.largestHoldingPercentage
    );

  const topThreePercentage =
    number(
      concentration
        ?.topThreePercentage
    );

  const largestSector =
    concentration
      ?.largestSector ||
    null;

  const largestSectorPercentage =
    number(
      concentration
        ?.largestSectorPercentage
    );

  let level =
    "LOW";

  if (
    largestHoldingPercentage >= 40 ||
    largestSectorPercentage >= 60 ||
    topThreePercentage >= 85
  ) {
    level =
      "HIGH";
  } else if (
    largestHoldingPercentage >= 25 ||
    largestSectorPercentage >= 40 ||
    topThreePercentage >= 70
  ) {
    level =
      "MODERATE";
  }

  let message;

  if (
    level ===
    "HIGH"
  ) {
    message =
      `Portfolio concentration is high. ${
        largestHolding?.symbol ||
        largestHolding?.name ||
        "The largest holding"
      } represents ${formatPercent(
        largestHoldingPercentage
      )} of total portfolio value, while the largest sector represents ${formatPercent(
        largestSectorPercentage
      )}.`;
  } else if (
    level ===
    "MODERATE"
  ) {
    message =
      `Portfolio concentration is moderate. The largest holding represents ${formatPercent(
        largestHoldingPercentage
      )}, and the top three holdings represent ${formatPercent(
        topThreePercentage
      )} of total value.`;
  } else {
    message =
      `Portfolio concentration is currently controlled across ${number(
        holdingsCount
      )} holding(s). The largest position represents ${formatPercent(
        largestHoldingPercentage
      )}.`;
  }

  return {
    level,

    largestHolding,

    largestHoldingPercentage,

    topThreePercentage,

    largestSector,

    largestSectorPercentage,

    message
  };
}

/*
 * ============================================================
 * LIQUIDITY ADVICE
 * ============================================================
 */

function buildLiquidityAssessment({
  currentCash,
  cashPercentage,
  targetCashPercentage,
  preserveCashFloor,
  funding
}) {
  const cashDifference =
    roundPercent(
      number(
        cashPercentage
      ) -
      number(
        targetCashPercentage
      )
    );

  let status;

  if (
    Math.abs(
      cashDifference
    ) <= 2
  ) {
    status =
      "ON_TARGET";
  } else if (
    cashDifference > 0
  ) {
    status =
      "ABOVE_TARGET";
  } else {
    status =
      "BELOW_TARGET";
  }

  let message;

  if (
    status ===
    "ON_TARGET"
  ) {
    message =
      `Cash is close to the saved target at ${formatPercent(
        cashPercentage
      )}, compared with a target of ${formatPercent(
        targetCashPercentage
      )}.`;
  } else if (
    status ===
    "ABOVE_TARGET"
  ) {
    message =
      `Cash is ${formatPercent(
        Math.abs(
          cashDifference
        )
      )} above target. Approximately KES ${formatMoney(
        Math.max(
          number(
            currentCash
          ) -
          number(
            funding
              ?.preserveCashFloor
          ),
          0
        )
      )} is currently available before considering the configured cash floor.`;
  } else {
    message =
      `Cash is ${formatPercent(
        Math.abs(
          cashDifference
        )
      )} below target. Increasing liquidity may be appropriate before adding new equity exposure.`;
  }

  if (
    number(
      currentCash
    ) <
    number(
      preserveCashFloor
    )
  ) {
    message +=
      ` Current cash is below the preserved floor of KES ${formatMoney(
        preserveCashFloor
      )}.`;
  }

  return {
    status,

    currentCash:
      roundMoney(
        currentCash
      ),

    cashPercentage:
      roundPercent(
        cashPercentage
      ),

    targetCashPercentage:
      roundPercent(
        targetCashPercentage
      ),

    cashDifference,

    preserveCashFloor:
      roundMoney(
        preserveCashFloor
      ),

    message
  };
}

/*
 * ============================================================
 * TOP PRIORITY
 * ============================================================
 */

function buildPriorityAction(
  recommendations
) {
  const actionable =
    Array.isArray(
      recommendations
        ?.actionableRecommendations
    )
      ? recommendations
          .actionableRecommendations
      : [];

  const highest =
    actionable[0] ||
    null;

  if (!highest) {
    return {
      available:
        false,

      action:
        "HOLD",

      title:
        "No immediate rebalance action",

      message:
        "The portfolio is currently within the saved tolerance or no eligible recommendation is available.",

      recommendation:
        null
    };
  }

  const actionLabel =
    formatLabel(
      highest.action
    );

  const quantityText =
    highest
      ?.estimatedQuantity !==
        null &&
    highest
      ?.estimatedQuantity !==
        undefined
      ? ` Estimated quantity: ${highest.estimatedQuantity}.`
      : "";

  return {
    available:
      true,

    action:
      highest.action,

    title:
      `${actionLabel}: ${
        highest.label ||
        highest.key
      }`,

    message:
      `${highest.recommendation}${quantityText}`,

    recommendation:
      highest
  };
}

/*
 * ============================================================
 * ADVISORY INSIGHTS
 * ============================================================
 */

function buildInsights({
  recommendations,
  allocation,
  concentrationAssessment,
  liquidityAssessment
}) {
  const insights = [];

  const status =
    recommendations?.status;

  if (
    status ===
    "NO_ACTION_REQUIRED"
  ) {
    insights.push({
      code:
        "TARGET_ALIGNMENT",

      severity:
        "INFO",

      title:
        "Target allocation is within tolerance",

      message:
        "No immediate allocation changes are required under the active target profile."
    });
  }

  if (
    concentrationAssessment
      ?.level ===
    "HIGH"
  ) {
    insights.push({
      code:
        "CONCENTRATION_HIGH",

      severity:
        "HIGH",

      title:
        "High concentration risk",

      message:
        concentrationAssessment
          .message
    });
  } else if (
    concentrationAssessment
      ?.level ===
    "MODERATE"
  ) {
    insights.push({
      code:
        "CONCENTRATION_MODERATE",

      severity:
        "MEDIUM",

      title:
        "Moderate concentration",

      message:
        concentrationAssessment
          .message
    });
  }

  if (
    liquidityAssessment
      ?.status ===
    "BELOW_TARGET"
  ) {
    insights.push({
      code:
        "CASH_BELOW_TARGET",

      severity:
        "MEDIUM",

      title:
        "Cash is below target",

      message:
        liquidityAssessment
          .message
    });
  }

  if (
    recommendations
      ?.funding
      ?.fundingGap >
    0
  ) {
    insights.push({
      code:
        "FUNDING_GAP",

      severity:
        "HIGH",

      title:
        "Recommendation funding gap",

      message:
        `The current recommendation set has an estimated funding gap of KES ${formatMoney(
          recommendations
            .funding
            .fundingGap
        )}.`
    });
  }

  if (
    number(
      allocation
        ?.portfolio
        ?.holdingsCount
    ) < 4
  ) {
    insights.push({
      code:
        "LOW_HOLDING_COUNT",

      severity:
        "MEDIUM",

      title:
        "Limited number of holdings",

      message:
        "The portfolio contains relatively few holdings, which may increase company-specific risk."
    });
  }

  if (
    recommendations
      ?.summary
      ?.turnoverPercentage >
    25
  ) {
    insights.push({
      code:
        "HIGH_TURNOVER",

      severity:
        "MEDIUM",

      title:
        "High estimated turnover",

      message:
        `The suggested rebalance would affect approximately ${formatPercent(
          recommendations
            .summary
            .turnoverPercentage
        )} of portfolio value. Review transaction costs and tax implications before acting.`
    });
  }

  return insights;
}

/*
 * ============================================================
 * COACH SUMMARY
 * ============================================================
 */

function buildCoachSummary({
  overallScore,
  grade,
  recommendations,
  concentrationAssessment,
  liquidityAssessment,
  priorityAction
}) {
  const parts = [];

  parts.push(
    `The portfolio health score is ${overallScore}/100, rated ${grade.label}.`
  );

  if (
    recommendations?.status ===
    "NO_ACTION_REQUIRED"
  ) {
    parts.push(
      "The current allocation is within the saved target tolerance."
    );
  } else if (
    recommendations?.status ===
    "READY"
  ) {
    parts.push(
      "The rebalance recommendation set is currently funded and ready for review."
    );
  } else if (
    recommendations?.status ===
    "FUNDING_GAP"
  ) {
    parts.push(
      `The recommendation set has an estimated funding gap of KES ${formatMoney(
        recommendations
          ?.funding
          ?.fundingGap
      )}.`
    );
  }

  parts.push(
    concentrationAssessment.message
  );

  parts.push(
    liquidityAssessment.message
  );

  if (
    priorityAction.available
  ) {
    parts.push(
      `Highest-priority guidance: ${priorityAction.message}`
    );
  }

  return parts
    .filter(Boolean)
    .join(" ");
}

/*
 * ============================================================
 * PC-019F
 * COACH G REBALANCING ADVISOR
 * ============================================================
 *
 * Produces advisory guidance only.
 *
 * It does not:
 *
 * - modify holdings,
 * - modify cash,
 * - save allocation targets,
 * - create orders,
 * - submit broker instructions.
 */

export async function buildCoachGRebalancingAdvice() {
  const recommendations =
    await buildRebalanceRecommendations();

  const driftAnalysis =
    recommendations
      ?.driftAnalysis ||
    {};

  const allocation =
    driftAnalysis
      ?.allocation ||
    {};

  const target =
    driftAnalysis
      ?.target ||
    {};

  const concentration =
    allocation
      ?.concentration ||
    {};

  const holdingsCount =
    number(
      allocation
        ?.portfolio
        ?.holdingsCount
    );

  const currentCash =
    number(
      allocation
        ?.portfolio
        ?.availableCash
    );

  const cashPercentage =
    number(
      concentration
        ?.cashPercentage
    );

  const targetCashPercentage =
    findTargetCashPercentage(
      target
    );

  const preserveCashFloor =
    number(
      recommendations
        ?.funding
        ?.preserveCashFloor
    );

  const alignmentScore =
    calculateAlignmentScore({
      totalAbsoluteDrift:
        recommendations
          ?.drift
          ?.totalAbsoluteDrift,

      actionableCount:
        recommendations
          ?.summary
          ?.actionable
    });

  const diversificationScore =
    calculateDiversificationScore({
      holdingsCount,

      largestHoldingPercentage:
        concentration
          ?.largestHoldingPercentage,

      topThreePercentage:
        concentration
          ?.topThreePercentage,

      largestSectorPercentage:
        concentration
          ?.largestSectorPercentage
    });

  const liquidityScore =
    calculateLiquidityScore({
      cashPercentage,

      targetCashPercentage,

      preserveCashFloor,

      currentCash,

      fundingGap:
        recommendations
          ?.funding
          ?.fundingGap
    });

  const fundingScore =
    recommendations
      ?.funding
      ?.fullyFunded
      ? 100
      : Math.round(
          clamp(
            100 -
              (
                (
                  number(
                    recommendations
                      ?.funding
                      ?.fundingGap
                  ) /
                  Math.max(
                    number(
                      recommendations
                        ?.portfolio
                        ?.totalValue
                    ),
                    1
                  )
                ) *
                100 *
                4
              ),
            0,
            100
          )
        );

  const overallScore =
    Math.round(
      (
        alignmentScore *
          0.35 +
        diversificationScore *
          0.30 +
        liquidityScore *
          0.20 +
        fundingScore *
          0.15
      )
    );

  const grade =
    getScoreGrade(
      overallScore
    );

  const concentrationAssessment =
    buildConcentrationAssessment({
      concentration,
      holdingsCount
    });

  const liquidityAssessment =
    buildLiquidityAssessment({
      currentCash,

      cashPercentage,

      targetCashPercentage,

      preserveCashFloor,

      funding:
        recommendations
          ?.funding
    });

  const priorityAction =
    buildPriorityAction(
      recommendations
    );

  const insights =
    buildInsights({
      recommendations,
      allocation,
      concentrationAssessment,
      liquidityAssessment
    });

  const summary =
    buildCoachSummary({
      overallScore,
      grade,
      recommendations,
      concentrationAssessment,
      liquidityAssessment,
      priorityAction
    });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      recommendations?.status ||
      "NOT_READY",

    profile: {
      profileType:
        target?.profileType ||
        null,

      profileLabel:
        target?.profileLabel ||
        null,

      mode:
        target?.mode ||
        null,

      tolerancePercentage:
        roundPercent(
          target
            ?.tolerancePercentage
        )
    },

    health: {
      overallScore,

      grade,

      components: {
        alignment:
          alignmentScore,

        diversification:
          diversificationScore,

        liquidity:
          liquidityScore,

        funding:
          fundingScore
      }
    },

    portfolio: {
      totalValue:
        roundMoney(
          recommendations
            ?.portfolio
            ?.totalValue
        ),

      holdingsValue:
        roundMoney(
          recommendations
            ?.portfolio
            ?.holdingsValue
        ),

      availableCash:
        roundMoney(
          currentCash
        ),

      holdingsCount,

      cashPercentage:
        roundPercent(
          cashPercentage
        )
    },

    alignment: {
      status:
        recommendations
          ?.drift
          ?.status ||
        null,

      totalAbsoluteDrift:
        roundPercent(
          recommendations
            ?.drift
            ?.totalAbsoluteDrift
        ),

      actionableRecommendations:
        number(
          recommendations
            ?.summary
            ?.actionable
        ),

      estimatedTurnover:
        roundMoney(
          recommendations
            ?.summary
            ?.estimatedTurnover
        ),

      turnoverPercentage:
        roundPercent(
          recommendations
            ?.summary
            ?.turnoverPercentage
        )
    },

    concentration:
      concentrationAssessment,

    liquidity:
      liquidityAssessment,

    funding: {
      fullyFunded:
        Boolean(
          recommendations
            ?.funding
            ?.fullyFunded
        ),

      currentCash:
        roundMoney(
          recommendations
            ?.funding
            ?.currentCash
        ),

      spendableCash:
        roundMoney(
          recommendations
            ?.funding
            ?.spendableCurrentCash
        ),

      cashGenerated:
        roundMoney(
          recommendations
            ?.funding
            ?.estimatedCashGenerated
        ),

      cashRequired:
        roundMoney(
          recommendations
            ?.funding
            ?.estimatedCashRequired
        ),

      fundingGap:
        roundMoney(
          recommendations
            ?.funding
            ?.fundingGap
        )
    },

    priorityAction,

    insights,

    summary,

    recommendations
  };
}

/*
 * ============================================================
 * COMPACT DASHBOARD SUMMARY
 * ============================================================
 */

export async function buildCoachGRebalancingSummary() {
  const advice =
    await buildCoachGRebalancingAdvice();

  return {
    generatedAt:
      advice.generatedAt,

    status:
      advice.status,

    score:
      advice
        ?.health
        ?.overallScore ||
      0,

    grade:
      advice
        ?.health
        ?.grade
        ?.label ||
      "Not available",

    profile:
      advice
        ?.profile
        ?.profileLabel ||
      "Not configured",

    largestRisk:
      advice
        ?.concentration
        ?.level ||
      "UNKNOWN",

    cashStatus:
      advice
        ?.liquidity
        ?.status ||
      "UNKNOWN",

    priorityAction:
      advice
        ?.priorityAction
        ?.title ||
      "No immediate action",

    summary:
      advice.summary
  };
}

/*
 * ============================================================
 * COACH G INSIGHT FILTERS
 * ============================================================
 */

export async function loadHighPriorityRebalancingInsights() {
  const advice =
    await buildCoachGRebalancingAdvice();

  return advice.insights.filter(
    (item) =>
      item?.severity ===
      "HIGH"
  );
}

export async function loadRebalancingRiskInsights() {
  const advice =
    await buildCoachGRebalancingAdvice();

  return advice.insights.filter(
    (item) =>
      [
        "CONCENTRATION_HIGH",
        "CONCENTRATION_MODERATE",
        "LOW_HOLDING_COUNT",
        "HIGH_TURNOVER"
      ].includes(
        item?.code
      )
  );
}