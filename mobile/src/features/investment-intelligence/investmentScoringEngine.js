/*
 * ============================================================
 * PC-023A1
 * INVESTMENT SCORING ENGINE
 * ============================================================
 *
 * Produces explainable 0–100 investment scores.
 *
 * This module:
 * - does not place trades,
 * - does not modify holdings,
 * - does not update cash,
 * - does not invent missing market or fundamental data.
 *
 * Missing components are excluded from weighted calculations.
 * ============================================================
 */

export const INVESTMENT_RATINGS = {
  STRONG_BUY: "STRONG_BUY",
  BUY: "BUY",
  ACCUMULATE: "ACCUMULATE",
  HOLD: "HOLD",
  REDUCE: "REDUCE",
  SELL: "SELL",
  AVOID: "AVOID",
  NOT_RATED: "NOT_RATED"
};

export const INVESTMENT_SCORE_COMPONENTS = {
  QUALITY: "QUALITY",
  GROWTH: "GROWTH",
  INCOME: "INCOME",
  VALUE: "VALUE",
  RISK: "RISK",
  LIQUIDITY: "LIQUIDITY",
  DIVERSIFICATION: "DIVERSIFICATION",
  CAPITAL_EFFICIENCY: "CAPITAL_EFFICIENCY",
  MOMENTUM: "MOMENTUM",
  PORTFOLIO_FIT: "PORTFOLIO_FIT"
};

export const DEFAULT_INVESTMENT_SCORE_WEIGHTS = {
  QUALITY: 0.18,
  GROWTH: 0.12,
  INCOME: 0.1,
  VALUE: 0.12,
  RISK: 0.14,
  LIQUIDITY: 0.08,
  DIVERSIFICATION: 0.08,
  CAPITAL_EFFICIENCY: 0.08,
  MOMENTUM: 0.05,
  PORTFOLIO_FIT: 0.05
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

function roundMetric(
  value,
  decimals = 4
) {
  const parsed =
    nullableNumber(value);

  if (
    parsed === null
  ) {
    return null;
  }

  return Number(
    parsed.toFixed(decimals)
  );
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

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function average(values = []) {
  const valid = values
    .map(nullableNumber)
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
      (total, value) =>
        total + value,
      0
    ) /
    valid.length
  );
}

/*
 * ============================================================
 * SCORE CLASSIFICATION
 * ============================================================
 */

export function classifyInvestmentScore(score) {
  const value =
    roundScore(score);

  if (
    value >= 90
  ) {
    return {
      code: "EXCEPTIONAL",
      label: "Exceptional",
      severity: "LOW",
      description:
        "The investment scores very strongly across the available measures."
    };
  }

  if (
    value >= 80
  ) {
    return {
      code: "STRONG",
      label: "Strong",
      severity: "LOW",
      description:
        "The investment has a strong overall profile with limited weaknesses."
    };
  }

  if (
    value >= 70
  ) {
    return {
      code: "GOOD",
      label: "Good",
      severity: "LOW",
      description:
        "The investment is generally attractive but has areas that require monitoring."
    };
  }

  if (
    value >= 60
  ) {
    return {
      code: "FAIR",
      label: "Fair",
      severity: "MEDIUM",
      description:
        "The investment has a mixed profile and should be assessed carefully."
    };
  }

  if (
    value >= 45
  ) {
    return {
      code: "WEAK",
      label: "Weak",
      severity: "HIGH",
      description:
        "The investment has material weaknesses across the available measures."
    };
  }

  return {
    code: "POOR",
    label: "Poor",
    severity: "CRITICAL",
    description:
      "The investment has substantial weaknesses and requires significant caution."
  };
}

export function classifyInvestmentRating(score) {
  const value =
    nullableNumber(score);

  if (
    value === null
  ) {
    return {
      code:
        INVESTMENT_RATINGS.NOT_RATED,

      label:
        "Not Rated",

      description:
        "Insufficient data is available to assign an investment rating."
    };
  }

  if (
    value >= 88
  ) {
    return {
      code:
        INVESTMENT_RATINGS.STRONG_BUY,

      label:
        "Strong Buy",

      description:
        "The investment has an exceptionally strong risk-adjusted profile."
    };
  }

  if (
    value >= 78
  ) {
    return {
      code:
        INVESTMENT_RATINGS.BUY,

      label:
        "Buy",

      description:
        "The investment has a strong overall profile and may deserve additional capital."
    };
  }

  if (
    value >= 68
  ) {
    return {
      code:
        INVESTMENT_RATINGS.ACCUMULATE,

      label:
        "Accumulate",

      description:
        "The investment is attractive for gradual accumulation."
    };
  }

  if (
    value >= 55
  ) {
    return {
      code:
        INVESTMENT_RATINGS.HOLD,

      label:
        "Hold",

      description:
        "The investment is acceptable but does not currently justify aggressive capital allocation."
    };
  }

  if (
    value >= 42
  ) {
    return {
      code:
        INVESTMENT_RATINGS.REDUCE,

      label:
        "Reduce",

      description:
        "The position should be reviewed for potential reduction."
    };
  }

  if (
    value >= 28
  ) {
    return {
      code:
        INVESTMENT_RATINGS.SELL,

      label:
        "Sell",

      description:
        "The investment has a weak overall profile and may warrant disposal."
    };
  }

  return {
    code:
      INVESTMENT_RATINGS.AVOID,

    label:
      "Avoid",

    description:
      "The investment has a poor risk-adjusted profile."
  };
}

