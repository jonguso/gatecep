import {
  buildStockValuation,
  buildStockValuations,
  loadMostUndervaluedStocks,
  loadMostOvervaluedStocks,
  loadHighestConfidenceValuations,
  loadStocksBelowBuyPrice,
  loadStocksAboveSellPrice
} from "./coreValuationEngine";

import {
  buildRelativeValuationAnalysis,
  buildRelativeValuationBatch,
  loadMostAttractiveRelativeValuations,
  loadLargestPeerDiscounts,
  loadLargestPeerPremiums,
  loadHighestConfidenceRelativeValuations
} from "./relativeValuationEngine";

import {
  buildStockGrowthAndIncomeForecast,
  buildStockGrowthAndIncomeForecasts,
  loadHighestExpectedTotalReturnStocks,
  loadHighestExpectedEarningsGrowthStocks,
  loadHighestExpectedDividendGrowthStocks,
  loadHighestForecastConfidenceStocks,
  loadUnsustainableDividendForecasts
} from "./growthDividendForecastEngine";

import {
  buildResearchConfidenceAnalysis,
  buildResearchConfidenceBatch,
  loadHighestResearchQuality,
  loadLowestResearchQuality,
  loadHighestValuationConfidence,
  loadHighPriorityResearchWarnings
} from "./researchDataQualityEngine";

import {
  buildCoachGInvestmentThesis,
  buildCoachGInvestmentTheses,
  loadMostAttractiveInvestmentTheses,
  loadHighestConvictionInvestmentTheses,
  loadHighestExpectedReturnTheses,
  loadHighestRiskInvestmentTheses
} from "./investmentThesisEngine";

/*
 * ============================================================
 * PC-023B6
 * RESEARCH REPORT ORCHESTRATION SERVICE
 * ============================================================
 *
 * Combines:
 *
 * PC-023B1 — Core valuation
 * PC-023B2 — Relative valuation and peer comparison
 * PC-023B3 — Growth, dividend, and CAGR forecasts
 * PC-023B4 — Research data quality and confidence
 * PC-023B5 — Coach G investment thesis
 *
 * Produces:
 *
 * - complete stock research reports,
 * - batch research reports,
 * - valuation and forecast summaries,
 * - bull and bear cases,
 * - catalysts and risks,
 * - entry and exit price levels,
 * - research confidence,
 * - ranked research opportunities,
 * - market-wide research intelligence.
 *
 * Safeguards:
 *
 * - advisory only,
 * - does not execute trades,
 * - does not modify holdings or cash,
 * - does not submit broker orders,
 * - does not fabricate missing data.
 * ============================================================
 */

export const RESEARCH_REPORT_STATUSES = {
  AVAILABLE: "AVAILABLE",
  PARTIAL: "PARTIAL",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  CONFLICTING_EVIDENCE: "CONFLICTING_EVIDENCE",
  HIGH_RISK_REVIEW: "HIGH_RISK_REVIEW",
  NOT_READY: "NOT_READY"
};

export const RESEARCH_REPORT_CLASSIFICATIONS = {
  VERY_ATTRACTIVE: "VERY_ATTRACTIVE",
  ATTRACTIVE: "ATTRACTIVE",
  MODERATELY_ATTRACTIVE: "MODERATELY_ATTRACTIVE",
  BALANCED: "BALANCED",
  CAUTIOUS: "CAUTIOUS",
  UNATTRACTIVE: "UNATTRACTIVE",
  HIGH_RISK: "HIGH_RISK",
  NOT_RATED: "NOT_RATED"
};

export const RESEARCH_REPORT_SECTIONS = {
  EXECUTIVE_SUMMARY: "EXECUTIVE_SUMMARY",
  VALUATION: "VALUATION",
  RELATIVE_VALUATION: "RELATIVE_VALUATION",
  GROWTH_FORECAST: "GROWTH_FORECAST",
  DIVIDEND_FORECAST: "DIVIDEND_FORECAST",
  DATA_QUALITY: "DATA_QUALITY",
  INVESTMENT_THESIS: "INVESTMENT_THESIS",
  BULL_CASE: "BULL_CASE",
  BEAR_CASE: "BEAR_CASE",
  CATALYSTS: "CATALYSTS",
  RISKS: "RISKS",
  PRICE_LEVELS: "PRICE_LEVELS",
  ACTION_CONDITIONS: "ACTION_CONDITIONS",
  INVALIDATION_CONDITIONS: "INVALIDATION_CONDITIONS"
};

