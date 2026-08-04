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
  calculateQualityScore,
  calculateGrowthScore,
  calculateIncomeScore,
  calculateValueScore,
  calculateRiskScore,
  calculateLiquidityScore,
  calculateDiversificationScore,
  calculateCapitalEfficiencyScore,
  calculateMomentumScore,
  calculatePortfolioFitScore,
  buildPortfolioQualityScore
} from "./investmentScoringEngine";

import {
  buildInvestmentRecommendations,
  buildPortfolioRecommendationSummary,
  loadTopInvestmentOpportunities,
  loadStocksToReduce,
  loadHighestRiskRecommendations
} from "./investmentRecommendationEngine";

import {
  buildCashDeploymentAdvice,
  buildCapitalAllocationAdvice
} from "./capitalAllocationEngine";

import {
  buildDividendReinvestmentAdvice
} from "./dividendReinvestmentEngine";

import {
  buildOverallPortfolioInvestmentRating
} from "./portfolioQualityEngine";

/*
 * ============================================================
 * PC-023A6
 * COACH G INVESTMENT ADVISOR ORCHESTRATION SERVICE
 * ============================================================
 *
 * Combines:
 *
 * PC-023A1 — Investment scoring
 * PC-023A2 — Investment recommendations
 * PC-023A3 — Capital allocation and cash deployment
 * PC-023A4 — Dividend reinvestment intelligence
 * PC-023A5 — Portfolio quality and investment rating
 *
 * This service is advisory only.
 *
 * It does not:
 * - execute trades,
 * - modify portfolio holdings,
 * - change portfolio cash,
 * - send broker orders,
 * - fabricate unavailable market or fundamental data.
 * ============================================================
 */

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

function normalizeSector(value) {
  const text =
    String(
      value ||
      "Unknown"
    ).trim();

  return text ||
    "Unknown";
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

function average(values = []) {
  const valid =
    safeArray(
      values
    )
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
      normalizeStatus(
        value
      )
    ]
  );
}

/*
 * ============================================================
 * SOURCE EXTRACTION
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

function findExecutivePriorityForHolding({
  queue,
  symbol,
  sector
}) {
  const normalizedSymbol =
    normalizeSymbol(
      symbol
    );

  const normalizedSector =
    normalizeSector(
      sector
    ).toUpperCase();

  const actions =
    safeArray(
      queue?.actions
    ).filter(
      (action) => {
        const actionSymbol =
          normalizeSymbol(
            action?.symbol
          );

        const actionSector =
          normalizeSector(
            action?.sector
          ).toUpperCase();

        return (
          (
            normalizedSymbol &&
            actionSymbol ===
              normalizedSymbol
          ) ||
          (
            normalizedSector &&
            normalizedSector !==
              "UNKNOWN" &&
            actionSector ===
              normalizedSector
          )
        );
      }
    );

  return actions
    .sort(
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
    )[0]
    ?.priority ||
    null;
}

function buildSectorAllocationMap(
  analytics
) {
  const map =
    new Map();

  safeArray(
    analytics?.sectors
  ).forEach(
    (sector) => {
      map.set(
        normalizeSector(
          sector?.sector
        ).toUpperCase(),

        nullableNumber(
          sector
            ?.allocationPercentage
        ) ??
        0
      );
    }
  );

  return map;
}

function buildRebalancingSymbolMap(
  analytics
) {
  const recommendations =
    safeArray(
      analytics
        ?.sources
        ?.rebalanceRecommendations
        ?.recommendations
    );

  const map =
    new Map();

  recommendations.forEach(
    (recommendation) => {
      const symbol =
        normalizeSymbol(
          recommendation
            ?.symbol ||
          recommendation
            ?.assetSymbol
        );

      if (
        symbol
      ) {
        map.set(
          symbol,
          recommendation
        );
      }
    }
  );

  return map;
}

/*
 * ============================================================
 * HOLDING METRIC EXTRACTION
 * ============================================================
 */

function extractHoldingFundamentals(
  holding
) {
  return {
    profitabilityScore:
      nullableNumber(
        holding
          ?.profitabilityScore
      ),

    balanceSheetScore:
      nullableNumber(
        holding
          ?.balanceSheetScore
      ),

    earningsStabilityScore:
      nullableNumber(
        holding
          ?.earningsStabilityScore
      ),

    governanceScore:
      nullableNumber(
        holding
          ?.governanceScore
      ),

    businessQualityScore:
      nullableNumber(
        holding
          ?.businessQualityScore
      ),

    revenueGrowthPercentage:
      nullableNumber(
        holding
          ?.revenueGrowthPercentage
      ),

    earningsGrowthPercentage:
      nullableNumber(
        holding
          ?.earningsGrowthPercentage
      ),

    dividendGrowthPercentage:
      nullableNumber(
        holding
          ?.dividendGrowthPercentage
      ),

    peRatio:
      nullableNumber(
        holding?.peRatio
      ),

    priceToBookRatio:
      nullableNumber(
        holding
          ?.priceToBookRatio
      ),

    intrinsicValueUpsidePercentage:
      nullableNumber(
        holding
          ?.intrinsicValueUpsidePercentage
      ),

    freeCashFlowYieldPercentage:
      nullableNumber(
        holding
          ?.freeCashFlowYieldPercentage
      ),

    payoutSustainabilityScore:
      nullableNumber(
        holding
          ?.payoutSustainabilityScore
      ),

    dividendConsistencyScore:
      nullableNumber(
        holding
          ?.dividendConsistencyScore
      ),

    paymentReliabilityScore:
      nullableNumber(
        holding
          ?.paymentReliabilityScore
      ),

    marketLiquidityScore:
      nullableNumber(
        holding
          ?.marketLiquidityScore
      ),

    tradingVolumeScore:
      nullableNumber(
        holding
          ?.tradingVolumeScore
      ),

    exitCapacityScore:
      nullableNumber(
        holding
          ?.exitCapacityScore
      )
  };
}