/*
 * ============================================================
 * QUALITY SCORE
 * ============================================================
 */

export function calculateQualityScore({
  profitabilityScore = null,
  balanceSheetScore = null,
  earningsStabilityScore = null,
  governanceScore = null,
  businessQualityScore = null,
  historicalPerformanceScore = null
} = {}) {
  const components = [
    {
      code: "PROFITABILITY",
      value: nullableNumber(
        profitabilityScore
      ),
      weight: 0.25
    },
    {
      code: "BALANCE_SHEET",
      value: nullableNumber(
        balanceSheetScore
      ),
      weight: 0.2
    },
    {
      code: "EARNINGS_STABILITY",
      value: nullableNumber(
        earningsStabilityScore
      ),
      weight: 0.2
    },
    {
      code: "GOVERNANCE",
      value: nullableNumber(
        governanceScore
      ),
      weight: 0.1
    },
    {
      code: "BUSINESS_QUALITY",
      value: nullableNumber(
        businessQualityScore
      ),
      weight: 0.15
    },
    {
      code: "HISTORICAL_PERFORMANCE",
      value: nullableNumber(
        historicalPerformanceScore
      ),
      weight: 0.1
    }
  ];

  return calculateWeightedScore({
    code:
      INVESTMENT_SCORE_COMPONENTS.QUALITY,

    label:
      "Quality",

    components
  });
}

/*
 * ============================================================
 * GROWTH SCORE
 * ============================================================
 */

export function calculateGrowthScore({
  revenueGrowthPercentage = null,
  earningsGrowthPercentage = null,
  dividendGrowthPercentage = null,
  priceGrowthPercentage = null,
  growthConsistencyScore = null
} = {}) {
  const revenueScore =
    scoreGrowthRate(
      revenueGrowthPercentage
    );

  const earningsScore =
    scoreGrowthRate(
      earningsGrowthPercentage
    );

  const dividendScore =
    scoreGrowthRate(
      dividendGrowthPercentage,
      {
        excellent: 12,
        strong: 8,
        moderate: 4
      }
    );

  const priceGrowthScore =
    scoreGrowthRate(
      priceGrowthPercentage
    );

  return calculateWeightedScore({
    code:
      INVESTMENT_SCORE_COMPONENTS.GROWTH,

    label:
      "Growth",

    components: [
      {
        code:
          "REVENUE_GROWTH",

        value:
          revenueScore,

        weight:
          0.3
      },
      {
        code:
          "EARNINGS_GROWTH",

        value:
          earningsScore,

        weight:
          0.35
      },
      {
        code:
          "DIVIDEND_GROWTH",

        value:
          dividendScore,

        weight:
          0.1
      },
      {
        code:
          "PRICE_GROWTH",

        value:
          priceGrowthScore,

        weight:
          0.1
      },
      {
        code:
          "GROWTH_CONSISTENCY",

        value:
          nullableNumber(
            growthConsistencyScore
          ),

        weight:
          0.15
      }
    ]
  });
}

function scoreGrowthRate(
  value,
  thresholds = {}
) {
  const growth =
    nullableNumber(value);

  if (
    growth === null
  ) {
    return null;
  }

  const excellent =
    number(
      thresholds.excellent ??
      20
    );

  const strong =
    number(
      thresholds.strong ??
      12
    );

  const moderate =
    number(
      thresholds.moderate ??
      6
    );

  if (
    growth >= excellent
  ) {
    return 100;
  }

  if (
    growth >= strong
  ) {
    return 85;
  }

  if (
    growth >= moderate
  ) {
    return 70;
  }

  if (
    growth >= 0
  ) {
    return 55;
  }

  if (
    growth >= -5
  ) {
    return 40;
  }

  if (
    growth >= -15
  ) {
    return 25;
  }

  return 10;
}

/*
 * ============================================================
 * INCOME SCORE
 * ============================================================
 */

