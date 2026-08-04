import {
  buildPortfolioDriftAnalysis
} from "./driftAnalysisService";

import {
  TARGET_ALLOCATION_MODES
} from "./allocationTemplates";

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

function roundQuantity(value) {
  return Number(
    number(value).toFixed(6)
  );
}

function normalizeKey(value) {
  return String(
    value ||
    ""
  )
    .trim()
    .toUpperCase();
}

function isCashItem(
  item
) {
  return (
    normalizeKey(
      item?.key
    ) ===
      "CASH" ||
    normalizeKey(
      item
        ?.metadata
        ?.assetClass
    ) ===
      "CASH"
  );
}

function buildRecommendationId({
  action,
  key
}) {
  return (
    `RBR-${action}-${normalizeKey(
      key
    )}`
  );
}

function classifyPriority({
  absoluteDrift,
  estimatedValue
}) {
  const drift =
    Math.abs(
      number(
        absoluteDrift
      )
    );

  const value =
    Math.abs(
      number(
        estimatedValue
      )
    );

  if (
    drift >= 15 ||
    value >= 100000
  ) {
    return "HIGH";
  }

  if (
    drift >= 7.5 ||
    value >= 25000
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

function calculateEstimatedQuantity({
  estimatedValue,
  marketPrice,
  action
}) {
  const value =
    Math.abs(
      number(
        estimatedValue
      )
    );

  const price =
    number(
      marketPrice
    );

  if (
    value <= 0 ||
    price <= 0
  ) {
    return null;
  }

  const rawQuantity =
    value /
    price;

  /*
   * BUY recommendations round down so GateCEP does not
   * estimate spending more cash than the recommendation value.
   *
   * SELL recommendations round up so the position can move
   * sufficiently toward the target.
   */
  if (
    action ===
    "BUY"
  ) {
    return Math.max(
      Math.floor(
        rawQuantity
      ),
      0
    );
  }

  if (
    action ===
    "SELL"
  ) {
    return Math.max(
      Math.ceil(
        rawQuantity
      ),
      0
    );
  }

  return roundQuantity(
    rawQuantity
  );
}

function applyMinimumTradeValue({
  estimatedValue,
  minimumTradeValue
}) {
  const value =
    Math.abs(
      number(
        estimatedValue
      )
    );

  const minimum =
    Math.max(
      number(
        minimumTradeValue
      ),
      0
    );

  if (
    value <= 0
  ) {
    return {
      eligible:
        false,

      reason:
        "NO_VALUE_CHANGE"
    };
  }

  if (
    minimum > 0 &&
    value < minimum
  ) {
    return {
      eligible:
        false,

      reason:
        "BELOW_MINIMUM_TRADE_VALUE"
    };
  }

  return {
    eligible:
      true,

    reason:
      null
  };
}

function buildHoldRecommendation(
  item
) {
  return {
    id:
      buildRecommendationId({
        action:
          "HOLD",

        key:
          item.key
      }),

    key:
      item.key,

    label:
      item.label,

    mode:
      item.mode,

    action:
      "HOLD",

    direction:
      "MAINTAIN",

    classification:
      item.classification,

    priority:
      "LOW",

    currentPercentage:
      item.currentPercentage,

    targetPercentage:
      item.targetPercentage,

    driftPercentage:
      item.driftPercentage,

    absoluteDrift:
      item.absoluteDrift,

    currentValue:
      item.currentValue,

    targetValue:
      item.targetValue,

    estimatedValue:
      0,

    estimatedQuantity:
      0,

    marketPrice:
      number(
        item
          ?.metadata
          ?.marketPrice
      ),

    currentQuantity:
      number(
        item
          ?.metadata
          ?.quantity
      ),

    cashImpact:
      0,

    cashGenerated:
      0,

    cashRequired:
      0,

    eligible:
      false,

    eligibilityReason:
      "WITHIN_TOLERANCE",

    recommendation:
      `${item.label} is within the saved tolerance and does not currently require rebalancing.`,

    metadata: {
      ...(
        item?.metadata &&
        typeof item.metadata ===
          "object"
          ? item.metadata
          : {}
      )
    }
  };
}

function buildIncreaseRecommendation({
  item,
  minimumTradeValue
}) {
  const estimatedValue =
    roundMoney(
      Math.max(
        -number(
          item?.valueDifference
        ),
        0
      )
    );

  const cashItem =
    isCashItem(
      item
    );

  const action =
    cashItem
      ? "INCREASE_CASH"
      : "BUY";

  const eligibility =
    applyMinimumTradeValue({
      estimatedValue,
      minimumTradeValue
    });

  const marketPrice =
    number(
      item
        ?.metadata
        ?.marketPrice
    );

  const estimatedQuantity =
    cashItem
      ? null
      : calculateEstimatedQuantity({
          estimatedValue,
          marketPrice,
          action:
            "BUY"
        });

  let recommendation;

  if (
    cashItem
  ) {
    recommendation =
      `Increase cash by approximately KES ${estimatedValue.toFixed(
        2
      )} to move toward the ${item.targetPercentage.toFixed(
        2
      )}% target.`;
  } else if (
    estimatedQuantity !==
      null
  ) {
    recommendation =
      `Consider buying approximately ${estimatedQuantity} ${
        item.key
      } share(s), with an estimated value of KES ${estimatedValue.toFixed(
        2
      )}.`;
  } else {
    recommendation =
      `Increase ${item.label} by approximately KES ${estimatedValue.toFixed(
        2
      )}. A quantity estimate is unavailable because no valid market price was found.`;
  }

  return {
    id:
      buildRecommendationId({
        action,
        key:
          item.key
      }),

    key:
      item.key,

    label:
      item.label,

    mode:
      item.mode,

    action,

    direction:
      "INCREASE",

    classification:
      item.classification,

    priority:
      classifyPriority({
        absoluteDrift:
          item.absoluteDrift,

        estimatedValue
      }),

    currentPercentage:
      item.currentPercentage,

    targetPercentage:
      item.targetPercentage,

    driftPercentage:
      item.driftPercentage,

    absoluteDrift:
      item.absoluteDrift,

    currentValue:
      item.currentValue,

    targetValue:
      item.targetValue,

    estimatedValue,

    estimatedQuantity,

    marketPrice,

    currentQuantity:
      number(
        item
          ?.metadata
          ?.quantity
      ),

    cashImpact:
      cashItem
        ? estimatedValue
        : -estimatedValue,

    cashGenerated:
      0,

    cashRequired:
      cashItem
        ? 0
        : estimatedValue,

    eligible:
      eligibility.eligible,

    eligibilityReason:
      eligibility.reason,

    recommendation,

    metadata: {
      ...(
        item?.metadata &&
        typeof item.metadata ===
          "object"
          ? item.metadata
          : {}
      )
    }
  };
}

function buildReduceRecommendation({
  item,
  minimumTradeValue
}) {
  const estimatedValue =
    roundMoney(
      Math.max(
        number(
          item?.valueDifference
        ),
        0
      )
    );

  const cashItem =
    isCashItem(
      item
    );

  const action =
    cashItem
      ? "DEPLOY_CASH"
      : "SELL";

  const eligibility =
    applyMinimumTradeValue({
      estimatedValue,
      minimumTradeValue
    });

  const marketPrice =
    number(
      item
        ?.metadata
        ?.marketPrice
    );

  const currentQuantity =
    number(
      item
        ?.metadata
        ?.quantity
    );

  let estimatedQuantity =
    cashItem
      ? null
      : calculateEstimatedQuantity({
          estimatedValue,
          marketPrice,
          action:
            "SELL"
        });

  /*
   * A sell recommendation must never exceed the currently
   * available holding quantity.
   */
  if (
    estimatedQuantity !==
      null &&
    currentQuantity > 0
  ) {
    estimatedQuantity =
      Math.min(
        estimatedQuantity,
        currentQuantity
      );
  }

  let recommendation;

  if (
    cashItem
  ) {
    recommendation =
      `Deploy approximately KES ${estimatedValue.toFixed(
        2
      )} of excess cash into underweight allocations.`;
  } else if (
    estimatedQuantity !==
      null
  ) {
    recommendation =
      `Consider selling approximately ${estimatedQuantity} ${
        item.key
      } share(s), with an estimated value of KES ${estimatedValue.toFixed(
        2
      )}.`;
  } else {
    recommendation =
      `Reduce ${item.label} by approximately KES ${estimatedValue.toFixed(
        2
      )}. A quantity estimate is unavailable because no valid market price was found.`;
  }

  return {
    id:
      buildRecommendationId({
        action,
        key:
          item.key
      }),

    key:
      item.key,

    label:
      item.label,

    mode:
      item.mode,

    action,

    direction:
      "REDUCE",

    classification:
      item.classification,

    priority:
      classifyPriority({
        absoluteDrift:
          item.absoluteDrift,

        estimatedValue
      }),

    currentPercentage:
      item.currentPercentage,

    targetPercentage:
      item.targetPercentage,

    driftPercentage:
      item.driftPercentage,

    absoluteDrift:
      item.absoluteDrift,

    currentValue:
      item.currentValue,

    targetValue:
      item.targetValue,

    estimatedValue,

    estimatedQuantity,

    marketPrice,

    currentQuantity,

    cashImpact:
      cashItem
        ? -estimatedValue
        : estimatedValue,

    cashGenerated:
      cashItem
        ? 0
        : estimatedValue,

    cashRequired:
      0,

    eligible:
      eligibility.eligible,

    eligibilityReason:
      eligibility.reason,

    recommendation,

    metadata: {
      ...(
        item?.metadata &&
        typeof item.metadata ===
          "object"
          ? item.metadata
          : {}
      )
    }
  };
}

function buildRecommendationForItem({
  item,
  minimumTradeValue
}) {
  switch (
    item?.classification
  ) {
    case "UNDERWEIGHT":
      return buildIncreaseRecommendation({
        item,
        minimumTradeValue
      });

    case "OVERWEIGHT":
      return buildReduceRecommendation({
        item,
        minimumTradeValue
      });

    case "WITHIN_TOLERANCE":
    default:
      return buildHoldRecommendation(
        item
      );
  }
}

function buildFundingSummary({
  recommendations,
  currentCash,
  preserveCashFloor
}) {
  const actionable =
    recommendations.filter(
      (item) =>
        item?.eligible
    );

  const cashGenerated =
    roundMoney(
      actionable.reduce(
        (
          sum,
          item
        ) =>
          sum +
          number(
            item
              ?.cashGenerated
          ),
        0
      )
    );

  const cashRequired =
    roundMoney(
      actionable.reduce(
        (
          sum,
          item
        ) =>
          sum +
          number(
            item
              ?.cashRequired
          ),
        0
      )
    );

  const cashFloor =
    roundMoney(
      Math.max(
        number(
          preserveCashFloor
        ),
        0
      )
    );

  const spendableCurrentCash =
    roundMoney(
      Math.max(
        number(
          currentCash
        ) -
        cashFloor,
        0
      )
    );

  const totalFundingAvailable =
    roundMoney(
      spendableCurrentCash +
      cashGenerated
    );

  const fundingGap =
    roundMoney(
      Math.max(
        cashRequired -
        totalFundingAvailable,
        0
      )
    );

  const surplusAfterRecommendations =
    roundMoney(
      Math.max(
        totalFundingAvailable -
        cashRequired,
        0
      )
    );

  return {
    currentCash:
      roundMoney(
        currentCash
      ),

    preserveCashFloor:
      cashFloor,

    spendableCurrentCash,

    estimatedCashGenerated:
      cashGenerated,

    estimatedCashRequired:
      cashRequired,

    totalFundingAvailable,

    fundingGap,

    surplusAfterRecommendations,

    fullyFunded:
      fundingGap <= 0.01
  };
}

function buildRecommendationMessage({
  driftAnalysis,
  recommendations,
  funding
}) {
  if (
    driftAnalysis?.status ===
    "NOT_READY"
  ) {
    return (
      driftAnalysis?.message ||
      "Portfolio rebalancing recommendations are not available."
    );
  }

  if (
    driftAnalysis?.status ===
    "WITHIN_TOLERANCE"
  ) {
    return (
      "The portfolio is currently within the saved target tolerance. No rebalancing action is recommended."
    );
  }

  const buyCount =
    recommendations.filter(
      (item) =>
        item?.action ===
        "BUY"
    ).length;

  const sellCount =
    recommendations.filter(
      (item) =>
        item?.action ===
        "SELL"
    ).length;

  const cashActions =
    recommendations.filter(
      (item) =>
        item?.action ===
          "INCREASE_CASH" ||
        item?.action ===
          "DEPLOY_CASH"
    ).length;

  const fundingMessage =
    funding?.fullyFunded
      ? "The estimated recommendations are fully funded by available cash and proposed reductions."
      : `The current recommendation set has an estimated funding gap of KES ${number(
          funding?.fundingGap
        ).toFixed(
          2
        )}.`;

  return (
    `${sellCount} sell/reduce recommendation(s), ` +
    `${buyCount} buy/increase recommendation(s), and ` +
    `${cashActions} cash-allocation recommendation(s) were generated. ` +
    fundingMessage
  );
}

/*
 * ============================================================
 * PC-019D
 * REBALANCE RECOMMENDATION ENGINE
 * ============================================================
 *
 * Converts PC-019C drift results into non-executing guidance.
 *
 * This service does not:
 *
 * - change holdings,
 * - change cash,
 * - create orders,
 * - submit broker instructions.
 */

export async function buildRebalanceRecommendations() {
  const driftAnalysis =
    await buildPortfolioDriftAnalysis();

  const target =
    driftAnalysis?.target ||
    {};

  const minimumTradeValue =
    roundMoney(
      target
        ?.minimumTradeValue ||
      0
    );

  const preserveCashFloor =
    roundMoney(
      target
        ?.preserveCashFloor ||
      0
    );

  const driftItems =
    Array.isArray(
      driftAnalysis?.items
    )
      ? driftAnalysis.items
      : [];

  const recommendations =
    driftItems
      .map(
        (item) =>
          buildRecommendationForItem({
            item,
            minimumTradeValue
          })
      )
      .sort(
        (
          a,
          b
        ) => {
          const priorityOrder = {
            HIGH:
              3,

            MEDIUM:
              2,

            LOW:
              1
          };

          const priorityDifference =
            number(
              priorityOrder[
                b?.priority
              ]
            ) -
            number(
              priorityOrder[
                a?.priority
              ]
            );

          if (
            priorityDifference !==
            0
          ) {
            return priorityDifference;
          }

          return (
            number(
              b?.absoluteDrift
            ) -
            number(
              a?.absoluteDrift
            )
          );
        }
      );

  const actionableRecommendations =
    recommendations.filter(
      (item) =>
        item?.eligible &&
        item?.action !==
          "HOLD"
    );

  const excludedRecommendations =
    recommendations.filter(
      (item) =>
        !item?.eligible &&
        item?.action !==
          "HOLD"
    );

  const holdRecommendations =
    recommendations.filter(
      (item) =>
        item?.action ===
        "HOLD"
    );

  const funding =
    buildFundingSummary({
      recommendations,

      currentCash:
        driftAnalysis
          ?.allocation
          ?.portfolio
          ?.availableCash ||
        0,

      preserveCashFloor
    });

  const estimatedTurnover =
    roundMoney(
      actionableRecommendations.reduce(
        (
          sum,
          item
        ) =>
          sum +
          Math.abs(
            number(
              item
                ?.estimatedValue
            )
          ),
        0
      )
    );

  const portfolioValue =
    roundMoney(
      driftAnalysis
        ?.portfolioValue ||
      0
    );

  const turnoverPercentage =
    portfolioValue > 0
      ? roundPercent(
          (
            estimatedTurnover /
            portfolioValue
          ) *
          100
        )
      : 0;

  const highestPriority =
    actionableRecommendations[0] ||
    null;

  const status =
    driftAnalysis?.status ===
      "NOT_READY"
      ? "NOT_READY"
      : actionableRecommendations.length ===
          0
        ? "NO_ACTION_REQUIRED"
        : funding.fullyFunded
          ? "READY"
          : "FUNDING_GAP";

  return {
    generatedAt:
      new Date()
        .toISOString(),

    status,

    message:
      buildRecommendationMessage({
        driftAnalysis,
        recommendations,
        funding
      }),

    mode:
      driftAnalysis?.mode ||
      null,

    profile: {
      profileType:
        target
          ?.profileType ||
        null,

      profileLabel:
        target
          ?.profileLabel ||
        null,

      tolerancePercentage:
        number(
          driftAnalysis
            ?.tolerancePercentage
        ),

      minimumTradeValue,

      preserveCashFloor
    },

    portfolio: {
      totalValue:
        portfolioValue,

      holdingsValue:
        roundMoney(
          driftAnalysis
            ?.allocation
            ?.portfolio
            ?.holdingsValue
        ),

      availableCash:
        roundMoney(
          driftAnalysis
            ?.allocation
            ?.portfolio
            ?.availableCash
        ),

      holdingsCount:
        number(
          driftAnalysis
            ?.allocation
            ?.portfolio
            ?.holdingsCount
        )
    },

    drift: {
      status:
        driftAnalysis?.status ||
        null,

      totalAbsoluteDrift:
        number(
          driftAnalysis
            ?.summary
            ?.totalAbsoluteDrift
        ),

      overweight:
        number(
          driftAnalysis
            ?.summary
            ?.overweight
        ),

      underweight:
        number(
          driftAnalysis
            ?.summary
            ?.underweight
        ),

      withinTolerance:
        number(
          driftAnalysis
            ?.summary
            ?.withinTolerance
        ),

      largestDriftItem:
        driftAnalysis
          ?.summary
          ?.largestDriftItem ||
        null
    },

    funding,

    summary: {
      totalRecommendations:
        recommendations.length,

      actionable:
        actionableRecommendations.length,

      excluded:
        excludedRecommendations.length,

      hold:
        holdRecommendations.length,

      buys:
        actionableRecommendations.filter(
          (item) =>
            item?.action ===
            "BUY"
        ).length,

      sells:
        actionableRecommendations.filter(
          (item) =>
            item?.action ===
            "SELL"
        ).length,

      increaseCash:
        actionableRecommendations.filter(
          (item) =>
            item?.action ===
            "INCREASE_CASH"
        ).length,

      deployCash:
        actionableRecommendations.filter(
          (item) =>
            item?.action ===
            "DEPLOY_CASH"
        ).length,

      estimatedTurnover,

      turnoverPercentage,

      highestPriority:
        highestPriority
          ? {
              key:
                highestPriority.key,

              label:
                highestPriority.label,

              action:
                highestPriority.action,

              priority:
                highestPriority.priority,

              estimatedValue:
                highestPriority
                  .estimatedValue,

              estimatedQuantity:
                highestPriority
                  .estimatedQuantity,

              driftPercentage:
                highestPriority
                  .driftPercentage
            }
          : null
    },

    recommendations,

    actionableRecommendations,

    excludedRecommendations,

    holdRecommendations,

    driftAnalysis
  };
}

/*
 * ============================================================
 * BUY RECOMMENDATIONS
 * ============================================================
 */

export async function loadRebalanceBuyRecommendations() {
  const result =
    await buildRebalanceRecommendations();

  return result
    .actionableRecommendations
    .filter(
      (item) =>
        item?.action ===
        "BUY"
    );
}

/*
 * ============================================================
 * SELL RECOMMENDATIONS
 * ============================================================
 */

export async function loadRebalanceSellRecommendations() {
  const result =
    await buildRebalanceRecommendations();

  return result
    .actionableRecommendations
    .filter(
      (item) =>
        item?.action ===
        "SELL"
    );
}

/*
 * ============================================================
 * CASH RECOMMENDATIONS
 * ============================================================
 */

export async function loadRebalanceCashRecommendations() {
  const result =
    await buildRebalanceRecommendations();

  return result
    .actionableRecommendations
    .filter(
      (item) =>
        item?.action ===
          "INCREASE_CASH" ||
        item?.action ===
          "DEPLOY_CASH"
    );
}

/*
 * ============================================================
 * HIGHEST-PRIORITY RECOMMENDATIONS
 * ============================================================
 */

export async function loadHighestPriorityRecommendations(
  limit = 5
) {
  const result =
    await buildRebalanceRecommendations();

  const safeLimit =
    Math.max(
      Math.floor(
        number(
          limit
        )
      ),
      0
    );

  return result
    .actionableRecommendations
    .slice(
      0,
      safeLimit
    );
}

/*
 * ============================================================
 * MODE-SPECIFIC GUIDANCE
 * ============================================================
 */

export function getRebalanceModeGuidance(
  mode
) {
  switch (
    mode
  ) {
    case TARGET_ALLOCATION_MODES
      .ASSET_CLASS:
      return (
        "Asset-class targets identify how much total value should remain in equity versus cash. They do not select individual securities."
      );

    case TARGET_ALLOCATION_MODES
      .SYMBOL:
      return (
        "Symbol targets can produce estimated buy and sell quantities when valid market prices are available."
      );

    case TARGET_ALLOCATION_MODES
      .SECTOR:
      return (
        "Sector targets identify sectors that should be increased or reduced. Individual security selection remains a separate decision."
      );

    default:
      return (
        "Select a supported target-allocation mode to generate rebalancing recommendations."
      );
  }
}