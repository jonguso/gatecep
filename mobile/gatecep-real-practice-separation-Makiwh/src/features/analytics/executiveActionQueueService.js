import {
  buildUnifiedPortfolioAnalytics
} from "./unifiedPortfolioAnalyticsService";

import {
  buildPortfolioHealthScore
} from "./portfolioHealthScoreService";

/*
 * ============================================================
 * CONFIGURATION
 * ============================================================
 */

export const EXECUTIVE_ACTION_STATUSES = {
  OPEN:
    "OPEN",

  IN_PROGRESS:
    "IN_PROGRESS",

  COMPLETED:
    "COMPLETED",

  DISMISSED:
    "DISMISSED",

  BLOCKED:
    "BLOCKED"
};

export const EXECUTIVE_ACTION_TYPES = {
  RISK:
    "RISK",

  PERFORMANCE:
    "PERFORMANCE",

  REBALANCING:
    "REBALANCING",

  LIQUIDITY:
    "LIQUIDITY",

  OPERATIONS:
    "OPERATIONS",

  BROKER_RECONCILIATION:
    "BROKER_RECONCILIATION",

  DIVIDENDS:
    "DIVIDENDS",

  DATA_QUALITY:
    "DATA_QUALITY",

  GENERAL:
    "GENERAL"
};

export const EXECUTIVE_ACTION_PRIORITIES = {
  CRITICAL:
    "CRITICAL",

  HIGH:
    "HIGH",

  MEDIUM:
    "MEDIUM",

  LOW:
    "LOW",

  INFO:
    "INFO"
};

const PRIORITY_SCORE_MAP = {
  CRITICAL:
    100,

  HIGH:
    80,

  MEDIUM:
    60,

  LOW:
    40,

  INFO:
    20
};

