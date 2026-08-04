import {
  INVESTMENT_RATINGS,
  buildInvestmentOpportunityScore,
  buildRiskAdjustedRecommendation,
  classifyInvestmentRating
} from "./investmentScoringEngine";

/*
 * ============================================================
 * PC-023A2
 * INVESTMENT RECOMMENDATION ENGINE
 * ============================================================
 *
 * Converts investment scores into ranked, explainable,
 * advisory recommendations.
 *
 * This service:
 * - does not place orders,
 * - does not modify holdings,
 * - does not change portfolio cash,
 * - does not invent unavailable fundamentals,
 * - does not override configured risk controls.
 * ============================================================
 */

export const RECOMMENDATION_ACTIONS = {
  STRONG_BUY:
    "STRONG_BUY",

  BUY:
    "BUY",

  ACCUMULATE:
    "ACCUMULATE",

  HOLD:
    "HOLD",

  REDUCE:
    "REDUCE",

  SELL:
    "SELL",

  AVOID:
    "AVOID",

  NOT_RATED:
    "NOT_RATED"
};

export const RECOMMENDATION_CATEGORIES = {
  NEW_POSITION:
    "NEW_POSITION",

  ADD_TO_POSITION:
    "ADD_TO_POSITION",

  MAINTAIN_POSITION:
    "MAINTAIN_POSITION",

  TRIM_POSITION:
    "TRIM_POSITION",

  EXIT_POSITION:
    "EXIT_POSITION",

  WATCHLIST:
    "WATCHLIST",

  DATA_REVIEW:
    "DATA_REVIEW"
};

export const RECOMMENDATION_CONFIDENCE = {
  VERY_HIGH:
    "VERY_HIGH",

  HIGH:
    "HIGH",

  MEDIUM:
    "MEDIUM",

  LOW:
    "LOW",

  VERY_LOW:
    "VERY_LOW"
};

export const RECOMMENDATION_TIME_HORIZONS = {
  IMMEDIATE_REVIEW:
    "IMMEDIATE_REVIEW",

  NEAR_TERM:
    "NEAR_TERM",

  MEDIUM_TERM:
    "MEDIUM_TERM",

  LONG_TERM:
    "LONG_TERM",

  WATCH:
    "WATCH"
};

export const RECOMMENDATION_RISK_LEVELS = {
  LOW:
    "LOW",

  MODERATE:
    "MODERATE",

  HIGH:
    "HIGH",

  VERY_HIGH:
    "VERY_HIGH",

  UNKNOWN:
    "UNKNOWN"
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
    number(value).toFixed(
      2
    )
  );
}

