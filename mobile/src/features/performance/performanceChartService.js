import {
  buildPortfolioDailyReturnSeries,
  buildPortfolioPerformanceValueSeries
} from "./portfolioPerformanceService";

import {
  buildPortfolioBenchmarkComparison,
  DEFAULT_BENCHMARK_CODE
} from "./benchmarkComparisonService";

const DEFAULT_ROLLING_WINDOWS = [
  5,
  20,
  60
];

const DEFAULT_ANNUALIZATION_FACTOR =
  252;

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
    number(value).toFixed(2)
  );
}

function roundPercent(value) {
  return Number(
    number(value).toFixed(4)
  );
}

function roundMetric(
  value,
  decimals = 8
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

function average(
  values = []
) {
  const safeValues =
    values
      .map(Number)
      .filter(
        Number.isFinite
      );

  if (
    !safeValues.length
  ) {
    return null;
  }

  return (
    safeValues.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
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

  if (
    mean === null
  ) {
    return null;
  }

  const variance =
    safeValues.reduce(
      (
        total,
        value
      ) =>
        total +
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

function normalizeDateKey(value) {
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

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}

function normalizeWindow(value) {
  const parsed =
    Math.floor(
      number(value)
    );

  return parsed > 0
    ? parsed
    : 1;
}

function normalizeWindows(
  windows = DEFAULT_ROLLING_WINDOWS
) {
  return Array.from(
    new Set(
      (
        Array.isArray(
          windows
        )
          ? windows
          : DEFAULT_ROLLING_WINDOWS
      )
        .map(
          normalizeWindow
        )
        .filter(
          (value) =>
            value > 0
        )
    )
  ).sort(
    (
      first,
      second
    ) =>
      first -
      second
  );
}

function compoundReturns(
  returns = []
) {
  const safeReturns =
    returns
      .map(Number)
      .filter(
        Number.isFinite
      );

  if (
    !safeReturns.length
  ) {
    return null;
  }

  return (
    safeReturns.reduce(
      (
        growth,
        value
      ) =>
        growth *
        (
          1 +
          value
        ),
      1
    ) -
    1
  );
}

/*
 * ============================================================
 * CHART POINT HELPERS
 * ============================================================
 */

function buildChartPoint({
  date,
  value,
  percentage = null,
  label = null,
  metadata = {}
}) {
  return {
    date:
      normalizeDateKey(
        date
      ),

    value:
      nullableNumber(
        value
      ),

    percentage:
      nullableNumber(
        percentage
      ),

    label,

    metadata:
      metadata &&
      typeof metadata ===
        "object"
        ? metadata
        : {}
  };
}

function buildEmptySeries(
  code,
  label
) {
  return {
    code,

    label,

    status:
      "NOT_AVAILABLE",

    observations:
      0,

    firstDate:
      null,

    lastDate:
      null,

    minimumValue:
      null,

    maximumValue:
      null,

    endingValue:
      null,

    points:
      []
  };
}

function summarizeSeries({
  code,
  label,
  points
}) {
  const safePoints =
    (
      Array.isArray(
        points
      )
        ? points
        : []
    ).filter(
      (point) =>
        point?.date &&
        point?.value !==
          null &&
        point?.value !==
          undefined
    );

  if (
    !safePoints.length
  ) {
    return buildEmptySeries(
      code,
      label
    );
  }

  const values =
    safePoints.map(
      (point) =>
        number(
          point.value
        )
    );

  return {
    code,

    label,

    status:
      "AVAILABLE",

    observations:
      safePoints.length,

    firstDate:
      safePoints[0]
        ?.date ||
      null,

    lastDate:
      safePoints[
        safePoints.length -
        1
      ]?.date ||
      null,

    minimumValue:
      roundMetric(
        Math.min(
          ...values
        ),
        8
      ),

    maximumValue:
      roundMetric(
        Math.max(
          ...values
        ),
        8
      ),

    endingValue:
      roundMetric(
        values[
          values.length -
          1
        ],
        8
      ),

    points:
      safePoints
  };
}

/*
 * ============================================================
 * PORTFOLIO VALUE CHART
 * ============================================================
 */

export async function buildPortfolioValueChartSeries() {
  const result =
    await buildPortfolioPerformanceValueSeries();

  const sourceSeries =
    Array.isArray(
      result?.series
    )
      ? result.series
      : [];

  const points =
    sourceSeries.map(
      (item) =>
        buildChartPoint({
          date:
            item.date,

          value:
            roundMoney(
              item.portfolioValue
            ),

          label:
            "Portfolio Value",

          metadata: {
            source:
              item.source,

            eventId:
              item.eventId,

            eventType:
              item.eventType
          }
        })
    );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    ...summarizeSeries({
      code:
        "PORTFOLIO_VALUE",

      label:
        "Portfolio Value",

      points
    }),

    source:
      result
  };
}

/*
 * ============================================================
 * CUMULATIVE PORTFOLIO GROWTH
 * ============================================================
 *
 * Growth starts at 100.
 */

export async function buildPortfolioGrowthSeries() {
  const result =
    await buildPortfolioDailyReturnSeries();

  const returns =
    Array.isArray(
      result?.returns
    )
      ? result.returns
      : [];

  let growthIndex =
    100;

  const points = [];

  returns.forEach(
    (
      item,
      index
    ) => {
      if (
        index === 0
      ) {
        points.push(
          buildChartPoint({
            date:
              item.date,

            value:
              100,

            percentage:
              0,

            label:
              "Portfolio Growth",

            metadata: {
              returnDecimal:
                null,

              returnPercentage:
                null
            }
          })
        );

        return;
      }

      const returnDecimal =
        nullableNumber(
          item
            ?.returnDecimal
        );

      if (
        returnDecimal ===
        null
      ) {
        return;
      }

      growthIndex *=
        (
          1 +
          returnDecimal
        );

      points.push(
        buildChartPoint({
          date:
            item.date,

          value:
            roundMetric(
              growthIndex,
              8
            ),

          percentage:
            roundPercent(
              growthIndex -
              100
            ),

          label:
            "Portfolio Growth",

          metadata: {
            returnDecimal:
              roundMetric(
                returnDecimal,
                10
              ),

            returnPercentage:
              roundPercent(
                returnDecimal *
                100
              ),

            portfolioValue:
              item
                ?.portfolioValue,

            externalCashFlow:
              item
                ?.externalCashFlow
          }
        })
      );
    }
  );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    baseValue:
      100,

    ...summarizeSeries({
      code:
        "PORTFOLIO_GROWTH",

      label:
        "Portfolio Growth",

      points
    }),

    source:
      result
  };
}

/*
 * ============================================================
 * BENCHMARK AND ACTIVE GROWTH
 * ============================================================
 */

export async function buildPortfolioBenchmarkGrowthSeries({
  benchmarkCode =
    DEFAULT_BENCHMARK_CODE,

  benchmarkSeries =
    null
} = {}) {
  const comparison =
    await buildPortfolioBenchmarkComparison({
      benchmarkCode,
      benchmarkSeries
    });

  const matched =
    Array.isArray(
      comparison
        ?.matchedReturns
    )
      ? comparison.matchedReturns
      : [];

  if (
    !matched.length
  ) {
    return {
      generatedAt:
        new Date()
          .toISOString(),

      status:
        comparison?.status ||
        "BENCHMARK_NOT_AVAILABLE",

      message:
        comparison?.message ||
        "No matched benchmark observations are available.",

      benchmark:
        comparison?.benchmark ||
        null,

      portfolioGrowth:
        buildEmptySeries(
          "PORTFOLIO_GROWTH",

          "Portfolio Growth"
        ),

      benchmarkGrowth:
        buildEmptySeries(
          "BENCHMARK_GROWTH",

          comparison
            ?.benchmark
            ?.label ||
          "Benchmark Growth"
        ),

      activeGrowth:
        buildEmptySeries(
          "ACTIVE_GROWTH",

          "Active Growth"
        ),

      matchedReturns:
        [],

      source:
        comparison
    };
  }

  let portfolioIndex =
    100;

  let benchmarkIndex =
    100;

  const portfolioPoints = [];
  const benchmarkPoints = [];
  const activePoints = [];

  const firstDate =
    matched[0]
      ?.date ||
    null;

  portfolioPoints.push(
    buildChartPoint({
      date:
        firstDate,

      value:
        100,

      percentage:
        0,

      label:
        "Portfolio Growth"
    })
  );

  benchmarkPoints.push(
    buildChartPoint({
      date:
        firstDate,

      value:
        100,

      percentage:
        0,

      label:
        comparison
          ?.benchmark
          ?.label ||
        "Benchmark Growth"
    })
  );

  activePoints.push(
    buildChartPoint({
      date:
        firstDate,

      value:
        100,

      percentage:
        0,

      label:
        "Active Growth"
    })
  );

  matched.forEach(
    (item) => {
      const portfolioReturn =
        number(
          item
            ?.portfolioReturnDecimal
        );

      const benchmarkReturn =
        number(
          item
            ?.benchmarkReturnDecimal
        );

      portfolioIndex *=
        (
          1 +
          portfolioReturn
        );

      benchmarkIndex *=
        (
          1 +
          benchmarkReturn
        );

      const activeIndex =
        benchmarkIndex !==
          0
          ? (
              portfolioIndex /
              benchmarkIndex
            ) *
            100
          : 100;

      portfolioPoints.push(
        buildChartPoint({
          date:
            item.date,

          value:
            roundMetric(
              portfolioIndex,
              8
            ),

          percentage:
            roundPercent(
              portfolioIndex -
              100
            ),

          label:
            "Portfolio Growth",

          metadata: {
            returnPercentage:
              item
                .portfolioReturnPercentage
          }
        })
      );

      benchmarkPoints.push(
        buildChartPoint({
          date:
            item.date,

          value:
            roundMetric(
              benchmarkIndex,
              8
            ),

          percentage:
            roundPercent(
              benchmarkIndex -
              100
            ),

          label:
            comparison
              ?.benchmark
              ?.label ||
            "Benchmark Growth",

          metadata: {
            returnPercentage:
              item
                .benchmarkReturnPercentage
          }
        })
      );

      activePoints.push(
        buildChartPoint({
          date:
            item.date,

          value:
            roundMetric(
              activeIndex,
              8
            ),

          percentage:
            roundPercent(
              activeIndex -
              100
            ),

          label:
            "Active Growth",

          metadata: {
            activeReturnPercentage:
              item
                .activeReturnPercentage
          }
        })
      );
    }
  );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      comparison.status,

    message:
      comparison.message,

    benchmark:
      comparison.benchmark,

    baseValue:
      100,

    portfolioGrowth:
      summarizeSeries({
        code:
          "PORTFOLIO_GROWTH",

        label:
          "Portfolio Growth",

        points:
          portfolioPoints
      }),

    benchmarkGrowth:
      summarizeSeries({
        code:
          "BENCHMARK_GROWTH",

        label:
          comparison
            ?.benchmark
            ?.label ||
          "Benchmark Growth",

        points:
          benchmarkPoints
      }),

    activeGrowth:
      summarizeSeries({
        code:
          "ACTIVE_GROWTH",

        label:
          "Active Growth",

        points:
          activePoints
      }),

    matchedReturns:
      matched,

    source:
      comparison
  };
}

/*
 * ============================================================
 * ROLLING RETURN SERIES
 * ============================================================
 */

function calculateRollingReturnPoints({
  returns,
  window
}) {
  const safeWindow =
    normalizeWindow(
      window
    );

  const clean =
    (
      Array.isArray(
        returns
      )
        ? returns
        : []
    ).filter(
      (item) =>
        item?.date &&
        item
          ?.returnDecimal !==
        null &&
        item
          ?.returnDecimal !==
        undefined
    );

  const points = [];

  for (
    let index =
      safeWindow -
      1;
    index <
      clean.length;
    index +=
      1
  ) {
    const windowItems =
      clean.slice(
        index -
          safeWindow +
          1,
        index +
          1
      );

    const compounded =
      compoundReturns(
        windowItems.map(
          (item) =>
            item.returnDecimal
        )
      );

    if (
      compounded ===
      null
    ) {
      continue;
    }

    points.push(
      buildChartPoint({
        date:
          clean[index]
            ?.date,

        value:
          roundPercent(
            compounded *
            100
          ),

        percentage:
          roundPercent(
            compounded *
            100
          ),

        label:
          `${safeWindow}-Period Rolling Return`,

        metadata: {
          window:
            safeWindow,

          startDate:
            windowItems[0]
              ?.date,

          endDate:
            windowItems[
              windowItems.length -
              1
            ]?.date
        }
      })
    );
  }

  return summarizeSeries({
    code:
      `ROLLING_RETURN_${safeWindow}`,

    label:
      `${safeWindow}-Period Rolling Return`,

    points
  });
}

export async function buildPortfolioRollingReturnSeries({
  windows =
    DEFAULT_ROLLING_WINDOWS
} = {}) {
  const result =
    await buildPortfolioDailyReturnSeries();

  const returns =
    Array.isArray(
      result?.returns
    )
      ? result.returns
      : [];

  const normalizedWindows =
    normalizeWindows(
      windows
    );

  const series = {};

  normalizedWindows.forEach(
    (window) => {
      series[
        String(window)
      ] =
        calculateRollingReturnPoints({
          returns,
          window
        });
    }
  );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      returns.length >
      1
        ? "AVAILABLE"
        : "INSUFFICIENT_HISTORY",

    windows:
      normalizedWindows,

    series,

    source:
      result
  };
}