export function calculateIncomeScore({
  dividendYieldPercentage = null,
  payoutSustainabilityScore = null,
  dividendConsistencyScore = null,
  dividendGrowthScore = null,
  paymentReliabilityScore = null
} = {}) {
  const yieldScore =
    scoreDividendYield(
      dividendYieldPercentage
    );

  return calculateWeightedScore({
    code:
      INVESTMENT_SCORE_COMPONENTS.INCOME,

    label:
      "Income",

    components: [
      {
        code:
          "DIVIDEND_YIELD",

        value:
          yieldScore,

        weight:
          0.35
      },
      {
        code:
          "PAYOUT_SUSTAINABILITY",

        value:
          nullableNumber(
            payoutSustainabilityScore
          ),

        weight:
          0.25
      },
      {
        code:
          "DIVIDEND_CONSISTENCY",

        value:
          nullableNumber(
            dividendConsistencyScore
          ),

        weight:
          0.2
      },
      {
        code:
          "DIVIDEND_GROWTH",

        value:
          nullableNumber(
            dividendGrowthScore
          ),

        weight:
          0.1
      },
      {
        code:
          "PAYMENT_RELIABILITY",

        value:
          nullableNumber(
            paymentReliabilityScore
          ),

        weight:
          0.1
      }
    ]
  });
}

function scoreDividendYield(value) {
  const yieldPercentage =
    nullableNumber(value);

  if (
    yieldPercentage === null
  ) {
    return null;
  }

  if (
    yieldPercentage >= 8 &&
    yieldPercentage <= 15
  ) {
    return 100;
  }

  if (
    yieldPercentage >= 5 &&
    yieldPercentage < 8
  ) {
    return 85;
  }

  if (
    yieldPercentage >= 3 &&
    yieldPercentage < 5
  ) {
    return 70;
  }

  if (
    yieldPercentage > 15 &&
    yieldPercentage <= 20
  ) {
    return 65;
  }

  if (
    yieldPercentage > 20
  ) {
    return 40;
  }

  if (
    yieldPercentage > 0
  ) {
    return 50;
  }

  return 20;
}

/*
 * ============================================================
 * VALUE SCORE
 * ============================================================
 */

export function calculateValueScore({
  peRatio = null,
  priceToBookRatio = null,
  dividendYieldPercentage = null,
  intrinsicValueUpsidePercentage = null,
  freeCashFlowYieldPercentage = null,
  relativeValuationScore = null
} = {}) {
  return calculateWeightedScore({
    code:
      INVESTMENT_SCORE_COMPONENTS.VALUE,

    label:
      "Value",

    components: [
      {
        code:
          "PE_RATIO",

        value:
          scorePeRatio(
            peRatio
          ),

        weight:
          0.2
      },
      {
        code:
          "PRICE_TO_BOOK",

        value:
          scorePriceToBook(
            priceToBookRatio
          ),

        weight:
          0.15
      },
      {
        code:
          "DIVIDEND_YIELD",

        value:
          scoreDividendYield(
            dividendYieldPercentage
          ),

        weight:
          0.1
      },
      {
        code:
          "INTRINSIC_VALUE_UPSIDE",

        value:
          scoreUpside(
            intrinsicValueUpsidePercentage
          ),

        weight:
          0.3
      },
      {
        code:
          "FREE_CASH_FLOW_YIELD",

        value:
          scoreCashFlowYield(
            freeCashFlowYieldPercentage
          ),

        weight:
          0.15
      },
      {
        code:
          "RELATIVE_VALUATION",

        value:
          nullableNumber(
            relativeValuationScore
          ),

        weight:
          0.1
      }
    ]
  });
}

function scorePeRatio(value) {
  const ratio =
    nullableNumber(value);

  if (
    ratio === null ||
    ratio <= 0
  ) {
    return null;
  }

  if (
    ratio >= 5 &&
    ratio <= 12
  ) {
    return 90;
  }

  if (
    ratio > 12 &&
    ratio <= 18
  ) {
    return 75;
  }

  if (
    ratio > 18 &&
    ratio <= 25
  ) {
    return 60;
  }

  if (
    ratio < 5
  ) {
    return 65;
  }

  if (
    ratio <= 35
  ) {
    return 40;
  }

  return 20;
}

function scorePriceToBook(value) {
  const ratio =
    nullableNumber(value);

  if (
    ratio === null ||
    ratio <= 0
  ) {
    return null;
  }

  if (
    ratio <= 1
  ) {
    return 90;
  }

  if (
    ratio <= 2
  ) {
    return 75;
  }

  if (
    ratio <= 3
  ) {
    return 60;
  }

  if (
    ratio <= 5
  ) {
    return 40;
  }

  return 20;
}

function scoreUpside(value) {
  const upside =
    nullableNumber(value);

  if (
    upside === null
  ) {
    return null;
  }

  if (
    upside >= 40
  ) {
    return 100;
  }

  if (
    upside >= 25
  ) {
    return 85;
  }

  if (
    upside >= 15
  ) {
    return 75;
  }

  if (
    upside >= 5
  ) {
    return 65;
  }

  if (
    upside >= 0
  ) {
    return 55;
  }

  if (
    upside >= -10
  ) {
    return 35;
  }

  return 15;
}

