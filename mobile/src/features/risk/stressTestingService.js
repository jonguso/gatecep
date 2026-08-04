import {
  buildCurrentPortfolioAllocation
} from "../rebalancing/allocationEngine";

import {
  buildPortfolioConcentrationAnalysis
} from "./concentrationAnalysisService";

import {
  getOrCreateRiskConfiguration
} from "./riskStore";

function number(value) {
  const parsed =
    Number(
      value ?? 0
    );

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
  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
}

function normalizeSector(value) {
  const text =
    String(
      value || "Unknown"
    ).trim();

  return text || "Unknown";
}

function normalizeScenarioCode(value) {
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

function percentageLoss({
  value,
  shockPercentage
}) {
  return roundMoney(
    number(value) *
      (
        Math.abs(
          number(
            shockPercentage
          )
        ) /
        100
      )
  );
}

function portfolioLossPercentage({
  lossAmount,
  portfolioValue
}) {
  const total =
    number(
      portfolioValue
    );

  if (
    total <= 0
  ) {
    return 0;
  }

  return roundPercent(
    (
      number(
        lossAmount
      ) /
      total
    ) *
      100
  );
}

function buildScenarioId(
  code
) {
  return `STRESS-${normalizeScenarioCode(
    code
  )}`;
}

function getSeverity(
  lossPercentage
) {
  const loss =
    Math.abs(
      number(
        lossPercentage
      )
    );

  if (
    loss >= 20
  ) {
    return "CRITICAL";
  }

  if (
    loss >= 10
  ) {
    return "HIGH";
  }

  if (
    loss >= 5
  ) {
    return "MEDIUM";
  }

  if (
    loss > 0
  ) {
    return "LOW";
  }

  return "NONE";
}

function buildEmptyStressResult({
  allocation,
  configuration,
  message
}) {
  return {
    generatedAt:
      new Date()
        .toISOString(),

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

    scenarios: [],

    summary: {
      totalScenarios:
        0,

      critical:
        0,

      high:
        0,

      medium:
        0,

      low:
        0,

      largestLossAmount:
        0,

      largestLossPercentage:
        0,

      worstScenario:
        null
    }
  };
}

/*
 * ============================================================
 * MARKET SHOCK
 * ============================================================
 */

function buildMarketShockScenario({
  allocation,
  shockPercentage
}) {
  const portfolioValue =
    number(
      allocation
        ?.portfolio
        ?.totalValue
    );

  const holdingsValue =
    number(
      allocation
        ?.portfolio
        ?.holdingsValue
    );

  const availableCash =
    number(
      allocation
        ?.portfolio
        ?.availableCash
    );

  const lossAmount =
    percentageLoss({
      value:
        holdingsValue,

      shockPercentage
    });

  const stressedHoldingsValue =
    roundMoney(
      holdingsValue -
      lossAmount
    );

  const stressedPortfolioValue =
    roundMoney(
      stressedHoldingsValue +
      availableCash
    );

  const lossPercentage =
    portfolioLossPercentage({
      lossAmount,
      portfolioValue
    });

  const holdingImpacts =
    (
      Array.isArray(
        allocation?.holdings
      )
        ? allocation.holdings
        : []
    )
      .map(
        (holding) => {
          const currentValue =
            number(
              holding
                ?.marketValue
            );

          const holdingLoss =
            percentageLoss({
              value:
                currentValue,

              shockPercentage
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

            currentValue:
              roundMoney(
                currentValue
              ),

            shockPercentage:
              -Math.abs(
                number(
                  shockPercentage
                )
              ),

            lossAmount:
              holdingLoss,

            stressedValue:
              roundMoney(
                currentValue -
                holdingLoss
              ),

            contributionPercentage:
              lossAmount > 0
                ? roundPercent(
                    (
                      holdingLoss /
                      lossAmount
                    ) *
                      100
                  )
                : 0
          };
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          b.lossAmount -
          a.lossAmount
      );

  return {
    id:
      buildScenarioId(
        `MARKET_DECLINE_${shockPercentage}`
      ),

    scenarioType:
      "MARKET_SHOCK",

    code:
      `MARKET_DECLINE_${shockPercentage}`,

    label:
      `Market decline ${Math.abs(
        number(
          shockPercentage
        )
      )}%`,

    description:
      `Applies a ${Math.abs(
        number(
          shockPercentage
        )
      )}% decline to all equity holdings while leaving cash unchanged.`,

    severity:
      getSeverity(
        lossPercentage
      ),

    assumptions: {
      marketShockPercentage:
        -Math.abs(
          number(
            shockPercentage
          )
        ),

      cashShockPercentage:
        0
    },

    currentPortfolioValue:
      roundMoney(
        portfolioValue
      ),

    stressedPortfolioValue,

    lossAmount,

    lossPercentage,

    holdingsValueBefore:
      roundMoney(
        holdingsValue
      ),

    holdingsValueAfter:
      stressedHoldingsValue,

    cashBefore:
      roundMoney(
        availableCash
      ),

    cashAfter:
      roundMoney(
        availableCash
      ),

    largestContributor:
      holdingImpacts[0] ||
      null,

    holdingImpacts,

    sectorImpacts:
      []
  };
}

/*
 * ============================================================
 * SECTOR SHOCK
 * ============================================================
 */

function buildSectorShockScenario({
  allocation,
  sector,
  shockPercentage
}) {
  const normalizedSector =
    normalizeSector(
      sector
    );

  const portfolioValue =
    number(
      allocation
        ?.portfolio
        ?.totalValue
    );

  const holdingsValue =
    number(
      allocation
        ?.portfolio
        ?.holdingsValue
    );

  const availableCash =
    number(
      allocation
        ?.portfolio
        ?.availableCash
    );

  const affectedHoldings =
    (
      Array.isArray(
        allocation?.holdings
      )
        ? allocation.holdings
        : []
    ).filter(
      (holding) =>
        normalizeSector(
          holding?.sector
        ).toUpperCase() ===
        normalizedSector.toUpperCase()
    );

  const sectorValue =
    roundMoney(
      affectedHoldings.reduce(
        (
          sum,
          holding
        ) =>
          sum +
          number(
            holding
              ?.marketValue
          ),
        0
      )
    );

  const lossAmount =
    percentageLoss({
      value:
        sectorValue,

      shockPercentage
    });

  const stressedHoldingsValue =
    roundMoney(
      holdingsValue -
      lossAmount
    );

  const stressedPortfolioValue =
    roundMoney(
      stressedHoldingsValue +
      availableCash
    );

  const lossPercentage =
    portfolioLossPercentage({
      lossAmount,
      portfolioValue
    });

  const holdingImpacts =
    affectedHoldings
      .map(
        (holding) => {
          const currentValue =
            number(
              holding
                ?.marketValue
            );

          const holdingLoss =
            percentageLoss({
              value:
                currentValue,

              shockPercentage
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
              normalizedSector,

            currentValue:
              roundMoney(
                currentValue
              ),

            shockPercentage:
              -Math.abs(
                number(
                  shockPercentage
                )
              ),

            lossAmount:
              holdingLoss,

            stressedValue:
              roundMoney(
                currentValue -
                holdingLoss
              ),

            contributionPercentage:
              lossAmount > 0
                ? roundPercent(
                    (
                      holdingLoss /
                      lossAmount
                    ) *
                      100
                  )
                : 0
          };
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          b.lossAmount -
          a.lossAmount
      );

  return {
    id:
      buildScenarioId(
        `SECTOR_${normalizedSector}_${shockPercentage}`
      ),

    scenarioType:
      "SECTOR_SHOCK",

    code:
      `SECTOR_${normalizeScenarioCode(
        normalizedSector
      )}_${shockPercentage}`,

    label:
      `${normalizedSector} sector decline ${Math.abs(
        number(
          shockPercentage
        )
      )}%`,

    description:
      `Applies a ${Math.abs(
        number(
          shockPercentage
        )
      )}% decline only to holdings in the ${normalizedSector} sector.`,

    severity:
      getSeverity(
        lossPercentage
      ),

    assumptions: {
      affectedSector:
        normalizedSector,

      sectorShockPercentage:
        -Math.abs(
          number(
            shockPercentage
          )
        )
    },

    currentPortfolioValue:
      roundMoney(
        portfolioValue
      ),

    stressedPortfolioValue,

    lossAmount,

    lossPercentage,

    holdingsValueBefore:
      roundMoney(
        holdingsValue
      ),

    holdingsValueAfter:
      stressedHoldingsValue,

    cashBefore:
      roundMoney(
        availableCash
      ),

    cashAfter:
      roundMoney(
        availableCash
      ),

    largestContributor:
      holdingImpacts[0] ||
      null,

    holdingImpacts,

    sectorImpacts: [
      {
        sector:
          normalizedSector,

        currentValue:
          sectorValue,

        shockPercentage:
          -Math.abs(
            number(
              shockPercentage
            )
          ),

        lossAmount,

        stressedValue:
          roundMoney(
            sectorValue -
            lossAmount
          )
      }
    ]
  };
}

/*
 * ============================================================
 * SINGLE-HOLDING SHOCK
 * ============================================================
 */

function buildSingleHoldingShockScenario({
  allocation,
  holding,
  shockPercentage
}) {
  const portfolioValue =
    number(
      allocation
        ?.portfolio
        ?.totalValue
    );

  const holdingsValue =
    number(
      allocation
        ?.portfolio
        ?.holdingsValue
    );

  const availableCash =
    number(
      allocation
        ?.portfolio
        ?.availableCash
    );

  const currentValue =
    number(
      holding
        ?.marketValue
    );

  const lossAmount =
    percentageLoss({
      value:
        currentValue,

      shockPercentage
    });

  const stressedPortfolioValue =
    roundMoney(
      portfolioValue -
      lossAmount
    );

  const lossPercentage =
    portfolioLossPercentage({
      lossAmount,
      portfolioValue
    });

  const impact = {
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

    currentValue:
      roundMoney(
        currentValue
      ),

    shockPercentage:
      -Math.abs(
        number(
          shockPercentage
        )
      ),

    lossAmount,

    stressedValue:
      roundMoney(
        currentValue -
        lossAmount
      ),

    contributionPercentage:
      lossAmount > 0
        ? 100
        : 0
  };

  return {
    id:
      buildScenarioId(
        `HOLDING_${holding?.symbol}_${shockPercentage}`
      ),

    scenarioType:
      "SINGLE_HOLDING_SHOCK",

    code:
      `HOLDING_${normalizeSymbol(
        holding?.symbol
      )}_${shockPercentage}`,

    label:
      `${normalizeSymbol(
        holding?.symbol
      )} decline ${Math.abs(
        number(
          shockPercentage
        )
      )}%`,

    description:
      `Applies a ${Math.abs(
        number(
          shockPercentage
        )
      )}% decline only to ${normalizeSymbol(
        holding?.symbol
      )}.`,

    severity:
      getSeverity(
        lossPercentage
      ),

    assumptions: {
      affectedSymbol:
        normalizeSymbol(
          holding?.symbol
        ),

      holdingShockPercentage:
        -Math.abs(
          number(
            shockPercentage
          )
        )
    },

    currentPortfolioValue:
      roundMoney(
        portfolioValue
      ),

    stressedPortfolioValue,

    lossAmount,

    lossPercentage,

    holdingsValueBefore:
      roundMoney(
        holdingsValue
      ),

    holdingsValueAfter:
      roundMoney(
        holdingsValue -
        lossAmount
      ),

    cashBefore:
      roundMoney(
        availableCash
      ),

    cashAfter:
      roundMoney(
        availableCash
      ),

    largestContributor:
      impact,

    holdingImpacts: [
      impact
    ],

    sectorImpacts: []
  };
}

/*
 * ============================================================
 * INFLATION SHOCK
 * ============================================================
 */

function buildInflationShockScenario({
  allocation,
  shockPercentage
}) {
  const portfolioValue =
    number(
      allocation
        ?.portfolio
        ?.totalValue
    );

  const holdingsValue =
    number(
      allocation
        ?.portfolio
        ?.holdingsValue
    );

  const availableCash =
    number(
      allocation
        ?.portfolio
        ?.availableCash
    );

  /*
   * Inflation is represented as purchasing-power erosion.
   * No portfolio units or cash balances are changed.
   */
  const purchasingPowerLoss =
    percentageLoss({
      value:
        portfolioValue,

      shockPercentage
    });

  const realValueAfter =
    roundMoney(
      portfolioValue -
      purchasingPowerLoss
    );

  const lossPercentage =
    portfolioLossPercentage({
      lossAmount:
        purchasingPowerLoss,

      portfolioValue
    });

  return {
    id:
      buildScenarioId(
        `INFLATION_${shockPercentage}`
      ),

    scenarioType:
      "INFLATION_SHOCK",

    code:
      `INFLATION_${shockPercentage}`,

    label:
      `Inflation shock ${Math.abs(
        number(
          shockPercentage
        )
      )}%`,

    description:
      "Estimates the reduction in portfolio purchasing power. Nominal holdings and cash balances remain unchanged.",

    severity:
      getSeverity(
        lossPercentage
      ),

    assumptions: {
      inflationShockPercentage:
        Math.abs(
          number(
            shockPercentage
          )
        ),

      nominalPortfolioValueUnchanged:
        true
    },

    currentPortfolioValue:
      roundMoney(
        portfolioValue
      ),

    stressedPortfolioValue:
      realValueAfter,

    nominalPortfolioValueAfter:
      roundMoney(
        portfolioValue
      ),

    lossAmount:
      purchasingPowerLoss,

    lossPercentage,

    holdingsValueBefore:
      roundMoney(
        holdingsValue
      ),

    holdingsValueAfter:
      roundMoney(
        holdingsValue
      ),

    cashBefore:
      roundMoney(
        availableCash
      ),

    cashAfter:
      roundMoney(
        availableCash
      ),

    largestContributor:
      null,

    holdingImpacts: [],

    sectorImpacts: []
  };
}

/*
 * ============================================================
 * INTEREST-RATE SHOCK
 * ============================================================
 */

function sectorRateSensitivity(
  sector
) {
  const normalized =
    normalizeSector(
      sector
    ).toUpperCase();

  if (
    normalized.includes(
      "BANK"
    ) ||
    normalized.includes(
      "FINANC"
    ) ||
    normalized.includes(
      "INSURANCE"
    )
  ) {
    return -0.35;
  }

  if (
    normalized.includes(
      "REAL ESTATE"
    ) ||
    normalized.includes(
      "REIT"
    )
  ) {
    return -1.25;
  }

  if (
    normalized.includes(
      "UTILITY"
    ) ||
    normalized.includes(
      "ENERGY"
    )
  ) {
    return -0.65;
  }

  if (
    normalized.includes(
      "CONSUMER"
    ) ||
    normalized.includes(
      "AGRICULT"
    )
  ) {
    return -0.40;
  }

  return -0.50;
}

function buildInterestRateShockScenario({
  allocation,
  shockPercentage
}) {
  const portfolioValue =
    number(
      allocation
        ?.portfolio
        ?.totalValue
    );

  const holdingsValue =
    number(
      allocation
        ?.portfolio
        ?.holdingsValue
    );

  const availableCash =
    number(
      allocation
        ?.portfolio
        ?.availableCash
    );

  const rateShock =
    Math.abs(
      number(
        shockPercentage
      )
    );

  const holdingImpacts =
    (
      Array.isArray(
        allocation?.holdings
      )
        ? allocation.holdings
        : []
    )
      .map(
        (holding) => {
          const currentValue =
            number(
              holding
                ?.marketValue
            );

          const sensitivity =
            sectorRateSensitivity(
              holding?.sector
            );

          const estimatedPriceChangePercentage =
            roundPercent(
              sensitivity *
              rateShock
            );

          const holdingLoss =
            estimatedPriceChangePercentage <
              0
              ? percentageLoss({
                  value:
                    currentValue,

                  shockPercentage:
                    Math.abs(
                      estimatedPriceChangePercentage
                    )
                })
              : 0;

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

            currentValue:
              roundMoney(
                currentValue
              ),

            rateSensitivity:
              sensitivity,

            rateShockPercentage:
              rateShock,

            estimatedPriceChangePercentage,

            lossAmount:
              holdingLoss,

            stressedValue:
              roundMoney(
                currentValue -
                holdingLoss
              )
          };
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          b.lossAmount -
          a.lossAmount
      );

  const lossAmount =
    roundMoney(
      holdingImpacts.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.lossAmount,
        0
      )
    );

  const lossPercentage =
    portfolioLossPercentage({
      lossAmount,
      portfolioValue
    });

  return {
    id:
      buildScenarioId(
        `INTEREST_RATE_${shockPercentage}`
      ),

    scenarioType:
      "INTEREST_RATE_SHOCK",

    code:
      `INTEREST_RATE_${shockPercentage}`,

    label:
      `Interest-rate increase ${rateShock}%`,

    description:
      "Applies simplified sector sensitivity assumptions to estimate the impact of an interest-rate increase.",

    severity:
      getSeverity(
        lossPercentage
      ),

    assumptions: {
      interestRateShockPercentage:
        rateShock,

      model:
        "SIMPLIFIED_SECTOR_SENSITIVITY",

      note:
        "This is a planning estimate and not a duration-based fixed-income model."
    },

    currentPortfolioValue:
      roundMoney(
        portfolioValue
      ),

    stressedPortfolioValue:
      roundMoney(
        portfolioValue -
        lossAmount
      ),

    lossAmount,

    lossPercentage,

    holdingsValueBefore:
      roundMoney(
        holdingsValue
      ),

    holdingsValueAfter:
      roundMoney(
        holdingsValue -
        lossAmount
      ),

    cashBefore:
      roundMoney(
        availableCash
      ),

    cashAfter:
      roundMoney(
        availableCash
      ),

    largestContributor:
      holdingImpacts[0] ||
      null,

    holdingImpacts,

    sectorImpacts: []
  };
}

/*
 * ============================================================
 * CUSTOM SCENARIO
 * ============================================================
 */

export async function buildCustomStressScenario({
  label =
    "Custom stress scenario",

  marketShockPercentage =
    0,

  sectorShocks =
    {},

  holdingShocks =
    {},

  cashShockPercentage =
    0
} = {}) {
  const allocation =
    await buildCurrentPortfolioAllocation();

  if (
    !allocation ||
    allocation?.status ===
      "NO_PORTFOLIO" ||
    allocation?.status ===
      "EMPTY_PORTFOLIO"
  ) {
    throw new Error(
      "A funded Practice Portfolio is required before a custom stress scenario can be calculated."
    );
  }

  const portfolioValue =
    number(
      allocation
        ?.portfolio
        ?.totalValue
    );

  const availableCash =
    number(
      allocation
        ?.portfolio
        ?.availableCash
    );

  const holdingImpacts =
    (
      Array.isArray(
        allocation?.holdings
      )
        ? allocation.holdings
        : []
    )
      .map(
        (holding) => {
          const symbol =
            normalizeSymbol(
              holding?.symbol
            );

          const sector =
            normalizeSector(
              holding?.sector
            );

          const holdingSpecificShock =
            number(
              holdingShocks[
                symbol
              ]
            );

          const sectorSpecificShock =
            number(
              sectorShocks[
                sector
              ] ??
              sectorShocks[
                sector.toUpperCase()
              ]
            );

          const appliedShock =
            holdingSpecificShock !==
              0
              ? holdingSpecificShock
              : sectorSpecificShock !==
                  0
                ? sectorSpecificShock
                : marketShockPercentage;

          const currentValue =
            number(
              holding
                ?.marketValue
            );

          const lossAmount =
            appliedShock < 0
              ? percentageLoss({
                  value:
                    currentValue,

                  shockPercentage:
                    Math.abs(
                      appliedShock
                    )
                })
              : 0;

          const gainAmount =
            appliedShock > 0
              ? percentageLoss({
                  value:
                    currentValue,

                  shockPercentage:
                    appliedShock
                })
              : 0;

          return {
            symbol,

            name:
              holding?.name ||
              symbol,

            sector,

            currentValue:
              roundMoney(
                currentValue
              ),

            shockPercentage:
              roundPercent(
                appliedShock
              ),

            lossAmount,

            gainAmount,

            stressedValue:
              roundMoney(
                currentValue -
                lossAmount +
                gainAmount
              )
          };
        }
      );

  const cashLoss =
    cashShockPercentage < 0
      ? percentageLoss({
          value:
            availableCash,

          shockPercentage:
            Math.abs(
              cashShockPercentage
            )
        })
      : 0;

  const cashGain =
    cashShockPercentage > 0
      ? percentageLoss({
          value:
            availableCash,

          shockPercentage:
            cashShockPercentage
        })
      : 0;

  const stressedHoldingsValue =
    roundMoney(
      holdingImpacts.reduce(
        (
          sum,
          item
        ) =>
          sum +
          item.stressedValue,
        0
      )
    );

  const stressedCash =
    roundMoney(
      availableCash -
      cashLoss +
      cashGain
    );

  const stressedPortfolioValue =
    roundMoney(
      stressedHoldingsValue +
      stressedCash
    );

  const netLossAmount =
    roundMoney(
      Math.max(
        portfolioValue -
        stressedPortfolioValue,
        0
      )
    );

  const netGainAmount =
    roundMoney(
      Math.max(
        stressedPortfolioValue -
        portfolioValue,
        0
      )
    );

  const lossPercentage =
    portfolioLossPercentage({
      lossAmount:
        netLossAmount,

      portfolioValue
    });

  return {
    id:
      buildScenarioId(
        `CUSTOM_${Date.now()}`
      ),

    scenarioType:
      "CUSTOM",

    code:
      "CUSTOM",

    label,

    description:
      "User-defined combination of market, sector, holding, and cash shocks.",

    severity:
      getSeverity(
        lossPercentage
      ),

    assumptions: {
      marketShockPercentage:
        number(
          marketShockPercentage
        ),

      sectorShocks,

      holdingShocks,

      cashShockPercentage:
        number(
          cashShockPercentage
        )
    },

    currentPortfolioValue:
      roundMoney(
        portfolioValue
      ),

    stressedPortfolioValue,

    lossAmount:
      netLossAmount,

    gainAmount:
      netGainAmount,

    lossPercentage,

    holdingsValueBefore:
      roundMoney(
        allocation
          ?.portfolio
          ?.holdingsValue
      ),

    holdingsValueAfter:
      stressedHoldingsValue,

    cashBefore:
      roundMoney(
        availableCash
      ),

    cashAfter:
      stressedCash,

    largestContributor:
      [...holdingImpacts]
        .sort(
          (
            a,
            b
          ) =>
            b.lossAmount -
            a.lossAmount
        )[0] ||
      null,

    holdingImpacts,

    sectorImpacts: []
  };
}

/*
 * ============================================================
 * PC-020D
 * PORTFOLIO STRESS TEST ENGINE
 * ============================================================
 *
 * Produces non-executing scenario estimates for:
 *
 * - broad market declines,
 * - largest-sector shock,
 * - all-sector shocks,
 * - largest-holding shock,
 * - inflation shock,
 * - interest-rate shock.
 *
 * No portfolio or cash records are modified.
 */

export async function buildPortfolioStressTests() {
  const [
    allocation,
    configuration,
    concentration
  ] = await Promise.all([
    buildCurrentPortfolioAllocation(),

    getOrCreateRiskConfiguration(),

    buildPortfolioConcentrationAnalysis()
  ]);

  if (
    !allocation ||
    allocation?.status ===
      "NO_PORTFOLIO" ||
    allocation?.status ===
      "EMPTY_PORTFOLIO"
  ) {
    return buildEmptyStressResult({
      allocation,
      configuration,

      message:
        "A funded Practice Portfolio is required before stress testing can be calculated."
    });
  }

  if (
    configuration
      ?.stressTesting
      ?.enabled ===
    false
  ) {
    return buildEmptyStressResult({
      allocation,
      configuration,

      message:
        "Portfolio stress testing is disabled in the active risk configuration."
    });
  }

  const settings =
    configuration
      ?.stressTesting ||
    {};

  const marketDeclines =
    Array.isArray(
      settings
        ?.marketDeclinePercentages
    )
      ? settings
          .marketDeclinePercentages
          .map(
            (value) =>
              Math.abs(
                number(
                  value
                )
              )
          )
          .filter(
            (value) =>
              value > 0
          )
      : [
          5,
          10,
          20
        ];

  const sectorShockPercentage =
    Math.abs(
      number(
        settings
          ?.sectorShockPercentage ||
        15
      )
    );

  const singleHoldingShockPercentage =
    Math.abs(
      number(
        settings
          ?.singleHoldingShockPercentage ||
        20
      )
    );

  const inflationShockPercentage =
    Math.abs(
      number(
        settings
          ?.inflationShockPercentage ||
        5
      )
    );

  const interestRateShockPercentage =
    Math.abs(
      number(
        settings
          ?.interestRateShockPercentage ||
        2
      )
    );

  const scenarios = [];

  marketDeclines.forEach(
    (shockPercentage) => {
      scenarios.push(
        buildMarketShockScenario({
          allocation,
          shockPercentage
        })
      );
    }
  );

  const sectors =
    Array.isArray(
      allocation?.sectors
    )
      ? allocation.sectors
      : [];

  sectors.forEach(
    (sector) => {
      scenarios.push(
        buildSectorShockScenario({
          allocation,

          sector:
            sector?.sector,

          shockPercentage:
            sectorShockPercentage
        })
      );
    }
  );

  const largestHolding =
    concentration
      ?.concentration
      ?.largestHolding ||
    allocation
      ?.holdings?.[0] ||
    null;

  if (
    largestHolding
  ) {
    scenarios.push(
      buildSingleHoldingShockScenario({
        allocation,

        holding:
          largestHolding,

        shockPercentage:
          singleHoldingShockPercentage
      })
    );
  }

  scenarios.push(
    buildInflationShockScenario({
      allocation,

      shockPercentage:
        inflationShockPercentage
    })
  );

  scenarios.push(
    buildInterestRateShockScenario({
      allocation,

      shockPercentage:
        interestRateShockPercentage
    })
  );

  const sortedScenarios =
    scenarios.sort(
      (
        a,
        b
      ) =>
        b.lossAmount -
        a.lossAmount
    );

  const critical =
    sortedScenarios.filter(
      (scenario) =>
        scenario
          ?.severity ===
        "CRITICAL"
    ).length;

  const high =
    sortedScenarios.filter(
      (scenario) =>
        scenario
          ?.severity ===
        "HIGH"
    ).length;

  const medium =
    sortedScenarios.filter(
      (scenario) =>
        scenario
          ?.severity ===
        "MEDIUM"
    ).length;

  const low =
    sortedScenarios.filter(
      (scenario) =>
        scenario
          ?.severity ===
        "LOW"
    ).length;

  const worstScenario =
    sortedScenarios[0] ||
    null;

  let status;

  if (
    critical > 0
  ) {
    status =
      "CRITICAL_EXPOSURE";
  } else if (
    high > 0
  ) {
    status =
      "HIGH_EXPOSURE";
  } else if (
    medium > 0
  ) {
    status =
      "MODERATE_EXPOSURE";
  } else {
    status =
      "CONTROLLED";
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    message:
      worstScenario
        ? `The largest modeled loss is KES ${worstScenario.lossAmount.toFixed(
            2
          )} under the ${worstScenario.label} scenario.`
        : "No stress scenarios were generated.",

    allocation,

    configuration,

    concentration,

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
        number(
          allocation
            ?.portfolio
            ?.holdingsCount
        ),

      sectorCount:
        sectors.length
    },

    settings: {
      marketDeclinePercentages:
        marketDeclines,

      sectorShockPercentage,

      singleHoldingShockPercentage,

      inflationShockPercentage,

      interestRateShockPercentage
    },

    scenarios:
      sortedScenarios,

    summary: {
      totalScenarios:
        sortedScenarios.length,

      critical,

      high,

      medium,

      low,

      largestLossAmount:
        worstScenario
          ?.lossAmount ||
        0,

      largestLossPercentage:
        worstScenario
          ?.lossPercentage ||
        0,

      worstScenario:
        worstScenario
          ? {
              id:
                worstScenario.id,

              code:
                worstScenario.code,

              label:
                worstScenario.label,

              scenarioType:
                worstScenario
                  .scenarioType,

              severity:
                worstScenario
                  .severity,

              lossAmount:
                worstScenario
                  .lossAmount,

              lossPercentage:
                worstScenario
                  .lossPercentage,

              stressedPortfolioValue:
                worstScenario
                  .stressedPortfolioValue,

              largestContributor:
                worstScenario
                  .largestContributor
            }
          : null
    }
  };
}

/*
 * ============================================================
 * SCENARIO FILTERS
 * ============================================================
 */

export async function loadMarketStressScenarios() {
  const result =
    await buildPortfolioStressTests();

  return result.scenarios.filter(
    (scenario) =>
      scenario
        ?.scenarioType ===
      "MARKET_SHOCK"
  );
}

export async function loadSectorStressScenarios() {
  const result =
    await buildPortfolioStressTests();

  return result.scenarios.filter(
    (scenario) =>
      scenario
        ?.scenarioType ===
      "SECTOR_SHOCK"
  );
}

export async function loadHighSeverityStressScenarios() {
  const result =
    await buildPortfolioStressTests();

  return result.scenarios.filter(
    (scenario) =>
      [
        "HIGH",
        "CRITICAL"
      ].includes(
        scenario
          ?.severity
      )
  );
}

export async function loadWorstStressScenario() {
  const result =
    await buildPortfolioStressTests();

  return (
    result
      ?.summary
      ?.worstScenario ||
    null
  );
}

/*
 * ============================================================
 * COMPACT SUMMARY
 * ============================================================
 */

export async function buildPortfolioStressTestSummary() {
  const result =
    await buildPortfolioStressTests();

  return {
    generatedAt:
      result.generatedAt,

    status:
      result.status,

    totalScenarios:
      result
        ?.summary
        ?.totalScenarios ||
      0,

    critical:
      result
        ?.summary
        ?.critical ||
      0,

    high:
      result
        ?.summary
        ?.high ||
      0,

    medium:
      result
        ?.summary
        ?.medium ||
      0,

    largestLossAmount:
      result
        ?.summary
        ?.largestLossAmount ||
      0,

    largestLossPercentage:
      result
        ?.summary
        ?.largestLossPercentage ||
      0,

    worstScenario:
      result
        ?.summary
        ?.worstScenario ||
      null,

    message:
      result.message
  };
}