/*
 * ============================================================
 * ROLLING VOLATILITY SERIES
 * ============================================================
 */

function calculateRollingVolatilityPoints({
  returns,
  window,
  annualizationFactor
}) {
  const safeWindow =
    normalizeWindow(
      window
    );

  const clean =
    (
      Array.isArray(
        returns
      )
        ? returns
        : []
    ).filter(
      (item) =>
        item?.date &&
        item
          ?.returnDecimal !==
        null &&
        item
          ?.returnDecimal !==
        undefined
    );

  const points = [];

  for (
    let index =
      safeWindow -
      1;
    index <
      clean.length;
    index +=
      1
  ) {
    const windowItems =
      clean.slice(
        index -
          safeWindow +
          1,
        index +
          1
      );

    const deviation =
      sampleStandardDeviation(
        windowItems.map(
          (item) =>
            item.returnDecimal
        )
      );

    if (
      deviation ===
      null
    ) {
      continue;
    }

    const annualized =
      deviation *
      Math.sqrt(
        annualizationFactor
      );

    points.push(
      buildChartPoint({
        date:
          clean[index]
            ?.date,

        value:
          roundPercent(
            annualized *
            100
          ),

        percentage:
          roundPercent(
            annualized *
            100
          ),

        label:
          `${safeWindow}-Period Rolling Volatility`,

        metadata: {
          window:
            safeWindow,

          periodicVolatilityPercentage:
            roundPercent(
              deviation *
              100
            ),

          annualizationFactor,

          startDate:
            windowItems[0]
              ?.date,

          endDate:
            windowItems[
              windowItems.length -
              1
            ]?.date
        }
      })
    );
  }

  return summarizeSeries({
    code:
      `ROLLING_VOLATILITY_${safeWindow}`,

    label:
      `${safeWindow}-Period Rolling Volatility`,

    points
  });
}

