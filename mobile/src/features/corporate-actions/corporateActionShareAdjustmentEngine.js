import {
  CORPORATE_ACTION_TYPES
} from "./corporateActionModel";

import {
  buildInvestorCorporateActionEntitlement
} from "./investorCorporateActionEntitlementEngine";

/*
 * ============================================================
 * PC-027F
 * CORPORATE ACTION SHARE ADJUSTMENT ENGINE
 * ============================================================
 *
 * Investor-first purpose:
 *
 * Model the expected share-quantity and cost-basis effects of:
 * - bonus issues
 * - stock splits
 * - share consolidations
 * - rights exercised
 * - scrip dividends
 *
 * This prevents GateCEP from confusing mechanical corporate-action
 * changes with investor trading behavior or true investment performance.
 *
 * Safeguards:
 * - projection only
 * - no actual holding mutation
 * - no order/trade history created
 * - no performance gain/loss fabricated
 * ============================================================
 */

export const CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES = Object.freeze({
  BONUS: "BONUS",
  SPLIT: "SPLIT",
  CONSOLIDATION: "CONSOLIDATION",
  RIGHTS_EXERCISE: "RIGHTS_EXERCISE",
  SCRIP_DIVIDEND: "SCRIP_DIVIDEND"
});

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

function round(value, decimals = 6) {
  const parsed = nullableNumber(value);

  return parsed === null
    ? null
    : Number(parsed.toFixed(decimals));
}

function safeNumber(value, fallback = 0) {
  const parsed = nullableNumber(value);

  return parsed === null
    ? fallback
    : parsed;
}

function normalizeHolding(holding = {}) {
  const quantity = nullableNumber(
    holding?.quantity ??
    holding?.currentQuantity
  );

  const averageCost = nullableNumber(
    holding?.averageCost ??
    holding?.averageCostPerShare
  );

  const costBasis = nullableNumber(
    holding?.costBasis
  ) ?? (
    quantity !== null &&
    averageCost !== null
      ? quantity * averageCost
      : null
  );

  return {
    symbol:
      holding?.symbol
        ? String(holding.symbol)
            .trim()
            .toUpperCase()
        : null,

    quantity,
    averageCost,
    costBasis,

    marketPrice:
      nullableNumber(
        holding?.marketPrice ??
        holding?.price
      )
  };
}

function ratioValue(action) {
  const newShares = nullableNumber(
    action?.ratio?.newShares
  );

  const existingShares = nullableNumber(
    action?.ratio?.existingShares
  );

  if (
    !(newShares > 0) ||
    !(existingShares > 0)
  ) {
    return null;
  }

  return newShares / existingShares;
}

export function classifyCorporateActionShareAdjustment(action = {}) {
  switch (action?.type) {
    case CORPORATE_ACTION_TYPES.BONUS_ISSUE:
      return CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.BONUS;

    case CORPORATE_ACTION_TYPES.STOCK_SPLIT:
      return CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.SPLIT;

    case CORPORATE_ACTION_TYPES.SHARE_CONSOLIDATION:
      return CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.CONSOLIDATION;

    case CORPORATE_ACTION_TYPES.RIGHTS_ISSUE:
      return CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.RIGHTS_EXERCISE;

    case CORPORATE_ACTION_TYPES.SCRIP_DIVIDEND:
      return CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.SCRIP_DIVIDEND;

    default:
      return null;
  }
}

export function calculateBonusAdjustment({
  action,
  holding,
  entitlement
} = {}) {
  const normalized =
    normalizeHolding(holding);

  const currentQuantity =
    safeNumber(normalized.quantity);

  const bonusShares =
    safeNumber(
      entitlement
        ?.financialImpact
        ?.expectedShares
    );

  const projectedQuantity =
    currentQuantity +
    bonusShares;

  const projectedAverageCost =
    projectedQuantity > 0 &&
    normalized.costBasis !== null
      ? normalized.costBasis /
        projectedQuantity
      : normalized.averageCost;

  return {
    type:
      CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.BONUS,

    currentQuantity,
    adjustmentQuantity:
      bonusShares,

    projectedQuantity,

    currentCostBasis:
      normalized.costBasis,

    projectedCostBasis:
      normalized.costBasis,

    currentAverageCost:
      normalized.averageCost,

    projectedAverageCost:
      round(
        projectedAverageCost,
        6
      ),

    investorTradeCreated:
      false,

    interpretation:
      "Bonus shares increase quantity while preserving total historical cost basis. The lower per-share average cost is a mechanical adjustment, not an investor purchase."
  };
}