const DEFAULT_ACTION_LIMIT =
  50;

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
    Number(
      value
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function roundMoney(value) {
  return Number(
    number(value)
      .toFixed(2)
  );
}

function roundPercent(value) {
  return Number(
    number(value)
      .toFixed(2)
  );
}

function roundScore(value) {
  return Math.round(
    Math.min(
      Math.max(
        number(value),
        0
      ),
      100
    )
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

function normalizeCode(value) {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase()
    .replaceAll(
      " ",
      "_"
    );
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
      normalizeStatus(
        value
      )
    ]
  );
}

function statusRank(value) {
  const ranks = {
    OPEN:
      5,

    IN_PROGRESS:
      4,

    BLOCKED:
      3,

    COMPLETED:
      2,

    DISMISSED:
      1
  };

  return number(
    ranks[
      normalizeStatus(
        value
      )
    ]
  );
}

function normalizePriority(value) {
  const normalized =
    normalizeStatus(
      value
    );

  if (
    Object.values(
      EXECUTIVE_ACTION_PRIORITIES
    ).includes(
      normalized
    )
  ) {
    return normalized;
  }

  if (
    normalized ===
    "WARNING"
  ) {
    return EXECUTIVE_ACTION_PRIORITIES
      .MEDIUM;
  }

  return EXECUTIVE_ACTION_PRIORITIES
    .INFO;
}

function normalizeActionStatus(value) {
  const normalized =
    normalizeStatus(
      value
    );

  if (
    Object.values(
      EXECUTIVE_ACTION_STATUSES
    ).includes(
      normalized
    )
  ) {
    return normalized;
  }

  return EXECUTIVE_ACTION_STATUSES
    .OPEN;
}

function normalizeActionType(value) {
  const normalized =
    normalizeStatus(
      value
    );

  if (
    Object.values(
      EXECUTIVE_ACTION_TYPES
    ).includes(
      normalized
    )
  ) {
    return normalized;
  }

  if (
    normalized.includes(
      "BROKER"
    ) ||
    normalized.includes(
      "RECONCILIATION"
    )
  ) {
    return EXECUTIVE_ACTION_TYPES
      .BROKER_RECONCILIATION;
  }

  if (
    normalized.includes(
      "RISK"
    )
  ) {
    return EXECUTIVE_ACTION_TYPES
      .RISK;
  }

  if (
    normalized.includes(
      "PERFORMANCE"
    )
  ) {
    return EXECUTIVE_ACTION_TYPES
      .PERFORMANCE;
  }

  if (
    normalized.includes(
      "REBALANC"
    ) ||
    normalized.includes(
      "ALLOCATION"
    )
  ) {
    return EXECUTIVE_ACTION_TYPES
      .REBALANCING;
  }

  if (
    normalized.includes(
      "LIQUID"
    ) ||
    normalized.includes(
      "CASH"
    )
  ) {
    return EXECUTIVE_ACTION_TYPES
      .LIQUIDITY;
  }

  if (
    normalized.includes(
      "DIVIDEND"
    )
  ) {
    return EXECUTIVE_ACTION_TYPES
      .DIVIDENDS;
  }

  if (
    normalized.includes(
      "DATA"
    ) ||
    normalized.includes(
      "HISTORY"
    ) ||
    normalized.includes(
      "BENCHMARK"
    )
  ) {
    return EXECUTIVE_ACTION_TYPES
      .DATA_QUALITY;
  }

  if (
    normalized.includes(
      "OPERATION"
    )
  ) {
    return EXECUTIVE_ACTION_TYPES
      .OPERATIONS;
  }

  return EXECUTIVE_ACTION_TYPES
    .GENERAL;
}

function createStableId({
  source,
  code,
  type,
  symbol,
  sector
}) {
  return [
    normalizeCode(
      source ||
      "EXECUTIVE"
    ),

    normalizeCode(
      type ||
      "GENERAL"
    ),

    normalizeCode(
      code ||
      "ACTION"
    ),

    normalizeCode(
      symbol ||
      sector ||
      ""
    )
  ]
    .filter(Boolean)
    .join("-");
}

/*
 * ============================================================
 * ACTION NORMALIZATION
 * ============================================================
 */

function normalizeExecutiveAction({
  source,
  type,
  code,
  title,
  message,
  priority,
  status =
    EXECUTIVE_ACTION_STATUSES
      .OPEN,

  symbol =
    null,

  sector =
    null,

  currentValue =
    null,

  targetValue =
    null,

  financialImpact =
    null,

  dueDate =
    null,

  advisoryOnly =
    true,

  metadata =
    {}
}) {
  const normalizedPriority =
    normalizePriority(
      priority
    );

  const normalizedType =
    normalizeActionType(
      type ||
      source
    );

  const normalizedCode =
    normalizeCode(
      code ||
      "EXECUTIVE_ACTION"
    );

  return {
    id:
      createStableId({
        source,
        code:
          normalizedCode,
        type:
          normalizedType,
        symbol,
        sector
      }),

    source:
      normalizeCode(
        source ||
        "UNIFIED_ANALYTICS"
      ),

    type:
      normalizedType,

    code:
      normalizedCode,

    title:
      title ||
      formatLabel(
        normalizedCode
      ),

    message:
      message ||
      "No additional action details are available.",

    priority:
      normalizedPriority,

    priorityScore:
      number(
        PRIORITY_SCORE_MAP[
          normalizedPriority
        ]
      ),

    status:
      normalizeActionStatus(
        status
      ),

    symbol:
      symbol ||
      null,

    sector:
      sector ||
      null,

    currentValue:
      nullableNumber(
        currentValue
      ),

    targetValue:
      nullableNumber(
        targetValue
      ),

    financialImpact:
      nullableNumber(
        financialImpact
      ) ===
      null
        ? null
        : roundMoney(
            financialImpact
          ),

    dueDate:
      dueDate ||
      null,

    advisoryOnly:
      Boolean(
        advisoryOnly
      ),

    createdAt:
      new Date()
        .toISOString(),

    metadata:
      metadata &&
      typeof metadata ===
        "object"
        ? metadata
        : {}
  };
}

/*
 * ============================================================
 * PRIORITY SCORE
 * ============================================================
 */

function calculateActionPriorityScore({
  priority,
  type,
  financialImpact,
  currentValue,
  targetValue,
  healthScore,
  status
}) {
  let score =
    number(
      PRIORITY_SCORE_MAP[
        normalizePriority(
          priority
        )
      ]
    );

  const normalizedType =
    normalizeActionType(
      type
    );

  if (
    normalizedType ===
    EXECUTIVE_ACTION_TYPES.RISK
  ) {
    score += 8;
  }

  if (
    normalizedType ===
    EXECUTIVE_ACTION_TYPES
      .BROKER_RECONCILIATION
  ) {
    score += 7;
  }

  if (
    normalizedType ===
    EXECUTIVE_ACTION_TYPES
      .REBALANCING
  ) {
    score += 5;
  }

  if (
    normalizedType ===
    EXECUTIVE_ACTION_TYPES
      .PERFORMANCE
  ) {
    score += 4;
  }

  const impact =
    Math.abs(
      number(
        financialImpact
      )
    );

  if (
    impact >= 100000
  ) {
    score += 15;
  } else if (
    impact >= 50000
  ) {
    score += 10;
  } else if (
    impact >= 10000
  ) {
    score += 5;
  }

  const current =
    nullableNumber(
      currentValue
    );

  const target =
    nullableNumber(
      targetValue
    );

  if (
    current !==
      null &&
    target !==
      null &&
    target !==
      0
  ) {
    const deviation =
      Math.abs(
        (
          current -
          target
        ) /
        target
      ) *
      100;

    if (
      deviation >= 50
    ) {
      score += 15;
    } else if (
      deviation >= 25
    ) {
      score += 10;
    } else if (
      deviation >= 10
    ) {
      score += 5;
    }
  }

  const safeHealthScore =
    nullableNumber(
      healthScore
    );

  if (
    safeHealthScore !==
    null
  ) {
    if (
      safeHealthScore < 40
    ) {
      score += 15;
    } else if (
      safeHealthScore < 60
    ) {
      score += 10;
    } else if (
      safeHealthScore < 70
    ) {
      score += 5;
    }
  }

  const normalizedActionStatus =
    normalizeActionStatus(
      status
    );

  if (
    normalizedActionStatus ===
    EXECUTIVE_ACTION_STATUSES
      .BLOCKED
  ) {
    score += 5;
  }

  if (
    normalizedActionStatus ===
    EXECUTIVE_ACTION_STATUSES
      .COMPLETED
  ) {
    score -= 25;
  }

  if (
    normalizedActionStatus ===
    EXECUTIVE_ACTION_STATUSES
      .DISMISSED
  ) {
    score -= 40;
  }

  return roundScore(
    score
  );
}

/*
 * ============================================================
 * ACTIONS FROM UNIFIED PRIORITIES
 * ============================================================
 */

function buildPriorityActions({
  analytics,
  healthScore
}) {
  return safeArray(
    analytics?.priorities
  ).map(
    (priority) => {
      const action =
        normalizeExecutiveAction({
          source:
            priority?.source ||
            "UNIFIED_ANALYTICS",

          type:
            priority?.source,

          code:
            priority?.code ||
            "PORTFOLIO_PRIORITY",

          title:
            priority?.title,

          message:
            priority?.message,

          priority:
            priority?.severity,

          symbol:
            priority
              ?.data
              ?.symbol ||
            priority
              ?.data
              ?.issue
              ?.symbol ||
            null,

          sector:
            priority
              ?.data
              ?.sector ||
            priority
              ?.data
              ?.issue
              ?.sector ||
            null,

          currentValue:
            priority
              ?.data
              ?.currentValue ??
            null,

          targetValue:
            priority
              ?.data
              ?.limitValue ??
            priority
              ?.data
              ?.targetValue ??
            null,

          financialImpact:
            priority
              ?.data
              ?.lossAmount ??
            priority
              ?.data
              ?.valueDifference ??
            null,

          metadata: {
            originalPriority:
              priority
          }
        });

      return {
        ...action,

        priorityScore:
          calculateActionPriorityScore({
            ...action,

            healthScore
          })
      };
    }
  );
}

/*
 * ============================================================
 * ACTIONS FROM HEALTH FLAGS
 * ============================================================
 */

function buildHealthFlagActions({
  health,
  healthScore
}) {
  return safeArray(
    health?.flags
  ).map(
    (flag) => {
      const action =
        normalizeExecutiveAction({
          source:
            flag?.source ||
            "PORTFOLIO_HEALTH",

          type:
            flag?.source,

          code:
            flag?.code ||
            "HEALTH_FLAG",

          title:
            flag?.title,

          message:
            flag?.message,

          priority:
            flag?.severity,

          metadata: {
            healthFlag:
              flag
          }
        });

      return {
        ...action,

        priorityScore:
          calculateActionPriorityScore({
            ...action,

            healthScore
          })
      };
    }
  );
}

/*
 * ============================================================
 * ACTIONS FROM RISK ADVISOR
 * ============================================================
 */

function buildRiskActions({
  analytics,
  healthScore
}) {
  const riskAdvice =
    analytics
      ?.sources
      ?.riskAdvice ||
    null;

  return safeArray(
    riskAdvice
      ?.recommendedActions
  ).map(
    (item) => {
      const action =
        normalizeExecutiveAction({
          source:
            "RISK",

          type:
            EXECUTIVE_ACTION_TYPES
              .RISK,

          code:
            item?.code ||
            "RISK_ACTION",

          title:
            item?.title,

          message:
            item?.message,

          priority:
            item?.priority ||
            "MEDIUM",

          symbol:
            item?.symbol ||
            null,

          sector:
            item?.sector ||
            null,

          currentValue:
            item?.currentValue ??
            null,

          targetValue:
            item?.targetValue ??
            null,

          financialImpact:
            item?.financialImpact ??
            null,

          advisoryOnly:
            item?.advisoryOnly !==
            false,

          metadata: {
            sourceAction:
              item
          }
        });

      return {
        ...action,

        priorityScore:
          calculateActionPriorityScore({
            ...action,

            healthScore
          })
      };
    }
  );
}

/*
 * ============================================================
 * ACTIONS FROM PERFORMANCE ADVISOR
 * ============================================================
 */

function buildPerformanceActions({
  analytics,
  healthScore
}) {
  const performanceAdvice =
    analytics
      ?.sources
      ?.performanceAdvice ||
    null;

  return safeArray(
    performanceAdvice
      ?.recommendedActions
  ).map(
    (item) => {
      const action =
        normalizeExecutiveAction({
          source:
            "PERFORMANCE",

          type:
            EXECUTIVE_ACTION_TYPES
              .PERFORMANCE,

          code:
            item?.code ||
            "PERFORMANCE_ACTION",

          title:
            item?.title,

          message:
            item?.message,

          priority:
            item?.priority ||
            "MEDIUM",

          symbol:
            item?.symbol ||
            null,

          sector:
            item?.sector ||
            null,

          currentValue:
            item?.currentValue ??
            null,

          targetValue:
            item?.targetValue ??
            null,

          financialImpact:
            item?.financialImpact ??
            null,

          advisoryOnly:
            item?.advisoryOnly !==
            false,

          metadata: {
            sourceAction:
              item
          }
        });

      return {
        ...action,

        priorityScore:
          calculateActionPriorityScore({
            ...action,

            healthScore
          })
      };
    }
  );
}

/*
 * ============================================================
 * ACTIONS FROM REBALANCING ADVISOR
 * ============================================================
 */

function buildRebalancingActions({
  analytics,
  healthScore
}) {
  const rebalancingAdvice =
    analytics
      ?.sources
      ?.rebalancingAdvice ||
    null;

  const recommendedActions =
    safeArray(
      rebalancingAdvice
        ?.recommendedActions
    );

  const recommendationSource =
    analytics
      ?.sources
      ?.rebalanceRecommendations ||
    null;

  const directRecommendations =
    safeArray(
      recommendationSource
        ?.recommendations
    );

  return [
    ...recommendedActions,
    ...directRecommendations
  ].map(
    (item) => {
      const symbol =
        item?.symbol ||
        item?.assetSymbol ||
        null;

      const sector =
        item?.sector ||
        null;

      const currentValue =
        item
          ?.currentPercentage ??
        item
          ?.currentAllocationPercentage ??
        null;

      const targetValue =
        item
          ?.targetPercentage ??
        item
          ?.targetAllocationPercentage ??
        null;

      const financialImpact =
        item
          ?.recommendedAmount ??
        item
          ?.tradeAmount ??
        item
          ?.valueDifference ??
        null;

      const action =
        normalizeExecutiveAction({
          source:
            "REBALANCING",

          type:
            EXECUTIVE_ACTION_TYPES
              .REBALANCING,

          code:
            item?.code ||
            (
              symbol
                ? `REBALANCE_${symbol}`
                : "REBALANCING_ACTION"
            ),

          title:
            item?.title ||
            (
              symbol
                ? `Review ${symbol} allocation`
                : "Review portfolio allocation"
            ),

          message:
            item?.message ||
            item?.reason ||
            "A portfolio allocation adjustment requires review.",

          priority:
            item?.priority ||
            item?.severity ||
            "MEDIUM",

          symbol,

          sector,

          currentValue,

          targetValue,

          financialImpact,

          advisoryOnly:
            true,

          metadata: {
            sourceAction:
              item
          }
        });

      return {
        ...action,

        priorityScore:
          calculateActionPriorityScore({
            ...action,

            healthScore
          })
      };
    }
  );
}

/*
 * ============================================================
 * OPERATIONAL ACTIONS
 * ============================================================
 */

function buildOperationalActions({
  analytics,
  health,
  healthScore
}) {
  const actions = [];

  const reconciliationStatus =
    normalizeStatus(
      analytics
        ?.broker
        ?.reconciliationStatus
    );

  if (
    ![
      "MATCHED",
      "HOLDINGS_MATCH",
      "NO_BROKER_MIRROR",
      "NO_VERIFIED_BROKER_MIRROR",
      "NOT_READY"
    ].includes(
      reconciliationStatus
    )
  ) {
    const action =
      normalizeExecutiveAction({
        source:
          "BROKER_RECONCILIATION",

        type:
          EXECUTIVE_ACTION_TYPES
            .BROKER_RECONCILIATION,

        code:
          reconciliationStatus ||
          "BROKER_RECONCILIATION",

        title:
          "Review broker reconciliation",

        message:
          analytics
            ?.sources
            ?.reconciliation
            ?.message ||
          "The GateCEP portfolio and broker mirror require reconciliation.",

        priority:
          reconciliationStatus ===
            "OUT_OF_SYNC"
            ? "HIGH"
            : "MEDIUM",

        financialImpact:
          analytics
            ?.sources
            ?.reconciliation
            ?.summary
            ?.totalDifference ??
          null,

        metadata: {
          reconciliation:
            analytics
              ?.sources
              ?.reconciliation ||
            null
        }
      });

    actions.push({
      ...action,

      priorityScore:
        calculateActionPriorityScore({
          ...action,

          healthScore
        })
    });
  }

  const operationalComponent =
    safeArray(
      health?.components
    ).find(
      (component) =>
        component?.code ===
        "OPERATIONS"
    );

  safeArray(
    operationalComponent
      ?.metadata
      ?.deductions
  ).forEach(
    (deduction) => {
      const action =
        normalizeExecutiveAction({
          source:
            "OPERATIONS",

          type:
            EXECUTIVE_ACTION_TYPES
              .OPERATIONS,

          code:
            deduction?.code ||
            "OPERATIONAL_ACTION",

          title:
            formatLabel(
              deduction?.code ||
              "Operational review"
            ),

          message:
            deduction?.message,

          priority:
            deduction?.points >=
              25
              ? "HIGH"
              : deduction?.points >=
                10
              ? "MEDIUM"
              : "LOW",

          metadata: {
            deduction
          }
        });

      actions.push({
        ...action,

        priorityScore:
          calculateActionPriorityScore({
            ...action,

            healthScore
          })
      });
    }
  );

  return actions;
}

/*
 * ============================================================
 * DATA-QUALITY ACTIONS
 * ============================================================
 */

function buildDataQualityActions({
  analytics,
  healthScore
}) {
  const actions = [];

  const performanceAdvice =
    analytics
      ?.sources
      ?.performanceAdvice ||
    {};

  const riskAdvice =
    analytics
      ?.sources
      ?.riskAdvice ||
    {};

  if (
    performanceAdvice
      ?.performance
      ?.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    const action =
      normalizeExecutiveAction({
        source:
          "PERFORMANCE_HISTORY",

        type:
          EXECUTIVE_ACTION_TYPES
            .DATA_QUALITY,

        code:
          "BUILD_PERFORMANCE_HISTORY",

        title:
          "Build portfolio performance history",

        message:
          "Continue recording genuine portfolio valuations so time-weighted returns, rolling metrics, and drawdown analysis become reliable.",

        priority:
          "LOW"
      });

    actions.push({
      ...action,

      priorityScore:
        calculateActionPriorityScore({
          ...action,

          healthScore
        })
    });
  }

  if (
    riskAdvice
      ?.historicalRisk
      ?.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    const action =
      normalizeExecutiveAction({
        source:
          "RISK_HISTORY",

        type:
          EXECUTIVE_ACTION_TYPES
            .DATA_QUALITY,

        code:
          "BUILD_RISK_HISTORY",

        title:
          "Build historical risk evidence",

        message:
          "Continue recording genuine valuation observations so volatility, drawdown, Sharpe ratio, and value-at-risk metrics become reliable.",

        priority:
          "LOW"
      });

    actions.push({
      ...action,

      priorityScore:
        calculateActionPriorityScore({
          ...action,

          healthScore
        })
    });
  }

  if (
    performanceAdvice
      ?.benchmark
      ?.status ===
    "BENCHMARK_NOT_AVAILABLE"
  ) {
    const action =
      normalizeExecutiveAction({
        source:
          "BENCHMARK",

        type:
          EXECUTIVE_ACTION_TYPES
            .DATA_QUALITY,

        code:
          "CONFIGURE_NSE_BENCHMARK",

        title:
          "Configure genuine NSE benchmark history",

        message:
          "Add dated NSE All Share, NSE 20, or NSE 25 history to enable alpha, beta, tracking error, information ratio, and relative-return analysis.",

        priority:
          "MEDIUM"
      });

    actions.push({
      ...action,

      priorityScore:
        calculateActionPriorityScore({
          ...action,

          healthScore
        })
    });
  }

  return actions;
}

/*
 * ============================================================
 * DUPLICATE REMOVAL
 * ============================================================
 */

function mergeDuplicateActions(
  actions = []
) {
  const map =
    new Map();

  actions.forEach(
    (action) => {
      if (
        !action?.id
      ) {
        return;
      }

      const existing =
        map.get(
          action.id
        );

      if (
        !existing
      ) {
        map.set(
          action.id,
          action
        );

        return;
      }

      const higherPriority =
        action.priorityScore >
        existing.priorityScore
          ? action
          : existing;

      map.set(
        action.id,
        {
          ...higherPriority,

          metadata: {
            ...existing.metadata,
            ...action.metadata,

            duplicateSources: [
              ...new Set([
                ...safeArray(
                  existing
                    ?.metadata
                    ?.duplicateSources
                ),

                existing.source,
                action.source
              ])
            ]
          }
        }
      );
    }
  );

  return Array.from(
    map.values()
  );
}

/*
 * ============================================================
 * ACTION SORTING
 * ============================================================
 */

function sortExecutiveActions(
  actions = []
) {
  return [...actions]
    .sort(
      (
        first,
        second
      ) => {
        const priorityDifference =
          number(
            second
              ?.priorityScore
          ) -
          number(
            first
              ?.priorityScore
          );

        if (
          priorityDifference !==
          0
        ) {
          return priorityDifference;
        }

        const severityDifference =
          priorityRank(
            second?.priority
          ) -
          priorityRank(
            first?.priority
          );

        if (
          severityDifference !==
          0
        ) {
          return severityDifference;
        }

        return (
          statusRank(
            second?.status
          ) -
          statusRank(
            first?.status
          )
        );
      }
    );
}

/*
 * ============================================================
 * QUEUE SUMMARY
 * ============================================================
 */

function buildQueueSummary(
  actions = []
) {
  const open =
    actions.filter(
      (item) =>
        item.status ===
        EXECUTIVE_ACTION_STATUSES
          .OPEN
    );

  const inProgress =
    actions.filter(
      (item) =>
        item.status ===
        EXECUTIVE_ACTION_STATUSES
          .IN_PROGRESS
    );

  const blocked =
    actions.filter(
      (item) =>
        item.status ===
        EXECUTIVE_ACTION_STATUSES
          .BLOCKED
    );

  const completed =
    actions.filter(
      (item) =>
        item.status ===
        EXECUTIVE_ACTION_STATUSES
          .COMPLETED
    );

  const dismissed =
    actions.filter(
      (item) =>
        item.status ===
        EXECUTIVE_ACTION_STATUSES
          .DISMISSED
    );

  const critical =
    actions.filter(
      (item) =>
        item.priority ===
        EXECUTIVE_ACTION_PRIORITIES
          .CRITICAL
    );

  const high =
    actions.filter(
      (item) =>
        item.priority ===
        EXECUTIVE_ACTION_PRIORITIES
          .HIGH
    );

  const medium =
    actions.filter(
      (item) =>
        item.priority ===
        EXECUTIVE_ACTION_PRIORITIES
          .MEDIUM
    );

  const low =
    actions.filter(
      (item) =>
        item.priority ===
        EXECUTIVE_ACTION_PRIORITIES
          .LOW
    );

  const info =
    actions.filter(
      (item) =>
        item.priority ===
        EXECUTIVE_ACTION_PRIORITIES
          .INFO
    );

  const estimatedFinancialImpact =
    roundMoney(
      actions.reduce(
        (
          total,
          item
        ) =>
          total +
          Math.abs(
            number(
              item?.financialImpact
            )
          ),
        0
      )
    );

  return {
    total:
      actions.length,

    open:
      open.length,

    inProgress:
      inProgress.length,

    blocked:
      blocked.length,

    completed:
      completed.length,

    dismissed:
      dismissed.length,

    critical:
      critical.length,

    high:
      high.length,

    medium:
      medium.length,

    low:
      low.length,

    info:
      info.length,

    actionable:
      actions.filter(
        (item) =>
          [
            "OPEN",
            "IN_PROGRESS",
            "BLOCKED"
          ].includes(
            item.status
          )
      ).length,

    advisoryOnly:
      actions.filter(
        (item) =>
          item.advisoryOnly
      ).length,

    estimatedFinancialImpact
  };
}

/*
 * ============================================================
 * EXECUTIVE STATUS
 * ============================================================
 */

function classifyQueueStatus({
  actions,
  summary,
  health
}) {
  if (
    summary.critical >
    0
  ) {
    return {
      status:
        "CRITICAL_ACTIONS",

      actionLevel:
        "IMMEDIATE",

      message:
        `${summary.critical} critical executive action(s) require immediate review.`
    };
  }

  if (
    summary.high >
    0
  ) {
    return {
      status:
        "HIGH_PRIORITY_ACTIONS",

      actionLevel:
        "HIGH",

      message:
        `${summary.high} high-priority executive action(s) require attention.`
    };
  }

  if (
    summary.medium >
    0
  ) {
    return {
      status:
        "REVIEW_REQUIRED",

      actionLevel:
        "MEDIUM",

      message:
        `${summary.medium} medium-priority executive action(s) should be reviewed.`
    };
  }

  if (
    actions.length >
    0
  ) {
    return {
      status:
        "ROUTINE_ACTIONS",

      actionLevel:
        "LOW",

      message:
        `${actions.length} routine or informational action(s) are available.`
    };
  }

  return {
    status:
      "NO_OPEN_ACTIONS",

    actionLevel:
      "ROUTINE",

    message:
      health?.status ===
        "HEALTHY"
        ? "No executive portfolio actions are currently required."
        : "No actionable executive items were generated."
  };
}

/*
 * ============================================================
 * PC-022C
 * EXECUTIVE ACTION QUEUE
 * ============================================================
 */

export async function buildExecutiveActionQueue({
  limit =
    DEFAULT_ACTION_LIMIT,

  includeCompleted =
    false,

  includeDismissed =
    false
} = {}) {
  const [
    analytics,
    health
  ] = await Promise.all([
    buildUnifiedPortfolioAnalytics(),

    buildPortfolioHealthScore()
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
        "NOT_READY",

      actionLevel:
        "UNKNOWN",

      message:
        analytics?.message ||
        "Unified portfolio analytics are not available.",

      healthScore:
        health?.score ||
        0,

      healthGrade:
        health
          ?.grade
          ?.label ||
        "Not available",

      summary:
        buildQueueSummary(
          []
        ),

      actions:
        [],

      topAction:
        null,

      sources: {
        analytics,
        health
      }
    };
  }

  const healthScore =
    number(
      health?.score
    );

  const actions = [
    ...buildPriorityActions({
      analytics,
      healthScore
    }),

    ...buildHealthFlagActions({
      health,
      healthScore
    }),

    ...buildRiskActions({
      analytics,
      healthScore
    }),

    ...buildPerformanceActions({
      analytics,
      healthScore
    }),

    ...buildRebalancingActions({
      analytics,
      healthScore
    }),

    ...buildOperationalActions({
      analytics,
      health,
      healthScore
    }),

    ...buildDataQualityActions({
      analytics,
      healthScore
    })
  ];

  let merged =
    mergeDuplicateActions(
      actions
    );

  if (
    !includeCompleted
  ) {
    merged =
      merged.filter(
        (item) =>
          item.status !==
          EXECUTIVE_ACTION_STATUSES
            .COMPLETED
      );
  }

  if (
    !includeDismissed
  ) {
    merged =
      merged.filter(
        (item) =>
          item.status !==
          EXECUTIVE_ACTION_STATUSES
            .DISMISSED
      );
  }

  const sorted =
    sortExecutiveActions(
      merged
    );

  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  const limited =
    safeLimit > 0
      ? sorted.slice(
          0,
          safeLimit
        )
      : sorted;

  const summary =
    buildQueueSummary(
      limited
    );

  const classification =
    classifyQueueStatus({
      actions:
        limited,

      summary,

      health
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
      classification.message,

    healthScore,

    healthGrade:
      health
        ?.grade
        ?.label ||
      "Not available",

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

      availableCash:
        roundMoney(
          analytics
            ?.portfolio
            ?.availableCash
        ),

      totalGainLoss:
        analytics
          ?.portfolio
          ?.totalGainLoss ??
        null
    },

    summary,

    topAction:
      limited[0] ||
      null,

    actions:
      limited,

    byPriority: {
      critical:
        limited.filter(
          (item) =>
            item.priority ===
            "CRITICAL"
        ),

      high:
        limited.filter(
          (item) =>
            item.priority ===
            "HIGH"
        ),

      medium:
        limited.filter(
          (item) =>
            item.priority ===
            "MEDIUM"
        ),

      low:
        limited.filter(
          (item) =>
            item.priority ===
            "LOW"
        ),

      info:
        limited.filter(
          (item) =>
            item.priority ===
            "INFO"
        )
    },

    byType:
      Object.values(
        EXECUTIVE_ACTION_TYPES
      ).reduce(
        (
          result,
          type
        ) => {
          result[
            type
          ] =
            limited.filter(
              (item) =>
                item.type ===
                type
            );

          return result;
        },
        {}
      ),

    sources: {
      analytics,
      health
    }
  };
}

/*
 * ============================================================
 * COMPACT SUMMARY
 * ============================================================
 */

export async function buildExecutiveActionQueueSummary(
  options = {}
) {
  const queue =
    await buildExecutiveActionQueue(
      options
    );

  return {
    generatedAt:
      queue.generatedAt,

    status:
      queue.status,

    actionLevel:
      queue.actionLevel,

    healthScore:
      queue.healthScore,

    healthGrade:
      queue.healthGrade,

    totalActions:
      queue
        ?.summary
        ?.total ||
      0,

    actionable:
      queue
        ?.summary
        ?.actionable ||
      0,

    critical:
      queue
        ?.summary
        ?.critical ||
      0,

    high:
      queue
        ?.summary
        ?.high ||
      0,

    medium:
      queue
        ?.summary
        ?.medium ||
      0,

    estimatedFinancialImpact:
      queue
        ?.summary
        ?.estimatedFinancialImpact ||
      0,

    topAction:
      queue.topAction,

    message:
      queue.message
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export async function loadExecutiveActions(
  options = {}
) {
  const queue =
    await buildExecutiveActionQueue(
      options
    );

  return queue.actions;
}

export async function loadCriticalExecutiveActions(
  options = {}
) {
  const queue =
    await buildExecutiveActionQueue(
      options
    );

  return queue
    ?.byPriority
    ?.critical ||
    [];
}

export async function loadHighPriorityExecutiveActions(
  options = {}
) {
  const queue =
    await buildExecutiveActionQueue(
      options
    );

  return [
    ...safeArray(
      queue
        ?.byPriority
        ?.critical
    ),

    ...safeArray(
      queue
        ?.byPriority
        ?.high
    )
  ];
}

export async function loadExecutiveActionsByType(
  type,
  options = {}
) {
  const queue =
    await buildExecutiveActionQueue(
      options
    );

  const normalizedType =
    normalizeActionType(
      type
    );

  return queue
    ?.byType?.[
      normalizedType
    ] ||
    [];
}

export async function loadTopExecutiveAction(
  options = {}
) {
  const queue =
    await buildExecutiveActionQueue(
      options
    );

  return queue.topAction;
}

export async function loadExecutiveActionQueueMetrics(
  options = {}
) {
  const queue =
    await buildExecutiveActionQueue(
      options
    );

  return {
    status:
      queue.status,

    actionLevel:
      queue.actionLevel,

    healthScore:
      queue.healthScore,

    summary:
      queue.summary
  };
}