export async function buildPortfolioRollingVolatilitySeries({
  windows =
    DEFAULT_ROLLING_WINDOWS,

  annualizationFactor =
    DEFAULT_ANNUALIZATION_FACTOR
} = {}) {
  const result =
    await buildPortfolioDailyReturnSeries();

  const returns =
    Array.isArray(
      result?.returns
    )
      ? result.returns
      : [];

  const normalizedWindows =
    normalizeWindows(
      windows
    );

  const series = {};

  normalizedWindows.forEach(
    (window) => {
      series[
        String(window)
      ] =
        calculateRollingVolatilityPoints({
          returns,
          window,
          annualizationFactor
        });
    }
  );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      returns.length >
      2
        ? "AVAILABLE"
        : "INSUFFICIENT_HISTORY",

    annualizationFactor,

    windows:
      normalizedWindows,

    series,

    source:
      result
  };
}

/*
 * ============================================================
 * ROLLING TRACKING ERROR
 * ============================================================
 */

function calculateRollingTrackingErrorPoints({
  matchedReturns,
  window,
  annualizationFactor
}) {
  const safeWindow =
    normalizeWindow(
      window
    );

  const clean =
    (
      Array.isArray(
        matchedReturns
      )
        ? matchedReturns
        : []
    ).filter(
      (item) =>
        item?.date &&
        item
          ?.activeReturnDecimal !==
        null &&
        item
          ?.activeReturnDecimal !==
        undefined
    );

  const points = [];

  for (
    let index =
      safeWindow -
      1;
    index <
      clean.length;
    index +=
      1
  ) {
    const windowItems =
      clean.slice(
        index -
          safeWindow +
          1,
        index +
          1
      );

    const deviation =
      sampleStandardDeviation(
        windowItems.map(
          (item) =>
            item.activeReturnDecimal
        )
      );

    if (
      deviation ===
      null
    ) {
      continue;
    }

    const annualized =
      deviation *
      Math.sqrt(
        annualizationFactor
      );

    points.push(
      buildChartPoint({
        date:
          clean[index]
            ?.date,

        value:
          roundPercent(
            annualized *
            100
          ),

        percentage:
          roundPercent(
            annualized *
            100
          ),

        label:
          `${safeWindow}-Period Rolling Tracking Error`,

        metadata: {
          window:
            safeWindow,

          annualizationFactor,

          startDate:
            windowItems[0]
              ?.date,

          endDate:
            windowItems[
              windowItems.length -
              1
            ]?.date
        }
      })
    );
  }

  return summarizeSeries({
    code:
      `ROLLING_TRACKING_ERROR_${safeWindow}`,

    label:
      `${safeWindow}-Period Rolling Tracking Error`,

    points
  });
}