function scoreCashFlowYield(value) {
  const yieldPercentage =
    nullableNumber(value);

  if (
    yieldPercentage === null
  ) {
    return null;
  }

  if (
    yieldPercentage >= 10
  ) {
    return 100;
  }

  if (
    yieldPercentage >= 7
  ) {
    return 85;
  }

  if (
    yieldPercentage >= 4
  ) {
    return 70;
  }

  if (
    yieldPercentage >= 2
  ) {
    return 55;
  }

  if (
    yieldPercentage >= 0
  ) {
    return 40;
  }

  return 15;
}

/*
 * ============================================================
 * RISK SCORE
 * ============================================================
 *
 * Higher score means lower investment risk.
 * ============================================================
 */

export function calculateRiskScore({
  portfolioRiskScore = null,
  concentrationStatus = null,
  volatilityPercentage = null,
  drawdownPercentage = null,
  stressLossPercentage = null,
  liquidityRiskScore = null,
  riskAdjustedReturnScore = null
} = {}) {
  return calculateWeightedScore({
    code:
      INVESTMENT_SCORE_COMPONENTS.RISK,

    label:
      "Risk",

    components: [
      {
        code:
          "PORTFOLIO_RISK",

        value:
          nullableNumber(
            portfolioRiskScore
          ),

        weight:
          0.25
      },
      {
        code:
          "CONCENTRATION",

        value:
          scoreConcentrationStatus(
            concentrationStatus
          ),

        weight:
          0.15
      },
      {
        code:
          "VOLATILITY",

        value:
          scoreVolatility(
            volatilityPercentage
          ),

        weight:
          0.15
      },
      {
        code:
          "DRAWDOWN",

        value:
          scoreDrawdown(
            drawdownPercentage
          ),

        weight:
          0.15
      },
      {
        code:
          "STRESS_LOSS",

        value:
          scoreStressLoss(
            stressLossPercentage
          ),

        weight:
          0.15
      },
      {
        code:
          "LIQUIDITY_RISK",

        value:
          nullableNumber(
            liquidityRiskScore
          ),

        weight:
          0.05
      },
      {
        code:
          "RISK_ADJUSTED_RETURN",

        value:
          nullableNumber(
            riskAdjustedReturnScore
          ),

        weight:
          0.1
      }
    ]
  });
}

function scoreConcentrationStatus(value) {
  switch (
    normalizeStatus(value)
  ) {
    case "WITHIN_LIMIT":
    case "HEALTHY":
    case "NO_BREACH":
      return 100;

    case "WARNING":
    case "MONITOR":
      return 65;

    case "BREACHED":
    case "LIMIT_BREACH":
      return 30;

    case "CRITICAL":
      return 10;

    default:
      return null;
  }
}

function scoreVolatility(value) {
  const volatility =
    nullableNumber(value);

  if (
    volatility === null
  ) {
    return null;
  }

  if (
    volatility <= 10
  ) {
    return 100;
  }

  if (
    volatility <= 15
  ) {
    return 85;
  }

  if (
    volatility <= 22
  ) {
    return 70;
  }

  if (
    volatility <= 30
  ) {
    return 50;
  }

  if (
    volatility <= 40
  ) {
    return 30;
  }

  return 15;
}

function scoreDrawdown(value) {
  const drawdown =
    Math.abs(
      number(value)
    );

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    drawdown <= 5
  ) {
    return 100;
  }

  if (
    drawdown <= 10
  ) {
    return 85;
  }

  if (
    drawdown <= 15
  ) {
    return 70;
  }

  if (
    drawdown <= 25
  ) {
    return 50;
  }

  if (
    drawdown <= 35
  ) {
    return 30;
  }

  return 10;
}

function scoreStressLoss(value) {
  const loss =
    Math.abs(
      number(value)
    );

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    loss <= 5
  ) {
    return 100;
  }

  if (
    loss <= 10
  ) {
    return 85;
  }

  if (
    loss <= 18
  ) {
    return 65;
  }

  if (
    loss <= 25
  ) {
    return 45;
  }

  return 20;
}

/*
 * ============================================================
 * LIQUIDITY SCORE
 * ============================================================
 */

export function calculateLiquidityScore({
  cashPercentage = null,
  marketLiquidityScore = null,
  tradingVolumeScore = null,
  exitCapacityScore = null
} = {}) {
  return calculateWeightedScore({
    code:
      INVESTMENT_SCORE_COMPONENTS.LIQUIDITY,

    label:
      "Liquidity",

    components: [
      {
        code:
          "PORTFOLIO_CASH",

        value:
          scoreCashPercentage(
            cashPercentage
          ),

        weight:
          0.35
      },
      {
        code:
          "MARKET_LIQUIDITY",

        value:
          nullableNumber(
            marketLiquidityScore
          ),

        weight:
          0.3
      },
      {
        code:
          "TRADING_VOLUME",

        value:
          nullableNumber(
            tradingVolumeScore
          ),

        weight:
          0.2
      },
      {
        code:
          "EXIT_CAPACITY",

        value:
          nullableNumber(
            exitCapacityScore
          ),

        weight:
          0.15
      }
    ]
  });
}

