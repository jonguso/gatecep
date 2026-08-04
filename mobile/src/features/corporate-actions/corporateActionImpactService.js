import {
  loadInvestorContext
} from "../investor/investorContextStore";

import {
  getCorporateAction
} from "./corporateActionStore";

import {
  CORPORATE_ACTION_TYPES
} from "./corporateActionTypes";

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

function roundQuantity(value) {
  return Number(
    number(value).toFixed(6)
  );
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function applyFractionalShareTreatment({
  rawQuantity,
  treatment = "ROUND_DOWN"
}) {
  const safeQuantity =
    number(rawQuantity);

  switch (
    String(
      treatment ||
      "ROUND_DOWN"
    ).toUpperCase()
  ) {
    case "ROUND_UP":
      return Math.ceil(
        safeQuantity
      );

    case "ROUND_NEAREST":
      return Math.round(
        safeQuantity
      );

    case "ALLOW_FRACTIONAL":
      return roundQuantity(
        safeQuantity
      );

    case "ROUND_DOWN":
    default:
      return Math.floor(
        safeQuantity
      );
  }
}

function buildUnsupportedResult({
  action,
  holding,
  message
}) {
  return {
    supported:
      false,

    executable:
      false,

    action,

    holding,

    message,

    impact: {
      quantityBefore:
        number(
          holding?.quantity
        ),

      rawQuantityAfter:
        number(
          holding?.quantity
        ),

      quantityAfter:
        number(
          holding?.quantity
        ),

      quantityChange:
        0,

      fractionalQuantity:
        0,

      averagePriceBefore:
        number(
          holding?.averagePrice ||
          holding?.averageCost
        ),

      averagePriceAfter:
        number(
          holding?.averagePrice ||
          holding?.averageCost
        ),

      marketPriceBefore:
        number(
          holding?.marketPrice ||
          holding?.price
        ),

      theoreticalMarketPriceAfter:
        number(
          holding?.marketPrice ||
          holding?.price
        ),

      costValueBefore:
        number(
          holding?.costValue ||
          holding?.investedValue
        ),

      costValueAfter:
        number(
          holding?.costValue ||
          holding?.investedValue
        ),

      marketValueBefore:
        number(
          holding?.marketValue ||
          holding?.value
        ),

      theoreticalMarketValueAfter:
        number(
          holding?.marketValue ||
          holding?.value
        ),

      cashImpact:
        0
    }
  };
}

/*
 * ============================================================
 * PC-018B
 * CORPORATE ACTION IMPACT ENGINE
 * ============================================================
 *
 * Preview only.
 *
 * This service calculates the expected impact of:
 *
 * BONUS_SHARE
 * STOCK_SPLIT
 * REVERSE_SPLIT
 *
 * It does not update the Practice Portfolio.
 */

export async function buildCorporateActionImpact({
  actionId = null,
  corporateAction = null
} = {}) {
  const action =
    corporateAction ||
    (
      actionId
        ? await getCorporateAction(
            actionId
          )
        : null
    );

  if (!action) {
    throw new Error(
      "Corporate action was not found."
    );
  }

  const investorContext =
    await loadInvestorContext();

  const practicePortfolio =
    investorContext
      ?.practicePortfolio ||
    {};

  const holdings =
    Array.isArray(
      practicePortfolio?.holdings
    )
      ? practicePortfolio.holdings
      : [];

  const symbol =
    normalizeSymbol(
      action?.symbol
    );

  const holding =
    holdings.find(
      (item) =>
        normalizeSymbol(
          item?.symbol
        ) ===
        symbol
    ) ||
    null;

  if (!holding) {
    return {
      supported:
        true,

      executable:
        false,

      action,

      holding:
        null,

      message:
        `${symbol} is not currently held in the Practice Portfolio.`,

      impact: {
        quantityBefore:
          0,

        rawQuantityAfter:
          0,

        quantityAfter:
          0,

        quantityChange:
          0,

        fractionalQuantity:
          0,

        averagePriceBefore:
          0,

        averagePriceAfter:
          0,

        marketPriceBefore:
          0,

        theoreticalMarketPriceAfter:
          0,

        costValueBefore:
          0,

        costValueAfter:
          0,

        marketValueBefore:
          0,

        theoreticalMarketValueAfter:
          0,

        cashImpact:
          0
      },

      portfolio: {
        totalValueBefore:
          number(
            practicePortfolio
              ?.totalValue
          ),

        totalValueAfter:
          number(
            practicePortfolio
              ?.totalValue
          )
      }
    };
  }

  const quantityBefore =
    number(
      holding?.quantity
    );

  const averagePriceBefore =
    number(
      holding?.averagePrice ||
      holding?.averageCost
    );

  const marketPriceBefore =
    number(
      holding?.marketPrice ||
      holding?.price
    );

  const costValueBefore =
    roundMoney(
      number(
        holding?.costValue ||
        holding?.investedValue
      ) ||
      quantityBefore *
        averagePriceBefore
    );

  const marketValueBefore =
    roundMoney(
      number(
        holding?.marketValue ||
        holding?.value
      ) ||
      quantityBefore *
        marketPriceBefore
    );

  const ratioNumerator =
    number(
      action?.ratioNumerator
    );

  const ratioDenominator =
    number(
      action?.ratioDenominator
    );

  if (
    ratioNumerator <= 0 ||
    ratioDenominator <= 0
  ) {
    return buildUnsupportedResult({
      action,
      holding,
      message:
        "A valid ratio numerator and denominator are required."
    });
  }

  let rawQuantityAfter =
    quantityBefore;

  let theoreticalMarketPriceAfter =
    marketPriceBefore;

  let averagePriceAfter =
    averagePriceBefore;

  let explanation =
    "";

  switch (
    action?.actionType
  ) {
    case CORPORATE_ACTION_TYPES
      .BONUS_SHARE: {
      /*
       * Example:
       * 1 bonus share for every 10 held.
       *
       * Existing shares remain, and the bonus quantity is added.
       */
      const bonusQuantity =
        quantityBefore *
        (
          ratioNumerator /
          ratioDenominator
        );

      rawQuantityAfter =
        quantityBefore +
        bonusQuantity;

      /*
       * Total historical cost does not change.
       * Cost per share falls because shares increase.
       */
      averagePriceAfter =
        rawQuantityAfter > 0
          ? costValueBefore /
            rawQuantityAfter
          : 0;

      theoreticalMarketPriceAfter =
        rawQuantityAfter > 0
          ? marketValueBefore /
            rawQuantityAfter
          : 0;

      explanation =
        `${ratioNumerator} bonus share(s) for every ${ratioDenominator} share(s) held.`;

      break;
    }

    case CORPORATE_ACTION_TYPES
      .STOCK_SPLIT: {
      /*
       * Example:
       * 2-for-1 split.
       *
       * ratioNumerator = 2
       * ratioDenominator = 1
       */
      rawQuantityAfter =
        quantityBefore *
        (
          ratioNumerator /
          ratioDenominator
        );

      averagePriceAfter =
        rawQuantityAfter > 0
          ? costValueBefore /
            rawQuantityAfter
          : 0;

      theoreticalMarketPriceAfter =
        rawQuantityAfter > 0
          ? marketValueBefore /
            rawQuantityAfter
          : 0;

      explanation =
        `${ratioNumerator}-for-${ratioDenominator} stock split.`;

      break;
    }

    case CORPORATE_ACTION_TYPES
      .REVERSE_SPLIT: {
      /*
       * Example:
       * 1-for-5 reverse split.
       *
       * ratioNumerator = 1
       * ratioDenominator = 5
       */
      rawQuantityAfter =
        quantityBefore *
        (
          ratioNumerator /
          ratioDenominator
        );

      averagePriceAfter =
        rawQuantityAfter > 0
          ? costValueBefore /
            rawQuantityAfter
          : 0;

      theoreticalMarketPriceAfter =
        rawQuantityAfter > 0
          ? marketValueBefore /
            rawQuantityAfter
          : 0;

      explanation =
        `${ratioNumerator}-for-${ratioDenominator} reverse stock split.`;

      break;
    }

    default:
      return buildUnsupportedResult({
        action,
        holding,
        message:
          `${action?.actionType || "This action"} is not supported by PC-018B.`
      });
  }

  const quantityAfter =
    applyFractionalShareTreatment({
      rawQuantity:
        rawQuantityAfter,

      treatment:
        action
          ?.fractionalShareTreatment ||
        "ROUND_DOWN"
    });

  const fractionalQuantity =
    roundQuantity(
      rawQuantityAfter -
      quantityAfter
    );

  /*
   * Preserve total cost basis.
   *
   * When rounding removes fractional shares, average cost is
   * recalculated over the final whole-share quantity.
   */
  const adjustedAveragePriceAfter =
    quantityAfter > 0
      ? roundMoney(
          costValueBefore /
          quantityAfter
        )
      : 0;

  const adjustedTheoreticalMarketPriceAfter =
    quantityAfter > 0
      ? roundMoney(
          marketValueBefore /
          quantityAfter
        )
      : 0;

  const quantityChange =
    roundQuantity(
      quantityAfter -
      quantityBefore
    );

  const costValueAfter =
    roundMoney(
      quantityAfter *
      adjustedAveragePriceAfter
    );

  const theoreticalMarketValueAfter =
    roundMoney(
      quantityAfter *
      adjustedTheoreticalMarketPriceAfter
    );

  const portfolioValueBefore =
    roundMoney(
      practicePortfolio
        ?.totalValue ||
      0
    );

  /*
   * Share adjustments normally preserve economic value.
   *
   * Any tiny variance here is caused only by money rounding.
   */
  const valueDifference =
    roundMoney(
      theoreticalMarketValueAfter -
      marketValueBefore
    );

  const portfolioValueAfter =
    roundMoney(
      portfolioValueBefore +
      valueDifference
    );

  return {
    supported:
      true,

    executable:
      quantityBefore > 0 &&
      quantityAfter >= 0,

    generatedAt:
      new Date()
        .toISOString(),

    action: {
      id:
        action.id,

      actionType:
        action.actionType,

      status:
        action.status,

      symbol,

      companyName:
        action?.companyName ||
        holding?.name ||
        symbol,

      ratioNumerator,

      ratioDenominator,

      ratioLabel:
        `${ratioNumerator}:${ratioDenominator}`,

      fractionalShareTreatment:
        action
          ?.fractionalShareTreatment ||
        "ROUND_DOWN",

      recordDate:
        action?.recordDate ||
        null,

      effectiveDate:
        action?.effectiveDate ||
        null
    },

    holding: {
      symbol,

      companyName:
        holding?.name ||
        symbol,

      sector:
        holding?.sector ||
        null
    },

    impact: {
      quantityBefore,

      rawQuantityAfter:
        roundQuantity(
          rawQuantityAfter
        ),

      quantityAfter,

      quantityChange,

      fractionalQuantity,

      averagePriceBefore:
        roundMoney(
          averagePriceBefore
        ),

      averagePriceAfter:
        adjustedAveragePriceAfter,

      marketPriceBefore:
        roundMoney(
          marketPriceBefore
        ),

      theoreticalMarketPriceAfter:
        adjustedTheoreticalMarketPriceAfter,

      costValueBefore,

      costValueAfter,

      marketValueBefore,

      theoreticalMarketValueAfter,

      valueDifference,

      cashImpact:
        0
    },

    portfolio: {
      totalValueBefore:
        portfolioValueBefore,

      totalValueAfter:
        portfolioValueAfter
    },

    explanation,

    warnings: buildWarnings({
      action,
      quantityBefore,
      rawQuantityAfter,
      quantityAfter,
      fractionalQuantity
    })
  };
}

/*
 * ============================================================
 * BUILD IMPACTS FOR ALL ACTIVE ACTIONS
 * ============================================================
 */

export async function buildCorporateActionImpacts(
  actions = []
) {
  const safeActions =
    Array.isArray(actions)
      ? actions
      : [];

  const results = [];

  for (
    const action of
    safeActions
  ) {
    try {
      const result =
        await buildCorporateActionImpact({
          corporateAction:
            action
        });

      results.push(
        result
      );
    } catch (error) {
      results.push({
        supported:
          false,

        executable:
          false,

        action,

        message:
          error?.message ||
          "Unable to calculate corporate action impact."
      });
    }
  }

  return results;
}

function buildWarnings({
  action,
  quantityBefore,
  rawQuantityAfter,
  quantityAfter,
  fractionalQuantity
}) {
  const warnings = [];

  if (
    quantityBefore <= 0
  ) {
    warnings.push(
      "The current holding quantity is zero."
    );
  }

  if (
    rawQuantityAfter < 0
  ) {
    warnings.push(
      "The calculated quantity cannot be negative."
    );
  }

  if (
    Math.abs(
      fractionalQuantity
    ) > 0.000001
  ) {
    warnings.push(
      `Fractional shares of ${Math.abs(
        fractionalQuantity
      ).toFixed(
        6
      )} will be handled using ${
        action
          ?.fractionalShareTreatment ||
        "ROUND_DOWN"
      }.`
    );
  }

  if (
    quantityAfter === 0 &&
    quantityBefore > 0
  ) {
    warnings.push(
      "This action would reduce the holding to zero shares."
    );
  }

  if (
    action?.status ===
    "EXECUTED"
  ) {
    warnings.push(
      "This corporate action has already been executed."
    );
  }

  return warnings;
}