export async function buildRollingTrackingErrorSeries({
  benchmarkCode =
    DEFAULT_BENCHMARK_CODE,

  benchmarkSeries =
    null,

  windows =
    DEFAULT_ROLLING_WINDOWS,

  annualizationFactor =
    DEFAULT_ANNUALIZATION_FACTOR
} = {}) {
  const comparison =
    await buildPortfolioBenchmarkComparison({
      benchmarkCode,
      benchmarkSeries,
      annualizationFactor
    });

  const matchedReturns =
    Array.isArray(
      comparison
        ?.matchedReturns
    )
      ? comparison.matchedReturns
      : [];

  const normalizedWindows =
    normalizeWindows(
      windows
    );

  const series = {};

  normalizedWindows.forEach(
    (window) => {
      series[
        String(window)
      ] =
        calculateRollingTrackingErrorPoints({
          matchedReturns,
          window,
          annualizationFactor
        });
    }
  );

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      comparison.status,

    benchmark:
      comparison.benchmark,

    annualizationFactor,

    windows:
      normalizedWindows,

    series,

    source:
      comparison
  };
}

/*
 * ============================================================
 * DRAWDOWN AND UNDERWATER SERIES
 * ============================================================
 */

export async function buildPortfolioDrawdownSeries() {
  const growthResult =
    await buildPortfolioGrowthSeries();

  const growthPoints =
    Array.isArray(
      growthResult?.points
    )
      ? growthResult.points
      : [];

  if (
    !growthPoints.length
  ) {
    return {
      generatedAt:
        new Date()
          .toISOString(),

      status:
        "INSUFFICIENT_HISTORY",

      maximumDrawdownPercentage:
        null,

      maximumDrawdownAmount:
        null,

      peakDate:
        null,

      troughDate:
        null,

      recoveryDate:
        null,

      currentDrawdownPercentage:
        null,

      series:
        buildEmptySeries(
          "PORTFOLIO_DRAWDOWN",

          "Portfolio Drawdown"
        ),

      source:
        growthResult
    };
  }

  let runningPeak =
    number(
      growthPoints[0]
        ?.value
    );

  let runningPeakDate =
    growthPoints[0]
      ?.date ||
    null;

  let maximumDrawdown =
    0;

  let maximumPeakDate =
    runningPeakDate;

  let maximumTroughDate =
    runningPeakDate;

  let maximumPeakValue =
    runningPeak;

  let maximumTroughValue =
    runningPeak;

  let recoveryDate =
    null;

  let waitingForRecovery =
    false;

  const points =
    growthPoints.map(
      (point) => {
        const value =
          number(
            point.value
          );

        if (
          value >
          runningPeak
        ) {
          runningPeak =
            value;

          runningPeakDate =
            point.date;

          if (
            waitingForRecovery
          ) {
            recoveryDate =
              point.date;

            waitingForRecovery =
              false;
          }
        }

        const drawdownDecimal =
          runningPeak > 0
            ? (
                value -
                runningPeak
              ) /
              runningPeak
            : 0;

        if (
          drawdownDecimal <
          maximumDrawdown
        ) {
          maximumDrawdown =
            drawdownDecimal;

          maximumPeakDate =
            runningPeakDate;

          maximumTroughDate =
            point.date;

          maximumPeakValue =
            runningPeak;

          maximumTroughValue =
            value;

          recoveryDate =
            null;

          waitingForRecovery =
            true;
        }

        return buildChartPoint({
          date:
            point.date,

          value:
            roundPercent(
              drawdownDecimal *
              100
            ),

          percentage:
            roundPercent(
              drawdownDecimal *
              100
            ),

          label:
            "Portfolio Drawdown",

          metadata: {
            growthValue:
              point.value,

            runningPeak:
              roundMetric(
                runningPeak,
                8
              ),

            runningPeakDate
          }
        });
      }
    );

  const currentDrawdown =
    points[
      points.length -
      1
    ]?.value ??
    null;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      points.length >
      1
        ? "AVAILABLE"
        : "INSUFFICIENT_HISTORY",

    maximumDrawdownDecimal:
      roundMetric(
        maximumDrawdown,
        10
      ),

    maximumDrawdownPercentage:
      roundPercent(
        maximumDrawdown *
        100
      ),

    maximumDrawdownAmount:
      roundMetric(
        maximumPeakValue -
        maximumTroughValue,
        8
      ),

    peakDate:
      maximumPeakDate,

    troughDate:
      maximumTroughDate,

    recoveryDate,

    currentDrawdownPercentage:
      currentDrawdown,

    series:
      summarizeSeries({
        code:
          "PORTFOLIO_DRAWDOWN",

        label:
          "Portfolio Drawdown",

        points
      }),

    source:
      growthResult
  };
}

