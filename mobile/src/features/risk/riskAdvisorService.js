import {
  buildPortfolioConcentrationAnalysis
} from "./concentrationAnalysisService";

import {
  buildPortfolioDiversificationScore
} from "./diversificationScoreService";

import {
  buildPortfolioRiskMetrics
} from "./riskMetricsService";

import {
  buildPortfolioStressTests
} from "./stressTestingService";

import {
  getOrCreateRiskConfiguration
} from "./riskStore";

function number(value) {
  const parsed =
    Number(
      value ?? 0
    );

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

function formatMoney(value) {
  return number(
    value
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2
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
    value ||
    ""
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

function severityRank(value) {
  const ranks = {
    CRITICAL:
      5,

    HIGH:
      4,

    MEDIUM:
      3,

    WARNING:
      3,

    LOW:
      2,

    INFO:
      1,

    NONE:
      0
  };

  return number(
    ranks[
      String(
        value ||
        "NONE"
      ).toUpperCase()
    ]
  );
}

/*
 * ============================================================
 * SCORE: CONCENTRATION
 * ============================================================
 */

function calculateConcentrationScore(
  concentration
) {
  if (
    !concentration ||
    concentration?.status ===
      "NOT_READY"
  ) {
    return 0;
  }

  const breaches =
    number(
      concentration
        ?.summary
        ?.breached
    );

  const warnings =
    number(
      concentration
        ?.summary
        ?.warnings
    );

  const largestHoldingUsage =
    number(
      concentration
        ?.concentration
        ?.largestHolding
        ?.limit
        ?.usagePercentage
    );

  const topThreeUsage =
    number(
      concentration
        ?.concentration
        ?.topThreeLimit
        ?.usagePercentage
    );

  const largestSectorUsage =
    number(
      concentration
        ?.sectorConcentration
        ?.largestSector
        ?.limit
        ?.usagePercentage
    );

  let score =
    100;

  score -=
    breaches *
    20;

  score -=
    warnings *
    8;

  [
    largestHoldingUsage,
    topThreeUsage,
    largestSectorUsage
  ].forEach(
    (usage) => {
      if (
        usage > 100
      ) {
        score -= Math.min(
          (
            usage -
            100
          ) *
            0.4,
          20
        );
      }
    }
  );

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
 * SCORE: STRESS RESILIENCE
 * ============================================================
 */

function calculateStressScore(
  stressTests
) {
  if (
    !stressTests ||
    stressTests?.status ===
      "NOT_READY"
  ) {
    return 0;
  }

  const worstLossPercentage =
    number(
      stressTests
        ?.summary
        ?.largestLossPercentage
    );

  let score =
    100 -
    (
      worstLossPercentage *
      4
    );

  if (
    stressTests?.status ===
    "CRITICAL_EXPOSURE"
  ) {
    score -= 20;
  } else if (
    stressTests?.status ===
    "HIGH_EXPOSURE"
  ) {
    score -= 10;
  } else if (
    stressTests?.status ===
    "MODERATE_EXPOSURE"
  ) {
    score -= 5;
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
 * SCORE: HISTORICAL RISK
 * ============================================================
 */

function calculateHistoricalRiskScore(
  metrics
) {
  if (
    !metrics ||
    metrics?.status ===
      "INSUFFICIENT_HISTORY"
  ) {
    return null;
  }

  return number(
    metrics
      ?.assessment
      ?.score
  );
}

/*
 * ============================================================
 * OVERALL SCORE
 * ============================================================
 */

function calculateOverallRiskScore({
  diversificationScore,
  concentrationScore,
  stressScore,
  historicalRiskScore
}) {
  const components = [
    {
      value:
        diversificationScore,

      weight:
        0.30
    },

    {
      value:
        concentrationScore,

      weight:
        0.30
    },

    {
      value:
        stressScore,

      weight:
        0.25
    }
  ];

  if (
    historicalRiskScore !==
    null
  ) {
    components.push({
      value:
        historicalRiskScore,

      weight:
        0.15
    });
  }

  const totalWeight =
    components.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.weight,
      0
    );

  const weightedScore =
    components.reduce(
      (
        sum,
        item
      ) =>
        sum +
        number(
          item.value
        ) *
        item.weight,
      0
    );

  return Math.round(
    clamp(
      weightedScore /
        Math.max(
          totalWeight,
          0.01
        ),
      0,
      100
    )
  );
}

function getRiskGrade(
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

      riskLevel:
        "LOW",

      description:
        "Portfolio risk is generally well controlled under the active policy."
    };
  }

  if (
    safeScore >= 70
  ) {
    return {
      code:
        "CONTROLLED",

      label:
        "Controlled",

      riskLevel:
        "MODERATE",

      description:
        "Portfolio risk is broadly controlled, with some exposures requiring monitoring."
    };
  }

  if (
    safeScore >= 50
  ) {
    return {
      code:
        "ELEVATED",

      label:
        "Elevated",

      riskLevel:
        "HIGH",

      description:
        "The portfolio contains meaningful concentration or stress exposure that should be reviewed."
    };
  }

  return {
    code:
      "HIGH_ATTENTION",

    label:
      "High Attention",

    riskLevel:
      "CRITICAL",

    description:
      "The portfolio has significant risk-limit breaches or modeled downside exposure."
  };
}

/*
 * ============================================================
 * PRIORITY ISSUE
 * ============================================================
 */

function buildPriorityIssue({
  concentration,
  metrics,
  stressTests
}) {
  const candidates = [];

  const concentrationAlerts =
    Array.isArray(
      concentration?.alerts
    )
      ? concentration.alerts
      : [];

  concentrationAlerts.forEach(
    (alert) => {
      candidates.push({
        source:
          "CONCENTRATION",

        severity:
          alert?.severity ||
          "INFO",

        code:
          alert?.type ||
          "CONCENTRATION_ALERT",

        title:
          alert?.label ||
          formatLabel(
            alert?.type
          ),

        message:
          alert?.message ||
          "A concentration threshold requires review.",

        data:
          alert
      });
    }
  );

  const metricAlerts =
    Array.isArray(
      metrics?.alerts
    )
      ? metrics.alerts
      : [];

  metricAlerts.forEach(
    (alert) => {
      candidates.push({
        source:
          "HISTORICAL_METRICS",

        severity:
          alert?.severity ||
          "INFO",

        code:
          alert?.type ||
          "RISK_METRIC_ALERT",

        title:
          alert?.title ||
          formatLabel(
            alert?.type
          ),

        message:
          alert?.message ||
          "A historical risk metric requires review.",

        data:
          alert
      });
    }
  );

  const worstScenario =
    stressTests
      ?.summary
      ?.worstScenario ||
    null;

  if (
    worstScenario
  ) {
    candidates.push({
      source:
        "STRESS_TEST",

      severity:
        worstScenario
          ?.severity ||
        "LOW",

      code:
        worstScenario
          ?.code ||
        "WORST_STRESS_SCENARIO",

      title:
        worstScenario
          ?.label ||
        "Worst stress scenario",

      message:
        `The modeled loss is KES ${formatMoney(
          worstScenario
            ?.lossAmount
        )}, equal to ${formatPercent(
          worstScenario
            ?.lossPercentage
        )} of portfolio value.`,

      data:
        worstScenario
    });
  }

  const sorted =
    candidates.sort(
      (
        first,
        second
      ) =>
        severityRank(
          second?.severity
        ) -
        severityRank(
          first?.severity
        )
    );

  const highest =
    sorted[0] ||
    null;

  if (
    !highest
  ) {
    return {
      available:
        false,

      severity:
        "NONE",

      title:
        "No material risk issue",

      message:
        "The available portfolio risk checks did not identify a material issue.",

      issue:
        null
    };
  }

  return {
    available:
      true,

    severity:
      highest.severity,

    title:
      highest.title,

    message:
      highest.message,

    source:
      highest.source,

    issue:
      highest
  };
}

/*
 * ============================================================
 * COACH G INSIGHTS
 * ============================================================
 */

function buildRiskInsights({
  configuration,
  concentration,
  diversification,
  metrics,
  stressTests
}) {
  const insights = [];

  const limits =
    configuration
      ?.limits ||
    {};

  const largestHolding =
    concentration
      ?.concentration
      ?.largestHolding ||
    null;

  const largestHoldingPercentage =
    number(
      concentration
        ?.concentration
        ?.largestHoldingPercentage
    );

  if (
    largestHoldingPercentage >
    number(
      limits
        ?.maximumSingleHoldingPercentage
    )
  ) {
    insights.push({
      code:
        "SINGLE_HOLDING_LIMIT_BREACH",

      severity:
        "HIGH",

      title:
        `${largestHolding?.symbol || "Largest holding"} exceeds its limit`,

      message:
        `${largestHolding?.symbol || "The largest holding"} represents ${formatPercent(
          largestHoldingPercentage
        )}, above the active ${formatPercent(
          limits
            ?.maximumSingleHoldingPercentage
        )} single-holding limit.`
    });
  }

  const topThreePercentage =
    number(
      concentration
        ?.concentration
        ?.topThreePercentage
    );

  if (
    topThreePercentage >
    number(
      limits
        ?.maximumTopThreePercentage
    )
  ) {
    insights.push({
      code:
        "TOP_THREE_LIMIT_BREACH",

      severity:
        "HIGH",

      title:
        "Top-three concentration is above policy",

      message:
        `The three largest holdings represent ${formatPercent(
          topThreePercentage
        )}, above the configured ${formatPercent(
          limits
            ?.maximumTopThreePercentage
        )} maximum.`
    });
  }

  const largestSector =
    concentration
      ?.sectorConcentration
      ?.largestSector ||
    null;

  const largestSectorPercentage =
    number(
      concentration
        ?.sectorConcentration
        ?.largestSectorPercentage
    );

  if (
    largestSectorPercentage >
    number(
      limits
        ?.maximumSectorPercentage
    )
  ) {
    insights.push({
      code:
        "SECTOR_LIMIT_BREACH",

      severity:
        "HIGH",

      title:
        `${largestSector?.sector || "Largest sector"} exceeds its limit`,

      message:
        `${largestSector?.sector || "The largest sector"} represents ${formatPercent(
          largestSectorPercentage
        )}, above the configured ${formatPercent(
          limits
            ?.maximumSectorPercentage
        )} maximum.`
    });
  }

  if (
    number(
      concentration
        ?.portfolio
        ?.holdingsCount
    ) <
    number(
      limits
        ?.minimumHoldingsCount
    )
  ) {
    insights.push({
      code:
        "HOLDING_COUNT_BELOW_MINIMUM",

      severity:
        "MEDIUM",

      title:
        "Holding count is below policy",

      message:
        `The portfolio has ${number(
          concentration
            ?.portfolio
            ?.holdingsCount
        )} holdings, below the configured minimum of ${number(
          limits
            ?.minimumHoldingsCount
        )}.`
    });
  }

  if (
    diversification?.score <
    70
  ) {
    insights.push({
      code:
        "DIVERSIFICATION_REVIEW",

      severity:
        diversification?.score <
          50
          ? "HIGH"
          : "MEDIUM",

      title:
        "Diversification should be reviewed",

      message:
        `The diversification score is ${number(
          diversification?.score
        )}/100, rated ${diversification?.grade?.label || "Not available"}.`
    });
  }

  if (
    metrics?.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    insights.push({
      code:
        "INSUFFICIENT_RISK_HISTORY",

      severity:
        "INFO",

      title:
        "Historical risk evidence is limited",

      message:
        `Only ${number(
          metrics
            ?.history
            ?.returnObservations
        )} return observation(s) are available. Volatility, Sharpe ratio, drawdown, and VaR should not yet be treated as reliable.`
    });
  } else if (
    metrics?.status ===
    "PRELIMINARY"
  ) {
    insights.push({
      code:
        "PRELIMINARY_RISK_METRICS",

      severity:
        "INFO",

      title:
        "Historical metrics are preliminary",

      message:
        "Historical risk metrics are available but have not yet reached the minimum reliable observation count."
    });
  }

  const worstScenario =
    stressTests
      ?.summary
      ?.worstScenario ||
    null;

  if (
    worstScenario &&
    number(
      worstScenario
        ?.lossPercentage
    ) >=
      10
  ) {
    insights.push({
      code:
        "HIGH_STRESS_LOSS",

      severity:
        number(
          worstScenario
            ?.lossPercentage
        ) >=
          20
          ? "CRITICAL"
          : "HIGH",

      title:
        "Material modeled downside",

      message:
        `${worstScenario.label} produces an estimated loss of KES ${formatMoney(
          worstScenario.lossAmount
        )}, or ${formatPercent(
          worstScenario.lossPercentage
        )}.`
    });
  }

  return insights.sort(
    (
      first,
      second
    ) =>
      severityRank(
        second?.severity
      ) -
      severityRank(
        first?.severity
      )
  );
}

/*
 * ============================================================
 * NEXT STEPS
 * ============================================================
 */

function buildRecommendedActions({
  concentration,
  diversification,
  metrics,
  stressTests
}) {
  const actions = [];

  const concentrationBreaches =
    Array.isArray(
      concentration?.alerts
    )
      ? concentration.alerts.filter(
          (item) =>
            item?.status ===
            "BREACHED"
        )
      : [];

  concentrationBreaches.forEach(
    (breach) => {
      if (
        breach?.type ===
        "SINGLE_HOLDING_CONCENTRATION"
      ) {
        actions.push({
          code:
            `REVIEW_HOLDING_${breach.symbol}`,

          priority:
            "HIGH",

          title:
            `Review ${breach.symbol} concentration`,

          message:
            `Consider reducing the position or increasing other holdings until ${breach.symbol} returns within the configured single-holding limit.`,

          advisoryOnly:
            true
        });
      }

      if (
        breach?.type ===
        "SECTOR_CONCENTRATION"
      ) {
        actions.push({
          code:
            `REVIEW_SECTOR_${String(
              breach.sector ||
              ""
            )
              .trim()
              .toUpperCase()
              .replaceAll(
                " ",
                "_"
              )}`,

          priority:
            "HIGH",

          title:
            `Review ${breach.sector} sector exposure`,

          message:
            "Consider adding exposure outside the dominant sector or reducing existing positions in that sector.",

          advisoryOnly:
            true
        });
      }

      if (
        breach?.type ===
        "TOP_THREE_CONCENTRATION"
      ) {
        actions.push({
          code:
            "REDUCE_TOP_THREE_CONCENTRATION",

          priority:
            "HIGH",

          title:
            "Reduce dependence on the three largest holdings",

          message:
            "Consider spreading future contributions across smaller holdings or additional sectors.",

          advisoryOnly:
            true
        });
      }
    }
  );

  const diversificationActions =
    Array.isArray(
      diversification
        ?.improvementActions
    )
      ? diversification
          .improvementActions
      : [];

  diversificationActions.forEach(
    (action) => {
      actions.push({
        ...action,

        advisoryOnly:
          true
      });
    }
  );

  if (
    metrics?.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    actions.push({
      code:
        "BUILD_VALUATION_HISTORY",

      priority:
        "LOW",

      title:
        "Build portfolio valuation history",

      message:
        "Continue recording genuine daily or periodic portfolio valuations so volatility, drawdown, Sharpe ratio, and VaR become reliable.",

      advisoryOnly:
        true
    });
  }

  const worstScenario =
    stressTests
      ?.summary
      ?.worstScenario ||
    null;

  if (
    worstScenario &&
    number(
      worstScenario
        ?.lossPercentage
    ) >=
      10
  ) {
    actions.push({
      code:
        "REVIEW_STRESS_RESILIENCE",

      priority:
        "HIGH",

      title:
        "Review downside capacity",

      message:
        `Confirm that an estimated ${formatPercent(
          worstScenario.lossPercentage
        )} portfolio decline remains acceptable for the investor's goals and liquidity needs.`,

      advisoryOnly:
        true
    });
  }

  const unique =
    new Map();

  actions.forEach(
    (action) => {
      if (
        !action?.code
      ) {
        return;
      }

      if (
        !unique.has(
          action.code
        )
      ) {
        unique.set(
          action.code,
          action
        );
      }
    }
  );

  return Array.from(
    unique.values()
  ).sort(
    (
      first,
      second
    ) =>
      severityRank(
        second?.priority
      ) -
      severityRank(
        first?.priority
      )
  );
}

/*
 * ============================================================
 * SUMMARY
 * ============================================================
 */

function buildAdvisorSummary({
  overallScore,
  grade,
  configuration,
  concentration,
  diversification,
  metrics,
  stressTests,
  priorityIssue
}) {
  const parts = [];

  parts.push(
    `The portfolio risk score is ${overallScore}/100, rated ${grade.label}.`
  );

  parts.push(
    `The active policy is ${configuration?.profileLabel || "not configured"}.`
  );

  if (
    concentration?.status ===
    "LIMIT_BREACH"
  ) {
    parts.push(
      `${number(
        concentration
          ?.summary
          ?.breached
      )} concentration limit breach(es) require review.`
    );
  } else if (
    concentration?.status ===
    "WARNING"
  ) {
    parts.push(
      `${number(
        concentration
          ?.summary
          ?.warnings
      )} concentration warning(s) are approaching policy limits.`
    );
  } else {
    parts.push(
      "Concentration is within the active policy limits."
    );
  }

  parts.push(
    `Diversification is rated ${diversification?.grade?.label || "not available"} at ${number(
      diversification?.score
    )}/100.`
  );

  if (
    metrics?.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    parts.push(
      "Historical volatility, drawdown, Sharpe ratio, and VaR are not yet reliable because the portfolio has insufficient valuation history."
    );
  } else {
    parts.push(
      `Historical risk metrics are ${formatLabel(
        metrics?.status
      )}.`
    );
  }

  const worstScenario =
    stressTests
      ?.summary
      ?.worstScenario ||
    null;

  if (
    worstScenario
  ) {
    parts.push(
      `The worst modeled scenario is ${worstScenario.label}, with an estimated loss of KES ${formatMoney(
        worstScenario.lossAmount
      )} or ${formatPercent(
        worstScenario.lossPercentage
      )}.`
    );
  }

  if (
    priorityIssue?.available
  ) {
    parts.push(
      `Highest-priority issue: ${priorityIssue.message}`
    );
  }

  return parts
    .filter(Boolean)
    .join(" ");
}

/*
 * ============================================================
 * PC-020F
 * COACH G PORTFOLIO RISK ADVISOR
 * ============================================================
 *
 * This service combines:
 *
 * - active risk configuration,
 * - concentration analysis,
 * - diversification score,
 * - historical risk metrics,
 * - stress-test scenarios.
 *
 * It produces advisory guidance only.
 */

export async function buildCoachGRiskAdvice() {
  const [
    configuration,
    concentration,
    diversification,
    metrics,
    stressTests
  ] = await Promise.all([
    getOrCreateRiskConfiguration(),

    buildPortfolioConcentrationAnalysis(),

    buildPortfolioDiversificationScore(),

    buildPortfolioRiskMetrics(),

    buildPortfolioStressTests()
  ]);

  const diversificationScore =
    number(
      diversification
        ?.score
    );

  const concentrationScore =
    calculateConcentrationScore(
      concentration
    );

  const stressScore =
    calculateStressScore(
      stressTests
    );

  const historicalRiskScore =
    calculateHistoricalRiskScore(
      metrics
    );

  const overallScore =
    calculateOverallRiskScore({
      diversificationScore,
      concentrationScore,
      stressScore,
      historicalRiskScore
    });

  const grade =
    getRiskGrade(
      overallScore
    );

  const priorityIssue =
    buildPriorityIssue({
      concentration,
      metrics,
      stressTests
    });

  const insights =
    buildRiskInsights({
      configuration,
      concentration,
      diversification,
      metrics,
      stressTests
    });

  const recommendedActions =
    buildRecommendedActions({
      concentration,
      diversification,
      metrics,
      stressTests
    });

  const summary =
    buildAdvisorSummary({
      overallScore,
      grade,
      configuration,
      concentration,
      diversification,
      metrics,
      stressTests,
      priorityIssue
    });

  const criticalIssues =
    insights.filter(
      (item) =>
        item?.severity ===
        "CRITICAL"
    ).length;

  const highIssues =
    insights.filter(
      (item) =>
        item?.severity ===
        "HIGH"
    ).length;

  let status;

  if (
    criticalIssues > 0
  ) {
    status =
      "CRITICAL_REVIEW";
  } else if (
    highIssues > 0 ||
    concentration?.status ===
      "LIMIT_BREACH"
  ) {
    status =
      "ACTION_REQUIRED";
  } else if (
    insights.some(
      (item) =>
        item?.severity ===
        "MEDIUM"
    )
  ) {
    status =
      "MONITOR";
  } else {
    status =
      "CONTROLLED";
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    profile: {
      profileType:
        configuration
          ?.profileType ||
        null,

      profileLabel:
        configuration
          ?.profileLabel ||
        null,

      status:
        configuration
          ?.status ||
        null,

      limits:
        configuration
          ?.limits ||
        {}
    },

    health: {
      overallScore,

      grade,

      components: {
        diversification:
          diversificationScore,

        concentration:
          concentrationScore,

        stressResilience:
          stressScore,

        historicalRisk:
          historicalRiskScore
      }
    },

    portfolio: {
      totalValue:
        roundMoney(
          concentration
            ?.portfolio
            ?.totalValue
        ),

      holdingsValue:
        roundMoney(
          concentration
            ?.portfolio
            ?.holdingsValue
        ),

      availableCash:
        roundMoney(
          concentration
            ?.portfolio
            ?.availableCash
        ),

      holdingsCount:
        number(
          concentration
            ?.portfolio
            ?.holdingsCount
        ),

      sectorCount:
        number(
          concentration
            ?.portfolio
            ?.sectorCount
        )
    },

    concentration: {
      status:
        concentration
          ?.status ||
        null,

      breached:
        number(
          concentration
            ?.summary
            ?.breached
        ),

      warnings:
        number(
          concentration
            ?.summary
            ?.warnings
        ),

      largestHolding:
        concentration
          ?.concentration
          ?.largestHolding ||
        null,

      largestHoldingPercentage:
        roundPercent(
          concentration
            ?.concentration
            ?.largestHoldingPercentage
        ),

      topThreePercentage:
        roundPercent(
          concentration
            ?.concentration
            ?.topThreePercentage
        ),

      largestSector:
        concentration
          ?.sectorConcentration
          ?.largestSector ||
        null,

      largestSectorPercentage:
        roundPercent(
          concentration
            ?.sectorConcentration
            ?.largestSectorPercentage
        )
    },

    diversification: {
      score:
        diversificationScore,

      grade:
        diversification
          ?.grade ||
        null,

      effectiveHoldings:
        number(
          diversification
            ?.metrics
            ?.effectiveHoldings
        ),

      effectiveSectors:
        number(
          diversification
            ?.metrics
            ?.effectiveSectors
        )
    },

    historicalRisk: {
      status:
        metrics
          ?.status ||
        null,

      historyStatus:
        metrics
          ?.history
          ?.status ||
        null,

      returnObservations:
        number(
          metrics
            ?.history
            ?.returnObservations
        ),

      annualizedVolatilityPercentage:
        metrics
          ?.volatility
          ?.annualizedVolatilityPercentage ??
        null,

      maximumDrawdownPercentage:
        metrics
          ?.drawdown
          ?.maximumDrawdownPercentage ??
        null,

      sharpeRatio:
        metrics
          ?.ratios
          ?.sharpeRatio ??
        null,

      valueAtRiskPercentage:
        metrics
          ?.valueAtRisk
          ?.valueAtRiskPercentage ??
        null
    },

    stress: {
      status:
        stressTests
          ?.status ||
        null,

      totalScenarios:
        number(
          stressTests
            ?.summary
            ?.totalScenarios
        ),

      worstScenario:
        stressTests
          ?.summary
          ?.worstScenario ||
        null,

      largestLossAmount:
        roundMoney(
          stressTests
            ?.summary
            ?.largestLossAmount
        ),

      largestLossPercentage:
        roundPercent(
          stressTests
            ?.summary
            ?.largestLossPercentage
        )
    },

    priorityIssue,

    insights,

    recommendedActions,

    summary,

    sources: {
      configuration,
      concentration,
      diversification,
      metrics,
      stressTests
    }
  };
}

/*
 * ============================================================
 * COMPACT SUMMARY
 * ============================================================
 */

export async function buildCoachGRiskSummary() {
  const advice =
    await buildCoachGRiskAdvice();

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

    riskLevel:
      advice
        ?.health
        ?.grade
        ?.riskLevel ||
      "UNKNOWN",

    profile:
      advice
        ?.profile
        ?.profileLabel ||
      "Not configured",

    concentrationStatus:
      advice
        ?.concentration
        ?.status ||
      "UNKNOWN",

    diversificationScore:
      advice
        ?.diversification
        ?.score ||
      0,

    stressStatus:
      advice
        ?.stress
        ?.status ||
      "UNKNOWN",

    priorityIssue:
      advice
        ?.priorityIssue
        ?.title ||
      "No material issue",

    summary:
      advice.summary
  };
}

/*
 * ============================================================
 * FILTERS
 * ============================================================
 */

export async function loadHighPriorityRiskInsights() {
  const advice =
    await buildCoachGRiskAdvice();

  return advice.insights.filter(
    (item) =>
      [
        "HIGH",
        "CRITICAL"
      ].includes(
        item?.severity
      )
  );
}

export async function loadCoachGRiskActions() {
  const advice =
    await buildCoachGRiskAdvice();

  return advice.recommendedActions;
}