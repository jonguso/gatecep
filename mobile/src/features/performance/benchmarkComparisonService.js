import {
  buildPortfolioDailyReturnSeries
} from "./portfolioPerformanceService";

import {
  getOrCreateRiskConfiguration
} from "../risk/riskStore";

export const BENCHMARK_CODES = {
  NSE_ALL_SHARE:
    "NSE_ALL_SHARE",

  NSE_20_SHARE:
    "NSE_20_SHARE",

  NSE_25_SHARE:
    "NSE_25_SHARE",

  CUSTOM:
    "CUSTOM"
};

export const DEFAULT_BENCHMARK_CODE =
  BENCHMARK_CODES.NSE_ALL_SHARE;

const MINIMUM_COMPARISON_OBSERVATIONS =
  2;

const MINIMUM_PRELIMINARY_OBSERVATIONS =
  5;

const MINIMUM_RELIABLE_OBSERVATIONS =
  20;

const DEFAULT_TRADING_DAYS =
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
        sum,
        value
      ) =>
        sum +
        value,
      0
    ) /
    safeValues.length
  );
}

function sampleVariance(
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

  return (
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
    )
  );
}

function sampleStandardDeviation(
  values = []
) {
  const variance =
    sampleVariance(
      values
    );

  if (
    variance === null
  ) {
    return null;
  }

  return Math.sqrt(
    variance
  );
}

