import {
  buildUnifiedPortfolioAnalytics
} from "../analytics/unifiedPortfolioAnalyticsService";

import {
  buildPortfolioHealthScore
} from "../analytics/portfolioHealthScoreService";

import {
  buildExecutiveActionQueue
} from "../analytics/executiveActionQueueService";

import {
  buildPortfolioQualityScore,
  classifyPortfolioQuality,
  classifyInvestmentRating
} from "./investmentScoringEngine";

/*
 * ============================================================
 * PC-023A5
 * PORTFOLIO QUALITY AND OVERALL INVESTMENT RATING ENGINE
 * ============================================================
 *
 * Combines:
 * - unified portfolio analytics,
 * - portfolio health,
 * - risk quality,
 * - performance quality,
 * - allocation discipline,
 * - diversification,
 * - liquidity,
 * - operational integrity,
 * - income quality,
 * - capital efficiency,
 * - executive action severity.
 *
 * This engine is advisory only.
 * It does not execute trades or alter portfolio data.
 * ============================================================
 */

export const PORTFOLIO_INVESTMENT_RATINGS = {
  EXCEPTIONAL:
    "EXCEPTIONAL",

  STRONG:
    "STRONG",

  ATTRACTIVE:
    "ATTRACTIVE",

  BALANCED:
    "BALANCED",

  MIXED:
    "MIXED",

  WEAK:
    "WEAK",

  CRITICAL:
    "CRITICAL",

  NOT_RATED:
    "NOT_RATED"
};

export const PORTFOLIO_QUALITY_STATUSES = {
  AVAILABLE:
    "AVAILABLE",

  PARTIAL:
    "PARTIAL",

  REVIEW:
    "REVIEW",

  ACTION_REQUIRED:
    "ACTION_REQUIRED",

  CRITICAL_REVIEW:
    "CRITICAL_REVIEW",

  NOT_READY:
    "NOT_READY"
};

export const PORTFOLIO_QUALITY_COMPONENTS = {
  RISK:
    "RISK",

  PERFORMANCE:
    "PERFORMANCE",

  REBALANCING:
    "REBALANCING",

  DIVERSIFICATION:
    "DIVERSIFICATION",

  LIQUIDITY:
    "LIQUIDITY",

  OPERATIONS:
    "OPERATIONS",

  INCOME:
    "INCOME",

  CAPITAL_EFFICIENCY:
    "CAPITAL_EFFICIENCY"
};

const DEFAULT_COMPONENT_WEIGHTS = {
  RISK:
    0.22,

  PERFORMANCE:
    0.20,

  REBALANCING:
    0.13,

  DIVERSIFICATION:
    0.15,

  LIQUIDITY:
    0.10,

  OPERATIONS:
    0.08,

  INCOME:
    0.05,

  CAPITAL_EFFICIENCY:
    0.07
};

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

function clamp(
  value,
  minimum = 0,
  maximum = 100
) {
  return Math.min(
    Math.max(
      number(value),
      minimum
    ),
    maximum
  );
}