export function calculateSplitAdjustment({
  action,
  holding
} = {}) {
  const normalized =
    normalizeHolding(holding);

  const factor =
    ratioValue(action);

  if (factor === null) {
    return {
      valid:
        false,

      error:
        "VALID_SPLIT_RATIO_REQUIRED"
    };
  }

  const currentQuantity =
    safeNumber(
      normalized.quantity
    );

  const projectedQuantity =
    currentQuantity *
    factor;

  const projectedAverageCost =
    projectedQuantity > 0 &&
    normalized.costBasis !== null
      ? normalized.costBasis /
        projectedQuantity
      : normalized.averageCost;

  return {
    valid:
      true,

    type:
      CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.SPLIT,

    factor,

    currentQuantity,

    adjustmentQuantity:
      projectedQuantity -
      currentQuantity,

    projectedQuantity:
      round(
        projectedQuantity,
        6
      ),

    currentCostBasis:
      normalized.costBasis,

    projectedCostBasis:
      normalized.costBasis,

    currentAverageCost:
      normalized.averageCost,

    projectedAverageCost:
      round(
        projectedAverageCost,
        6
      ),

    investorTradeCreated:
      false,

    interpretation:
      "The split changes share quantity and per-share cost mechanically while preserving total cost basis."
  };
}

export function calculateConsolidationAdjustment({
  action,
  holding
} = {}) {
  const normalized =
    normalizeHolding(holding);

  const factor =
    ratioValue(action);

  if (factor === null) {
    return {
      valid:
        false,

      error:
        "VALID_CONSOLIDATION_RATIO_REQUIRED"
    };
  }

  const currentQuantity =
    safeNumber(
      normalized.quantity
    );

  const projectedQuantity =
    currentQuantity *
    factor;

  const projectedAverageCost =
    projectedQuantity > 0 &&
    normalized.costBasis !== null
      ? normalized.costBasis /
        projectedQuantity
      : normalized.averageCost;

  return {
    valid:
      true,

    type:
      CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.CONSOLIDATION,

    factor,

    currentQuantity,

    adjustmentQuantity:
      projectedQuantity -
      currentQuantity,

    projectedQuantity:
      round(
        projectedQuantity,
        6
      ),

    currentCostBasis:
      normalized.costBasis,

    projectedCostBasis:
      normalized.costBasis,

    currentAverageCost:
      normalized.averageCost,

    projectedAverageCost:
      round(
        projectedAverageCost,
        6
      ),

    investorTradeCreated:
      false,

    interpretation:
      "The consolidation reduces share quantity and increases per-share cost mechanically while preserving total cost basis."
  };
}

export function calculateRightsExerciseAdjustment({
  action,
  holding,
  entitlement,
  exerciseQuantity = null
} = {}) {
  const normalized =
    normalizeHolding(holding);

  const entitledRights =
    nullableNumber(
      entitlement
        ?.financialImpact
        ?.entitledRights
    );

  const quantityToExercise =
    exerciseQuantity === null
      ? entitledRights
      : nullableNumber(
          exerciseQuantity
        );

  if (
    quantityToExercise === null ||
    quantityToExercise < 0
  ) {
    return {
      valid:
        false,

      error:
        "VALID_RIGHTS_EXERCISE_QUANTITY_REQUIRED"
    };
  }

  if (
    entitledRights !== null &&
    quantityToExercise >
      entitledRights
  ) {
    return {
      valid:
        false,

      error:
        "EXERCISE_QUANTITY_EXCEEDS_ENTITLEMENT"
    };
  }

  const subscriptionPrice =
    nullableNumber(
      action?.subscriptionPrice
    );

  if (!(subscriptionPrice > 0)) {
    return {
      valid:
        false,

      error:
        "VALID_SUBSCRIPTION_PRICE_REQUIRED"
    };
  }

  const currentQuantity =
    safeNumber(
      normalized.quantity
    );

  const projectedQuantity =
    currentQuantity +
    quantityToExercise;

  const additionalCost =
    quantityToExercise *
    subscriptionPrice;

  const projectedCostBasis =
    safeNumber(
      normalized.costBasis
    ) +
    additionalCost;

  const projectedAverageCost =
    projectedQuantity > 0
      ? projectedCostBasis /
        projectedQuantity
      : null;

  return {
    valid:
      true,

    type:
      CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.RIGHTS_EXERCISE,

    currentQuantity,

    entitledRights,

    exercisedRights:
      quantityToExercise,

    unexercisedRights:
      entitledRights === null
        ? null
        : entitledRights -
          quantityToExercise,

    adjustmentQuantity:
      quantityToExercise,

    projectedQuantity:
      round(
        projectedQuantity,
        6
      ),

    subscriptionPrice,

    additionalCost:
      round(
        additionalCost,
        2
      ),

    currentCostBasis:
      normalized.costBasis,

    projectedCostBasis:
      round(
        projectedCostBasis,
        2
      ),

    currentAverageCost:
      normalized.averageCost,

    projectedAverageCost:
      round(
        projectedAverageCost,
        6
      ),

    investorTradeCreated:
      false,

    interpretation:
      "Exercised rights add shares and new invested capital. The adjustment should be recorded as a corporate-action election, not inferred as an ordinary market buy."
  };
}