function covariance(
  firstValues = [],
  secondValues = []
) {
  const count =
    Math.min(
      firstValues.length,
      secondValues.length
    );

  if (
    count <
    2
  ) {
    return null;
  }

  const pairs = [];

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const first =
      nullableNumber(
        firstValues[
          index
        ]
      );

    const second =
      nullableNumber(
        secondValues[
          index
        ]
      );

    if (
      first !== null &&
      second !== null
    ) {
      pairs.push({
        first,
        second
      });
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
          pair.first
      )
    );

  const secondMean =
    average(
      pairs.map(
        (pair) =>
          pair.second
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
          pair.first -
          firstMean
        ) *
        (
          pair.second -
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

function normalizeDateKey(
  value
) {
  if (
    !value
  ) {
    return null;
  }

  const date =
    new Date(
      value
    );

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

function normalizeBenchmarkCode(
  value
) {
  return String(
    value ||
    DEFAULT_BENCHMARK_CODE
  )
    .trim()
    .toUpperCase();
}

function benchmarkLabel(
  code
) {
  switch (
    normalizeBenchmarkCode(
      code
    )
  ) {
    case BENCHMARK_CODES
      .NSE_20_SHARE:
      return "NSE 20 Share Index";

    case BENCHMARK_CODES
      .NSE_25_SHARE:
      return "NSE 25 Share Index";

    case BENCHMARK_CODES
      .CUSTOM:
      return "Custom Benchmark";

    case BENCHMARK_CODES
      .NSE_ALL_SHARE:
    default:
      return "NSE All Share Index";
  }
}

/*
 * ============================================================
 * BENCHMARK CONFIGURATION EXTRACTION
 * ============================================================
 *
 * Benchmark history may be stored in:
 *
 * configuration.metadata.benchmarkSeries
 * configuration.metadata.benchmarkReturnSeries
 * configuration.metadata.benchmarks[benchmarkCode]
 *
 * Supported item shapes:
 *
 * {
 *   date: "2026-08-01",
 *   returnDecimal: 0.012
 * }
 *
 * {
 *   date: "2026-08-01",
 *   returnPercentage: 1.2
 * }
 *
 * {
 *   date: "2026-08-01",
 *   close: 284.51
 * }
 *
 * {
 *   date: "2026-08-01",
 *   value: 284.51
 * }
 */

function extractConfiguredBenchmarkSeries({
  configuration,
  benchmarkCode
}) {
  const metadata =
    configuration
      ?.metadata &&
    typeof configuration
      .metadata ===
      "object"
      ? configuration.metadata
      : {};

  const normalizedCode =
    normalizeBenchmarkCode(
      benchmarkCode
    );

  const benchmarkMap =
    metadata
      ?.benchmarks &&
    typeof metadata
      .benchmarks ===
      "object"
      ? metadata.benchmarks
      : {};

  const candidates = [
    benchmarkMap[
      normalizedCode
    ],

    metadata
      ?.benchmarkSeries,

    metadata
      ?.benchmarkReturnSeries,

    configuration
      ?.benchmarkSeries,

    configuration
      ?.benchmarkReturnSeries
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
      return candidate;
    }
  }

  return [];
}

/*
 * ============================================================
 * BENCHMARK SERIES NORMALIZATION
 * ============================================================
 */

function normalizeBenchmarkSeries({
  rawSeries,
  benchmarkCode
}) {
  const normalized =
    (
      Array.isArray(
        rawSeries
      )
        ? rawSeries
        : []
    )
      .map(
        (
          item,
          index
        ) => {
          if (
            typeof item ===
            "number"
          ) {
            return {
              date:
                null,

              index,

              returnDecimal:
                item,

              returnPercentage:
                roundPercent(
                  item *
                  100
                ),

              close:
                null,

              source:
                "CONFIGURED_BENCHMARK_RETURN"
            };
          }

          const date =
            normalizeDateKey(
              item?.date ||
              item?.timestamp ||
              item?.recordedAt ||
              item?.createdAt
            );

          const returnDecimal =
            nullableNumber(
              item
                ?.returnDecimal
            );

          const returnPercentage =
            nullableNumber(
              item
                ?.returnPercentage
            );

          const close =
            nullableNumber(
              item?.close
            ) ??
            nullableNumber(
              item?.value
            ) ??
            nullableNumber(
              item?.indexValue
            ) ??
            nullableNumber(
              item?.price
            );

          return {
            date,

            index,

            returnDecimal:
              returnDecimal !==
                null
                ? returnDecimal
                : returnPercentage !==
                    null
                  ? returnPercentage /
                    100
                  : null,

            returnPercentage:
              returnDecimal !==
                null
                ? roundPercent(
                    returnDecimal *
                    100
                  )
                : returnPercentage !==
                    null
                  ? roundPercent(
                      returnPercentage
                    )
                  : null,

            close,

            source:
              item?.source ||
              "CONFIGURED_BENCHMARK"
          };
        }
      );

  /*
   * When closing index values are supplied, calculate
   * percentage returns from consecutive observations.
   */

  const sorted =
    normalized.sort(
      (
        first,
        second
      ) => {
        if (
          first.date &&
          second.date
        ) {
          return first.date.localeCompare(
            second.date
          );
        }

        return (
          first.index -
          second.index
        );
      }
    );

  const withReturns =
    sorted.map(
      (
        item,
        index
      ) => {
        if (
          item.returnDecimal !==
          null
        ) {
          return item;
        }

        if (
          item.close ===
            null ||
          index === 0
        ) {
          return {
            ...item,

            returnDecimal:
              null,

            returnPercentage:
              null
          };
        }

        const previousClose =
          nullableNumber(
            sorted[
              index -
              1
            ]?.close
          );

        if (
          previousClose ===
            null ||
          previousClose <=
            0
        ) {
          return {
            ...item,

            returnDecimal:
              null,

            returnPercentage:
              null
          };
        }

        const calculatedReturn =
          (
            item.close -
            previousClose
          ) /
          previousClose;

        return {
          ...item,

          returnDecimal:
            roundMetric(
              calculatedReturn,
              10
            ),

          returnPercentage:
            roundPercent(
              calculatedReturn *
              100
            )
        };
      }
    );

  return {
    benchmarkCode:
      normalizeBenchmarkCode(
        benchmarkCode
      ),

    benchmarkLabel:
      benchmarkLabel(
        benchmarkCode
      ),

    observations:
      withReturns.length,

    returnObservations:
      withReturns.filter(
        (item) =>
          item
            ?.returnDecimal !==
          null
      ).length,

    firstDate:
      withReturns.find(
        (item) =>
          item.date
      )?.date ||
      null,

    lastDate:
      [...withReturns]
        .reverse()
        .find(
          (item) =>
            item.date
        )?.date ||
      null,

    series:
      withReturns
  };
}

/*
 * ============================================================
 * LOAD BENCHMARK SERIES
 * ============================================================
 */

export async function loadBenchmarkSeries({
  benchmarkCode =
    DEFAULT_BENCHMARK_CODE,

  benchmarkSeries =
    null
} = {}) {
  const configuration =
    await getOrCreateRiskConfiguration();

  const rawSeries =
    Array.isArray(
      benchmarkSeries
    )
      ? benchmarkSeries
      : extractConfiguredBenchmarkSeries({
          configuration,
          benchmarkCode
        });

  const normalized =
    normalizeBenchmarkSeries({
      rawSeries,
      benchmarkCode
    });

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      normalized
        .returnObservations >
      0
        ? "AVAILABLE"
        : "BENCHMARK_NOT_AVAILABLE",

    message:
      normalized
        .returnObservations >
      0
        ? `${normalized.returnObservations} benchmark return observation(s) are available.`
        : `${normalized.benchmarkLabel} history is not configured.`,

    configuration,

    ...normalized
  };
}

/*
 * ============================================================
 * MATCH PORTFOLIO AND BENCHMARK RETURNS
 * ============================================================
 */

function matchReturnSeries({
  portfolioReturns,
  benchmarkReturns
}) {
  const portfolio =
    Array.isArray(
      portfolioReturns
    )
      ? portfolioReturns
      : [];

  const benchmark =
    Array.isArray(
      benchmarkReturns
    )
      ? benchmarkReturns
      : [];

  const benchmarkByDate =
    new Map();

  benchmark.forEach(
    (item) => {
      if (
        item?.date &&
        item?.returnDecimal !==
          null
      ) {
        benchmarkByDate.set(
          item.date,
          item
        );
      }
    }
  );

  const hasDatedBenchmark =
    benchmarkByDate.size >
    0;

  if (
    hasDatedBenchmark
  ) {
    return portfolio
      .map(
        (portfolioItem) => {
          const date =
            normalizeDateKey(
              portfolioItem?.date
            );

          const benchmarkItem =
            benchmarkByDate.get(
              date
            );

          if (
            !date ||
            !benchmarkItem ||
            portfolioItem
              ?.returnDecimal ===
              null
          ) {
            return null;
          }

          const portfolioReturn =
            nullableNumber(
              portfolioItem
                .returnDecimal
            );

          const benchmarkReturn =
            nullableNumber(
              benchmarkItem
                .returnDecimal
            );

          if (
            portfolioReturn ===
              null ||
            benchmarkReturn ===
              null
          ) {
            return null;
          }

          return {
            date,

            portfolioReturnDecimal:
              portfolioReturn,

            benchmarkReturnDecimal:
              benchmarkReturn,

            activeReturnDecimal:
              portfolioReturn -
              benchmarkReturn,

            portfolioReturnPercentage:
              roundPercent(
                portfolioReturn *
                100
              ),

            benchmarkReturnPercentage:
              roundPercent(
                benchmarkReturn *
                100
              ),

            activeReturnPercentage:
              roundPercent(
                (
                  portfolioReturn -
                  benchmarkReturn
                ) *
                  100
              )
          };
        }
      )
      .filter(Boolean);
  }

  /*
   * Undated configured benchmark returns are aligned from
   * the most recent observations backwards.
   */

  const cleanPortfolio =
    portfolio.filter(
      (item) =>
        item?.returnDecimal !==
        null
    );

  const cleanBenchmark =
    benchmark.filter(
      (item) =>
        item?.returnDecimal !==
        null
    );

  const count =
    Math.min(
      cleanPortfolio.length,
      cleanBenchmark.length
    );

  if (
    count <= 0
  ) {
    return [];
  }

  const portfolioSlice =
    cleanPortfolio.slice(
      -count
    );

  const benchmarkSlice =
    cleanBenchmark.slice(
      -count
    );

  return portfolioSlice.map(
    (
      portfolioItem,
      index
    ) => {
      const benchmarkItem =
        benchmarkSlice[
          index
        ];

      const portfolioReturn =
        number(
          portfolioItem
            .returnDecimal
        );

      const benchmarkReturn =
        number(
          benchmarkItem
            .returnDecimal
        );

      return {
        date:
          portfolioItem?.date ||
          benchmarkItem?.date ||
          null,

        portfolioReturnDecimal:
          portfolioReturn,

        benchmarkReturnDecimal:
          benchmarkReturn,

        activeReturnDecimal:
          portfolioReturn -
          benchmarkReturn,

        portfolioReturnPercentage:
          roundPercent(
            portfolioReturn *
            100
          ),

        benchmarkReturnPercentage:
          roundPercent(
            benchmarkReturn *
            100
          ),

        activeReturnPercentage:
          roundPercent(
            (
              portfolioReturn -
              benchmarkReturn
            ) *
              100
          )
      };
    }
  );
}

/*
 * ============================================================
 * COMPOUNDED RETURN
 * ============================================================
 */

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
 * COMPARISON QUALITY
 * ============================================================
 */

function classifyComparisonHistory(
  observations
) {
  const count =
    number(
      observations
    );

  if (
    count <
    MINIMUM_COMPARISON_OBSERVATIONS
  ) {
    return {
      status:
        "INSUFFICIENT_HISTORY",

      reliable:
        false,

      message:
        "At least two matched portfolio and benchmark observations are required."
    };
  }

  if (
    count <
    MINIMUM_PRELIMINARY_OBSERVATIONS
  ) {
    return {
      status:
        "INSUFFICIENT_HISTORY",

      reliable:
        false,

      message:
        `${count} matched observation(s) are available. At least ${MINIMUM_PRELIMINARY_OBSERVATIONS} are required for preliminary comparison analytics.`
    };
  }

  if (
    count <
    MINIMUM_RELIABLE_OBSERVATIONS
  ) {
    return {
      status:
        "PRELIMINARY",

      reliable:
        false,

      message:
        `${count} matched observations are available. Results remain preliminary until at least ${MINIMUM_RELIABLE_OBSERVATIONS} observations exist.`
    };
  }

  return {
    status:
      "READY",

    reliable:
      true,

    message:
      `${count} matched portfolio and benchmark observations are available.`
  };
}

/*
 * ============================================================
 * REGRESSION METRICS
 * ============================================================
 */

function calculateBeta({
  portfolioReturns,
  benchmarkReturns
}) {
  const benchmarkVariance =
    sampleVariance(
      benchmarkReturns
    );

  const covarianceValue =
    covariance(
      portfolioReturns,
      benchmarkReturns
    );

  if (
    benchmarkVariance ===
      null ||
    benchmarkVariance <=
      0 ||
    covarianceValue ===
      null
  ) {
    return null;
  }

  return (
    covarianceValue /
    benchmarkVariance
  );
}

function calculateAlpha({
  portfolioAverageReturn,
  benchmarkAverageReturn,
  beta,
  riskFreePeriodicReturn
}) {
  if (
    portfolioAverageReturn ===
      null ||
    benchmarkAverageReturn ===
      null ||
    beta ===
      null
  ) {
    return null;
  }

  return (
    portfolioAverageReturn -
    (
      riskFreePeriodicReturn +
      beta *
      (
        benchmarkAverageReturn -
        riskFreePeriodicReturn
      )
    )
  );
}

/*
 * ============================================================
 * PC-021B
 * BENCHMARK COMPARISON ENGINE
 * ============================================================
 */

export async function buildPortfolioBenchmarkComparison({
  benchmarkCode =
    DEFAULT_BENCHMARK_CODE,

  benchmarkSeries =
    null,

  annualizationFactor =
    DEFAULT_TRADING_DAYS,

  riskFreeRatePercentage =
    null
} = {}) {
  const [
    portfolioResult,
    benchmarkResult,
    configuration
  ] = await Promise.all([
    buildPortfolioDailyReturnSeries(),

    loadBenchmarkSeries({
      benchmarkCode,
      benchmarkSeries
    }),

    getOrCreateRiskConfiguration()
  ]);

  const portfolioReturns =
    Array.isArray(
      portfolioResult?.returns
    )
      ? portfolioResult.returns
      : [];

  if (
    benchmarkResult.status ===
    "BENCHMARK_NOT_AVAILABLE"
  ) {
    return {
      generatedAt:
        new Date()
          .toISOString(),

      status:
        "BENCHMARK_NOT_AVAILABLE",

      message:
        benchmarkResult.message,

      benchmark: {
        code:
          benchmarkResult
            .benchmarkCode,

        label:
          benchmarkResult
            .benchmarkLabel,

        observations:
          benchmarkResult
            .observations,

        returnObservations:
          benchmarkResult
            .returnObservations
      },

      history: {
        matchedObservations:
          0,

        reliable:
          false
      },

      returns: {
        portfolioReturnPercentage:
          null,

        benchmarkReturnPercentage:
          null,

        activeReturnPercentage:
          null,

        annualizedPortfolioReturnPercentage:
          null,

        annualizedBenchmarkReturnPercentage:
          null,

        annualizedActiveReturnPercentage:
          null
      },

      risk: {
        beta:
          null,

        alphaPercentage:
          null,

        annualizedAlphaPercentage:
          null,

        trackingErrorPercentage:
          null,

        annualizedTrackingErrorPercentage:
          null,

        informationRatio:
          null,

        correlation:
          null,

        rSquared:
          null
      },

      consistency: {
        outperformingPeriods:
          0,

        underperformingPeriods:
          0,

        matchingPeriods:
          0,

        hitRatePercentage:
          null
      },

      matchedReturns:
        [],

      sources: {
        portfolioResult,
        benchmarkResult,
        configuration
      }
    };
  }

  const matchedReturns =
    matchReturnSeries({
      portfolioReturns,

      benchmarkReturns:
        benchmarkResult.series
    });

  const history =
    classifyComparisonHistory(
      matchedReturns.length
    );

  const portfolioDecimals =
    matchedReturns.map(
      (item) =>
        item
          .portfolioReturnDecimal
    );

  const benchmarkDecimals =
    matchedReturns.map(
      (item) =>
        item
          .benchmarkReturnDecimal
    );

  const activeDecimals =
    matchedReturns.map(
      (item) =>
        item
          .activeReturnDecimal
    );

  const portfolioReturn =
    compoundReturns(
      portfolioDecimals
    );

  const benchmarkReturn =
    compoundReturns(
      benchmarkDecimals
    );

  const activeReturn =
    portfolioReturn !==
      null &&
    benchmarkReturn !==
      null
      ? (
          1 +
          portfolioReturn
        ) /
          (
            1 +
            benchmarkReturn
          ) -
        1
      : null;

  const portfolioAverage =
    average(
      portfolioDecimals
    );

  const benchmarkAverage =
    average(
      benchmarkDecimals
    );

  const activeAverage =
    average(
      activeDecimals
    );

  const portfolioVolatility =
    sampleStandardDeviation(
      portfolioDecimals
    );

  const benchmarkVolatility =
    sampleStandardDeviation(
      benchmarkDecimals
    );

  const trackingError =
    sampleStandardDeviation(
      activeDecimals
    );

  const beta =
    calculateBeta({
      portfolioReturns:
        portfolioDecimals,

      benchmarkReturns:
        benchmarkDecimals
    });

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

  const riskFreePeriodicReturn =
    (
      configuredRiskFreeRate /
      100
    ) /
    annualizationFactor;

  const alphaPeriodic =
    calculateAlpha({
      portfolioAverageReturn:
        portfolioAverage,

      benchmarkAverageReturn:
        benchmarkAverage,

      beta,

      riskFreePeriodicReturn
    });

  const covarianceValue =
    covariance(
      portfolioDecimals,
      benchmarkDecimals
    );

  const portfolioStandardDeviation =
    sampleStandardDeviation(
      portfolioDecimals
    );

  const benchmarkStandardDeviation =
    sampleStandardDeviation(
      benchmarkDecimals
    );

  const correlation =
    covarianceValue !==
      null &&
    portfolioStandardDeviation !==
      null &&
    benchmarkStandardDeviation !==
      null &&
    portfolioStandardDeviation >
      0 &&
    benchmarkStandardDeviation >
      0
      ? covarianceValue /
        (
          portfolioStandardDeviation *
          benchmarkStandardDeviation
        )
      : null;

  const informationRatio =
    activeAverage !==
      null &&
    trackingError !==
      null &&
    trackingError >
      0
      ? activeAverage /
        trackingError
      : null;

  const outperformingPeriods =
    activeDecimals.filter(
      (value) =>
        value > 0
    ).length;

  const underperformingPeriods =
    activeDecimals.filter(
      (value) =>
        value < 0
    ).length;

  const matchingPeriods =
    activeDecimals.filter(
      (value) =>
        value === 0
    ).length;

  const hitRatePercentage =
    activeDecimals.length >
    0
      ? (
          outperformingPeriods /
          activeDecimals.length
        ) *
        100
      : null;

  let status;

  if (
    history.status ===
    "INSUFFICIENT_HISTORY"
  ) {
    status =
      "INSUFFICIENT_HISTORY";
  } else if (
    history.status ===
    "PRELIMINARY"
  ) {
    status =
      "PRELIMINARY";
  } else if (
    activeReturn !==
      null &&
    activeReturn > 0
  ) {
    status =
      "OUTPERFORMING";
  } else if (
    activeReturn !==
      null &&
    activeReturn < 0
  ) {
    status =
      "UNDERPERFORMING";
  } else {
    status =
      "MATCHING_BENCHMARK";
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    message:
      history.message,

    benchmark: {
      code:
        benchmarkResult
          .benchmarkCode,

      label:
        benchmarkResult
          .benchmarkLabel,

      observations:
        benchmarkResult
          .observations,

      returnObservations:
        benchmarkResult
          .returnObservations,

      firstDate:
        benchmarkResult
          .firstDate,

      lastDate:
        benchmarkResult
          .lastDate
    },

    history: {
      status:
        history.status,

      reliable:
        history.reliable,

      matchedObservations:
        matchedReturns.length,

      minimumPreliminaryObservations:
        MINIMUM_PRELIMINARY_OBSERVATIONS,

      minimumReliableObservations:
        MINIMUM_RELIABLE_OBSERVATIONS,

      firstMatchedDate:
        matchedReturns[0]
          ?.date ||
        null,

      lastMatchedDate:
        matchedReturns[
          matchedReturns.length -
          1
        ]?.date ||
        null,

      annualizationFactor
    },

    returns: {
      portfolioReturnDecimal:
        roundMetric(
          portfolioReturn,
          10
        ),

      portfolioReturnPercentage:
        portfolioReturn ===
          null
          ? null
          : roundPercent(
              portfolioReturn *
              100
            ),

      benchmarkReturnDecimal:
        roundMetric(
          benchmarkReturn,
          10
        ),

      benchmarkReturnPercentage:
        benchmarkReturn ===
          null
          ? null
          : roundPercent(
              benchmarkReturn *
              100
            ),

      activeReturnDecimal:
        roundMetric(
          activeReturn,
          10
        ),

      activeReturnPercentage:
        activeReturn ===
          null
          ? null
          : roundPercent(
              activeReturn *
              100
            ),

      averagePortfolioReturnPercentage:
        portfolioAverage ===
          null
          ? null
          : roundPercent(
              portfolioAverage *
              100
            ),

      averageBenchmarkReturnPercentage:
        benchmarkAverage ===
          null
          ? null
          : roundPercent(
              benchmarkAverage *
              100
            ),

      averageActiveReturnPercentage:
        activeAverage ===
          null
          ? null
          : roundPercent(
              activeAverage *
              100
            ),

      annualizedPortfolioReturnPercentage:
        portfolioAverage ===
          null
          ? null
          : roundPercent(
              portfolioAverage *
              annualizationFactor *
              100
            ),

      annualizedBenchmarkReturnPercentage:
        benchmarkAverage ===
          null
          ? null
          : roundPercent(
              benchmarkAverage *
              annualizationFactor *
              100
            ),

      annualizedActiveReturnPercentage:
        activeAverage ===
          null
          ? null
          : roundPercent(
              activeAverage *
              annualizationFactor *
              100
            )
    },

    risk: {
      beta:
        roundMetric(
          beta,
          6
        ),

      alphaDecimal:
        roundMetric(
          alphaPeriodic,
          10
        ),

      alphaPercentage:
        alphaPeriodic ===
          null
          ? null
          : roundPercent(
              alphaPeriodic *
              100
            ),

      annualizedAlphaPercentage:
        alphaPeriodic ===
          null
          ? null
          : roundPercent(
              alphaPeriodic *
              annualizationFactor *
              100
            ),

      portfolioVolatilityPercentage:
        portfolioVolatility ===
          null
          ? null
          : roundPercent(
              portfolioVolatility *
              100
            ),

      annualizedPortfolioVolatilityPercentage:
        portfolioVolatility ===
          null
          ? null
          : roundPercent(
              portfolioVolatility *
              Math.sqrt(
                annualizationFactor
              ) *
              100
            ),

      benchmarkVolatilityPercentage:
        benchmarkVolatility ===
          null
          ? null
          : roundPercent(
              benchmarkVolatility *
              100
            ),

      annualizedBenchmarkVolatilityPercentage:
        benchmarkVolatility ===
          null
          ? null
          : roundPercent(
              benchmarkVolatility *
              Math.sqrt(
                annualizationFactor
              ) *
              100
            ),

      trackingErrorPercentage:
        trackingError ===
          null
          ? null
          : roundPercent(
              trackingError *
              100
            ),

      annualizedTrackingErrorPercentage:
        trackingError ===
          null
          ? null
          : roundPercent(
              trackingError *
              Math.sqrt(
                annualizationFactor
              ) *
              100
            ),

      informationRatio:
        roundMetric(
          informationRatio,
          6
        ),

      correlation:
        roundMetric(
          correlation,
          6
        ),

      rSquared:
        correlation ===
          null
          ? null
          : roundMetric(
              Math.pow(
                correlation,
                2
              ),
              6
            ),

      riskFreeRatePercentage:
        roundPercent(
          configuredRiskFreeRate
        )
    },

    consistency: {
      outperformingPeriods,

      underperformingPeriods,

      matchingPeriods,

      totalPeriods:
        activeDecimals.length,

      hitRatePercentage:
        hitRatePercentage ===
          null
          ? null
          : roundPercent(
              hitRatePercentage
            )
    },

    matchedReturns,

    sources: {
      portfolioResult,
      benchmarkResult,
      configuration
    }
  };
}

/*
 * ============================================================
 * COMPACT SUMMARY
 * ============================================================
 */

export async function buildPortfolioBenchmarkSummary(
  options = {}
) {
  const comparison =
    await buildPortfolioBenchmarkComparison(
      options
    );

  return {
    generatedAt:
      comparison.generatedAt,

    status:
      comparison.status,

    benchmarkCode:
      comparison
        ?.benchmark
        ?.code ||
      null,

    benchmarkLabel:
      comparison
        ?.benchmark
        ?.label ||
      "Not available",

    matchedObservations:
      comparison
        ?.history
        ?.matchedObservations ||
      0,

    portfolioReturnPercentage:
      comparison
        ?.returns
        ?.portfolioReturnPercentage ??
      null,

    benchmarkReturnPercentage:
      comparison
        ?.returns
        ?.benchmarkReturnPercentage ??
      null,

    activeReturnPercentage:
      comparison
        ?.returns
        ?.activeReturnPercentage ??
      null,

    annualizedAlphaPercentage:
      comparison
        ?.risk
        ?.annualizedAlphaPercentage ??
      null,

    beta:
      comparison
        ?.risk
        ?.beta ??
      null,

    annualizedTrackingErrorPercentage:
      comparison
        ?.risk
        ?.annualizedTrackingErrorPercentage ??
      null,

    informationRatio:
      comparison
        ?.risk
        ?.informationRatio ??
      null,

    correlation:
      comparison
        ?.risk
        ?.correlation ??
      null,

    hitRatePercentage:
      comparison
        ?.consistency
        ?.hitRatePercentage ??
      null,

    message:
      comparison.message
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export async function loadPortfolioBenchmarkMatchedReturns(
  options = {}
) {
  const comparison =
    await buildPortfolioBenchmarkComparison(
      options
    );

  return comparison
    .matchedReturns ||
    [];
}

export async function loadPortfolioRelativePerformance(
  options = {}
) {
  const comparison =
    await buildPortfolioBenchmarkComparison(
      options
    );

  return {
    status:
      comparison.status,

    benchmark:
      comparison.benchmark,

    portfolioReturnPercentage:
      comparison
        ?.returns
        ?.portfolioReturnPercentage ??
      null,

    benchmarkReturnPercentage:
      comparison
        ?.returns
        ?.benchmarkReturnPercentage ??
      null,

    activeReturnPercentage:
      comparison
        ?.returns
        ?.activeReturnPercentage ??
      null
  };
}

export async function loadPortfolioBenchmarkRiskMetrics(
  options = {}
) {
  const comparison =
    await buildPortfolioBenchmarkComparison(
      options
    );

  return {
    status:
      comparison.status,

    benchmark:
      comparison.benchmark,

    beta:
      comparison
        ?.risk
        ?.beta ??
      null,

    alphaPercentage:
      comparison
        ?.risk
        ?.alphaPercentage ??
      null,

    annualizedAlphaPercentage:
      comparison
        ?.risk
        ?.annualizedAlphaPercentage ??
      null,

    trackingErrorPercentage:
      comparison
        ?.risk
        ?.trackingErrorPercentage ??
      null,

    annualizedTrackingErrorPercentage:
      comparison
        ?.risk
        ?.annualizedTrackingErrorPercentage ??
      null,

    informationRatio:
      comparison
        ?.risk
        ?.informationRatio ??
      null,

    correlation:
      comparison
        ?.risk
        ?.correlation ??
      null,

    rSquared:
      comparison
        ?.risk
        ?.rSquared ??
      null
  };
}