/*
 * ============================================================
 * PERFORMANCE CHART PACKAGE
 * ============================================================
 */

export async function buildPortfolioPerformanceCharts({
  benchmarkCode =
    DEFAULT_BENCHMARK_CODE,

  benchmarkSeries =
    null,

  rollingWindows =
    DEFAULT_ROLLING_WINDOWS,

  annualizationFactor =
    DEFAULT_ANNUALIZATION_FACTOR
} = {}) {
  const [
    valueChart,
    growthChart,
    benchmarkGrowth,
    rollingReturns,
    rollingVolatility,
    trackingError,
    drawdown
  ] = await Promise.all([
    buildPortfolioValueChartSeries(),

    buildPortfolioGrowthSeries(),

    buildPortfolioBenchmarkGrowthSeries({
      benchmarkCode,
      benchmarkSeries
    }),

    buildPortfolioRollingReturnSeries({
      windows:
        rollingWindows
    }),

    buildPortfolioRollingVolatilitySeries({
      windows:
        rollingWindows,

      annualizationFactor
    }),

    buildRollingTrackingErrorSeries({
      benchmarkCode,
      benchmarkSeries,

      windows:
        rollingWindows,

      annualizationFactor
    }),

    buildPortfolioDrawdownSeries()
  ]);

  const valuationObservations =
    number(
      valueChart
        ?.observations
    );

  const growthObservations =
    number(
      growthChart
        ?.observations
    );

  let status;

  if (
    valuationObservations <
    2 ||
    growthObservations <
    2
  ) {
    status =
      "INSUFFICIENT_HISTORY";
  } else if (
    benchmarkGrowth
      ?.status ===
    "BENCHMARK_NOT_AVAILABLE"
  ) {
    status =
      "PORTFOLIO_CHARTS_AVAILABLE";
  } else {
    status =
      "COMPLETE";
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    message:
      status ===
      "COMPLETE"
        ? "Portfolio, benchmark, rolling-return, volatility, tracking-error, and drawdown chart series are available."
        : status ===
          "PORTFOLIO_CHARTS_AVAILABLE"
        ? "Portfolio chart series are available. Genuine benchmark history is required for benchmark growth and tracking-error charts."
        : "Additional genuine portfolio valuation history is required before performance charts can be generated.",

    configuration: {
      benchmarkCode,

      rollingWindows:
        normalizeWindows(
          rollingWindows
        ),

      annualizationFactor
    },

    summary: {
      valuationObservations,

      growthObservations,

      benchmarkMatchedObservations:
        number(
          benchmarkGrowth
            ?.matchedReturns
            ?.length
        ),

      maximumDrawdownPercentage:
        drawdown
          ?.maximumDrawdownPercentage ??
        null,

      currentDrawdownPercentage:
        drawdown
          ?.currentDrawdownPercentage ??
        null,

      portfolioGrowthEndingValue:
        growthChart
          ?.endingValue ??
        null,

      benchmarkGrowthEndingValue:
        benchmarkGrowth
          ?.benchmarkGrowth
          ?.endingValue ??
        null,

      activeGrowthEndingValue:
        benchmarkGrowth
          ?.activeGrowth
          ?.endingValue ??
        null
    },

    valueChart,

    growthChart,

    benchmarkGrowth,

    rollingReturns,

    rollingVolatility,

    rollingTrackingError:
      trackingError,

    drawdown
  };
}

