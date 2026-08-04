import {
  buildCurrentPortfolioAllocation
} from "../rebalancing/allocationEngine";

import {
  buildPortfolioPerformanceAnalysis
} from "./portfolioPerformanceService";

import {
  buildPortfolioBenchmarkComparison,
  DEFAULT_BENCHMARK_CODE
} from "./benchmarkComparisonService";

import {
  getOrCreateRiskConfiguration
} from "../risk/riskStore";

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

function normalizeSymbol(value) {
  return String(
    value || ""
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

function normalizeKey(value) {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase()
    .replaceAll(
      " ",
      "_"
    );
}

function sum(
  values = []
) {
  return values.reduce(
    (
      total,
      value
    ) =>
      total +
      number(value),
    0
  );
}

/*
 * ============================================================
 * HOLDING VALUE NORMALIZATION
 * ============================================================
 */

function normalizeHolding(
  holding = {}
) {
  const symbol =
    normalizeSymbol(
      holding?.symbol
    );

  const quantity =
    number(
      holding?.quantity
    );

  const averagePrice =
    number(
      holding?.averagePrice ??
      holding?.averageCost ??
      holding?.costPrice
    );

  const marketPrice =
    number(
      holding?.marketPrice ??
      holding?.lastPrice ??
      holding?.price
    );

  const explicitCostValue =
    nullableNumber(
      holding?.costValue
    ) ??
    nullableNumber(
      holding?.investedValue
    );

  const explicitMarketValue =
    nullableNumber(
      holding?.marketValue
    ) ??
    nullableNumber(
      holding?.value
    );

  const costValue =
    explicitCostValue !==
      null
      ? explicitCostValue
      : quantity *
        averagePrice;

  const marketValue =
    explicitMarketValue !==
      null
      ? explicitMarketValue
      : quantity *
        marketPrice;

  const gainLoss =
    marketValue -
    costValue;

  const returnDecimal =
    costValue > 0
      ? gainLoss /
        costValue
      : null;

  return {
    symbol,

    name:
      holding?.name ||
      holding?.companyName ||
      symbol ||
      "Unknown",

    sector:
      normalizeSector(
        holding?.sector
      ),

    quantity:
      roundMetric(
        quantity,
        6
      ),

    averagePrice:
      roundMoney(
        averagePrice
      ),

    marketPrice:
      roundMoney(
        marketPrice
      ),

    costValue:
      roundMoney(
        costValue
      ),

    marketValue:
      roundMoney(
        marketValue
      ),

    gainLoss:
      roundMoney(
        gainLoss
      ),

    returnDecimal:
      roundMetric(
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

/*
 * ============================================================
 * HOLDING CONTRIBUTION ATTRIBUTION
 * ============================================================
 *
 * Contribution is based on:
 *
 * holding gain/loss / total portfolio cost value
 *
 * This is a since-cost contribution measure. It is not a
 * substitute for daily security-level return attribution.
 */

function buildHoldingContributions(
  holdings = []
) {
  const normalized =
    holdings
      .map(
        normalizeHolding
      )
      .filter(
        (holding) =>
          holding.symbol &&
          holding.marketValue >
            0
      );

  const totalCostValue =
    sum(
      normalized.map(
        (holding) =>
          holding.costValue
      )
    );

  const totalMarketValue =
    sum(
      normalized.map(
        (holding) =>
          holding.marketValue
      )
    );

  const totalGainLoss =
    totalMarketValue -
    totalCostValue;

  const results =
    normalized
      .map(
        (holding) => {
          const beginningWeight =
            totalCostValue > 0
              ? holding.costValue /
                totalCostValue
              : 0;

          const currentWeight =
            totalMarketValue > 0
              ? holding.marketValue /
                totalMarketValue
              : 0;

          const contributionDecimal =
            totalCostValue > 0
              ? holding.gainLoss /
                totalCostValue
              : null;

          const gainLossShare =
            totalGainLoss !==
              0
              ? holding.gainLoss /
                totalGainLoss
              : null;

          return {
            ...holding,

            beginningWeightDecimal:
              roundMetric(
                beginningWeight,
                10
              ),

            beginningWeightPercentage:
              roundPercent(
                beginningWeight *
                100
              ),

            currentWeightDecimal:
              roundMetric(
                currentWeight,
                10
              ),

            currentWeightPercentage:
              roundPercent(
                currentWeight *
                100
              ),

            contributionDecimal:
              roundMetric(
                contributionDecimal,
                10
              ),

            contributionPercentage:
              contributionDecimal ===
                null
                ? null
                : roundPercent(
                    contributionDecimal *
                    100
                  ),

            gainLossSharePercentage:
              gainLossShare ===
                null
                ? null
                : roundPercent(
                    gainLossShare *
                    100
                  )
          };
        }
      )
      .sort(
        (
          first,
          second
        ) =>
          second.gainLoss -
          first.gainLoss
      );

  return {
    totalCostValue:
      roundMoney(
        totalCostValue
      ),

    totalMarketValue:
      roundMoney(
        totalMarketValue
      ),

    totalGainLoss:
      roundMoney(
        totalGainLoss
      ),

    totalReturnPercentage:
      totalCostValue > 0
        ? roundPercent(
            (
              totalGainLoss /
              totalCostValue
            ) *
              100
          )
        : null,

    holdings:
      results
  };
}

/*
 * ============================================================
 * SECTOR CONTRIBUTION ATTRIBUTION
 * ============================================================
 */

function buildSectorContributions(
  holdingAttribution
) {
  const sectorMap =
    new Map();

  holdingAttribution
    .holdings
    .forEach(
      (holding) => {
        const sector =
          normalizeSector(
            holding.sector
          );

        const current =
          sectorMap.get(
            sector
          ) || {
            sector,
            holdingsCount: 0,
            symbols: [],
            costValue: 0,
            marketValue: 0,
            gainLoss: 0
          };

        current.holdingsCount +=
          1;

        current.symbols.push(
          holding.symbol
        );

        current.costValue +=
          holding.costValue;

        current.marketValue +=
          holding.marketValue;

        current.gainLoss +=
          holding.gainLoss;

        sectorMap.set(
          sector,
          current
        );
      }
    );

  const totalCostValue =
    number(
      holdingAttribution
        ?.totalCostValue
    );

  const totalMarketValue =
    number(
      holdingAttribution
        ?.totalMarketValue
    );

  const totalGainLoss =
    number(
      holdingAttribution
        ?.totalGainLoss
    );

  return Array.from(
    sectorMap.values()
  )
    .map(
      (sector) => {
        const returnDecimal =
          sector.costValue > 0
            ? sector.gainLoss /
              sector.costValue
            : null;

        const contributionDecimal =
          totalCostValue > 0
            ? sector.gainLoss /
              totalCostValue
            : null;

        return {
          sector:
            sector.sector,

          holdingsCount:
            sector.holdingsCount,

          symbols:
            sector.symbols
              .sort(),

          costValue:
            roundMoney(
              sector.costValue
            ),

          marketValue:
            roundMoney(
              sector.marketValue
            ),

          gainLoss:
            roundMoney(
              sector.gainLoss
            ),

          returnDecimal:
            roundMetric(
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
                ),

          beginningWeightPercentage:
            totalCostValue > 0
              ? roundPercent(
                  (
                    sector.costValue /
                    totalCostValue
                  ) *
                    100
                )
              : 0,

          currentWeightPercentage:
            totalMarketValue > 0
              ? roundPercent(
                  (
                    sector.marketValue /
                    totalMarketValue
                  ) *
                    100
                )
              : 0,

          contributionDecimal:
            roundMetric(
              contributionDecimal,
              10
            ),

          contributionPercentage:
            contributionDecimal ===
              null
              ? null
              : roundPercent(
                  contributionDecimal *
                  100
                ),

          gainLossSharePercentage:
            totalGainLoss !==
              0
              ? roundPercent(
                  (
                    sector.gainLoss /
                    totalGainLoss
                  ) *
                    100
                )
              : null
        };
      }
    )
    .sort(
      (
        first,
        second
      ) =>
        second.gainLoss -
        first.gainLoss
    );
}

/*
 * ============================================================
 * BENCHMARK SECTOR DATA EXTRACTION
 * ============================================================
 *
 * Supported configuration locations:
 *
 * configuration.metadata.benchmarkSectorAttribution
 *
 * configuration.metadata.benchmarkSectors[benchmarkCode]
 *
 * configuration.metadata.benchmarks[benchmarkCode].sectors
 *
 * Supported item:
 *
 * {
 *   sector: "Banking",
 *   weightPercentage: 35,
 *   returnPercentage: 8.2
 * }
 *
 * Decimal versions are also supported:
 *
 * {
 *   sector: "Banking",
 *   weightDecimal: 0.35,
 *   returnDecimal: 0.082
 * }
 */

function extractBenchmarkSectorData({
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

  const code =
    normalizeKey(
      benchmarkCode ||
      DEFAULT_BENCHMARK_CODE
    );

  const candidates = [
    metadata
      ?.benchmarkSectors?.[
        code
      ],

    metadata
      ?.benchmarks?.[
        code
      ]?.sectors,

    metadata
      ?.benchmarkSectorAttribution,

    configuration
      ?.benchmarkSectorAttribution
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

function normalizeBenchmarkSectorData(
  rawData = []
) {
  return rawData
    .map(
      (item) => {
        const sector =
          normalizeSector(
            item?.sector ||
            item?.name
          );

        const weightDecimal =
          nullableNumber(
            item
              ?.weightDecimal
          ) ??
          (
            nullableNumber(
              item
                ?.weightPercentage
            ) !== null
              ? number(
                  item
                    ?.weightPercentage
                ) /
                100
              : null
          );

        const returnDecimal =
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
          );

        if (
          weightDecimal ===
            null ||
          returnDecimal ===
            null
        ) {
          return null;
        }

        return {
          sector,

          sectorKey:
            normalizeKey(
              sector
            ),

          weightDecimal:
            roundMetric(
              weightDecimal,
              10
            ),

          weightPercentage:
            roundPercent(
              weightDecimal *
              100
            ),

          returnDecimal:
            roundMetric(
              returnDecimal,
              10
            ),

          returnPercentage:
            roundPercent(
              returnDecimal *
              100
            )
        };
      }
    )
    .filter(Boolean);
}

/*
 * ============================================================
 * BRINSON ATTRIBUTION
 * ============================================================
 *
 * Allocation effect:
 *
 * (Portfolio Weight - Benchmark Weight)
 * ×
 * (Benchmark Sector Return - Benchmark Total Return)
 *
 * Selection effect:
 *
 * Benchmark Weight
 * ×
 * (Portfolio Sector Return - Benchmark Sector Return)
 *
 * Interaction effect:
 *
 * (Portfolio Weight - Benchmark Weight)
 * ×
 * (Portfolio Sector Return - Benchmark Sector Return)
 */

function buildBrinsonAttribution({
  sectorContributions,
  benchmarkSectors
}) {
  if (
    !benchmarkSectors.length
  ) {
    return {
      status:
        "BENCHMARK_SECTOR_DATA_NOT_AVAILABLE",

      message:
        "Benchmark sector weights and returns are required for allocation, selection, and interaction attribution.",

      benchmarkReturnDecimal:
        null,

      benchmarkReturnPercentage:
        null,

      allocationEffectPercentage:
        null,

      selectionEffectPercentage:
        null,

      interactionEffectPercentage:
        null,

      totalActiveEffectPercentage:
        null,

      sectors:
        []
    };
  }

  const portfolioMap =
    new Map();

  sectorContributions.forEach(
    (sector) => {
      portfolioMap.set(
        normalizeKey(
          sector.sector
        ),
        sector
      );
    }
  );

  const benchmarkMap =
    new Map();

  benchmarkSectors.forEach(
    (sector) => {
      benchmarkMap.set(
        sector.sectorKey,
        sector
      );
    }
  );

  const allSectorKeys =
    Array.from(
      new Set([
        ...portfolioMap.keys(),
        ...benchmarkMap.keys()
      ])
    ).sort();

  const benchmarkReturnDecimal =
    sum(
      benchmarkSectors.map(
        (sector) =>
          sector.weightDecimal *
          sector.returnDecimal
      )
    );

  const results =
    allSectorKeys.map(
      (sectorKey) => {
        const portfolio =
          portfolioMap.get(
            sectorKey
          );

        const benchmark =
          benchmarkMap.get(
            sectorKey
          );

        const portfolioWeight =
          number(
            portfolio
              ?.beginningWeightPercentage
          ) /
          100;

        const benchmarkWeight =
          number(
            benchmark
              ?.weightDecimal
          );

        const portfolioReturn =
          nullableNumber(
            portfolio
              ?.returnDecimal
          ) ??
          0;

        const benchmarkSectorReturn =
          nullableNumber(
            benchmark
              ?.returnDecimal
          ) ??
          0;

        const allocationEffect =
          (
            portfolioWeight -
            benchmarkWeight
          ) *
          (
            benchmarkSectorReturn -
            benchmarkReturnDecimal
          );

        const selectionEffect =
          benchmarkWeight *
          (
            portfolioReturn -
            benchmarkSectorReturn
          );

        const interactionEffect =
          (
            portfolioWeight -
            benchmarkWeight
          ) *
          (
            portfolioReturn -
            benchmarkSectorReturn
          );

        const totalEffect =
          allocationEffect +
          selectionEffect +
          interactionEffect;

        return {
          sector:
            portfolio?.sector ||
            benchmark?.sector ||
            sectorKey,

          portfolioWeightPercentage:
            roundPercent(
              portfolioWeight *
              100
            ),

          benchmarkWeightPercentage:
            roundPercent(
              benchmarkWeight *
              100
            ),

          activeWeightPercentage:
            roundPercent(
              (
                portfolioWeight -
                benchmarkWeight
              ) *
                100
            ),

          portfolioReturnPercentage:
            roundPercent(
              portfolioReturn *
              100
            ),

          benchmarkReturnPercentage:
            roundPercent(
              benchmarkSectorReturn *
              100
            ),

          allocationEffectDecimal:
            roundMetric(
              allocationEffect,
              10
            ),

          allocationEffectPercentage:
            roundPercent(
              allocationEffect *
              100
            ),

          selectionEffectDecimal:
            roundMetric(
              selectionEffect,
              10
            ),

          selectionEffectPercentage:
            roundPercent(
              selectionEffect *
              100
            ),

          interactionEffectDecimal:
            roundMetric(
              interactionEffect,
              10
            ),

          interactionEffectPercentage:
            roundPercent(
              interactionEffect *
              100
            ),

          totalEffectDecimal:
            roundMetric(
              totalEffect,
              10
            ),

          totalEffectPercentage:
            roundPercent(
              totalEffect *
              100
            )
        };
      }
    )
    .sort(
      (
        first,
        second
      ) =>
        Math.abs(
          second.totalEffectPercentage
        ) -
        Math.abs(
          first.totalEffectPercentage
        )
    );

  const allocationEffectDecimal =
    sum(
      results.map(
        (item) =>
          item
            .allocationEffectDecimal
      )
    );

  const selectionEffectDecimal =
    sum(
      results.map(
        (item) =>
          item
            .selectionEffectDecimal
      )
    );

  const interactionEffectDecimal =
    sum(
      results.map(
        (item) =>
          item
            .interactionEffectDecimal
      )
    );

  const totalActiveEffectDecimal =
    allocationEffectDecimal +
    selectionEffectDecimal +
    interactionEffectDecimal;

  return {
    status:
      "AVAILABLE",

    message:
      `${results.length} sector attribution result(s) were calculated.`,

    benchmarkReturnDecimal:
      roundMetric(
        benchmarkReturnDecimal,
        10
      ),

    benchmarkReturnPercentage:
      roundPercent(
        benchmarkReturnDecimal *
        100
      ),

    allocationEffectDecimal:
      roundMetric(
        allocationEffectDecimal,
        10
      ),

    allocationEffectPercentage:
      roundPercent(
        allocationEffectDecimal *
        100
      ),

    selectionEffectDecimal:
      roundMetric(
        selectionEffectDecimal,
        10
      ),

    selectionEffectPercentage:
      roundPercent(
        selectionEffectDecimal *
        100
      ),

    interactionEffectDecimal:
      roundMetric(
        interactionEffectDecimal,
        10
      ),

    interactionEffectPercentage:
      roundPercent(
        interactionEffectDecimal *
        100
      ),

    totalActiveEffectDecimal:
      roundMetric(
        totalActiveEffectDecimal,
        10
      ),

    totalActiveEffectPercentage:
      roundPercent(
        totalActiveEffectDecimal *
        100
      ),

    sectors:
      results
  };
}

/*
 * ============================================================
 * CONTRIBUTOR CLASSIFICATION
 * ============================================================
 */

function buildContributorSummary({
  holdings,
  sectors
}) {
  const positiveHoldings =
    holdings.filter(
      (item) =>
        item.gainLoss >
        0
    );

  const negativeHoldings =
    holdings.filter(
      (item) =>
        item.gainLoss <
        0
    );

  const flatHoldings =
    holdings.filter(
      (item) =>
        item.gainLoss ===
        0
    );

  const positiveSectors =
    sectors.filter(
      (item) =>
        item.gainLoss >
        0
    );

  const negativeSectors =
    sectors.filter(
      (item) =>
        item.gainLoss <
        0
    );

  return {
    topHoldingContributor:
      positiveHoldings[0] ||
      null,

    worstHoldingContributor:
      negativeHoldings
        .sort(
          (
            first,
            second
          ) =>
            first.gainLoss -
            second.gainLoss
        )[0] ||
      null,

    topSectorContributor:
      positiveSectors[0] ||
      null,

    worstSectorContributor:
      negativeSectors
        .sort(
          (
            first,
            second
          ) =>
            first.gainLoss -
            second.gainLoss
        )[0] ||
      null,

    positiveHoldings:
      positiveHoldings.length,

    negativeHoldings:
      negativeHoldings.length,

    flatHoldings:
      flatHoldings.length,

    positiveSectors:
      positiveSectors.length,

    negativeSectors:
      negativeSectors.length
  };
}

/*
 * ============================================================
 * PC-021C
 * PERFORMANCE ATTRIBUTION ENGINE
 * ============================================================
 */

export async function buildPortfolioPerformanceAttribution({
  benchmarkCode =
    DEFAULT_BENCHMARK_CODE,

  benchmarkSeries =
    null,

  benchmarkSectorData =
    null
} = {}) {
  const [
    allocation,
    performance,
    benchmarkComparison,
    configuration
  ] = await Promise.all([
    buildCurrentPortfolioAllocation(),

    buildPortfolioPerformanceAnalysis(),

    buildPortfolioBenchmarkComparison({
      benchmarkCode,
      benchmarkSeries
    }),

    getOrCreateRiskConfiguration()
  ]);

  if (
    !allocation ||
    allocation?.status ===
      "NO_PORTFOLIO" ||
    allocation?.status ===
      "EMPTY_PORTFOLIO"
  ) {
    return {
      generatedAt:
        new Date()
          .toISOString(),

      status:
        "NOT_READY",

      message:
        "A funded portfolio is required before performance attribution can be calculated.",

      holdingAttribution: {
        totalCostValue: 0,
        totalMarketValue: 0,
        totalGainLoss: 0,
        totalReturnPercentage:
          null,
        holdings: []
      },

      sectorAttribution: [],

      brinsonAttribution: {
        status:
          "BENCHMARK_SECTOR_DATA_NOT_AVAILABLE",

        sectors: []
      },

      contributors: {
        topHoldingContributor:
          null,

        worstHoldingContributor:
          null,

        topSectorContributor:
          null,

        worstSectorContributor:
          null,

        positiveHoldings:
          0,

        negativeHoldings:
          0,

        flatHoldings:
          0,

        positiveSectors:
          0,

        negativeSectors:
          0
      },

      sources: {
        allocation,
        performance,
        benchmarkComparison,
        configuration
      }
    };
  }

  const holdings =
    Array.isArray(
      allocation?.holdings
    )
      ? allocation.holdings
      : [];

  const holdingAttribution =
    buildHoldingContributions(
      holdings
    );

  const sectorAttribution =
    buildSectorContributions(
      holdingAttribution
    );

  const configuredBenchmarkSectorData =
    Array.isArray(
      benchmarkSectorData
    )
      ? benchmarkSectorData
      : extractBenchmarkSectorData({
          configuration,
          benchmarkCode
        });

  const normalizedBenchmarkSectors =
    normalizeBenchmarkSectorData(
      configuredBenchmarkSectorData
    );

  const brinsonAttribution =
    buildBrinsonAttribution({
      sectorContributions:
        sectorAttribution,

      benchmarkSectors:
        normalizedBenchmarkSectors
    });

  const contributors =
    buildContributorSummary({
      holdings:
        holdingAttribution
          .holdings,

      sectors:
        sectorAttribution
    });

  const hasHoldingData =
    holdingAttribution
      .holdings
      .length >
    0;

  let status;

  if (
    !hasHoldingData
  ) {
    status =
      "NOT_READY";
  } else if (
    brinsonAttribution
      .status ===
    "AVAILABLE"
  ) {
    status =
      "COMPLETE";
  } else {
    status =
      "PORTFOLIO_ATTRIBUTION_AVAILABLE";
  }

  const message =
    status ===
      "COMPLETE"
      ? "Holding, sector, allocation, selection, and interaction attribution are available."
      : status ===
        "PORTFOLIO_ATTRIBUTION_AVAILABLE"
      ? "Holding and sector contribution attribution are available. Benchmark sector data is required for Brinson attribution."
      : "Performance attribution is not currently available.";

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    message,

    benchmark: {
      code:
        benchmarkComparison
          ?.benchmark
          ?.code ||
        benchmarkCode,

      label:
        benchmarkComparison
          ?.benchmark
          ?.label ||
        null,

      comparisonStatus:
        benchmarkComparison
          ?.status ||
        null,

      sectorDataAvailable:
        normalizedBenchmarkSectors
          .length >
        0,

      sectorCount:
        normalizedBenchmarkSectors
          .length
    },

    portfolio: {
      holdingsCount:
        holdingAttribution
          .holdings
          .length,

      sectorCount:
        sectorAttribution
          .length,

      costValue:
        holdingAttribution
          .totalCostValue,

      marketValue:
        holdingAttribution
          .totalMarketValue,

      gainLoss:
        holdingAttribution
          .totalGainLoss,

      returnPercentage:
        holdingAttribution
          .totalReturnPercentage,

      timeWeightedReturnPercentage:
        performance
          ?.returns
          ?.timeWeightedReturnPercentage ??
        null,

      moneyWeightedReturnPercentage:
        performance
          ?.returns
          ?.moneyWeightedReturnPercentage ??
        null
    },

    holdingAttribution,

    sectorAttribution,

    brinsonAttribution,

    contributors,

    benchmarkSectorData:
      normalizedBenchmarkSectors,

    sources: {
      allocation,
      performance,
      benchmarkComparison,
      configuration
    }
  };
}

/*
 * ============================================================
 * COMPACT SUMMARY
 * ============================================================
 */

export async function buildPortfolioAttributionSummary(
  options = {}
) {
  const result =
    await buildPortfolioPerformanceAttribution(
      options
    );

  return {
    generatedAt:
      result.generatedAt,

    status:
      result.status,

    portfolioReturnPercentage:
      result
        ?.portfolio
        ?.returnPercentage ??
      null,

    totalGainLoss:
      result
        ?.portfolio
        ?.gainLoss ??
      null,

    holdingsCount:
      result
        ?.portfolio
        ?.holdingsCount ||
      0,

    sectorCount:
      result
        ?.portfolio
        ?.sectorCount ||
      0,

    topHoldingContributor:
      result
        ?.contributors
        ?.topHoldingContributor ||
      null,

    worstHoldingContributor:
      result
        ?.contributors
        ?.worstHoldingContributor ||
      null,

    topSectorContributor:
      result
        ?.contributors
        ?.topSectorContributor ||
      null,

    worstSectorContributor:
      result
        ?.contributors
        ?.worstSectorContributor ||
      null,

    allocationEffectPercentage:
      result
        ?.brinsonAttribution
        ?.allocationEffectPercentage ??
      null,

    selectionEffectPercentage:
      result
        ?.brinsonAttribution
        ?.selectionEffectPercentage ??
      null,

    interactionEffectPercentage:
      result
        ?.brinsonAttribution
        ?.interactionEffectPercentage ??
      null,

    totalActiveEffectPercentage:
      result
        ?.brinsonAttribution
        ?.totalActiveEffectPercentage ??
      null,

    message:
      result.message
  };
}

/*
 * ============================================================
 * SPECIALIZED LOADERS
 * ============================================================
 */

export async function loadHoldingPerformanceContributions(
  options = {}
) {
  const result =
    await buildPortfolioPerformanceAttribution(
      options
    );

  return result
    ?.holdingAttribution
    ?.holdings ||
    [];
}

export async function loadSectorPerformanceContributions(
  options = {}
) {
  const result =
    await buildPortfolioPerformanceAttribution(
      options
    );

  return result
    ?.sectorAttribution ||
    [];
}

export async function loadBrinsonAttribution(
  options = {}
) {
  const result =
    await buildPortfolioPerformanceAttribution(
      options
    );

  return result
    ?.brinsonAttribution ||
    null;
}

export async function loadTopPerformanceContributors(
  limit = 5,
  options = {}
) {
  const result =
    await buildPortfolioPerformanceAttribution(
      options
    );

  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  return (
    result
      ?.holdingAttribution
      ?.holdings ||
    []
  )
    .filter(
      (holding) =>
        holding.gainLoss >
        0
    )
    .slice(
      0,
      safeLimit
    );
}

export async function loadWorstPerformanceContributors(
  limit = 5,
  options = {}
) {
  const result =
    await buildPortfolioPerformanceAttribution(
      options
    );

  const safeLimit =
    Math.max(
      Math.floor(
        number(limit)
      ),
      0
    );

  return (
    result
      ?.holdingAttribution
      ?.holdings ||
    []
  )
    .filter(
      (holding) =>
        holding.gainLoss <
        0
    )
    .sort(
      (
        first,
        second
      ) =>
        first.gainLoss -
        second.gainLoss
    )
    .slice(
      0,
      safeLimit
    );
}