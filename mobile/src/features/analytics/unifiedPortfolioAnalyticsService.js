import {
  loadCanonicalRealWealthMetrics
} from "../wealth-journey/canonicalRealWealthMetricsService";

import {
  loadBrokerMirror
} from "../broker-sync/brokerSyncService";

import {
  buildBrokerReconciliation
} from "../broker-sync/brokerReconciliationService";

import {
  buildDividendForecast
} from "../dividends/dividendForecastService";

import {
  buildPortfolioDriftAnalysis
} from "../rebalancing/driftAnalysisService";

import {
  buildRebalanceRecommendations
} from "../rebalancing/rebalanceRecommendationService";

import {
  buildCoachGRebalancingAdvice
} from "../rebalancing/rebalanceAdvisorService";

import {
  buildCoachGRiskAdvice
} from "../risk/riskAdvisorService";

import {
  buildCoachGPerformanceAdvice
} from "../performance/performanceAdvisorService";

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

function normalizeSymbol(value) {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
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

function safeArray(value) {
  return Array.isArray(
    value
  )
    ? value
    : [];
}

/*
 * ============================================================
 * EMPTY RESULT
 * ============================================================
 */

function buildEmptyAnalyticsResult({
  investorContext,
  message
}) {
  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      "NOT_READY",

    message,

    portfolio: {
      name:
        investorContext
          ?.practicePortfolio
          ?.name ||
        null,

      currency:
        investorContext
          ?.practicePortfolio
          ?.currency ||
        "KES",

      totalValue: 0,
      holdingsValue: 0,
      availableCash: 0,
      investedAmount: 0,
      holdingsCount: 0
    },

    scores: {
      overall: 0,
      risk: null,
      performance: null,
      rebalancing: null
    },

    statuses: {
      risk: "NOT_READY",
      performance: "NOT_READY",
      rebalancing: "NOT_READY",
      reconciliation: "NOT_READY",
      dividends: "NOT_READY"
    },

    priorities: [],
    alerts: [],
    holdings: [],
    sectors: [],

    sources: {
      investorContext
    }
  };
}

/*
 * ============================================================
 * PORTFOLIO NORMALIZATION
 * ============================================================
 */

function buildPortfolioSummary({
  investorContext,
  riskAdvice,
  performanceAdvice
}) {
  const portfolio =
    investorContext
      ?.practicePortfolio ||
    {};

  const holdings =
    safeArray(
      portfolio?.holdings
    );

    /*
   * ============================================================
   * PC-030C2B3
   * CANONICAL PORTFOLIO VALUE RECONCILIATION
   * ============================================================
   *
   * Financial contract:
   *
   * holdingsValue
   *   = current market value of securities
   *
   * investedAmount
   *   = cost basis of securities currently held
   *
   * totalGainLoss
   *   = holdingsValue - investedAmount
   *
   * totalValue
   *   = holdingsValue + availableCash
   *   = net worth
   *
   * Never substitute investedAmount for holdingsValue.
   * ============================================================
   */

  const holdingsValue =
    roundMoney(
      holdings.reduce(
        (total, holding) =>
          total +
          number(
            holding?.marketValue ??
            holding?.value ??
            (
              number(holding?.quantity) *
              number(
                holding?.marketPrice ??
                holding?.price
              )
            )
          ),
        0
      )
    );

  const investedAmount =
    roundMoney(
      holdings.reduce(
        (total, holding) =>
          total +
          number(
            holding?.investedValue ??
            holding?.costValue ??
            holding?.costBasis ??
            (
              number(holding?.quantity) *
              number(
                holding?.averageCost ??
                holding?.averagePrice
              )
            )
          ),
        0
      )
    );

  const availableCash =
    roundMoney(
      portfolio?.availableCash
    );

  const totalValue =
    roundMoney(
      holdingsValue +
      availableCash
    );

  const calculatedGainLoss =
    roundMoney(
      holdingsValue -
      investedAmount
    );

  const performanceGainLoss =
    nullableNumber(
      performanceAdvice
        ?.portfolio
        ?.totalGainLoss
    );

  const totalGainLoss =
    performanceGainLoss !== null &&
    Math.abs(performanceGainLoss) > 0.005
      ? roundMoney(performanceGainLoss)
      : calculatedGainLoss;

  return {
    id:
      portfolio?.id ||
      null,

    name:
      portfolio?.name ||
      "Practice Portfolio",

    currency:
      portfolio?.currency ||
      "KES",

        totalValue,

    netWorth:
      totalValue,

    holdingsValue,

    investedAmount,

    investedValue:
      investedAmount,

    availableCash,

    holdingsCount:
      holdings.length,

        totalGainLoss,

    riskScore:
      riskAdvice
        ?.health
        ?.overallScore ??
      null,

    performanceScore:
      performanceAdvice
        ?.health
        ?.overallScore ??
      null
  };
}