/*
 * ============================================================
 * COMPACT SUMMARY
 * ============================================================
 */

export async function buildPortfolioPerformanceChartSummary(
  options = {}
) {
  const charts =
    await buildPortfolioPerformanceCharts(
      options
    );

  return {
    generatedAt:
      charts.generatedAt,

    status:
      charts.status,

    valuationObservations:
      charts
        ?.summary
        ?.valuationObservations ||
      0,

    growthObservations:
      charts
        ?.summary
        ?.growthObservations ||
      0,

    benchmarkMatchedObservations:
      charts
        ?.summary
        ?.benchmarkMatchedObservations ||
      0,

    portfolioGrowthEndingValue:
      charts
        ?.summary
        ?.portfolioGrowthEndingValue ??
      null,

    benchmarkGrowthEndingValue:
      charts
        ?.summary
        ?.benchmarkGrowthEndingValue ??
      null,

    activeGrowthEndingValue:
      charts
        ?.summary
        ?.activeGrowthEndingValue ??
      null,

    maximumDrawdownPercentage:
      charts
        ?.summary
        ?.maximumDrawdownPercentage ??
      null,

    currentDrawdownPercentage:
      charts
        ?.summary
        ?.currentDrawdownPercentage ??
      null,

    message:
      charts.message
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export async function loadPortfolioGrowthChart() {
  return buildPortfolioGrowthSeries();
}

export async function loadPortfolioBenchmarkGrowthChart(
  options = {}
) {
  return buildPortfolioBenchmarkGrowthSeries(
    options
  );
}

export async function loadPortfolioRollingReturnCharts(
  options = {}
) {
  return buildPortfolioRollingReturnSeries(
    options
  );
}

export async function loadPortfolioRollingVolatilityCharts(
  options = {}
) {
  return buildPortfolioRollingVolatilitySeries(
    options
  );
}

export async function loadPortfolioDrawdownChart() {
  return buildPortfolioDrawdownSeries();
}

export async function loadPortfolioValueChart() {
  return buildPortfolioValueChartSeries();
}