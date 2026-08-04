import {
  classifyValuation,
  buildValuationPriceLevels,
  classifyValuationConfidence
} from "./coreValuationEngine";

/*
 * ============================================================
 * PC-023B2
 * RELATIVE VALUATION AND PEER COMPARISON ENGINE
 * ============================================================
 *
 * Provides:
 *
 * - peer-group normalization,
 * - sector and industry peer filtering,
 * - P/E comparison,
 * - price-to-book comparison,
 * - price-to-sales comparison,
 * - EV/EBITDA comparison,
 * - dividend-yield comparison,
 * - free-cash-flow-yield comparison,
 * - ROE and profitability comparison,
 * - growth-adjusted relative valuation,
 * - peer-implied fair value,
 * - premium or discount to peers,
 * - peer ranking,
 * - relative valuation confidence,
 * - composite relative fair value.
 *
 * Safeguards:
 *
 * - missing metrics are excluded,
 * - negative or invalid valuation multiples are not forced
 *   into calculations,
 * - peer groups must meet minimum-size requirements,
 * - outliers may be excluded from comparison,
 * - no trades are executed,
 * - no market or fundamental data is fabricated.
 * ============================================================
 */

export const RELATIVE_VALUATION_METRICS = {
  PRICE_TO_EARNINGS:
    "PRICE_TO_EARNINGS",

  PRICE_TO_BOOK:
    "PRICE_TO_BOOK",

  PRICE_TO_SALES:
    "PRICE_TO_SALES",

  EV_TO_EBITDA:
    "EV_TO_EBITDA",

  DIVIDEND_YIELD:
    "DIVIDEND_YIELD",

  FREE_CASH_FLOW_YIELD:
    "FREE_CASH_FLOW_YIELD",

  RETURN_ON_EQUITY:
    "RETURN_ON_EQUITY",

  NET_MARGIN:
    "NET_MARGIN",

  EARNINGS_GROWTH:
    "EARNINGS_GROWTH",

  REVENUE_GROWTH:
    "REVENUE_GROWTH",

  PEG:
    "PEG"
};

export const RELATIVE_VALUATION_STATUSES = {
  AVAILABLE:
    "AVAILABLE",

  PARTIAL:
    "PARTIAL",

  INSUFFICIENT_PEERS:
    "INSUFFICIENT_PEERS",

  INSUFFICIENT_DATA:
    "INSUFFICIENT_DATA",

  INVALID_INPUT:
    "INVALID_INPUT",

  NOT_APPLICABLE:
    "NOT_APPLICABLE"
};

export const RELATIVE_VALUATION_CLASSIFICATIONS = {
  DEEPLY_UNDERVALUED:
    "DEEPLY_UNDERVALUED",

  UNDERVALUED:
    "UNDERVALUED",

  FAIRLY_VALUED:
    "FAIRLY_VALUED",

  OVERVALUED:
    "OVERVALUED",

  DEEPLY_OVERVALUED:
    "DEEPLY_OVERVALUED",

  NOT_RATED:
    "NOT_RATED"
};

export const RELATIVE_PEER_POSITIONS = {
  TOP_QUARTILE:
    "TOP_QUARTILE",

  ABOVE_MEDIAN:
    "ABOVE_MEDIAN",

  NEAR_MEDIAN:
    "NEAR_MEDIAN",

  BELOW_MEDIAN:
    "BELOW_MEDIAN",

  BOTTOM_QUARTILE:
    "BOTTOM_QUARTILE",

  NOT_RANKED:
    "NOT_RANKED"
};

export const DEFAULT_RELATIVE_VALUATION_POLICY = {
  minimumPeerCount:
    3,

  preferredPeerCount:
    5,

  maximumPeerCount:
    20,

  outlierZScoreThreshold:
    2.5,

  maximumMetricPremiumPercentage:
    100,

  maximumMetricDiscountPercentage:
    75,

  minimumMetricCoveragePercentage:
    25,

  fairValueRangePercentage:
    10,

  marginOfSafetyPercentage:
    20,

  sellPremiumPercentage:
    20,

  useMedian:
    true,

  requireSameSector:
    true,

  requireSameIndustry:
    false
};

