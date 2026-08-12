import {
  loadCanonicalRealWealthMetrics
} from "../wealth-journey/canonicalRealWealthMetricsService";

function number(value) {
  const parsed =
    Number(
      value ||
      0
    );

  return Number.isFinite(
    parsed
  )
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
  return String(
    value ||
    ""
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

function holdingMarketValue(
  holding = {}
) {
  const storedValue =
    number(
      holding?.marketValue ??
      holding?.value
    );

  if (
    storedValue > 0
  ) {
    return roundMoney(
      storedValue
    );
  }

  const quantity =
    number(
      holding?.quantity
    );

  const marketPrice =
    number(
      holding?.marketPrice ??
      holding?.lastPrice ??
      holding?.price
    );

  return roundMoney(
    quantity *
    marketPrice
  );
}

function holdingCostValue(
  holding = {}
) {
  const storedValue =
    number(
      holding?.costValue ??
      holding?.investedValue
    );

  if (
    storedValue > 0
  ) {
    return roundMoney(
      storedValue
    );
  }

  const quantity =
    number(
      holding?.quantity
    );

  const averagePrice =
    number(
      holding?.averagePrice ??
      holding?.averageCost
    );

  return roundMoney(
    quantity *
    averagePrice
  );
}

function emptyAllocation() {
  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      "NO_PORTFOLIO",

    portfolio: {
      holdingsValue:
        0,

      availableCash:
        0,

      totalValue:
        0,

      investedCost:
        0,

      profitLoss:
        0,

      holdingsCount:
        0
    },

    holdings: [],

    sectors: [],

    assetClasses: [
      {
        key:
          "EQUITY",

        label:
          "Equity",

        value:
          0,

        percentage:
          0
      },

      {
        key:
          "CASH",

        label:
          "Cash",

        value:
          0,

        percentage:
          0
      }
    ],

    concentration: {
      largestHolding:
        null,

      largestHoldingPercentage:
        0,

      topThreePercentage:
        0,

      largestSector:
        null,

      largestSectorPercentage:
        0,

      cashPercentage:
        0
    }
  };
}

/*
 * ============================================================
 * PC-019A
 * PORTFOLIO ALLOCATION ENGINE
 * ============================================================
 *
 * Calculates the current portfolio allocation.
 *
 * This service does not save targets, generate trades, or
 * modify holdings.
 */

export async function buildCurrentPortfolioAllocation() {
  const realMetrics =
    await loadCanonicalRealWealthMetrics();

  /*
   * PC-030C2B2
   *
   * Analytics portfolio source of truth:
   * canonical REAL All Accounts.
   *
   * Practice Portfolio remains available to the investor as
   * an explicit learning portfolio, but is not used by the
   * real portfolio analytics engine.
   *
   * Keep the local variable name practicePortfolio temporarily
   * to preserve the mature allocation calculations below.
   */
  const practicePortfolio =
    realMetrics?.active
      ? {
          id: "REAL-ALL",
          name:
            realMetrics?.sourceLabel ||
            "All Accounts",
          currency: "KES",

          holdings:
            Array.isArray(
              realMetrics?.holdings
            )
              ? realMetrics.holdings
              : [],

          holdingsValue:
            Number(
              realMetrics?.holdingsValue ||
              0
            ),

          investedAmount:
            Number(
              realMetrics?.investedValue ||
              0
            ),

          availableCash:
            Number(
              realMetrics?.availableCash ||
              0
            ),

          totalValue:
            Number(
              realMetrics?.netWorth ||
              0
            ),

          sourceType:
            "REAL",

          sourceId:
            "ALL"
        }
      : null;

  if (!practicePortfolio) {
    return emptyAllocation();
  }

  const rawHoldings =
    Array.isArray(
      practicePortfolio
        ?.holdings
    )
      ? practicePortfolio
          .holdings
      : [];

  const normalizedHoldings =
    rawHoldings
      .filter(
        (holding) =>
          normalizeSymbol(
            holding?.symbol
          ) &&
          number(
            holding?.quantity
          ) > 0
      )
      .map(
        (holding) => {
          const symbol =
            normalizeSymbol(
              holding?.symbol
            );

          const quantity =
            number(
              holding?.quantity
            );

          const marketPrice =
            number(
              holding?.marketPrice ??
              holding?.lastPrice ??
              holding?.price
            );

          const averagePrice =
            number(
              holding?.averagePrice ??
              holding?.averageCost
            );

          const marketValue =
            holdingMarketValue(
              holding
            );

          const costValue =
            holdingCostValue(
              holding
            );

          const profitLoss =
            roundMoney(
              marketValue -
              costValue
            );

          const profitLossPct =
            costValue > 0
              ? roundPercent(
                  (
                    profitLoss /
                    costValue
                  ) *
                  100
                )
              : 0;

          return {
            symbol,

            name:
              holding?.name ||
              holding?.companyName ||
              symbol,

            sector:
              normalizeSector(
                holding?.sector
              ),

            quantity,

            marketPrice:
              roundMoney(
                marketPrice
              ),

            averagePrice:
              roundMoney(
                averagePrice
              ),

            marketValue,

            costValue,

            profitLoss,

            profitLossPct,

            broker:
              holding?.broker ||
              null
          };
        }
      );

  const calculatedHoldingsValue =
    roundMoney(
      normalizedHoldings.reduce(
        (
          sum,
          holding
        ) =>
          sum +
          holding.marketValue,
        0
      )
    );

  const holdingsValue =
    calculatedHoldingsValue > 0
      ? calculatedHoldingsValue
      : roundMoney(
          practicePortfolio
            ?.holdingsValue ||
          practicePortfolio
            ?.investedAmount ||
          0
        );

  const availableCash =
    roundMoney(
      practicePortfolio
        ?.availableCash ||
      0
    );

  const calculatedTotal =
    roundMoney(
      holdingsValue +
      availableCash
    );

  const storedTotal =
    roundMoney(
      practicePortfolio
        ?.totalValue ||
      0
    );

  /*
   * Current allocation must use a consistent denominator.
   * Holdings plus available cash is preferred because those
   * are the components being allocated.
   */
  const totalValue =
    calculatedTotal > 0
      ? calculatedTotal
      : storedTotal;

  const investedCost =
    roundMoney(
      normalizedHoldings.reduce(
        (
          sum,
          holding
        ) =>
          sum +
          holding.costValue,
        0
      )
    );

  const profitLoss =
    roundMoney(
      holdingsValue -
      investedCost
    );

  const holdings =
    normalizedHoldings
      .map(
        (holding) => ({
          ...holding,

          allocationPercentage:
            totalValue > 0
              ? roundPercent(
                  (
                    holding.marketValue /
                    totalValue
                  ) *
                  100
                )
              : 0,

          equityAllocationPercentage:
            holdingsValue > 0
              ? roundPercent(
                  (
                    holding.marketValue /
                    holdingsValue
                  ) *
                  100
                )
              : 0
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.marketValue -
          a.marketValue
      );

  const sectorMap =
    new Map();

  holdings.forEach(
    (holding) => {
      const current =
        sectorMap.get(
          holding.sector
        ) || {
          sector:
            holding.sector,

          value:
            0,

          holdingsCount:
            0,

          symbols:
            []
        };

      current.value =
        roundMoney(
          current.value +
          holding.marketValue
        );

      current.holdingsCount +=
        1;

      current.symbols.push(
        holding.symbol
      );

      sectorMap.set(
        holding.sector,
        current
      );
    }
  );

  const sectors =
    Array.from(
      sectorMap.values()
    )
      .map(
        (sector) => ({
          ...sector,

          percentage:
            totalValue > 0
              ? roundPercent(
                  (
                    sector.value /
                    totalValue
                  ) *
                  100
                )
              : 0,

          equityPercentage:
            holdingsValue > 0
              ? roundPercent(
                  (
                    sector.value /
                    holdingsValue
                  ) *
                  100
                )
              : 0
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.value -
          a.value
      );

  const cashPercentage =
    totalValue > 0
      ? roundPercent(
          (
            availableCash /
            totalValue
          ) *
          100
        )
      : 0;

  const equityPercentage =
    totalValue > 0
      ? roundPercent(
          (
            holdingsValue /
            totalValue
          ) *
          100
        )
      : 0;

  const largestHolding =
    holdings[0] ||
    null;

  const topThreeValue =
    roundMoney(
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
            holding.marketValue,
          0
        )
    );

  const largestSector =
    sectors[0] ||
    null;

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status:
      totalValue > 0
        ? "READY"
        : "EMPTY_PORTFOLIO",

    portfolio: {
      holdingsValue,

      availableCash,

      totalValue,

      investedCost,

      profitLoss,

      profitLossPct:
        investedCost > 0
          ? roundPercent(
              (
                profitLoss /
                investedCost
              ) *
              100
            )
          : 0,

      holdingsCount:
        holdings.length
    },

    holdings,

    sectors,

    assetClasses: [
      {
        key:
          "EQUITY",

        label:
          "Equity",

        value:
          holdingsValue,

        percentage:
          equityPercentage
      },

      {
        key:
          "CASH",

        label:
          "Cash",

        value:
          availableCash,

        percentage:
          cashPercentage
      }
    ],

    concentration: {
      largestHolding:
        largestHolding
          ? {
              symbol:
                largestHolding.symbol,

              name:
                largestHolding.name,

              value:
                largestHolding.marketValue
            }
          : null,

      largestHoldingPercentage:
        largestHolding
          ?.allocationPercentage ||
        0,

      topThreePercentage:
        totalValue > 0
          ? roundPercent(
              (
                topThreeValue /
                totalValue
              ) *
              100
            )
          : 0,

      largestSector:
        largestSector
          ? {
              sector:
                largestSector.sector,

              value:
                largestSector.value
            }
          : null,

      largestSectorPercentage:
        largestSector
          ?.percentage ||
        0,

      cashPercentage
    }
  };
}

/*
 * ============================================================
 * SYMBOL ALLOCATION MAP
 * ============================================================
 */

export async function buildCurrentSymbolAllocationMap() {
  const allocation =
    await buildCurrentPortfolioAllocation();

  return new Map(
    allocation.holdings.map(
      (holding) => [
        holding.symbol,
        {
          symbol:
            holding.symbol,

          name:
            holding.name,

          sector:
            holding.sector,

          value:
            holding.marketValue,

          percentage:
            holding
              .allocationPercentage,

          quantity:
            holding.quantity,

          marketPrice:
            holding.marketPrice
        }
      ]
    )
  );
}

/*
 * ============================================================
 * SECTOR ALLOCATION MAP
 * ============================================================
 */

export async function buildCurrentSectorAllocationMap() {
  const allocation =
    await buildCurrentPortfolioAllocation();

  return new Map(
    allocation.sectors.map(
      (sector) => [
        sector.sector,
        {
          sector:
            sector.sector,

          value:
            sector.value,

          percentage:
            sector.percentage,

          holdingsCount:
            sector.holdingsCount,

          symbols:
            sector.symbols
        }
      ]
    )
  );
}