export function calculateScripDividendAdjustment({
  action,
  holding,
  scripShares
} = {}) {
  const normalized =
    normalizeHolding(holding);

  const additionalShares =
    nullableNumber(
      scripShares
    );

  if (
    additionalShares === null ||
    additionalShares < 0
  ) {
    return {
      valid:
        false,

      error:
        "VALID_SCRIP_SHARE_QUANTITY_REQUIRED"
    };
  }

  const currentQuantity =
    safeNumber(
      normalized.quantity
    );

  const projectedQuantity =
    currentQuantity +
    additionalShares;

  const projectedAverageCost =
    projectedQuantity > 0 &&
    normalized.costBasis !== null
      ? normalized.costBasis /
        projectedQuantity
      : normalized.averageCost;

  return {
    valid:
      true,

    type:
      CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.SCRIP_DIVIDEND,

    currentQuantity,

    adjustmentQuantity:
      additionalShares,

    projectedQuantity:
      round(
        projectedQuantity,
        6
      ),

    currentCostBasis:
      normalized.costBasis,

    projectedCostBasis:
      normalized.costBasis,

    currentAverageCost:
      normalized.averageCost,

    projectedAverageCost:
      round(
        projectedAverageCost,
        6
      ),

    investorTradeCreated:
      false,

    interpretation:
      "Scrip shares increase quantity as a dividend election. GateCEP should preserve the distinction between dividend-derived shares and ordinary purchases."
  };
}

export function buildCorporateActionShareAdjustment({
  action,
  holding,
  investorContext = {},
  entitlement = null,
  exerciseQuantity = null,
  scripShares = null
} = {}) {
  const resolvedEntitlement =
    entitlement ||
    buildInvestorCorporateActionEntitlement({
      action,
      holding,
      investorContext
    });

  const adjustmentType =
    classifyCorporateActionShareAdjustment(
      action
    );

  if (!adjustmentType) {
    return {
      valid:
        true,

      applicable:
        false,

      reason:
        "This corporate action does not require a share adjustment."
    };
  }

  let adjustment;

  switch (adjustmentType) {
    case CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.BONUS:
      adjustment =
        calculateBonusAdjustment({
          action,
          holding,
          entitlement:
            resolvedEntitlement
        });
      break;

    case CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.SPLIT:
      adjustment =
        calculateSplitAdjustment({
          action,
          holding
        });
      break;

    case CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.CONSOLIDATION:
      adjustment =
        calculateConsolidationAdjustment({
          action,
          holding
        });
      break;

    case CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.RIGHTS_EXERCISE:
      adjustment =
        calculateRightsExerciseAdjustment({
          action,
          holding,
          entitlement:
            resolvedEntitlement,
          exerciseQuantity
        });
      break;

    case CORPORATE_ACTION_SHARE_ADJUSTMENT_TYPES.SCRIP_DIVIDEND:
      adjustment =
        calculateScripDividendAdjustment({
          action,
          holding,
          scripShares
        });
      break;

    default:
      return {
        valid:
          false,

        error:
          "UNSUPPORTED_SHARE_ADJUSTMENT"
      };
  }

  if (
    adjustment?.valid ===
      false
  ) {
    return adjustment;
  }

  return {
    valid:
      true,

    applicable:
      true,

    actionId:
      action?.id ||
      null,

    symbol:
      action?.symbol ||
      holding?.symbol ||
      null,

    actionType:
      action?.type ||
      null,

    adjustmentType,

    entitlement:
      resolvedEntitlement,

    adjustment,

    behaviorContext: {
      shouldCountAsTrade:
        false,

      shouldAffectTradingFrequency:
        false,

      shouldAffectTurnover:
        false,

      shouldAffectBuySellPattern:
        false,

      reason:
        "This quantity change originates from a corporate action and should not be interpreted as investor trading behavior."
    },

    performanceContext: {
      shouldTreatAsInvestmentReturn:
        action?.type ===
          CORPORATE_ACTION_TYPES
            .RIGHTS_ISSUE
          ? false
          : false,

      shouldAdjustHistoricalSeries:
        [
          CORPORATE_ACTION_TYPES
            .BONUS_ISSUE,
          CORPORATE_ACTION_TYPES
            .STOCK_SPLIT,
          CORPORATE_ACTION_TYPES
            .SHARE_CONSOLIDATION
        ].includes(
          action?.type
        ),

      reason:
        adjustment
          ?.interpretation ||
        "Corporate-action adjustments should be separated from investor-driven performance."
    },

    coachGContext: {
      shouldExplain:
        true,

      explanation:
        buildShareAdjustmentExplanation({
          action,
          adjustment,
          investorContext
        })
    },

    safeguards: {
      projectionOnly:
        true,

      holdingMutated:
        false,

      tradeHistoryMutated:
        false,

      performanceFabricated:
        false
    }
  };
}

