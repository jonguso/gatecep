/*
 * ============================================================
 * PC-023B5
 * COACH G INVESTMENT THESIS ENGINE
 * ============================================================
 *
 * Converts:
 *
 * - absolute valuation,
 * - relative valuation,
 * - growth and income forecasts,
 * - research confidence,
 * - data-quality warnings,
 * - risk evidence,
 * - dividend sustainability,
 * - expected total return,
 * - peer ranking,
 * - price levels
 *
 * into a structured, explainable investment thesis.
 *
 * Outputs:
 *
 * - overall thesis score,
 * - thesis classification,
 * - conviction level,
 * - investment posture,
 * - bull case,
 * - bear case,
 * - catalysts,
 * - risks,
 * - valuation conclusion,
 * - growth conclusion,
 * - income conclusion,
 * - confidence conclusion,
 * - action conditions,
 * - invalidation conditions,
 * - plain-language Coach G narrative.
 *
 * Safeguards:
 *
 * - advisory only,
 * - does not execute trades,
 * - does not modify holdings or cash,
 * - does not fabricate missing data,
 * - excludes unsupported conclusions,
 * - records limitations and warnings.
 * ============================================================
 */

export const INVESTMENT_THESIS_STATUSES = {
  AVAILABLE: "AVAILABLE",
  PARTIAL: "PARTIAL",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  CONFLICTING_EVIDENCE: "CONFLICTING_EVIDENCE",
  HIGH_RISK_REVIEW: "HIGH_RISK_REVIEW",
  NOT_READY: "NOT_READY"
};

export const INVESTMENT_THESIS_CLASSIFICATIONS = {
  VERY_ATTRACTIVE: "VERY_ATTRACTIVE",
  ATTRACTIVE: "ATTRACTIVE",
  MODERATELY_ATTRACTIVE: "MODERATELY_ATTRACTIVE",
  BALANCED: "BALANCED",
  CAUTIOUS: "CAUTIOUS",
  UNATTRACTIVE: "UNATTRACTIVE",
  HIGH_RISK: "HIGH_RISK",
  NOT_RATED: "NOT_RATED"
};

export const INVESTMENT_THESIS_ACTIONS = {
  STRONG_BUY_REVIEW: "STRONG_BUY_REVIEW",
  BUY_REVIEW: "BUY_REVIEW",
  ACCUMULATE_SELECTIVELY: "ACCUMULATE_SELECTIVELY",
  HOLD_AND_MONITOR: "HOLD_AND_MONITOR",
  WAIT_FOR_BETTER_PRICE: "WAIT_FOR_BETTER_PRICE",
  REDUCE_OR_AVOID: "REDUCE_OR_AVOID",
  IMMEDIATE_RISK_REVIEW: "IMMEDIATE_RISK_REVIEW",
  BUILD_MORE_EVIDENCE: "BUILD_MORE_EVIDENCE"
};

export const INVESTMENT_CONVICTION_LEVELS = {
  VERY_HIGH: "VERY_HIGH",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  VERY_LOW: "VERY_LOW",
  NOT_AVAILABLE: "NOT_AVAILABLE"
};

export const INVESTMENT_THESIS_SIGNAL_TYPES = {
  POSITIVE: "POSITIVE",
  NEGATIVE: "NEGATIVE",
  NEUTRAL: "NEUTRAL",
  WARNING: "WARNING",
  CATALYST: "CATALYST",
  RISK: "RISK",
  LIMITATION: "LIMITATION"
};

export const INVESTMENT_THESIS_SEVERITIES = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INFO: "INFO"
};

export const DEFAULT_INVESTMENT_THESIS_POLICY = {
  minimumResearchConfidencePercentage: 35,
  preferredResearchConfidencePercentage: 70,
  minimumValuationUpsidePercentage: 10,
  strongValuationUpsidePercentage: 30,
  minimumExpectedTotalReturnCagrPercentage: 8,
  strongExpectedTotalReturnCagrPercentage: 15,
  minimumEarningsGrowthPercentage: 5,
  strongEarningsGrowthPercentage: 12,
  minimumDividendYieldPercentage: 3,
  strongDividendYieldPercentage: 6,
  maximumAcceptableRiskScore: 55,
  preferredRiskScore: 70,
  maximumHighPriorityWarnings: 3,
  minimumEvidenceCoveragePercentage: 35,
  preferredEvidenceCoveragePercentage: 70
};

