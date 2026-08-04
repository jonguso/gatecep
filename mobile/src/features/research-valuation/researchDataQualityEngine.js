/*
 * ============================================================
 * PC-023B4
 * VALUATION CONFIDENCE AND RESEARCH DATA QUALITY ENGINE
 * ============================================================
 *
 * Evaluates:
 *
 * - completeness of research inputs,
 * - freshness of market and financial data,
 * - consistency between valuation models,
 * - quality of historical series,
 * - reliability of peer groups,
 * - quality of forecast assumptions,
 * - source transparency,
 * - stale or contradictory data,
 * - overall valuation confidence,
 * - overall research confidence.
 *
 * Safeguards:
 *
 * - does not invent missing data,
 * - treats missing values as unavailable, not zero,
 * - records every penalty and warning,
 * - does not execute trades,
 * - does not modify holdings, cash, or broker data.
 * ============================================================
 */

export const RESEARCH_DATA_QUALITY_STATUSES = {
  AVAILABLE: "AVAILABLE",
  PARTIAL: "PARTIAL",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  STALE_DATA: "STALE_DATA",
  CONFLICTING_DATA: "CONFLICTING_DATA",
  INVALID_INPUT: "INVALID_INPUT"
};

export const RESEARCH_DATA_QUALITY_LEVELS = {
  EXCELLENT: "EXCELLENT",
  STRONG: "STRONG",
  GOOD: "GOOD",
  FAIR: "FAIR",
  WEAK: "WEAK",
  POOR: "POOR",
  NOT_RATED: "NOT_RATED"
};

export const VALUATION_CONFIDENCE_LEVELS = {
  VERY_HIGH: "VERY_HIGH",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  VERY_LOW: "VERY_LOW",
  NOT_AVAILABLE: "NOT_AVAILABLE"
};

export const RESEARCH_WARNING_SEVERITIES = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFO: "INFO"
};

export const RESEARCH_DATA_COMPONENTS = {
  MARKET_DATA: "MARKET_DATA",
  FINANCIAL_STATEMENTS: "FINANCIAL_STATEMENTS",
  PER_SHARE_METRICS: "PER_SHARE_METRICS",
  VALUATION_MULTIPLES: "VALUATION_MULTIPLES",
  DIVIDEND_DATA: "DIVIDEND_DATA",
  GROWTH_HISTORY: "GROWTH_HISTORY",
  PEER_DATA: "PEER_DATA",
  FORECAST_ASSUMPTIONS: "FORECAST_ASSUMPTIONS",
  MODEL_COVERAGE: "MODEL_COVERAGE",
  MODEL_AGREEMENT: "MODEL_AGREEMENT",
  SOURCE_TRANSPARENCY: "SOURCE_TRANSPARENCY"
};

export const DEFAULT_RESEARCH_QUALITY_POLICY = {
  marketDataMaxAgeHours: 24,
  financialDataMaxAgeDays: 180,
  dividendDataMaxAgeDays: 365,
  peerDataMaxAgeDays: 90,
  minimumHistoricalObservations: 3,
  preferredHistoricalObservations: 5,
  minimumPeerCount: 3,
  preferredPeerCount: 5,
  minimumModelCoveragePercentage: 30,
  preferredModelCoveragePercentage: 70,
  maximumModelDispersionPercentage: 40,
  preferredModelDispersionPercentage: 20,
  maximumAssumptionVariancePercentage: 25,
  minimumSourceCoveragePercentage: 40,
  preferredSourceCoveragePercentage: 75
};

const REQUIRED_FIELDS = {
  MARKET_DATA: [
    "currentPrice"
  ],

  FINANCIAL_STATEMENTS: [
    "revenue",
    "netIncome",
    "freeCashFlow",
    "totalAssets",
    "totalLiabilities"
  ],

  PER_SHARE_METRICS: [
    "earningsPerShare",
    "bookValuePerShare",
    "freeCashFlowPerShare",
    "dividendPerShare"
  ],

  VALUATION_MULTIPLES: [
    "peRatio",
    "priceToBookRatio",
    "priceToSalesRatio",
    "evToEbitdaRatio",
    "dividendYieldPercentage",
    "freeCashFlowYieldPercentage"
  ],

  DIVIDEND_DATA: [
    "dividendPerShare",
    "dividendYieldPercentage",
    "payoutRatioPercentage",
    "dividendCoverageRatio"
  ],

  FORECAST_ASSUMPTIONS: [
    "revenueGrowthPercentage",
    "earningsGrowthPercentage",
    "freeCashFlowGrowthPercentage",
    "dividendGrowthPercentage",
    "discountRatePercentage",
    "terminalGrowthPercentage"
  ]
};

/*
 * ============================================================
 * GENERAL HELPERS
 * ============================================================
 */

function number(value) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
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

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
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

function roundScore(value) {
  return Math.round(
    clamp(
      value,
      0,
      100
    )
  );
}

function roundPercent(value) {
  const parsed =
    nullableNumber(value);

  return parsed === null
    ? null
    : Number(
        parsed.toFixed(2)
      );
}