function scoreCashPercentage(value) {
  const percentage =
    nullableNumber(value);

  if (
    percentage === null
  ) {
    return null;
  }

  if (
    percentage >= 8 &&
    percentage <= 25
  ) {
    return 100;
  }

  if (
    percentage >= 5 &&
    percentage < 8
  ) {
    return 85;
  }

  if (
    percentage > 25 &&
    percentage <= 40
  ) {
    return 80;
  }

  if (
    percentage >= 2 &&
    percentage < 5
  ) {
    return 60;
  }

  if (
    percentage > 40 &&
    percentage <= 60
  ) {
    return 55;
  }

  return 30;
}

/*
 * ============================================================
 * DIVERSIFICATION SCORE
 * ============================================================
 */

export function calculateDiversificationScore({
  diversificationScore = null,
  holdingCountScore = null,
  sectorDiversityScore = null,
  concentrationScore = null,
  effectiveHoldingsScore = null
} = {}) {
  return calculateWeightedScore({
    code:
      INVESTMENT_SCORE_COMPONENTS.DIVERSIFICATION,

    label:
      "Diversification",

    components: [
      {
        code:
          "PORTFOLIO_DIVERSIFICATION",

        value:
          nullableNumber(
            diversificationScore
          ),

        weight:
          0.35
      },
      {
        code:
          "HOLDING_COUNT",

        value:
          nullableNumber(
            holdingCountScore
          ),

        weight:
          0.15
      },
      {
        code:
          "SECTOR_DIVERSITY",

        value:
          nullableNumber(
            sectorDiversityScore
          ),

        weight:
          0.2
      },
      {
        code:
          "CONCENTRATION",

        value:
          nullableNumber(
            concentrationScore
          ),

        weight:
          0.2
      },
      {
        code:
          "EFFECTIVE_HOLDINGS",

        value:
          nullableNumber(
            effectiveHoldingsScore
          ),

        weight:
          0.1
      }
    ]
  });
}

/*
 * ============================================================
 * CAPITAL EFFICIENCY SCORE
 * ============================================================
 */

export function calculateCapitalEfficiencyScore({
  returnOnCapitalScore = null,
  cashUtilizationScore = null,
  turnoverEfficiencyScore = null,
  feeEfficiencyScore = null,
  gainLossEfficiencyScore = null
} = {}) {
  return calculateWeightedScore({
    code:
      INVESTMENT_SCORE_COMPONENTS.CAPITAL_EFFICIENCY,

    label:
      "Capital Efficiency",

    components: [
      {
        code:
          "RETURN_ON_CAPITAL",

        value:
          nullableNumber(
            returnOnCapitalScore
          ),

        weight:
          0.35
      },
      {
        code:
          "CASH_UTILIZATION",

        value:
          nullableNumber(
            cashUtilizationScore
          ),

        weight:
          0.2
      },
      {
        code:
          "TURNOVER_EFFICIENCY",

        value:
          nullableNumber(
            turnoverEfficiencyScore
          ),

        weight:
          0.15
      },
      {
        code:
          "FEE_EFFICIENCY",

        value:
          nullableNumber(
            feeEfficiencyScore
          ),

        weight:
          0.15
      },
      {
        code:
          "GAIN_LOSS_EFFICIENCY",

        value:
          nullableNumber(
            gainLossEfficiencyScore
          ),

        weight:
          0.15
      }
    ]
  });
}

/*
 * ============================================================
 * MOMENTUM SCORE
 * ============================================================
 */

export function calculateMomentumScore({
  oneMonthReturnPercentage = null,
  threeMonthReturnPercentage = null,
  sixMonthReturnPercentage = null,
  oneYearReturnPercentage = null,
  relativeMomentumScore = null
} = {}) {
  return calculateWeightedScore({
    code:
      INVESTMENT_SCORE_COMPONENTS.MOMENTUM,

    label:
      "Momentum",

    components: [
      {
        code:
          "ONE_MONTH",

        value:
          scoreGrowthRate(
            oneMonthReturnPercentage
          ),

        weight:
          0.15
      },
      {
        code:
          "THREE_MONTH",

        value:
          scoreGrowthRate(
            threeMonthReturnPercentage
          ),

        weight:
          0.25
      },
      {
        code:
          "SIX_MONTH",

        value:
          scoreGrowthRate(
            sixMonthReturnPercentage
          ),

        weight:
          0.25
      },
      {
        code:
          "ONE_YEAR",

        value:
          scoreGrowthRate(
            oneYearReturnPercentage
          ),

        weight:
          0.25
      },
      {
        code:
          "RELATIVE_MOMENTUM",

        value:
          nullableNumber(
            relativeMomentumScore
          ),

        weight:
          0.1
      }
    ]
  });
}