function roundPercent(value) {
  return Number(
    number(value).toFixed(
      2
    )
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

function normalizeText(value) {
  return String(
    value || ""
  ).trim();
}

function safeArray(value) {
  return Array.isArray(
    value
  )
    ? value
    : [];
}

function average(values = []) {
  const valid =
    values
      .map(
        nullableNumber
      )
      .filter(
        (value) =>
          value !==
          null
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
 * CONFIDENCE CLASSIFICATION
 * ============================================================
 */

export function classifyRecommendationConfidence(
  percentage
) {
  const value =
    roundScore(
      percentage
    );

  if (
    value >= 85
  ) {
    return {
      code:
        RECOMMENDATION_CONFIDENCE
          .VERY_HIGH,

      label:
        "Very High",

      description:
        "The recommendation is supported by broad and consistent data coverage."
    };
  }

  if (
    value >= 70
  ) {
    return {
      code:
        RECOMMENDATION_CONFIDENCE
          .HIGH,

      label:
        "High",

      description:
        "The recommendation is supported by strong data coverage."
    };
  }

  if (
    value >= 50
  ) {
    return {
      code:
        RECOMMENDATION_CONFIDENCE
          .MEDIUM,

      label:
        "Medium",

      description:
        "The recommendation is supported by partial but usable evidence."
    };
  }

  if (
    value >= 25
  ) {
    return {
      code:
        RECOMMENDATION_CONFIDENCE
          .LOW,

      label:
        "Low",

      description:
        "The recommendation is based on limited available evidence."
    };
  }

  return {
    code:
      RECOMMENDATION_CONFIDENCE
        .VERY_LOW,

    label:
      "Very Low",

    description:
      "Insufficient evidence is available for a confident recommendation."
  };
}

/*
 * ============================================================
 * RISK LEVEL CLASSIFICATION
 * ============================================================
 */

export function classifyRecommendationRiskLevel({
  riskScore = null,
  concentrationStatus = null,
  volatilityPercentage = null,
  drawdownPercentage = null
} = {}) {
  const risk =
    nullableNumber(
      riskScore
    );

  const concentration =
    normalizeStatus(
      concentrationStatus
    );

  const volatility =
    nullableNumber(
      volatilityPercentage
    );

  const drawdown =
    nullableNumber(
      drawdownPercentage
    );

  if (
    [
      "CRITICAL",
      "LIMIT_BREACH",
      "BREACHED"
    ].includes(
      concentration
    ) ||
    (
      risk !==
        null &&
      risk <
        35
    ) ||
    (
      volatility !==
        null &&
      volatility >=
        40
    ) ||
    (
      drawdown !==
        null &&
      Math.abs(
        drawdown
      ) >=
        35
    )
  ) {
    return {
      code:
        RECOMMENDATION_RISK_LEVELS
          .VERY_HIGH,

      label:
        "Very High"
    };
  }

  if (
    concentration ===
      "WARNING" ||
    (
      risk !==
        null &&
      risk <
        55
    ) ||
    (
      volatility !==
        null &&
      volatility >=
        25
    ) ||
    (
      drawdown !==
        null &&
      Math.abs(
        drawdown
      ) >=
        20
    )
  ) {
    return {
      code:
        RECOMMENDATION_RISK_LEVELS
          .HIGH,

      label:
        "High"
    };
  }

  if (
    (
      risk !==
        null &&
      risk <
        75
    ) ||
    (
      volatility !==
        null &&
      volatility >=
        15
    ) ||
    (
      drawdown !==
        null &&
      Math.abs(
        drawdown
      ) >=
        10
    )
  ) {
    return {
      code:
        RECOMMENDATION_RISK_LEVELS
          .MODERATE,

      label:
        "Moderate"
    };
  }

  if (
    risk !==
    null
  ) {
    return {
      code:
        RECOMMENDATION_RISK_LEVELS
          .LOW,

      label:
        "Low"
    };
  }

  return {
    code:
      RECOMMENDATION_RISK_LEVELS
        .UNKNOWN,

    label:
      "Unknown"
  };
}

/*
 * ============================================================
 * RECOMMENDATION CATEGORY
 * ============================================================
 */

function classifyRecommendationCategory({
  ratingCode,
  isHeld,
  dataCoveragePercentage
}) {
  const coverage =
    number(
      dataCoveragePercentage
    );

  if (
    coverage <
    25
  ) {
    return RECOMMENDATION_CATEGORIES
      .DATA_REVIEW;
  }

  if (
    !isHeld
  ) {
    if (
      [
        INVESTMENT_RATINGS
          .STRONG_BUY,
        INVESTMENT_RATINGS
          .BUY,
        INVESTMENT_RATINGS
          .ACCUMULATE
      ].includes(
        ratingCode
      )
    ) {
      return RECOMMENDATION_CATEGORIES
        .NEW_POSITION;
    }

    return RECOMMENDATION_CATEGORIES
      .WATCHLIST;
  }

  if (
    [
      INVESTMENT_RATINGS
        .STRONG_BUY,
      INVESTMENT_RATINGS
        .BUY,
      INVESTMENT_RATINGS
        .ACCUMULATE
    ].includes(
      ratingCode
    )
  ) {
    return RECOMMENDATION_CATEGORIES
      .ADD_TO_POSITION;
  }

  if (
    ratingCode ===
    INVESTMENT_RATINGS
      .HOLD
  ) {
    return RECOMMENDATION_CATEGORIES
      .MAINTAIN_POSITION;
  }

  if (
    ratingCode ===
    INVESTMENT_RATINGS
      .REDUCE
  ) {
    return RECOMMENDATION_CATEGORIES
      .TRIM_POSITION;
  }

  if (
    [
      INVESTMENT_RATINGS
        .SELL,
      INVESTMENT_RATINGS
        .AVOID
    ].includes(
      ratingCode
    )
  ) {
    return RECOMMENDATION_CATEGORIES
      .EXIT_POSITION;
  }

  return RECOMMENDATION_CATEGORIES
    .WATCHLIST;
}

/*
 * ============================================================
 * TIME HORIZON
 * ============================================================
 */

function classifyTimeHorizon({
  ratingCode,
  riskLevel,
  executivePriority
}) {
  const priority =
    normalizeStatus(
      executivePriority
    );

  if (
    priority ===
      "CRITICAL" ||
    riskLevel ===
      RECOMMENDATION_RISK_LEVELS
        .VERY_HIGH ||
    [
      INVESTMENT_RATINGS
        .SELL,
      INVESTMENT_RATINGS
        .AVOID
    ].includes(
      ratingCode
    )
  ) {
    return RECOMMENDATION_TIME_HORIZONS
      .IMMEDIATE_REVIEW;
  }

  if (
    [
      INVESTMENT_RATINGS
        .STRONG_BUY,
      INVESTMENT_RATINGS
        .BUY,
      INVESTMENT_RATINGS
        .REDUCE
    ].includes(
      ratingCode
    )
  ) {
    return RECOMMENDATION_TIME_HORIZONS
      .NEAR_TERM;
  }

  if (
    [
      INVESTMENT_RATINGS
        .ACCUMULATE,
      INVESTMENT_RATINGS
        .HOLD
    ].includes(
      ratingCode
    )
  ) {
    return RECOMMENDATION_TIME_HORIZONS
      .MEDIUM_TERM;
  }

  return RECOMMENDATION_TIME_HORIZONS
    .WATCH;
}

/*
 * ============================================================
 * RECOMMENDATION FACTORS
 * ============================================================
 */

function buildPositiveFactors({
  opportunity,
  riskAdjusted,
  holding
}) {
  const factors = [];

  const components =
    safeArray(
      opportunity?.components
    );

  components
    .filter(
      (component) =>
        component?.available &&
        number(
          component?.value
        ) >=
          70
    )
    .sort(
      (
        first,
        second
      ) =>
        number(
          second?.value
        ) -
        number(
          first?.value
        )
    )
    .slice(
      0,
      5
    )
    .forEach(
      (component) => {
        factors.push({
          code:
            `${component.code}_STRENGTH`,

          type:
            "POSITIVE",

          title:
            `${formatLabel(
              component.code
            )} is strong`,

          message:
            `${formatLabel(
              component.code
            )} scored ${component.value}/100.`,

          score:
            component.value
        });
      }
    );

  const dividendYield =
    nullableNumber(
      holding
        ?.dividendYieldPercentage
    );

  if (
    dividendYield !==
      null &&
    dividendYield >=
      5
  ) {
    factors.push({
      code:
        "ATTRACTIVE_DIVIDEND_YIELD",

      type:
        "POSITIVE",

      title:
        "Attractive dividend yield",

      message:
        `Dividend yield is approximately ${roundPercent(
          dividendYield
        )}%.`,

      score:
        null
    });
  }

  const returnPercentage =
    nullableNumber(
      holding
        ?.returnPercentage
    );

  if (
    returnPercentage !==
      null &&
    returnPercentage >
      0
  ) {
    factors.push({
      code:
        "POSITIVE_HOLDING_RETURN",

      type:
        "POSITIVE",

      title:
        "Positive portfolio contribution",

      message:
        `The holding has returned approximately ${roundPercent(
          returnPercentage
        )}%.`,

      score:
        null
    });
  }

  safeArray(
    riskAdjusted
      ?.adjustments
  )
    .filter(
      (adjustment) =>
        number(
          adjustment?.points
        ) >
        0
    )
    .forEach(
      (adjustment) => {
        factors.push({
          code:
            adjustment.code,

          type:
            "POSITIVE",

          title:
            formatLabel(
              adjustment.code
            ),

          message:
            adjustment.message,

          score:
            adjustment.points
        });
      }
    );

  return factors;
}

function buildNegativeFactors({
  opportunity,
  riskAdjusted,
  holding
}) {
  const factors = [];

  safeArray(
    opportunity?.components
  )
    .filter(
      (component) =>
        component?.available &&
        number(
          component?.value
        ) <
          50
    )
    .sort(
      (
        first,
        second
      ) =>
        number(
          first?.value
        ) -
        number(
          second?.value
        )
    )
    .slice(
      0,
      5
    )
    .forEach(
      (component) => {
        factors.push({
          code:
            `${component.code}_WEAKNESS`,

          type:
            "NEGATIVE",

          title:
            `${formatLabel(
              component.code
            )} is weak`,

          message:
            `${formatLabel(
              component.code
            )} scored ${component.value}/100.`,

          score:
            component.value
        });
      }
    );

  safeArray(
    riskAdjusted
      ?.adjustments
  )
    .filter(
      (adjustment) =>
        number(
          adjustment?.points
        ) <
        0
    )
    .forEach(
      (adjustment) => {
        factors.push({
          code:
            adjustment.code,

          type:
            "NEGATIVE",

          title:
            formatLabel(
              adjustment.code
            ),

          message:
            adjustment.message,

          score:
            adjustment.points
        });
      }
    );

  const riskStatus =
    normalizeStatus(
      holding
        ?.riskStatus ||
      holding
        ?.concentrationStatus
    );

  if (
    [
      "BREACHED",
      "LIMIT_BREACH",
      "CRITICAL"
    ].includes(
      riskStatus
    )
  ) {
    factors.push({
      code:
        "CONCENTRATION_LIMIT_BREACH",

      type:
        "NEGATIVE",

      title:
        "Concentration limit breached",

      message:
        "The holding or its sector exceeds a configured concentration limit.",

      score:
        null
    });
  }

  const gainLoss =
    nullableNumber(
      holding?.gainLoss
    );

  if (
    gainLoss !==
      null &&
    gainLoss <
      0
  ) {
    factors.push({
      code:
        "NEGATIVE_GAIN_LOSS",

      type:
        "NEGATIVE",

      title:
        "Negative portfolio contribution",

      message:
        `The holding has contributed an estimated loss of KES ${Math.abs(
          roundMoney(
            gainLoss
          )
        ).toLocaleString(
          "en-US",
          {
            minimumFractionDigits:
              2,
            maximumFractionDigits:
              2
          }
        )}.`,

      score:
        null
    });
  }

  return factors;
}

/*
 * ============================================================
 * CONFIDENCE CALCULATION
 * ============================================================
 */

function calculateRecommendationConfidence({
  opportunity,
  riskAdjusted,
  holding
}) {
  const coverage =
    nullableNumber(
      opportunity
        ?.availableWeightPercentage
    ) ??
    0;

  const availableComponents =
    number(
      opportunity
        ?.availableComponents
    );

  const totalComponents =
    Math.max(
      number(
        opportunity
          ?.totalComponents
      ),
      1
    );

  const componentCoverage =
    (
      availableComponents /
      totalComponents
    ) *
    100;

  const sourceSignals = [
    holding
      ?.marketValue,

    holding
      ?.allocationPercentage,

    holding
      ?.returnPercentage,

    holding
      ?.dividendYieldPercentage,

    holding
      ?.sector,

    holding
      ?.riskStatus
  ];

  const sourceCoverage =
    (
      sourceSignals.filter(
        (value) =>
          value !==
            null &&
          value !==
            undefined &&
          value !==
            ""
      ).length /
      sourceSignals.length
    ) *
    100;

  const riskAdjustedConfidence =
    nullableNumber(
      riskAdjusted
        ?.confidencePercentage
    ) ??
    0;

  return roundScore(
    average([
      coverage,
      componentCoverage,
      sourceCoverage,
      riskAdjustedConfidence
    ]) ||
    0
  );
}

/*
 * ============================================================
 * RECOMMENDATION EXPLANATION
 * ============================================================
 */

function buildRecommendationExplanation({
  symbol,
  rating,
  score,
  confidence,
  category,
  positiveFactors,
  negativeFactors,
  riskLevel
}) {
  const parts = [];

  parts.push(
    `${symbol || "The investment"} scored ${score}/100 and is rated ${rating.label}.`
  );

  parts.push(
    `Recommendation confidence is ${confidence}% and the assessed risk level is ${riskLevel.label}.`
  );

  parts.push(
    `The recommendation category is ${formatLabel(
      category
    )}.`
  );

  if (
    positiveFactors.length
  ) {
    parts.push(
      `Primary strengths include ${positiveFactors
        .slice(
          0,
          3
        )
        .map(
          (factor) =>
            factor.title
        )
        .join(
          ", "
        )}.`
    );
  }

  if (
    negativeFactors.length
  ) {
    parts.push(
      `Primary concerns include ${negativeFactors
        .slice(
          0,
          3
        )
        .map(
          (factor) =>
            factor.title
        )
        .join(
          ", "
        )}.`
    );
  }

  return parts.join(
    " "
  );
}

/*
 * ============================================================
 * SINGLE-HOLDING RECOMMENDATION
 * ============================================================
 */

export function buildInvestmentRecommendation({
  holding = {},
  scoreInputs = {},
  opportunityScore = null,
  executiveActionPriority = null
} = {}) {
  const symbol =
    normalizeSymbol(
      holding?.symbol
    );

  const isHeld =
    Boolean(
      holding?.isHeld ??
      (
        number(
          holding?.quantity
        ) >
        0
      )
    );

  const opportunity =
    opportunityScore ||
    buildInvestmentOpportunityScore({
      symbol,

      ...scoreInputs
    });

  const riskScore =
    nullableNumber(
      scoreInputs
        ?.risk
        ?.score ??
      scoreInputs
        ?.risk
    );

  const portfolioFitScore =
    nullableNumber(
      scoreInputs
        ?.portfolioFit
        ?.score ??
      scoreInputs
        ?.portfolioFit
    );

  const riskAdjusted =
    buildRiskAdjustedRecommendation({
      opportunityScore:
        opportunity?.score,

      riskScore,

      portfolioFitScore,

      concentrationStatus:
        holding
          ?.riskStatus ||
        holding
          ?.concentrationStatus,

      executiveActionPriority,

      dataConfidencePercentage:
        opportunity
          ?.availableWeightPercentage
    });

  const finalScore =
    riskAdjusted
      ?.score ??
    opportunity
      ?.score ??
    null;

  const rating =
    riskAdjusted
      ?.rating ||
    classifyInvestmentRating(
      finalScore
    );

  const confidencePercentage =
    calculateRecommendationConfidence({
      opportunity,
      riskAdjusted,
      holding
    });

  const confidence =
    classifyRecommendationConfidence(
      confidencePercentage
    );

  const riskLevel =
    classifyRecommendationRiskLevel({
      riskScore,

      concentrationStatus:
        holding
          ?.riskStatus ||
        holding
          ?.concentrationStatus,

      volatilityPercentage:
        holding
          ?.volatilityPercentage,

      drawdownPercentage:
        holding
          ?.drawdownPercentage
    });

  const category =
    classifyRecommendationCategory({
      ratingCode:
        rating.code,

      isHeld,

      dataCoveragePercentage:
        opportunity
          ?.availableWeightPercentage
    });

  const timeHorizon =
    classifyTimeHorizon({
      ratingCode:
        rating.code,

      riskLevel:
        riskLevel.code,

      executivePriority:
        executiveActionPriority
    });

  const positiveFactors =
    buildPositiveFactors({
      opportunity,
      riskAdjusted,
      holding
    });

  const negativeFactors =
    buildNegativeFactors({
      opportunity,
      riskAdjusted,
      holding
    });

  const explanation =
    finalScore ===
      null
      ? "Insufficient evidence is available to produce a reliable recommendation."
      : buildRecommendationExplanation({
          symbol,
          rating,
          score:
            finalScore,
          confidence:
            confidencePercentage,
          category,
          positiveFactors,
          negativeFactors,
          riskLevel
        });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    symbol:
      symbol ||
      null,

    name:
      normalizeText(
        holding?.name ||
        holding?.companyName ||
        symbol
      ) ||
      "Unknown",

    sector:
      normalizeText(
        holding?.sector
      ) ||
      "Unknown",

    isHeld,

    status:
      finalScore ===
        null
        ? "INSUFFICIENT_DATA"
        : "AVAILABLE",

    score:
      finalScore,

    originalOpportunityScore:
      opportunity
        ?.score ??
      null,

    rating,

    action:
      rating.code,

    category,

    timeHorizon,

    confidencePercentage,

    confidence,

    riskLevel,

    portfolio: {
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
        nullableNumber(
          holding
            ?.allocationPercentage
        ),

      gainLoss:
        nullableNumber(
          holding?.gainLoss
        ),

      returnPercentage:
        nullableNumber(
          holding
            ?.returnPercentage
        ),

      contributionPercentage:
        nullableNumber(
          holding
            ?.contributionPercentage
        ),

      dividendYieldPercentage:
        nullableNumber(
          holding
            ?.dividendYieldPercentage
        ),

      riskStatus:
        holding
          ?.riskStatus ||
        holding
          ?.concentrationStatus ||
        null
    },

    positiveFactors,

    negativeFactors,

    explanation,

    opportunity,

    riskAdjusted,

    advisoryOnly:
      true
  };
}

/*
 * ============================================================
 * RECOMMENDATION PRIORITY
 * ============================================================
 */

function calculateRecommendationPriority(
  recommendation
) {
  const ratingScores = {
    STRONG_BUY:
      100,

    BUY:
      90,

    ACCUMULATE:
      80,

    HOLD:
      55,

    REDUCE:
      75,

    SELL:
      95,

    AVOID:
      100,

    NOT_RATED:
      10
  };

  let priority =
    number(
      ratingScores[
        recommendation
          ?.rating
          ?.code
      ]
    );

  priority +=
    number(
      recommendation
        ?.confidencePercentage
    ) *
    0.15;

  if (
    recommendation
      ?.riskLevel
      ?.code ===
    RECOMMENDATION_RISK_LEVELS
      .VERY_HIGH
  ) {
    priority += 12;
  } else if (
    recommendation
      ?.riskLevel
      ?.code ===
    RECOMMENDATION_RISK_LEVELS
      .HIGH
  ) {
    priority += 7;
  }

  if (
    recommendation
      ?.category ===
    RECOMMENDATION_CATEGORIES
      .EXIT_POSITION
  ) {
    priority += 10;
  }

  if (
    recommendation
      ?.category ===
    RECOMMENDATION_CATEGORIES
      .NEW_POSITION
  ) {
    priority += 5;
  }

  return roundScore(
    priority
  );
}

/*
 * ============================================================
 * BATCH RECOMMENDATIONS
 * ============================================================
 */

export function buildInvestmentRecommendations({
  holdings = [],
  scoreInputBuilder,
  executivePriorityBuilder = null
} = {}) {
  if (
    typeof scoreInputBuilder !==
    "function"
  ) {
    throw new Error(
      "scoreInputBuilder must be a function."
    );
  }

  const recommendations =
    safeArray(
      holdings
    )
      .map(
        (holding) => {
          const scoreInputs =
            scoreInputBuilder(
              holding
            ) || {};

          const executiveActionPriority =
            typeof executivePriorityBuilder ===
              "function"
              ? executivePriorityBuilder(
                  holding
                )
              : null;

          const recommendation =
            buildInvestmentRecommendation({
              holding,
              scoreInputs,
              executiveActionPriority
            });

          return {
            ...recommendation,

            recommendationPriority:
              calculateRecommendationPriority(
                recommendation
              )
          };
        }
      )
      .sort(
        (
          first,
          second
        ) =>
          number(
            second
              ?.recommendationPriority
          ) -
          number(
            first
              ?.recommendationPriority
          )
      );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      recommendations.length
        ? "AVAILABLE"
        : "NO_INVESTMENTS",

    total:
      recommendations.length,

    rated:
      recommendations.filter(
        (item) =>
          item.status ===
          "AVAILABLE"
      ).length,

    notRated:
      recommendations.filter(
        (item) =>
          item.status !==
          "AVAILABLE"
      ).length,

    recommendations
  };
}

/*
 * ============================================================
 * RECOMMENDATION GROUPING
 * ============================================================
 */

export function groupInvestmentRecommendations(
  recommendations = []
) {
  const items =
    safeArray(
      recommendations
    );

  return {
    strongBuy:
      items.filter(
        (item) =>
          item
            ?.rating
            ?.code ===
          INVESTMENT_RATINGS
            .STRONG_BUY
      ),

    buy:
      items.filter(
        (item) =>
          item
            ?.rating
            ?.code ===
          INVESTMENT_RATINGS
            .BUY
      ),

    accumulate:
      items.filter(
        (item) =>
          item
            ?.rating
            ?.code ===
          INVESTMENT_RATINGS
            .ACCUMULATE
      ),

    hold:
      items.filter(
        (item) =>
          item
            ?.rating
            ?.code ===
          INVESTMENT_RATINGS
            .HOLD
      ),

    reduce:
      items.filter(
        (item) =>
          item
            ?.rating
            ?.code ===
          INVESTMENT_RATINGS
            .REDUCE
      ),

    sell:
      items.filter(
        (item) =>
          item
            ?.rating
            ?.code ===
          INVESTMENT_RATINGS
            .SELL
      ),

    avoid:
      items.filter(
        (item) =>
          item
            ?.rating
            ?.code ===
          INVESTMENT_RATINGS
            .AVOID
      ),

    notRated:
      items.filter(
        (item) =>
          item
            ?.rating
            ?.code ===
          INVESTMENT_RATINGS
            .NOT_RATED
      )
  };
}

/*
 * ============================================================
 * PORTFOLIO RECOMMENDATION SUMMARY
 * ============================================================
 */

export function buildPortfolioRecommendationSummary(
  recommendations = []
) {
  const items =
    safeArray(
      recommendations
    );

  const grouped =
    groupInvestmentRecommendations(
      items
    );

  const scored =
    items.filter(
      (item) =>
        item?.score !==
          null &&
        item?.score !==
          undefined
    );

  const averageScore =
    average(
      scored.map(
        (item) =>
          item.score
      )
    );

  const averageConfidence =
    average(
      scored.map(
        (item) =>
          item
            .confidencePercentage
      )
    );

  const bestOpportunity =
    [...scored]
      .sort(
        (
          first,
          second
        ) =>
          number(
            second?.score
          ) -
          number(
            first?.score
          )
      )[0] ||
    null;

  const highestRisk =
    [...items]
      .sort(
        (
          first,
          second
        ) => {
          const ranks = {
            VERY_HIGH:
              4,

            HIGH:
              3,

            MODERATE:
              2,

            LOW:
              1,

            UNKNOWN:
              0
          };

          return (
            number(
              ranks[
                second
                  ?.riskLevel
                  ?.code
              ]
            ) -
            number(
              ranks[
                first
                  ?.riskLevel
                  ?.code
              ]
            )
          );
        }
      )[0] ||
    null;

  const bestIncomeOpportunity =
    [...items]
      .filter(
        (item) =>
          item
            ?.portfolio
            ?.dividendYieldPercentage !==
          null &&
          item
            ?.portfolio
            ?.dividendYieldPercentage !==
          undefined
      )
      .sort(
        (
          first,
          second
        ) =>
          number(
            second
              ?.portfolio
              ?.dividendYieldPercentage
          ) -
          number(
            first
              ?.portfolio
              ?.dividendYieldPercentage
          )
      )[0] ||
    null;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    totalRecommendations:
      items.length,

    rated:
      scored.length,

    averageScore:
      averageScore ===
        null
        ? null
        : roundScore(
            averageScore
          ),

    averageConfidencePercentage:
      averageConfidence ===
        null
        ? null
        : roundScore(
            averageConfidence
          ),

    counts: {
      strongBuy:
        grouped
          .strongBuy
          .length,

      buy:
        grouped
          .buy
          .length,

      accumulate:
        grouped
          .accumulate
          .length,

      hold:
        grouped
          .hold
          .length,

      reduce:
        grouped
          .reduce
          .length,

      sell:
        grouped
          .sell
          .length,

      avoid:
        grouped
          .avoid
          .length,

      notRated:
        grouped
          .notRated
          .length
    },

    bestOpportunity,

    highestRisk,

    bestIncomeOpportunity,

    grouped
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export function loadTopInvestmentOpportunities(
  recommendations = [],
  limit = 5
) {
  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  return safeArray(
    recommendations
  )
    .filter(
      (item) =>
        [
          INVESTMENT_RATINGS
            .STRONG_BUY,
          INVESTMENT_RATINGS
            .BUY,
          INVESTMENT_RATINGS
            .ACCUMULATE
        ].includes(
          item
            ?.rating
            ?.code
        )
    )
    .sort(
      (
        first,
        second
      ) =>
        number(
          second?.score
        ) -
        number(
          first?.score
        )
    )
    .slice(
      0,
      safeLimit
    );
}

export function loadHoldRecommendations(
  recommendations = []
) {
  return safeArray(
    recommendations
  ).filter(
    (item) =>
      item
        ?.rating
        ?.code ===
      INVESTMENT_RATINGS
        .HOLD
  );
}

export function loadStocksToReduce(
  recommendations = [],
  limit = 5
) {
  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  return safeArray(
    recommendations
  )
    .filter(
      (item) =>
        [
          INVESTMENT_RATINGS
            .REDUCE,
          INVESTMENT_RATINGS
            .SELL,
          INVESTMENT_RATINGS
            .AVOID
        ].includes(
          item
            ?.rating
            ?.code
        )
    )
    .sort(
      (
        first,
        second
      ) =>
        number(
          first?.score
        ) -
        number(
          second?.score
        )
    )
    .slice(
      0,
      safeLimit
    );
}

export function loadHighestConfidenceRecommendations(
  recommendations = [],
  limit = 5
) {
  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  return safeArray(
    recommendations
  )
    .sort(
      (
        first,
        second
      ) =>
        number(
          second
            ?.confidencePercentage
        ) -
        number(
          first
            ?.confidencePercentage
        )
    )
    .slice(
      0,
      safeLimit
    );
}

export function loadHighestRiskRecommendations(
  recommendations = [],
  limit = 5
) {
  const riskRank = {
    VERY_HIGH:
      4,

    HIGH:
      3,

    MODERATE:
      2,

    LOW:
      1,

    UNKNOWN:
      0
  };

  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  return safeArray(
    recommendations
  )
    .sort(
      (
        first,
        second
      ) =>
        number(
          riskRank[
            second
              ?.riskLevel
              ?.code
          ]
        ) -
        number(
          riskRank[
            first
              ?.riskLevel
              ?.code
          ]
        )
    )
    .slice(
      0,
      safeLimit
    );
}