export const DEFAULT_RELATIVE_METRIC_WEIGHTS = {
  PRICE_TO_EARNINGS:
    0.25,

  PRICE_TO_BOOK:
    0.18,

  PRICE_TO_SALES:
    0.1,

  EV_TO_EBITDA:
    0.17,

  DIVIDEND_YIELD:
    0.08,

  FREE_CASH_FLOW_YIELD:
    0.1,

  PEG:
    0.12
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

function positiveNumber(value) {
  const parsed =
    nullableNumber(
      value
    );

  if (
    parsed === null ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function nonNegativeNumber(value) {
  const parsed =
    nullableNumber(
      value
    );

  if (
    parsed === null ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
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

function roundMoney(value) {
  const parsed =
    nullableNumber(
      value
    );

  if (
    parsed === null
  ) {
    return null;
  }

  return Number(
    parsed.toFixed(
      2
    )
  );
}

function roundPercent(value) {
  const parsed =
    nullableNumber(
      value
    );

  if (
    parsed === null
  ) {
    return null;
  }

  return Number(
    parsed.toFixed(
      2
    )
  );
}

function roundMetric(
  value,
  decimals = 6
) {
  const parsed =
    nullableNumber(
      value
    );

  if (
    parsed === null
  ) {
    return null;
  }

  return Number(
    parsed.toFixed(
      decimals
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

function normalizeText(value) {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
}

function normalizeSector(value) {
  return normalizeText(
    value || "UNKNOWN"
  );
}

function sum(values = []) {
  return safeArray(
    values
  ).reduce(
    (
      total,
      value
    ) =>
      total +
      number(value),
    0
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
    sum(valid) /
    valid.length
  );
}

function median(values = []) {
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
      )
      .sort(
        (
          first,
          second
        ) =>
          first -
          second
      );

  if (
    !valid.length
  ) {
    return null;
  }

  const middle =
    Math.floor(
      valid.length /
      2
    );

  if (
    valid.length %
      2 ===
    0
  ) {
    return (
      valid[
        middle - 1
      ] +
      valid[
        middle
      ]
    ) /
    2;
  }

  return valid[
    middle
  ];
}

function standardDeviation(
  values = []
) {
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
    valid.length <
    2
  ) {
    return null;
  }

  const mean =
    average(
      valid
    );

  const variance =
    average(
      valid.map(
        (value) =>
          Math.pow(
            value -
            mean,
            2
          )
      )
    );

  return Math.sqrt(
    variance
  );
}

function percentileRank({
  value,
  values,
  higherIsBetter = true
}) {
  const target =
    nullableNumber(
      value
    );

  const valid =
    safeArray(
      values
    )
      .map(
        nullableNumber
      )
      .filter(
        (item) =>
          item !==
          null
      );

  if (
    target ===
      null ||
    !valid.length
  ) {
    return null;
  }

  const belowOrEqual =
    valid.filter(
      (item) =>
        item <=
        target
    ).length;

  const rawPercentile =
    (
      belowOrEqual /
      valid.length
    ) *
    100;

  return roundPercent(
    higherIsBetter
      ? rawPercentile
      : 100 -
        rawPercentile
  );
}

function normalizePolicy(
  policy = {}
) {
  return {
    minimumPeerCount:
      Math.max(
        Math.floor(
          number(
            policy
              ?.minimumPeerCount ??
            DEFAULT_RELATIVE_VALUATION_POLICY
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
            DEFAULT_RELATIVE_VALUATION_POLICY
              .preferredPeerCount
          )
        ),
        1
      ),

    maximumPeerCount:
      Math.max(
        Math.floor(
          number(
            policy
              ?.maximumPeerCount ??
            DEFAULT_RELATIVE_VALUATION_POLICY
              .maximumPeerCount
          )
        ),
        1
      ),

    outlierZScoreThreshold:
      Math.max(
        number(
          policy
            ?.outlierZScoreThreshold ??
          DEFAULT_RELATIVE_VALUATION_POLICY
            .outlierZScoreThreshold
        ),
        0
      ),

    maximumMetricPremiumPercentage:
      clamp(
        policy
          ?.maximumMetricPremiumPercentage ??
        DEFAULT_RELATIVE_VALUATION_POLICY
          .maximumMetricPremiumPercentage,
        0,
        500
      ),

    maximumMetricDiscountPercentage:
      clamp(
        policy
          ?.maximumMetricDiscountPercentage ??
        DEFAULT_RELATIVE_VALUATION_POLICY
          .maximumMetricDiscountPercentage,
        0,
        100
      ),

    minimumMetricCoveragePercentage:
      clamp(
        policy
          ?.minimumMetricCoveragePercentage ??
        DEFAULT_RELATIVE_VALUATION_POLICY
          .minimumMetricCoveragePercentage,
        0,
        100
      ),

    fairValueRangePercentage:
      clamp(
        policy
          ?.fairValueRangePercentage ??
        DEFAULT_RELATIVE_VALUATION_POLICY
          .fairValueRangePercentage,
        0,
        100
      ),

    marginOfSafetyPercentage:
      clamp(
        policy
          ?.marginOfSafetyPercentage ??
        DEFAULT_RELATIVE_VALUATION_POLICY
          .marginOfSafetyPercentage,
        0,
        90
      ),

    sellPremiumPercentage:
      clamp(
        policy
          ?.sellPremiumPercentage ??
        DEFAULT_RELATIVE_VALUATION_POLICY
          .sellPremiumPercentage,
        0,
        200
      ),

    useMedian:
      policy
        ?.useMedian !==
      false,

    requireSameSector:
      policy
        ?.requireSameSector !==
      false,

    requireSameIndustry:
      Boolean(
        policy
          ?.requireSameIndustry
      )
  };
}

/*
 * ============================================================
 * SECURITY NORMALIZATION
 * ============================================================
 */

export function normalizeRelativeValuationSecurity(
  security = {}
) {
  const earningsGrowth =
    nullableNumber(
      security
        ?.earningsGrowthPercentage
    );

  const peRatio =
    positiveNumber(
      security?.peRatio
    );

  const pegRatio =
    positiveNumber(
      security?.pegRatio
    ) ??
    (
      peRatio !==
        null &&
      earningsGrowth !==
        null &&
      earningsGrowth >
        0
        ? peRatio /
          earningsGrowth
        : null
    );

  return {
    symbol:
      normalizeSymbol(
        security?.symbol
      ),

    name:
      security?.name ||
      security?.companyName ||
      security?.symbol ||
      "Unknown",

    sector:
      normalizeSector(
        security?.sector
      ),

    industry:
      normalizeText(
        security?.industry ||
        security?.subsector ||
        "UNKNOWN"
      ),

    currentPrice:
      positiveNumber(
        security
          ?.currentPrice ??
        security?.marketPrice ??
        security?.price
      ),

    marketCapitalization:
      positiveNumber(
        security
          ?.marketCapitalization ??
        security?.marketCap
      ),

    enterpriseValue:
      positiveNumber(
        security
          ?.enterpriseValue
      ),

    earningsPerShare:
      nullableNumber(
        security
          ?.earningsPerShare ??
        security?.eps
      ),

    bookValuePerShare:
      nullableNumber(
        security
          ?.bookValuePerShare
      ),

    revenuePerShare:
      nullableNumber(
        security
          ?.revenuePerShare ??
        security?.salesPerShare
      ),

    ebitdaPerShare:
      nullableNumber(
        security
          ?.ebitdaPerShare
      ),

    freeCashFlowPerShare:
      nullableNumber(
        security
          ?.freeCashFlowPerShare
      ),

    dividendPerShare:
      nullableNumber(
        security
          ?.dividendPerShare
      ),

    peRatio,

    priceToBookRatio:
      positiveNumber(
        security
          ?.priceToBookRatio
      ),

    priceToSalesRatio:
      positiveNumber(
        security
          ?.priceToSalesRatio
      ),

    evToEbitdaRatio:
      positiveNumber(
        security
          ?.evToEbitdaRatio
      ),

    dividendYieldPercentage:
      nonNegativeNumber(
        security
          ?.dividendYieldPercentage
      ),

    freeCashFlowYieldPercentage:
      nullableNumber(
        security
          ?.freeCashFlowYieldPercentage
      ),

    returnOnEquityPercentage:
      nullableNumber(
        security
          ?.returnOnEquityPercentage ??
        security?.roePercentage
      ),

    netMarginPercentage:
      nullableNumber(
        security
          ?.netMarginPercentage
      ),

    earningsGrowthPercentage:
      earningsGrowth,

    revenueGrowthPercentage:
      nullableNumber(
        security
          ?.revenueGrowthPercentage
      ),

    pegRatio,

    dataQualityScore:
      nullableNumber(
        security
          ?.dataQualityScore
      ),

    metadata:
      security?.metadata &&
      typeof security.metadata ===
        "object"
        ? security.metadata
        : {}
  };
}

/*
 * ============================================================
 * PEER GROUP CONSTRUCTION
 * ============================================================
 */

export function buildPeerGroup({
  target,
  securities = [],
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(
      policy
    );

  const normalizedTarget =
    normalizeRelativeValuationSecurity(
      target
    );

  if (
    !normalizedTarget.symbol
  ) {
    return {
      status:
        RELATIVE_VALUATION_STATUSES
          .INVALID_INPUT,

      target:
        normalizedTarget,

      peers:
        [],

      peerCount:
        0,

      message:
        "A target security symbol is required."
    };
  }

  const normalizedSecurities =
    safeArray(
      securities
    )
      .map(
        normalizeRelativeValuationSecurity
      )
      .filter(
        (security) =>
          security.symbol &&
          security.symbol !==
          normalizedTarget.symbol
      );

  let peers =
    normalizedSecurities;

  if (
    normalizedPolicy
      .requireSameSector &&
    normalizedTarget.sector !==
      "UNKNOWN"
  ) {
    peers =
      peers.filter(
        (security) =>
          security.sector ===
          normalizedTarget.sector
      );
  }

  if (
    normalizedPolicy
      .requireSameIndustry &&
    normalizedTarget.industry !==
      "UNKNOWN"
  ) {
    peers =
      peers.filter(
        (security) =>
          security.industry ===
          normalizedTarget.industry
      );
  }

  peers =
    peers
      .sort(
        (
          first,
          second
        ) => {
          const targetMarketCap =
            normalizedTarget
              .marketCapitalization;

          if (
            targetMarketCap ===
              null
          ) {
            return (
              number(
                second
                  .marketCapitalization
              ) -
              number(
                first
                  .marketCapitalization
              )
            );
          }

          const firstDistance =
            first
              .marketCapitalization ===
              null
              ? Number
                  .POSITIVE_INFINITY
              : Math.abs(
                  first
                    .marketCapitalization -
                  targetMarketCap
                );

          const secondDistance =
            second
              .marketCapitalization ===
              null
              ? Number
                  .POSITIVE_INFINITY
              : Math.abs(
                  second
                    .marketCapitalization -
                  targetMarketCap
                );

          return (
            firstDistance -
            secondDistance
          );
        }
      )
      .slice(
        0,
        normalizedPolicy
          .maximumPeerCount
      );

  const status =
    peers.length >=
      normalizedPolicy
        .minimumPeerCount
      ? RELATIVE_VALUATION_STATUSES
          .AVAILABLE
      : RELATIVE_VALUATION_STATUSES
          .INSUFFICIENT_PEERS;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    target:
      normalizedTarget,

    peers,

    peerCount:
      peers.length,

    policy:
      normalizedPolicy,

    message:
      peers.length >=
        normalizedPolicy
          .minimumPeerCount
        ? `${peers.length} peer securities were selected for ${normalizedTarget.symbol}.`
        : `Only ${peers.length} peer securities were available; at least ${normalizedPolicy.minimumPeerCount} are preferred.`
  };
}

/*
 * ============================================================
 * OUTLIER FILTERING
 * ============================================================
 */

function removeMetricOutliers({
  records,
  valueSelector,
  threshold
}) {
  const available =
    safeArray(
      records
    )
      .map(
        (record) => ({
          record,

          value:
            nullableNumber(
              valueSelector(
                record
              )
            )
        })
      )
      .filter(
        (item) =>
          item.value !==
          null
      );

  if (
    available.length <
    3
  ) {
    return {
      included:
        available,

      excluded:
        []
    };
  }

  const values =
    available.map(
      (item) =>
        item.value
    );

  const mean =
    average(
      values
    );

  const deviation =
    standardDeviation(
      values
    );

  if (
    deviation ===
      null ||
    deviation ===
      0
  ) {
    return {
      included:
        available,

      excluded:
        []
    };
  }

  const included = [];
  const excluded = [];

  available.forEach(
    (item) => {
      const zScore =
        Math.abs(
          (
            item.value -
            mean
          ) /
          deviation
        );

      const enriched = {
        ...item,

        zScore:
          roundMetric(
            zScore
          )
      };

      if (
        zScore >
        threshold
      ) {
        excluded.push(
          enriched
        );
      } else {
        included.push(
          enriched
        );
      }
    }
  );

  return {
    included,

    excluded
  };
}

/*
 * ============================================================
 * METRIC DEFINITIONS
 * ============================================================
 */

function getMetricDefinition(
  metric
) {
  const definitions = {
    PRICE_TO_EARNINGS: {
      metric:
        RELATIVE_VALUATION_METRICS
          .PRICE_TO_EARNINGS,

      label:
        "Price to Earnings",

      targetField:
        "peRatio",

      basisField:
        "earningsPerShare",

      higherIsBetter:
        false,

      impliedValueMode:
        "MULTIPLE"
    },

    PRICE_TO_BOOK: {
      metric:
        RELATIVE_VALUATION_METRICS
          .PRICE_TO_BOOK,

      label:
        "Price to Book",

      targetField:
        "priceToBookRatio",

      basisField:
        "bookValuePerShare",

      higherIsBetter:
        false,

      impliedValueMode:
        "MULTIPLE"
    },

    PRICE_TO_SALES: {
      metric:
        RELATIVE_VALUATION_METRICS
          .PRICE_TO_SALES,

      label:
        "Price to Sales",

      targetField:
        "priceToSalesRatio",

      basisField:
        "revenuePerShare",

      higherIsBetter:
        false,

      impliedValueMode:
        "MULTIPLE"
    },

    EV_TO_EBITDA: {
      metric:
        RELATIVE_VALUATION_METRICS
          .EV_TO_EBITDA,

      label:
        "EV to EBITDA",

      targetField:
        "evToEbitdaRatio",

      basisField:
        "ebitdaPerShare",

      higherIsBetter:
        false,

      impliedValueMode:
        "MULTIPLE"
    },

    DIVIDEND_YIELD: {
      metric:
        RELATIVE_VALUATION_METRICS
          .DIVIDEND_YIELD,

      label:
        "Dividend Yield",

      targetField:
        "dividendYieldPercentage",

      basisField:
        "dividendPerShare",

      higherIsBetter:
        true,

      impliedValueMode:
        "YIELD"
    },

    FREE_CASH_FLOW_YIELD: {
      metric:
        RELATIVE_VALUATION_METRICS
          .FREE_CASH_FLOW_YIELD,

      label:
        "Free Cash Flow Yield",

      targetField:
        "freeCashFlowYieldPercentage",

      basisField:
        "freeCashFlowPerShare",

      higherIsBetter:
        true,

      impliedValueMode:
        "YIELD"
    },

    PEG: {
      metric:
        RELATIVE_VALUATION_METRICS
          .PEG,

      label:
        "PEG Ratio",

      targetField:
        "pegRatio",

      basisField:
        "earningsPerShare",

      higherIsBetter:
        false,

      impliedValueMode:
        "PEG"
    }
  };

  return definitions[
    metric
  ] || null;
}

/*
 * ============================================================
 * SINGLE-METRIC PEER COMPARISON
 * ============================================================
 */

export function buildRelativeMetricComparison({
  target,
  peers = [],
  metric,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(
      policy
    );

  const definition =
    getMetricDefinition(
      metric
    );

  const normalizedTarget =
    normalizeRelativeValuationSecurity(
      target
    );

  if (
    !definition
  ) {
    return {
      metric,

      status:
        RELATIVE_VALUATION_STATUSES
          .INVALID_INPUT,

      available:
        false,

      message:
        "The requested relative valuation metric is not supported."
    };
  }

  const targetMetric =
    nullableNumber(
      normalizedTarget?.[
        definition
          .targetField
      ]
    );

  const basisValue =
    nullableNumber(
      normalizedTarget?.[
        definition
          .basisField
      ]
    );

  const normalizedPeers =
    safeArray(
      peers
    ).map(
      normalizeRelativeValuationSecurity
    );

  const outlierResult =
    removeMetricOutliers({
      records:
        normalizedPeers,

      valueSelector:
        (peer) =>
          peer?.[
            definition
              .targetField
          ],

      threshold:
        normalizedPolicy
          .outlierZScoreThreshold
    });

  const peerMetricValues =
    outlierResult
      .included
      .map(
        (item) =>
          item.value
      );

  if (
    targetMetric ===
      null ||
    !peerMetricValues.length
  ) {
    return {
      metric:
        definition.metric,

      label:
        definition.label,

      status:
        RELATIVE_VALUATION_STATUSES
          .INSUFFICIENT_DATA,

      available:
        false,

      targetMetric,

      basisValue,

      peerCount:
        peerMetricValues.length,

      message:
        `${definition.label} could not be compared because target or peer data is incomplete.`
    };
  }

  const peerAverage =
    average(
      peerMetricValues
    );

  const peerMedian =
    median(
      peerMetricValues
    );

  const peerBenchmark =
    normalizedPolicy
      .useMedian
      ? peerMedian
      : peerAverage;

  const premiumDiscountPercentage =
    peerBenchmark !==
      null &&
    peerBenchmark !==
      0
      ? (
          (
            targetMetric -
            peerBenchmark
          ) /
          peerBenchmark
        ) *
        100
      : null;

  let impliedFairValue =
    null;

  if (
    definition
      .impliedValueMode ===
      "MULTIPLE" &&
    basisValue !==
      null &&
    basisValue >
      0
  ) {
    impliedFairValue =
      basisValue *
      peerBenchmark;
  }

  if (
    definition
      .impliedValueMode ===
      "YIELD" &&
    basisValue !==
      null &&
    basisValue >
      0 &&
    peerBenchmark !==
      null &&
    peerBenchmark >
      0
  ) {
    impliedFairValue =
      basisValue /
      (
        peerBenchmark /
        100
      );
  }

  if (
    definition
      .impliedValueMode ===
      "PEG" &&
    basisValue !==
      null &&
    basisValue >
      0 &&
    normalizedTarget
      .earningsGrowthPercentage !==
      null &&
    normalizedTarget
      .earningsGrowthPercentage >
      0
  ) {
    const impliedPe =
      peerBenchmark *
      normalizedTarget
        .earningsGrowthPercentage;

    impliedFairValue =
      basisValue *
      impliedPe;
  }

  const peerPercentile =
    percentileRank({
      value:
        targetMetric,

      values:
        peerMetricValues,

      higherIsBetter:
        definition
          .higherIsBetter
    });

  const comparisonScore =
    calculateMetricComparisonScore({
      definition,

      targetMetric,

      peerBenchmark,

      percentile:
        peerPercentile
    });

  return {
    metric:
      definition.metric,

    label:
      definition.label,

    status:
      impliedFairValue !==
        null
        ? RELATIVE_VALUATION_STATUSES
            .AVAILABLE
        : RELATIVE_VALUATION_STATUSES
            .PARTIAL,

    available:
      true,

    targetMetric:
      roundMetric(
        targetMetric
      ),

    basisValue:
      roundMetric(
        basisValue
      ),

    peerAverage:
      roundMetric(
        peerAverage
      ),

    peerMedian:
      roundMetric(
        peerMedian
      ),

    peerBenchmark:
      roundMetric(
        peerBenchmark
      ),

    premiumDiscountPercentage:
      roundPercent(
        premiumDiscountPercentage
      ),

    impliedFairValue:
      roundMoney(
        impliedFairValue
      ),

    peerPercentile:
      roundPercent(
        peerPercentile
      ),

    peerPosition:
      classifyPeerPosition(
        peerPercentile
      ),

    comparisonScore,

    peerCount:
      peerMetricValues.length,

    excludedOutliers:
      outlierResult
        .excluded
        .map(
          (item) => ({
            symbol:
              item
                ?.record
                ?.symbol,

            value:
              item.value,

            zScore:
              item.zScore
          })
        ),

    peers:
      outlierResult
        .included
        .map(
          (item) => ({
            symbol:
              item
                ?.record
                ?.symbol,

            value:
              roundMetric(
                item.value
              )
          })
        ),

    message:
      buildRelativeMetricMessage({
        symbol:
          normalizedTarget.symbol,

        definition,

        targetMetric,

        peerBenchmark,

        premiumDiscountPercentage,

        impliedFairValue
      })
  };
}

function calculateMetricComparisonScore({
  definition,
  targetMetric,
  peerBenchmark,
  percentile
}) {
  if (
    targetMetric ===
      null ||
    peerBenchmark ===
      null
  ) {
    return null;
  }

  const rawDifference =
    peerBenchmark !==
      0
      ? (
          (
            targetMetric -
            peerBenchmark
          ) /
          Math.abs(
            peerBenchmark
          )
        ) *
        100
      : 0;

  let valueScore;

  if (
    definition
      .higherIsBetter
  ) {
    valueScore =
      50 +
      rawDifference;
  } else {
    valueScore =
      50 -
      rawDifference;
  }

  const percentileScore =
    nullableNumber(
      percentile
    ) ??
    50;

  return roundScore(
    (
      clamp(
        valueScore,
        0,
        100
      ) *
      0.6
    ) +
    (
      percentileScore *
      0.4
    )
  );
}

function classifyPeerPosition(
  percentile
) {
  const value =
    nullableNumber(
      percentile
    );

  if (
    value ===
    null
  ) {
    return {
      code:
        RELATIVE_PEER_POSITIONS
          .NOT_RANKED,

      label:
        "Not Ranked"
    };
  }

  if (
    value >= 75
  ) {
    return {
      code:
        RELATIVE_PEER_POSITIONS
          .TOP_QUARTILE,

      label:
        "Top Quartile"
    };
  }

  if (
    value >= 55
  ) {
    return {
      code:
        RELATIVE_PEER_POSITIONS
          .ABOVE_MEDIAN,

      label:
        "Above Median"
    };
  }

  if (
    value >= 45
  ) {
    return {
      code:
        RELATIVE_PEER_POSITIONS
          .NEAR_MEDIAN,

      label:
        "Near Median"
    };
  }

  if (
    value >= 25
  ) {
    return {
      code:
        RELATIVE_PEER_POSITIONS
          .BELOW_MEDIAN,

      label:
        "Below Median"
    };
  }

  return {
    code:
      RELATIVE_PEER_POSITIONS
        .BOTTOM_QUARTILE,

    label:
      "Bottom Quartile"
  };
}

function buildRelativeMetricMessage({
  symbol,
  definition,
  targetMetric,
  peerBenchmark,
  premiumDiscountPercentage,
  impliedFairValue
}) {
  const parts = [];

  parts.push(
    `${symbol || "The security"} has a ${definition.label} value of ${roundMetric(
      targetMetric,
      4
    )}.`
  );

  parts.push(
    `The peer benchmark is ${roundMetric(
      peerBenchmark,
      4
    )}.`
  );

  if (
    premiumDiscountPercentage !==
      null
  ) {
    parts.push(
      `This represents a ${Math.abs(
        roundPercent(
          premiumDiscountPercentage
        )
      )}% ${
        premiumDiscountPercentage >
        0
          ? "premium"
          : "discount"
      } to peers.`
    );
  }

  if (
    impliedFairValue !==
      null
  ) {
    parts.push(
      `The peer-implied fair value is approximately KES ${roundMoney(
        impliedFairValue
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

  return parts.join(
    " "
  );
}

/*
 * ============================================================
 * QUALITY AND GROWTH PEER COMPARISON
 * ============================================================
 */

export function buildPeerQualityComparison({
  target,
  peers = []
} = {}) {
  const normalizedTarget =
    normalizeRelativeValuationSecurity(
      target
    );

  const normalizedPeers =
    safeArray(
      peers
    ).map(
      normalizeRelativeValuationSecurity
    );

  const metrics = [
    {
      code:
        RELATIVE_VALUATION_METRICS
          .RETURN_ON_EQUITY,

      label:
        "Return on Equity",

      field:
        "returnOnEquityPercentage",

      weight:
        0.35,

      higherIsBetter:
        true
    },
    {
      code:
        RELATIVE_VALUATION_METRICS
          .NET_MARGIN,

      label:
        "Net Margin",

      field:
        "netMarginPercentage",

      weight:
        0.25,

      higherIsBetter:
        true
    },
    {
      code:
        RELATIVE_VALUATION_METRICS
          .EARNINGS_GROWTH,

      label:
        "Earnings Growth",

      field:
        "earningsGrowthPercentage",

      weight:
        0.25,

      higherIsBetter:
        true
    },
    {
      code:
        RELATIVE_VALUATION_METRICS
          .REVENUE_GROWTH,

      label:
        "Revenue Growth",

      field:
        "revenueGrowthPercentage",

      weight:
        0.15,

      higherIsBetter:
        true
    }
  ];

  const results =
    metrics.map(
      (metric) => {
        const targetValue =
          nullableNumber(
            normalizedTarget?.[
              metric.field
            ]
          );

        const peerValues =
          normalizedPeers
            .map(
              (peer) =>
                nullableNumber(
                  peer?.[
                    metric.field
                  ]
                )
            )
            .filter(
              (value) =>
                value !==
                null
            );

        const benchmark =
          median(
            peerValues
          );

        const percentile =
          percentileRank({
            value:
              targetValue,

            values:
              peerValues,

            higherIsBetter:
              metric
                .higherIsBetter
          });

        const score =
          benchmark ===
            null ||
          targetValue ===
            null
            ? null
            : roundScore(
                (
                  (
                    percentile ??
                    50
                  ) *
                  0.6
                ) +
                (
                  clamp(
                    50 +
                    (
                      targetValue -
                      benchmark
                    ),
                    0,
                    100
                  ) *
                  0.4
                )
              );

        return {
          code:
            metric.code,

          label:
            metric.label,

          available:
            targetValue !==
              null &&
            benchmark !==
              null,

          targetValue:
            roundPercent(
              targetValue
            ),

          peerMedian:
            roundPercent(
              benchmark
            ),

          percentile:
            roundPercent(
              percentile
            ),

          score,

          weight:
            metric.weight
        };
      }
    );

  const available =
    results.filter(
      (item) =>
        item.available &&
        item.score !==
          null
    );

  const totalWeight =
    sum(
      available.map(
        (item) =>
          item.weight
      )
    );

  const score =
    totalWeight >
      0
      ? sum(
          available.map(
            (item) =>
              item.score *
              item.weight
          )
        ) /
        totalWeight
      : null;

  return {
    status:
      score ===
      null
        ? RELATIVE_VALUATION_STATUSES
            .INSUFFICIENT_DATA
        : RELATIVE_VALUATION_STATUSES
            .AVAILABLE,

    score:
      score ===
      null
        ? null
        : roundScore(
            score
          ),

    availableMetrics:
      available.length,

    totalMetrics:
      results.length,

    metrics:
      results
  };
}

/*
 * ============================================================
 * COMPOSITE RELATIVE VALUATION
 * ============================================================
 */

export function buildCompositeRelativeValuation({
  target,
  peers = [],
  metricWeights =
    DEFAULT_RELATIVE_METRIC_WEIGHTS,
  policy = {}
} = {}) {
  const normalizedPolicy =
    normalizePolicy(
      policy
    );

  const normalizedTarget =
    normalizeRelativeValuationSecurity(
      target
    );

  const normalizedPeers =
    safeArray(
      peers
    ).map(
      normalizeRelativeValuationSecurity
    );

  const metricResults =
    Object.keys(
      DEFAULT_RELATIVE_METRIC_WEIGHTS
    ).map(
      (metric) => {
        const result =
          buildRelativeMetricComparison({
            target:
              normalizedTarget,

            peers:
              normalizedPeers,

            metric,

            policy:
              normalizedPolicy
          });

        const configuredWeight =
          number(
            metricWeights?.[
              metric
            ]
          );

        return {
          ...result,

          configuredWeight,

          configuredWeightPercentage:
            roundPercent(
              configuredWeight *
              100
            )
        };
      }
    );

  const availableValuations =
    metricResults.filter(
      (result) =>
        result.available &&
        positiveNumber(
          result.impliedFairValue
        ) !==
          null &&
        result.configuredWeight >
          0
    );

  const availableScores =
    metricResults.filter(
      (result) =>
        result.available &&
        nullableNumber(
          result.comparisonScore
        ) !==
          null &&
        result.configuredWeight >
          0
    );

  const totalConfiguredWeight =
    sum(
      metricResults.map(
        (result) =>
          result.configuredWeight
      )
    );

  const availableValuationWeight =
    sum(
      availableValuations.map(
        (result) =>
          result.configuredWeight
      )
    );

  const availableScoreWeight =
    sum(
      availableScores.map(
        (result) =>
          result.configuredWeight
      )
    );

  const fairValue =
    availableValuationWeight >
      0
      ? sum(
          availableValuations.map(
            (result) =>
              result
                .impliedFairValue *
              result
                .configuredWeight
          )
        ) /
        availableValuationWeight
      : null;

  const relativeScore =
    availableScoreWeight >
      0
      ? sum(
          availableScores.map(
            (result) =>
              result
                .comparisonScore *
              result
                .configuredWeight
          )
        ) /
        availableScoreWeight
      : null;

  const valuationCoverage =
    totalConfiguredWeight >
      0
      ? (
          availableValuationWeight /
          totalConfiguredWeight
        ) *
        100
      : 0;

  const scoreCoverage =
    totalConfiguredWeight >
      0
      ? (
          availableScoreWeight /
          totalConfiguredWeight
        ) *
        100
      : 0;

  const fairValues =
    availableValuations.map(
      (result) =>
        result.impliedFairValue
    );

  const dispersion =
    standardDeviation(
      fairValues
    );

  const meanFairValue =
    average(
      fairValues
    );

  const dispersionPercentage =
    dispersion !==
      null &&
    meanFairValue !==
      null &&
    meanFairValue !==
      0
      ? (
          dispersion /
          meanFairValue
        ) *
        100
      : null;

  const qualityComparison =
    buildPeerQualityComparison({
      target:
        normalizedTarget,

      peers:
        normalizedPeers
    });

  const confidence =
    calculateRelativeValuationConfidence({
      peerCount:
        normalizedPeers.length,

      valuationCoverage,

      scoreCoverage,

      dispersionPercentage,

      dataQualityScore:
        normalizedTarget
          .dataQualityScore,

      qualityComparisonScore:
        qualityComparison
          ?.score
    });

  const classification =
    classifyValuation({
      currentPrice:
        normalizedTarget
          .currentPrice,

      fairValue
    });

  const priceLevels =
    buildValuationPriceLevels({
      fairValue,

      marginOfSafetyPercentage:
        normalizedPolicy
          .marginOfSafetyPercentage,

      fairValueRangePercentage:
        normalizedPolicy
          .fairValueRangePercentage,

      sellPremiumPercentage:
        normalizedPolicy
          .sellPremiumPercentage
    });

  let status;

  if (
    normalizedPeers.length <
    normalizedPolicy
      .minimumPeerCount
  ) {
    status =
      RELATIVE_VALUATION_STATUSES
        .INSUFFICIENT_PEERS;
  } else if (
    fairValue ===
      null &&
    relativeScore ===
      null
  ) {
    status =
      RELATIVE_VALUATION_STATUSES
        .INSUFFICIENT_DATA;
  } else if (
    valuationCoverage <
    normalizedPolicy
      .minimumMetricCoveragePercentage
  ) {
    status =
      RELATIVE_VALUATION_STATUSES
        .PARTIAL;
  } else {
    status =
      RELATIVE_VALUATION_STATUSES
        .AVAILABLE;
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    symbol:
      normalizedTarget
        .symbol ||
      null,

    name:
      normalizedTarget
        .name,

    sector:
      normalizedTarget
        .sector,

    industry:
      normalizedTarget
        .industry,

    status,

    currentPrice:
      roundMoney(
        normalizedTarget
          .currentPrice
      ),

    fairValue:
      roundMoney(
        fairValue
      ),

    medianImpliedFairValue:
      roundMoney(
        median(
          fairValues
        )
      ),

    averageImpliedFairValue:
      roundMoney(
        average(
          fairValues
        )
      ),

    minimumImpliedFairValue:
      fairValues.length
        ? roundMoney(
            Math.min(
              ...fairValues
            )
          )
        : null,

    maximumImpliedFairValue:
      fairValues.length
        ? roundMoney(
            Math.max(
              ...fairValues
            )
          )
        : null,

    relativeScore:
      relativeScore ===
        null
        ? null
        : roundScore(
            relativeScore
          ),

    classification,

    confidence,

    priceLevels,

    coverage: {
      valuationCoveragePercentage:
        roundPercent(
          valuationCoverage
        ),

      scoreCoveragePercentage:
        roundPercent(
          scoreCoverage
        ),

      availableValuationMetrics:
        availableValuations.length,

      availableScoreMetrics:
        availableScores.length,

      totalMetrics:
        metricResults.length
    },

    dispersion: {
      standardDeviation:
        roundMoney(
          dispersion
        ),

      percentage:
        roundPercent(
          dispersionPercentage
        )
    },

    peerGroup: {
      count:
        normalizedPeers.length,

      symbols:
        normalizedPeers
          .map(
            (peer) =>
              peer.symbol
          )
          .filter(Boolean)
    },

    metrics:
      metricResults,

    qualityComparison,

    message:
      buildCompositeRelativeValuationMessage({
        target:
          normalizedTarget,

        fairValue,

        relativeScore,

        classification,

        confidence,

        peerCount:
          normalizedPeers.length
      }),

    advisoryOnly:
      true
  };
}

/*
 * ============================================================
 * CONFIDENCE
 * ============================================================
 */

export function calculateRelativeValuationConfidence({
  peerCount = 0,
  valuationCoverage = 0,
  scoreCoverage = 0,
  dispersionPercentage = null,
  dataQualityScore = null,
  qualityComparisonScore = null
} = {}) {
  const peerScore =
    peerCount >= 10
      ? 100
      : peerCount >= 7
        ? 90
        : peerCount >= 5
          ? 80
          : peerCount >= 3
            ? 65
            : peerCount >= 2
              ? 40
              : 15;

  const dispersion =
    nullableNumber(
      dispersionPercentage
    );

  const agreementScore =
    dispersion ===
      null
      ? 50
      : dispersion <= 10
        ? 100
        : dispersion <= 20
          ? 85
          : dispersion <= 35
            ? 65
            : dispersion <= 50
              ? 40
              : 20;

  const components = [
    {
      code:
        "PEER_COUNT",

      score:
        peerScore,

      weight:
        0.25
    },
    {
      code:
        "VALUATION_COVERAGE",

      score:
        clamp(
          valuationCoverage,
          0,
          100
        ),

      weight:
        0.25
    },
    {
      code:
        "SCORE_COVERAGE",

      score:
        clamp(
          scoreCoverage,
          0,
          100
        ),

      weight:
        0.15
    },
    {
      code:
        "MODEL_AGREEMENT",

      score:
        agreementScore,

      weight:
        0.2
    }
  ];

  if (
    nullableNumber(
      dataQualityScore
    ) !==
    null
  ) {
    components.push({
      code:
        "DATA_QUALITY",

      score:
        clamp(
          dataQualityScore,
          0,
          100
        ),

      weight:
        0.1
    });
  }

  if (
    nullableNumber(
      qualityComparisonScore
    ) !==
    null
  ) {
    components.push({
      code:
        "QUALITY_COMPARISON",

      score:
        clamp(
          qualityComparisonScore,
          0,
          100
        ),

      weight:
        0.05
    });
  }

  const totalWeight =
    sum(
      components.map(
        (item) =>
          item.weight
      )
    );

  const score =
    totalWeight >
      0
      ? sum(
          components.map(
            (item) =>
              item.score *
              item.weight
          )
        ) /
        totalWeight
      : 0;

  const rounded =
    roundScore(
      score
    );

  return {
    score:
      rounded,

    classification:
      classifyValuationConfidence(
        rounded
      ),

    components
  };
}

/*
 * ============================================================
 * GROWTH-ADJUSTED RELATIVE VALUATION
 * ============================================================
 */

export function buildGrowthAdjustedRelativeValuation({
  target,
  peers = [],
  policy = {}
} = {}) {
  const normalizedTarget =
    normalizeRelativeValuationSecurity(
      target
    );

  const normalizedPeers =
    safeArray(
      peers
    ).map(
      normalizeRelativeValuationSecurity
    );

  const targetGrowth =
    nullableNumber(
      normalizedTarget
        .earningsGrowthPercentage
    );

  const targetPe =
    positiveNumber(
      normalizedTarget
        .peRatio
    );

  const targetEps =
    positiveNumber(
      normalizedTarget
        .earningsPerShare
    );

  const peerPegValues =
    normalizedPeers
      .map(
        (peer) =>
          positiveNumber(
            peer?.pegRatio
          )
      )
      .filter(
        (value) =>
          value !==
          null
      );

  const peerPegMedian =
    median(
      peerPegValues
    );

  if (
    targetGrowth ===
      null ||
    targetGrowth <= 0 ||
    targetEps ===
      null ||
    peerPegMedian ===
      null
  ) {
    return {
      status:
        RELATIVE_VALUATION_STATUSES
          .INSUFFICIENT_DATA,

      available:
        false,

      symbol:
        normalizedTarget
          .symbol,

      targetPe,

      targetGrowthPercentage:
        targetGrowth,

      peerPegMedian,

      impliedPeRatio:
        null,

      impliedFairValue:
        null,

      message:
        "Positive earnings growth, EPS, and peer PEG evidence are required."
    };
  }

  const impliedPe =
    peerPegMedian *
    targetGrowth;

  const impliedFairValue =
    impliedPe *
    targetEps;

  const currentPrice =
    normalizedTarget
      .currentPrice;

  const classification =
    classifyValuation({
      currentPrice,

      fairValue:
        impliedFairValue
    });

  return {
    status:
      RELATIVE_VALUATION_STATUSES
        .AVAILABLE,

    available:
      true,

    symbol:
      normalizedTarget
        .symbol,

    targetPe,

    targetGrowthPercentage:
      roundPercent(
        targetGrowth
      ),

    targetPegRatio:
      roundMetric(
        normalizedTarget
          .pegRatio
      ),

    peerPegMedian:
      roundMetric(
        peerPegMedian
      ),

    peerCount:
      peerPegValues.length,

    impliedPeRatio:
      roundMetric(
        impliedPe
      ),

    impliedFairValue:
      roundMoney(
        impliedFairValue
      ),

    classification,

    message:
      `${normalizedTarget.symbol} has a peer-growth-adjusted implied fair value of KES ${roundMoney(
        impliedFairValue
      )}.`
  };
}

/*
 * ============================================================
 * PEER RANKING
 * ============================================================
 */

export function buildPeerRanking({
  target,
  peers = []
} = {}) {
  const normalizedTarget =
    normalizeRelativeValuationSecurity(
      target
    );

  const universe = [
    normalizedTarget,
    ...safeArray(
      peers
    ).map(
      normalizeRelativeValuationSecurity
    )
  ].filter(
    (security) =>
      security.symbol
  );

  const metricDefinitions = [
    {
      field:
        "peRatio",

      code:
        "PE_VALUE",

      higherIsBetter:
        false,

      weight:
        0.18
    },
    {
      field:
        "priceToBookRatio",

      code:
        "PB_VALUE",

      higherIsBetter:
        false,

      weight:
        0.12
    },
    {
      field:
        "evToEbitdaRatio",

      code:
        "EV_EBITDA_VALUE",

      higherIsBetter:
        false,

      weight:
        0.15
    },
    {
      field:
        "dividendYieldPercentage",

      code:
        "DIVIDEND_YIELD",

      higherIsBetter:
        true,

      weight:
        0.1
    },
    {
      field:
        "freeCashFlowYieldPercentage",

      code:
        "FCF_YIELD",

      higherIsBetter:
        true,

      weight:
        0.12
    },
    {
      field:
        "returnOnEquityPercentage",

      code:
        "ROE",

      higherIsBetter:
        true,

      weight:
        0.13
    },
    {
      field:
        "earningsGrowthPercentage",

      code:
        "EARNINGS_GROWTH",

      higherIsBetter:
        true,

      weight:
        0.12
    },
    {
      field:
        "netMarginPercentage",

      code:
        "NET_MARGIN",

      higherIsBetter:
        true,

      weight:
        0.08
    }
  ];

  const ranked =
    universe.map(
      (security) => {
        const metrics =
          metricDefinitions.map(
            (definition) => {
              const value =
                nullableNumber(
                  security?.[
                    definition.field
                  ]
                );

              const universeValues =
                universe
                  .map(
                    (item) =>
                      nullableNumber(
                        item?.[
                          definition.field
                        ]
                      )
                  )
                  .filter(
                    (item) =>
                      item !==
                      null
                  );

              const percentile =
                percentileRank({
                  value,

                  values:
                    universeValues,

                  higherIsBetter:
                    definition
                      .higherIsBetter
                });

              return {
                code:
                  definition.code,

                value,

                percentile,

                weight:
                  definition.weight,

                available:
                  value !==
                    null &&
                  percentile !==
                    null
              };
            }
          );

        const available =
          metrics.filter(
            (metric) =>
              metric.available
          );

        const totalWeight =
          sum(
            available.map(
              (metric) =>
                metric.weight
            )
          );

        const score =
          totalWeight >
            0
            ? sum(
                available.map(
                  (metric) =>
                    metric
                      .percentile *
                    metric.weight
                )
              ) /
              totalWeight
            : null;

        return {
          symbol:
            security.symbol,

          name:
            security.name,

          sector:
            security.sector,

          score:
            score ===
              null
              ? null
              : roundScore(
                  score
                ),

          availableMetrics:
            available.length,

          totalMetrics:
            metrics.length,

          metrics
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
    )
    .map(
      (
        item,
        index
      ) => ({
        ...item,

        rank:
          index +
          1
      })
    );

  const targetRanking =
    ranked.find(
      (item) =>
        item.symbol ===
        normalizedTarget
          .symbol
    ) ||
    null;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      ranked.length
        ? RELATIVE_VALUATION_STATUSES
            .AVAILABLE
        : RELATIVE_VALUATION_STATUSES
            .INSUFFICIENT_DATA,

    target:
      targetRanking,

    totalSecurities:
      ranked.length,

    rankings:
      ranked
  };
}

/*
 * ============================================================
 * COMPLETE RELATIVE VALUATION
 * ============================================================
 */

export function buildRelativeValuationAnalysis({
  target,
  securities = [],
  metricWeights =
    DEFAULT_RELATIVE_METRIC_WEIGHTS,
  policy = {}
} = {}) {
  const peerGroup =
    buildPeerGroup({
      target,

      securities,

      policy
    });

  const normalizedTarget =
    peerGroup.target;

  const peers =
    peerGroup.peers;

  const composite =
    buildCompositeRelativeValuation({
      target:
        normalizedTarget,

      peers,

      metricWeights,

      policy
    });

  const growthAdjusted =
    buildGrowthAdjustedRelativeValuation({
      target:
        normalizedTarget,

      peers,

      policy
    });

  const ranking =
    buildPeerRanking({
      target:
        normalizedTarget,

      peers
    });

  const availableFairValues = [
    composite
      ?.fairValue,

    growthAdjusted
      ?.impliedFairValue
  ]
    .map(
      positiveNumber
    )
    .filter(
      (value) =>
        value !==
        null
    );

  const blendedFairValue =
    availableFairValues.length
      ? average(
          availableFairValues
        )
      : null;

  const blendedClassification =
    classifyValuation({
      currentPrice:
        normalizedTarget
          ?.currentPrice,

      fairValue:
        blendedFairValue
    });

  const blendedPriceLevels =
    buildValuationPriceLevels({
      fairValue:
        blendedFairValue,

      marginOfSafetyPercentage:
        normalizePolicy(
          policy
        )
          .marginOfSafetyPercentage,

      fairValueRangePercentage:
        normalizePolicy(
          policy
        )
          .fairValueRangePercentage,

      sellPremiumPercentage:
        normalizePolicy(
          policy
        )
          .sellPremiumPercentage
    });

  let status;

  if (
    peerGroup.status ===
    RELATIVE_VALUATION_STATUSES
      .INVALID_INPUT
  ) {
    status =
      RELATIVE_VALUATION_STATUSES
        .INVALID_INPUT;
  } else if (
    peerGroup.status ===
    RELATIVE_VALUATION_STATUSES
      .INSUFFICIENT_PEERS
  ) {
    status =
      RELATIVE_VALUATION_STATUSES
        .INSUFFICIENT_PEERS;
  } else if (
    blendedFairValue ===
      null &&
    composite
      ?.relativeScore ===
      null
  ) {
    status =
      RELATIVE_VALUATION_STATUSES
        .INSUFFICIENT_DATA;
  } else {
    status =
      composite.status;
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    symbol:
      normalizedTarget
        ?.symbol ||
      null,

    name:
      normalizedTarget
        ?.name ||
      "Unknown",

    sector:
      normalizedTarget
        ?.sector ||
      "UNKNOWN",

    industry:
      normalizedTarget
        ?.industry ||
      "UNKNOWN",

    currentPrice:
      roundMoney(
        normalizedTarget
          ?.currentPrice
      ),

    fairValue:
      roundMoney(
        blendedFairValue
      ),

    classification:
      blendedClassification,

    priceLevels:
      blendedPriceLevels,

    relativeScore:
      composite
        ?.relativeScore ??
      null,

    confidence:
      composite
        ?.confidence ||
      {
        score:
          0,

        classification:
          classifyValuationConfidence(
            0
          )
      },

    peerGroup,

    composite,

    growthAdjusted,

    ranking,

    summary: {
      peerCount:
        peers.length,

      targetPeerRank:
        ranking
          ?.target
          ?.rank ??
        null,

      totalRanked:
        ranking
          ?.totalSecurities ||
        0,

      availableMetrics:
        composite
          ?.coverage
          ?.availableValuationMetrics ||
        0,

      totalMetrics:
        composite
          ?.coverage
          ?.totalMetrics ||
        0,

      metricCoveragePercentage:
        composite
          ?.coverage
          ?.valuationCoveragePercentage ||
        0,

      confidencePercentage:
        composite
          ?.confidence
          ?.score ||
        0,

      confidenceLevel:
        composite
          ?.confidence
          ?.classification
          ?.label ||
        "Not Available"
    },

    message:
      buildRelativeValuationAnalysisMessage({
        target:
          normalizedTarget,

        fairValue:
          blendedFairValue,

        classification:
          blendedClassification,

        peerCount:
          peers.length,

        peerRank:
          ranking
            ?.target
            ?.rank,

        totalRanked:
          ranking
            ?.totalSecurities,

        confidence:
          composite
            ?.confidence
      }),

    advisoryOnly:
      true
  };
}

function buildCompositeRelativeValuationMessage({
  target,
  fairValue,
  relativeScore,
  classification,
  confidence,
  peerCount
}) {
  const parts = [];

  if (
    fairValue !==
      null
  ) {
    parts.push(
      `${target.symbol} has a peer-implied fair value of approximately KES ${roundMoney(
        fairValue
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

  if (
    relativeScore !==
      null
  ) {
    parts.push(
      `The relative valuation score is ${relativeScore}/100.`
    );
  }

  parts.push(
    `The security is classified as ${classification.label.toLowerCase()} relative to peers.`
  );

  parts.push(
    `${peerCount} peer securities were included.`
  );

  parts.push(
    `Confidence is ${confidence.classification.label.toLowerCase()} at ${confidence.score}%.`
  );

  return parts.join(
    " "
  );
}

function buildRelativeValuationAnalysisMessage({
  target,
  fairValue,
  classification,
  peerCount,
  peerRank,
  totalRanked,
  confidence
}) {
  const parts = [];

  if (
    fairValue !==
      null
  ) {
    parts.push(
      `${target.symbol} has an estimated blended relative fair value of KES ${roundMoney(
        fairValue
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
    `The relative valuation classification is ${classification.label.toLowerCase()}.`
  );

  parts.push(
    `${peerCount} peer securities were analyzed.`
  );

  if (
    peerRank !==
      null &&
    peerRank !==
      undefined
  ) {
    parts.push(
      `${target.symbol} ranked ${peerRank} of ${totalRanked} in the composite peer ranking.`
    );
  }

  if (
    confidence
  ) {
    parts.push(
      `Relative valuation confidence is ${confidence.classification.label.toLowerCase()} at ${confidence.score}%.`
    );
  }

  return parts.join(
    " "
  );
}

/*
 * ============================================================
 * BATCH RELATIVE VALUATIONS
 * ============================================================
 */

export function buildRelativeValuationBatch({
  securities = [],
  metricWeights =
    DEFAULT_RELATIVE_METRIC_WEIGHTS,
  policy = {}
} = {}) {
  const normalized =
    safeArray(
      securities
    ).map(
      normalizeRelativeValuationSecurity
    );

  const results =
    normalized.map(
      (target) =>
        buildRelativeValuationAnalysis({
          target,

          securities:
            normalized,

          metricWeights,

          policy
        })
    );

  const valued =
    results.filter(
      (result) =>
        result.fairValue !==
          null &&
        result.fairValue !==
          undefined
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      results.length
        ? RELATIVE_VALUATION_STATUSES
            .AVAILABLE
        : RELATIVE_VALUATION_STATUSES
            .INSUFFICIENT_DATA,

    total:
      results.length,

    valued:
      valued.length,

    notValued:
      results.length -
      valued.length,

    averageRelativeScore:
      roundPercent(
        average(
          results.map(
            (result) =>
              result
                ?.relativeScore
          )
        )
      ),

    averageConfidencePercentage:
      roundPercent(
        average(
          results.map(
            (result) =>
              result
                ?.confidence
                ?.score
          )
        )
      ),

    results:
      results.sort(
        (
          first,
          second
        ) =>
          number(
            second
              ?.classification
              ?.upsidePercentage
          ) -
          number(
            first
              ?.classification
              ?.upsidePercentage
          )
      )
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export function loadMostAttractiveRelativeValuations(
  results = [],
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
    results
  )
    .filter(
      (result) =>
        nullableNumber(
          result
            ?.relativeScore
        ) !==
        null
    )
    .sort(
      (
        first,
        second
      ) =>
        number(
          second
            ?.relativeScore
        ) -
        number(
          first
            ?.relativeScore
        )
    )
    .slice(
      0,
      safeLimit
    );
}

export function loadLargestPeerDiscounts(
  results = [],
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
    results
  )
    .filter(
      (result) =>
        nullableNumber(
          result
            ?.classification
            ?.upsidePercentage
        ) !==
        null
    )
    .sort(
      (
        first,
        second
      ) =>
        number(
          second
            ?.classification
            ?.upsidePercentage
        ) -
        number(
          first
            ?.classification
            ?.upsidePercentage
        )
    )
    .slice(
      0,
      safeLimit
    );
}

export function loadLargestPeerPremiums(
  results = [],
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
    results
  )
    .filter(
      (result) =>
        nullableNumber(
          result
            ?.classification
            ?.upsidePercentage
        ) !==
        null
    )
    .sort(
      (
        first,
        second
      ) =>
        number(
          first
            ?.classification
            ?.upsidePercentage
        ) -
        number(
          second
            ?.classification
            ?.upsidePercentage
        )
    )
    .slice(
      0,
      safeLimit
    );
}

export function loadHighestConfidenceRelativeValuations(
  results = [],
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
    results
  )
    .sort(
      (
        first,
        second
      ) =>
        number(
          second
            ?.confidence
            ?.score
        ) -
        number(
          first
            ?.confidence
            ?.score
        )
    )
    .slice(
      0,
      safeLimit
    );
}

export function loadTopPeerRankedSecurities(
  batchResult,
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
    batchResult
      ?.results
  )
    .sort(
      (
        first,
        second
      ) =>
        number(
          first
            ?.ranking
            ?.target
            ?.rank
        ) -
        number(
          second
            ?.ranking
            ?.target
            ?.rank
        )
    )
    .slice(
      0,
      safeLimit
    );
}

export function buildRelativeValuationSummary(
  result
) {
  return {
    symbol:
      result?.symbol ||
      null,

    status:
      result?.status ||
      RELATIVE_VALUATION_STATUSES
        .INSUFFICIENT_DATA,

    currentPrice:
      result
        ?.currentPrice ??
      null,

    fairValue:
      result
        ?.fairValue ??
      null,

    relativeScore:
      result
        ?.relativeScore ??
      null,

    classification:
      result
        ?.classification
        ?.label ||
      "Not Rated",

    upsidePercentage:
      result
        ?.classification
        ?.upsidePercentage ??
      null,

    confidencePercentage:
      result
        ?.confidence
        ?.score ??
      0,

    confidence:
      result
        ?.confidence
        ?.classification
        ?.label ||
      "Not Available",

    peerCount:
      result
        ?.summary
        ?.peerCount ||
      0,

    peerRank:
      result
        ?.summary
        ?.targetPeerRank ??
      null,

    totalRanked:
      result
        ?.summary
        ?.totalRanked ||
      0,

    buyUnder:
      result
        ?.priceLevels
        ?.buyUnder ??
      null,

    sellOver:
      result
        ?.priceLevels
        ?.sellOver ??
      null,

    message:
      result?.message ||
      "No relative valuation summary is available."
  };
}