function roundMetric(
  value,
  decimals = 6
) {
  const parsed =
    nullableNumber(value);

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

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeStatus(value) {
  return String(value || "UNKNOWN")
    .trim()
    .toUpperCase();
}

function sum(values = []) {
  return safeArray(values).reduce(
    (total, value) =>
      total + number(value),
    0
  );
}

function average(values = []) {
  const valid = safeArray(values)
    .map(nullableNumber)
    .filter(
      (value) =>
        value !== null
    );

  return valid.length
    ? sum(valid) / valid.length
    : null;
}

function standardDeviation(values = []) {
  const valid = safeArray(values)
    .map(nullableNumber)
    .filter(
      (value) =>
        value !== null
    );

  if (valid.length < 2) {
    return null;
  }

  const mean =
    average(valid);

  const variance =
    average(
      valid.map(
        (value) =>
          Math.pow(
            value - mean,
            2
          )
      )
    );

  return Math.sqrt(variance);
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function ageInHours(value) {
  const date =
    normalizeDate(value);

  if (!date) {
    return null;
  }

  return (
    Date.now() -
    date.getTime()
  ) /
  3600000;
}

function ageInDays(value) {
  const hours =
    ageInHours(value);

  return hours === null
    ? null
    : hours / 24;
}

function normalizePolicy(policy = {}) {
  return {
    marketDataMaxAgeHours:
      Math.max(
        number(
          policy
            ?.marketDataMaxAgeHours ??
          DEFAULT_RESEARCH_QUALITY_POLICY
            .marketDataMaxAgeHours
        ),
        0
      ),

    financialDataMaxAgeDays:
      Math.max(
        number(
          policy
            ?.financialDataMaxAgeDays ??
          DEFAULT_RESEARCH_QUALITY_POLICY
            .financialDataMaxAgeDays
        ),
        0
      ),

    dividendDataMaxAgeDays:
      Math.max(
        number(
          policy
            ?.dividendDataMaxAgeDays ??
          DEFAULT_RESEARCH_QUALITY_POLICY
            .dividendDataMaxAgeDays
        ),
        0
      ),

    peerDataMaxAgeDays:
      Math.max(
        number(
          policy
            ?.peerDataMaxAgeDays ??
          DEFAULT_RESEARCH_QUALITY_POLICY
            .peerDataMaxAgeDays
        ),
        0
      ),

    minimumHistoricalObservations:
      Math.max(
        Math.floor(
          number(
            policy
              ?.minimumHistoricalObservations ??
            DEFAULT_RESEARCH_QUALITY_POLICY
              .minimumHistoricalObservations
          )
        ),
        1
      ),

    preferredHistoricalObservations:
      Math.max(
        Math.floor(
          number(
            policy
              ?.preferredHistoricalObservations ??
            DEFAULT_RESEARCH_QUALITY_POLICY
              .preferredHistoricalObservations
          )
        ),
        1
      ),

    minimumPeerCount:
      Math.max(
        Math.floor(
          number(
            policy
              ?.minimumPeerCount ??
            DEFAULT_RESEARCH_QUALITY_POLICY
              .minimumPeerCount
          )
        ),
        1
      ),

    preferredPeerCount:
      Math.max(
        Math.floor(
          number(
            policy
              ?.preferredPeerCount ??
            DEFAULT_RESEARCH_QUALITY_POLICY
              .preferredPeerCount
          )
        ),
        1
      ),

    minimumModelCoveragePercentage:
      clamp(
        policy
          ?.minimumModelCoveragePercentage ??
        DEFAULT_RESEARCH_QUALITY_POLICY
          .minimumModelCoveragePercentage,
        0,
        100
      ),

    preferredModelCoveragePercentage:
      clamp(
        policy
          ?.preferredModelCoveragePercentage ??
        DEFAULT_RESEARCH_QUALITY_POLICY
          .preferredModelCoveragePercentage,
        0,
        100
      ),

    maximumModelDispersionPercentage:
      Math.max(
        number(
          policy
            ?.maximumModelDispersionPercentage ??
          DEFAULT_RESEARCH_QUALITY_POLICY
            .maximumModelDispersionPercentage
        ),
        0
      ),

    preferredModelDispersionPercentage:
      Math.max(
        number(
          policy
            ?.preferredModelDispersionPercentage ??
          DEFAULT_RESEARCH_QUALITY_POLICY
            .preferredModelDispersionPercentage
        ),
        0
      ),

    maximumAssumptionVariancePercentage:
      Math.max(
        number(
          policy
            ?.maximumAssumptionVariancePercentage ??
          DEFAULT_RESEARCH_QUALITY_POLICY
            .maximumAssumptionVariancePercentage
        ),
        0
      ),

    minimumSourceCoveragePercentage:
      clamp(
        policy
          ?.minimumSourceCoveragePercentage ??
        DEFAULT_RESEARCH_QUALITY_POLICY
          .minimumSourceCoveragePercentage,
        0,
        100
      ),

    preferredSourceCoveragePercentage:
      clamp(
        policy
          ?.preferredSourceCoveragePercentage ??
        DEFAULT_RESEARCH_QUALITY_POLICY
          .preferredSourceCoveragePercentage,
        0,
        100
      )
  };
}

/*
 * ============================================================
 * CLASSIFICATIONS
 * ============================================================
 */

export function classifyResearchDataQuality(
  score
) {
  const value =
    nullableNumber(score);

  if (value === null) {
    return {
      code:
        RESEARCH_DATA_QUALITY_LEVELS
          .NOT_RATED,

      label:
        "Not Rated"
    };
  }

  if (value >= 90) {
    return {
      code:
        RESEARCH_DATA_QUALITY_LEVELS
          .EXCELLENT,

      label:
        "Excellent"
    };
  }

  if (value >= 80) {
    return {
      code:
        RESEARCH_DATA_QUALITY_LEVELS
          .STRONG,

      label:
        "Strong"
    };
  }

  if (value >= 70) {
    return {
      code:
        RESEARCH_DATA_QUALITY_LEVELS
          .GOOD,

      label:
        "Good"
    };
  }

  if (value >= 55) {
    return {
      code:
        RESEARCH_DATA_QUALITY_LEVELS
          .FAIR,

      label:
        "Fair"
    };
  }

  if (value >= 40) {
    return {
      code:
        RESEARCH_DATA_QUALITY_LEVELS
          .WEAK,

      label:
        "Weak"
    };
  }

  return {
    code:
      RESEARCH_DATA_QUALITY_LEVELS
        .POOR,

    label:
      "Poor"
  };
}

export function classifyValuationConfidence(
  score
) {
  const value =
    nullableNumber(score);

  if (value === null) {
    return {
      code:
        VALUATION_CONFIDENCE_LEVELS
          .NOT_AVAILABLE,

      label:
        "Not Available"
    };
  }

  if (value >= 85) {
    return {
      code:
        VALUATION_CONFIDENCE_LEVELS
          .VERY_HIGH,

      label:
        "Very High"
    };
  }

  if (value >= 70) {
    return {
      code:
        VALUATION_CONFIDENCE_LEVELS
          .HIGH,

      label:
        "High"
    };
  }

  if (value >= 50) {
    return {
      code:
        VALUATION_CONFIDENCE_LEVELS
          .MEDIUM,

      label:
        "Medium"
    };
  }

  if (value >= 25) {
    return {
      code:
        VALUATION_CONFIDENCE_LEVELS
          .LOW,

      label:
        "Low"
    };
  }

  return {
    code:
      VALUATION_CONFIDENCE_LEVELS
        .VERY_LOW,

    label:
      "Very Low"
  };
}

/*
 * ============================================================
 * COMPLETENESS
 * ============================================================
 */

function evaluateFieldCoverage({
  data,
  fields,
  code,
  label
}) {
  const availableFields =
    fields.filter(
      (field) =>
        data?.[field] !==
          null &&
        data?.[field] !==
          undefined &&
        data?.[field] !==
          ""
    );

  const coveragePercentage =
    fields.length
      ? (
          availableFields.length /
          fields.length
        ) *
        100
      : 0;

  return {
    code,

    label,

    score:
      roundScore(
        coveragePercentage
      ),

    availableFields,

    missingFields:
      fields.filter(
        (field) =>
          !availableFields.includes(
            field
          )
      ),

    availableCount:
      availableFields.length,

    totalCount:
      fields.length,

    coveragePercentage:
      roundPercent(
        coveragePercentage
      )
  };
}

export function buildResearchCompletenessAnalysis({
  researchData = {}
} = {}) {
  const components = [
    evaluateFieldCoverage({
      data:
        researchData,

      fields:
        REQUIRED_FIELDS
          .MARKET_DATA,

      code:
        RESEARCH_DATA_COMPONENTS
          .MARKET_DATA,

      label:
        "Market Data"
    }),

    evaluateFieldCoverage({
      data:
        researchData,

      fields:
        REQUIRED_FIELDS
          .FINANCIAL_STATEMENTS,

      code:
        RESEARCH_DATA_COMPONENTS
          .FINANCIAL_STATEMENTS,

      label:
        "Financial Statements"
    }),

    evaluateFieldCoverage({
      data:
        researchData,

      fields:
        REQUIRED_FIELDS
          .PER_SHARE_METRICS,

      code:
        RESEARCH_DATA_COMPONENTS
          .PER_SHARE_METRICS,

      label:
        "Per-Share Metrics"
    }),

    evaluateFieldCoverage({
      data:
        researchData,

      fields:
        REQUIRED_FIELDS
          .VALUATION_MULTIPLES,

      code:
        RESEARCH_DATA_COMPONENTS
          .VALUATION_MULTIPLES,

      label:
        "Valuation Multiples"
    }),

    evaluateFieldCoverage({
      data:
        researchData,

      fields:
        REQUIRED_FIELDS
          .DIVIDEND_DATA,

      code:
        RESEARCH_DATA_COMPONENTS
          .DIVIDEND_DATA,

      label:
        "Dividend Data"
    }),

    evaluateFieldCoverage({
      data:
        researchData,

      fields:
        REQUIRED_FIELDS
          .FORECAST_ASSUMPTIONS,

      code:
        RESEARCH_DATA_COMPONENTS
          .FORECAST_ASSUMPTIONS,

      label:
        "Forecast Assumptions"
    })
  ];

  const score =
    average(
      components.map(
        (component) =>
          component.score
      )
    );

  return {
    status:
      score === null
        ? RESEARCH_DATA_QUALITY_STATUSES
            .INSUFFICIENT_DATA
        : RESEARCH_DATA_QUALITY_STATUSES
            .AVAILABLE,

    score:
      score === null
        ? null
        : roundScore(score),

    classification:
      classifyResearchDataQuality(
        score
      ),

    components
  };
}

/*
 * ============================================================
 * FRESHNESS
 * ============================================================
 */

function scoreFreshness({
  age,
  maximumAge
}) {
  if (age === null) {
    return 40;
  }

  if (age <= maximumAge * 0.25) {
    return 100;
  }

  if (age <= maximumAge * 0.5) {
    return 90;
  }

  if (age <= maximumAge) {
    return 75;
  }

  if (age <= maximumAge * 1.5) {
    return 50;
  }

  if (age <= maximumAge * 2) {
    return 30;
  }

  return 10;
}

export function buildResearchFreshnessAnalysis({
  marketDataUpdatedAt = null,
  financialDataUpdatedAt = null,
  dividendDataUpdatedAt = null,
  peerDataUpdatedAt = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const marketAgeHours =
    ageInHours(
      marketDataUpdatedAt
    );

  const financialAgeDays =
    ageInDays(
      financialDataUpdatedAt
    );

  const dividendAgeDays =
    ageInDays(
      dividendDataUpdatedAt
    );

  const peerAgeDays =
    ageInDays(
      peerDataUpdatedAt
    );

  const components = [
    {
      code:
        "MARKET_DATA_FRESHNESS",

      label:
        "Market Data Freshness",

      age:
        marketAgeHours,

      unit:
        "HOURS",

      maximumAge:
        normalizedPolicy
          .marketDataMaxAgeHours,

      score:
        scoreFreshness({
          age:
            marketAgeHours,

          maximumAge:
            normalizedPolicy
              .marketDataMaxAgeHours
        })
    },
    {
      code:
        "FINANCIAL_DATA_FRESHNESS",

      label:
        "Financial Data Freshness",

      age:
        financialAgeDays,

      unit:
        "DAYS",

      maximumAge:
        normalizedPolicy
          .financialDataMaxAgeDays,

      score:
        scoreFreshness({
          age:
            financialAgeDays,

          maximumAge:
            normalizedPolicy
              .financialDataMaxAgeDays
        })
    },
    {
      code:
        "DIVIDEND_DATA_FRESHNESS",

      label:
        "Dividend Data Freshness",

      age:
        dividendAgeDays,

      unit:
        "DAYS",

      maximumAge:
        normalizedPolicy
          .dividendDataMaxAgeDays,

      score:
        scoreFreshness({
          age:
            dividendAgeDays,

          maximumAge:
            normalizedPolicy
              .dividendDataMaxAgeDays
        })
    },
    {
      code:
        "PEER_DATA_FRESHNESS",

      label:
        "Peer Data Freshness",

      age:
        peerAgeDays,

      unit:
        "DAYS",

      maximumAge:
        normalizedPolicy
          .peerDataMaxAgeDays,

      score:
        scoreFreshness({
          age:
            peerAgeDays,

          maximumAge:
            normalizedPolicy
              .peerDataMaxAgeDays
        })
    }
  ];

  const score =
    average(
      components.map(
        (component) =>
          component.score
      )
    );

  const staleComponents =
    components.filter(
      (component) =>
        component.age !== null &&
        component.age >
          component.maximumAge
    );

  return {
    status:
      staleComponents.length
        ? RESEARCH_DATA_QUALITY_STATUSES
            .STALE_DATA
        : RESEARCH_DATA_QUALITY_STATUSES
            .AVAILABLE,

    score:
      roundScore(score),

    classification:
      classifyResearchDataQuality(
        score
      ),

    staleComponents:
      staleComponents.map(
        (component) =>
          component.code
      ),

    components
  };
}

/*
 * ============================================================
 * HISTORICAL SERIES QUALITY
 * ============================================================
 */

function evaluateSeriesQuality({
  code,
  label,
  series,
  policy
}) {
  const observations =
    safeArray(series).filter(
      (item) =>
        item !== null &&
        item !== undefined
    ).length;

  let score;

  if (
    observations >=
    policy
      .preferredHistoricalObservations
  ) {
    score = 100;
  } else if (
    observations >=
    policy
      .minimumHistoricalObservations
  ) {
    score = 75;
  } else if (
    observations >= 2
  ) {
    score = 50;
  } else if (
    observations === 1
  ) {
    score = 25;
  } else {
    score = 0;
  }

  return {
    code,

    label,

    observations,

    score,

    sufficient:
      observations >=
      policy
        .minimumHistoricalObservations
  };
}

export function buildHistoricalDataQualityAnalysis({
  historicalRevenue = [],
  historicalEarnings = [],
  historicalFreeCashFlow = [],
  historicalDividends = [],
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const components = [
    evaluateSeriesQuality({
      code:
        "REVENUE_HISTORY",

      label:
        "Revenue History",

      series:
        historicalRevenue,

      policy:
        normalizedPolicy
    }),

    evaluateSeriesQuality({
      code:
        "EARNINGS_HISTORY",

      label:
        "Earnings History",

      series:
        historicalEarnings,

      policy:
        normalizedPolicy
    }),

    evaluateSeriesQuality({
      code:
        "FREE_CASH_FLOW_HISTORY",

      label:
        "Free Cash Flow History",

      series:
        historicalFreeCashFlow,

      policy:
        normalizedPolicy
    }),

    evaluateSeriesQuality({
      code:
        "DIVIDEND_HISTORY",

      label:
        "Dividend History",

      series:
        historicalDividends,

      policy:
        normalizedPolicy
    })
  ];

  const score =
    average(
      components.map(
        (component) =>
          component.score
      )
    );

  return {
    status:
      components.some(
        (component) =>
          component.sufficient
      )
        ? RESEARCH_DATA_QUALITY_STATUSES
            .AVAILABLE
        : RESEARCH_DATA_QUALITY_STATUSES
            .INSUFFICIENT_DATA,

    score:
      roundScore(score),

    classification:
      classifyResearchDataQuality(
        score
      ),

    components
  };
}

/*
 * ============================================================
 * SOURCE TRANSPARENCY
 * ============================================================
 */

export function buildResearchSourceQualityAnalysis({
  sources = []
} = {}) {
  const normalized =
    safeArray(sources).map(
      (source, index) => ({
        id:
          source?.id ||
          `SOURCE-${index + 1}`,

        name:
          source?.name ||
          source?.provider ||
          "Unknown",

        type:
          normalizeStatus(
            source?.type ||
            "UNKNOWN"
          ),

        authoritative:
          Boolean(
            source?.authoritative
          ),

        verified:
          Boolean(
            source?.verified
          ),

        updatedAt:
          source?.updatedAt ||
          null,

        fields:
          safeArray(
            source?.fields
          )
      })
    );

  if (!normalized.length) {
    return {
      status:
        RESEARCH_DATA_QUALITY_STATUSES
          .INSUFFICIENT_DATA,

      score:
        0,

      classification:
        classifyResearchDataQuality(
          0
        ),

      sources:
        [],

      authoritativeSources:
        0,

      verifiedSources:
        0
    };
  }

  const sourceScores =
    normalized.map(
      (source) => {
        let score = 40;

        if (
          source.authoritative
        ) {
          score += 30;
        }

        if (
          source.verified
        ) {
          score += 20;
        }

        if (
          source.updatedAt
        ) {
          score += 10;
        }

        return {
          ...source,

          score:
            roundScore(score)
        };
      }
    );

  const score =
    average(
      sourceScores.map(
        (source) =>
          source.score
      )
    );

  return {
    status:
      RESEARCH_DATA_QUALITY_STATUSES
        .AVAILABLE,

    score:
      roundScore(score),

    classification:
      classifyResearchDataQuality(
        score
      ),

    authoritativeSources:
      sourceScores.filter(
        (source) =>
          source.authoritative
      ).length,

    verifiedSources:
      sourceScores.filter(
        (source) =>
          source.verified
      ).length,

    sources:
      sourceScores
  };
}

/*
 * ============================================================
 * MODEL QUALITY
 * ============================================================
 */

export function buildValuationModelQualityAnalysis({
  valuation = null,
  relativeValuation = null,
  forecast = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const modelCoverage =
    nullableNumber(
      valuation
        ?.summary
        ?.modelCoveragePercentage ??
      valuation
        ?.composite
        ?.modelCoveragePercentage
    );

  const modelDispersion =
    nullableNumber(
      valuation
        ?.summary
        ?.modelDispersionPercentage ??
      valuation
        ?.composite
        ?.dispersionPercentage
    );

  const relativeCoverage =
    nullableNumber(
      relativeValuation
        ?.summary
        ?.metricCoveragePercentage ??
      relativeValuation
        ?.composite
        ?.coverage
        ?.valuationCoveragePercentage
    );

  const peerCount =
    nullableNumber(
      relativeValuation
        ?.summary
        ?.peerCount ??
      relativeValuation
        ?.peerGroup
        ?.peerCount
    );

  const forecastCoverage =
    nullableNumber(
      forecast
        ?.summary
        ?.assumptionCoveragePercentage ??
      forecast
        ?.assumptions
        ?.coveragePercentage
    );

  const scenarioDispersion =
    nullableNumber(
      forecast
        ?.confidence
        ?.scenarioDispersionPercentage
    );

  const coverageScore =
    average([
      modelCoverage,
      relativeCoverage,
      forecastCoverage
    ]);

  const agreementScore =
    modelDispersion === null
      ? 50
      : modelDispersion <=
          normalizedPolicy
            .preferredModelDispersionPercentage
        ? 100
        : modelDispersion <=
            normalizedPolicy
              .maximumModelDispersionPercentage
          ? 70
          : 30;

  const peerScore =
    peerCount === null
      ? 40
      : peerCount >=
          normalizedPolicy
            .preferredPeerCount
        ? 100
        : peerCount >=
            normalizedPolicy
              .minimumPeerCount
          ? 70
          : 30;

  const scenarioScore =
    scenarioDispersion === null
      ? 50
      : scenarioDispersion <= 5
        ? 100
        : scenarioDispersion <= 10
          ? 80
          : scenarioDispersion <= 15
            ? 60
            : 30;

  const components = [
    {
      code:
        RESEARCH_DATA_COMPONENTS
          .MODEL_COVERAGE,

      score:
        coverageScore === null
          ? 0
          : roundScore(
              coverageScore
            ),

      weight:
        0.35
    },
    {
      code:
        RESEARCH_DATA_COMPONENTS
          .MODEL_AGREEMENT,

      score:
        agreementScore,

      weight:
        0.3
    },
    {
      code:
        RESEARCH_DATA_COMPONENTS
          .PEER_DATA,

      score:
        peerScore,

      weight:
        0.2
    },
    {
      code:
        RESEARCH_DATA_COMPONENTS
          .FORECAST_ASSUMPTIONS,

      score:
        scenarioScore,

      weight:
        0.15
    }
  ];

  const totalWeight =
    sum(
      components.map(
        (component) =>
          component.weight
      )
    );

  const score =
    sum(
      components.map(
        (component) =>
          component.score *
          component.weight
      )
    ) /
    totalWeight;

  return {
    status:
      coverageScore === null
        ? RESEARCH_DATA_QUALITY_STATUSES
            .INSUFFICIENT_DATA
        : RESEARCH_DATA_QUALITY_STATUSES
            .AVAILABLE,

    score:
      roundScore(score),

    classification:
      classifyResearchDataQuality(
        score
      ),

    metrics: {
      modelCoveragePercentage:
        roundPercent(
          modelCoverage
        ),

      modelDispersionPercentage:
        roundPercent(
          modelDispersion
        ),

      relativeCoveragePercentage:
        roundPercent(
          relativeCoverage
        ),

      peerCount:
        peerCount,

      forecastCoveragePercentage:
        roundPercent(
          forecastCoverage
        ),

      scenarioDispersionPercentage:
        roundPercent(
          scenarioDispersion
        )
    },

    components
  };
}

/*
 * ============================================================
 * CONFLICT DETECTION
 * ============================================================
 */

export function buildResearchConsistencyAnalysis({
  valuation = null,
  relativeValuation = null,
  forecast = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const fairValues = [
    valuation?.fairValue,
    relativeValuation?.fairValue,
    forecast
      ?.expected
      ?.terminalFairValue
  ]
    .map(nullableNumber)
    .filter(
      (value) =>
        value !== null &&
        value > 0
    );

  const meanFairValue =
    average(fairValues);

  const dispersion =
    standardDeviation(
      fairValues
    );

  const dispersionPercentage =
    dispersion !== null &&
    meanFairValue !== null &&
    meanFairValue !== 0
      ? (
          dispersion /
          meanFairValue
        ) *
        100
      : null;

  const conflicts = [];

  if (
    dispersionPercentage !== null &&
    dispersionPercentage >
      normalizedPolicy
        .maximumModelDispersionPercentage
  ) {
    conflicts.push({
      code:
        "FAIR_VALUE_DISAGREEMENT",

      severity:
        RESEARCH_WARNING_SEVERITIES
          .HIGH,

      message:
        `Fair-value estimates differ by approximately ${roundPercent(
          dispersionPercentage
        )}%.`
    });
  }

  const valuationClass =
    normalizeStatus(
      valuation
        ?.classification
        ?.code
    );

  const relativeClass =
    normalizeStatus(
      relativeValuation
        ?.classification
        ?.code
    );

  if (
    valuationClass &&
    relativeClass &&
    valuationClass !==
      "UNKNOWN" &&
    relativeClass !==
      "UNKNOWN" &&
    (
      valuationClass.includes(
        "UNDERVALUED"
      ) &&
      relativeClass.includes(
        "OVERVALUED"
      ) ||
      valuationClass.includes(
        "OVERVALUED"
      ) &&
      relativeClass.includes(
        "UNDERVALUED"
      )
    )
  ) {
    conflicts.push({
      code:
        "CLASSIFICATION_CONFLICT",

      severity:
        RESEARCH_WARNING_SEVERITIES
          .HIGH,

      message:
        "Absolute and relative valuation models disagree on valuation direction."
    });
  }

  const totalReturnCagr =
    nullableNumber(
      forecast
        ?.expected
        ?.totalReturnCagrPercentage
    );

  const currentUpside =
    nullableNumber(
      valuation
        ?.classification
        ?.upsidePercentage
    );

  if (
    totalReturnCagr !== null &&
    currentUpside !== null &&
    totalReturnCagr > 12 &&
    currentUpside < -15
  ) {
    conflicts.push({
      code:
        "RETURN_VALUATION_CONFLICT",

      severity:
        RESEARCH_WARNING_SEVERITIES
          .MEDIUM,

      message:
        "Forecast return is strong while current valuation appears expensive."
    });
  }

  const score =
    dispersionPercentage === null
      ? 50
      : dispersionPercentage <= 10
        ? 100
        : dispersionPercentage <= 20
          ? 85
          : dispersionPercentage <= 35
            ? 65
            : dispersionPercentage <= 50
              ? 40
              : 20;

  return {
    status:
      conflicts.length
        ? RESEARCH_DATA_QUALITY_STATUSES
            .CONFLICTING_DATA
        : RESEARCH_DATA_QUALITY_STATUSES
            .AVAILABLE,

    score:
      roundScore(score),

    classification:
      classifyResearchDataQuality(
        score
      ),

    fairValueCount:
      fairValues.length,

    averageFairValue:
      roundMetric(
        meanFairValue,
        2
      ),

    fairValueDispersionPercentage:
      roundPercent(
        dispersionPercentage
      ),

    conflicts
  };
}

/*
 * ============================================================
 * WARNINGS
 * ============================================================
 */

function buildResearchWarnings({
  completeness,
  freshness,
  historical,
  sources,
  modelQuality,
  consistency
}) {
  const warnings = [];

  safeArray(
    completeness?.components
  )
    .filter(
      (component) =>
        component.score < 50
    )
    .forEach(
      (component) => {
        warnings.push({
          code:
            `${component.code}_INCOMPLETE`,

          severity:
            RESEARCH_WARNING_SEVERITIES
              .HIGH,

          title:
            `${component.label} is incomplete`,

          message:
            `${component.missingFields.length} required field(s) are missing.`,

          source:
            component.code
        });
      }
    );

  safeArray(
    freshness?.components
  )
    .filter(
      (component) =>
        component.score < 50
    )
    .forEach(
      (component) => {
        warnings.push({
          code:
            `${component.code}_STALE`,

          severity:
            RESEARCH_WARNING_SEVERITIES
              .MEDIUM,

          title:
            `${component.label} may be stale`,

          message:
            `Data age is ${roundPercent(
              component.age
            )} ${component.unit.toLowerCase()}.`,

          source:
            component.code
        });
      }
    );

  safeArray(
    historical?.components
  )
    .filter(
      (component) =>
        !component.sufficient
    )
    .forEach(
      (component) => {
        warnings.push({
          code:
            `${component.code}_LIMITED`,

          severity:
            RESEARCH_WARNING_SEVERITIES
              .MEDIUM,

          title:
            `${component.label} is limited`,

          message:
            `Only ${component.observations} historical observation(s) are available.`,

          source:
            component.code
        });
      }
    );

  if (
    sources?.score < 50
  ) {
    warnings.push({
      code:
        "SOURCE_TRANSPARENCY_WEAK",

      severity:
        RESEARCH_WARNING_SEVERITIES
          .HIGH,

      title:
        "Research source transparency is weak",

      message:
        "Research inputs should include verified, authoritative sources.",

      source:
        "SOURCES"
    });
  }

  if (
    modelQuality?.score < 50
  ) {
    warnings.push({
      code:
        "MODEL_QUALITY_WEAK",

      severity:
        RESEARCH_WARNING_SEVERITIES
          .HIGH,

      title:
        "Valuation model quality is weak",

      message:
        "Model coverage, peer evidence, or forecast agreement is insufficient.",

      source:
        "MODEL_QUALITY"
    });
  }

  safeArray(
    consistency?.conflicts
  ).forEach(
    (conflict) => {
      warnings.push({
        ...conflict,

        title:
          String(
            conflict.code
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
            ),

        source:
          "CONSISTENCY"
      });
    }
  );

  return warnings;
}

/*
 * ============================================================
 * OVERALL RESEARCH DATA QUALITY
 * ============================================================
 */

export function buildResearchDataQualityAnalysis({
  symbol = null,
  researchData = {},
  historicalRevenue = [],
  historicalEarnings = [],
  historicalFreeCashFlow = [],
  historicalDividends = [],
  marketDataUpdatedAt = null,
  financialDataUpdatedAt = null,
  dividendDataUpdatedAt = null,
  peerDataUpdatedAt = null,
  sources = [],
  valuation = null,
  relativeValuation = null,
  forecast = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const completeness =
    buildResearchCompletenessAnalysis({
      researchData
    });

  const freshness =
    buildResearchFreshnessAnalysis({
      marketDataUpdatedAt,

      financialDataUpdatedAt,

      dividendDataUpdatedAt,

      peerDataUpdatedAt,

      policy:
        normalizedPolicy
    });

  const historical =
    buildHistoricalDataQualityAnalysis({
      historicalRevenue,

      historicalEarnings,

      historicalFreeCashFlow,

      historicalDividends,

      policy:
        normalizedPolicy
    });

  const sourceQuality =
    buildResearchSourceQualityAnalysis({
      sources
    });

  const modelQuality =
    buildValuationModelQualityAnalysis({
      valuation,

      relativeValuation,

      forecast,

      policy:
        normalizedPolicy
    });

  const consistency =
    buildResearchConsistencyAnalysis({
      valuation,

      relativeValuation,

      forecast,

      policy:
        normalizedPolicy
    });

  const components = [
    {
      code:
        "COMPLETENESS",

      score:
        completeness.score,

      weight:
        0.25
    },
    {
      code:
        "FRESHNESS",

      score:
        freshness.score,

      weight:
        0.15
    },
    {
      code:
        "HISTORICAL_DEPTH",

      score:
        historical.score,

      weight:
        0.15
    },
    {
      code:
        "SOURCE_QUALITY",

      score:
        sourceQuality.score,

      weight:
        0.15
    },
    {
      code:
        "MODEL_QUALITY",

      score:
        modelQuality.score,

      weight:
        0.2
    },
    {
      code:
        "CONSISTENCY",

      score:
        consistency.score,

      weight:
        0.1
    }
  ];

  const totalWeight =
    sum(
      components.map(
        (component) =>
          component.weight
      )
    );

  const score =
    sum(
      components.map(
        (component) =>
          number(
            component.score
          ) *
          component.weight
      )
    ) /
    totalWeight;

  const warnings =
    buildResearchWarnings({
      completeness,

      freshness,

      historical,

      sources:
        sourceQuality,

      modelQuality,

      consistency
    });

  let status =
    RESEARCH_DATA_QUALITY_STATUSES
      .AVAILABLE;

  if (
    completeness.score < 30
  ) {
    status =
      RESEARCH_DATA_QUALITY_STATUSES
        .INSUFFICIENT_DATA;
  } else if (
    freshness.status ===
    RESEARCH_DATA_QUALITY_STATUSES
      .STALE_DATA
  ) {
    status =
      RESEARCH_DATA_QUALITY_STATUSES
        .STALE_DATA;
  } else if (
    consistency.status ===
    RESEARCH_DATA_QUALITY_STATUSES
      .CONFLICTING_DATA
  ) {
    status =
      RESEARCH_DATA_QUALITY_STATUSES
        .CONFLICTING_DATA;
  } else if (
    score < 70
  ) {
    status =
      RESEARCH_DATA_QUALITY_STATUSES
        .PARTIAL;
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    symbol:
      normalizeSymbol(
        symbol
      ) ||
      null,

    status,

    score:
      roundScore(score),

    classification:
      classifyResearchDataQuality(
        score
      ),

    components,

    completeness,

    freshness,

    historical,

    sourceQuality,

    modelQuality,

    consistency,

    warnings,

    summary: {
      warningCount:
        warnings.length,

      criticalWarnings:
        warnings.filter(
          (warning) =>
            warning.severity ===
            RESEARCH_WARNING_SEVERITIES
              .CRITICAL
        ).length,

      highWarnings:
        warnings.filter(
          (warning) =>
            warning.severity ===
            RESEARCH_WARNING_SEVERITIES
              .HIGH
        ).length,

      mediumWarnings:
        warnings.filter(
          (warning) =>
            warning.severity ===
            RESEARCH_WARNING_SEVERITIES
              .MEDIUM
        ).length,

      missingFields:
        sum(
          completeness
            .components
            .map(
              (component) =>
                component
                  .missingFields
                  .length
            )
        ),

      staleComponents:
        freshness
          .staleComponents
          .length,

      sourceCount:
        sourceQuality
          .sources
          .length
    },

    message:
      `Research data quality scored ${roundScore(
        score
      )}/100 and is rated ${classifyResearchDataQuality(
        score
      ).label}.`,

    policy:
      normalizedPolicy,

    advisoryOnly:
      true
  };
}

/*
 * ============================================================
 * VALUATION CONFIDENCE
 * ============================================================
 */

export function buildValuationConfidenceAnalysis({
  valuation = null,
  relativeValuation = null,
  forecast = null,
  dataQuality = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const absoluteConfidence =
    nullableNumber(
      valuation
        ?.confidence
        ?.score
    );

  const relativeConfidence =
    nullableNumber(
      relativeValuation
        ?.confidence
        ?.score
    );

  const forecastConfidence =
    nullableNumber(
      forecast
        ?.confidence
        ?.score
    );

  const dataQualityScore =
    nullableNumber(
      dataQuality
        ?.score
    );

  const modelCoverage =
    nullableNumber(
      valuation
        ?.summary
        ?.modelCoveragePercentage
    );

  const relativeCoverage =
    nullableNumber(
      relativeValuation
        ?.summary
        ?.metricCoveragePercentage
    );

  const components = [
    {
      code:
        "ABSOLUTE_VALUATION_CONFIDENCE",

      score:
        absoluteConfidence,

      weight:
        0.25
    },
    {
      code:
        "RELATIVE_VALUATION_CONFIDENCE",

      score:
        relativeConfidence,

      weight:
        0.2
    },
    {
      code:
        "FORECAST_CONFIDENCE",

      score:
        forecastConfidence,

      weight:
        0.2
    },
    {
      code:
        "RESEARCH_DATA_QUALITY",

      score:
        dataQualityScore,

      weight:
        0.25
    },
    {
      code:
        "MODEL_COVERAGE",

      score:
        average([
          modelCoverage,
          relativeCoverage
        ]),

      weight:
        0.1
    }
  ];

  const available =
    components.filter(
      (component) =>
        component.score !==
        null &&
        component.score !==
        undefined
    );

  const totalWeight =
    sum(
      available.map(
        (component) =>
          component.weight
      )
    );

  let score =
    totalWeight > 0
      ? sum(
          available.map(
            (component) =>
              component.score *
              component.weight
          )
        ) /
        totalWeight
      : null;

  const adjustments = [];

  if (
    dataQuality
      ?.status ===
    RESEARCH_DATA_QUALITY_STATUSES
      .STALE_DATA
  ) {
    score =
      score === null
        ? null
        : score - 10;

    adjustments.push({
      code:
        "STALE_DATA_PENALTY",

      points:
        -10,

      message:
        "Valuation confidence was reduced because research data is stale."
    });
  }

  if (
    dataQuality
      ?.status ===
    RESEARCH_DATA_QUALITY_STATUSES
      .CONFLICTING_DATA
  ) {
    score =
      score === null
        ? null
        : score - 15;

    adjustments.push({
      code:
        "CONFLICTING_DATA_PENALTY",

      points:
        -15,

      message:
        "Valuation confidence was reduced because research outputs conflict."
    });
  }

  if (
    modelCoverage !== null &&
    modelCoverage <
      normalizedPolicy
        .minimumModelCoveragePercentage
  ) {
    score =
      score === null
        ? null
        : score - 10;

    adjustments.push({
      code:
        "LOW_MODEL_COVERAGE",

      points:
        -10,

      message:
        "Valuation confidence was reduced because too few models were available."
    });
  }

  const finalScore =
    score === null
      ? null
      : roundScore(score);

  return {
    status:
      finalScore === null
        ? RESEARCH_DATA_QUALITY_STATUSES
            .INSUFFICIENT_DATA
        : RESEARCH_DATA_QUALITY_STATUSES
            .AVAILABLE,

    score:
      finalScore,

    classification:
      classifyValuationConfidence(
        finalScore
      ),

    availableComponents:
      available.length,

    totalComponents:
      components.length,

    availableWeightPercentage:
      roundPercent(
        totalWeight * 100
      ),

    components,

    adjustments
  };
}

/*
 * ============================================================
 * COMPLETE RESEARCH CONFIDENCE
 * ============================================================
 */

export function buildResearchConfidenceAnalysis({
  symbol = null,
  researchData = {},
  historicalRevenue = [],
  historicalEarnings = [],
  historicalFreeCashFlow = [],
  historicalDividends = [],
  marketDataUpdatedAt = null,
  financialDataUpdatedAt = null,
  dividendDataUpdatedAt = null,
  peerDataUpdatedAt = null,
  sources = [],
  valuation = null,
  relativeValuation = null,
  forecast = null,
  policy = {}
} = {}) {
  const dataQuality =
    buildResearchDataQualityAnalysis({
      symbol,

      researchData,

      historicalRevenue,

      historicalEarnings,

      historicalFreeCashFlow,

      historicalDividends,

      marketDataUpdatedAt,

      financialDataUpdatedAt,

      dividendDataUpdatedAt,

      peerDataUpdatedAt,

      sources,

      valuation,

      relativeValuation,

      forecast,

      policy
    });

  const valuationConfidence =
    buildValuationConfidenceAnalysis({
      valuation,

      relativeValuation,

      forecast,

      dataQuality,

      policy
    });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    symbol:
      normalizeSymbol(
        symbol
      ) ||
      null,

    status:
      dataQuality.status,

    researchQuality:
      dataQuality,

    valuationConfidence,

    overallScore:
      roundScore(
        average([
          dataQuality.score,
          valuationConfidence.score
        ]) ||
        0
      ),

    overallClassification:
      classifyResearchDataQuality(
        average([
          dataQuality.score,
          valuationConfidence.score
        ])
      ),

    warnings:
      dataQuality.warnings,

    message:
      `Research confidence for ${normalizeSymbol(
        symbol
      ) || "the security"} is ${valuationConfidence.classification.label.toLowerCase()} at ${valuationConfidence.score ?? 0}%.`,

    advisoryOnly:
      true
  };
}

/*
 * ============================================================
 * BATCH ANALYSIS
 * ============================================================
 */

export function buildResearchConfidenceBatch({
  securities = [],
  inputBuilder = null,
  policy = {}
} = {}) {
  const results =
    safeArray(securities).map(
      (security) => {
        const additionalInputs =
          typeof inputBuilder ===
            "function"
            ? inputBuilder(
                security
              ) || {}
            : {};

        return buildResearchConfidenceAnalysis({
          ...security,

          ...additionalInputs,

          policy
        });
      }
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      results.length
        ? RESEARCH_DATA_QUALITY_STATUSES
            .AVAILABLE
        : RESEARCH_DATA_QUALITY_STATUSES
            .INSUFFICIENT_DATA,

    total:
      results.length,

    averageResearchQualityScore:
      roundPercent(
        average(
          results.map(
            (result) =>
              result
                ?.researchQuality
                ?.score
          )
        )
      ),

    averageValuationConfidenceScore:
      roundPercent(
        average(
          results.map(
            (result) =>
              result
                ?.valuationConfidence
                ?.score
          )
        )
      ),

    results:
      results.sort(
        (first, second) =>
          number(
            second
              ?.overallScore
          ) -
          number(
            first
              ?.overallScore
          )
      )
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export function loadHighestResearchQuality(
  results = [],
  limit = 5
) {
  return safeArray(results)
    .sort(
      (first, second) =>
        number(
          second
            ?.researchQuality
            ?.score
        ) -
        number(
          first
            ?.researchQuality
            ?.score
        )
    )
    .slice(
      0,
      Math.max(
        Math.floor(
          number(limit)
        ),
        0
      )
    );
}

export function loadLowestResearchQuality(
  results = [],
  limit = 5
) {
  return safeArray(results)
    .sort(
      (first, second) =>
        number(
          first
            ?.researchQuality
            ?.score
        ) -
        number(
          second
            ?.researchQuality
            ?.score
        )
    )
    .slice(
      0,
      Math.max(
        Math.floor(
          number(limit)
        ),
        0
      )
    );
}

export function loadHighestValuationConfidence(
  results = [],
  limit = 5
) {
  return safeArray(results)
    .sort(
      (first, second) =>
        number(
          second
            ?.valuationConfidence
            ?.score
        ) -
        number(
          first
            ?.valuationConfidence
            ?.score
        )
    )
    .slice(
      0,
      Math.max(
        Math.floor(
          number(limit)
        ),
        0
      )
    );
}

export function loadResearchWarnings(
  result
) {
  return safeArray(
    result?.warnings
  );
}

export function loadHighPriorityResearchWarnings(
  result
) {
  return safeArray(
    result?.warnings
  ).filter(
    (warning) =>
      [
        RESEARCH_WARNING_SEVERITIES
          .CRITICAL,
        RESEARCH_WARNING_SEVERITIES
          .HIGH
      ].includes(
        warning?.severity
      )
  );
}

export function buildResearchConfidenceSummary(
  result
) {
  return {
    symbol:
      result?.symbol ||
      null,

    status:
      result?.status ||
      RESEARCH_DATA_QUALITY_STATUSES
        .INSUFFICIENT_DATA,

    researchQualityScore:
      result
        ?.researchQuality
        ?.score ??
      null,

    researchQuality:
      result
        ?.researchQuality
        ?.classification
        ?.label ||
      "Not Rated",

    valuationConfidenceScore:
      result
        ?.valuationConfidence
        ?.score ??
      null,

    valuationConfidence:
      result
        ?.valuationConfidence
        ?.classification
        ?.label ||
      "Not Available",

    overallScore:
      result
        ?.overallScore ??
      null,

    overallClassification:
      result
        ?.overallClassification
        ?.label ||
      "Not Rated",

    warningCount:
      result
        ?.warnings
        ?.length ||
      0,

    message:
      result?.message ||
      "No research confidence summary is available."
  };
}