/*
 * ============================================================
 * HOLDING SCORE INPUT BUILDER
 * ============================================================
 */

function buildHoldingScoreInputs({
  holding,
  analytics,
  health,
  sectorAllocationMap,
  rebalancingSymbolMap
}) {
  const fundamentals =
    extractHoldingFundamentals(
      holding
    );

  const symbol =
    normalizeSymbol(
      holding?.symbol
    );

  const sector =
    normalizeSector(
      holding?.sector
    );

  const sectorAllocation =
    sectorAllocationMap.get(
      sector.toUpperCase()
    ) ||
    0;

  const rebalanceRecommendation =
    rebalancingSymbolMap.get(
      symbol
    ) ||
    null;

  const riskAdvice =
    analytics
      ?.sources
      ?.riskAdvice ||
    {};

  const performanceAdvice =
    analytics
      ?.sources
      ?.performanceAdvice ||
    {};

  const rebalancingAdvice =
    analytics
      ?.sources
      ?.rebalancingAdvice ||
    {};

  const portfolioHealthScore =
    nullableNumber(
      health?.score
    );

  const portfolioRiskScore =
    nullableNumber(
      analytics
        ?.scores
        ?.risk
    );

  const diversificationScore =
    nullableNumber(
      riskAdvice
        ?.sources
        ?.diversification
        ?.score
    ) ??
    nullableNumber(
      riskAdvice
        ?.diversification
        ?.score
    );

  const holdingReturn =
    nullableNumber(
      holding
        ?.returnPercentage
    );

  const holdingGainLoss =
    nullableNumber(
      holding?.gainLoss
    );

  const allocationPercentage =
    nullableNumber(
      holding
        ?.allocationPercentage
    ) ??
    0;

  const targetAllocation =
    nullableNumber(
      rebalanceRecommendation
        ?.targetPercentage ??
      rebalanceRecommendation
        ?.targetAllocationPercentage
    );

  const driftPercentage =
    nullableNumber(
      rebalanceRecommendation
        ?.driftPercentage ??
      rebalanceRecommendation
        ?.differencePercentage
    );

  const allocationFitScore =
    driftPercentage ===
      null
      ? null
      : Math.max(
          100 -
          Math.abs(
            driftPercentage
          ) *
          5,
          0
        );

  const sectorNeedScore =
    rebalanceRecommendation
      ?.action ===
      "BUY" ||
    rebalanceRecommendation
      ?.recommendation ===
      "BUY"
      ? 90
      : rebalanceRecommendation
          ?.action ===
          "SELL" ||
        rebalanceRecommendation
          ?.recommendation ===
          "SELL"
        ? 25
        : 60;

  const concentrationImpactScore =
    [
      "BREACHED",
      "LIMIT_BREACH",
      "CRITICAL"
    ].includes(
      normalizeStatus(
        holding
          ?.riskStatus
      )
    )
      ? 20
      : normalizeStatus(
          holding
            ?.riskStatus
        ) ===
        "WARNING"
        ? 55
        : 85;

  const returnOnCapitalScore =
    holdingReturn ===
      null
      ? null
      : holdingReturn >=
          20
        ? 100
        : holdingReturn >=
            10
          ? 85
          : holdingReturn >=
              0
            ? 65
            : holdingReturn >=
                -10
              ? 40
              : 20;

  const gainLossEfficiencyScore =
    holdingGainLoss ===
      null
      ? null
      : holdingGainLoss >
          0
        ? 80
        : holdingGainLoss ===
            0
          ? 55
          : 30;

  const quality =
    calculateQualityScore({
      profitabilityScore:
        fundamentals
          .profitabilityScore,

      balanceSheetScore:
        fundamentals
          .balanceSheetScore,

      earningsStabilityScore:
        fundamentals
          .earningsStabilityScore,

      governanceScore:
        fundamentals
          .governanceScore,

      businessQualityScore:
        fundamentals
          .businessQualityScore,

      historicalPerformanceScore:
        holdingReturn ===
          null
          ? null
          : returnOnCapitalScore
    });

  const growth =
    calculateGrowthScore({
      revenueGrowthPercentage:
        fundamentals
          .revenueGrowthPercentage,

      earningsGrowthPercentage:
        fundamentals
          .earningsGrowthPercentage,

      dividendGrowthPercentage:
        fundamentals
          .dividendGrowthPercentage,

      priceGrowthPercentage:
        holdingReturn,

      growthConsistencyScore:
        nullableNumber(
          holding
            ?.growthConsistencyScore
        )
    });

  const income =
    calculateIncomeScore({
      dividendYieldPercentage:
        nullableNumber(
          holding
            ?.dividendYieldPercentage
        ),

      payoutSustainabilityScore:
        fundamentals
          .payoutSustainabilityScore,

      dividendConsistencyScore:
        fundamentals
          .dividendConsistencyScore,

      dividendGrowthScore:
        nullableNumber(
          holding
            ?.dividendGrowthScore
        ),

      paymentReliabilityScore:
        fundamentals
          .paymentReliabilityScore
    });

  const value =
    calculateValueScore({
      peRatio:
        fundamentals.peRatio,

      priceToBookRatio:
        fundamentals
          .priceToBookRatio,

      dividendYieldPercentage:
        nullableNumber(
          holding
            ?.dividendYieldPercentage
        ),

      intrinsicValueUpsidePercentage:
        fundamentals
          .intrinsicValueUpsidePercentage,

      freeCashFlowYieldPercentage:
        fundamentals
          .freeCashFlowYieldPercentage,

      relativeValuationScore:
        nullableNumber(
          holding
            ?.relativeValuationScore
        )
    });

  const risk =
    calculateRiskScore({
      portfolioRiskScore,

      concentrationStatus:
        holding
          ?.riskStatus,

      volatilityPercentage:
        nullableNumber(
          holding
            ?.volatilityPercentage
        ),

      drawdownPercentage:
        nullableNumber(
          holding
            ?.drawdownPercentage
        ),

      stressLossPercentage:
        nullableNumber(
          holding
            ?.stressLossPercentage
        ),

      liquidityRiskScore:
        fundamentals
          .marketLiquidityScore,

      riskAdjustedReturnScore:
        nullableNumber(
          holding
            ?.riskAdjustedReturnScore
        )
    });

  const liquidity =
    calculateLiquidityScore({
      cashPercentage:
        health
          ?.portfolio
          ?.cashPercentage,

      marketLiquidityScore:
        fundamentals
          .marketLiquidityScore,

      tradingVolumeScore:
        fundamentals
          .tradingVolumeScore,

      exitCapacityScore:
        fundamentals
          .exitCapacityScore
    });

  const diversification =
    calculateDiversificationScore({
      diversificationScore,

      holdingCountScore:
        analytics
          ?.portfolio
          ?.holdingsCount >=
          10
          ? 90
          : analytics
              ?.portfolio
              ?.holdingsCount >=
              5
            ? 70
            : 45,

      sectorDiversityScore:
        analytics
          ?.summary
          ?.sectors >=
          5
          ? 90
          : analytics
              ?.summary
              ?.sectors >=
              3
            ? 70
            : 45,

      concentrationScore:
        concentrationImpactScore,

      effectiveHoldingsScore:
        nullableNumber(
          riskAdvice
            ?.sources
            ?.diversification
            ?.components
            ?.effectiveHoldings
        )
    });

  const capitalEfficiency =
    calculateCapitalEfficiencyScore({
      returnOnCapitalScore,

      cashUtilizationScore:
        nullableNumber(
          health
            ?.components
            ?.find(
              (component) =>
                component?.code ===
                "LIQUIDITY"
            )
            ?.score
        ),

      turnoverEfficiencyScore:
        nullableNumber(
          holding
            ?.turnoverEfficiencyScore
        ),

      feeEfficiencyScore:
        nullableNumber(
          holding
            ?.feeEfficiencyScore
        ),

      gainLossEfficiencyScore
    });

  const momentum =
    calculateMomentumScore({
      oneMonthReturnPercentage:
        nullableNumber(
          holding
            ?.oneMonthReturnPercentage
        ),

      threeMonthReturnPercentage:
        nullableNumber(
          holding
            ?.threeMonthReturnPercentage
        ),

      sixMonthReturnPercentage:
        nullableNumber(
          holding
            ?.sixMonthReturnPercentage
        ),

      oneYearReturnPercentage:
        nullableNumber(
          holding
            ?.oneYearReturnPercentage
        ) ??
        holdingReturn,

      relativeMomentumScore:
        nullableNumber(
          holding
            ?.relativeMomentumScore
        )
    });

  const portfolioFit =
    calculatePortfolioFitScore({
      allocationFitScore,

      sectorNeedScore,

      concentrationImpactScore,

      incomeFitScore:
        income?.score,

      riskProfileFitScore:
        risk?.score,

      cashDeploymentFitScore:
        portfolioHealthScore,

      currentAllocationPercentage:
        allocationPercentage,

      targetAllocationPercentage:
        targetAllocation,

      sectorAllocationPercentage:
        sectorAllocation
    });

  return {
    quality,
    growth,
    income,
    value,
    risk,
    liquidity,
    diversification,
    capitalEfficiency,
    momentum,
    portfolioFit
  };
}