/*
 * ============================================================
 * PORTFOLIO FIT SCORE
 * ============================================================
 */

export function calculatePortfolioFitScore({
  allocationFitScore = null,
  sectorNeedScore = null,
  concentrationImpactScore = null,
  incomeFitScore = null,
  riskProfileFitScore = null,
  cashDeploymentFitScore = null
} = {}) {
  return calculateWeightedScore({
    code:
      INVESTMENT_SCORE_COMPONENTS.PORTFOLIO_FIT,

    label:
      "Portfolio Fit",

    components: [
      {
        code:
          "ALLOCATION_FIT",

        value:
          nullableNumber(
            allocationFitScore
          ),

        weight:
          0.25
      },
      {
        code:
          "SECTOR_NEED",

        value:
          nullableNumber(
            sectorNeedScore
          ),

        weight:
          0.2
      },
      {
        code:
          "CONCENTRATION_IMPACT",

        value:
          nullableNumber(
            concentrationImpactScore
          ),

        weight:
          0.2
      },
      {
        code:
          "INCOME_FIT",

        value:
          nullableNumber(
            incomeFitScore
          ),

        weight:
          0.1
      },
      {
        code:
          "RISK_PROFILE_FIT",

        value:
          nullableNumber(
            riskProfileFitScore
          ),

        weight:
          0.15
      },
      {
        code:
          "CASH_DEPLOYMENT_FIT",

        value:
          nullableNumber(
            cashDeploymentFitScore
          ),

        weight:
          0.1
      }
    ]
  });
}

/*
 * ============================================================
 * WEIGHTED SCORE ENGINE
 * ============================================================
 */

export function calculateWeightedScore({
  code,
  label,
  components = []
}) {
  const normalized =
    safeArray(components)
      .map(
        (component) => {
          const value =
            nullableNumber(
              component?.value
            );

          const weight =
            Math.max(
              number(
                component?.weight
              ),
              0
            );

          return {
            code:
              component?.code ||
              "COMPONENT",

            label:
              component?.label ||
              component?.code ||
              "Component",

            available:
              value !== null,

            value:
              value === null
                ? null
                : roundScore(
                    value
                  ),

            weight,

            weightedPoints:
              value === null
                ? null
                : roundMetric(
                    value *
                    weight,
                    6
                  ),

            metadata:
              component?.metadata ||
              {}
          };
        }
      );

  const available =
    normalized.filter(
      (component) =>
        component.available &&
        component.weight > 0
    );

  const availableWeight =
    available.reduce(
      (total, component) =>
        total +
        component.weight,
      0
    );

  const weightedTotal =
    available.reduce(
      (total, component) =>
        total +
        number(
          component.value
        ) *
        component.weight,
      0
    );

  const score =
    availableWeight > 0
      ? weightedTotal /
        availableWeight
      : null;

  return {
    code,

    label,

    available:
      score !== null,

    score:
      score === null
        ? null
        : roundScore(score),

    classification:
      score === null
        ? null
        : classifyInvestmentScore(
            score
          ),

    availableComponents:
      available.length,

    totalComponents:
      normalized.length,

    availableWeight:
      roundMetric(
        availableWeight,
        6
      ),

    availableWeightPercentage:
      roundMetric(
        availableWeight *
        100,
        2
      ),

    components:
      normalized
  };
}

/*
 * ============================================================
 * OVERALL INVESTMENT SCORE
 * ============================================================
 */

