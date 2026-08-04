import {
  buildCurrentPortfolioAllocation
} from "../rebalancing/allocationEngine";

import {
  getOrCreateRiskConfiguration
} from "./riskStore";

import {
  calculateLimitUsagePercentage,
  classifyRiskLimitUsage
} from "./riskLimits";

function number(value) {
  const parsed =
    Number(value || 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
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

function normalizeSymbol(value) {
  return String(value || "")
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

function buildEmptyAnalysis({
  allocation,
  configuration,
  message
}) {
  return {
    generatedAt:
      new Date().toISOString(),

    status:
      "NOT_READY",

    message,

    allocation,

    configuration,

    portfolio: {
      totalValue:
        number(
          allocation
            ?.portfolio
            ?.totalValue
        ),

      holdingsValue:
        number(
          allocation
            ?.portfolio
            ?.holdingsValue
        ),

      availableCash:
        number(
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

    concentration: {
      largestHolding:
        null,

      largestHoldingPercentage:
        0,

      topThreePercentage:
        0,

      topFivePercentage:
        0,

      topTenPercentage:
        0,

      hhi:
        0,

      normalizedHhi:
        0,

      effectiveHoldings:
        0
    },

    sectorConcentration: {
      largestSector:
        null,

      largestSectorPercentage:
        0,

      hhi:
        0,

      normalizedHhi:
        0,

      effectiveSectors:
        0,

      sectorCount:
        0
    },

    holdings: [],

    sectors: [],

    alerts: [],

    summary: {
      breached:
        0,

      warnings:
        0,

      withinLimit:
        0,

      highestSeverity:
        "NONE"
    }
  };
}

function calculateHhi(
  percentages = []
) {
  return roundPercent(
    percentages.reduce(
      (
        sum,
        percentage
      ) => {
        const weight =
          number(
            percentage
          ) /
          100;

        return (
          sum +
          weight *
            weight
        );
      },
      0
    )
  );
}

function calculateNormalizedHhi({
  hhi,
  itemCount
}) {
  const count =
    Math.max(
      Math.floor(
        number(
          itemCount
        )
      ),
      0
    );

  if (
    count <= 1
  ) {
    return count === 1
      ? 1
      : 0;
  }

  const minimumHhi =
    1 /
    count;

  return roundPercent(
    Math.max(
      (
        number(hhi) -
        minimumHhi
      ) /
      (
        1 -
        minimumHhi
      ),
      0
    )
  );
}

function calculateEffectiveCount(
  hhi
) {
  const safeHhi =
    number(
      hhi
    );

  if (
    safeHhi <= 0
  ) {
    return 0;
  }

  return roundPercent(
    1 /
    safeHhi
  );
}

function buildLimitResult({
  currentValue,
  limitValue,
  warningThreshold,
  criticalThreshold
}) {
  const usagePercentage =
    calculateLimitUsagePercentage({
      currentValue,
      limitValue
    });

  const status =
    classifyRiskLimitUsage({
      usagePercentage,

      warningThresholdPercentage:
        warningThreshold,

      criticalThresholdPercentage:
        criticalThreshold
    });

  return {
    currentValue:
      roundPercent(
        currentValue
      ),

    limitValue:
      roundPercent(
        limitValue
      ),

    usagePercentage,

    status,

    breached:
      status ===
      "BREACHED",

    warning:
      status ===
      "WARNING"
  };
}

function buildHoldingAlert({
  holding,
  limit
}) {
  if (
    limit.status ===
    "WITHIN_LIMIT"
  ) {
    return null;
  }

  return {
    id:
      `RISK-HOLDING-${holding.symbol}`,

    type:
      "SINGLE_HOLDING_CONCENTRATION",

    severity:
      limit.status ===
        "BREACHED"
        ? "HIGH"
        : "MEDIUM",

    status:
      limit.status,

    symbol:
      holding.symbol,

    label:
      holding.name ||
      holding.symbol,

    currentValue:
      holding
        .allocationPercentage,

    limitValue:
      limit.limitValue,

    usagePercentage:
      limit.usagePercentage,

    message:
      limit.status ===
        "BREACHED"
        ? `${holding.symbol} represents ${holding.allocationPercentage.toFixed(
            2
          )}% of the portfolio and exceeds the ${limit.limitValue.toFixed(
            2
          )}% single-holding limit.`
        : `${holding.symbol} has reached ${limit.usagePercentage.toFixed(
            2
          )}% of the configured single-holding limit.`
  };
}

function buildSectorAlert({
  sector,
  limit
}) {
  if (
    limit.status ===
    "WITHIN_LIMIT"
  ) {
    return null;
  }

  return {
    id:
      `RISK-SECTOR-${String(
        sector.sector
      )
        .trim()
        .toUpperCase()
        .replaceAll(
          " ",
          "_"
        )}`,

    type:
      "SECTOR_CONCENTRATION",

    severity:
      limit.status ===
        "BREACHED"
        ? "HIGH"
        : "MEDIUM",

    status:
      limit.status,

    sector:
      sector.sector,

    label:
      sector.sector,

    currentValue:
      sector.percentage,

    limitValue:
      limit.limitValue,

    usagePercentage:
      limit.usagePercentage,

    message:
      limit.status ===
        "BREACHED"
        ? `${sector.sector} represents ${sector.percentage.toFixed(
            2
          )}% of the portfolio and exceeds the ${limit.limitValue.toFixed(
            2
          )}% sector limit.`
        : `${sector.sector} has reached ${limit.usagePercentage.toFixed(
            2
          )}% of the configured sector limit.`
  };
}

function buildTopThreeAlert({
  topThreePercentage,
  limit
}) {
  if (
    limit.status ===
    "WITHIN_LIMIT"
  ) {
    return null;
  }

  return {
    id:
      "RISK-TOP-THREE",

    type:
      "TOP_THREE_CONCENTRATION",

    severity:
      limit.status ===
        "BREACHED"
        ? "HIGH"
        : "MEDIUM",

    status:
      limit.status,

    label:
      "Top Three Holdings",

    currentValue:
      topThreePercentage,

    limitValue:
      limit.limitValue,

    usagePercentage:
      limit.usagePercentage,

    message:
      limit.status ===
        "BREACHED"
        ? `The top three holdings represent ${topThreePercentage.toFixed(
            2
          )}% of the portfolio and exceed the ${limit.limitValue.toFixed(
            2
          )}% concentration limit.`
        : `The top three holdings have reached ${limit.usagePercentage.toFixed(
            2
          )}% of the configured concentration limit.`
  };
}

function highestSeverity(
  alerts = []
) {
  if (
    alerts.some(
      (item) =>
        item?.severity ===
        "HIGH"
    )
  ) {
    return "HIGH";
  }

  if (
    alerts.some(
      (item) =>
        item?.severity ===
        "MEDIUM"
    )
  ) {
    return "MEDIUM";
  }

  if (
    alerts.length
  ) {
    return "LOW";
  }

  return "NONE";
}

/*
 * ============================================================
 * PC-020B
 * PORTFOLIO CONCENTRATION ANALYSIS
 * ============================================================
 *
 * Calculates:
 *
 * - single-holding concentration,
 * - top-three, top-five and top-ten concentration,
 * - holding HHI,
 * - effective number of holdings,
 * - sector concentration,
 * - sector HHI,
 * - effective number of sectors,
 * - risk-limit warnings and breaches.
 *
 * This service does not modify holdings or risk limits.
 */

export async function buildPortfolioConcentrationAnalysis() {
  const [
    allocation,
    configuration
  ] = await Promise.all([
    buildCurrentPortfolioAllocation(),

    getOrCreateRiskConfiguration()
  ]);

  if (
    !allocation ||
    allocation?.status ===
      "NO_PORTFOLIO" ||
    allocation?.status ===
      "EMPTY_PORTFOLIO"
  ) {
    return buildEmptyAnalysis({
      allocation,
      configuration,

      message:
        "A funded Practice Portfolio is required before concentration risk can be calculated."
    });
  }

  const limits =
    configuration?.limits ||
    {};

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

  const rawHoldings =
    Array.isArray(
      allocation?.holdings
    )
      ? allocation.holdings
      : [];

  const holdings =
    rawHoldings
      .map(
        (holding) => {
          const allocationPercentage =
            roundPercent(
              holding
                ?.allocationPercentage
            );

          const limit =
            buildLimitResult({
              currentValue:
                allocationPercentage,

              limitValue:
                limits
                  ?.maximumSingleHoldingPercentage,

              warningThreshold,

              criticalThreshold
            });

          return {
            symbol:
              normalizeSymbol(
                holding?.symbol
              ),

            name:
              holding?.name ||
              holding?.symbol ||
              "Unknown",

            sector:
              normalizeSector(
                holding?.sector
              ),

            quantity:
              number(
                holding?.quantity
              ),

            marketPrice:
              roundMoney(
                holding?.marketPrice
              ),

            marketValue:
              roundMoney(
                holding?.marketValue
              ),

            allocationPercentage,

            equityAllocationPercentage:
              roundPercent(
                holding
                  ?.equityAllocationPercentage
              ),

            limit
          };
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          b.allocationPercentage -
          a.allocationPercentage
      );

  const rawSectors =
    Array.isArray(
      allocation?.sectors
    )
      ? allocation.sectors
      : [];

  const sectors =
    rawSectors
      .map(
        (sector) => {
          const percentage =
            roundPercent(
              sector?.percentage
            );

          const limit =
            buildLimitResult({
              currentValue:
                percentage,

              limitValue:
                limits
                  ?.maximumSectorPercentage,

              warningThreshold,

              criticalThreshold
            });

          return {
            sector:
              normalizeSector(
                sector?.sector
              ),

            value:
              roundMoney(
                sector?.value
              ),

            percentage,

            equityPercentage:
              roundPercent(
                sector
                  ?.equityPercentage
              ),

            holdingsCount:
              number(
                sector
                  ?.holdingsCount
              ),

            symbols:
              Array.isArray(
                sector?.symbols
              )
                ? sector.symbols
                    .map(
                      normalizeSymbol
                    )
                    .filter(Boolean)
                : [],

            limit
          };
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          b.percentage -
          a.percentage
      );

  const topThreePercentage =
    roundPercent(
      holdings
        .slice(
          0,
          3
        )
        .reduce(
          (
            sum,
            holding
          ) =>
            sum +
            holding
              .allocationPercentage,
          0
        )
    );

  const topFivePercentage =
    roundPercent(
      holdings
        .slice(
          0,
          5
        )
        .reduce(
          (
            sum,
            holding
          ) =>
            sum +
            holding
              .allocationPercentage,
          0
        )
    );

  const topTenPercentage =
    roundPercent(
      holdings
        .slice(
          0,
          10
        )
        .reduce(
          (
            sum,
            holding
          ) =>
            sum +
            holding
              .allocationPercentage,
          0
        )
    );

  const holdingHhi =
    calculateHhi(
      holdings.map(
        (holding) =>
          holding
            .allocationPercentage
      )
    );

  const normalizedHoldingHhi =
    calculateNormalizedHhi({
      hhi:
        holdingHhi,

      itemCount:
        holdings.length
    });

  const effectiveHoldings =
    calculateEffectiveCount(
      holdingHhi
    );

  const sectorHhi =
    calculateHhi(
      sectors.map(
        (sector) =>
          sector.percentage
      )
    );

  const normalizedSectorHhi =
    calculateNormalizedHhi({
      hhi:
        sectorHhi,

      itemCount:
        sectors.length
    });

  const effectiveSectors =
    calculateEffectiveCount(
      sectorHhi
    );

  const topThreeLimit =
    buildLimitResult({
      currentValue:
        topThreePercentage,

      limitValue:
        limits
          ?.maximumTopThreePercentage,

      warningThreshold,

      criticalThreshold
    });

  const holdingAlerts =
    holdings
      .map(
        (holding) =>
          buildHoldingAlert({
            holding,

            limit:
              holding.limit
          })
      )
      .filter(Boolean);

  const sectorAlerts =
    sectors
      .map(
        (sector) =>
          buildSectorAlert({
            sector,

            limit:
              sector.limit
          })
      )
      .filter(Boolean);

  const topThreeAlert =
    buildTopThreeAlert({
      topThreePercentage,

      limit:
        topThreeLimit
    });

  const alerts = [
    ...holdingAlerts,
    ...sectorAlerts,
    ...(
      topThreeAlert
        ? [
            topThreeAlert
          ]
        : []
    )
  ].sort(
    (
      a,
      b
    ) => {
      const severityRank = {
        HIGH:
          3,

        MEDIUM:
          2,

        LOW:
          1
      };

      return (
        number(
          severityRank[
            b?.severity
          ]
        ) -
        number(
          severityRank[
            a?.severity
          ]
        )
      );
    }
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

  const totalChecks =
    holdings.length +
    sectors.length +
    1;

  const withinLimit =
    Math.max(
      totalChecks -
      breached -
      warnings,
      0
    );

  const status =
    breached > 0
      ? "LIMIT_BREACH"
      : warnings > 0
      ? "WARNING"
      : "WITHIN_LIMITS";

  const message =
    status ===
      "LIMIT_BREACH"
      ? `${breached} concentration limit breach(es) require review.`
      : status ===
        "WARNING"
      ? `${warnings} concentration warning(s) are approaching configured limits.`
      : "Portfolio concentration is within the configured risk limits.";

  return {
    generatedAt:
      new Date().toISOString(),

    status,

    message,

    allocation,

    configuration,

    portfolio: {
      totalValue:
        roundMoney(
          allocation
            ?.portfolio
            ?.totalValue
        ),

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
        holdings.length,

      sectorCount:
        sectors.length
    },

    concentration: {
      largestHolding:
        holdings[0] ||
        null,

      largestHoldingPercentage:
        holdings[0]
          ?.allocationPercentage ||
        0,

      topThreePercentage,

      topFivePercentage,

      topTenPercentage,

      topThreeLimit,

      hhi:
        holdingHhi,

      normalizedHhi:
        normalizedHoldingHhi,

      effectiveHoldings
    },

    sectorConcentration: {
      largestSector:
        sectors[0] ||
        null,

      largestSectorPercentage:
        sectors[0]
          ?.percentage ||
        0,

      hhi:
        sectorHhi,

      normalizedHhi:
        normalizedSectorHhi,

      effectiveSectors,

      sectorCount:
        sectors.length
    },

    holdings,

    sectors,

    alerts,

    summary: {
      totalChecks,

      breached,

      warnings,

      withinLimit,

      highestSeverity:
        highestSeverity(
          alerts
        )
    }
  };
}

/*
 * ============================================================
 * CONCENTRATION ALERT FILTERS
 * ============================================================
 */

export async function loadConcentrationAlerts() {
  const analysis =
    await buildPortfolioConcentrationAnalysis();

  return analysis.alerts;
}

export async function loadConcentrationBreaches() {
  const analysis =
    await buildPortfolioConcentrationAnalysis();

  return analysis.alerts.filter(
    (item) =>
      item?.status ===
      "BREACHED"
  );
}

export async function loadConcentrationWarnings() {
  const analysis =
    await buildPortfolioConcentrationAnalysis();

  return analysis.alerts.filter(
    (item) =>
      item?.status ===
      "WARNING"
  );
}

export async function loadLargestPortfolioExposures(
  limit = 5
) {
  const analysis =
    await buildPortfolioConcentrationAnalysis();

  const safeLimit =
    Math.max(
      Math.floor(
        number(
          limit
        )
      ),
      0
    );

  return analysis.holdings.slice(
    0,
    safeLimit
  );
}