export function buildShareAdjustmentExplanation({
  action,
  adjustment,
  investorContext = {}
} = {}) {
  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .BONUS_ISSUE
  ) {
    return `Your holding is projected to increase from ${adjustment?.currentQuantity ?? "unknown"} to ${adjustment?.projectedQuantity ?? "unknown"} shares because of the bonus issue. This is a corporate-action adjustment, not a new purchase, so Coach G should not treat it as a change in your trading behavior.`;
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .STOCK_SPLIT
  ) {
    return `Your share quantity may change from ${adjustment?.currentQuantity ?? "unknown"} to ${adjustment?.projectedQuantity ?? "unknown"} because of the stock split. The total historical cost basis is preserved, so the per-share cost changes mechanically.`;
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .SHARE_CONSOLIDATION
  ) {
    return `Your share quantity may change from ${adjustment?.currentQuantity ?? "unknown"} to ${adjustment?.projectedQuantity ?? "unknown"} because of the share consolidation. This should not be interpreted as selling shares or as investment performance.`;
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .RIGHTS_ISSUE
  ) {
    return `If you exercise ${adjustment?.exercisedRights ?? "the selected number of"} rights, your holding may increase to ${adjustment?.projectedQuantity ?? "unknown"} shares and add approximately ${action?.currency || "KES"} ${adjustment?.additionalCost ?? "an unknown amount"} to invested capital. Coach G should assess this election against your goals, available cash, and portfolio concentration.`;
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .SCRIP_DIVIDEND
  ) {
    return `Choosing shares instead of cash may increase the holding to ${adjustment?.projectedQuantity ?? "unknown"} shares. Coach G should preserve that this came from a dividend election rather than ordinary buying behavior.`;
  }

  if (
    investorContext?.goal
  ) {
    return `Coach G should explain how this share adjustment affects progress toward ${investorContext.goal}.`;
  }

  return "Coach G should explain that this holding change comes from a corporate action rather than an investor trade.";
}

export function buildCorporateActionShareAdjustmentBatch({
  actions = [],
  holdings = [],
  investorContext = {}
} = {}) {
  const normalizedActions =
    Array.isArray(actions)
      ? actions
      : [];

  const normalizedHoldings =
    Array.isArray(holdings)
      ? holdings
      : [];

  return normalizedActions
    .map(
      (action) => {
        const holding =
          normalizedHoldings.find(
            (item) =>
              String(
                item?.symbol ||
                ""
              )
                .trim()
                .toUpperCase() ===
              String(
                action?.symbol ||
                ""
              )
                .trim()
                .toUpperCase()
          ) || {
            symbol:
              action?.symbol,
            quantity:
              0
          };

        return buildCorporateActionShareAdjustment({
          action,
          holding,
          investorContext
        });
      }
    )
    .filter(
      (item) =>
        item?.applicable
    );
}