export const DEFAULT_RESEARCH_REPORT_POLICY = {
  includeRawSources: true,
  maximumBullCaseItems: 8,
  maximumBearCaseItems: 8,
  maximumCatalystItems: 8,
  maximumRiskItems: 10,
  maximumWarnings: 15,
  minimumReportCoveragePercentage: 35,
  preferredReportCoveragePercentage: 70
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

function normalizeText(value) {
  return String(value || "")
    .trim();
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

function normalizePolicy(policy = {}) {
  return {
    includeRawSources:
      policy?.includeRawSources !==
      false,

    maximumBullCaseItems:
      Math.max(
        Math.floor(
          number(
            policy
              ?.maximumBullCaseItems ??
            DEFAULT_RESEARCH_REPORT_POLICY
              .maximumBullCaseItems
          )
        ),
        0
      ),

    maximumBearCaseItems:
      Math.max(
        Math.floor(
          number(
            policy
              ?.maximumBearCaseItems ??
            DEFAULT_RESEARCH_REPORT_POLICY
              .maximumBearCaseItems
          )
        ),
        0
      ),

    maximumCatalystItems:
      Math.max(
        Math.floor(
          number(
            policy
              ?.maximumCatalystItems ??
            DEFAULT_RESEARCH_REPORT_POLICY
              .maximumCatalystItems
          )
        ),
        0
      ),

    maximumRiskItems:
      Math.max(
        Math.floor(
          number(
            policy
              ?.maximumRiskItems ??
            DEFAULT_RESEARCH_REPORT_POLICY
              .maximumRiskItems
          )
        ),
        0
      ),

    maximumWarnings:
      Math.max(
        Math.floor(
          number(
            policy
              ?.maximumWarnings ??
            DEFAULT_RESEARCH_REPORT_POLICY
              .maximumWarnings
          )
        ),
        0
      ),

    minimumReportCoveragePercentage:
      clamp(
        policy
          ?.minimumReportCoveragePercentage ??
        DEFAULT_RESEARCH_REPORT_POLICY
          .minimumReportCoveragePercentage,
        0,
        100
      ),

    preferredReportCoveragePercentage:
      clamp(
        policy
          ?.preferredReportCoveragePercentage ??
        DEFAULT_RESEARCH_REPORT_POLICY
          .preferredReportCoveragePercentage,
        0,
        100
      )
  };
}

/*
 * ============================================================
 * INPUT NORMALIZATION
 * ============================================================
 */

export function normalizeResearchSecurity(
  security = {}
) {
  return {
    ...security,

    symbol:
      normalizeSymbol(
        security?.symbol
      ),

    name:
      normalizeText(
        security?.name ||
        security?.companyName ||
        security?.symbol ||
        "Unknown"
      ),

    sector:
      normalizeText(
        security?.sector ||
        "Unknown"
      ),

    industry:
      normalizeText(
        security?.industry ||
        security?.subsector ||
        "Unknown"
      ),

    currentPrice:
      nullableNumber(
        security?.currentPrice ??
        security?.marketPrice ??
        security?.price
      ),

    marketDataUpdatedAt:
      security
        ?.marketDataUpdatedAt ??
      security
        ?.priceUpdatedAt ??
      security
        ?.updatedAt ??
      null,

    financialDataUpdatedAt:
      security
        ?.financialDataUpdatedAt ??
      security
        ?.financialUpdatedAt ??
      null,

    dividendDataUpdatedAt:
      security
        ?.dividendDataUpdatedAt ??
      null,

    peerDataUpdatedAt:
      security
        ?.peerDataUpdatedAt ??
      null,

    historicalRevenue:
      safeArray(
        security
          ?.historicalRevenue
      ),

    historicalEarnings:
      safeArray(
        security
          ?.historicalEarnings
      ),

    historicalFreeCashFlow:
      safeArray(
        security
          ?.historicalFreeCashFlow
      ),

    historicalDividends:
      safeArray(
        security
          ?.historicalDividends
      ),

    researchSources:
      safeArray(
        security
          ?.researchSources ??
        security?.sources
      )
  };
}

function buildResearchDataObject(
  security
) {
  return {
    currentPrice:
      security
        ?.currentPrice,

    revenue:
      security
        ?.revenue ??
      security
        ?.currentRevenue,

    netIncome:
      security
        ?.netIncome ??
      security
        ?.currentEarnings,

    freeCashFlow:
      security
        ?.freeCashFlow ??
      security
        ?.currentFreeCashFlow,

    totalAssets:
      security
        ?.totalAssets,

    totalLiabilities:
      security
        ?.totalLiabilities,

    earningsPerShare:
      security
        ?.earningsPerShare ??
      security
        ?.eps,

    bookValuePerShare:
      security
        ?.bookValuePerShare,

    freeCashFlowPerShare:
      security
        ?.freeCashFlowPerShare,

    dividendPerShare:
      security
        ?.dividendPerShare ??
      security
        ?.currentDividendPerShare,

    peRatio:
      security
        ?.peRatio,

    priceToBookRatio:
      security
        ?.priceToBookRatio,

    priceToSalesRatio:
      security
        ?.priceToSalesRatio,

    evToEbitdaRatio:
      security
        ?.evToEbitdaRatio,

    dividendYieldPercentage:
      security
        ?.dividendYieldPercentage,

    freeCashFlowYieldPercentage:
      security
        ?.freeCashFlowYieldPercentage,

    payoutRatioPercentage:
      security
        ?.payoutRatioPercentage,

    dividendCoverageRatio:
      security
        ?.dividendCoverageRatio,

    revenueGrowthPercentage:
      security
        ?.revenueGrowthPercentage,

    earningsGrowthPercentage:
      security
        ?.earningsGrowthPercentage,

    freeCashFlowGrowthPercentage:
      security
        ?.freeCashFlowGrowthPercentage,

    dividendGrowthPercentage:
      security
        ?.dividendGrowthPercentage,

    discountRatePercentage:
      security
        ?.discountRatePercentage,

    terminalGrowthPercentage:
      security
        ?.terminalGrowthPercentage
  };
}

/*
 * ============================================================
 * COVERAGE
 * ============================================================
 */

function calculateReportCoverage({
  valuation,
  relativeValuation,
  forecast,
  researchConfidence,
  thesis
}) {
  const sections = [
    {
      code:
        RESEARCH_REPORT_SECTIONS
          .VALUATION,

      available:
        valuation?.fairValue !==
          null &&
        valuation?.fairValue !==
          undefined,

      weight:
        0.23
    },
    {
      code:
        RESEARCH_REPORT_SECTIONS
          .RELATIVE_VALUATION,

      available:
        relativeValuation
          ?.fairValue !==
          null &&
        relativeValuation
          ?.fairValue !==
          undefined,

      weight:
        0.14
    },
    {
      code:
        RESEARCH_REPORT_SECTIONS
          .GROWTH_FORECAST,

      available:
        forecast
          ?.expected
          ?.earningsCagrPercentage !==
          null &&
        forecast
          ?.expected
          ?.earningsCagrPercentage !==
          undefined,

      weight:
        0.16
    },
    {
      code:
        RESEARCH_REPORT_SECTIONS
          .DIVIDEND_FORECAST,

      available:
        forecast
          ?.forecast
          ?.dividends
          ?.status ===
        "AVAILABLE",

      weight:
        0.09
    },
    {
      code:
        RESEARCH_REPORT_SECTIONS
          .DATA_QUALITY,

      available:
        researchConfidence
          ?.researchQuality
          ?.score !==
          null &&
        researchConfidence
          ?.researchQuality
          ?.score !==
          undefined,

      weight:
        0.14
    },
    {
      code:
        RESEARCH_REPORT_SECTIONS
          .INVESTMENT_THESIS,

      available:
        thesis?.score !==
          null &&
        thesis?.score !==
          undefined,

      weight:
        0.24
    }
  ];

  const available =
    sections.filter(
      (section) =>
        section.available
    );

  const availableWeight =
    sum(
      available.map(
        (section) =>
          section.weight
      )
    );

  const totalWeight =
    sum(
      sections.map(
        (section) =>
          section.weight
      )
    );

  return {
    percentage:
      totalWeight > 0
        ? roundPercent(
            (
              availableWeight /
              totalWeight
            ) *
            100
          )
        : 0,

    availableSections:
      available.length,

    totalSections:
      sections.length,

    sections
  };
}

/*
 * ============================================================
 * EXECUTIVE SUMMARY
 * ============================================================
 */

function buildExecutiveSummary({
  security,
  valuation,
  relativeValuation,
  forecast,
  researchConfidence,
  thesis,
  coverage
}) {
  return {
    symbol:
      security.symbol,

    name:
      security.name,

    sector:
      security.sector,

    currentPrice:
      roundMoney(
        security
          .currentPrice
      ),

    thesisScore:
      thesis?.score ??
      null,

    thesisClassification:
      thesis
        ?.classification
        ?.label ||
      "Not Rated",

    recommendedPosture:
      thesis
        ?.classification
        ?.action ||
      "BUILD_MORE_EVIDENCE",

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

    absoluteFairValue:
      valuation
        ?.fairValue ??
      null,

    relativeFairValue:
      relativeValuation
        ?.fairValue ??
      null,

    blendedFairValue:
      thesis
        ?.expected
        ?.fairValue ??
      null,

    expectedUpsidePercentage:
      thesis
        ?.expected
        ?.upsidePercentage ??
      null,

    expectedEarningsCagrPercentage:
      thesis
        ?.expected
        ?.earningsCagrPercentage ??
      null,

    expectedDividendCagrPercentage:
      thesis
        ?.expected
        ?.dividendCagrPercentage ??
      null,

    expectedTotalReturnCagrPercentage:
      thesis
        ?.expected
        ?.totalReturnCagrPercentage ??
      null,

    researchQualityScore:
      researchConfidence
        ?.researchQuality
        ?.score ??
      null,

    valuationConfidencePercentage:
      researchConfidence
        ?.valuationConfidence
        ?.score ??
      null,

    forecastConfidencePercentage:
      forecast
        ?.confidence
        ?.score ??
      null,

    reportCoveragePercentage:
      coverage.percentage,

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

    narrative:
      thesis?.narrative ||
      thesis?.message ||
      "No investment thesis narrative is available."
  };
}

/*
 * ============================================================
 * REPORT STATUS
 * ============================================================
 */

function classifyReportStatus({
  coverage,
  thesis,
  researchConfidence,
  policy
}) {
  if (
    thesis?.status ===
    "HIGH_RISK_REVIEW"
  ) {
    return {
      status:
        RESEARCH_REPORT_STATUSES
          .HIGH_RISK_REVIEW,

      actionLevel:
        "IMMEDIATE"
    };
  }

  if (
    thesis?.status ===
      "CONFLICTING_EVIDENCE" ||
    researchConfidence
      ?.status ===
      "CONFLICTING_DATA"
  ) {
    return {
      status:
        RESEARCH_REPORT_STATUSES
          .CONFLICTING_EVIDENCE,

      actionLevel:
        "HIGH"
    };
  }

  if (
    coverage.percentage <
    policy
      .minimumReportCoveragePercentage
  ) {
    return {
      status:
        RESEARCH_REPORT_STATUSES
          .INSUFFICIENT_DATA,

      actionLevel:
        "LOW"
    };
  }

  if (
    coverage.percentage <
      policy
        .preferredReportCoveragePercentage ||
    thesis?.status ===
      "PARTIAL"
  ) {
    return {
      status:
        RESEARCH_REPORT_STATUSES
          .PARTIAL,

      actionLevel:
        "MEDIUM"
    };
  }

  return {
    status:
      RESEARCH_REPORT_STATUSES
        .AVAILABLE,

    actionLevel:
      "ROUTINE"
  };
}

/*
 * ============================================================
 * SINGLE RESEARCH REPORT
 * ============================================================
 */

export function buildStockResearchReport({
  security,
  securities = [],
  valuationPolicy = {},
  relativeValuationPolicy = {},
  forecastPolicy = {},
  researchQualityPolicy = {},
  thesisPolicy = {},
  reportPolicy = {}
} = {}) {
  const normalizedReportPolicy =
    normalizePolicy(
      reportPolicy
    );

  const normalizedSecurity =
    normalizeResearchSecurity(
      security
    );

  if (
    !normalizedSecurity.symbol
  ) {
    return {
      generatedAt:
        new Date()
          .toISOString(),

      status:
        RESEARCH_REPORT_STATUSES
          .NOT_READY,

      actionLevel:
        "UNKNOWN",

      symbol:
        null,

      message:
        "A security symbol is required.",

      advisoryOnly:
        true
    };
  }

  const normalizedUniverse =
    safeArray(securities)
      .map(
        normalizeResearchSecurity
      )
      .filter(
        (item) =>
          item.symbol
      );

  const valuation =
    buildStockValuation({
      ...normalizedSecurity,

      freeCashFlow:
        normalizedSecurity
          ?.freeCashFlow ??
        normalizedSecurity
          ?.currentFreeCashFlow,

      growthPercentage:
        normalizedSecurity
          ?.freeCashFlowGrowthPercentage,

      freeCashFlowGrowthPercentage:
        normalizedSecurity
          ?.freeCashFlowGrowthPercentage,

      dividendPerShare:
        normalizedSecurity
          ?.dividendPerShare ??
        normalizedSecurity
          ?.currentDividendPerShare,

      earningsPerShare:
        normalizedSecurity
          ?.earningsPerShare ??
        normalizedSecurity
          ?.eps,

      policy:
        valuationPolicy
    });

  const relativeValuation =
    buildRelativeValuationAnalysis({
      target:
        normalizedSecurity,

      securities:
        normalizedUniverse.length
          ? normalizedUniverse
          : [
              normalizedSecurity
            ],

      policy:
        relativeValuationPolicy
    });

  const forecast =
    buildStockGrowthAndIncomeForecast({
      ...normalizedSecurity,

      currentRevenue:
        normalizedSecurity
          ?.currentRevenue ??
        normalizedSecurity
          ?.revenue,

      currentEarnings:
        normalizedSecurity
          ?.currentEarnings ??
        normalizedSecurity
          ?.netIncome,

      currentEarningsPerShare:
        normalizedSecurity
          ?.currentEarningsPerShare ??
        normalizedSecurity
          ?.earningsPerShare ??
        normalizedSecurity
          ?.eps,

      currentFreeCashFlow:
        normalizedSecurity
          ?.currentFreeCashFlow ??
        normalizedSecurity
          ?.freeCashFlow,

      currentDividendPerShare:
        normalizedSecurity
          ?.currentDividendPerShare ??
        normalizedSecurity
          ?.dividendPerShare,

      policy:
        forecastPolicy
    });

  const researchConfidence =
    buildResearchConfidenceAnalysis({
      symbol:
        normalizedSecurity.symbol,

      researchData:
        buildResearchDataObject(
          normalizedSecurity
        ),

      historicalRevenue:
        normalizedSecurity
          .historicalRevenue,

      historicalEarnings:
        normalizedSecurity
          .historicalEarnings,

      historicalFreeCashFlow:
        normalizedSecurity
          .historicalFreeCashFlow,

      historicalDividends:
        normalizedSecurity
          .historicalDividends,

      marketDataUpdatedAt:
        normalizedSecurity
          .marketDataUpdatedAt,

      financialDataUpdatedAt:
        normalizedSecurity
          .financialDataUpdatedAt,

      dividendDataUpdatedAt:
        normalizedSecurity
          .dividendDataUpdatedAt,

      peerDataUpdatedAt:
        normalizedSecurity
          .peerDataUpdatedAt,

      sources:
        normalizedSecurity
          .researchSources,

      valuation,

      relativeValuation,

      forecast,

      policy:
        researchQualityPolicy
    });

  const thesis =
    buildCoachGInvestmentThesis({
      ...normalizedSecurity,

      valuation,

      relativeValuation,

      forecast,

      researchConfidence,

      investmentScore:
        normalizedSecurity
          ?.investmentScore ??
        normalizedSecurity
          ?.score,

      qualityScore:
        normalizedSecurity
          ?.qualityScore,

      relativeQualityScore:
        relativeValuation
          ?.composite
          ?.qualityComparison
          ?.score,

      riskScore:
        normalizedSecurity
          ?.riskScore,

      policy:
        thesisPolicy
    });

  const coverage =
    calculateReportCoverage({
      valuation,

      relativeValuation,

      forecast,

      researchConfidence,

      thesis
    });

  const classification =
    classifyReportStatus({
      coverage,

      thesis,

      researchConfidence,

      policy:
        normalizedReportPolicy
    });

  const executiveSummary =
    buildExecutiveSummary({
      security:
        normalizedSecurity,

      valuation,

      relativeValuation,

      forecast,

      researchConfidence,

      thesis,

      coverage
    });

  const warnings = [
    ...safeArray(
      researchConfidence
        ?.warnings
    ),

    ...safeArray(
      valuation
        ?.warnings
    ),

    ...safeArray(
      forecast
        ?.warnings
    )
  ].slice(
    0,
    normalizedReportPolicy
      .maximumWarnings
  );

  const report = {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      classification.status,

    actionLevel:
      classification
        .actionLevel,

    symbol:
      normalizedSecurity
        .symbol,

    name:
      normalizedSecurity
        .name,

    sector:
      normalizedSecurity
        .sector,

    industry:
      normalizedSecurity
        .industry,

    currency:
      normalizedSecurity
        ?.currency ||
      "KES",

    executiveSummary,

    scorecard: {
      thesisScore:
        thesis?.score ??
        null,

      convictionPercentage:
        thesis
          ?.conviction
          ?.score ??
        0,

      absoluteValuationConfidence:
        valuation
          ?.confidence
          ?.score ??
        0,

      relativeValuationConfidence:
        relativeValuation
          ?.confidence
          ?.score ??
        0,

      forecastConfidence:
        forecast
          ?.confidence
          ?.score ??
        0,

      researchQuality:
        researchConfidence
          ?.researchQuality
          ?.score ??
        0,

      valuationConfidence:
        researchConfidence
          ?.valuationConfidence
          ?.score ??
        0,

      reportCoverage:
        coverage.percentage
    },

    valuation: {
      status:
        valuation?.status,

      currentPrice:
        valuation
          ?.currentPrice ??
        normalizedSecurity
          .currentPrice,

      fairValue:
        valuation
          ?.fairValue ??
        null,

      classification:
        valuation
          ?.classification ||
        null,

      confidence:
        valuation
          ?.confidence ||
        null,

      upside:
        valuation
          ?.upside ||
        null,

      priceLevels:
        valuation
          ?.priceLevels ||
        null,

      summary:
        valuation
          ?.summary ||
        null,

      models:
        valuation
          ?.models ||
        null
    },

    relativeValuation: {
      status:
        relativeValuation
          ?.status,

      fairValue:
        relativeValuation
          ?.fairValue ??
        null,

      classification:
        relativeValuation
          ?.classification ||
        null,

      relativeScore:
        relativeValuation
          ?.relativeScore ??
        null,

      confidence:
        relativeValuation
          ?.confidence ||
        null,

      priceLevels:
        relativeValuation
          ?.priceLevels ||
        null,

      peerGroup:
        relativeValuation
          ?.peerGroup ||
        null,

      ranking:
        relativeValuation
          ?.ranking ||
        null,

      metrics:
        relativeValuation
          ?.composite
          ?.metrics ||
        []
    },

    forecast: {
      status:
        forecast?.status,

      assumptions:
        forecast
          ?.assumptions ||
        null,

      expected:
        forecast
          ?.expected ||
        null,

      scenarios:
        forecast
          ?.scenarios ||
        [],

      dividends:
        forecast
          ?.forecast
          ?.dividends ||
        null,

      confidence:
        forecast
          ?.confidence ||
        null,

      summary:
        forecast
          ?.summary ||
        null
    },

    researchConfidence: {
      status:
        researchConfidence
          ?.status,

      overallScore:
        researchConfidence
          ?.overallScore ??
        null,

      overallClassification:
        researchConfidence
          ?.overallClassification ||
        null,

      researchQuality:
        researchConfidence
          ?.researchQuality ||
        null,

      valuationConfidence:
        researchConfidence
          ?.valuationConfidence ||
        null
    },

    thesis: {
      status:
        thesis?.status,

      score:
        thesis?.score ??
        null,

      classification:
        thesis
          ?.classification ||
        null,

      action:
        thesis
          ?.action ||
        null,

      conviction:
        thesis
          ?.conviction ||
        null,

      components:
        thesis
          ?.components ||
        [],

      conclusions:
        thesis
          ?.conclusions ||
        null,

      bullCase:
        safeArray(
          thesis?.bullCase
        ).slice(
          0,
          normalizedReportPolicy
            .maximumBullCaseItems
        ),

      bearCase:
        safeArray(
          thesis?.bearCase
        ).slice(
          0,
          normalizedReportPolicy
            .maximumBearCaseItems
        ),

      catalysts:
        safeArray(
          thesis?.catalysts
        ).slice(
          0,
          normalizedReportPolicy
            .maximumCatalystItems
        ),

      risks:
        safeArray(
          thesis?.risks
        ).slice(
          0,
          normalizedReportPolicy
            .maximumRiskItems
        ),

      actionConditions:
        thesis
          ?.actionConditions ||
        [],

      invalidationConditions:
        thesis
          ?.invalidationConditions ||
        [],

      narrative:
        thesis
          ?.narrative ||
        thesis
          ?.message ||
        null
    },

    priceLevels: {
      currentPrice:
        normalizedSecurity
          .currentPrice,

      strongBuyBelow:
        thesis
          ?.priceLevels
          ?.strongBuyBelow ??
        null,

      buyUnder:
        thesis
          ?.priceLevels
          ?.buyUnder ??
        null,

      fairValueLow:
        thesis
          ?.priceLevels
          ?.fairValueLow ??
        null,

      fairValue:
        thesis
          ?.expected
          ?.fairValue ??
        null,

      fairValueHigh:
        thesis
          ?.priceLevels
          ?.fairValueHigh ??
        null,

      sellOver:
        thesis
          ?.priceLevels
          ?.sellOver ??
        null
    },

    coverage,

    warnings,

    message:
      thesis
        ?.narrative ||
      `Research report for ${normalizedSecurity.symbol} is ${formatLabel(
        classification.status
      )}.`,

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

    policy: {
      valuationPolicy,

      relativeValuationPolicy,

      forecastPolicy,

      researchQualityPolicy,

      thesisPolicy,

      reportPolicy:
        normalizedReportPolicy
    },

    advisoryOnly:
      true
  };

  if (
    normalizedReportPolicy
      .includeRawSources
  ) {
    report.sources = {
      security:
        normalizedSecurity,

      valuation,

      relativeValuation,

      forecast,

      researchConfidence,

      thesis
    };
  }

  return report;
}

/*
 * ============================================================
 * COMPATIBLE ALIAS
 * ============================================================
 */

export function buildResearchReport(
  options = {}
) {
  return buildStockResearchReport(
    options
  );
}

/*
 * ============================================================
 * COMPACT REPORT SUMMARY
 * ============================================================
 */

export function buildStockResearchReportSummary(
  report
) {
  return {
    generatedAt:
      report?.generatedAt ||
      null,

    symbol:
      report?.symbol ||
      null,

    name:
      report?.name ||
      null,

    status:
      report?.status ||
      RESEARCH_REPORT_STATUSES
        .INSUFFICIENT_DATA,

    actionLevel:
      report?.actionLevel ||
      "UNKNOWN",

    thesisScore:
      report
        ?.thesis
        ?.score ??
      null,

    classification:
      report
        ?.thesis
        ?.classification
        ?.label ||
      "Not Rated",

    recommendedPosture:
      report
        ?.thesis
        ?.classification
        ?.action ||
      "BUILD_MORE_EVIDENCE",

    convictionPercentage:
      report
        ?.thesis
        ?.conviction
        ?.score ??
      0,

    conviction:
      report
        ?.thesis
        ?.conviction
        ?.classification
        ?.label ||
      "Not Available",

    currentPrice:
      report
        ?.priceLevels
        ?.currentPrice ??
      null,

    fairValue:
      report
        ?.priceLevels
        ?.fairValue ??
      null,

    upsidePercentage:
      report
        ?.executiveSummary
        ?.expectedUpsidePercentage ??
      null,

    totalReturnCagrPercentage:
      report
        ?.executiveSummary
        ?.expectedTotalReturnCagrPercentage ??
      null,

    earningsCagrPercentage:
      report
        ?.executiveSummary
        ?.expectedEarningsCagrPercentage ??
      null,

    dividendCagrPercentage:
      report
        ?.executiveSummary
        ?.expectedDividendCagrPercentage ??
      null,

    buyUnder:
      report
        ?.priceLevels
        ?.buyUnder ??
      null,

    sellOver:
      report
        ?.priceLevels
        ?.sellOver ??
      null,

    researchQualityScore:
      report
        ?.scorecard
        ?.researchQuality ??
      null,

    valuationConfidencePercentage:
      report
        ?.scorecard
        ?.valuationConfidence ??
      null,

    reportCoveragePercentage:
      report
        ?.coverage
        ?.percentage ??
      0,

    topBullCase:
      report
        ?.thesis
        ?.bullCase?.[0] ||
      null,

    topBearCase:
      report
        ?.thesis
        ?.bearCase?.[0] ||
      null,

    topCatalyst:
      report
        ?.thesis
        ?.catalysts?.[0] ||
      null,

    topRisk:
      report
        ?.thesis
        ?.risks?.[0] ||
      null,

    warningCount:
      report
        ?.warnings
        ?.length ||
      0,

    message:
      report?.message ||
      "No research report summary is available."
  };
}

/*
 * ============================================================
 * BATCH ORCHESTRATION
 * ============================================================
 */

export function buildResearchReportBatch({
  securities = [],
  inputBuilder = null,
  valuationPolicy = {},
  relativeValuationPolicy = {},
  forecastPolicy = {},
  researchQualityPolicy = {},
  thesisPolicy = {},
  reportPolicy = {}
} = {}) {
  const normalized =
    safeArray(securities)
      .map(
        normalizeResearchSecurity
      )
      .filter(
        (security) =>
          security.symbol
      );

  const reports =
    normalized.map(
      (security) => {
        const extra =
          typeof inputBuilder ===
            "function"
            ? inputBuilder(
                security
              ) || {}
            : {};

        return buildStockResearchReport({
          security: {
            ...security,

            ...extra
          },

          securities:
            normalized,

          valuationPolicy,

          relativeValuationPolicy,

          forecastPolicy,

          researchQualityPolicy,

          thesisPolicy,

          reportPolicy
        });
      }
    );

  const available =
    reports.filter(
      (report) =>
        [
          RESEARCH_REPORT_STATUSES
            .AVAILABLE,
          RESEARCH_REPORT_STATUSES
            .PARTIAL,
          RESEARCH_REPORT_STATUSES
            .CONFLICTING_EVIDENCE,
          RESEARCH_REPORT_STATUSES
            .HIGH_RISK_REVIEW
        ].includes(
          report?.status
        )
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      reports.length
        ? RESEARCH_REPORT_STATUSES
            .AVAILABLE
        : RESEARCH_REPORT_STATUSES
            .INSUFFICIENT_DATA,

    total:
      reports.length,

    available:
      available.length,

    unavailable:
      reports.length -
      available.length,

    averageThesisScore:
      roundPercent(
        average(
          reports.map(
            (report) =>
              report
                ?.thesis
                ?.score
          )
        )
      ),

    averageConvictionPercentage:
      roundPercent(
        average(
          reports.map(
            (report) =>
              report
                ?.thesis
                ?.conviction
                ?.score
          )
        )
      ),

    averageResearchQualityScore:
      roundPercent(
        average(
          reports.map(
            (report) =>
              report
                ?.scorecard
                ?.researchQuality
          )
        )
      ),

    averageValuationConfidencePercentage:
      roundPercent(
        average(
          reports.map(
            (report) =>
              report
                ?.scorecard
                ?.valuationConfidence
          )
        )
      ),

    averageReportCoveragePercentage:
      roundPercent(
        average(
          reports.map(
            (report) =>
              report
                ?.coverage
                ?.percentage
          )
        )
      ),

    counts: {
      veryAttractive:
        reports.filter(
          (report) =>
            report
              ?.thesis
              ?.classification
              ?.code ===
            RESEARCH_REPORT_CLASSIFICATIONS
              .VERY_ATTRACTIVE
        ).length,

      attractive:
        reports.filter(
          (report) =>
            report
              ?.thesis
              ?.classification
              ?.code ===
            RESEARCH_REPORT_CLASSIFICATIONS
              .ATTRACTIVE
        ).length,

      moderatelyAttractive:
        reports.filter(
          (report) =>
            report
              ?.thesis
              ?.classification
              ?.code ===
            RESEARCH_REPORT_CLASSIFICATIONS
              .MODERATELY_ATTRACTIVE
        ).length,

      balanced:
        reports.filter(
          (report) =>
            report
              ?.thesis
              ?.classification
              ?.code ===
            RESEARCH_REPORT_CLASSIFICATIONS
              .BALANCED
        ).length,

      cautious:
        reports.filter(
          (report) =>
            report
              ?.thesis
              ?.classification
              ?.code ===
            RESEARCH_REPORT_CLASSIFICATIONS
              .CAUTIOUS
        ).length,

      unattractive:
        reports.filter(
          (report) =>
            report
              ?.thesis
              ?.classification
              ?.code ===
            RESEARCH_REPORT_CLASSIFICATIONS
              .UNATTRACTIVE
        ).length,

      highRisk:
        reports.filter(
          (report) =>
            report
              ?.thesis
              ?.classification
              ?.code ===
            RESEARCH_REPORT_CLASSIFICATIONS
              .HIGH_RISK
        ).length
    },

    reports:
      reports.sort(
        (first, second) =>
          number(
            second
              ?.thesis
              ?.score
          ) -
          number(
            first
              ?.thesis
              ?.score
          )
      )
  };
}

/*
 * ============================================================
 * MARKET-WIDE RESEARCH INTELLIGENCE
 * ============================================================
 */

export function buildResearchMarketIntelligence({
  securities = [],
  inputBuilder = null,
  valuationPolicy = {},
  relativeValuationPolicy = {},
  forecastPolicy = {},
  researchQualityPolicy = {},
  thesisPolicy = {},
  reportPolicy = {}
} = {}) {
  const normalized =
    safeArray(securities)
      .map(
        normalizeResearchSecurity
      )
      .filter(
        (security) =>
          security.symbol
      );

  const valuationBatch =
    buildStockValuations({
      securities:
        normalized,

      inputBuilder,

      policy:
        valuationPolicy
    });

  const relativeBatch =
    buildRelativeValuationBatch({
      securities:
        normalized,

      policy:
        relativeValuationPolicy
    });

  const forecastBatch =
    buildStockGrowthAndIncomeForecasts({
      securities:
        normalized,

      inputBuilder,

      policy:
        forecastPolicy
    });

  const confidenceBatch =
    buildResearchConfidenceBatch({
      securities:
        normalized,

      inputBuilder:
        (security) => {
          const extra =
            typeof inputBuilder ===
              "function"
              ? inputBuilder(
                  security
                ) || {}
              : {};

          const valuation =
            valuationBatch
              .results
              .find(
                (item) =>
                  item.symbol ===
                  security.symbol
              ) ||
            null;

          const relativeValuation =
            relativeBatch
              .results
              .find(
                (item) =>
                  item.symbol ===
                  security.symbol
              ) ||
            null;

          const forecast =
            forecastBatch
              .results
              .find(
                (item) =>
                  item.symbol ===
                  security.symbol
              ) ||
            null;

          return {
            ...extra,

            symbol:
              security.symbol,

            researchData:
              buildResearchDataObject(
                security
              ),

            historicalRevenue:
              security
                .historicalRevenue,

            historicalEarnings:
              security
                .historicalEarnings,

            historicalFreeCashFlow:
              security
                .historicalFreeCashFlow,

            historicalDividends:
              security
                .historicalDividends,

            marketDataUpdatedAt:
              security
                .marketDataUpdatedAt,

            financialDataUpdatedAt:
              security
                .financialDataUpdatedAt,

            dividendDataUpdatedAt:
              security
                .dividendDataUpdatedAt,

            peerDataUpdatedAt:
              security
                .peerDataUpdatedAt,

            sources:
              security
                .researchSources,

            valuation,

            relativeValuation,

            forecast
          };
        },

      policy:
        researchQualityPolicy
    });

  const thesisBatch =
    buildCoachGInvestmentTheses({
      securities:
        normalized,

      inputBuilder:
        (security) => {
          const extra =
            typeof inputBuilder ===
              "function"
              ? inputBuilder(
                  security
                ) || {}
              : {};

          return {
            ...extra,

            valuation:
              valuationBatch
                .results
                .find(
                  (item) =>
                    item.symbol ===
                    security.symbol
                ) ||
              null,

            relativeValuation:
              relativeBatch
                .results
                .find(
                  (item) =>
                    item.symbol ===
                    security.symbol
                ) ||
              null,

            forecast:
              forecastBatch
                .results
                .find(
                  (item) =>
                    item.symbol ===
                    security.symbol
                ) ||
              null,

            researchConfidence:
              confidenceBatch
                .results
                .find(
                  (item) =>
                    item.symbol ===
                    security.symbol
                ) ||
              null
          };
        },

      policy:
        thesisPolicy
    });

  const reportBatch =
    buildResearchReportBatch({
      securities:
        normalized,

      inputBuilder,

      valuationPolicy,

      relativeValuationPolicy,

      forecastPolicy,

      researchQualityPolicy,

      thesisPolicy,

      reportPolicy
    });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      normalized.length
        ? RESEARCH_REPORT_STATUSES
            .AVAILABLE
        : RESEARCH_REPORT_STATUSES
            .INSUFFICIENT_DATA,

    universe: {
      securities:
        normalized.length,

      valued:
        valuationBatch
          .valued,

      relativelyValued:
        relativeBatch
          .valued,

      forecasted:
        forecastBatch
          .forecasted,

      researched:
        reportBatch
          .available
    },

    rankings: {
      mostAttractiveTheses:
        loadMostAttractiveInvestmentTheses(
          thesisBatch.theses,
          10
        ),

      highestConvictionTheses:
        loadHighestConvictionInvestmentTheses(
          thesisBatch.theses,
          10
        ),

      highestExpectedReturnTheses:
        loadHighestExpectedReturnTheses(
          thesisBatch.theses,
          10
        ),

      highestRiskTheses:
        loadHighestRiskInvestmentTheses(
          thesisBatch.theses,
          10
        ),

      mostUndervalued:
        loadMostUndervaluedStocks(
          valuationBatch.results,
          10
        ),

      mostOvervalued:
        loadMostOvervaluedStocks(
          valuationBatch.results,
          10
        ),

      highestAbsoluteValuationConfidence:
        loadHighestConfidenceValuations(
          valuationBatch.results,
          10
        ),

      stocksBelowBuyPrice:
        loadStocksBelowBuyPrice(
          valuationBatch.results
        ),

      stocksAboveSellPrice:
        loadStocksAboveSellPrice(
          valuationBatch.results
        ),

      mostAttractiveRelativeValuations:
        loadMostAttractiveRelativeValuations(
          relativeBatch.results,
          10
        ),

      largestPeerDiscounts:
        loadLargestPeerDiscounts(
          relativeBatch.results,
          10
        ),

      largestPeerPremiums:
        loadLargestPeerPremiums(
          relativeBatch.results,
          10
        ),

      highestRelativeValuationConfidence:
        loadHighestConfidenceRelativeValuations(
          relativeBatch.results,
          10
        ),

      highestExpectedTotalReturn:
        loadHighestExpectedTotalReturnStocks(
          forecastBatch.results,
          10
        ),

      highestExpectedEarningsGrowth:
        loadHighestExpectedEarningsGrowthStocks(
          forecastBatch.results,
          10
        ),

      highestExpectedDividendGrowth:
        loadHighestExpectedDividendGrowthStocks(
          forecastBatch.results,
          10
        ),

      highestForecastConfidence:
        loadHighestForecastConfidenceStocks(
          forecastBatch.results,
          10
        ),

      unsustainableDividendForecasts:
        loadUnsustainableDividendForecasts(
          forecastBatch.results
        ),

      highestResearchQuality:
        loadHighestResearchQuality(
          confidenceBatch.results,
          10
        ),

      lowestResearchQuality:
        loadLowestResearchQuality(
          confidenceBatch.results,
          10
        ),

      highestValuationConfidence:
        loadHighestValuationConfidence(
          confidenceBatch.results,
          10
        )
    },

    summary: {
      averageThesisScore:
        reportBatch
          .averageThesisScore,

      averageConvictionPercentage:
        reportBatch
          .averageConvictionPercentage,

      averageResearchQualityScore:
        reportBatch
          .averageResearchQualityScore,

      averageValuationConfidencePercentage:
        reportBatch
          .averageValuationConfidencePercentage,

      averageReportCoveragePercentage:
        reportBatch
          .averageReportCoveragePercentage,

      classifications:
        reportBatch.counts
    },

    reports:
      reportBatch.reports,

    batches: {
      valuation:
        valuationBatch,

      relativeValuation:
        relativeBatch,

      forecast:
        forecastBatch,

      researchConfidence:
        confidenceBatch,

      theses:
        thesisBatch,

      reports:
        reportBatch
    },

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

    advisoryOnly:
      true
  };
}

/*
 * ============================================================
 * SPECIALIZED REPORT LOADERS
 * ============================================================
 */

export function loadResearchReportExecutiveSummary(
  report
) {
  return report
    ?.executiveSummary ||
    null;
}

export function loadResearchReportValuation(
  report
) {
  return report
    ?.valuation ||
    null;
}

export function loadResearchReportRelativeValuation(
  report
) {
  return report
    ?.relativeValuation ||
    null;
}

export function loadResearchReportForecast(
  report
) {
  return report
    ?.forecast ||
    null;
}

export function loadResearchReportThesis(
  report
) {
  return report
    ?.thesis ||
    null;
}

export function loadResearchReportBullCase(
  report
) {
  return safeArray(
    report
      ?.thesis
      ?.bullCase
  );
}

export function loadResearchReportBearCase(
  report
) {
  return safeArray(
    report
      ?.thesis
      ?.bearCase
  );
}

export function loadResearchReportCatalysts(
  report
) {
  return safeArray(
    report
      ?.thesis
      ?.catalysts
  );
}

export function loadResearchReportRisks(
  report
) {
  return safeArray(
    report
      ?.thesis
      ?.risks
  );
}

export function loadResearchReportPriceLevels(
  report
) {
  return report
    ?.priceLevels ||
    null;
}

export function loadResearchReportWarnings(
  report
) {
  return safeArray(
    report?.warnings
  );
}

export function loadHighPriorityResearchReportWarnings(
  report
) {
  return loadHighPriorityResearchWarnings(
    report
      ?.sources
      ?.researchConfidence ||
    {
      warnings:
        report?.warnings
    }
  );
}

export function loadTopResearchReports(
  batchResult,
  limit = 10
) {
  return safeArray(
    batchResult
      ?.reports
  )
    .sort(
      (first, second) =>
        number(
          second
            ?.thesis
            ?.score
        ) -
        number(
          first
            ?.thesis
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

export function loadHighestConvictionResearchReports(
  batchResult,
  limit = 10
) {
  return safeArray(
    batchResult
      ?.reports
  )
    .sort(
      (first, second) =>
        number(
          second
            ?.thesis
            ?.conviction
            ?.score
        ) -
        number(
          first
            ?.thesis
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

export function loadResearchReportsBelowBuyPrice(
  batchResult
) {
  return safeArray(
    batchResult
      ?.reports
  ).filter(
    (report) => {
      const currentPrice =
        nullableNumber(
          report
            ?.priceLevels
            ?.currentPrice
        );

      const buyUnder =
        nullableNumber(
          report
            ?.priceLevels
            ?.buyUnder
        );

      return (
        currentPrice !==
          null &&
        buyUnder !==
          null &&
        currentPrice <=
          buyUnder
      );
    }
  );
}

export function loadResearchReportsAboveSellPrice(
  batchResult
) {
  return safeArray(
    batchResult
      ?.reports
  ).filter(
    (report) => {
      const currentPrice =
        nullableNumber(
          report
            ?.priceLevels
            ?.currentPrice
        );

      const sellOver =
        nullableNumber(
          report
            ?.priceLevels
            ?.sellOver
        );

      return (
        currentPrice !==
          null &&
        sellOver !==
          null &&
        currentPrice >=
          sellOver
      );
    }
  );
}