export function buildInvestmentOpportunityScore({
  symbol = null,
  quality = null,
  growth = null,
  income = null,
  value = null,
  risk = null,
  liquidity = null,
  diversification = null,
  capitalEfficiency = null,
  momentum = null,
  portfolioFit = null,
  weights =
    DEFAULT_INVESTMENT_SCORE_WEIGHTS
} = {}) {
  const componentResults = [
    {
      code:
        INVESTMENT_SCORE_COMPONENTS.QUALITY,

      result:
        quality,

      weight:
        number(
          weights.QUALITY
        )
    },
    {
      code:
        INVESTMENT_SCORE_COMPONENTS.GROWTH,

      result:
        growth,

      weight:
        number(
          weights.GROWTH
        )
    },
    {
      code:
        INVESTMENT_SCORE_COMPONENTS.INCOME,

      result:
        income,

      weight:
        number(
          weights.INCOME
        )
    },
    {
      code:
        INVESTMENT_SCORE_COMPONENTS.VALUE,

      result:
        value,

      weight:
        number(
          weights.VALUE
        )
    },
    {
      code:
        INVESTMENT_SCORE_COMPONENTS.RISK,

      result:
        risk,

      weight:
        number(
          weights.RISK
        )
    },
    {
      code:
        INVESTMENT_SCORE_COMPONENTS.LIQUIDITY,

      result:
        liquidity,

      weight:
        number(
          weights.LIQUIDITY
        )
    },
    {
      code:
        INVESTMENT_SCORE_COMPONENTS.DIVERSIFICATION,

      result:
        diversification,

      weight:
        number(
          weights.DIVERSIFICATION
        )
    },
    {
      code:
        INVESTMENT_SCORE_COMPONENTS.CAPITAL_EFFICIENCY,

      result:
        capitalEfficiency,

      weight:
        number(
          weights.CAPITAL_EFFICIENCY
        )
    },
    {
      code:
        INVESTMENT_SCORE_COMPONENTS.MOMENTUM,

      result:
        momentum,

      weight:
        number(
          weights.MOMENTUM
        )
    },
    {
      code:
        INVESTMENT_SCORE_COMPONENTS.PORTFOLIO_FIT,

      result:
        portfolioFit,

      weight:
        number(
          weights.PORTFOLIO_FIT
        )
    }
  ];

  const weighted =
    calculateWeightedScore({
      code:
        "INVESTMENT_OPPORTUNITY",

      label:
        "Investment Opportunity",

      components:
        componentResults.map(
          (item) => ({
            code:
              item.code,

            label:
              item.result?.label ||
              item.code,

            value:
              item.result?.score ??
              nullableNumber(
                item.result
              ),

            weight:
              item.weight,

            metadata: {
              sourceResult:
                item.result
            }
          })
        )
    });

  const rating =
    classifyInvestmentRating(
      weighted.score
    );

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
      weighted.available
        ? "AVAILABLE"
        : "INSUFFICIENT_DATA",

    score:
      weighted.score,

    rating,

    classification:
      weighted.classification,

    availableComponents:
      weighted.availableComponents,

    totalComponents:
      weighted.totalComponents,

    availableWeight:
      weighted.availableWeight,

    availableWeightPercentage:
      weighted.availableWeightPercentage,

    components:
      weighted.components,

    message:
      weighted.available
        ? `${normalizeSymbol(
            symbol
          ) || "The investment"} scored ${weighted.score}/100 and is rated ${rating.label}.`
        : "Insufficient information is available to calculate an investment opportunity score."
  };
}

/*
 * ============================================================
 * PORTFOLIO QUALITY SCORE
 * ============================================================
 */

export function buildPortfolioQualityScore({
  riskScore = null,
  performanceScore = null,
  rebalancingScore = null,
  diversificationScore = null,
  liquidityScore = null,
  operationalScore = null,
  incomeScore = null,
  capitalEfficiencyScore = null
} = {}) {
  const weighted =
    calculateWeightedScore({
      code:
        "PORTFOLIO_QUALITY",

      label:
        "Portfolio Quality",

      components: [
        {
          code:
            "RISK",

          value:
            riskScore,

          weight:
            0.22
        },
        {
          code:
            "PERFORMANCE",

          value:
            performanceScore,

          weight:
            0.2
        },
        {
          code:
            "REBALANCING",

          value:
            rebalancingScore,

          weight:
            0.13
        },
        {
          code:
            "DIVERSIFICATION",

          value:
            diversificationScore,

          weight:
            0.15
        },
        {
          code:
            "LIQUIDITY",

          value:
            liquidityScore,

          weight:
            0.1
        },
        {
          code:
            "OPERATIONS",

          value:
            operationalScore,

          weight:
            0.08
        },
        {
          code:
            "INCOME",

          value:
            incomeScore,

          weight:
            0.05
        },
        {
          code:
            "CAPITAL_EFFICIENCY",

          value:
            capitalEfficiencyScore,

          weight:
            0.07
        }
      ]
    });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      weighted.available
        ? "AVAILABLE"
        : "INSUFFICIENT_DATA",

    score:
      weighted.score,

    classification:
      weighted.classification,

    rating:
      classifyPortfolioQuality(
        weighted.score
      ),

    availableComponents:
      weighted.availableComponents,

    totalComponents:
      weighted.totalComponents,

    availableWeightPercentage:
      weighted.availableWeightPercentage,

    components:
      weighted.components
  };
}

export function classifyPortfolioQuality(score) {
  const value =
    nullableNumber(score);

  if (
    value === null
  ) {
    return {
      code:
        "NOT_RATED",

      label:
        "Not Rated"
    };
  }

  if (
    value >= 90
  ) {
    return {
      code:
        "EXCELLENT",

      label:
        "Excellent"
    };
  }

  if (
    value >= 80
  ) {
    return {
      code:
        "STRONG",

      label:
        "Strong"
    };
  }

  if (
    value >= 70
  ) {
    return {
      code:
        "HEALTHY",

      label:
        "Healthy"
    };
  }

  if (
    value >= 55
  ) {
    return {
      code:
        "AVERAGE",

      label:
        "Average"
    };
  }

  if (
    value >= 40
  ) {
    return {
      code:
        "WEAK",

      label:
        "Weak"
    };
  }

  return {
    code:
      "POOR",

    label:
      "Poor"
  };
}