function roundScore(value) {
  return Math.round(
    clamp(value)
  );
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

function safeArray(value) {
  return Array.isArray(
    value
  )
    ? value
    : [];
}

function normalizeStatus(value) {
  return String(
    value || "UNKNOWN"
  )
    .trim()
    .toUpperCase();
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

function severityRank(value) {
  const rank = {
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
    rank[
      normalizeStatus(
        value
      )
    ]
  );
}

function average(values = []) {
  const valid =
    safeArray(values)
      .map(
        nullableNumber
      )
      .filter(
        (value) =>
          value !== null
      );

  if (
    !valid.length
  ) {
    return null;
  }

  return (
    valid.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    ) /
    valid.length
  );
}

/*
 * ============================================================
 * COMPONENT LOOKUP
 * ============================================================
 */

function findHealthComponent(
  health,
  code
) {
  return safeArray(
    health?.components
  ).find(
    (component) =>
      component?.code ===
      code
  ) || null;
}

function extractDiversificationScore(
  analytics
) {
  return (
    nullableNumber(
      analytics
        ?.sources
        ?.riskAdvice
        ?.sources
        ?.diversification
        ?.score
    ) ??
    nullableNumber(
      analytics
        ?.sources
        ?.riskAdvice
        ?.diversification
        ?.score
    ) ??
    nullableNumber(
      analytics
        ?.sources
        ?.riskAdvice
        ?.diversificationScore
    ) ??
    null
  );
}

function extractIncomeScore(
  analytics
) {
  const annualIncome =
    nullableNumber(
      analytics
        ?.dividends
        ?.estimatedAnnualIncome
    );

  const portfolioValue =
    nullableNumber(
      analytics
        ?.portfolio
        ?.totalValue
    );

  if (
    annualIncome === null ||
    portfolioValue === null ||
    portfolioValue <= 0
  ) {
    return null;
  }

  const incomeYield =
    (
      annualIncome /
      portfolioValue
    ) *
    100;

  if (
    incomeYield >= 6 &&
    incomeYield <= 12
  ) {
    return 100;
  }

  if (
    incomeYield >= 4
  ) {
    return 85;
  }

  if (
    incomeYield >= 2
  ) {
    return 70;
  }

  if (
    incomeYield > 0
  ) {
    return 50;
  }

  return 20;
}

function extractCapitalEfficiencyScore(
  analytics
) {
  const performanceScore =
    nullableNumber(
      analytics
        ?.scores
        ?.performance
    );

  const rebalancingScore =
    nullableNumber(
      analytics
        ?.scores
        ?.rebalancing
    );

  const totalGainLoss =
    nullableNumber(
      analytics
        ?.portfolio
        ?.totalGainLoss
    );

  const holdingsValue =
    nullableNumber(
      analytics
        ?.portfolio
        ?.holdingsValue
    );

  const returnEfficiency =
    totalGainLoss !== null &&
    holdingsValue !== null &&
    holdingsValue > 0
      ? clamp(
          50 +
          (
            totalGainLoss /
            holdingsValue
          ) *
          200
        )
      : null;

  return average([
    performanceScore,
    rebalancingScore,
    returnEfficiency
  ]);
}

/*
 * ============================================================
 * PORTFOLIO INVESTMENT CLASSIFICATION
 * ============================================================
 */

export function classifyOverallPortfolioInvestmentRating(
  score
) {
  const value =
    nullableNumber(score);

  if (
    value === null
  ) {
    return {
      code:
        PORTFOLIO_INVESTMENT_RATINGS
          .NOT_RATED,

      label:
        "Not Rated",

      action:
        "BUILD_MORE_EVIDENCE",

      description:
        "Insufficient evidence is available to assign an overall portfolio investment rating."
    };
  }

  if (
    value >= 90
  ) {
    return {
      code:
        PORTFOLIO_INVESTMENT_RATINGS
          .EXCEPTIONAL,

      label:
        "Exceptional",

      action:
        "MAINTAIN_DISCIPLINE",

      description:
        "The portfolio demonstrates excellent quality, risk control, diversification, liquidity, and investment discipline."
    };
  }

  if (
    value >= 80
  ) {
    return {
      code:
        PORTFOLIO_INVESTMENT_RATINGS
          .STRONG,

      label:
        "Strong",

      action:
        "SELECTIVE_EXPANSION",

      description:
        "The portfolio is fundamentally strong and may support selective additional investment."
    };
  }

  if (
    value >= 70
  ) {
    return {
      code:
        PORTFOLIO_INVESTMENT_RATINGS
          .ATTRACTIVE,

      label:
        "Attractive",

      action:
        "ACCUMULATE_SELECTIVELY",

      description:
        "The portfolio is attractive overall but should add capital selectively."
    };
  }

  if (
    value >= 60
  ) {
    return {
      code:
        PORTFOLIO_INVESTMENT_RATINGS
          .BALANCED,

      label:
        "Balanced",

      action:
        "HOLD_AND_MONITOR",

      description:
        "The portfolio has a balanced but mixed profile and should be monitored before aggressive expansion."
    };
  }

  if (
    value >= 45
  ) {
    return {
      code:
        PORTFOLIO_INVESTMENT_RATINGS
          .MIXED,

      label:
        "Mixed",

      action:
        "REVIEW_BEFORE_DEPLOYMENT",

      description:
        "The portfolio has material weaknesses that should be reviewed before new capital is deployed."
    };
  }

  if (
    value >= 30
  ) {
    return {
      code:
        PORTFOLIO_INVESTMENT_RATINGS
          .WEAK,

      label:
        "Weak",

      action:
        "REDUCE_RISK",

      description:
        "The portfolio has significant quality, risk, performance, or allocation weaknesses."
    };
  }

  return {
    code:
      PORTFOLIO_INVESTMENT_RATINGS
        .CRITICAL,

    label:
      "Critical",

    action:
      "IMMEDIATE_REVIEW",

    description:
      "The portfolio requires immediate review before additional capital is committed."
  };
}

/*
 * ============================================================
 * PORTFOLIO QUALITY FLAGS
 * ============================================================
 */

function buildPortfolioQualityFlags({
  analytics,
  health,
  queue,
  components
}) {
  const flags = [];

  components.forEach(
    (component) => {
      if (
        component.score === null ||
        component.score === undefined
      ) {
        flags.push({
          code:
            `${component.code}_NOT_AVAILABLE`,

          severity:
            "INFO",

          title:
            `${component.label} evidence is incomplete`,

          message:
            `${component.label} could not be fully assessed from the available portfolio data.`,

          source:
            component.code
        });

        return;
      }

      if (
        component.score <
        40
      ) {
        flags.push({
          code:
            `${component.code}_CRITICAL`,

          severity:
            "CRITICAL",

          title:
            `${component.label} is critically weak`,

          message:
            `${component.label} scored ${component.score}/100.`,

          source:
            component.code
        });
      } else if (
        component.score <
        55
      ) {
        flags.push({
          code:
            `${component.code}_WEAK`,

          severity:
            "HIGH",

          title:
            `${component.label} requires review`,

          message:
            `${component.label} scored ${component.score}/100.`,

          source:
            component.code
        });
      } else if (
        component.score <
        70
      ) {
        flags.push({
          code:
            `${component.code}_MONITOR`,

          severity:
            "MEDIUM",

          title:
            `${component.label} should be monitored`,

          message:
            `${component.label} scored ${component.score}/100.`,

          source:
            component.code
        });
      }
    }
  );

  safeArray(
    health?.flags
  )
    .filter(
      (flag) =>
        [
          "CRITICAL",
          "HIGH"
        ].includes(
          normalizeStatus(
            flag?.severity
          )
        )
    )
    .forEach(
      (flag) => {
        flags.push({
          code:
            flag?.code ||
            "PORTFOLIO_HEALTH_FLAG",

          severity:
            flag?.severity ||
            "HIGH",

          title:
            flag?.title ||
            "Portfolio health issue",

          message:
            flag?.message ||
            "A portfolio health issue requires review.",

          source:
            flag?.source ||
            "PORTFOLIO_HEALTH"
        });
      }
    );

  safeArray(
    queue?.actions
  )
    .filter(
      (action) =>
        [
          "CRITICAL",
          "HIGH"
        ].includes(
          normalizeStatus(
            action?.priority
          )
        )
    )
    .slice(
      0,
      10
    )
    .forEach(
      (action) => {
        flags.push({
          code:
            action?.code ||
            "EXECUTIVE_ACTION",

          severity:
            action?.priority ||
            "HIGH",

          title:
            action?.title ||
            "Executive action requires review",

          message:
            action?.message ||
            "A high-priority executive action requires review.",

          source:
            action?.type ||
            action?.source ||
            "EXECUTIVE_ACTION_QUEUE"
        });
      }
    );

  const unique =
    new Map();

  flags.forEach(
    (flag) => {
      const key =
        `${flag.source}-${flag.code}`;

      if (
        !unique.has(
          key
        )
      ) {
        unique.set(
          key,
          flag
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
        second?.severity
      ) -
      severityRank(
        first?.severity
      )
  );
}

/*
 * ============================================================
 * STRENGTHS AND WEAKNESSES
 * ============================================================
 */

function buildPortfolioStrengths(
  components
) {
  return components
    .filter(
      (component) =>
        component.score !==
          null &&
        component.score !==
          undefined &&
        component.score >=
          70
    )
    .sort(
      (
        first,
        second
      ) =>
        second.score -
        first.score
    )
    .map(
      (component) => ({
        code:
          `${component.code}_STRENGTH`,

        title:
          `${component.label} is strong`,

        message:
          `${component.label} scored ${component.score}/100.`,

        score:
          component.score,

        source:
          component.code
      })
    );
}

function buildPortfolioWeaknesses(
  components
) {
  return components
    .filter(
      (component) =>
        component.score !==
          null &&
        component.score !==
          undefined &&
        component.score <
          60
    )
    .sort(
      (
        first,
        second
      ) =>
        first.score -
        second.score
    )
    .map(
      (component) => ({
        code:
          `${component.code}_WEAKNESS`,

        title:
          `${component.label} is weak`,

        message:
          `${component.label} scored ${component.score}/100.`,

        score:
          component.score,

        source:
          component.code
      })
    );
}

/*
 * ============================================================
 * COMPONENT BUILDER
 * ============================================================
 */

function buildQualityComponent({
  code,
  label,
  score,
  weight,
  sourceStatus = null,
  message = null
}) {
  const parsed =
    nullableNumber(score);

  return {
    code,

    label,

    available:
      parsed !== null,

    score:
      parsed === null
        ? null
        : roundScore(
            parsed
          ),

    weight,

    weightPercentage:
      roundPercent(
        weight *
        100
      ),

    sourceStatus,

    message
  };
}

/*
 * ============================================================
 * EXECUTIVE STATUS
 * ============================================================
 */

function classifyPortfolioQualityStatus({
  score,
  flags
}) {
  const critical =
    flags.filter(
      (flag) =>
        flag.severity ===
        "CRITICAL"
    ).length;

  const high =
    flags.filter(
      (flag) =>
        flag.severity ===
        "HIGH"
    ).length;

  if (
    critical > 0
  ) {
    return {
      status:
        PORTFOLIO_QUALITY_STATUSES
          .CRITICAL_REVIEW,

      actionLevel:
        "IMMEDIATE",

      criticalFlags:
        critical,

      highFlags:
        high
    };
  }

  if (
    high > 0 ||
    score < 45
  ) {
    return {
      status:
        PORTFOLIO_QUALITY_STATUSES
          .ACTION_REQUIRED,

      actionLevel:
        "HIGH",

      criticalFlags:
        critical,

      highFlags:
        high
    };
  }

  if (
    score < 70 ||
    flags.length > 0
  ) {
    return {
      status:
        PORTFOLIO_QUALITY_STATUSES
          .REVIEW,

      actionLevel:
        "MEDIUM",

      criticalFlags:
        critical,

      highFlags:
        high
    };
  }

  return {
    status:
      PORTFOLIO_QUALITY_STATUSES
        .AVAILABLE,

    actionLevel:
      "ROUTINE",

    criticalFlags:
      critical,

    highFlags:
      high
  };
}

/*
 * ============================================================
 * NARRATIVE
 * ============================================================
 */

function buildPortfolioQualityNarrative({
  score,
  rating,
  strengths,
  weaknesses,
  flags,
  analytics
}) {
  const parts = [];

  parts.push(
    `The portfolio quality score is ${score}/100 and the overall investment rating is ${rating.label}.`
  );

  if (
    strengths.length
  ) {
    parts.push(
      `The strongest areas are ${strengths
        .slice(
          0,
          3
        )
        .map(
          (item) =>
            item.title
              .replace(
                " is strong",
                ""
              )
        )
        .join(
          ", "
        )}.`
    );
  }

  if (
    weaknesses.length
  ) {
    parts.push(
      `The weakest areas are ${weaknesses
        .slice(
          0,
          3
        )
        .map(
          (item) =>
            item.title
              .replace(
                " is weak",
                ""
              )
        )
        .join(
          ", "
        )}.`
    );
  }

  const totalValue =
    nullableNumber(
      analytics
        ?.portfolio
        ?.totalValue
    );

  const availableCash =
    nullableNumber(
      analytics
        ?.portfolio
        ?.availableCash
    );

  if (
    totalValue !== null &&
    availableCash !== null &&
    totalValue > 0
  ) {
    const cashPercentage =
      (
        availableCash /
        totalValue
      ) *
      100;

    parts.push(
      `Available cash represents approximately ${roundPercent(
        cashPercentage
      )}% of portfolio value.`
    );
  }

  if (
    flags.length
  ) {
    parts.push(
      `${flags.length} portfolio quality flag or flags require review.`
    );
  }

  parts.push(
    `Recommended executive posture: ${formatLabel(
      rating.action
    )}.`
  );

  return parts.join(
    " "
  );
}

/*
 * ============================================================
 * PC-023A5
 * PORTFOLIO QUALITY ENGINE
 * ============================================================
 */

export async function buildOverallPortfolioInvestmentRating() {
  const [
    analytics,
    health,
    queue
  ] = await Promise.all([
    buildUnifiedPortfolioAnalytics(),

    buildPortfolioHealthScore(),

    buildExecutiveActionQueue()
  ]);

  if (
    !analytics ||
    analytics?.status ===
      "NOT_READY"
  ) {
    return {
      generatedAt:
        new Date()
          .toISOString(),

      status:
        PORTFOLIO_QUALITY_STATUSES
          .NOT_READY,

      message:
        analytics?.message ||
        "Unified portfolio analytics are not available.",

      score:
        null,

      quality:
        null,

      rating:
        classifyOverallPortfolioInvestmentRating(
          null
        ),

      investmentRating:
        classifyInvestmentRating(
          null
        ),

      components:
        [],

      strengths:
        [],

      weaknesses:
        [],

      flags:
        [],

      portfolio:
        analytics?.portfolio ||
        null,

      sources: {
        analytics,
        health,
        queue
      }
    };
  }

  const liquidityComponent =
    findHealthComponent(
      health,
      "LIQUIDITY"
    );

  const operationsComponent =
    findHealthComponent(
      health,
      "OPERATIONS"
    );

  const diversificationScore =
    extractDiversificationScore(
      analytics
    );

  const incomeScore =
    extractIncomeScore(
      analytics
    );

  const capitalEfficiencyScore =
    extractCapitalEfficiencyScore(
      analytics
    );

  const componentInputs = {
    riskScore:
      analytics
        ?.scores
        ?.risk ??
      null,

    performanceScore:
      analytics
        ?.scores
        ?.performance ??
      null,

    rebalancingScore:
      analytics
        ?.scores
        ?.rebalancing ??
      null,

    diversificationScore,

    liquidityScore:
      liquidityComponent
        ?.score ??
      null,

    operationalScore:
      operationsComponent
        ?.score ??
      null,

    incomeScore,

    capitalEfficiencyScore
  };

  const qualityResult =
    buildPortfolioQualityScore(
      componentInputs
    );

  const components = [
    buildQualityComponent({
      code:
        PORTFOLIO_QUALITY_COMPONENTS
          .RISK,

      label:
        "Risk Control",

      score:
        componentInputs
          .riskScore,

      weight:
        DEFAULT_COMPONENT_WEIGHTS
          .RISK,

      sourceStatus:
        analytics
          ?.statuses
          ?.risk,

      message:
        "Measures portfolio concentration, diversification, stress resilience, and historical risk."
    }),

    buildQualityComponent({
      code:
        PORTFOLIO_QUALITY_COMPONENTS
          .PERFORMANCE,

      label:
        "Performance",

      score:
        componentInputs
          .performanceScore,

      weight:
        DEFAULT_COMPONENT_WEIGHTS
          .PERFORMANCE,

      sourceStatus:
        analytics
          ?.statuses
          ?.performance,

      message:
        "Measures return, consistency, attribution, benchmark comparison, and trend behavior."
    }),

    buildQualityComponent({
      code:
        PORTFOLIO_QUALITY_COMPONENTS
          .REBALANCING,

      label:
        "Allocation Discipline",

      score:
        componentInputs
          .rebalancingScore,

      weight:
        DEFAULT_COMPONENT_WEIGHTS
          .REBALANCING,

      sourceStatus:
        analytics
          ?.statuses
          ?.rebalancing,

      message:
        "Measures target alignment, allocation drift, and rebalancing readiness."
    }),

    buildQualityComponent({
      code:
        PORTFOLIO_QUALITY_COMPONENTS
          .DIVERSIFICATION,

      label:
        "Diversification",

      score:
        diversificationScore,

      weight:
        DEFAULT_COMPONENT_WEIGHTS
          .DIVERSIFICATION,

      message:
        "Measures holdings diversity, sector exposure, concentration, and effective holdings."
    }),

    buildQualityComponent({
      code:
        PORTFOLIO_QUALITY_COMPONENTS
          .LIQUIDITY,

      label:
        "Liquidity",

      score:
        componentInputs
          .liquidityScore,

      weight:
        DEFAULT_COMPONENT_WEIGHTS
          .LIQUIDITY,

      sourceStatus:
        liquidityComponent
          ?.status,

      message:
        liquidityComponent
          ?.message ||
        "Measures available cash and reserve adequacy."
    }),

    buildQualityComponent({
      code:
        PORTFOLIO_QUALITY_COMPONENTS
          .OPERATIONS,

      label:
        "Operational Integrity",

      score:
        componentInputs
          .operationalScore,

      weight:
        DEFAULT_COMPONENT_WEIGHTS
          .OPERATIONS,

      sourceStatus:
        operationsComponent
          ?.status,

      message:
        operationsComponent
          ?.message ||
        "Measures broker reconciliation and operational portfolio integrity."
    }),

    buildQualityComponent({
      code:
        PORTFOLIO_QUALITY_COMPONENTS
          .INCOME,

      label:
        "Income Quality",

      score:
        incomeScore,

      weight:
        DEFAULT_COMPONENT_WEIGHTS
          .INCOME,

      sourceStatus:
        analytics
          ?.statuses
          ?.dividends,

      message:
        "Measures expected portfolio income relative to portfolio value."
    }),

    buildQualityComponent({
      code:
        PORTFOLIO_QUALITY_COMPONENTS
          .CAPITAL_EFFICIENCY,

      label:
        "Capital Efficiency",

      score:
        capitalEfficiencyScore,

      weight:
        DEFAULT_COMPONENT_WEIGHTS
          .CAPITAL_EFFICIENCY,

      message:
        "Measures whether capital is producing acceptable return and allocation outcomes."
    })
  ];

  const score =
    qualityResult?.score ??
    null;

  const rating =
    classifyOverallPortfolioInvestmentRating(
      score
    );

  const flags =
    buildPortfolioQualityFlags({
      analytics,
      health,
      queue,
      components
    });

  const strengths =
    buildPortfolioStrengths(
      components
    );

  const weaknesses =
    buildPortfolioWeaknesses(
      components
    );

  const classification =
    classifyPortfolioQualityStatus({
      score:
        number(score),

      flags
    });

  const narrative =
    buildPortfolioQualityNarrative({
      score:
        score ?? 0,

      rating,

      strengths,

      weaknesses,

      flags,

      analytics
    });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      classification.status,

    actionLevel:
      classification
        .actionLevel,

    message:
      narrative,

    score,

    quality:
      qualityResult
        ?.classification ||
      (
        score === null
          ? null
          : classifyPortfolioQuality(
              score
            )
      ),

    rating,

    investmentRating:
      classifyInvestmentRating(
        score
      ),

    coverage: {
      availableComponents:
        qualityResult
          ?.availableComponents ||
        0,

      totalComponents:
        qualityResult
          ?.totalComponents ||
        components.length,

      availableWeightPercentage:
        qualityResult
          ?.availableWeightPercentage ??
        0
    },

    components,

    strengths,

    weaknesses,

    flags,

    classification: {
      ...classification,

      totalFlags:
        flags.length
    },

    portfolio: {
      name:
        analytics
          ?.portfolio
          ?.name ||
        null,

      currency:
        analytics
          ?.portfolio
          ?.currency ||
        "KES",

      totalValue:
        roundMoney(
          analytics
            ?.portfolio
            ?.totalValue
        ),

      holdingsValue:
        roundMoney(
          analytics
            ?.portfolio
            ?.holdingsValue
        ),

      availableCash:
        roundMoney(
          analytics
            ?.portfolio
            ?.availableCash
        ),

      holdingsCount:
        number(
          analytics
            ?.portfolio
            ?.holdingsCount
        ),

      totalGainLoss:
        analytics
          ?.portfolio
          ?.totalGainLoss ??
        null
    },

    executive: {
      queueStatus:
        queue?.status ||
        "NOT_READY",

      actionLevel:
        queue?.actionLevel ||
        "UNKNOWN",

      totalActions:
        number(
          queue
            ?.summary
            ?.total
        ),

      criticalActions:
        number(
          queue
            ?.summary
            ?.critical
        ),

      highActions:
        number(
          queue
            ?.summary
            ?.high
        ),

      topAction:
        queue?.topAction ||
        null
    },

    sources: {
      analytics,
      health,
      queue,
      qualityResult
    },

    advisoryOnly:
      true
  };
}

/*
 * ============================================================
 * COMPATIBLE QUALITY LOADER
 * ============================================================
 */

export async function buildPortfolioQualityAnalysis() {
  return buildOverallPortfolioInvestmentRating();
}

/*
 * ============================================================
 * COMPACT SUMMARY
 * ============================================================
 */

export async function buildOverallInvestmentRatingSummary() {
  const result =
    await buildOverallPortfolioInvestmentRating();

  return {
    generatedAt:
      result.generatedAt,

    status:
      result.status,

    actionLevel:
      result.actionLevel,

    score:
      result.score,

    quality:
      result
        ?.quality
        ?.label ||
      "Not Rated",

    rating:
      result
        ?.rating
        ?.label ||
      "Not Rated",

    ratingCode:
      result
        ?.rating
        ?.code ||
      PORTFOLIO_INVESTMENT_RATINGS
        .NOT_RATED,

    recommendedPosture:
      result
        ?.rating
        ?.action ||
      "BUILD_MORE_EVIDENCE",

    portfolioValue:
      result
        ?.portfolio
        ?.totalValue ||
      0,

    availableCash:
      result
        ?.portfolio
        ?.availableCash ||
      0,

    totalGainLoss:
      result
        ?.portfolio
        ?.totalGainLoss ??
      null,

    availableComponents:
      result
        ?.coverage
        ?.availableComponents ||
      0,

    totalComponents:
      result
        ?.coverage
        ?.totalComponents ||
      0,

    availableWeightPercentage:
      result
        ?.coverage
        ?.availableWeightPercentage ||
      0,

    criticalFlags:
      result
        ?.classification
        ?.criticalFlags ||
      0,

    highFlags:
      result
        ?.classification
        ?.highFlags ||
      0,

    totalFlags:
      result
        ?.classification
        ?.totalFlags ||
      0,

    topStrength:
      result
        ?.strengths?.[0] ||
      null,

    topWeakness:
      result
        ?.weaknesses?.[0] ||
      null,

    topExecutiveAction:
      result
        ?.executive
        ?.topAction ||
      null,

    message:
      result.message
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export async function loadPortfolioQualityComponents() {
  const result =
    await buildOverallPortfolioInvestmentRating();

  return result.components;
}

export async function loadPortfolioQualityStrengths() {
  const result =
    await buildOverallPortfolioInvestmentRating();

  return result.strengths;
}

export async function loadPortfolioQualityWeaknesses() {
  const result =
    await buildOverallPortfolioInvestmentRating();

  return result.weaknesses;
}

export async function loadPortfolioQualityFlags() {
  const result =
    await buildOverallPortfolioInvestmentRating();

  return result.flags;
}

export async function loadCriticalPortfolioQualityFlags() {
  const result =
    await buildOverallPortfolioInvestmentRating();

  return result.flags.filter(
    (flag) =>
      flag?.severity ===
      "CRITICAL"
  );
}

export async function loadHighPriorityPortfolioQualityFlags() {
  const result =
    await buildOverallPortfolioInvestmentRating();

  return result.flags.filter(
    (flag) =>
      [
        "CRITICAL",
        "HIGH"
      ].includes(
        flag?.severity
      )
  );
}

export async function loadOverallPortfolioInvestmentRating() {
  const result =
    await buildOverallPortfolioInvestmentRating();

  return {
    status:
      result.status,

    score:
      result.score,

    quality:
      result.quality,

    rating:
      result.rating,

    investmentRating:
      result.investmentRating,

    actionLevel:
      result.actionLevel,

    message:
      result.message
  };
}

export async function loadPortfolioInvestmentPosture() {
  const result =
    await buildOverallPortfolioInvestmentRating();

  return {
    rating:
      result.rating,

    recommendedPosture:
      result
        ?.rating
        ?.action ||
      "BUILD_MORE_EVIDENCE",

    actionLevel:
      result.actionLevel,

    topStrength:
      result
        ?.strengths?.[0] ||
      null,

    topWeakness:
      result
        ?.weaknesses?.[0] ||
      null,

    topExecutiveAction:
      result
        ?.executive
        ?.topAction ||
      null
  };
}