/*
 * ============================================================
 * HOLDING SUMMARY
 * ============================================================
 */

function buildHoldingSummary({
  investorContext,
  riskAdvice,
  performanceAdvice
}) {
  const holdings =
    safeArray(
      investorContext
        ?.practicePortfolio
        ?.holdings
    );

  const riskHoldings =
    safeArray(
      riskAdvice
        ?.sources
        ?.concentration
        ?.holdings
    );

  const attributionHoldings =
    safeArray(
      performanceAdvice
        ?.sources
        ?.attribution
        ?.holdingAttribution
        ?.holdings
    );

  const riskMap =
    new Map();

  riskHoldings.forEach(
    (holding) => {
      const symbol =
        normalizeSymbol(
          holding?.symbol
        );

      if (
        symbol
      ) {
        riskMap.set(
          symbol,
          holding
        );
      }
    }
  );

  const attributionMap =
    new Map();

  attributionHoldings.forEach(
    (holding) => {
      const symbol =
        normalizeSymbol(
          holding?.symbol
        );

      if (
        symbol
      ) {
        attributionMap.set(
          symbol,
          holding
        );
      }
    }
  );

  return holdings
    .map(
      (holding) => {
        const symbol =
          normalizeSymbol(
            holding?.symbol
          );

        const risk =
          riskMap.get(
            symbol
          );

        const attribution =
          attributionMap.get(
            symbol
          );

        return {
          symbol,

          name:
            holding?.name ||
            holding?.companyName ||
            symbol,

          sector:
            holding?.sector ||
            risk?.sector ||
            attribution?.sector ||
            "Unknown",

          quantity:
            number(
              holding?.quantity
            ),

          marketPrice:
            roundMoney(
              holding
                ?.marketPrice ??
              holding
                ?.price
            ),

          marketValue:
            roundMoney(
              holding
                ?.marketValue ??
              holding
                ?.value
            ),

          allocationPercentage:
            roundPercent(
              risk
                ?.allocationPercentage
            ),

          gainLoss:
            attribution
              ?.gainLoss ??
            null,

          returnPercentage:
            attribution
              ?.returnPercentage ??
            null,

          contributionPercentage:
            attribution
              ?.contributionPercentage ??
            null,

          riskStatus:
            risk
              ?.limit
              ?.status ||
            null,

          configuredLimit:
            risk
              ?.limit
              ?.limitValue ??
            null
        };
      }
    )
    .sort(
      (
        first,
        second
      ) =>
        second.marketValue -
        first.marketValue
    );
}

/*
 * ============================================================
 * SECTOR SUMMARY
 * ============================================================
 */

function buildSectorSummary({
  riskAdvice,
  performanceAdvice
}) {
  const riskSectors =
    safeArray(
      riskAdvice
        ?.sources
        ?.concentration
        ?.sectors
    );

  const performanceSectors =
    safeArray(
      performanceAdvice
        ?.sources
        ?.attribution
        ?.sectorAttribution
    );

  const performanceMap =
    new Map();

  performanceSectors.forEach(
    (sector) => {
      performanceMap.set(
        String(
          sector?.sector ||
          "Unknown"
        ).toUpperCase(),
        sector
      );
    }
  );

  return riskSectors
    .map(
      (sector) => {
        const performance =
          performanceMap.get(
            String(
              sector?.sector ||
              "Unknown"
            ).toUpperCase()
          );

        return {
          sector:
            sector?.sector ||
            "Unknown",

          holdingsCount:
            number(
              sector
                ?.holdingsCount
            ),

          marketValue:
            roundMoney(
              sector?.value
            ),

          allocationPercentage:
            roundPercent(
              sector?.percentage
            ),

          gainLoss:
            performance
              ?.gainLoss ??
            null,

          returnPercentage:
            performance
              ?.returnPercentage ??
            null,

          contributionPercentage:
            performance
              ?.contributionPercentage ??
            null,

          riskStatus:
            sector
              ?.limit
              ?.status ||
            null,

          configuredLimit:
            sector
              ?.limit
              ?.limitValue ??
            null
        };
      }
    )
    .sort(
      (
        first,
        second
      ) =>
        second.marketValue -
        first.marketValue
    );
}

