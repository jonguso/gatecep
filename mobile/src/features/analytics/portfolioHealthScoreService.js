import {
  buildUnifiedPortfolioAnalytics
} from "./unifiedPortfolioAnalyticsService";

/*
 * ============================================================
 * CONFIGURATION
 * ============================================================
 */

const HEALTH_COMPONENT_WEIGHTS = {
  RISK: 0.3,
  PERFORMANCE: 0.3,
  REBALANCING: 0.2,
  LIQUIDITY: 0.1,
  OPERATIONS: 0.1
};

const SCORE_LIMITS = {
  MINIMUM: 0,
  MAXIMUM: 100
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

function roundScore(value) {
  return Math.round(
    clamp(
      value,
      SCORE_LIMITS.MINIMUM,
      SCORE_LIMITS.MAXIMUM
    )
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
  const ranks = {
    CRITICAL: 5,
    HIGH: 4,
    MEDIUM: 3,
    WARNING: 3,
    LOW: 2,
    INFO: 1,
    NONE: 0
  };

  return number(
    ranks[
      normalizeStatus(
        value
      )
    ]
  );
}

/*
 * ============================================================
 * SCORE CLASSIFICATION
 * ============================================================
 */

export function classifyPortfolioHealthScore(
  value
) {
  const score =
    roundScore(
      value
    );

  if (
    score >= 90
  ) {
    return {
      code:
        "EXCELLENT",

      label:
        "Excellent",

      healthLevel:
        "VERY_HEALTHY",

      severity:
        "LOW",

      description:
        "The portfolio is performing strongly across risk, performance, allocation, liquidity, and operational controls."
    };
  }

  if (
    score >= 80
  ) {
    return {
      code:
        "STRONG",

      label:
        "Strong",

      healthLevel:
        "HEALTHY",

      severity:
        "LOW",

      description:
        "The portfolio is broadly healthy, with only limited areas requiring attention."
    };
  }

  if (
    score >= 70
  ) {
    return {
      code:
        "GOOD",

      label:
        "Good",

      healthLevel:
        "STABLE",

      severity:
        "MEDIUM",

      description:
        "The portfolio is generally stable but has several areas that should be monitored."
    };
  }

  if (
    score >= 60
  ) {
    return {
      code:
        "FAIR",

      label:
        "Fair",

      healthLevel:
        "WATCH",

      severity:
        "MEDIUM",

      description:
        "The portfolio has meaningful weaknesses that should be reviewed before they become material."
    };
  }

  if (
    score >= 40
  ) {
    return {
      code:
        "WEAK",

      label:
        "Weak",

      healthLevel:
        "REVIEW_REQUIRED",

      severity:
        "HIGH",

      description:
        "The portfolio contains material risk, performance, allocation, liquidity, or operational issues."
    };
  }

  return {
    code:
      "CRITICAL",

    label:
      "Critical",

    healthLevel:
      "ACTION_REQUIRED",

    severity:
      "CRITICAL",

    description:
      "The portfolio requires immediate review across multiple analytics categories."
  };
}

/*
 * ============================================================
 * COMPONENT CLASSIFICATION
 * ============================================================
 */

function classifyComponentScore(
  score
) {
  const parsed =
    nullableNumber(
      score
    );

  if (
    parsed === null
  ) {
    return {
      status:
        "NOT_AVAILABLE",

      label:
        "Not Available",

      severity:
        "INFO"
    };
  }

  if (
    parsed >= 80
  ) {
    return {
      status:
        "HEALTHY",

      label:
        "Healthy",

      severity:
        "LOW"
    };
  }

  if (
    parsed >= 65
  ) {
    return {
      status:
        "MONITOR",

      label:
        "Monitor",

      severity:
        "MEDIUM"
    };
  }

  if (
    parsed >= 40
  ) {
    return {
      status:
        "REVIEW",

      label:
        "Review",

      severity:
        "HIGH"
    };
  }

  return {
    status:
      "CRITICAL",

    label:
      "Critical",

    severity:
      "CRITICAL"
  };
}

/*
 * ============================================================
 * LIQUIDITY SCORE
 * ============================================================
 */

function calculateLiquidityScore(
  analytics
) {
  const totalValue =
    number(
      analytics
        ?.portfolio
        ?.totalValue
    );

  const cash =
    number(
      analytics
        ?.portfolio
        ?.availableCash
    );

  if (
    totalValue <= 0
  ) {
    return {
      score:
        null,

      cashPercentage:
        null,

      status:
        "NOT_AVAILABLE",

      message:
        "Portfolio value is not available for liquidity scoring."
    };
  }

  const cashPercentage =
    (
      cash /
      totalValue
    ) *
    100;

  let score;

  if (
    cashPercentage >= 8 &&
    cashPercentage <= 25
  ) {
    score = 100;
  } else if (
    cashPercentage >= 5 &&
    cashPercentage < 8
  ) {
    score = 85;
  } else if (
    cashPercentage > 25 &&
    cashPercentage <= 40
  ) {
    score = 80;
  } else if (
    cashPercentage >= 2 &&
    cashPercentage < 5
  ) {
    score = 65;
  } else if (
    cashPercentage > 40 &&
    cashPercentage <= 60
  ) {
    score = 60;
  } else if (
    cashPercentage < 2
  ) {
    score = 35;
  } else {
    score = 40;
  }

  const classification =
    classifyComponentScore(
      score
    );

  return {
    score:
      roundScore(
        score
      ),

    cashPercentage:
      roundPercent(
        cashPercentage
      ),

    status:
      classification.status,

    label:
      classification.label,

    severity:
      classification.severity,

    message:
      `Available cash represents ${roundPercent(
        cashPercentage
      )}% of total portfolio value.`
  };
}

/*
 * ============================================================
 * OPERATIONAL SCORE
 * ============================================================
 */

function calculateOperationalScore(
  analytics
) {
  let score =
    100;

  const deductions = [];

  const reconciliationStatus =
    normalizeStatus(
      analytics
        ?.broker
        ?.reconciliationStatus
    );

  if (
    reconciliationStatus ===
    "OUT_OF_SYNC"
  ) {
    score -= 35;

    deductions.push({
      code:
        "BROKER_OUT_OF_SYNC",

      points:
        35,

      message:
        "The broker portfolio is out of sync."
    });
  } else if (
    reconciliationStatus ===
    "PARTIAL_MATCH"
  ) {
    score -= 20;

    deductions.push({
      code:
        "BROKER_PARTIAL_MATCH",

      points:
        20,

      message:
        "The broker portfolio is only partially reconciled."
    });
  } else if (
    reconciliationStatus ===
    "NO_BROKER_MIRROR"
  ) {
    score -= 10;

    deductions.push({
      code:
        "NO_BROKER_MIRROR",

      points:
        10,

      message:
        "No synchronized broker portfolio is available."
    });
  }

  const mismatches =
    number(
      analytics
        ?.summary
        ?.reconciliationMismatches
    );

  if (
    mismatches > 0
  ) {
    const deduction =
      Math.min(
        mismatches * 5,
        20
      );

    score -= deduction;

    deductions.push({
      code:
        "RECONCILIATION_MISMATCHES",

      points:
        deduction,

      message:
        `${mismatches} broker reconciliation mismatch(es) are present.`
    });
  }

  const criticalAlerts =
    number(
      analytics
        ?.summary
        ?.criticalAlerts
    );

  if (
    criticalAlerts > 0
  ) {
    const deduction =
      Math.min(
        criticalAlerts * 10,
        25
      );

    score -= deduction;

    deductions.push({
      code:
        "CRITICAL_ALERTS",

      points:
        deduction,

      message:
        `${criticalAlerts} critical portfolio alert(s) are active.`
    });
  }

  const brokerConnected =
    Boolean(
      analytics
        ?.broker
        ?.connected
    );

  if (
    !brokerConnected
  ) {
    score -= 5;

    deductions.push({
      code:
        "BROKER_NOT_CONNECTED",

      points:
        5,

      message:
        "No broker account is currently connected."
    });
  }

  score =
    roundScore(
      score
    );

  const classification =
    classifyComponentScore(
      score
    );

  return {
    score,

    status:
      classification.status,

    label:
      classification.label,

    severity:
      classification.severity,

    deductions,

    message:
      deductions.length
        ? `${deductions.length} operational issue(s) reduced the operational score.`
        : "No material operational portfolio issues were identified."
  };
}

/*
 * ============================================================
 * COMPONENT NORMALIZATION
 * ============================================================
 */

function buildScoreComponent({
  code,
  label,
  score,
  weight,
  status = null,
  message = null,
  metadata = {}
}) {
  const parsedScore =
    nullableNumber(
      score
    );

  const classification =
    classifyComponentScore(
      parsedScore
    );

  return {
    code,

    label,

    available:
      parsedScore !==
      null,

    score:
      parsedScore ===
        null
        ? null
        : roundScore(
            parsedScore
          ),

    weight,

    weightPercentage:
      roundPercent(
        weight *
        100
      ),

    weightedPoints:
      parsedScore ===
        null
        ? null
        : Number(
            (
              parsedScore *
              weight
            ).toFixed(4)
          ),

    status:
      status ||
      classification.status,

    classification,

    message,

    metadata
  };
}

/*
 * ============================================================
 * WEIGHTED HEALTH SCORE
 * ============================================================
 */

function calculateWeightedHealthScore(
  components
) {
  const available =
    components.filter(
      (component) =>
        component.available
    );

  if (
    !available.length
  ) {
    return {
      score:
        0,

      availableWeight:
        0,

      availableWeightPercentage:
        0,

      componentCount:
        0
    };
  }

  const availableWeight =
    available.reduce(
      (
        total,
        component
      ) =>
        total +
        component.weight,
      0
    );

  const weightedTotal =
    available.reduce(
      (
        total,
        component
      ) =>
        total +
        number(
          component.score
        ) *
        component.weight,
      0
    );

  const score =
    availableWeight > 0
      ? weightedTotal /
        availableWeight
      : 0;

  return {
    score:
      roundScore(
        score
      ),

    availableWeight:
      Number(
        availableWeight.toFixed(
          4
        )
      ),

    availableWeightPercentage:
      roundPercent(
        availableWeight *
        100
      ),

    componentCount:
      available.length
  };
}

/*
 * ============================================================
 * HEALTH FLAGS
 * ============================================================
 */

function buildHealthFlags({
  analytics,
  components
}) {
  const flags = [];

  components.forEach(
    (component) => {
      if (
        !component.available
      ) {
        flags.push({
          code:
            `${component.code}_NOT_AVAILABLE`,

          severity:
            "INFO",

          title:
            `${component.label} score is unavailable`,

          message:
            component.message ||
            `${component.label} analytics are not yet available.`,

          source:
            component.code
        });

        return;
      }

      if (
        [
          "CRITICAL",
          "REVIEW"
        ].includes(
          component
            ?.classification
            ?.status
        )
      ) {
        flags.push({
          code:
            `${component.code}_${component.classification.status}`,

          severity:
            component
              ?.classification
              ?.severity ||
            "HIGH",

          title:
            `${component.label} requires review`,

          message:
            component.message ||
            `${component.label} scored ${component.score}/100.`,

          source:
            component.code
        });
      }
    }
  );

  const highPriorities =
    safeArray(
      analytics?.priorities
    ).filter(
      (item) =>
        [
          "HIGH",
          "CRITICAL"
        ].includes(
          normalizeStatus(
            item?.severity
          )
        )
    );

  highPriorities.forEach(
    (priority) => {
      flags.push({
        code:
          priority?.code ||
          "HIGH_PRIORITY",

        severity:
          priority?.severity ||
          "HIGH",

        title:
          priority?.title ||
          "Portfolio priority requires review",

        message:
          priority?.message ||
          "A high-priority portfolio issue requires review.",

        source:
          priority?.source ||
          "UNIFIED_ANALYTICS"
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
 * EXECUTIVE CLASSIFICATION
 * ============================================================
 */

function buildExecutiveClassification({
  score,
  flags,
  analytics
}) {
  const grade =
    classifyPortfolioHealthScore(
      score
    );

  const criticalFlags =
    flags.filter(
      (item) =>
        item.severity ===
        "CRITICAL"
    ).length;

  const highFlags =
    flags.filter(
      (item) =>
        item.severity ===
        "HIGH"
    ).length;

  let status;
  let actionLevel;

  if (
    criticalFlags > 0
  ) {
    status =
      "CRITICAL_REVIEW";

    actionLevel =
      "IMMEDIATE";
  } else if (
    highFlags > 0 ||
    score < 50
  ) {
    status =
      "ACTION_REQUIRED";

    actionLevel =
      "HIGH";
  } else if (
    score < 70 ||
    flags.length > 0
  ) {
    status =
      "REVIEW";

    actionLevel =
      "MEDIUM";
  } else if (
    score < 80
  ) {
    status =
      "MONITOR";

    actionLevel =
      "LOW";
  } else {
    status =
      "HEALTHY";

    actionLevel =
      "ROUTINE";
  }

  return {
    status,

    actionLevel,

    grade,

    criticalFlags,

    highFlags,

    totalFlags:
      flags.length,

    executiveMessage:
      buildExecutiveMessage({
        score,
        grade,
        status,
        analytics,
        criticalFlags,
        highFlags
      })
  };
}

function buildExecutiveMessage({
  score,
  grade,
  status,
  analytics,
  criticalFlags,
  highFlags
}) {
  const parts = [];

  parts.push(
    `The portfolio health score is ${score}/100, rated ${grade.label}.`
  );

  parts.push(
    `The executive status is ${formatLabel(
      status
    )}.`
  );

  if (
    criticalFlags > 0
  ) {
    parts.push(
      `${criticalFlags} critical issue(s) require immediate review.`
    );
  } else if (
    highFlags > 0
  ) {
    parts.push(
      `${highFlags} high-priority issue(s) require attention.`
    );
  }

  const riskScore =
    nullableNumber(
      analytics
        ?.scores
        ?.risk
    );

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

  if (
    riskScore !==
    null
  ) {
    parts.push(
      `Risk scored ${roundScore(
        riskScore
      )}/100.`
    );
  }

  if (
    performanceScore !==
    null
  ) {
    parts.push(
      `Performance scored ${roundScore(
        performanceScore
      )}/100.`
    );
  }

  if (
    rebalancingScore !==
    null
  ) {
    parts.push(
      `Rebalancing scored ${roundScore(
        rebalancingScore
      )}/100.`
    );
  }

  return parts.join(
    " "
  );
}

/*
 * ============================================================
 * PC-022B
 * PORTFOLIO HEALTH SCORE
 * ============================================================
 */

export async function buildPortfolioHealthScore() {
  const analytics =
    await buildUnifiedPortfolioAnalytics();

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
        "NOT_READY",

      message:
        analytics?.message ||
        "Unified portfolio analytics are not available.",

      score:
        0,

      grade:
        classifyPortfolioHealthScore(
          0
        ),

      classification: {
        status:
          "NOT_READY",

        actionLevel:
          "UNKNOWN",

        criticalFlags:
          0,

        highFlags:
          0,

        totalFlags:
          0
      },

      components: [],

      flags: [],

      portfolio:
        analytics?.portfolio ||
        null,

      sources: {
        analytics
      }
    };
  }

  const liquidity =
    calculateLiquidityScore(
      analytics
    );

  const operations =
    calculateOperationalScore(
      analytics
    );

  const components = [
    buildScoreComponent({
      code:
        "RISK",

      label:
        "Risk Control",

      score:
        analytics
          ?.scores
          ?.risk,

      weight:
        HEALTH_COMPONENT_WEIGHTS
          .RISK,

      status:
        analytics
          ?.statuses
          ?.risk,

      message:
        "Measures concentration, diversification, stress resilience, and available historical risk evidence."
    }),

    buildScoreComponent({
      code:
        "PERFORMANCE",

      label:
        "Performance",

      score:
        analytics
          ?.scores
          ?.performance,

      weight:
        HEALTH_COMPONENT_WEIGHTS
          .PERFORMANCE,

      status:
        analytics
          ?.statuses
          ?.performance,

      message:
        "Measures return, consistency, attribution, benchmark comparison, and trend behavior."
    }),

    buildScoreComponent({
      code:
        "REBALANCING",

      label:
        "Allocation Alignment",

      score:
        analytics
          ?.scores
          ?.rebalancing,

      weight:
        HEALTH_COMPONENT_WEIGHTS
          .REBALANCING,

      status:
        analytics
          ?.statuses
          ?.rebalancing,

      message:
        "Measures drift, target alignment, and rebalancing priority."
    }),

    buildScoreComponent({
      code:
        "LIQUIDITY",

      label:
        "Liquidity",

      score:
        liquidity.score,

      weight:
        HEALTH_COMPONENT_WEIGHTS
          .LIQUIDITY,

      status:
        liquidity.status,

      message:
        liquidity.message,

      metadata:
        liquidity
    }),

    buildScoreComponent({
      code:
        "OPERATIONS",

      label:
        "Operational Integrity",

      score:
        operations.score,

      weight:
        HEALTH_COMPONENT_WEIGHTS
          .OPERATIONS,

      status:
        operations.status,

      message:
        operations.message,

      metadata:
        operations
    })
  ];

  const weightedResult =
    calculateWeightedHealthScore(
      components
    );

  const score =
    weightedResult.score;

  const flags =
    buildHealthFlags({
      analytics,
      components
    });

  const classification =
    buildExecutiveClassification({
      score,
      flags,
      analytics
    });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      classification.status,

    message:
      classification
        .executiveMessage,

    score,

    grade:
      classification.grade,

    classification,

    weighting: {
      configuredWeights:
        HEALTH_COMPONENT_WEIGHTS,

      availableWeight:
        weightedResult
          .availableWeight,

      availableWeightPercentage:
        weightedResult
          .availableWeightPercentage,

      availableComponents:
        weightedResult
          .componentCount,

      totalComponents:
        components.length
    },

    components,

    flags,

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

      cashPercentage:
        liquidity
          ?.cashPercentage ??
        null,

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
      priorities:
        safeArray(
          analytics
            ?.priorities
        ).length,

      alerts:
        safeArray(
          analytics
            ?.alerts
        ).length,

      criticalAlerts:
        number(
          analytics
            ?.summary
            ?.criticalAlerts
        ),

      highAlerts:
        number(
          analytics
            ?.summary
            ?.highAlerts
        ),

      reconciliationMismatches:
        number(
          analytics
            ?.summary
            ?.reconciliationMismatches
        ),

      rebalanceRecommendations:
        number(
          analytics
            ?.summary
            ?.rebalanceRecommendations
        ),

      upcomingDividends:
        number(
          analytics
            ?.summary
            ?.upcomingDividends
        )
    },

    sources: {
      analytics,
      liquidity,
      operations
    }
  };
}

/*
 * ============================================================
 * COMPACT SUMMARY
 * ============================================================
 */

export async function buildPortfolioHealthScoreSummary() {
  const result =
    await buildPortfolioHealthScore();

  return {
    generatedAt:
      result.generatedAt,

    status:
      result.status,

    score:
      result.score,

    grade:
      result
        ?.grade
        ?.label ||
      "Not available",

    healthLevel:
      result
        ?.grade
        ?.healthLevel ||
      "UNKNOWN",

    actionLevel:
      result
        ?.classification
        ?.actionLevel ||
      "UNKNOWN",

    portfolioValue:
      result
        ?.portfolio
        ?.totalValue ||
      0,

    cashPercentage:
      result
        ?.portfolio
        ?.cashPercentage ??
      null,

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

    message:
      result.message
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export async function loadPortfolioHealthComponents() {
  const result =
    await buildPortfolioHealthScore();

  return result.components;
}

export async function loadPortfolioHealthFlags() {
  const result =
    await buildPortfolioHealthScore();

  return result.flags;
}

export async function loadCriticalPortfolioHealthFlags() {
  const result =
    await buildPortfolioHealthScore();

  return result.flags.filter(
    (item) =>
      item?.severity ===
      "CRITICAL"
  );
}

export async function loadHighPriorityPortfolioHealthFlags() {
  const result =
    await buildPortfolioHealthScore();

  return result.flags.filter(
    (item) =>
      [
        "CRITICAL",
        "HIGH"
      ].includes(
        item?.severity
      )
  );
}

export async function loadPortfolioExecutiveClassification() {
  const result =
    await buildPortfolioHealthScore();

  return result.classification;
}