/*
 * ============================================================
 * HOLDING ENRICHMENT
 * ============================================================
 */

function enrichHoldings({
  analytics,
  dividendRecords
}) {
  const dividendMap =
    new Map();

  safeArray(
    dividendRecords
  ).forEach(
    (record) => {
      const symbol =
        normalizeSymbol(
          record?.symbol
        );

      if (
        !symbol
      ) {
        return;
      }

      const existing =
        dividendMap.get(
          symbol
        ) || {
          netAmount: 0,
          dividendYieldPercentage:
            null
        };

      existing.netAmount +=
        number(
          record
            ?.netAmount ??
          record
            ?.expectedNetAmount ??
          record
            ?.amount
        );

      if (
        nullableNumber(
          record
            ?.dividendYieldPercentage
        ) !==
        null
      ) {
        existing.dividendYieldPercentage =
          nullableNumber(
            record
              ?.dividendYieldPercentage
          );
      }

      dividendMap.set(
        symbol,
        existing
      );
    }
  );

  const sectorAllocationMap =
    buildSectorAllocationMap(
      analytics
    );

  return safeArray(
    analytics?.holdings
  ).map(
    (holding) => {
      const symbol =
        normalizeSymbol(
          holding?.symbol
        );

      const dividend =
        dividendMap.get(
          symbol
        ) ||
        {};

      return {
        ...holding,

        symbol,

        sector:
          normalizeSector(
            holding?.sector
          ),

        isHeld:
          number(
            holding?.quantity
          ) >
          0,

        dividendYieldPercentage:
          nullableNumber(
            holding
              ?.dividendYieldPercentage
          ) ??
          nullableNumber(
            dividend
              ?.dividendYieldPercentage
          ),

        expectedDividendIncome:
          roundMoney(
            dividend
              ?.netAmount
          ),

        sectorAllocationPercentage:
          sectorAllocationMap.get(
            normalizeSector(
              holding?.sector
            ).toUpperCase()
          ) ||
          0
      };
    }
  );
}

