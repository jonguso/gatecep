import {
  buildPortfolioPerformanceAnalysis
} from "./portfolioPerformanceService";

import {
  buildPortfolioBenchmarkComparison,
  DEFAULT_BENCHMARK_CODE
} from "./benchmarkComparisonService";

import {
  buildPortfolioPerformanceAttribution
} from "./performanceAttributionService";

import {
  buildPortfolioPerformanceCharts
} from "./performanceChartService";

/*
 * ============================================================
 * GENERAL HELPERS
 * ============================================================
 */

function number(value) {
  const parsed =
    Number(
      value ?? 0
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function nullableNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
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
  const parsed =
    nullableNumber(
      value
    );

  if (
    parsed === null
  ) {
    return "not available";
  }

  return `${roundPercent(
    parsed
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

function priorityRank(value) {
  const ranks = {
    CRITICAL:
      5,

    HIGH:
      4,

    MEDIUM:
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
 * PERFORMANCE SCORE
 * ============================================================
 */

function calculateReturnScore(
  performance
) {
  const returnPercentage =
    nullableNumber(
      performance
        ?.returns
        ?.timeWeightedReturnPercentage
    ) ??
    nullableNumber(
      performance
        ?.sinceInception
        ?.returnPercentage
    );

  if (
    returnPercentage ===
    null
  ) {
    return null;
  }

  if (
    returnPercentage >= 20
  ) {
    return 100;
  }

  if (
    returnPercentage >= 12
  ) {
    return 90;
  }

  if (
    returnPercentage >= 8
  ) {
    return 80;
  }

  if (
    returnPercentage >= 4
  ) {
    return 70;
  }

  if (
    returnPercentage >= 0
  ) {
    return 60;
  }

  if (
    returnPercentage >= -5
  ) {
    return 40;
  }

  if (
    returnPercentage >= -10
  ) {
    return 25;
  }

  return 10;
}

function calculateConsistencyScore(
  performance
) {
  const winningPercentage =
    nullableNumber(
      performance
        ?.consistency
        ?.winningPercentage
    );

  if (
    winningPercentage ===
    null
  ) {
    return null;
  }

  return Math.round(
    clamp(
      winningPercentage,
      0,
      100
    )
  );
}

function calculateBenchmarkScore(
  benchmark
) {
  if (
    !benchmark ||
    benchmark?.status ===
      "BENCHMARK_NOT_AVAILABLE"
  ) {
    return null;
  }

  const activeReturn =
    nullableNumber(
      benchmark
        ?.returns
        ?.activeReturnPercentage
    );

  if (
    activeReturn ===
    null
  ) {
    return null;
  }

  if (
    activeReturn >= 10
  ) {
    return 100;
  }

  if (
    activeReturn >= 5
  ) {
    return 90;
  }

  if (
    activeReturn >= 2
  ) {
    return 80;
  }

  if (
    activeReturn >= 0
  ) {
    return 70;
  }

  if (
    activeReturn >= -2
  ) {
    return 55;
  }

  if (
    activeReturn >= -5
  ) {
    return 40;
  }

  return 20;
}

function calculateAttributionScore(
  attribution
) {
  if (
    !attribution ||
    attribution?.status ===
      "NOT_READY"
  ) {
    return null;
  }

  const positiveHoldings =
    number(
      attribution
        ?.contributors
        ?.positiveHoldings
    );

  const negativeHoldings =
    number(
      attribution
        ?.contributors
        ?.negativeHoldings
    );

  const flatHoldings =
    number(
      attribution
        ?.contributors
        ?.flatHoldings
    );

  const total =
    positiveHoldings +
    negativeHoldings +
    flatHoldings;

  if (
    total <= 0
  ) {
    return null;
  }

  const positiveRatio =
    positiveHoldings /
    total;

  const totalReturn =
    nullableNumber(
      attribution
        ?.portfolio
        ?.returnPercentage
    );

  let score =
    positiveRatio *
    100;

  if (
    totalReturn !==
      null
  ) {
    if (
      totalReturn > 0
    ) {
      score += 10;
    } else if (
      totalReturn < 0
    ) {
      score -= 15;
    }
  }

  return Math.round(
    clamp(
      score,
      0,
      100
    )
  );
}

function calculateTrendScore(
  charts
) {
  if (
    !charts ||
    charts?.status ===
      "INSUFFICIENT_HISTORY"
  ) {
    return null;
  }

  const growthEndingValue =
    nullableNumber(
      charts
        ?.summary
        ?.portfolioGrowthEndingValue
    );

  const currentDrawdown =
    nullableNumber(
      charts
        ?.summary
        ?.currentDrawdownPercentage
    );

  const maximumDrawdown =
    nullableNumber(
      charts
        ?.summary
        ?.maximumDrawdownPercentage
    );

  let score =
    70;

  if (
    growthEndingValue !==
    null
  ) {
    if (
      growthEndingValue >= 120
    ) {
      score += 25;
    } else if (
      growthEndingValue >= 110
    ) {
      score += 18;
    } else if (
      growthEndingValue >= 100
    ) {
      score += 10;
    } else if (
      growthEndingValue < 95
    ) {
      score -= 20;
    } else {
      score -= 10;
    }
  }

  if (
    currentDrawdown !==
    null
  ) {
    const drawdown =
      Math.abs(
        currentDrawdown
      );

    if (
      drawdown >= 20
    ) {
      score -= 30;
    } else if (
      drawdown >= 10
    ) {
      score -= 20;
    } else if (
      drawdown >= 5
    ) {
      score -= 10;
    }
  }

  if (
    maximumDrawdown !==
    null &&
    Math.abs(
      maximumDrawdown
    ) >= 25
  ) {
    score -= 15;
  }

  return Math.round(
    clamp(
      score,
      0,
      100
    )
  );
}

function calculateOverallScore({
  returnScore,
  consistencyScore,
  benchmarkScore,
  attributionScore,
  trendScore
}) {
  const components = [
    {
      value:
        returnScore,

      weight:
        0.3
    },

    {
      value:
        consistencyScore,

      weight:
        0.2
    },

    {
      value:
        benchmarkScore,

      weight:
        0.2
    },

    {
      value:
        attributionScore,

      weight:
        0.15
    },

    {
      value:
        trendScore,

      weight:
        0.15
    }
  ].filter(
    (item) =>
      item.value !==
        null &&
      item.value !==
        undefined
  );

  if (
    !components.length
  ) {
    return 0;
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

function getPerformanceGrade(
  score
) {
  const safeScore =
    number(
      score
    );

  if (
    safeScore >= 90
  ) {
    return {
      code:
        "EXCELLENT",

      label:
        "Excellent",

      performanceLevel:
        "OUTSTANDING",

      description:
        "Portfolio performance is strong across return, consistency, contribution, and available benchmark measures."
    };
  }

  if (
    safeScore >= 80
  ) {
    return {
      code:
        "STRONG",

      label:
        "Strong",

      performanceLevel:
        "ABOVE_EXPECTATIONS",

      description:
        "Portfolio performance is healthy, with only limited areas requiring review."
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

      performanceLevel:
        "ON_TRACK",

      description:
        "Portfolio performance is generally on track but can be improved through contributor and benchmark review."
    };
  }

  if (
    safeScore >= 50
  ) {
    return {
      code:
        "MIXED",

      label:
        "Mixed",

      performanceLevel:
        "REVIEW_REQUIRED",

      description:
        "Performance results are mixed, with material underperformance or contribution weaknesses."
    };
  }

  return {
    code:
      "WEAK",

    label:
      "Weak",

    performanceLevel:
      "ACTION_REQUIRED",

    description:
      "Portfolio performance requires significant review before it can be considered on track."
  };
}

/*
 * ============================================================
 * PRIORITY ISSUE
 * ============================================================
 */

function buildPriorityIssue({
  performance,
  benchmark,
  attribution,
  charts
}) {
  const candidates = [];

  if (
    performance?.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    candidates.push({
      source:
        "PERFORMANCE_HISTORY",

      severity:
        "INFO",

      code:
        "INSUFFICIENT_PERFORMANCE_HISTORY",

      title:
        "More valuation history is required",

      message:
        performance?.message ||
        "Additional portfolio valuation observations are required."
    });
  }

  const totalGainLoss =
    nullableNumber(
      performance
        ?.portfolio
        ?.totalGainLoss
    );

  if (
    totalGainLoss !==
      null &&
    totalGainLoss < 0
  ) {
    candidates.push({
      source:
        "PORTFOLIO_RETURN",

      severity:
        "HIGH",

      code:
        "NEGATIVE_TOTAL_GAIN_LOSS",

      title:
        "Portfolio has a negative total return",

      message:
        `The portfolio has an estimated total loss of KES ${formatMoney(
          Math.abs(
            totalGainLoss
          )
        )}.`
    });
  }

  if (
    benchmark?.status ===
    "UNDERPERFORMING"
  ) {
    candidates.push({
      source:
        "BENCHMARK",

      severity:
        "HIGH",

      code:
        "BENCHMARK_UNDERPERFORMANCE",

      title:
        "Portfolio is underperforming its benchmark",

      message:
        `Active return is ${formatPercent(
          benchmark
            ?.returns
            ?.activeReturnPercentage
        )} against ${benchmark
          ?.benchmark
          ?.label ||
        "the selected benchmark"}.`
    });
  }

  const worstHolding =
    attribution
      ?.contributors
      ?.worstHoldingContributor ||
    null;

  if (
    worstHolding &&
    number(
      worstHolding.gainLoss
    ) < 0
  ) {
    candidates.push({
      source:
        "ATTRIBUTION",

      severity:
        "MEDIUM",

      code:
        `WORST_CONTRIBUTOR_${worstHolding.symbol}`,

      title:
        `${worstHolding.symbol} is the largest negative contributor`,

      message:
        `${worstHolding.symbol} has contributed an estimated loss of KES ${formatMoney(
          Math.abs(
            worstHolding.gainLoss
          )
        )}.`
    });
  }

  const currentDrawdown =
    nullableNumber(
      charts
        ?.summary
        ?.currentDrawdownPercentage
    );

  if (
    currentDrawdown !==
      null &&
    Math.abs(
      currentDrawdown
    ) >= 10
  ) {
    candidates.push({
      source:
        "TREND",

      severity:
        Math.abs(
          currentDrawdown
        ) >= 20
          ? "HIGH"
          : "MEDIUM",

      code:
        "CURRENT_DRAWDOWN",

      title:
        "Portfolio is below its recent peak",

      message:
        `Current drawdown is ${formatPercent(
          currentDrawdown
        )}.`
    });
  }

  const sorted =
    candidates.sort(
      (
        first,
        second
      ) =>
        priorityRank(
          second?.severity
        ) -
        priorityRank(
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
        "No material performance issue",

      message:
        "The available performance checks did not identify a material issue.",

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
 * PERFORMANCE INSIGHTS
 * ============================================================
 */

function buildInsights({
  performance,
  benchmark,
  attribution,
  charts
}) {
  const insights = [];

  const twr =
    nullableNumber(
      performance
        ?.returns
        ?.timeWeightedReturnPercentage
    );

  if (
    twr !==
    null
  ) {
    insights.push({
      code:
        twr >= 0
          ? "POSITIVE_TIME_WEIGHTED_RETURN"
          : "NEGATIVE_TIME_WEIGHTED_RETURN",

      severity:
        twr >= 0
          ? "LOW"
          : "HIGH",

      title:
        twr >= 0
          ? "Portfolio produced a positive time-weighted return"
          : "Portfolio produced a negative time-weighted return",

      message:
        `Time-weighted return is ${formatPercent(
          twr
        )}.`
    });
  }

  const moneyWeightedReturn =
    nullableNumber(
      performance
        ?.returns
        ?.moneyWeightedReturnPercentage
    );

  if (
    moneyWeightedReturn !==
    null
  ) {
    insights.push({
      code:
        "MONEY_WEIGHTED_RETURN",

      severity:
        moneyWeightedReturn >= 0
          ? "LOW"
          : "MEDIUM",

      title:
        "Investor cash-flow return is available",

      message:
        `Money-weighted return is ${formatPercent(
          moneyWeightedReturn
        )}.`
    });
  }

  const winningPercentage =
    nullableNumber(
      performance
        ?.consistency
        ?.winningPercentage
    );

  if (
    winningPercentage !==
    null
  ) {
    insights.push({
      code:
        "PERFORMANCE_CONSISTENCY",

      severity:
        winningPercentage >= 60
          ? "LOW"
          : winningPercentage >= 40
          ? "MEDIUM"
          : "HIGH",

      title:
        "Return consistency",

      message:
        `${formatPercent(
          winningPercentage
        )} of measured periods produced positive returns.`
    });
  }

  if (
    benchmark?.status ===
    "BENCHMARK_NOT_AVAILABLE"
  ) {
    insights.push({
      code:
        "BENCHMARK_DATA_NOT_AVAILABLE",

      severity:
        "INFO",

      title:
        "Benchmark comparison is unavailable",

      message:
        "Genuine NSE benchmark history has not yet been configured, so alpha, beta, tracking error, and information ratio cannot be assessed."
    });
  } else {
    const activeReturn =
      nullableNumber(
        benchmark
          ?.returns
          ?.activeReturnPercentage
      );

    if (
      activeReturn !==
      null
    ) {
      insights.push({
        code:
          activeReturn >= 0
            ? "BENCHMARK_OUTPERFORMANCE"
            : "BENCHMARK_UNDERPERFORMANCE",

        severity:
          activeReturn >= 0
            ? "LOW"
            : "HIGH",

        title:
          activeReturn >= 0
            ? "Portfolio is ahead of the benchmark"
            : "Portfolio is behind the benchmark",

        message:
          `Active return is ${formatPercent(
            activeReturn
          )} against ${benchmark
            ?.benchmark
            ?.label ||
          "the selected benchmark"}.`
      });
    }
  }

  const topHolding =
    attribution
      ?.contributors
      ?.topHoldingContributor ||
    null;

  if (
    topHolding
  ) {
    insights.push({
      code:
        `TOP_CONTRIBUTOR_${topHolding.symbol}`,

      severity:
        "LOW",

      title:
        `${topHolding.symbol} is the strongest contributor`,

      message:
        `${topHolding.symbol} has contributed an estimated gain of KES ${formatMoney(
          topHolding.gainLoss
        )}.`
    });
  }

  const worstHolding =
    attribution
      ?.contributors
      ?.worstHoldingContributor ||
    null;

  if (
    worstHolding
  ) {
    insights.push({
      code:
        `WORST_CONTRIBUTOR_${worstHolding.symbol}`,

      severity:
        "MEDIUM",

      title:
        `${worstHolding.symbol} is the weakest contributor`,

      message:
        `${worstHolding.symbol} has contributed an estimated loss of KES ${formatMoney(
          Math.abs(
            worstHolding.gainLoss
          )
        )}.`
    });
  }

  if (
    attribution
      ?.brinsonAttribution
      ?.status ===
    "BENCHMARK_SECTOR_DATA_NOT_AVAILABLE"
  ) {
    insights.push({
      code:
        "BRINSON_DATA_NOT_AVAILABLE",

      severity:
        "INFO",

      title:
        "Allocation and selection attribution are unavailable",

      message:
        "Genuine benchmark sector weights and returns are required before allocation, selection, and interaction effects can be calculated."
    });
  }

  const maximumDrawdown =
    nullableNumber(
      charts
        ?.summary
        ?.maximumDrawdownPercentage
    );

  if (
    maximumDrawdown !==
    null
  ) {
    insights.push({
      code:
        "MAXIMUM_DRAWDOWN",

      severity:
        Math.abs(
          maximumDrawdown
        ) >= 20
          ? "HIGH"
          : Math.abs(
              maximumDrawdown
            ) >= 10
          ? "MEDIUM"
          : "LOW",

      title:
        "Maximum observed drawdown",

      message:
        `Maximum observed drawdown is ${formatPercent(
          maximumDrawdown
        )}.`
    });
  }

  if (
    performance?.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    insights.push({
      code:
        "LIMITED_PERFORMANCE_HISTORY",

      severity:
        "INFO",

      title:
        "Performance evidence remains limited",

      message:
        `Only ${number(
          performance
            ?.history
            ?.returnObservations
        )} return observation(s) are available. Long-term performance conclusions should be treated cautiously.`
    });
  }

  return insights.sort(
    (
      first,
      second
    ) =>
      priorityRank(
        second?.severity
      ) -
      priorityRank(
        first?.severity
      )
  );
}

/*
 * ============================================================
 * RECOMMENDED ACTIONS
 * ============================================================
 */

function buildRecommendedActions({
  performance,
  benchmark,
  attribution,
  charts
}) {
  const actions = [];

  if (
    performance?.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    actions.push({
      code:
        "BUILD_PERFORMANCE_HISTORY",

      priority:
        "LOW",

      title:
        "Continue recording portfolio valuations",

      message:
        "Record genuine portfolio valuations consistently so time-weighted return, rolling returns, volatility, and drawdown analysis become reliable.",

      advisoryOnly:
        true
    });
  }

  if (
    benchmark?.status ===
    "BENCHMARK_NOT_AVAILABLE"
  ) {
    actions.push({
      code:
        "CONFIGURE_NSE_BENCHMARK",

      priority:
        "MEDIUM",

      title:
        "Configure genuine NSE benchmark history",

      message:
        "Add dated NSE All Share, NSE 20, or NSE 25 return history to enable relative return, alpha, beta, tracking error, and information ratio.",

      advisoryOnly:
        true
    });
  } else if (
    benchmark?.status ===
    "UNDERPERFORMING"
  ) {
    actions.push({
      code:
        "REVIEW_BENCHMARK_UNDERPERFORMANCE",

      priority:
        "HIGH",

      title:
        "Review benchmark underperformance",

      message:
        "Identify whether underperformance is caused by allocation choices, weak security selection, concentration, fees, or timing of contributions.",

      advisoryOnly:
        true
    });
  }

  const worstHolding =
    attribution
      ?.contributors
      ?.worstHoldingContributor ||
    null;

  if (
    worstHolding
  ) {
    actions.push({
      code:
        `REVIEW_${worstHolding.symbol}`,

      priority:
        "MEDIUM",

      title:
        `Review ${worstHolding.symbol}`,

      message:
        `Confirm whether the investment thesis for ${worstHolding.symbol} remains valid after an estimated loss contribution of KES ${formatMoney(
          Math.abs(
            worstHolding.gainLoss
          )
        )}.`,

      advisoryOnly:
        true
    });
  }

  const negativeHoldings =
    number(
      attribution
        ?.contributors
        ?.negativeHoldings
    );

  const holdingsCount =
    number(
      attribution
        ?.portfolio
        ?.holdingsCount
    );

  if (
    holdingsCount > 0 &&
    negativeHoldings /
      holdingsCount >
      0.5
  ) {
    actions.push({
      code:
        "REVIEW_BROAD_UNDERPERFORMANCE",

      priority:
        "HIGH",

      title:
        "Review broad holding underperformance",

      message:
        "More than half of the portfolio holdings are negative contributors. Review security selection and portfolio construction.",

      advisoryOnly:
        true
    });
  }

  const currentDrawdown =
    nullableNumber(
      charts
        ?.summary
        ?.currentDrawdownPercentage
    );

  if (
    currentDrawdown !==
      null &&
    Math.abs(
      currentDrawdown
    ) >= 10
  ) {
    actions.push({
      code:
        "REVIEW_CURRENT_DRAWDOWN",

      priority:
        "HIGH",

      title:
        "Review the current drawdown",

      message:
        `The portfolio is approximately ${formatPercent(
          Math.abs(
            currentDrawdown
          )
        )} below its recent peak. Confirm that the decline remains consistent with the investor's risk tolerance and time horizon.`,

      advisoryOnly:
        true
    });
  }

  if (
    attribution
      ?.brinsonAttribution
      ?.status ===
    "BENCHMARK_SECTOR_DATA_NOT_AVAILABLE"
  ) {
    actions.push({
      code:
        "CONFIGURE_BENCHMARK_SECTOR_DATA",

      priority:
        "LOW",

      title:
        "Add benchmark sector weights and returns",

      message:
        "Configure genuine benchmark sector data to calculate allocation, selection, interaction, and total active effects.",

      advisoryOnly:
        true
    });
  }

  const unique =
    new Map();

  actions.forEach(
    (action) => {
      if (
        action?.code &&
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
      priorityRank(
        second?.priority
      ) -
      priorityRank(
        first?.priority
      )
  );
}

/*
 * ============================================================
 * SUMMARY
 * ============================================================
 */

function buildSummary({
  overallScore,
  grade,
  performance,
  benchmark,
  attribution,
  charts,
  priorityIssue
}) {
  const parts = [];

  parts.push(
    `The portfolio performance score is ${overallScore}/100, rated ${grade.label}.`
  );

  const twr =
    nullableNumber(
      performance
        ?.returns
        ?.timeWeightedReturnPercentage
    );

  if (
    twr !==
    null
  ) {
    parts.push(
      `Time-weighted return is ${formatPercent(
        twr
      )}.`
    );
  } else {
    parts.push(
      "Time-weighted return is not yet available because valuation history is limited."
    );
  }

  const totalGainLoss =
    nullableNumber(
      performance
        ?.portfolio
        ?.totalGainLoss
    );

  if (
    totalGainLoss !==
    null
  ) {
    parts.push(
      `Estimated total gain or loss is KES ${formatMoney(
        totalGainLoss
      )}.`
    );
  }

  if (
    benchmark?.status ===
    "BENCHMARK_NOT_AVAILABLE"
  ) {
    parts.push(
      "Genuine benchmark history is not configured, so relative performance measures are unavailable."
    );
  } else {
    parts.push(
      `Relative performance against ${benchmark
        ?.benchmark
        ?.label ||
      "the selected benchmark"} is ${formatLabel(
        benchmark?.status
      )}.`
    );
  }

  const topHolding =
    attribution
      ?.contributors
      ?.topHoldingContributor ||
    null;

  if (
    topHolding
  ) {
    parts.push(
      `${topHolding.symbol} is the strongest holding contributor.`
    );
  }

  const worstHolding =
    attribution
      ?.contributors
      ?.worstHoldingContributor ||
    null;

  if (
    worstHolding
  ) {
    parts.push(
      `${worstHolding.symbol} is the weakest holding contributor.`
    );
  }

  const maximumDrawdown =
    nullableNumber(
      charts
        ?.summary
        ?.maximumDrawdownPercentage
    );

  if (
    maximumDrawdown !==
    null
  ) {
    parts.push(
      `Maximum observed drawdown is ${formatPercent(
        maximumDrawdown
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
 * PC-021E
 * COACH G PERFORMANCE ADVISOR
 * ============================================================
 */

export async function buildCoachGPerformanceAdvice({
  benchmarkCode =
    DEFAULT_BENCHMARK_CODE,

  benchmarkSeries =
    null,

  benchmarkSectorData =
    null,

  rollingWindows =
    [
      5,
      20,
      60
    ],

  annualizationFactor =
    252
} = {}) {
  const [
    performance,
    benchmark,
    attribution,
    charts
  ] = await Promise.all([
    buildPortfolioPerformanceAnalysis(),

    buildPortfolioBenchmarkComparison({
      benchmarkCode,
      benchmarkSeries,
      annualizationFactor
    }),

    buildPortfolioPerformanceAttribution({
      benchmarkCode,
      benchmarkSeries,
      benchmarkSectorData
    }),

    buildPortfolioPerformanceCharts({
      benchmarkCode,
      benchmarkSeries,
      rollingWindows,
      annualizationFactor
    })
  ]);

  const returnScore =
    calculateReturnScore(
      performance
    );

  const consistencyScore =
    calculateConsistencyScore(
      performance
    );

  const benchmarkScore =
    calculateBenchmarkScore(
      benchmark
    );

  const attributionScore =
    calculateAttributionScore(
      attribution
    );

  const trendScore =
    calculateTrendScore(
      charts
    );

  const overallScore =
    calculateOverallScore({
      returnScore,
      consistencyScore,
      benchmarkScore,
      attributionScore,
      trendScore
    });

  const grade =
    getPerformanceGrade(
      overallScore
    );

  const priorityIssue =
    buildPriorityIssue({
      performance,
      benchmark,
      attribution,
      charts
    });

  const insights =
    buildInsights({
      performance,
      benchmark,
      attribution,
      charts
    });

  const recommendedActions =
    buildRecommendedActions({
      performance,
      benchmark,
      attribution,
      charts
    });

  const summary =
    buildSummary({
      overallScore,
      grade,
      performance,
      benchmark,
      attribution,
      charts,
      priorityIssue
    });

  const highIssues =
    insights.filter(
      (item) =>
        item?.severity ===
        "HIGH"
    ).length;

  let status;

  if (
    highIssues > 0
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
      "REVIEW";
  } else if (
    performance?.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    status =
      "LIMITED_HISTORY";
  } else {
    status =
      "ON_TRACK";
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    health: {
      overallScore,

      grade,

      components: {
        return:
          returnScore,

        consistency:
          consistencyScore,

        benchmark:
          benchmarkScore,

        attribution:
          attributionScore,

        trend:
          trendScore
      }
    },

    portfolio: {
      beginningValue:
        performance
          ?.portfolio
          ?.beginningValue ??
        null,

      endingValue:
        performance
          ?.portfolio
          ?.endingValue ??
        null,

      totalGainLoss:
        performance
          ?.portfolio
          ?.totalGainLoss ??
        null,

      totalInflows:
        roundMoney(
          performance
            ?.portfolio
            ?.totalInflows
        ),

      totalOutflows:
        roundMoney(
          performance
            ?.portfolio
            ?.totalOutflows
        ),

      netCashFlow:
        roundMoney(
          performance
            ?.portfolio
            ?.netCashFlow
        )
    },

    performance: {
      status:
        performance
          ?.status ||
        null,

      historyStatus:
        performance
          ?.history
          ?.status ||
        null,

      returnObservations:
        number(
          performance
            ?.history
            ?.returnObservations
        ),

      timeWeightedReturnPercentage:
        performance
          ?.returns
          ?.timeWeightedReturnPercentage ??
        null,

      annualizedTimeWeightedReturnPercentage:
        performance
          ?.returns
          ?.annualizedTimeWeightedReturnPercentage ??
        null,

      moneyWeightedReturnPercentage:
        performance
          ?.returns
          ?.moneyWeightedReturnPercentage ??
        null,

      winningPercentage:
        performance
          ?.consistency
          ?.winningPercentage ??
        null,

      oneMonthReturnPercentage:
        performance
          ?.periods
          ?.oneMonth
          ?.returnPercentage ??
        null,

      yearToDateReturnPercentage:
        performance
          ?.periods
          ?.yearToDate
          ?.returnPercentage ??
        null,

      oneYearReturnPercentage:
        performance
          ?.periods
          ?.oneYear
          ?.returnPercentage ??
        null,

      sinceInceptionReturnPercentage:
        performance
          ?.sinceInception
          ?.returnPercentage ??
        null
    },

    benchmark: {
      status:
        benchmark
          ?.status ||
        null,

      code:
        benchmark
          ?.benchmark
          ?.code ||
        benchmarkCode,

      label:
        benchmark
          ?.benchmark
          ?.label ||
        null,

      matchedObservations:
        number(
          benchmark
            ?.history
            ?.matchedObservations
        ),

      portfolioReturnPercentage:
        benchmark
          ?.returns
          ?.portfolioReturnPercentage ??
        null,

      benchmarkReturnPercentage:
        benchmark
          ?.returns
          ?.benchmarkReturnPercentage ??
        null,

      activeReturnPercentage:
        benchmark
          ?.returns
          ?.activeReturnPercentage ??
        null,

      alphaPercentage:
        benchmark
          ?.risk
          ?.annualizedAlphaPercentage ??
        null,

      beta:
        benchmark
          ?.risk
          ?.beta ??
        null,

      trackingErrorPercentage:
        benchmark
          ?.risk
          ?.annualizedTrackingErrorPercentage ??
        null,

      informationRatio:
        benchmark
          ?.risk
          ?.informationRatio ??
        null
    },

    attribution: {
      status:
        attribution
          ?.status ||
        null,

      topHoldingContributor:
        attribution
          ?.contributors
          ?.topHoldingContributor ||
        null,

      worstHoldingContributor:
        attribution
          ?.contributors
          ?.worstHoldingContributor ||
        null,

      topSectorContributor:
        attribution
          ?.contributors
          ?.topSectorContributor ||
        null,

      worstSectorContributor:
        attribution
          ?.contributors
          ?.worstSectorContributor ||
        null,

      positiveHoldings:
        number(
          attribution
            ?.contributors
            ?.positiveHoldings
        ),

      negativeHoldings:
        number(
          attribution
            ?.contributors
            ?.negativeHoldings
        ),

      allocationEffectPercentage:
        attribution
          ?.brinsonAttribution
          ?.allocationEffectPercentage ??
        null,

      selectionEffectPercentage:
        attribution
          ?.brinsonAttribution
          ?.selectionEffectPercentage ??
        null,

      interactionEffectPercentage:
        attribution
          ?.brinsonAttribution
          ?.interactionEffectPercentage ??
        null
    },

    trends: {
      status:
        charts
          ?.status ||
        null,

      valuationObservations:
        number(
          charts
            ?.summary
            ?.valuationObservations
        ),

      growthObservations:
        number(
          charts
            ?.summary
            ?.growthObservations
        ),

      portfolioGrowthEndingValue:
        charts
          ?.summary
          ?.portfolioGrowthEndingValue ??
        null,

      benchmarkGrowthEndingValue:
        charts
          ?.summary
          ?.benchmarkGrowthEndingValue ??
        null,

      maximumDrawdownPercentage:
        charts
          ?.summary
          ?.maximumDrawdownPercentage ??
        null,

      currentDrawdownPercentage:
        charts
          ?.summary
          ?.currentDrawdownPercentage ??
        null
    },

    priorityIssue,

    insights,

    recommendedActions,

    summary,

    sources: {
      performance,
      benchmark,
      attribution,
      charts
    }
  };
}

/*
 * ============================================================
 * COMPACT SUMMARY
 * ============================================================
 */

export async function buildCoachGPerformanceSummary(
  options = {}
) {
  const advice =
    await buildCoachGPerformanceAdvice(
      options
    );

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

    performanceLevel:
      advice
        ?.health
        ?.grade
        ?.performanceLevel ||
      "UNKNOWN",

    timeWeightedReturnPercentage:
      advice
        ?.performance
        ?.timeWeightedReturnPercentage ??
      null,

    moneyWeightedReturnPercentage:
      advice
        ?.performance
        ?.moneyWeightedReturnPercentage ??
      null,

    activeReturnPercentage:
      advice
        ?.benchmark
        ?.activeReturnPercentage ??
      null,

    topContributor:
      advice
        ?.attribution
        ?.topHoldingContributor ||
      null,

    worstContributor:
      advice
        ?.attribution
        ?.worstHoldingContributor ||
      null,

    maximumDrawdownPercentage:
      advice
        ?.trends
        ?.maximumDrawdownPercentage ??
      null,

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

export async function loadHighPriorityPerformanceInsights(
  options = {}
) {
  const advice =
    await buildCoachGPerformanceAdvice(
      options
    );

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

export async function loadCoachGPerformanceActions(
  options = {}
) {
  const advice =
    await buildCoachGPerformanceAdvice(
      options
    );

  return advice
    .recommendedActions;
}

export async function loadCoachGTopPerformanceContributors(
  limit = 5,
  options = {}
) {
  const advice =
    await buildCoachGPerformanceAdvice(
      options
    );

  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  return (
    advice
      ?.sources
      ?.attribution
      ?.holdingAttribution
      ?.holdings ||
    []
  )
    .filter(
      (holding) =>
        holding.gainLoss >
        0
    )
    .slice(
      0,
      safeLimit
    );
}

export async function loadCoachGWorstPerformanceContributors(
  limit = 5,
  options = {}
) {
  const advice =
    await buildCoachGPerformanceAdvice(
      options
    );

  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  return (
    advice
      ?.sources
      ?.attribution
      ?.holdingAttribution
      ?.holdings ||
    []
  )
    .filter(
      (holding) =>
        holding.gainLoss <
        0
    )
    .sort(
      (
        first,
        second
      ) =>
        first.gainLoss -
        second.gainLoss
    )
    .slice(
      0,
      safeLimit
    );
}