/*
 * ============================================================
 * PRIORITY NORMALIZATION
 * ============================================================
 */

function normalizePriority({
  source,
  severity,
  code,
  title,
  message,
  data = null
}) {
  return {
    id:
      `${source}-${code}`,

    source,

    severity:
      normalizeStatus(
        severity
      ),

    code,

    title:
      title ||
      formatLabel(
        code
      ),

    message:
      message ||
      "No additional information is available.",

    data
  };
}

function buildPriorities({
  riskAdvice,
  performanceAdvice,
  rebalancingAdvice,
  reconciliation,
  dividends
}) {
  const priorities = [];

  if (
    riskAdvice
      ?.priorityIssue
      ?.available
  ) {
    priorities.push(
      normalizePriority({
        source:
          "RISK",

        severity:
          riskAdvice
            .priorityIssue
            .severity,

        code:
          riskAdvice
            .priorityIssue
            .issue
            ?.code ||
          "RISK_PRIORITY",

        title:
          riskAdvice
            .priorityIssue
            .title,

        message:
          riskAdvice
            .priorityIssue
            .message,

        data:
          riskAdvice
            .priorityIssue
      })
    );
  }

  if (
    performanceAdvice
      ?.priorityIssue
      ?.available
  ) {
    priorities.push(
      normalizePriority({
        source:
          "PERFORMANCE",

        severity:
          performanceAdvice
            .priorityIssue
            .severity,

        code:
          performanceAdvice
            .priorityIssue
            .issue
            ?.code ||
          "PERFORMANCE_PRIORITY",

        title:
          performanceAdvice
            .priorityIssue
            .title,

        message:
          performanceAdvice
            .priorityIssue
            .message,

        data:
          performanceAdvice
            .priorityIssue
      })
    );
  }

  const rebalancingInsights =
    safeArray(
      rebalancingAdvice
        ?.insights
    );

  rebalancingInsights
    .filter(
      (item) =>
        [
          "HIGH",
          "CRITICAL"
        ].includes(
          normalizeStatus(
            item?.severity
          )
        )
    )
    .forEach(
      (item) => {
        priorities.push(
          normalizePriority({
            source:
              "REBALANCING",

            severity:
              item?.severity,

            code:
              item?.code ||
              "REBALANCING_PRIORITY",

            title:
              item?.title,

            message:
              item?.message,

            data:
              item
          })
        );
      }
    );

  if (
    reconciliation?.status &&
    ![
      "MATCHED",
      "HOLDINGS_MATCH"
    ].includes(
      reconciliation.status
    )
  ) {
    priorities.push(
      normalizePriority({
        source:
          "BROKER_RECONCILIATION",

        severity:
          reconciliation
            ?.status ===
          "OUT_OF_SYNC"
            ? "HIGH"
            : "MEDIUM",

        code:
          reconciliation.status,

        title:
          "Broker portfolio requires reconciliation",

        message:
          reconciliation.message,

        data:
          reconciliation
      })
    );
  }

  const upcomingDividends =
    safeArray(
      dividends
        ?.upcomingDividends ??
      dividends
        ?.records
    );

  if (
    upcomingDividends.length >
    0
  ) {
    priorities.push(
      normalizePriority({
        source:
          "DIVIDENDS",

        severity:
          "INFO",

        code:
          "UPCOMING_DIVIDENDS",

        title:
          "Upcoming dividend income",

        message:
          `${upcomingDividends.length} upcoming dividend record(s) are available.`,

        data:
          upcomingDividends
      })
    );
  }

  const unique =
    new Map();

  priorities.forEach(
    (priority) => {
      if (
        !unique.has(
          priority.id
        )
      ) {
        unique.set(
          priority.id,
          priority
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
 * ALERT COLLECTION
 * ============================================================
 */

function buildAlerts({
  riskAdvice,
  performanceAdvice,
  rebalancingAdvice
}) {
  const alerts = [];

  safeArray(
    riskAdvice?.insights
  ).forEach(
    (item) => {
      alerts.push(
        normalizePriority({
          source:
            "RISK",

          severity:
            item?.severity,

          code:
            item?.code ||
            "RISK_ALERT",

          title:
            item?.title,

          message:
            item?.message,

          data:
            item
        })
      );
    }
  );

  safeArray(
    performanceAdvice
      ?.insights
  ).forEach(
    (item) => {
      alerts.push(
        normalizePriority({
          source:
            "PERFORMANCE",

          severity:
            item?.severity,

          code:
            item?.code ||
            "PERFORMANCE_ALERT",

          title:
            item?.title,

          message:
            item?.message,

          data:
            item
        })
      );
    }
  );

  safeArray(
    rebalancingAdvice
      ?.insights
  ).forEach(
    (item) => {
      alerts.push(
        normalizePriority({
          source:
            "REBALANCING",

          severity:
            item?.severity,

          code:
            item?.code ||
            "REBALANCING_ALERT",

          title:
            item?.title,

          message:
            item?.message,

          data:
            item
        })
      );
    }
  );

  const unique =
    new Map();

  alerts.forEach(
    (alert) => {
      if (
        !unique.has(
          alert.id
        )
      ) {
        unique.set(
          alert.id,
          alert
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
 * UNIFIED SCORE
 * ============================================================
 */

function calculateUnifiedScore({
  riskScore,
  performanceScore,
  rebalancingScore
}) {
  const components = [
    {
      value:
        nullableNumber(
          riskScore
        ),

      weight:
        0.4
    },

    {
      value:
        nullableNumber(
          performanceScore
        ),

      weight:
        0.4
    },

    {
      value:
        nullableNumber(
          rebalancingScore
        ),

      weight:
        0.2
    }
  ].filter(
    (item) =>
      item.value !==
      null
  );

  if (
    !components.length
  ) {
    return 0;
  }

  const totalWeight =
    components.reduce(
      (
        total,
        item
      ) =>
        total +
        item.weight,
      0
    );

  const score =
    components.reduce(
      (
        total,
        item
      ) =>
        total +
        item.value *
        item.weight,
      0
    ) /
    totalWeight;

  return Math.round(
    Math.min(
      Math.max(
        score,
        0
      ),
      100
    )
  );
}

function getUnifiedGrade(
  score
) {
  if (
    score >= 90
  ) {
    return {
      code:
        "EXCELLENT",

      label:
        "Excellent",

      description:
        "The portfolio is performing strongly across risk, performance, and allocation controls."
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

      description:
        "The portfolio is broadly healthy, with limited areas requiring review."
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

      description:
        "The portfolio is generally healthy but has several areas that should be monitored."
    };
  }

  if (
    score >= 50
  ) {
    return {
      code:
        "MIXED",

      label:
        "Mixed",

      description:
        "The portfolio has meaningful risk, performance, or allocation issues requiring review."
    };
  }

  return {
    code:
      "ACTION_REQUIRED",

    label:
      "Action Required",

    description:
      "The portfolio requires significant review across multiple analytics categories."
  };
}

/*
 * ============================================================
 * PC-022A
 * UNIFIED PORTFOLIO ANALYTICS
 * ============================================================
 */

export async function buildUnifiedPortfolioAnalytics() {
  const realMetrics =
    await loadCanonicalRealWealthMetrics();

  const portfolioSource =
    realMetrics?.active
      ? {
          id: "REAL-ALL",

          name:
            realMetrics?.sourceLabel ||
            "All Accounts",

          currency:
            "KES",

          holdings:
            Array.isArray(
              realMetrics?.holdings
            )
              ? realMetrics.holdings
              : [],

          holdingsValue:
            Number(
              realMetrics?.holdingsValue ||
              0
            ),

          investedAmount:
            Number(
              realMetrics?.investedValue ||
              0
            ),

          availableCash:
            Number(
              realMetrics?.availableCash ||
              0
            ),

          totalValue:
            Number(
              realMetrics?.netWorth ||
              0
            ),

          sourceType:
            "REAL",

          sourceId:
            "ALL"
        }
      : null;

  /*
   * Compatibility shape for the existing PC-022 helper
   * functions. The object in practicePortfolio is REAL data.
   * This prevents a broad rewrite of proven scoring logic.
   */
  const investorContext = {
    practicePortfolio:
      portfolioSource,

    analyticsPortfolioSource:
      "REAL",

    canonicalRealMetrics:
      realMetrics
  };

  const practicePortfolio =
    portfolioSource;

  if (
    !practicePortfolio
  ) {
    return buildEmptyAnalyticsResult({
      investorContext,

      message:
        "A real portfolio is required before unified analytics can be generated."
    });
  }

  const [
    brokerMirror,
    reconciliation,
    dividends,
    driftAnalysis,
    rebalanceRecommendations,
    rebalancingAdvice,
    riskAdvice,
    performanceAdvice
  ] = await Promise.all([
    loadBrokerMirror(),

    buildBrokerReconciliation(),

    buildDividendForecast({
      portfolio:
        practicePortfolio
    }),

    buildPortfolioDriftAnalysis(),

    buildRebalanceRecommendations(),

    buildCoachGRebalancingAdvice(),

    buildCoachGRiskAdvice(),

    buildCoachGPerformanceAdvice()
  ]);

  const portfolio =
    buildPortfolioSummary({
      investorContext,
      riskAdvice,
      performanceAdvice
    });

  const riskScore =
    riskAdvice
      ?.health
      ?.overallScore ??
    null;

  const performanceScore =
    performanceAdvice
      ?.health
      ?.overallScore ??
    null;

  const rebalancingScore =
    rebalancingAdvice
      ?.health
      ?.overallScore ??
    null;

  const overallScore =
    calculateUnifiedScore({
      riskScore,
      performanceScore,
      rebalancingScore
    });

  const grade =
    getUnifiedGrade(
      overallScore
    );

  const priorities =
    buildPriorities({
      riskAdvice,
      performanceAdvice,
      rebalancingAdvice,
      reconciliation,
      dividends
    });

  const alerts =
    buildAlerts({
      riskAdvice,
      performanceAdvice,
      rebalancingAdvice
    });

  const holdings =
    buildHoldingSummary({
      investorContext,
      riskAdvice,
      performanceAdvice
    });

  const sectors =
    buildSectorSummary({
      riskAdvice,
      performanceAdvice
    });

  const criticalCount =
    alerts.filter(
      (item) =>
        item.severity ===
        "CRITICAL"
    ).length;

  const highCount =
    alerts.filter(
      (item) =>
        item.severity ===
        "HIGH"
    ).length;

  let status;

  if (
    criticalCount > 0
  ) {
    status =
      "CRITICAL_REVIEW";
  } else if (
    highCount > 0
  ) {
    status =
      "ACTION_REQUIRED";
  } else if (
    priorities.length > 0
  ) {
    status =
      "REVIEW";
  } else {
    status =
      "HEALTHY";
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    message:
      `The unified portfolio score is ${overallScore}/100, rated ${grade.label}.`,

    portfolio,

    scores: {
      overall:
        overallScore,

      grade,

      risk:
        riskScore,

      performance:
        performanceScore,

      rebalancing:
        rebalancingScore
    },

    statuses: {
      risk:
        riskAdvice
          ?.status ||
        "NOT_READY",

      performance:
        performanceAdvice
          ?.status ||
        "NOT_READY",

      rebalancing:
        rebalancingAdvice
          ?.status ||
        "NOT_READY",

      reconciliation:
        reconciliation
          ?.status ||
        "NOT_READY",

      dividends:
        dividends
          ?.status ||
        "NOT_READY",

      drift:
        driftAnalysis
          ?.status ||
        "NOT_READY"
    },

    summary: {
      priorities:
        priorities.length,

      alerts:
        alerts.length,

      criticalAlerts:
        criticalCount,

      highAlerts:
        highCount,

      holdings:
        holdings.length,

      sectors:
        sectors.length,

      upcomingDividends:
        safeArray(
          dividends
            ?.upcomingDividends ??
          dividends
            ?.records
        ).length,

      reconciliationMismatches:
        number(
          reconciliation
            ?.summary
            ?.mismatched
        ),

      rebalanceRecommendations:
        safeArray(
          rebalanceRecommendations
            ?.recommendations
        ).length
    },

    priorities,

    alerts,

    holdings,

    sectors,

    broker: {
      connected:
        Boolean(
          brokerMirror
        ),

      broker:
        brokerMirror
          ?.broker ||
        null,

      accountName:
        brokerMirror
          ?.accountName ||
        null,

      syncedAt:
        brokerMirror
          ?.syncedAt ||
        null,

      reconciliationStatus:
        reconciliation
          ?.status ||
        "NOT_READY"
    },

    dividends: {
      status:
        dividends
          ?.status ||
        "NOT_READY",

      estimatedAnnualIncome:
        roundMoney(
          dividends
            ?.summary
            ?.estimatedAnnualIncome ??
          dividends
            ?.estimatedAnnualIncome
        ),

      upcomingCount:
        safeArray(
          dividends
            ?.upcomingDividends ??
          dividends
            ?.records
        ).length
    },

    rebalancing: {
      status:
        rebalancingAdvice
          ?.status ||
        "NOT_READY",

      score:
        rebalancingScore,

      driftStatus:
        driftAnalysis
          ?.status ||
        "NOT_READY",

      recommendationCount:
        safeArray(
          rebalanceRecommendations
            ?.recommendations
        ).length
    },

    risk: {
      status:
        riskAdvice
          ?.status ||
        "NOT_READY",

      score:
        riskScore,

      grade:
        riskAdvice
          ?.health
          ?.grade ||
        null,

      concentrationBreaches:
        number(
          riskAdvice
            ?.concentration
            ?.breached
        ),

      stressStatus:
        riskAdvice
          ?.stress
          ?.status ||
        null
    },

    performance: {
      status:
        performanceAdvice
          ?.status ||
        "NOT_READY",

      score:
        performanceScore,

      grade:
        performanceAdvice
          ?.health
          ?.grade ||
        null,

      totalGainLoss:
        performanceAdvice
          ?.portfolio
          ?.totalGainLoss ??
        null,

      timeWeightedReturnPercentage:
        performanceAdvice
          ?.performance
          ?.timeWeightedReturnPercentage ??
        null,

      benchmarkStatus:
        performanceAdvice
          ?.benchmark
          ?.status ||
        "NOT_AVAILABLE"
    },

    sources: {
      investorContext,
      brokerMirror,
      reconciliation,
      dividends,
      driftAnalysis,
      rebalanceRecommendations,
      rebalancingAdvice,
      riskAdvice,
      performanceAdvice
    }
  };
}

/*
 * ============================================================
 * COMPACT SUMMARY
 * ============================================================
 */

export async function buildUnifiedPortfolioAnalyticsSummary() {
  const result =
    await buildUnifiedPortfolioAnalytics();

  return {
    generatedAt:
      result.generatedAt,

    status:
      result.status,

    overallScore:
      result
        ?.scores
        ?.overall ||
      0,

    grade:
      result
        ?.scores
        ?.grade
        ?.label ||
      "Not available",

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
        ?.performance
        ?.totalGainLoss ??
      null,

    riskScore:
      result
        ?.scores
        ?.risk ??
      null,

    performanceScore:
      result
        ?.scores
        ?.performance ??
      null,

    rebalancingScore:
      result
        ?.scores
        ?.rebalancing ??
      null,

    priorities:
      result
        ?.summary
        ?.priorities ||
      0,

    criticalAlerts:
      result
        ?.summary
        ?.criticalAlerts ||
      0,

    highAlerts:
      result
        ?.summary
        ?.highAlerts ||
      0,

    brokerStatus:
      result
        ?.broker
        ?.reconciliationStatus ||
      "NOT_READY",

    message:
      result.message
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export async function loadUnifiedPortfolioPriorities() {
  const result =
    await buildUnifiedPortfolioAnalytics();

  return result.priorities;
}

export async function loadUnifiedPortfolioAlerts() {
  const result =
    await buildUnifiedPortfolioAnalytics();

  return result.alerts;
}

export async function loadUnifiedPortfolioHoldings() {
  const result =
    await buildUnifiedPortfolioAnalytics();

  return result.holdings;
}

export async function loadUnifiedPortfolioSectors() {
  const result =
    await buildUnifiedPortfolioAnalytics();

  return result.sectors;
}

export async function loadHighPriorityUnifiedAlerts() {
  const result =
    await buildUnifiedPortfolioAnalytics();

  return result.alerts.filter(
    (item) =>
      [
        "CRITICAL",
        "HIGH"
      ].includes(
        item?.severity
      )
  );
}