/*
 * ============================================================
 * DIVIDEND RECORD EXTRACTION
 * ============================================================
 */

function extractDividendRecords(
  analytics
) {
  const source =
    analytics
      ?.sources
      ?.dividends ||
    {};

  return safeArray(
    source
      ?.upcomingDividends ??
    source
      ?.records ??
    source
      ?.forecast ??
    []
  );
}

/*
 * ============================================================
 * ADVISOR INSIGHTS
 * ============================================================
 */

function buildInvestmentInsights({
  portfolioQuality,
  recommendationSummary,
  cashDeployment,
  dividendAdvice,
  analytics,
  queue
}) {
  const insights = [];

  if (
    portfolioQuality?.rating
  ) {
    insights.push({
      code:
        "PORTFOLIO_INVESTMENT_RATING",

      severity:
        portfolioQuality
          ?.score >=
        70
          ? "LOW"
          : portfolioQuality
              ?.score >=
              50
            ? "MEDIUM"
            : "HIGH",

      title:
        `Portfolio rating: ${portfolioQuality.rating.label}`,

      message:
        portfolioQuality
          ?.rating
          ?.description ||
        portfolioQuality
          ?.message
    });
  }

  const bestOpportunity =
    recommendationSummary
      ?.bestOpportunity ||
    null;

  if (
    bestOpportunity
  ) {
    insights.push({
      code:
        `BEST_OPPORTUNITY_${bestOpportunity.symbol}`,

      severity:
        "LOW",

      title:
        `${bestOpportunity.symbol} is the highest-scoring opportunity`,

      message:
        `${bestOpportunity.symbol} scored ${bestOpportunity.score}/100 and is rated ${bestOpportunity.rating?.label || "Not Rated"}.`,

      symbol:
        bestOpportunity.symbol
    });
  }

  const highestRisk =
    recommendationSummary
      ?.highestRisk ||
    null;

  if (
    highestRisk &&
    [
      "HIGH",
      "VERY_HIGH"
    ].includes(
      highestRisk
        ?.riskLevel
        ?.code
    )
  ) {
    insights.push({
      code:
        `HIGHEST_RISK_${highestRisk.symbol}`,

      severity:
        highestRisk
          ?.riskLevel
          ?.code ===
          "VERY_HIGH"
          ? "HIGH"
          : "MEDIUM",

      title:
        `${highestRisk.symbol} has the highest assessed risk`,

      message:
        `The assessed risk level for ${highestRisk.symbol} is ${highestRisk.riskLevel.label}.`,

      symbol:
        highestRisk.symbol
    });
  }

  if (
    cashDeployment?.action
  ) {
    insights.push({
      code:
        "CASH_DEPLOYMENT_GUIDANCE",

      severity:
        cashDeployment
          ?.action
          ?.code ===
          "DO_NOT_DEPLOY"
          ? "HIGH"
          : cashDeployment
              ?.action
              ?.code ===
              "MAINTAIN_CASH_RESERVE"
            ? "MEDIUM"
            : "LOW",

      title:
        `Cash guidance: ${cashDeployment.action.label}`,

      message:
        cashDeployment.message
    });
  }

  if (
    dividendAdvice?.action
  ) {
    insights.push({
      code:
        "DIVIDEND_REINVESTMENT_GUIDANCE",

      severity:
        [
          "DEFER",
          "TAKE_CASH"
        ].includes(
          dividendAdvice
            ?.action
            ?.code
        )
          ? "MEDIUM"
          : "LOW",

      title:
        `Dividend guidance: ${dividendAdvice.action.label}`,

      message:
        dividendAdvice.message
    });
  }

  if (
    analytics
      ?.performance
      ?.benchmarkStatus ===
    "BENCHMARK_NOT_AVAILABLE"
  ) {
    insights.push({
      code:
        "BENCHMARK_DATA_NOT_AVAILABLE",

      severity:
        "INFO",

      title:
        "Benchmark evidence is incomplete",

      message:
        "Genuine NSE benchmark history is required for stronger relative-performance recommendations."
    });
  }

  if (
    queue
      ?.summary
      ?.critical >
    0
  ) {
    insights.push({
      code:
        "CRITICAL_EXECUTIVE_ACTIONS",

      severity:
        "CRITICAL",

      title:
        "Critical executive actions restrict new investment",

      message:
        `${queue.summary.critical} critical executive action or actions require immediate review.`
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
 * EXECUTIVE PRIORITIES
 * ============================================================
 */

function buildInvestmentPriorityList({
  recommendationSummary,
  cashDeployment,
  dividendAdvice,
  portfolioQuality,
  queue
}) {
  return {
    bestStockToBuy:
      recommendationSummary
        ?.bestOpportunity ||
      null,

    bestStockToAdd:
      safeArray(
        recommendationSummary
          ?.grouped
          ?.strongBuy
      )
        .filter(
          (item) =>
            item?.isHeld
        )[0] ||
      safeArray(
        recommendationSummary
          ?.grouped
          ?.buy
      )
        .filter(
          (item) =>
            item?.isHeld
        )[0] ||
      null,

    bestStockToTrim:
      safeArray(
        recommendationSummary
          ?.grouped
          ?.reduce
      )[0] ||
      safeArray(
        recommendationSummary
          ?.grouped
          ?.sell
      )[0] ||
      null,

    highestPortfolioRisk:
      recommendationSummary
        ?.highestRisk ||
      null,

    bestDividendOpportunity:
      dividendAdvice
        ?.reinvestment
        ?.allocations?.[0] ||
      recommendationSummary
        ?.bestIncomeOpportunity ||
      null,

    strongestCapitalAllocation:
      cashDeployment
        ?.allocationPlan
        ?.allocations?.[0] ||
      null,

    biggestPortfolioWeakness:
      portfolioQuality
        ?.weaknesses?.[0] ||
      null,

    strongestPortfolioQuality:
      portfolioQuality
        ?.strengths?.[0] ||
      null,

    topExecutiveAction:
      queue?.topAction ||
      null
  };
}

/*
 * ============================================================
 * COACH G NARRATIVE
 * ============================================================
 */

function buildCoachGNarrative({
  portfolioQuality,
  recommendationSummary,
  cashDeployment,
  dividendAdvice,
  priorities,
  analytics
}) {
  const parts = [];

  if (
    portfolioQuality?.score !==
      null &&
    portfolioQuality?.score !==
      undefined
  ) {
    parts.push(
      `Your portfolio investment quality score is ${portfolioQuality.score}/100, rated ${portfolioQuality.rating?.label || "Not Rated"}.`
    );
  }

  if (
    portfolioQuality
      ?.strengths
      ?.length
  ) {
    parts.push(
      `The strongest portfolio area is ${portfolioQuality.strengths[0].title.toLowerCase()}.`
    );
  }

  if (
    portfolioQuality
      ?.weaknesses
      ?.length
  ) {
    parts.push(
      `The main area requiring review is ${portfolioQuality.weaknesses[0].title.toLowerCase()}.`
    );
  }

  if (
    priorities
      ?.bestStockToBuy
  ) {
    parts.push(
      `${priorities.bestStockToBuy.symbol} is currently the highest-scoring investment opportunity, with a score of ${priorities.bestStockToBuy.score}/100 and a ${priorities.bestStockToBuy.rating?.label || "Not Rated"} classification.`
    );
  }

  if (
    priorities
      ?.bestStockToTrim
  ) {
    parts.push(
      `${priorities.bestStockToTrim.symbol} is the leading candidate for reduction or exit review.`
    );
  }

  if (
    cashDeployment?.action
  ) {
    parts.push(
      `Cash deployment guidance is ${cashDeployment.action.label.toLowerCase()}.`
    );

    if (
      cashDeployment
        ?.portfolio
        ?.recommendedDeploymentAmount >
      0
    ) {
      parts.push(
        `Approximately KES ${roundMoney(
          cashDeployment
            .portfolio
            .recommendedDeploymentAmount
        ).toLocaleString(
          "en-US",
          {
            minimumFractionDigits:
              2,

            maximumFractionDigits:
              2
          }
        )} may be considered for deployment.`
      );
    }
  }

  if (
    dividendAdvice?.action
  ) {
    parts.push(
      `Dividend guidance is ${dividendAdvice.action.label.toLowerCase()}.`
    );
  }

  if (
    analytics
      ?.portfolio
      ?.availableCash !==
      null &&
    analytics
      ?.portfolio
      ?.availableCash !==
      undefined
  ) {
    parts.push(
      `Available portfolio cash is approximately KES ${roundMoney(
        analytics
          .portfolio
          .availableCash
      ).toLocaleString(
        "en-US",
        {
          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2
        }
      )}.`
    );
  }

  parts.push(
    "All recommendations are advisory and should be reviewed against current market prices, investor objectives, risk tolerance, and broker information before any transaction."
  );

  return parts.join(
    " "
  );
}

/*
 * ============================================================
 * STATUS CLASSIFICATION
 * ============================================================
 */

function classifyAdvisorStatus({
  portfolioQuality,
  queue,
  recommendations
}) {
  if (
    queue
      ?.summary
      ?.critical >
    0
  ) {
    return {
      status:
        "CRITICAL_REVIEW",

      actionLevel:
        "IMMEDIATE"
    };
  }

  if (
    queue
      ?.summary
      ?.high >
    0 ||
    portfolioQuality
      ?.status ===
      "ACTION_REQUIRED"
  ) {
    return {
      status:
        "ACTION_REQUIRED",

      actionLevel:
        "HIGH"
    };
  }

  if (
    portfolioQuality
      ?.status ===
      "REVIEW"
  ) {
    return {
      status:
        "REVIEW",

      actionLevel:
        "MEDIUM"
    };
  }

  if (
    recommendations
      ?.rated <=
    0
  ) {
    return {
      status:
        "LIMITED_DATA",

      actionLevel:
        "LOW"
    };
  }

  return {
    status:
      "AVAILABLE",

    actionLevel:
      "ROUTINE"
  };
}

/*
 * ============================================================
 * PC-023A6
 * COACH G INVESTMENT ADVICE
 * ============================================================
 */

export async function buildCoachGInvestmentAdvice() {
  const [
    analytics,
    health,
    queue,
    portfolioQuality
  ] = await Promise.all([
    buildUnifiedPortfolioAnalytics(),

    buildPortfolioHealthScore(),

    buildExecutiveActionQueue(),

    buildOverallPortfolioInvestmentRating()
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

      portfolio: {
        totalValue:
          0,

        availableCash:
          0,

        holdingsCount:
          0
      },

      portfolioQuality,

      recommendations: {
        status:
          "NO_INVESTMENTS",

        total:
          0,

        rated:
          0,

        recommendations:
          []
      },

      recommendationSummary:
        null,

      capitalAllocation:
        null,

      cashDeployment:
        null,

      dividendReinvestment:
        null,

      priorities:
        null,

      insights:
        [],

      narrative:
        "Coach G investment advice is not available because the portfolio is not ready.",

      sources: {
        analytics,
        health,
        queue,
        portfolioQuality
      },

      advisoryOnly:
        true
    };
  }

  const dividendRecords =
    extractDividendRecords(
      analytics
    );

  const holdings =
    enrichHoldings({
      analytics,
      dividendRecords
    });

  const sectorAllocationMap =
    buildSectorAllocationMap(
      analytics
    );

  const rebalancingSymbolMap =
    buildRebalancingSymbolMap(
      analytics
    );

  const recommendations =
    buildInvestmentRecommendations({
      holdings,

      scoreInputBuilder:
        (holding) =>
          buildHoldingScoreInputs({
            holding,
            analytics,
            health,
            sectorAllocationMap,
            rebalancingSymbolMap
          }),

      executivePriorityBuilder:
        (holding) =>
          findExecutivePriorityForHolding({
            queue,
            symbol:
              holding?.symbol,
            sector:
              holding?.sector
          })
    });

  const recommendationSummary =
    buildPortfolioRecommendationSummary(
      recommendations
        .recommendations
    );

  const liquidityScore =
    findHealthComponent(
      health,
      "LIQUIDITY"
    )
      ?.score ??
    null;

  const operationsScore =
    findHealthComponent(
      health,
      "OPERATIONS"
    )
      ?.score ??
    null;

  const criticalActions =
    number(
      queue
        ?.summary
        ?.critical
    );

  const highPriorityActions =
    number(
      queue
        ?.summary
        ?.high
    );

  const cashDeployment =
    buildCashDeploymentAdvice({
      portfolioValue:
        analytics
          ?.portfolio
          ?.totalValue,

      availableCash:
        analytics
          ?.portfolio
          ?.availableCash,

      recommendations:
        recommendations
          .recommendations,

      portfolioHealthScore:
        health?.score,

      riskScore:
        analytics
          ?.scores
          ?.risk,

      performanceScore:
        analytics
          ?.scores
          ?.performance,

      rebalancingScore:
        analytics
          ?.scores
          ?.rebalancing,

      liquidityScore,

      highPriorityActions,

      criticalActions,

      brokerReconciliationStatus:
        analytics
          ?.broker
          ?.reconciliationStatus
    });

  const capitalAllocation =
    buildCapitalAllocationAdvice({
      portfolioValue:
        analytics
          ?.portfolio
          ?.totalValue,

      availableCash:
        analytics
          ?.portfolio
          ?.availableCash,

      recommendations:
        recommendations
          .recommendations,

      portfolioHealthScore:
        health?.score,

      riskScore:
        analytics
          ?.scores
          ?.risk,

      performanceScore:
        analytics
          ?.scores
          ?.performance,

      rebalancingScore:
        analytics
          ?.scores
          ?.rebalancing,

      liquidityScore,

      highPriorityActions,

      criticalActions,

      brokerReconciliationStatus:
        analytics
          ?.broker
          ?.reconciliationStatus
    });

  const dividendHoldings =
    recommendations
      .recommendations
      .map(
        (recommendation) => ({
          symbol:
            recommendation.symbol,

          name:
            recommendation.name,

          sector:
            recommendation.sector,

          quantity:
            recommendation
              ?.portfolio
              ?.quantity,

          marketPrice:
            recommendation
              ?.portfolio
              ?.marketPrice,

          marketValue:
            recommendation
              ?.portfolio
              ?.marketValue,

          allocationPercentage:
            recommendation
              ?.portfolio
              ?.allocationPercentage,

          sectorAllocationPercentage:
            holdings.find(
              (holding) =>
                holding.symbol ===
                recommendation.symbol
            )
              ?.sectorAllocationPercentage ??
            0,

          dividendYieldPercentage:
            recommendation
              ?.portfolio
              ?.dividendYieldPercentage,

          score:
            recommendation.score,

          investmentScore:
            recommendation.score,

          incomeScore:
            recommendation
              ?.opportunity
              ?.components
              ?.find(
                (component) =>
                  component
                    ?.code ===
                  "INCOME"
              )
              ?.value ??
            null,

          confidencePercentage:
            recommendation
              .confidencePercentage,

          riskAdjustedScore:
            recommendation
              ?.riskAdjusted
              ?.score,

          riskStatus:
            recommendation
              ?.portfolio
              ?.riskStatus,

          rating:
            recommendation.rating,

          action:
            recommendation.action
        })
      );

  const dividendAdvice =
    buildDividendReinvestmentAdvice({
      dividendRecords,

      holdings:
        dividendHoldings,

      portfolioValue:
        analytics
          ?.portfolio
          ?.totalValue,

      availableCash:
        analytics
          ?.portfolio
          ?.availableCash,

      portfolioHealthScore:
        health?.score,

      riskScore:
        analytics
          ?.scores
          ?.risk,

      liquidityScore,

      highPriorityActions,

      criticalActions,

      brokerReconciliationStatus:
        analytics
          ?.broker
          ?.reconciliationStatus
    });

  const priorities =
    buildInvestmentPriorityList({
      recommendationSummary,
      cashDeployment,
      dividendAdvice,
      portfolioQuality,
      queue
    });

  const insights =
    buildInvestmentInsights({
      portfolioQuality,
      recommendationSummary,
      cashDeployment,
      dividendAdvice,
      analytics,
      queue
    });

  const classification =
    classifyAdvisorStatus({
      portfolioQuality,
      queue,
      recommendations
    });

  const narrative =
    buildCoachGNarrative({
      portfolioQuality,
      recommendationSummary,
      cashDeployment,
      dividendAdvice,
      priorities,
      analytics
    });

  const averageRecommendationScore =
    nullableNumber(
      recommendationSummary
        ?.averageScore
    );

  const overallIntelligenceScore =
    roundScore(
      average([
        portfolioQuality?.score,
        averageRecommendationScore,
        cashDeployment
          ?.readinessScore,
        dividendAdvice
          ?.readinessScore,
        health?.score,
        operationsScore
      ]) ||
      0
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      classification.status,

    actionLevel:
      classification
        .actionLevel,

    intelligenceScore:
      overallIntelligenceScore,

    message:
      narrative,

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

    scores: {
      intelligence:
        overallIntelligenceScore,

      portfolioQuality:
        portfolioQuality
          ?.score ??
        null,

      portfolioHealth:
        health?.score ??
        null,

      risk:
        analytics
          ?.scores
          ?.risk ??
        null,

      performance:
        analytics
          ?.scores
          ?.performance ??
        null,

      rebalancing:
        analytics
          ?.scores
          ?.rebalancing ??
        null,

      liquidity:
        liquidityScore,

      operations:
        operationsScore,

      recommendationAverage:
        averageRecommendationScore,

      cashDeploymentReadiness:
        cashDeployment
          ?.readinessScore ??
        null,

      dividendReinvestmentReadiness:
        dividendAdvice
          ?.readinessScore ??
        null
    },

    portfolioQuality,

    recommendations,

    recommendationSummary,

    topOpportunities:
      loadTopInvestmentOpportunities(
        recommendations
          .recommendations,
        5
      ),

    stocksToReduce:
      loadStocksToReduce(
        recommendations
          .recommendations,
        5
      ),

    highestRiskRecommendations:
      loadHighestRiskRecommendations(
        recommendations
          .recommendations,
        5
      ),

    cashDeployment,

    capitalAllocation,

    dividendReinvestment:
      dividendAdvice,

    priorities,

    insights,

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

      criticalActions,

      highActions:
        highPriorityActions,

      topAction:
        queue?.topAction ||
        null
    },

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
      analytics,
      health,
      queue,
      portfolioQuality
    },

    advisoryOnly:
      true
  };
}

/*
 * ============================================================
 * COMPACT EXECUTIVE SUMMARY
 * ============================================================
 */

export async function buildCoachGExecutiveInvestmentSummary() {
  const advice =
    await buildCoachGInvestmentAdvice();

  return {
    generatedAt:
      advice.generatedAt,

    status:
      advice.status,

    actionLevel:
      advice.actionLevel,

    intelligenceScore:
      advice
        ?.intelligenceScore ||
      0,

    portfolioQualityScore:
      advice
        ?.scores
        ?.portfolioQuality ??
      null,

    portfolioQualityRating:
      advice
        ?.portfolioQuality
        ?.rating
        ?.label ||
      "Not Rated",

    portfolioHealthScore:
      advice
        ?.scores
        ?.portfolioHealth ??
      null,

    portfolioValue:
      advice
        ?.portfolio
        ?.totalValue ||
      0,

    availableCash:
      advice
        ?.portfolio
        ?.availableCash ||
      0,

    bestOpportunity:
      advice
        ?.priorities
        ?.bestStockToBuy ||
      null,

    bestStockToAdd:
      advice
        ?.priorities
        ?.bestStockToAdd ||
      null,

    bestStockToTrim:
      advice
        ?.priorities
        ?.bestStockToTrim ||
      null,

    highestPortfolioRisk:
      advice
        ?.priorities
        ?.highestPortfolioRisk ||
      null,

    bestDividendOpportunity:
      advice
        ?.priorities
        ?.bestDividendOpportunity ||
      null,

    cashDeploymentAction:
      advice
        ?.cashDeployment
        ?.action ||
      null,

    recommendedDeploymentAmount:
      advice
        ?.cashDeployment
        ?.portfolio
        ?.recommendedDeploymentAmount ||
      0,

    dividendReinvestmentAction:
      advice
        ?.dividendReinvestment
        ?.action ||
      null,

    recommendedDividendReinvestment:
      advice
        ?.dividendReinvestment
        ?.reinvestment
        ?.amount ||
      0,

    criticalActions:
      advice
        ?.executive
        ?.criticalActions ||
      0,

    highActions:
      advice
        ?.executive
        ?.highActions ||
      0,

    narrative:
      advice.narrative
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export async function loadCoachGInvestmentRecommendations() {
  const advice =
    await buildCoachGInvestmentAdvice();

  return advice
    ?.recommendations
    ?.recommendations ||
    [];
}

export async function loadCoachGTopInvestmentOpportunities(
  limit = 5
) {
  const advice =
    await buildCoachGInvestmentAdvice();

  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  return safeArray(
    advice
      ?.topOpportunities
  ).slice(
    0,
    safeLimit
  );
}

export async function loadCoachGStocksToReduce(
  limit = 5
) {
  const advice =
    await buildCoachGInvestmentAdvice();

  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  return safeArray(
    advice
      ?.stocksToReduce
  ).slice(
    0,
    safeLimit
  );
}

export async function loadCoachGCapitalAllocationAdvice() {
  const advice =
    await buildCoachGInvestmentAdvice();

  return advice
    ?.capitalAllocation ||
    null;
}

export async function loadCoachGCashDeploymentAdvice() {
  const advice =
    await buildCoachGInvestmentAdvice();

  return advice
    ?.cashDeployment ||
    null;
}

export async function loadCoachGDividendReinvestmentAdvice() {
  const advice =
    await buildCoachGInvestmentAdvice();

  return advice
    ?.dividendReinvestment ||
    null;
}

export async function loadCoachGInvestmentPriorities() {
  const advice =
    await buildCoachGInvestmentAdvice();

  return advice
    ?.priorities ||
    null;
}

export async function loadCoachGInvestmentInsights() {
  const advice =
    await buildCoachGInvestmentAdvice();

  return advice
    ?.insights ||
    [];
}

export async function loadHighPriorityCoachGInvestmentInsights() {
  const advice =
    await buildCoachGInvestmentAdvice();

  return safeArray(
    advice?.insights
  ).filter(
    (insight) =>
      [
        "CRITICAL",
        "HIGH"
      ].includes(
        normalizeStatus(
          insight?.severity
        )
      )
  );
}

export async function loadCoachGPortfolioQuality() {
  const advice =
    await buildCoachGInvestmentAdvice();

  return advice
    ?.portfolioQuality ||
    null;
}