const DEFAULT_COMPONENT_WEIGHTS = {
  VALUATION: 0.26,
  RELATIVE_VALUATION: 0.14,
  GROWTH: 0.17,
  TOTAL_RETURN: 0.14,
  INCOME: 0.09,
  QUALITY: 0.08,
  RISK: 0.07,
  RESEARCH_CONFIDENCE: 0.05
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

function roundMoney(value) {
  const parsed =
    nullableNumber(value);

  return parsed === null
    ? null
    : Number(
        parsed.toFixed(2)
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

function normalizeText(value) {
  return String(value || "")
    .trim();
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

function formatLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
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
      normalizeStatus(value)
    ]
  );
}

function normalizePolicy(policy = {}) {
  return {
    minimumResearchConfidencePercentage:
      clamp(
        policy
          ?.minimumResearchConfidencePercentage ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .minimumResearchConfidencePercentage,
        0,
        100
      ),

    preferredResearchConfidencePercentage:
      clamp(
        policy
          ?.preferredResearchConfidencePercentage ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .preferredResearchConfidencePercentage,
        0,
        100
      ),

    minimumValuationUpsidePercentage:
      number(
        policy
          ?.minimumValuationUpsidePercentage ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .minimumValuationUpsidePercentage
      ),

    strongValuationUpsidePercentage:
      number(
        policy
          ?.strongValuationUpsidePercentage ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .strongValuationUpsidePercentage
      ),

    minimumExpectedTotalReturnCagrPercentage:
      number(
        policy
          ?.minimumExpectedTotalReturnCagrPercentage ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .minimumExpectedTotalReturnCagrPercentage
      ),

    strongExpectedTotalReturnCagrPercentage:
      number(
        policy
          ?.strongExpectedTotalReturnCagrPercentage ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .strongExpectedTotalReturnCagrPercentage
      ),

    minimumEarningsGrowthPercentage:
      number(
        policy
          ?.minimumEarningsGrowthPercentage ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .minimumEarningsGrowthPercentage
      ),

    strongEarningsGrowthPercentage:
      number(
        policy
          ?.strongEarningsGrowthPercentage ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .strongEarningsGrowthPercentage
      ),

    minimumDividendYieldPercentage:
      number(
        policy
          ?.minimumDividendYieldPercentage ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .minimumDividendYieldPercentage
      ),

    strongDividendYieldPercentage:
      number(
        policy
          ?.strongDividendYieldPercentage ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .strongDividendYieldPercentage
      ),

    maximumAcceptableRiskScore:
      clamp(
        policy
          ?.maximumAcceptableRiskScore ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .maximumAcceptableRiskScore,
        0,
        100
      ),

    preferredRiskScore:
      clamp(
        policy
          ?.preferredRiskScore ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .preferredRiskScore,
        0,
        100
      ),

    maximumHighPriorityWarnings:
      Math.max(
        Math.floor(
          number(
            policy
              ?.maximumHighPriorityWarnings ??
            DEFAULT_INVESTMENT_THESIS_POLICY
              .maximumHighPriorityWarnings
          )
        ),
        0
      ),

    minimumEvidenceCoveragePercentage:
      clamp(
        policy
          ?.minimumEvidenceCoveragePercentage ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .minimumEvidenceCoveragePercentage,
        0,
        100
      ),

    preferredEvidenceCoveragePercentage:
      clamp(
        policy
          ?.preferredEvidenceCoveragePercentage ??
        DEFAULT_INVESTMENT_THESIS_POLICY
          .preferredEvidenceCoveragePercentage,
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

export function classifyInvestmentConviction(
  percentage
) {
  const value =
    nullableNumber(percentage);

  if (value === null) {
    return {
      code:
        INVESTMENT_CONVICTION_LEVELS
          .NOT_AVAILABLE,

      label:
        "Not Available"
    };
  }

  if (value >= 85) {
    return {
      code:
        INVESTMENT_CONVICTION_LEVELS
          .VERY_HIGH,

      label:
        "Very High"
    };
  }

  if (value >= 70) {
    return {
      code:
        INVESTMENT_CONVICTION_LEVELS
          .HIGH,

      label:
        "High"
    };
  }

  if (value >= 50) {
    return {
      code:
        INVESTMENT_CONVICTION_LEVELS
          .MEDIUM,

      label:
        "Medium"
    };
  }

  if (value >= 25) {
    return {
      code:
        INVESTMENT_CONVICTION_LEVELS
          .LOW,

      label:
        "Low"
    };
  }

  return {
    code:
      INVESTMENT_CONVICTION_LEVELS
        .VERY_LOW,

    label:
      "Very Low"
  };
}

export function classifyInvestmentThesis(
  score
) {
  const value =
    nullableNumber(score);

  if (value === null) {
    return {
      code:
        INVESTMENT_THESIS_CLASSIFICATIONS
          .NOT_RATED,

      label:
        "Not Rated",

      action:
        INVESTMENT_THESIS_ACTIONS
          .BUILD_MORE_EVIDENCE,

      description:
        "Insufficient research evidence is available."
    };
  }

  if (value >= 88) {
    return {
      code:
        INVESTMENT_THESIS_CLASSIFICATIONS
          .VERY_ATTRACTIVE,

      label:
        "Very Attractive",

      action:
        INVESTMENT_THESIS_ACTIONS
          .STRONG_BUY_REVIEW,

      description:
        "Valuation, expected return, growth, and research evidence are strongly favorable."
    };
  }

  if (value >= 78) {
    return {
      code:
        INVESTMENT_THESIS_CLASSIFICATIONS
          .ATTRACTIVE,

      label:
        "Attractive",

      action:
        INVESTMENT_THESIS_ACTIONS
          .BUY_REVIEW,

      description:
        "The investment has an attractive balance of valuation, quality, and expected return."
    };
  }

  if (value >= 68) {
    return {
      code:
        INVESTMENT_THESIS_CLASSIFICATIONS
          .MODERATELY_ATTRACTIVE,

      label:
        "Moderately Attractive",

      action:
        INVESTMENT_THESIS_ACTIONS
          .ACCUMULATE_SELECTIVELY,

      description:
        "The investment is attractive but should be accumulated selectively."
    };
  }

  if (value >= 56) {
    return {
      code:
        INVESTMENT_THESIS_CLASSIFICATIONS
          .BALANCED,

      label:
        "Balanced",

      action:
        INVESTMENT_THESIS_ACTIONS
          .HOLD_AND_MONITOR,

      description:
        "Positive and negative evidence is reasonably balanced."
    };
  }

  if (value >= 44) {
    return {
      code:
        INVESTMENT_THESIS_CLASSIFICATIONS
          .CAUTIOUS,

      label:
        "Cautious",

      action:
        INVESTMENT_THESIS_ACTIONS
          .WAIT_FOR_BETTER_PRICE,

      description:
        "The investment requires caution, stronger evidence, or a better entry price."
    };
  }

  if (value >= 30) {
    return {
      code:
        INVESTMENT_THESIS_CLASSIFICATIONS
          .UNATTRACTIVE,

      label:
        "Unattractive",

      action:
        INVESTMENT_THESIS_ACTIONS
          .REDUCE_OR_AVOID,

      description:
        "Valuation, growth, quality, or risk evidence is unfavorable."
    };
  }

  return {
    code:
      INVESTMENT_THESIS_CLASSIFICATIONS
        .HIGH_RISK,

    label:
      "High Risk",

    action:
      INVESTMENT_THESIS_ACTIONS
        .IMMEDIATE_RISK_REVIEW,

    description:
      "The investment requires immediate risk review before additional capital is committed."
  };
}

/*
 * ============================================================
 * SIGNAL BUILDERS
 * ============================================================
 */

function buildSignal({
  code,
  type,
  title,
  message,
  score = null,
  severity = null,
  source = null,
  data = null
}) {
  return {
    code,

    type,

    title,

    message,

    score:
      nullableNumber(score),

    severity:
      severity ||
      (
        type ===
        INVESTMENT_THESIS_SIGNAL_TYPES
          .RISK
          ? INVESTMENT_THESIS_SEVERITIES
              .HIGH
          : INVESTMENT_THESIS_SEVERITIES
              .LOW
      ),

    source,

    data
  };
}

function deduplicateSignals(
  signals = []
) {
  const map =
    new Map();

  safeArray(signals).forEach(
    (signal) => {
      const key =
        `${signal?.type || "SIGNAL"}-${signal?.code || signal?.title}`;

      if (!map.has(key)) {
        map.set(
          key,
          signal
        );
      }
    }
  );

  return Array.from(
    map.values()
  );
}

/*
 * ============================================================
 * VALUATION CONCLUSION
 * ============================================================
 */

export function buildValuationConclusion({
  valuation = null,
  relativeValuation = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const absoluteUpside =
    nullableNumber(
      valuation
        ?.classification
        ?.upsidePercentage
    );

  const relativeUpside =
    nullableNumber(
      relativeValuation
        ?.classification
        ?.upsidePercentage
    );

  const absoluteFairValue =
    nullableNumber(
      valuation?.fairValue
    );

  const relativeFairValue =
    nullableNumber(
      relativeValuation
        ?.fairValue
    );

  const currentPrice =
    nullableNumber(
      valuation?.currentPrice ??
      relativeValuation?.currentPrice
    );

  const blendedFairValue =
    average([
      absoluteFairValue,
      relativeFairValue
    ]);

  const blendedUpside =
    currentPrice !== null &&
    currentPrice > 0 &&
    blendedFairValue !== null
      ? (
          (
            blendedFairValue -
            currentPrice
          ) /
          currentPrice
        ) *
        100
      : average([
          absoluteUpside,
          relativeUpside
        ]);

  let score = null;

  if (blendedUpside !== null) {
    if (
      blendedUpside >=
      normalizedPolicy
        .strongValuationUpsidePercentage
    ) {
      score = 95;
    } else if (
      blendedUpside >=
      normalizedPolicy
        .minimumValuationUpsidePercentage
    ) {
      score =
        75 +
        Math.min(
          blendedUpside -
          normalizedPolicy
            .minimumValuationUpsidePercentage,
          20
        );
    } else if (
      blendedUpside >= -10
    ) {
      score = 55;
    } else if (
      blendedUpside >= -25
    ) {
      score = 35;
    } else {
      score = 15;
    }
  }

  const signals = [];

  if (
    blendedUpside !== null &&
    blendedUpside >=
      normalizedPolicy
        .strongValuationUpsidePercentage
  ) {
    signals.push(
      buildSignal({
        code:
          "STRONG_VALUATION_UPSIDE",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .POSITIVE,

        title:
          "Strong valuation upside",

        message:
          `Blended estimated upside is approximately ${roundPercent(
            blendedUpside
          )}%.`,

        score:
          95,

        source:
          "VALUATION"
      })
    );
  } else if (
    blendedUpside !== null &&
    blendedUpside >=
      normalizedPolicy
        .minimumValuationUpsidePercentage
  ) {
    signals.push(
      buildSignal({
        code:
          "POSITIVE_VALUATION_UPSIDE",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .POSITIVE,

        title:
          "Positive valuation upside",

        message:
          `Blended estimated upside is approximately ${roundPercent(
            blendedUpside
          )}%.`,

        score:
          score,

        source:
          "VALUATION"
      })
    );
  } else if (
    blendedUpside !== null &&
    blendedUpside < -10
  ) {
    signals.push(
      buildSignal({
        code:
          "VALUATION_DOWNSIDE",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .NEGATIVE,

        title:
          "Valuation downside",

        message:
          `Blended estimated downside is approximately ${Math.abs(
            roundPercent(
              blendedUpside
            )
          )}%.`,

        score:
          score,

        severity:
          blendedUpside < -25
            ? INVESTMENT_THESIS_SEVERITIES
                .HIGH
            : INVESTMENT_THESIS_SEVERITIES
                .MEDIUM,

        source:
          "VALUATION"
      })
    );
  }

  const absoluteClass =
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

  const conflicting =
    (
      absoluteClass.includes(
        "UNDERVALUED"
      ) &&
      relativeClass.includes(
        "OVERVALUED"
      )
    ) ||
    (
      absoluteClass.includes(
        "OVERVALUED"
      ) &&
      relativeClass.includes(
        "UNDERVALUED"
      )
    );

  if (conflicting) {
    signals.push(
      buildSignal({
        code:
          "VALUATION_MODEL_CONFLICT",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .WARNING,

        title:
          "Valuation models disagree",

        message:
          "Absolute and relative valuation evidence points in different directions.",

        severity:
          INVESTMENT_THESIS_SEVERITIES
            .HIGH,

        source:
          "VALUATION"
      })
    );
  }

  return {
    score:
      score === null
        ? null
        : roundScore(score),

    currentPrice:
      roundMoney(currentPrice),

    absoluteFairValue:
      roundMoney(
        absoluteFairValue
      ),

    relativeFairValue:
      roundMoney(
        relativeFairValue
      ),

    blendedFairValue:
      roundMoney(
        blendedFairValue
      ),

    blendedUpsidePercentage:
      roundPercent(
        blendedUpside
      ),

    conflicting,

    signals,

    message:
      blendedFairValue === null
        ? "Insufficient valuation evidence is available."
        : `Blended fair value is approximately KES ${roundMoney(
            blendedFairValue
          ).toLocaleString(
            "en-US",
            {
              minimumFractionDigits:
                2,

              maximumFractionDigits:
                2
            }
          )}, implying ${roundPercent(
            blendedUpside
          )}% upside or downside.`
  };
}

/*
 * ============================================================
 * GROWTH CONCLUSION
 * ============================================================
 */

export function buildGrowthConclusion({
  forecast = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const revenueGrowth =
    nullableNumber(
      forecast
        ?.expected
        ?.revenueCagrPercentage
    );

  const earningsGrowth =
    nullableNumber(
      forecast
        ?.expected
        ?.earningsCagrPercentage
    );

  const freeCashFlowGrowth =
    nullableNumber(
      forecast
        ?.expected
        ?.freeCashFlowCagrPercentage
    );

  const growthAverage =
    average([
      revenueGrowth,
      earningsGrowth,
      freeCashFlowGrowth
    ]);

  let score = null;

  if (growthAverage !== null) {
    if (
      growthAverage >=
      normalizedPolicy
        .strongEarningsGrowthPercentage
    ) {
      score = 90;
    } else if (
      growthAverage >=
      normalizedPolicy
        .minimumEarningsGrowthPercentage
    ) {
      score =
        65 +
        Math.min(
          (
            growthAverage -
            normalizedPolicy
              .minimumEarningsGrowthPercentage
          ) *
          2,
          20
        );
    } else if (
      growthAverage >= 0
    ) {
      score = 50;
    } else if (
      growthAverage >= -10
    ) {
      score = 30;
    } else {
      score = 15;
    }
  }

  const signals = [];

  if (
    earningsGrowth !== null &&
    earningsGrowth >=
      normalizedPolicy
        .strongEarningsGrowthPercentage
  ) {
    signals.push(
      buildSignal({
        code:
          "STRONG_EARNINGS_GROWTH",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .POSITIVE,

        title:
          "Strong expected earnings growth",

        message:
          `Expected earnings CAGR is approximately ${roundPercent(
            earningsGrowth
          )}%.`,

        score:
          90,

        source:
          "FORECAST"
      })
    );
  } else if (
    earningsGrowth !== null &&
    earningsGrowth <
      normalizedPolicy
        .minimumEarningsGrowthPercentage
  ) {
    signals.push(
      buildSignal({
        code:
          "WEAK_EARNINGS_GROWTH",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .NEGATIVE,

        title:
          "Weak expected earnings growth",

        message:
          `Expected earnings CAGR is approximately ${roundPercent(
            earningsGrowth
          )}%.`,

        score:
          score,

        severity:
          earningsGrowth < 0
            ? INVESTMENT_THESIS_SEVERITIES
                .HIGH
            : INVESTMENT_THESIS_SEVERITIES
                .MEDIUM,

        source:
          "FORECAST"
      })
    );
  }

  if (
    freeCashFlowGrowth !== null &&
    earningsGrowth !== null &&
    freeCashFlowGrowth <
      earningsGrowth - 5
  ) {
    signals.push(
      buildSignal({
        code:
          "CASH_FLOW_LAGS_EARNINGS",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .WARNING,

        title:
          "Cash-flow growth lags earnings",

        message:
          "Free-cash-flow growth is materially below expected earnings growth.",

        severity:
          INVESTMENT_THESIS_SEVERITIES
            .MEDIUM,

        source:
          "FORECAST"
      })
    );
  }

  return {
    score:
      score === null
        ? null
        : roundScore(score),

    revenueGrowthPercentage:
      roundPercent(
        revenueGrowth
      ),

    earningsGrowthPercentage:
      roundPercent(
        earningsGrowth
      ),

    freeCashFlowGrowthPercentage:
      roundPercent(
        freeCashFlowGrowth
      ),

    averageGrowthPercentage:
      roundPercent(
        growthAverage
      ),

    signals,

    message:
      growthAverage === null
        ? "Insufficient growth evidence is available."
        : `Expected average operating growth is approximately ${roundPercent(
            growthAverage
          )}%.`
  };
}

/*
 * ============================================================
 * TOTAL RETURN CONCLUSION
 * ============================================================
 */

export function buildExpectedReturnConclusion({
  forecast = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const priceCagr =
    nullableNumber(
      forecast
        ?.expected
        ?.priceCagrPercentage
    );

  const totalReturnCagr =
    nullableNumber(
      forecast
        ?.expected
        ?.totalReturnCagrPercentage
    );

  let score = null;

  if (totalReturnCagr !== null) {
    if (
      totalReturnCagr >=
      normalizedPolicy
        .strongExpectedTotalReturnCagrPercentage
    ) {
      score = 95;
    } else if (
      totalReturnCagr >=
      normalizedPolicy
        .minimumExpectedTotalReturnCagrPercentage
    ) {
      score =
        70 +
        Math.min(
          (
            totalReturnCagr -
            normalizedPolicy
              .minimumExpectedTotalReturnCagrPercentage
          ) *
          2,
          20
        );
    } else if (
      totalReturnCagr >= 0
    ) {
      score = 50;
    } else {
      score = 20;
    }
  }

  const signals = [];

  if (
    totalReturnCagr !== null &&
    totalReturnCagr >=
      normalizedPolicy
        .strongExpectedTotalReturnCagrPercentage
  ) {
    signals.push(
      buildSignal({
        code:
          "STRONG_EXPECTED_TOTAL_RETURN",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .POSITIVE,

        title:
          "Strong expected total return",

        message:
          `Base-case expected total-return CAGR is approximately ${roundPercent(
            totalReturnCagr
          )}%.`,

        score:
          95,

        source:
          "FORECAST"
      })
    );
  } else if (
    totalReturnCagr !== null &&
    totalReturnCagr <
      normalizedPolicy
        .minimumExpectedTotalReturnCagrPercentage
  ) {
    signals.push(
      buildSignal({
        code:
          "LOW_EXPECTED_TOTAL_RETURN",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .NEGATIVE,

        title:
          "Expected return is below target",

        message:
          `Base-case expected total-return CAGR is approximately ${roundPercent(
            totalReturnCagr
          )}%.`,

        score,

        severity:
          INVESTMENT_THESIS_SEVERITIES
            .MEDIUM,

        source:
          "FORECAST"
      })
    );
  }

  return {
    score:
      score === null
        ? null
        : roundScore(score),

    priceCagrPercentage:
      roundPercent(
        priceCagr
      ),

    totalReturnCagrPercentage:
      roundPercent(
        totalReturnCagr
      ),

    signals,

    message:
      totalReturnCagr === null
        ? "Expected total return is not available."
        : `Base-case expected total-return CAGR is approximately ${roundPercent(
            totalReturnCagr
          )}%.`
  };
}

/*
 * ============================================================
 * INCOME CONCLUSION
 * ============================================================
 */

export function buildIncomeConclusion({
  valuation = null,
  forecast = null,
  dividendYieldPercentage = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const yieldPercentage =
    nullableNumber(
      dividendYieldPercentage ??
      valuation
        ?.assumptions
        ?.dividendYieldPercentage
    );

  const dividendGrowth =
    nullableNumber(
      forecast
        ?.expected
        ?.dividendCagrPercentage
    );

  const sustainabilityScore =
    nullableNumber(
      forecast
        ?.forecast
        ?.dividends
        ?.sustainability
        ?.score
    );

  const sustainabilityLabel =
    forecast
      ?.forecast
      ?.dividends
      ?.sustainability
      ?.classification
      ?.label ||
    "Not Rated";

  const yieldScore =
    yieldPercentage === null
      ? null
      : yieldPercentage >=
          normalizedPolicy
            .strongDividendYieldPercentage
        ? 95
        : yieldPercentage >=
            normalizedPolicy
              .minimumDividendYieldPercentage
          ? 75
          : yieldPercentage > 0
            ? 50
            : 20;

  const score =
    average([
      yieldScore,
      dividendGrowth === null
        ? null
        : dividendGrowth >= 8
          ? 90
          : dividendGrowth >= 3
            ? 70
            : dividendGrowth >= 0
              ? 50
              : 20,
      sustainabilityScore
    ]);

  const signals = [];

  if (
    yieldPercentage !== null &&
    yieldPercentage >=
      normalizedPolicy
        .strongDividendYieldPercentage
  ) {
    signals.push(
      buildSignal({
        code:
          "STRONG_DIVIDEND_YIELD",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .POSITIVE,

        title:
          "Strong dividend yield",

        message:
          `Dividend yield is approximately ${roundPercent(
            yieldPercentage
          )}%.`,

        score:
          95,

        source:
          "DIVIDENDS"
      })
    );
  }

  const sustainabilityCode =
    normalizeStatus(
      forecast
        ?.forecast
        ?.dividends
        ?.sustainability
        ?.classification
        ?.code
    );

  if (
    [
      "WEAK",
      "UNSUSTAINABLE"
    ].includes(
      sustainabilityCode
    )
  ) {
    signals.push(
      buildSignal({
        code:
          "DIVIDEND_SUSTAINABILITY_CONCERN",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .RISK,

        title:
          "Dividend sustainability concern",

        message:
          `Dividend sustainability is rated ${sustainabilityLabel}.`,

        score:
          sustainabilityScore,

        severity:
          sustainabilityCode ===
            "UNSUSTAINABLE"
            ? INVESTMENT_THESIS_SEVERITIES
                .HIGH
            : INVESTMENT_THESIS_SEVERITIES
                .MEDIUM,

        source:
          "DIVIDENDS"
      })
    );
  }

  return {
    score:
      score === null
        ? null
        : roundScore(score),

    dividendYieldPercentage:
      roundPercent(
        yieldPercentage
      ),

    dividendGrowthPercentage:
      roundPercent(
        dividendGrowth
      ),

    sustainabilityScore:
      sustainabilityScore === null
        ? null
        : roundScore(
            sustainabilityScore
          ),

    sustainability:
      sustainabilityLabel,

    signals,

    message:
      yieldPercentage === null
        ? "Dividend income evidence is incomplete."
        : `Dividend yield is approximately ${roundPercent(
            yieldPercentage
          )}% and sustainability is rated ${sustainabilityLabel}.`
  };
}

/*
 * ============================================================
 * QUALITY AND RISK CONCLUSIONS
 * ============================================================
 */

export function buildQualityConclusion({
  investmentScore = null,
  qualityScore = null,
  relativeQualityScore = null,
  peerRank = null,
  totalPeers = null
} = {}) {
  const score =
    average([
      investmentScore,
      qualityScore,
      relativeQualityScore
    ]);

  const signals = [];

  if (
    score !== null &&
    score >= 75
  ) {
    signals.push(
      buildSignal({
        code:
          "STRONG_BUSINESS_QUALITY",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .POSITIVE,

        title:
          "Strong business quality",

        message:
          `Combined quality evidence scored ${roundScore(
            score
          )}/100.`,

        score,

        source:
          "QUALITY"
      })
    );
  } else if (
    score !== null &&
    score < 50
  ) {
    signals.push(
      buildSignal({
        code:
          "WEAK_BUSINESS_QUALITY",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .NEGATIVE,

        title:
          "Business quality requires review",

        message:
          `Combined quality evidence scored ${roundScore(
            score
          )}/100.`,

        score,

        severity:
          INVESTMENT_THESIS_SEVERITIES
            .HIGH,

        source:
          "QUALITY"
      })
    );
  }

  if (
    peerRank !== null &&
    totalPeers !== null &&
    peerRank <=
      Math.max(
        Math.ceil(
          totalPeers * 0.25
        ),
        1
      )
  ) {
    signals.push(
      buildSignal({
        code:
          "TOP_QUARTILE_PEER_RANK",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .POSITIVE,

        title:
          "Top-quartile peer ranking",

        message:
          `The security ranks ${peerRank} of ${totalPeers} in its peer group.`,

        source:
          "PEERS"
      })
    );
  }

  return {
    score:
      score === null
        ? null
        : roundScore(score),

    peerRank,

    totalPeers,

    signals,

    message:
      score === null
        ? "Business-quality evidence is incomplete."
        : `Combined quality evidence scored ${roundScore(
            score
          )}/100.`
  };
}

export function buildRiskConclusion({
  riskScore = null,
  volatilityPercentage = null,
  drawdownPercentage = null,
  stressLossPercentage = null,
  warningCount = 0,
  highPriorityWarnings = 0,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const parsedRiskScore =
    nullableNumber(riskScore);

  let score =
    parsedRiskScore;

  const adjustments = [];

  if (
    nullableNumber(
      volatilityPercentage
    ) !== null &&
    number(
      volatilityPercentage
    ) >= 35
  ) {
    score =
      score === null
        ? 35
        : score - 15;

    adjustments.push({
      code:
        "HIGH_VOLATILITY",

      points:
        -15
    });
  }

  if (
    nullableNumber(
      drawdownPercentage
    ) !== null &&
    Math.abs(
      number(
        drawdownPercentage
      )
    ) >= 30
  ) {
    score =
      score === null
        ? 30
        : score - 15;

    adjustments.push({
      code:
        "SEVERE_DRAWDOWN",

      points:
        -15
    });
  }

  if (
    nullableNumber(
      stressLossPercentage
    ) !== null &&
    Math.abs(
      number(
        stressLossPercentage
      )
    ) >= 30
  ) {
    score =
      score === null
        ? 30
        : score - 15;

    adjustments.push({
      code:
        "SEVERE_STRESS_LOSS",

      points:
        -15
    });
  }

  score =
    score === null
      ? null
      : roundScore(score);

  const signals = [];

  if (
    score !== null &&
    score >=
      normalizedPolicy
        .preferredRiskScore
  ) {
    signals.push(
      buildSignal({
        code:
          "RISK_PROFILE_ACCEPTABLE",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .POSITIVE,

        title:
          "Risk profile is acceptable",

        message:
          `Risk evidence scored ${score}/100.`,

        score,

        source:
          "RISK"
      })
    );
  } else if (
    score !== null &&
    score <
      normalizedPolicy
        .maximumAcceptableRiskScore
  ) {
    signals.push(
      buildSignal({
        code:
          "RISK_PROFILE_WEAK",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .RISK,

        title:
          "Risk profile requires review",

        message:
          `Risk evidence scored ${score}/100.`,

        score,

        severity:
          score < 35
            ? INVESTMENT_THESIS_SEVERITIES
                .CRITICAL
            : INVESTMENT_THESIS_SEVERITIES
                .HIGH,

        source:
          "RISK"
      })
    );
  }

  if (
    highPriorityWarnings >
    normalizedPolicy
      .maximumHighPriorityWarnings
  ) {
    signals.push(
      buildSignal({
        code:
          "EXCESS_HIGH_PRIORITY_WARNINGS",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .RISK,

        title:
          "Multiple high-priority warnings",

        message:
          `${highPriorityWarnings} high-priority research warning(s) are active.`,

        severity:
          INVESTMENT_THESIS_SEVERITIES
            .HIGH,

        source:
          "RESEARCH"
      })
    );
  }

  return {
    score,

    volatilityPercentage:
      roundPercent(
        volatilityPercentage
      ),

    drawdownPercentage:
      roundPercent(
        drawdownPercentage
      ),

    stressLossPercentage:
      roundPercent(
        stressLossPercentage
      ),

    warningCount:
      number(warningCount),

    highPriorityWarnings:
      number(
        highPriorityWarnings
      ),

    adjustments,

    signals,

    message:
      score === null
        ? "Risk evidence is incomplete."
        : `Risk evidence scored ${score}/100.`
  };
}

/*
 * ============================================================
 * CONFIDENCE CONCLUSION
 * ============================================================
 */

export function buildConfidenceConclusion({
  researchConfidence = null,
  valuationConfidence = null,
  forecastConfidence = null,
  evidenceCoveragePercentage = null,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const score =
    average([
      researchConfidence,
      valuationConfidence,
      forecastConfidence,
      evidenceCoveragePercentage
    ]);

  const signals = [];

  if (
    score !== null &&
    score >=
      normalizedPolicy
        .preferredResearchConfidencePercentage
  ) {
    signals.push(
      buildSignal({
        code:
          "HIGH_RESEARCH_CONFIDENCE",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .POSITIVE,

        title:
          "Research confidence is strong",

        message:
          `Combined research confidence scored ${roundScore(
            score
          )}/100.`,

        score,

        source:
          "RESEARCH_CONFIDENCE"
      })
    );
  } else if (
    score !== null &&
    score <
      normalizedPolicy
        .minimumResearchConfidencePercentage
  ) {
    signals.push(
      buildSignal({
        code:
          "LOW_RESEARCH_CONFIDENCE",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .LIMITATION,

        title:
          "Research confidence is limited",

        message:
          `Combined research confidence scored ${roundScore(
            score
          )}/100.`,

        score,

        severity:
          INVESTMENT_THESIS_SEVERITIES
            .HIGH,

        source:
          "RESEARCH_CONFIDENCE"
      })
    );
  }

  return {
    score:
      score === null
        ? null
        : roundScore(score),

    classification:
      classifyInvestmentConviction(
        score
      ),

    researchConfidence:
      nullableNumber(
        researchConfidence
      ),

    valuationConfidence:
      nullableNumber(
        valuationConfidence
      ),

    forecastConfidence:
      nullableNumber(
        forecastConfidence
      ),

    evidenceCoveragePercentage:
      roundPercent(
        evidenceCoveragePercentage
      ),

    signals,

    message:
      score === null
        ? "Research confidence is not available."
        : `Combined research confidence scored ${roundScore(
            score
          )}/100 and is rated ${classifyInvestmentConviction(
            score
          ).label}.`
  };
}

/*
 * ============================================================
 * CATALYSTS
 * ============================================================
 */

export function buildInvestmentCatalysts({
  valuationConclusion,
  growthConclusion,
  returnConclusion,
  incomeConclusion,
  qualityConclusion,
  relativeValuation,
  forecast
} = {}) {
  const catalysts = [];

  if (
    valuationConclusion
      ?.blendedUpsidePercentage !==
      null &&
    valuationConclusion
      ?.blendedUpsidePercentage >= 20
  ) {
    catalysts.push(
      buildSignal({
        code:
          "VALUATION_RE_RATING",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .CATALYST,

        title:
          "Potential valuation re-rating",

        message:
          "The current market price may re-rate toward estimated fair value.",

        severity:
          INVESTMENT_THESIS_SEVERITIES
            .LOW,

        source:
          "VALUATION"
      })
    );
  }

  if (
    growthConclusion
      ?.earningsGrowthPercentage !==
      null &&
    growthConclusion
      ?.earningsGrowthPercentage >= 10
  ) {
    catalysts.push(
      buildSignal({
        code:
          "EARNINGS_GROWTH_CATALYST",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .CATALYST,

        title:
          "Earnings growth catalyst",

        message:
          `Expected earnings CAGR is approximately ${roundPercent(
            growthConclusion
              .earningsGrowthPercentage
          )}%.`,

        source:
          "FORECAST"
      })
    );
  }

  if (
    incomeConclusion
      ?.dividendGrowthPercentage !==
      null &&
    incomeConclusion
      ?.dividendGrowthPercentage >= 5
  ) {
    catalysts.push(
      buildSignal({
        code:
          "DIVIDEND_GROWTH_CATALYST",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .CATALYST,

        title:
          "Dividend growth catalyst",

        message:
          `Expected dividend CAGR is approximately ${roundPercent(
            incomeConclusion
              .dividendGrowthPercentage
          )}%.`,

        source:
          "DIVIDENDS"
      })
    );
  }

  if (
    qualityConclusion
      ?.peerRank !== null &&
    qualityConclusion
      ?.totalPeers !== null &&
    qualityConclusion
      ?.peerRank <= 3
  ) {
    catalysts.push(
      buildSignal({
        code:
          "STRONG_PEER_POSITION",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .CATALYST,

        title:
          "Strong peer position",

        message:
          `The security ranks ${qualityConclusion.peerRank} of ${qualityConclusion.totalPeers} in its peer group.`,

        source:
          "PEERS"
      })
    );
  }

  if (
    returnConclusion
      ?.totalReturnCagrPercentage !==
      null &&
    returnConclusion
      ?.totalReturnCagrPercentage >= 15
  ) {
    catalysts.push(
      buildSignal({
        code:
          "STRONG_TOTAL_RETURN_CATALYST",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .CATALYST,

        title:
          "Strong expected total return",

        message:
          `Base-case expected total-return CAGR is approximately ${roundPercent(
            returnConclusion
              .totalReturnCagrPercentage
          )}%.`,

        source:
          "FORECAST"
      })
    );
  }

  safeArray(
    forecast?.warnings
  )
    .filter(
      (warning) =>
        normalizeStatus(
          warning?.code
        ).includes(
          "POSITIVE"
        )
    )
    .forEach(
      (warning) => {
        catalysts.push(
          buildSignal({
            code:
              warning.code,

            type:
              INVESTMENT_THESIS_SIGNAL_TYPES
                .CATALYST,

            title:
              formatLabel(
                warning.code
              ),

            message:
              warning.message,

            source:
              "FORECAST"
          })
        );
      }
    );

  return deduplicateSignals(
    catalysts
  );
}

/*
 * ============================================================
 * RISKS
 * ============================================================
 */

export function buildInvestmentRisks({
  valuationConclusion,
  growthConclusion,
  incomeConclusion,
  riskConclusion,
  confidenceConclusion,
  researchConfidence,
  valuation,
  relativeValuation,
  forecast
} = {}) {
  const risks = [];

  [
    ...(valuationConclusion
      ?.signals ||
      []),

    ...(growthConclusion
      ?.signals ||
      []),

    ...(incomeConclusion
      ?.signals ||
      []),

    ...(riskConclusion
      ?.signals ||
      []),

    ...(confidenceConclusion
      ?.signals ||
      [])
  ]
    .filter(
      (signal) =>
        [
          INVESTMENT_THESIS_SIGNAL_TYPES
            .NEGATIVE,
          INVESTMENT_THESIS_SIGNAL_TYPES
            .RISK,
          INVESTMENT_THESIS_SIGNAL_TYPES
            .WARNING,
          INVESTMENT_THESIS_SIGNAL_TYPES
            .LIMITATION
        ].includes(
          signal?.type
        )
    )
    .forEach(
      (signal) =>
        risks.push(signal)
    );

  safeArray(
    researchConfidence
      ?.warnings
  ).forEach(
    (warning) => {
      risks.push(
        buildSignal({
          code:
            warning?.code ||
            "RESEARCH_WARNING",

          type:
            INVESTMENT_THESIS_SIGNAL_TYPES
              .RISK,

          title:
            warning?.title ||
            formatLabel(
              warning?.code ||
              "Research Warning"
            ),

          message:
            warning?.message ||
            "A research warning requires review.",

          severity:
            warning?.severity ||
            INVESTMENT_THESIS_SEVERITIES
              .MEDIUM,

          source:
            warning?.source ||
            "RESEARCH"
        })
      );
    }
  );

  safeArray(
    valuation?.warnings
  ).forEach(
    (warning) => {
      risks.push(
        buildSignal({
          code:
            warning?.code ||
            "VALUATION_WARNING",

          type:
            INVESTMENT_THESIS_SIGNAL_TYPES
              .WARNING,

          title:
            formatLabel(
              warning?.code ||
              "Valuation Warning"
            ),

          message:
            warning?.message ||
            "A valuation warning requires review.",

          severity:
            INVESTMENT_THESIS_SEVERITIES
              .MEDIUM,

          source:
            warning?.model ||
            "VALUATION"
        })
      );
    }
  );

  if (
    relativeValuation
      ?.status ===
    "INSUFFICIENT_PEERS"
  ) {
    risks.push(
      buildSignal({
        code:
          "INSUFFICIENT_PEERS",

        type:
          INVESTMENT_THESIS_SIGNAL_TYPES
            .LIMITATION,

        title:
          "Peer evidence is limited",

        message:
          "Too few comparable securities were available for a strong relative valuation conclusion.",

        severity:
          INVESTMENT_THESIS_SEVERITIES
            .MEDIUM,

        source:
          "RELATIVE_VALUATION"
      })
    );
  }

  safeArray(
    forecast?.warnings
  ).forEach(
    (warning) => {
      risks.push(
        buildSignal({
          code:
            warning?.code ||
            "FORECAST_WARNING",

          type:
            INVESTMENT_THESIS_SIGNAL_TYPES
              .WARNING,

          title:
            formatLabel(
              warning?.code ||
              "Forecast Warning"
            ),

          message:
            warning?.message ||
            "A forecast warning requires review.",

          severity:
            INVESTMENT_THESIS_SEVERITIES
              .MEDIUM,

          source:
            "FORECAST"
        })
      );
    }
  );

  return deduplicateSignals(
    risks
  ).sort(
    (first, second) =>
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
 * BULL AND BEAR CASES
 * ============================================================
 */

export function buildBullCase({
  valuationConclusion,
  growthConclusion,
  returnConclusion,
  incomeConclusion,
  qualityConclusion,
  catalysts
} = {}) {
  const points = [];

  [
    ...(valuationConclusion
      ?.signals ||
      []),

    ...(growthConclusion
      ?.signals ||
      []),

    ...(returnConclusion
      ?.signals ||
      []),

    ...(incomeConclusion
      ?.signals ||
      []),

    ...(qualityConclusion
      ?.signals ||
      [])
  ]
    .filter(
      (signal) =>
        signal?.type ===
        INVESTMENT_THESIS_SIGNAL_TYPES
          .POSITIVE
    )
    .forEach(
      (signal) =>
        points.push(signal)
    );

  safeArray(catalysts).forEach(
    (catalyst) =>
      points.push(catalyst)
  );

  return deduplicateSignals(
    points
  )
    .sort(
      (first, second) =>
        number(
          second?.score
        ) -
        number(
          first?.score
        )
    )
    .slice(
      0,
      10
    );
}

export function buildBearCase({
  risks
} = {}) {
  return safeArray(risks)
    .sort(
      (first, second) =>
        severityRank(
          second?.severity
        ) -
        severityRank(
          first?.severity
        )
    )
    .slice(
      0,
      10
    );
}

/*
 * ============================================================
 * ACTION CONDITIONS
 * ============================================================
 */

export function buildInvestmentActionConditions({
  thesis,
  valuation,
  relativeValuation,
  forecast,
  riskConclusion,
  confidenceConclusion
} = {}) {
  const conditions = [];

  const buyUnder =
    nullableNumber(
      valuation
        ?.priceLevels
        ?.buyUnder ??
      relativeValuation
        ?.priceLevels
        ?.buyUnder
    );

  const strongBuyBelow =
    nullableNumber(
      valuation
        ?.priceLevels
        ?.strongBuyBelow ??
      relativeValuation
        ?.priceLevels
        ?.strongBuyBelow
    );

  const sellOver =
    nullableNumber(
      valuation
        ?.priceLevels
        ?.sellOver ??
      relativeValuation
        ?.priceLevels
        ?.sellOver
    );

  if (strongBuyBelow !== null) {
    conditions.push({
      code:
        "STRONG_BUY_PRICE",

      type:
        "ENTRY",

      title:
        "Strong-buy review price",

      condition:
        `Review for strong accumulation at or below KES ${roundMoney(
          strongBuyBelow
        ).toLocaleString(
          "en-US",
          {
            minimumFractionDigits:
              2,

            maximumFractionDigits:
              2
          }
        )}.`
    });
  }

  if (buyUnder !== null) {
    conditions.push({
      code:
        "BUY_UNDER_PRICE",

      type:
        "ENTRY",

      title:
        "Buy-under price",

      condition:
        `Review for purchase at or below KES ${roundMoney(
          buyUnder
        ).toLocaleString(
          "en-US",
          {
            minimumFractionDigits:
              2,

            maximumFractionDigits:
              2
          }
        )}.`
    });
  }

  if (sellOver !== null) {
    conditions.push({
      code:
        "SELL_OVER_PRICE",

      type:
        "EXIT",

      title:
        "Sell-over review price",

      condition:
        `Review for trimming or exit at or above KES ${roundMoney(
          sellOver
        ).toLocaleString(
          "en-US",
          {
            minimumFractionDigits:
              2,

            maximumFractionDigits:
              2
          }
        )}.`
    });
  }

  if (
    forecast
      ?.expected
      ?.earningsCagrPercentage !==
      null &&
    forecast
      ?.expected
      ?.earningsCagrPercentage !==
      undefined
  ) {
    conditions.push({
      code:
        "EARNINGS_GROWTH_MONITOR",

      type:
        "MONITOR",

      title:
        "Earnings-growth condition",

      condition:
        `Maintain the thesis only while expected earnings CAGR remains near or above ${roundPercent(
          forecast
            .expected
            .earningsCagrPercentage
        )}%.`
    });
  }

  if (
    riskConclusion?.score !==
      null &&
    riskConclusion?.score !==
      undefined
  ) {
    conditions.push({
      code:
        "RISK_SCORE_MONITOR",

      type:
        "RISK",

      title:
        "Risk-score condition",

      condition:
        `Reassess the thesis if the risk score falls materially below ${riskConclusion.score}/100.`
    });
  }

  if (
    confidenceConclusion?.score !==
      null &&
    confidenceConclusion?.score !==
      undefined
  ) {
    conditions.push({
      code:
        "CONFIDENCE_MONITOR",

      type:
        "EVIDENCE",

      title:
        "Research-confidence condition",

      condition:
        `Reassess the thesis if research confidence falls materially below ${confidenceConclusion.score}/100.`
    });
  }

  return conditions;
}

export function buildThesisInvalidationConditions({
  valuationConclusion,
  growthConclusion,
  incomeConclusion,
  riskConclusion,
  researchConfidence
} = {}) {
  const conditions = [];

  if (
    valuationConclusion
      ?.blendedFairValue !==
      null &&
    valuationConclusion
      ?.blendedFairValue !==
      undefined
  ) {
    conditions.push({
      code:
        "FAIR_VALUE_DETERIORATION",

      title:
        "Fair-value deterioration",

      condition:
        "The thesis is weakened if updated fair value falls materially below the current estimate."
    });
  }

  if (
    growthConclusion
      ?.earningsGrowthPercentage !==
      null &&
    growthConclusion
      ?.earningsGrowthPercentage !==
      undefined
  ) {
    conditions.push({
      code:
        "EARNINGS_GROWTH_BREAKDOWN",

      title:
        "Earnings-growth breakdown",

      condition:
        "The thesis is weakened if expected earnings growth turns negative or falls materially below the base case."
    });
  }

  if (
    incomeConclusion
      ?.sustainability &&
    incomeConclusion
      ?.sustainability !==
      "Not Rated"
  ) {
    conditions.push({
      code:
        "DIVIDEND_CUT_OR_COVERAGE_FAILURE",

      title:
        "Dividend sustainability failure",

      condition:
        "The income thesis is invalidated by a material dividend cut or insufficient earnings and cash-flow coverage."
    });
  }

  if (
    riskConclusion?.score !==
      null &&
    riskConclusion?.score !==
      undefined
  ) {
    conditions.push({
      code:
        "RISK_LIMIT_BREACH",

      title:
        "Risk-limit breach",

      condition:
        "The thesis requires immediate review if concentration, volatility, drawdown, or stress-loss limits are breached."
    });
  }

  if (
    researchConfidence
      ?.status ===
    "STALE_DATA"
  ) {
    conditions.push({
      code:
        "STALE_RESEARCH_DATA",

      title:
        "Stale research data",

      condition:
        "The thesis should not be relied on until stale market or financial data is refreshed."
    });
  }

  return conditions;
}

/*
 * ============================================================
 * THESIS SCORE
 * ============================================================
 */

function buildThesisComponents({
  valuationConclusion,
  relativeValuation,
  growthConclusion,
  returnConclusion,
  incomeConclusion,
  qualityConclusion,
  riskConclusion,
  confidenceConclusion,
  componentWeights
}) {
  const relativeScore =
    nullableNumber(
      relativeValuation
        ?.relativeScore
    );

  return [
    {
      code:
        "VALUATION",

      label:
        "Absolute Valuation",

      score:
        valuationConclusion
          ?.score ??
        null,

      weight:
        componentWeights
          .VALUATION
    },
    {
      code:
        "RELATIVE_VALUATION",

      label:
        "Relative Valuation",

      score:
        relativeScore,

      weight:
        componentWeights
          .RELATIVE_VALUATION
    },
    {
      code:
        "GROWTH",

      label:
        "Growth",

      score:
        growthConclusion
          ?.score ??
        null,

      weight:
        componentWeights
          .GROWTH
    },
    {
      code:
        "TOTAL_RETURN",

      label:
        "Expected Total Return",

      score:
        returnConclusion
          ?.score ??
        null,

      weight:
        componentWeights
          .TOTAL_RETURN
    },
    {
      code:
        "INCOME",

      label:
        "Income",

      score:
        incomeConclusion
          ?.score ??
        null,

      weight:
        componentWeights
          .INCOME
    },
    {
      code:
        "QUALITY",

      label:
        "Business Quality",

      score:
        qualityConclusion
          ?.score ??
        null,

      weight:
        componentWeights
          .QUALITY
    },
    {
      code:
        "RISK",

      label:
        "Risk",

      score:
        riskConclusion
          ?.score ??
        null,

      weight:
        componentWeights
          .RISK
    },
    {
      code:
        "RESEARCH_CONFIDENCE",

      label:
        "Research Confidence",

      score:
        confidenceConclusion
          ?.score ??
        null,

      weight:
        componentWeights
          .RESEARCH_CONFIDENCE
    }
  ].map(
    (component) => ({
      ...component,

      available:
        component.score !==
          null &&
        component.score !==
          undefined,

      score:
        component.score ===
          null ||
        component.score ===
          undefined
          ? null
          : roundScore(
              component.score
            ),

      weightPercentage:
        roundPercent(
          component.weight *
          100
        )
    })
  );
}

function calculateThesisScore({
  components,
  risks,
  policy
}) {
  const available =
    safeArray(components).filter(
      (component) =>
        component.available &&
        component.weight > 0
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

  const criticalRisks =
    safeArray(risks).filter(
      (risk) =>
        risk?.severity ===
        INVESTMENT_THESIS_SEVERITIES
          .CRITICAL
    ).length;

  const highRisks =
    safeArray(risks).filter(
      (risk) =>
        risk?.severity ===
        INVESTMENT_THESIS_SEVERITIES
          .HIGH
    ).length;

  if (
    score !== null &&
    criticalRisks > 0
  ) {
    const deduction =
      Math.min(
        criticalRisks * 20,
        40
      );

    score -= deduction;

    adjustments.push({
      code:
        "CRITICAL_RISK_PENALTY",

      points:
        -deduction,

      message:
        `${criticalRisks} critical risk(s) reduced the thesis score.`
    });
  }

  if (
    score !== null &&
    highRisks >
      policy
        .maximumHighPriorityWarnings
  ) {
    const deduction =
      Math.min(
        (
          highRisks -
          policy
            .maximumHighPriorityWarnings
        ) * 5,
        20
      );

    score -= deduction;

    adjustments.push({
      code:
        "HIGH_RISK_PENALTY",

      points:
        -deduction,

      message:
        `${highRisks} high-priority risks reduced the thesis score.`
    });
  }

  const evidenceCoveragePercentage =
    sum(
      available.map(
        (component) =>
          component.weight
      )
    ) /
    sum(
      safeArray(components).map(
        (component) =>
          component.weight
      )
    ) *
    100;

  if (
    score !== null &&
    evidenceCoveragePercentage <
      policy
        .minimumEvidenceCoveragePercentage
  ) {
    score -= 15;

    adjustments.push({
      code:
        "LOW_EVIDENCE_COVERAGE",

      points:
        -15,

      message:
        "The thesis score was reduced because research evidence is incomplete."
    });
  }

  return {
    score:
      score === null
        ? null
        : roundScore(score),

    availableComponents:
      available.length,

    totalComponents:
      safeArray(components).length,

    availableWeightPercentage:
      roundPercent(
        evidenceCoveragePercentage
      ),

    adjustments
  };
}

/*
 * ============================================================
 * COACH G NARRATIVE
 * ============================================================
 */

function buildCoachGInvestmentThesisNarrative({
  symbol,
  classification,
  score,
  conviction,
  valuationConclusion,
  growthConclusion,
  returnConclusion,
  incomeConclusion,
  qualityConclusion,
  bullCase,
  bearCase,
  catalysts,
  risks
}) {
  const parts = [];

  parts.push(
    `${symbol || "The security"} has an investment thesis score of ${
      score === null ||
      score === undefined
        ? "not available"
        : `${score}/100`
    } and is rated ${classification.label}.`
  );

  parts.push(
    `Research conviction is ${conviction.label.toLowerCase()}.`
  );

  if (
    valuationConclusion
      ?.blendedFairValue !==
      null &&
    valuationConclusion
      ?.blendedFairValue !==
      undefined
  ) {
    parts.push(
      `Blended fair value is approximately KES ${roundMoney(
        valuationConclusion
          .blendedFairValue
      ).toLocaleString(
        "en-US",
        {
          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2
        }
      )}, implying ${roundPercent(
        valuationConclusion
          .blendedUpsidePercentage
      )}% upside or downside.`
    );
  }

  if (
    returnConclusion
      ?.totalReturnCagrPercentage !==
      null &&
    returnConclusion
      ?.totalReturnCagrPercentage !==
      undefined
  ) {
    parts.push(
      `Base-case expected total-return CAGR is approximately ${roundPercent(
        returnConclusion
          .totalReturnCagrPercentage
      )}%.`
    );
  }

  if (
    growthConclusion
      ?.earningsGrowthPercentage !==
      null &&
    growthConclusion
      ?.earningsGrowthPercentage !==
      undefined
  ) {
    parts.push(
      `Expected earnings CAGR is approximately ${roundPercent(
        growthConclusion
          .earningsGrowthPercentage
      )}%.`
    );
  }

  if (
    incomeConclusion
      ?.dividendYieldPercentage !==
      null &&
    incomeConclusion
      ?.dividendYieldPercentage !==
      undefined
  ) {
    parts.push(
      `Dividend yield is approximately ${roundPercent(
        incomeConclusion
          .dividendYieldPercentage
      )}% and dividend sustainability is rated ${incomeConclusion.sustainability}.`
    );
  }

  if (bullCase.length) {
    parts.push(
      `The strongest positive factor is ${bullCase[0].title.toLowerCase()}.`
    );
  }

  if (bearCase.length) {
    parts.push(
      `The principal concern is ${bearCase[0].title.toLowerCase()}.`
    );
  }

  if (catalysts.length) {
    parts.push(
      `${catalysts.length} catalyst or catalysts may support the thesis.`
    );
  }

  if (risks.length) {
    parts.push(
      `${risks.length} risk or limitation item(s) require monitoring.`
    );
  }

  parts.push(
    `Recommended posture: ${formatLabel(
      classification.action
    )}.`
  );

  parts.push(
    "This thesis is advisory only and should be reviewed against current market prices, updated financial statements, investor objectives, risk tolerance, and broker information."
  );

  return parts.join(" ");
}

/*
 * ============================================================
 * COMPLETE THESIS
 * ============================================================
 */

export function buildCoachGInvestmentThesis({
  symbol,
  name = null,
  sector = null,

  valuation = null,
  relativeValuation = null,
  forecast = null,
  researchConfidence = null,

  investmentScore = null,
  qualityScore = null,
  relativeQualityScore = null,
  riskScore = null,

  dividendYieldPercentage = null,
  volatilityPercentage = null,
  drawdownPercentage = null,
  stressLossPercentage = null,

  componentWeights =
    DEFAULT_COMPONENT_WEIGHTS,

  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(policy);

  const normalizedSymbol =
    normalizeSymbol(symbol);

  const valuationConclusion =
    buildValuationConclusion({
      valuation,

      relativeValuation,

      policy:
        normalizedPolicy
    });

  const growthConclusion =
    buildGrowthConclusion({
      forecast,

      policy:
        normalizedPolicy
    });

  const returnConclusion =
    buildExpectedReturnConclusion({
      forecast,

      policy:
        normalizedPolicy
    });

  const incomeConclusion =
    buildIncomeConclusion({
      valuation,

      forecast,

      dividendYieldPercentage,

      policy:
        normalizedPolicy
    });

  const qualityConclusion =
    buildQualityConclusion({
      investmentScore,

      qualityScore,

      relativeQualityScore:
        relativeQualityScore ??
        relativeValuation
          ?.composite
          ?.qualityComparison
          ?.score,

      peerRank:
        relativeValuation
          ?.summary
          ?.targetPeerRank,

      totalPeers:
        relativeValuation
          ?.summary
          ?.totalRanked
    });

  const warnings =
    safeArray(
      researchConfidence
        ?.warnings
    );

  const highPriorityWarnings =
    warnings.filter(
      (warning) =>
        [
          INVESTMENT_THESIS_SEVERITIES
            .CRITICAL,
          INVESTMENT_THESIS_SEVERITIES
            .HIGH
        ].includes(
          warning?.severity
        )
    ).length;

  const riskConclusion =
    buildRiskConclusion({
      riskScore,

      volatilityPercentage,

      drawdownPercentage,

      stressLossPercentage,

      warningCount:
        warnings.length,

      highPriorityWarnings,

      policy:
        normalizedPolicy
    });

  const researchConfidenceScore =
    nullableNumber(
      researchConfidence
        ?.overallScore ??
      researchConfidence
        ?.researchQuality
        ?.score
    );

  const valuationConfidenceScore =
    nullableNumber(
      researchConfidence
        ?.valuationConfidence
        ?.score ??
      valuation
        ?.confidence
        ?.score
    );

  const forecastConfidenceScore =
    nullableNumber(
      forecast
        ?.confidence
        ?.score
    );

  const evidenceCoveragePercentage =
    average([
      valuation
        ?.summary
        ?.modelCoveragePercentage,

      relativeValuation
        ?.summary
        ?.metricCoveragePercentage,

      forecast
        ?.summary
        ?.assumptionCoveragePercentage,

      researchConfidence
        ?.researchQuality
        ?.completeness
        ?.score
    ]);

  const confidenceConclusion =
    buildConfidenceConclusion({
      researchConfidence:
        researchConfidenceScore,

      valuationConfidence:
        valuationConfidenceScore,

      forecastConfidence:
        forecastConfidenceScore,

      evidenceCoveragePercentage,

      policy:
        normalizedPolicy
    });

  const catalysts =
    buildInvestmentCatalysts({
      valuationConclusion,

      growthConclusion,

      returnConclusion,

      incomeConclusion,

      qualityConclusion,

      relativeValuation,

      forecast
    });

  const risks =
    buildInvestmentRisks({
      valuationConclusion,

      growthConclusion,

      incomeConclusion,

      riskConclusion,

      confidenceConclusion,

      researchConfidence,

      valuation,

      relativeValuation,

      forecast
    });

  const bullCase =
    buildBullCase({
      valuationConclusion,

      growthConclusion,

      returnConclusion,

      incomeConclusion,

      qualityConclusion,

      catalysts
    });

  const bearCase =
    buildBearCase({
      risks
    });

  const components =
    buildThesisComponents({
      valuationConclusion,

      relativeValuation,

      growthConclusion,

      returnConclusion,

      incomeConclusion,

      qualityConclusion,

      riskConclusion,

      confidenceConclusion,

      componentWeights
    });

  const scoreResult =
    calculateThesisScore({
      components,

      risks,

      policy:
        normalizedPolicy
    });

  let score =
    scoreResult.score;

  let classification =
    classifyInvestmentThesis(
      score
    );

  const criticalRisks =
    risks.filter(
      (risk) =>
        risk?.severity ===
        INVESTMENT_THESIS_SEVERITIES
          .CRITICAL
    ).length;

  if (
    criticalRisks > 0
  ) {
    classification = {
      code:
        INVESTMENT_THESIS_CLASSIFICATIONS
          .HIGH_RISK,

      label:
        "High Risk",

      action:
        INVESTMENT_THESIS_ACTIONS
          .IMMEDIATE_RISK_REVIEW,

      description:
        "Critical risks override otherwise positive investment evidence."
    };
  }

  const convictionScore =
    roundScore(
      average([
        confidenceConclusion.score,
        scoreResult
          .availableWeightPercentage,
        valuationConfidenceScore,
        forecastConfidenceScore
      ]) ||
      0
    );

  const conviction =
    classifyInvestmentConviction(
      convictionScore
    );

  const actionConditions =
    buildInvestmentActionConditions({
      thesis: {
        score,

        classification
      },

      valuation,

      relativeValuation,

      forecast,

      riskConclusion,

      confidenceConclusion
    });

  const invalidationConditions =
    buildThesisInvalidationConditions({
      valuationConclusion,

      growthConclusion,

      incomeConclusion,

      riskConclusion,

      researchConfidence
    });

  let status =
    INVESTMENT_THESIS_STATUSES
      .AVAILABLE;

  if (
    score === null
  ) {
    status =
      INVESTMENT_THESIS_STATUSES
        .INSUFFICIENT_DATA;
  } else if (
    criticalRisks > 0
  ) {
    status =
      INVESTMENT_THESIS_STATUSES
        .HIGH_RISK_REVIEW;
  } else if (
    valuationConclusion
      .conflicting ||
    researchConfidence
      ?.status ===
      "CONFLICTING_DATA"
  ) {
    status =
      INVESTMENT_THESIS_STATUSES
        .CONFLICTING_EVIDENCE;
  } else if (
    scoreResult
      .availableWeightPercentage <
    normalizedPolicy
      .preferredEvidenceCoveragePercentage
  ) {
    status =
      INVESTMENT_THESIS_STATUSES
        .PARTIAL;
  }

  const narrative =
    buildCoachGInvestmentThesisNarrative({
      symbol:
        normalizedSymbol,

      classification,

      score,

      conviction,

      valuationConclusion,

      growthConclusion,

      returnConclusion,

      incomeConclusion,

      qualityConclusion,

      bullCase,

      bearCase,

      catalysts,

      risks
    });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    symbol:
      normalizedSymbol ||
      null,

    name:
      normalizeText(
        name ||
        normalizedSymbol ||
        "Unknown"
      ),

    sector:
      normalizeText(
        sector ||
        "Unknown"
      ),

    status,

    score,

    classification,

    action:
      classification.action,

    conviction: {
      score:
        convictionScore,

      classification:
        conviction
    },

    components,

    coverage: {
      availableComponents:
        scoreResult
          .availableComponents,

      totalComponents:
        scoreResult
          .totalComponents,

      availableWeightPercentage:
        scoreResult
          .availableWeightPercentage
    },

    conclusions: {
      valuation:
        valuationConclusion,

      growth:
        growthConclusion,

      expectedReturn:
        returnConclusion,

      income:
        incomeConclusion,

      quality:
        qualityConclusion,

      risk:
        riskConclusion,

      confidence:
        confidenceConclusion
    },

    bullCase,

    bearCase,

    catalysts,

    risks,

    actionConditions,

    invalidationConditions,

    adjustments:
      scoreResult.adjustments,

    priceLevels: {
      strongBuyBelow:
        valuation
          ?.priceLevels
          ?.strongBuyBelow ??
        relativeValuation
          ?.priceLevels
          ?.strongBuyBelow ??
        null,

      buyUnder:
        valuation
          ?.priceLevels
          ?.buyUnder ??
        relativeValuation
          ?.priceLevels
          ?.buyUnder ??
        null,

      fairValueLow:
        valuation
          ?.priceLevels
          ?.fairValueLow ??
        relativeValuation
          ?.priceLevels
          ?.fairValueLow ??
        null,

      fairValueHigh:
        valuation
          ?.priceLevels
          ?.fairValueHigh ??
        relativeValuation
          ?.priceLevels
          ?.fairValueHigh ??
        null,

      sellOver:
        valuation
          ?.priceLevels
          ?.sellOver ??
        relativeValuation
          ?.priceLevels
          ?.sellOver ??
        null
    },

    expected: {
      fairValue:
        valuationConclusion
          .blendedFairValue,

      upsidePercentage:
        valuationConclusion
          .blendedUpsidePercentage,

      earningsCagrPercentage:
        growthConclusion
          .earningsGrowthPercentage,

      dividendCagrPercentage:
        incomeConclusion
          .dividendGrowthPercentage,

      priceCagrPercentage:
        returnConclusion
          .priceCagrPercentage,

      totalReturnCagrPercentage:
        returnConclusion
          .totalReturnCagrPercentage
    },

    narrative,

    message:
      narrative,

    safeguards: {
      advisoryOnly:
        true,

      tradesExecuted:
        false,

      holdingsModified:
        false,

      cashModified:
        false,

      brokerOrdersSubmitted:
        false,

      missingDataInvented:
        false
    },

    sources: {
      valuation,

      relativeValuation,

      forecast,

      researchConfidence
    },

    policy:
      normalizedPolicy,

    advisoryOnly:
      true
  };
}

/*
 * ============================================================
 * BATCH THESIS BUILDER
 * ============================================================
 */

export function buildCoachGInvestmentTheses({
  securities = [],
  inputBuilder = null,
  policy = {}
} = {}) {
  const theses =
    safeArray(securities).map(
      (security) => {
        const extra =
          typeof inputBuilder ===
            "function"
            ? inputBuilder(
                security
              ) || {}
            : {};

        return buildCoachGInvestmentThesis({
          ...security,

          ...extra,

          policy
        });
      }
    );

  const rated =
    theses.filter(
      (thesis) =>
        thesis.score !==
          null &&
        thesis.score !==
          undefined
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      theses.length
        ? INVESTMENT_THESIS_STATUSES
            .AVAILABLE
        : INVESTMENT_THESIS_STATUSES
            .INSUFFICIENT_DATA,

    total:
      theses.length,

    rated:
      rated.length,

    notRated:
      theses.length -
      rated.length,

    averageScore:
      roundPercent(
        average(
          rated.map(
            (thesis) =>
              thesis.score
          )
        )
      ),

    averageConvictionPercentage:
      roundPercent(
        average(
          rated.map(
            (thesis) =>
              thesis
                ?.conviction
                ?.score
          )
        )
      ),

    counts: {
      veryAttractive:
        theses.filter(
          (thesis) =>
            thesis
              ?.classification
              ?.code ===
            INVESTMENT_THESIS_CLASSIFICATIONS
              .VERY_ATTRACTIVE
        ).length,

      attractive:
        theses.filter(
          (thesis) =>
            thesis
              ?.classification
              ?.code ===
            INVESTMENT_THESIS_CLASSIFICATIONS
              .ATTRACTIVE
        ).length,

      moderatelyAttractive:
        theses.filter(
          (thesis) =>
            thesis
              ?.classification
              ?.code ===
            INVESTMENT_THESIS_CLASSIFICATIONS
              .MODERATELY_ATTRACTIVE
        ).length,

      balanced:
        theses.filter(
          (thesis) =>
            thesis
              ?.classification
              ?.code ===
            INVESTMENT_THESIS_CLASSIFICATIONS
              .BALANCED
        ).length,

      cautious:
        theses.filter(
          (thesis) =>
            thesis
              ?.classification
              ?.code ===
            INVESTMENT_THESIS_CLASSIFICATIONS
              .CAUTIOUS
        ).length,

      unattractive:
        theses.filter(
          (thesis) =>
            thesis
              ?.classification
              ?.code ===
            INVESTMENT_THESIS_CLASSIFICATIONS
              .UNATTRACTIVE
        ).length,

      highRisk:
        theses.filter(
          (thesis) =>
            thesis
              ?.classification
              ?.code ===
            INVESTMENT_THESIS_CLASSIFICATIONS
              .HIGH_RISK
        ).length
    },

    theses:
      theses.sort(
        (first, second) =>
          number(
            second?.score
          ) -
          number(
            first?.score
          )
      )
  };
}

/*
 * ============================================================
 * SUMMARY
 * ============================================================
 */

export function buildInvestmentThesisSummary(
  thesis
) {
  return {
    symbol:
      thesis?.symbol ||
      null,

    status:
      thesis?.status ||
      INVESTMENT_THESIS_STATUSES
        .INSUFFICIENT_DATA,

    score:
      thesis?.score ??
      null,

    classification:
      thesis
        ?.classification
        ?.label ||
      "Not Rated",

    classificationCode:
      thesis
        ?.classification
        ?.code ||
      INVESTMENT_THESIS_CLASSIFICATIONS
        .NOT_RATED,

    action:
      thesis
        ?.classification
        ?.action ||
      INVESTMENT_THESIS_ACTIONS
        .BUILD_MORE_EVIDENCE,

    convictionPercentage:
      thesis
        ?.conviction
        ?.score ??
      0,

    conviction:
      thesis
        ?.conviction
        ?.classification
        ?.label ||
      "Not Available",

    fairValue:
      thesis
        ?.expected
        ?.fairValue ??
      null,

    upsidePercentage:
      thesis
        ?.expected
        ?.upsidePercentage ??
      null,

    earningsCagrPercentage:
      thesis
        ?.expected
        ?.earningsCagrPercentage ??
      null,

    dividendCagrPercentage:
      thesis
        ?.expected
        ?.dividendCagrPercentage ??
      null,

    totalReturnCagrPercentage:
      thesis
        ?.expected
        ?.totalReturnCagrPercentage ??
      null,

    buyUnder:
      thesis
        ?.priceLevels
        ?.buyUnder ??
      null,

    sellOver:
      thesis
        ?.priceLevels
        ?.sellOver ??
      null,

    topBullCase:
      thesis
        ?.bullCase?.[0] ||
      null,

    topBearCase:
      thesis
        ?.bearCase?.[0] ||
      null,

    topCatalyst:
      thesis
        ?.catalysts?.[0] ||
      null,

    topRisk:
      thesis
        ?.risks?.[0] ||
      null,

    message:
      thesis?.message ||
      "No investment thesis summary is available."
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export function loadMostAttractiveInvestmentTheses(
  theses = [],
  limit = 5
) {
  return safeArray(theses)
    .filter(
      (thesis) =>
        thesis?.score !==
          null &&
        thesis?.score !==
          undefined
    )
    .sort(
      (first, second) =>
        number(
          second?.score
        ) -
        number(
          first?.score
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

export function loadHighestConvictionInvestmentTheses(
  theses = [],
  limit = 5
) {
  return safeArray(theses)
    .sort(
      (first, second) =>
        number(
          second
            ?.conviction
            ?.score
        ) -
        number(
          first
            ?.conviction
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

export function loadHighestExpectedReturnTheses(
  theses = [],
  limit = 5
) {
  return safeArray(theses)
    .filter(
      (thesis) =>
        nullableNumber(
          thesis
            ?.expected
            ?.totalReturnCagrPercentage
        ) !== null
    )
    .sort(
      (first, second) =>
        number(
          second
            ?.expected
            ?.totalReturnCagrPercentage
        ) -
        number(
          first
            ?.expected
            ?.totalReturnCagrPercentage
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

export function loadHighestRiskInvestmentTheses(
  theses = [],
  limit = 5
) {
  return safeArray(theses)
    .sort(
      (first, second) => {
        const firstRisk =
          safeArray(
            first?.risks
          )[0];

        const secondRisk =
          safeArray(
            second?.risks
          )[0];

        return (
          severityRank(
            secondRisk?.severity
          ) -
          severityRank(
            firstRisk?.severity
          )
        );
      }
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

export function loadInvestmentThesisBullCase(
  thesis
) {
  return safeArray(
    thesis?.bullCase
  );
}

export function loadInvestmentThesisBearCase(
  thesis
) {
  return safeArray(
    thesis?.bearCase
  );
}

export function loadInvestmentThesisCatalysts(
  thesis
) {
  return safeArray(
    thesis?.catalysts
  );
}

export function loadInvestmentThesisRisks(
  thesis
) {
  return safeArray(
    thesis?.risks
  );
}

export function loadInvestmentThesisActionConditions(
  thesis
) {
  return safeArray(
    thesis?.actionConditions
  );
}

export function loadInvestmentThesisInvalidationConditions(
  thesis
) {
  return safeArray(
    thesis?.invalidationConditions
  );
}
