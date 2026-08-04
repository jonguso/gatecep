import {
  buildCurrentPortfolioAllocation
} from "../rebalancing/allocationEngine";

import {
  loadPortfolioEvents
} from "../portfolio-ledger/portfolioEventStore";

import {
  getOrCreateRiskConfiguration
} from "./riskStore";

import {
  calculateLimitUsagePercentage,
  classifyRiskLimitUsage
} from "./riskLimits";

const DEFAULT_TRADING_DAYS =
  252;

const DEFAULT_CONFIDENCE_LEVEL =
  0.95;

const MINIMUM_PRELIMINARY_RETURNS =
  5;

const MINIMUM_RELIABLE_RETURNS =
  20;

/*
 * ============================================================
 * GENERAL HELPERS
 * ============================================================
 */

function number(value) {
  const parsed =
    Number(
      value ??
      0
    );

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

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
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
    number(value).toFixed(4)
  );
}

function roundMetric(value, decimals = 6) {
  const parsed =
    nullableNumber(value);

  if (parsed === null) {
    return null;
  }

  return Number(
    parsed.toFixed(
      decimals
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

function average(
  values = []
) {
  const safeValues =
    values.filter(
      (value) =>
        Number.isFinite(
          Number(value)
        )
    );

  if (!safeValues.length) {
    return null;
  }

  return (
    safeValues.reduce(
      (sum, value) =>
        sum +
        Number(value),
      0
    ) /
    safeValues.length
  );
}

function sampleStandardDeviation(
  values = []
) {
  const safeValues =
    values
      .map(Number)
      .filter(
        Number.isFinite
      );

  if (
    safeValues.length <
    2
  ) {
    return null;
  }

  const mean =
    average(
      safeValues
    );

  if (mean === null) {
    return null;
  }

  const variance =
    safeValues.reduce(
      (
        sum,
        value
      ) =>
        sum +
        Math.pow(
          value -
          mean,
          2
        ),
      0
    ) /
    (
      safeValues.length -
      1
    );

  return Math.sqrt(
    variance
  );
}

function covariance(
  valuesA = [],
  valuesB = []
) {
  const length =
    Math.min(
      valuesA.length,
      valuesB.length
    );

  if (
    length <
    2
  ) {
    return null;
  }

  const pairs = [];

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    const first =
      nullableNumber(
        valuesA[index]
      );

    const second =
      nullableNumber(
        valuesB[index]
      );

    if (
      first !== null &&
      second !== null
    ) {
      pairs.push([
        first,
        second
      ]);
    }
  }

  if (
    pairs.length <
    2
  ) {
    return null;
  }

  const firstMean =
    average(
      pairs.map(
        (pair) =>
          pair[0]
      )
    );

  const secondMean =
    average(
      pairs.map(
        (pair) =>
          pair[1]
      )
    );

  if (
    firstMean === null ||
    secondMean === null
  ) {
    return null;
  }

  return (
    pairs.reduce(
      (
        sum,
        pair
      ) =>
        sum +
        (
          pair[0] -
          firstMean
        ) *
        (
          pair[1] -
          secondMean
        ),
      0
    ) /
    (
      pairs.length -
      1
    )
  );
}

function variance(
  values = []
) {
  const deviation =
    sampleStandardDeviation(
      values
    );

  if (
    deviation === null
  ) {
    return null;
  }

  return deviation *
    deviation;
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function dateKey(value) {
  const date =
    normalizeDate(value);

  if (!date) {
    return null;
  }

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}

/*
 * ============================================================
 * EVENT VALUE EXTRACTION
 * ============================================================
 */

function extractEventDate(
  event = {}
) {
  return (
    event?.occurredAt ||
    event?.eventDate ||
    event?.effectiveAt ||
    event?.updatedAt ||
    event?.createdAt ||
    null
  );
}

function extractPortfolioValue(
  event = {}
) {
  const candidates = [
    event?.portfolioValueAfter,
    event?.totalValueAfter,
    event?.portfolioValue,
    event?.totalValue,
    event?.snapshot?.portfolioValue,
    event?.snapshot?.totalValue,
    event?.metadata?.portfolioValueAfter,
    event?.metadata?.totalValueAfter,
    event?.metadata?.portfolioValue,
    event?.metadata?.totalValue
  ];

  for (
    const candidate of
    candidates
  ) {
    const parsed =
      nullableNumber(
        candidate
      );

    if (
      parsed !== null &&
      parsed > 0
    ) {
      return parsed;
    }
  }

  return null;
}

/*
 * ============================================================
 * BUILD PORTFOLIO VALUE SERIES
 * ============================================================
 */

export async function buildPortfolioValueSeries() {
  const [
    events,
    allocation
  ] = await Promise.all([
    loadPortfolioEvents(),
    buildCurrentPortfolioAllocation()
  ]);

  const safeEvents =
    Array.isArray(events)
      ? events
      : [];

  /*
   * One closing portfolio value per calendar date.
   * Later events on the same date replace earlier ones.
   */
  const dailyMap =
    new Map();

  safeEvents.forEach(
    (event) => {
      const eventDate =
        extractEventDate(
          event
        );

      const key =
        dateKey(
          eventDate
        );

      const value =
        extractPortfolioValue(
          event
        );

      if (
        !key ||
        value === null ||
        value <= 0
      ) {
        return;
      }

      const timestamp =
        normalizeDate(
          eventDate
        )?.getTime() ||
        0;

      const current =
        dailyMap.get(
          key
        );

      if (
        !current ||
        timestamp >=
          current.timestamp
      ) {
        dailyMap.set(
          key,
          {
            date:
              key,

            timestamp,

            portfolioValue:
              roundMoney(
                value
              ),

            source:
              "PORTFOLIO_EVENT_LEDGER",

            eventId:
              event?.id ||
              null,

            eventType:
              event?.eventType ||
              event?.type ||
              null
          }
        );
      }
    }
  );

  const currentValue =
    number(
      allocation
        ?.portfolio
        ?.totalValue
    );

  if (
    currentValue > 0
  ) {
    const now =
      new Date();

    const currentKey =
      dateKey(now);

    dailyMap.set(
      currentKey,
      {
        date:
          currentKey,

        timestamp:
          now.getTime(),

        portfolioValue:
          roundMoney(
            currentValue
          ),

        source:
          "CURRENT_PORTFOLIO",

        eventId:
          null,

        eventType:
          "CURRENT_VALUATION"
      }
    );
  }

  const values =
    Array.from(
      dailyMap.values()
    )
      .sort(
        (a, b) =>
          a.timestamp -
          b.timestamp
      )
      .map(
        (
          item,
          index
        ) => {
          const previous =
            index > 0
              ? Array.from(
                  dailyMap.values()
                )
              : null;

          return item;
        }
      );

  /*
   * Calculate returns only after sorting.
   */
  const series =
    values.map(
      (
        item,
        index
      ) => {
        const previous =
          index > 0
            ? values[
                index -
                1
              ]
            : null;

        const previousValue =
          number(
            previous
              ?.portfolioValue
          );

        const returnDecimal =
          previousValue > 0
            ? (
                item.portfolioValue -
                previousValue
              ) /
              previousValue
            : null;

        return {
          ...item,

          previousValue:
            previousValue > 0
              ? previousValue
              : null,

          returnDecimal:
            returnDecimal ===
              null
              ? null
              : roundMetric(
                  returnDecimal,
                  10
                ),

          returnPercentage:
            returnDecimal ===
              null
              ? null
              : roundPercent(
                  returnDecimal *
                  100
                )
        };
      }
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    observations:
      series.length,

    returnObservations:
      Math.max(
        series.length -
        1,
        0
      ),

    firstDate:
      series[0]?.date ||
      null,

    lastDate:
      series[
        series.length -
        1
      ]?.date ||
      null,

    series,

    allocation
  };
}

/*
 * ============================================================
 * RETURN SERIES
 * ============================================================
 */

export async function buildPortfolioReturnSeries() {
  const valueSeries =
    await buildPortfolioValueSeries();

  const returns =
    valueSeries.series
      .filter(
        (item) =>
          item
            ?.returnDecimal !==
          null
      )
      .map(
        (item) => ({
          date:
            item.date,

          returnDecimal:
            item.returnDecimal,

          returnPercentage:
            item.returnPercentage,

          portfolioValue:
            item.portfolioValue,

          previousValue:
            item.previousValue,

          source:
            item.source
        })
      );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    observations:
      returns.length,

    returns,

    valueSeries
  };
}

/*
 * ============================================================
 * MAXIMUM DRAWDOWN
 * ============================================================
 */

function calculateMaximumDrawdown(
  series = []
) {
  if (
    series.length <
    2
  ) {
    return {
      maximumDrawdownDecimal:
        null,

      maximumDrawdownPercentage:
        null,

      peakValue:
        null,

      troughValue:
        null,

      peakDate:
        null,

      troughDate:
        null
    };
  }

  let runningPeak =
    number(
      series[0]
        ?.portfolioValue
    );

  let runningPeakDate =
    series[0]?.date ||
    null;

  let maximumDrawdown =
    0;

  let maximumPeakValue =
    runningPeak;

  let maximumPeakDate =
    runningPeakDate;

  let maximumTroughValue =
    runningPeak;

  let maximumTroughDate =
    runningPeakDate;

  series.forEach(
    (item) => {
      const value =
        number(
          item
            ?.portfolioValue
        );

      if (
        value <= 0
      ) {
        return;
      }

      if (
        value >
        runningPeak
      ) {
        runningPeak =
          value;

        runningPeakDate =
          item.date;
      }

      const drawdown =
        runningPeak > 0
          ? (
              value -
              runningPeak
            ) /
            runningPeak
          : 0;

      if (
        drawdown <
        maximumDrawdown
      ) {
        maximumDrawdown =
          drawdown;

        maximumPeakValue =
          runningPeak;

        maximumPeakDate =
          runningPeakDate;

        maximumTroughValue =
          value;

        maximumTroughDate =
          item.date;
      }
    }
  );

  return {
    maximumDrawdownDecimal:
      roundMetric(
        maximumDrawdown,
        10
      ),

    maximumDrawdownPercentage:
      roundPercent(
        Math.abs(
          maximumDrawdown
        ) *
        100
      ),

    peakValue:
      roundMoney(
        maximumPeakValue
      ),

    troughValue:
      roundMoney(
        maximumTroughValue
      ),

    peakDate:
      maximumPeakDate,

    troughDate:
      maximumTroughDate
  };
}

/*
 * ============================================================
 * DOWNSIDE DEVIATION
 * ============================================================
 */

function calculateDownsideDeviation({
  returns,
  minimumAcceptableReturnDecimal = 0,
  annualizationFactor =
    DEFAULT_TRADING_DAYS
}) {
  const safeReturns =
    returns
      .map(Number)
      .filter(
        Number.isFinite
      );

  if (
    safeReturns.length <
    2
  ) {
    return null;
  }

  const downsideSquares =
    safeReturns.map(
      (value) => {
        const downside =
          Math.min(
            value -
              minimumAcceptableReturnDecimal,
            0
          );

        return downside *
          downside;
      }
    );

  const meanSquare =
    average(
      downsideSquares
    );

  if (
    meanSquare ===
    null
  ) {
    return null;
  }

  return (
    Math.sqrt(
      meanSquare
    ) *
    Math.sqrt(
      annualizationFactor
    )
  );
}

/*
 * ============================================================
 * HISTORICAL VaR AND CVaR
 * ============================================================
 */

function calculateHistoricalRisk({
  returns,
  confidenceLevel =
    DEFAULT_CONFIDENCE_LEVEL
}) {
  const safeReturns =
    returns
      .map(Number)
      .filter(
        Number.isFinite
      )
      .sort(
        (a, b) =>
          a -
          b
      );

  if (
    safeReturns.length <
    2
  ) {
    return {
      valueAtRiskDecimal:
        null,

      conditionalValueAtRiskDecimal:
        null,

      quantileReturn:
        null,

      tailObservations:
        0
    };
  }

  const tailProbability =
    clamp(
      1 -
      number(
        confidenceLevel
      ),
      0,
      1
    );

  const quantileIndex =
    Math.min(
      Math.max(
        Math.floor(
          tailProbability *
          safeReturns.length
        ),
        0
      ),
      safeReturns.length -
      1
    );

  const quantileReturn =
    safeReturns[
      quantileIndex
    ];

  const tailReturns =
    safeReturns.filter(
      (value) =>
        value <=
        quantileReturn
    );

  const cvarReturn =
    average(
      tailReturns
    );

  return {
    valueAtRiskDecimal:
      roundMetric(
        Math.max(
          -quantileReturn,
          0
        ),
        10
      ),

    conditionalValueAtRiskDecimal:
      cvarReturn ===
        null
        ? null
        : roundMetric(
            Math.max(
              -cvarReturn,
              0
            ),
            10
          ),

    quantileReturn:
      roundMetric(
        quantileReturn,
        10
      ),

    tailObservations:
      tailReturns.length
  };
}

/*
 * ============================================================
 * OPTIONAL BENCHMARK BETA
 * ============================================================
 */

function extractBenchmarkReturns(
  configuration
) {
  const candidates = [
    configuration
      ?.metadata
      ?.benchmarkReturns,

    configuration
      ?.metadata
      ?.benchmarkReturnSeries,

    configuration
      ?.benchmarkReturns
  ];

  for (
    const candidate of
    candidates
  ) {
    if (
      Array.isArray(
        candidate
      ) &&
      candidate.length
    ) {
      return candidate
        .map(
          (item) => {
            if (
              typeof item ===
              "number"
            ) {
              return item;
            }

            return (
              nullableNumber(
                item
                  ?.returnDecimal
              ) ??
              (
                nullableNumber(
                  item
                    ?.returnPercentage
                ) !== null
                  ? number(
                      item
                        ?.returnPercentage
                    ) /
                    100
                  : null
              )
            );
          }
        )
        .filter(
          (item) =>
            item !==
            null
        );
    }
  }

  return [];
}

function calculateBeta({
  portfolioReturns,
  benchmarkReturns
}) {
  if (
    !Array.isArray(
      benchmarkReturns
    ) ||
    benchmarkReturns.length <
      2
  ) {
    return {
      available:
        false,

      beta:
        null,

      observations:
        0,

      reason:
        "BENCHMARK_HISTORY_NOT_AVAILABLE"
    };
  }

  const observationCount =
    Math.min(
      portfolioReturns.length,
      benchmarkReturns.length
    );

  if (
    observationCount <
    2
  ) {
    return {
      available:
        false,

      beta:
        null,

      observations:
        observationCount,

      reason:
        "INSUFFICIENT_MATCHED_OBSERVATIONS"
    };
  }

  const portfolioSlice =
    portfolioReturns.slice(
      -observationCount
    );

  const benchmarkSlice =
    benchmarkReturns.slice(
      -observationCount
    );

  const covarianceValue =
    covariance(
      portfolioSlice,
      benchmarkSlice
    );

  const benchmarkVariance =
    variance(
      benchmarkSlice
    );

  if (
    covarianceValue ===
      null ||
    benchmarkVariance ===
      null ||
    benchmarkVariance <=
      0
  ) {
    return {
      available:
        false,

      beta:
        null,

      observations:
        observationCount,

      reason:
        "BENCHMARK_VARIANCE_NOT_AVAILABLE"
    };
  }

  return {
    available:
      true,

    beta:
      roundMetric(
        covarianceValue /
        benchmarkVariance,
        6
      ),

    observations:
      observationCount,

    reason:
      null
  };
}

/*
 * ============================================================
 * METRIC RELIABILITY
 * ============================================================
 */

function classifyHistoryQuality(
  returnObservations
) {
  const count =
    number(
      returnObservations
    );

  if (
    count <
    2
  ) {
    return {
      status:
        "INSUFFICIENT_HISTORY",

      reliable:
        false,

      message:
        "At least two portfolio-return observations are required."
    };
  }

  if (
    count <
    MINIMUM_PRELIMINARY_RETURNS
  ) {
    return {
      status:
        "INSUFFICIENT_HISTORY",

      reliable:
        false,

      message:
        `Only ${count} return observation(s) are available. At least ${MINIMUM_PRELIMINARY_RETURNS} are required for preliminary analytics.`
    };
  }

  if (
    count <
    MINIMUM_RELIABLE_RETURNS
  ) {
    return {
      status:
        "PRELIMINARY",

      reliable:
        false,

      message:
        `${count} return observations are available. Metrics are preliminary until at least ${MINIMUM_RELIABLE_RETURNS} observations exist.`
    };
  }

  return {
    status:
      "READY",

    reliable:
      true,

    message:
      `${count} return observations are available for portfolio risk analysis.`
  };
}

/*
 * ============================================================
 * LIMIT ASSESSMENT
 * ============================================================
 */

function assessMaximumLimit({
  currentValue,
  limitValue,
  warningThreshold,
  criticalThreshold
}) {
  if (
    currentValue ===
      null ||
    currentValue ===
      undefined
  ) {
    return {
      available:
        false,

      currentValue:
        null,

      limitValue:
        roundPercent(
          limitValue
        ),

      usagePercentage:
        null,

      status:
        "NOT_AVAILABLE"
    };
  }

  const usagePercentage =
    calculateLimitUsagePercentage({
      currentValue,
      limitValue
    });

  return {
    available:
      true,

    currentValue:
      roundPercent(
        currentValue
      ),

    limitValue:
      roundPercent(
        limitValue
      ),

    usagePercentage,

    status:
      classifyRiskLimitUsage({
        usagePercentage,

        warningThresholdPercentage:
          warningThreshold,

        criticalThresholdPercentage:
          criticalThreshold
      })
  };
}

/*
 * ============================================================
 * ALERTS
 * ============================================================
 */

function buildMetricAlerts({
  volatilityLimit,
  drawdownLimit,
  historyQuality
}) {
  const alerts = [];

  if (
    historyQuality.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    alerts.push({
      id:
        "RISK-METRICS-HISTORY",

      type:
        "INSUFFICIENT_HISTORY",

      severity:
        "INFO",

      status:
        historyQuality.status,

      title:
        "More portfolio history is required",

      message:
        historyQuality.message
    });
  } else if (
    historyQuality.status ===
    "PRELIMINARY"
  ) {
    alerts.push({
      id:
        "RISK-METRICS-PRELIMINARY",

      type:
        "PRELIMINARY_METRICS",

      severity:
        "INFO",

      status:
        historyQuality.status,

      title:
        "Risk metrics are preliminary",

      message:
        historyQuality.message
    });
  }

  if (
    volatilityLimit
      ?.status ===
    "BREACHED"
  ) {
    alerts.push({
      id:
        "RISK-VOLATILITY-BREACH",

      type:
        "VOLATILITY_LIMIT",

      severity:
        "HIGH",

      status:
        "BREACHED",

      title:
        "Volatility limit breached",

      message:
        `Annualized volatility is ${number(
          volatilityLimit.currentValue
        ).toFixed(
          2
        )}%, above the configured target of ${number(
          volatilityLimit.limitValue
        ).toFixed(
          2
        )}%.`
    });
  } else if (
    volatilityLimit
      ?.status ===
    "WARNING"
  ) {
    alerts.push({
      id:
        "RISK-VOLATILITY-WARNING",

      type:
        "VOLATILITY_LIMIT",

      severity:
        "MEDIUM",

      status:
        "WARNING",

      title:
        "Volatility approaching limit",

      message:
        `Annualized volatility has reached ${number(
          volatilityLimit.usagePercentage
        ).toFixed(
          2
        )}% of the configured target.`
    });
  }

  if (
    drawdownLimit
      ?.status ===
    "BREACHED"
  ) {
    alerts.push({
      id:
        "RISK-DRAWDOWN-BREACH",

      type:
        "DRAWDOWN_LIMIT",

      severity:
        "HIGH",

      status:
        "BREACHED",

      title:
        "Drawdown limit breached",

      message:
        `Maximum observed drawdown is ${number(
          drawdownLimit.currentValue
        ).toFixed(
          2
        )}%, above the configured limit of ${number(
          drawdownLimit.limitValue
        ).toFixed(
          2
        )}%.`
    });
  } else if (
    drawdownLimit
      ?.status ===
    "WARNING"
  ) {
    alerts.push({
      id:
        "RISK-DRAWDOWN-WARNING",

      type:
        "DRAWDOWN_LIMIT",

      severity:
        "MEDIUM",

      status:
        "WARNING",

      title:
        "Drawdown approaching limit",

      message:
        `Maximum observed drawdown has reached ${number(
          drawdownLimit.usagePercentage
        ).toFixed(
          2
        )}% of the configured limit.`
    });
  }

  return alerts;
}

/*
 * ============================================================
 * RISK SCORE
 * ============================================================
 */

function calculateRiskMetricScore({
  volatilityLimit,
  drawdownLimit,
  sharpeRatio,
  historyQuality
}) {
  if (
    historyQuality.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    return 0;
  }

  let score =
    100;

  const volatilityUsage =
    number(
      volatilityLimit
        ?.usagePercentage
    );

  const drawdownUsage =
    number(
      drawdownLimit
        ?.usagePercentage
    );

  if (
    volatilityUsage > 100
  ) {
    score -= Math.min(
      40,
      (
        volatilityUsage -
        100
      ) *
        0.5 +
        20
    );
  } else if (
    volatilityUsage > 80
  ) {
    score -= 15;
  }

  if (
    drawdownUsage > 100
  ) {
    score -= Math.min(
      40,
      (
        drawdownUsage -
        100
      ) *
        0.5 +
        20
    );
  } else if (
    drawdownUsage > 80
  ) {
    score -= 15;
  }

  if (
    sharpeRatio !==
    null
  ) {
    if (
      sharpeRatio < 0
    ) {
      score -= 20;
    } else if (
      sharpeRatio < 0.5
    ) {
      score -= 10;
    } else if (
      sharpeRatio >= 1
    ) {
      score += 5;
    }
  }

  if (
    historyQuality.status ===
    "PRELIMINARY"
  ) {
    score =
      Math.min(
        score,
        75
      );
  }

  return Math.round(
    clamp(
      score,
      0,
      100
    )
  );
}

function getRiskMetricGrade(
  score,
  historyQuality
) {
  if (
    historyQuality.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    return {
      code:
        "NOT_AVAILABLE",

      label:
        "Not Available",

      description:
        "More portfolio history is required before a risk grade can be assigned."
    };
  }

  if (
    score >= 85
  ) {
    return {
      code:
        "LOW_RISK",

      label:
        "Low Risk",

      description:
        "Observed portfolio risk remains comfortably within the configured limits."
    };
  }

  if (
    score >= 70
  ) {
    return {
      code:
        "CONTROLLED",

      label:
        "Controlled",

      description:
        "Observed portfolio risk is generally controlled but should continue to be monitored."
    };
  }

  if (
    score >= 50
  ) {
    return {
      code:
        "ELEVATED",

      label:
        "Elevated",

      description:
        "One or more portfolio risk metrics are approaching or exceeding configured limits."
    };
  }

  return {
    code:
      "HIGH_RISK",

    label:
      "High Risk",

    description:
      "Observed volatility or drawdown requires immediate review."
  };
}

/*
 * ============================================================
 * PC-020C
 * PORTFOLIO RISK METRICS ENGINE
 * ============================================================
 *
 * Calculates from actual Portfolio Event Ledger valuations:
 *
 * - periodic returns,
 * - annualized return,
 * - annualized volatility,
 * - downside deviation,
 * - Sharpe ratio,
 * - Sortino ratio,
 * - maximum drawdown,
 * - historical VaR,
 * - historical CVaR,
 * - optional benchmark beta.
 *
 * It does not fabricate historical prices.
 */

export async function buildPortfolioRiskMetrics({
  annualizationFactor =
    DEFAULT_TRADING_DAYS,

  confidenceLevel =
    DEFAULT_CONFIDENCE_LEVEL,

  riskFreeRatePercentage =
    null,

  minimumAcceptableReturnPercentage =
    0
} = {}) {
  const [
    returnSeries,
    configuration
  ] = await Promise.all([
    buildPortfolioReturnSeries(),

    getOrCreateRiskConfiguration()
  ]);

  const allocation =
    returnSeries
      ?.valueSeries
      ?.allocation ||
    {};

  const limits =
    configuration
      ?.limits ||
    {};

  const returns =
    returnSeries.returns
      .map(
        (item) =>
          item.returnDecimal
      )
      .filter(
        (item) =>
          item !==
          null
      );

  const historyQuality =
    classifyHistoryQuality(
      returns.length
    );

  const configuredRiskFreeRate =
    nullableNumber(
      riskFreeRatePercentage
    ) ??
    nullableNumber(
      configuration
        ?.metadata
        ?.riskFreeRatePercentage
    ) ??
    0;

  const riskFreeAnnualDecimal =
    configuredRiskFreeRate /
    100;

  const minimumAcceptableAnnualDecimal =
    number(
      minimumAcceptableReturnPercentage
    ) /
    100;

  const averagePeriodicReturn =
    average(
      returns
    );

  const periodicVolatility =
    sampleStandardDeviation(
      returns
    );

  const annualizedReturnDecimal =
    averagePeriodicReturn ===
      null
      ? null
      : averagePeriodicReturn *
        annualizationFactor;

  const annualizedVolatilityDecimal =
    periodicVolatility ===
      null
      ? null
      : periodicVolatility *
        Math.sqrt(
          annualizationFactor
        );

  const downsideDeviationDecimal =
    calculateDownsideDeviation({
      returns,

      minimumAcceptableReturnDecimal:
        minimumAcceptableAnnualDecimal /
        annualizationFactor,

      annualizationFactor
    });

  const sharpeRatio =
    annualizedReturnDecimal !==
      null &&
    annualizedVolatilityDecimal !==
      null &&
    annualizedVolatilityDecimal >
      0
      ? (
          annualizedReturnDecimal -
          riskFreeAnnualDecimal
        ) /
        annualizedVolatilityDecimal
      : null;

  const sortinoRatio =
    annualizedReturnDecimal !==
      null &&
    downsideDeviationDecimal !==
      null &&
    downsideDeviationDecimal >
      0
      ? (
          annualizedReturnDecimal -
          minimumAcceptableAnnualDecimal
        ) /
        downsideDeviationDecimal
      : null;

  const drawdown =
    calculateMaximumDrawdown(
      returnSeries
        ?.valueSeries
        ?.series ||
      []
    );

  const historicalRisk =
    calculateHistoricalRisk({
      returns,
      confidenceLevel
    });

  const portfolioValue =
    roundMoney(
      allocation
        ?.portfolio
        ?.totalValue
    );

  const valueAtRiskAmount =
    historicalRisk
      .valueAtRiskDecimal ===
      null
      ? null
      : roundMoney(
          portfolioValue *
          historicalRisk
            .valueAtRiskDecimal
        );

  const conditionalValueAtRiskAmount =
    historicalRisk
      .conditionalValueAtRiskDecimal ===
      null
      ? null
      : roundMoney(
          portfolioValue *
          historicalRisk
            .conditionalValueAtRiskDecimal
        );

  const benchmarkReturns =
    extractBenchmarkReturns(
      configuration
    );

  const beta =
    calculateBeta({
      portfolioReturns:
        returns,

      benchmarkReturns
    });

  const warningThreshold =
    number(
      limits
        ?.alertWarningThresholdPercentage ||
      80
    );

  const criticalThreshold =
    number(
      limits
        ?.alertCriticalThresholdPercentage ||
      100
    );

  const annualizedVolatilityPercentage =
    annualizedVolatilityDecimal ===
      null
      ? null
      : roundPercent(
          annualizedVolatilityDecimal *
          100
        );

  const volatilityLimit =
    assessMaximumLimit({
      currentValue:
        annualizedVolatilityPercentage,

      limitValue:
        limits
          ?.targetVolatilityPercentage,

      warningThreshold,

      criticalThreshold
    });

  const drawdownLimit =
    assessMaximumLimit({
      currentValue:
        drawdown
          .maximumDrawdownPercentage,

      limitValue:
        limits
          ?.maximumDrawdownPercentage,

      warningThreshold,

      criticalThreshold
    });

  const alerts =
    buildMetricAlerts({
      volatilityLimit,
      drawdownLimit,
      historyQuality
    });

  const score =
    calculateRiskMetricScore({
      volatilityLimit,
      drawdownLimit,

      sharpeRatio:
        roundMetric(
          sharpeRatio,
          6
        ),

      historyQuality
    });

  const grade =
    getRiskMetricGrade(
      score,
      historyQuality
    );

  const breached =
    alerts.filter(
      (item) =>
        item?.status ===
        "BREACHED"
    ).length;

  const warnings =
    alerts.filter(
      (item) =>
        item?.status ===
        "WARNING"
    ).length;

  let status;

  if (
    historyQuality.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    status =
      "INSUFFICIENT_HISTORY";
  } else if (
    breached > 0
  ) {
    status =
      "LIMIT_BREACH";
  } else if (
    warnings > 0
  ) {
    status =
      "WARNING";
  } else if (
    historyQuality.status ===
    "PRELIMINARY"
  ) {
    status =
      "PRELIMINARY";
  } else {
    status =
      "WITHIN_LIMITS";
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    message:
      historyQuality.message,

    configuration,

    portfolio: {
      totalValue:
        portfolioValue,

      holdingsValue:
        roundMoney(
          allocation
            ?.portfolio
            ?.holdingsValue
        ),

      availableCash:
        roundMoney(
          allocation
            ?.portfolio
            ?.availableCash
        ),

      holdingsCount:
        number(
          allocation
            ?.portfolio
            ?.holdingsCount
        )
    },

    history: {
      status:
        historyQuality.status,

      reliable:
        historyQuality.reliable,

      observations:
        returnSeries
          ?.valueSeries
          ?.observations ||
        0,

      returnObservations:
        returns.length,

      minimumPreliminaryReturns:
        MINIMUM_PRELIMINARY_RETURNS,

      minimumReliableReturns:
        MINIMUM_RELIABLE_RETURNS,

      firstDate:
        returnSeries
          ?.valueSeries
          ?.firstDate ||
        null,

      lastDate:
        returnSeries
          ?.valueSeries
          ?.lastDate ||
        null,

      annualizationFactor
    },

    returns: {
      averagePeriodicReturnDecimal:
        roundMetric(
          averagePeriodicReturn,
          10
        ),

      averagePeriodicReturnPercentage:
        averagePeriodicReturn ===
          null
          ? null
          : roundPercent(
              averagePeriodicReturn *
              100
            ),

      annualizedReturnDecimal:
        roundMetric(
          annualizedReturnDecimal,
          10
        ),

      annualizedReturnPercentage:
        annualizedReturnDecimal ===
          null
          ? null
          : roundPercent(
              annualizedReturnDecimal *
              100
            ),

      riskFreeRatePercentage:
        roundPercent(
          configuredRiskFreeRate
        ),

      minimumAcceptableReturnPercentage:
        roundPercent(
          minimumAcceptableReturnPercentage
        )
    },

    volatility: {
      periodicVolatilityDecimal:
        roundMetric(
          periodicVolatility,
          10
        ),

      periodicVolatilityPercentage:
        periodicVolatility ===
          null
          ? null
          : roundPercent(
              periodicVolatility *
              100
            ),

      annualizedVolatilityDecimal:
        roundMetric(
          annualizedVolatilityDecimal,
          10
        ),

      annualizedVolatilityPercentage,

      downsideDeviationDecimal:
        roundMetric(
          downsideDeviationDecimal,
          10
        ),

      downsideDeviationPercentage:
        downsideDeviationDecimal ===
          null
          ? null
          : roundPercent(
              downsideDeviationDecimal *
              100
            ),

      limit:
        volatilityLimit
    },

    ratios: {
      sharpeRatio:
        roundMetric(
          sharpeRatio,
          6
        ),

      sortinoRatio:
        roundMetric(
          sortinoRatio,
          6
        ),

      beta
    },

    drawdown: {
      ...drawdown,

      limit:
        drawdownLimit
    },

    valueAtRisk: {
      confidenceLevel:
        roundPercent(
          confidenceLevel *
          100
        ),

      method:
        "HISTORICAL",

      valueAtRiskDecimal:
        historicalRisk
          .valueAtRiskDecimal,

      valueAtRiskPercentage:
        historicalRisk
          .valueAtRiskDecimal ===
          null
          ? null
          : roundPercent(
              historicalRisk
                .valueAtRiskDecimal *
              100
            ),

      valueAtRiskAmount,

      conditionalValueAtRiskDecimal:
        historicalRisk
          .conditionalValueAtRiskDecimal,

      conditionalValueAtRiskPercentage:
        historicalRisk
          .conditionalValueAtRiskDecimal ===
          null
          ? null
          : roundPercent(
              historicalRisk
                .conditionalValueAtRiskDecimal *
              100
            ),

      conditionalValueAtRiskAmount,

      tailObservations:
        historicalRisk
          .tailObservations
    },

    assessment: {
      score,

      grade,

      breached,

      warnings,

      withinLimits:
        breached === 0 &&
        warnings === 0
    },

    alerts,

    returnSeries
  };
}

/*
 * ============================================================
 * COMPACT RISK SUMMARY
 * ============================================================
 */

export async function buildPortfolioRiskMetricsSummary() {
  const metrics =
    await buildPortfolioRiskMetrics();

  return {
    generatedAt:
      metrics.generatedAt,

    status:
      metrics.status,

    score:
      metrics
        ?.assessment
        ?.score ||
      0,

    grade:
      metrics
        ?.assessment
        ?.grade
        ?.label ||
      "Not available",

    observations:
      metrics
        ?.history
        ?.returnObservations ||
      0,

    annualizedReturnPercentage:
      metrics
        ?.returns
        ?.annualizedReturnPercentage ??
      null,

    annualizedVolatilityPercentage:
      metrics
        ?.volatility
        ?.annualizedVolatilityPercentage ??
      null,

    downsideDeviationPercentage:
      metrics
        ?.volatility
        ?.downsideDeviationPercentage ??
      null,

    maximumDrawdownPercentage:
      metrics
        ?.drawdown
        ?.maximumDrawdownPercentage ??
      null,

    sharpeRatio:
      metrics
        ?.ratios
        ?.sharpeRatio ??
      null,

    sortinoRatio:
      metrics
        ?.ratios
        ?.sortinoRatio ??
      null,

    beta:
      metrics
        ?.ratios
        ?.beta
        ?.beta ??
      null,

    valueAtRiskPercentage:
      metrics
        ?.valueAtRisk
        ?.valueAtRiskPercentage ??
      null,

    conditionalValueAtRiskPercentage:
      metrics
        ?.valueAtRisk
        ?.conditionalValueAtRiskPercentage ??
      null,

    alertCount:
      Array.isArray(
        metrics?.alerts
      )
        ? metrics.alerts.length
        : 0
  };
}

/*
 * ============================================================
 * RISK ALERT FILTERS
 * ============================================================
 */

export async function loadPortfolioRiskMetricAlerts() {
  const metrics =
    await buildPortfolioRiskMetrics();

  return metrics.alerts;
}

export async function loadPortfolioRiskMetricBreaches() {
  const metrics =
    await buildPortfolioRiskMetrics();

  return metrics.alerts.filter(
    (item) =>
      item?.status ===
      "BREACHED"
  );
}

export async function loadPortfolioRiskMetricWarnings() {
  const metrics =
    await buildPortfolioRiskMetrics();

  return metrics.alerts.filter(
    (item) =>
      item?.status ===
      "WARNING"
  );
}