/*
 * ============================================================
 * RISK-ADJUSTED RECOMMENDATION
 * ============================================================
 */

export function buildRiskAdjustedRecommendation({
  opportunityScore = null,
  riskScore = null,
  portfolioFitScore = null,
  concentrationStatus = null,
  executiveActionPriority = null,
  dataConfidencePercentage = null
} = {}) {
  const opportunity =
    nullableNumber(
      opportunityScore
    );

  const risk =
    nullableNumber(
      riskScore
    );

  const fit =
    nullableNumber(
      portfolioFitScore
    );

  const available =
    [
      opportunity,
      risk,
      fit
    ].filter(
      (value) =>
        value !== null
    );

  if (
    !available.length
  ) {
    return {
      status:
        "INSUFFICIENT_DATA",

      score:
        null,

      rating:
        classifyInvestmentRating(
          null
        ),

      confidencePercentage:
        0,

      adjustments:
        []
    };
  }

  let score =
    average(
      available
    );

  const adjustments = [];

  const concentration =
    normalizeStatus(
      concentrationStatus
    );

  if (
    [
      "BREACHED",
      "LIMIT_BREACH",
      "CRITICAL"
    ].includes(
      concentration
    )
  ) {
    score -= 15;

    adjustments.push({
      code:
        "CONCENTRATION_PENALTY",

      points:
        -15,

      message:
        "The recommendation was reduced because the holding or sector exceeds concentration limits."
    });
  } else if (
    concentration ===
    "WARNING"
  ) {
    score -= 7;

    adjustments.push({
      code:
        "CONCENTRATION_WARNING",

      points:
        -7,

      message:
        "The recommendation was reduced because concentration is approaching its configured limit."
    });
  }

  const priority =
    normalizeStatus(
      executiveActionPriority
    );

  if (
    priority ===
    "CRITICAL"
  ) {
    score -= 20;

    adjustments.push({
      code:
        "CRITICAL_EXECUTIVE_ACTION",

      points:
        -20,

      message:
        "The recommendation was reduced because a critical executive action is active."
    });
  } else if (
    priority ===
    "HIGH"
  ) {
    score -= 10;

    adjustments.push({
      code:
        "HIGH_EXECUTIVE_ACTION",

      points:
        -10,

      message:
        "The recommendation was reduced because a high-priority executive action is active."
    });
  }

  score =
    roundScore(score);

  const confidence =
    nullableNumber(
      dataConfidencePercentage
    ) ??
    Math.min(
      (
        available.length /
        3
      ) *
      100,
      100
    );

  return {
    status:
      "AVAILABLE",

    score,

    rating:
      classifyInvestmentRating(
        score
      ),

    classification:
      classifyInvestmentScore(
        score
      ),

    confidencePercentage:
      roundScore(
        confidence
      ),

    adjustments
  };
}

/*
 * ============================================================
 * BATCH HOLDING SCORING
 * ============================================================
 */

export function scoreInvestmentHoldings({
  holdings = [],
  scoreBuilder
} = {}) {
  if (
    typeof scoreBuilder !==
    "function"
  ) {
    throw new Error(
      "scoreBuilder must be a function."
    );
  }

  return safeArray(holdings)
    .map(
      (holding) => {
        const result =
          scoreBuilder(
            holding
          );

        return {
          symbol:
            normalizeSymbol(
              holding?.symbol
            ),

          name:
            holding?.name ||
            holding?.companyName ||
            holding?.symbol ||
            "Unknown",

          sector:
            holding?.sector ||
            "Unknown",

          ...result
        };
      }
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
    );
}

/*
 * ============================================================
 * SCORE SUMMARY
 * ============================================================
 */

export function buildInvestmentScoreSummary(
  result
) {
  return {
    symbol:
      result?.symbol ||
      null,

    status:
      result?.status ||
      "NOT_AVAILABLE",

    score:
      result?.score ??
      null,

    rating:
      result
        ?.rating
        ?.label ||
      "Not Rated",

    ratingCode:
      result
        ?.rating
        ?.code ||
      INVESTMENT_RATINGS.NOT_RATED,

    availableComponents:
      result
        ?.availableComponents ||
      0,

    totalComponents:
      result
        ?.totalComponents ||
      0,

    dataCoveragePercentage:
      result
        ?.availableWeightPercentage ??
      0,

    message:
      result?.message ||
      "No investment score is available."
  };
}