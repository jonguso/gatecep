import {
  CORPORATE_ACTION_TYPES
} from "./corporateActionModel";

import {
  CORPORATE_ACTION_ENTITLEMENT_STATUSES,
  buildInvestorCorporateActionEntitlement
} from "./investorCorporateActionEntitlementEngine";

/*
 * ============================================================
 * PC-027D
 * CORPORATE ACTION PORTFOLIO IMPACT ENGINE
 * ============================================================
 *
 * Investor-first purpose:
 *
 * Convert the investor-specific entitlement from PC-027C into an
 * expected before/after portfolio impact that Coach G can explain.
 *
 * This engine models:
 * - expected quantity change,
 * - expected cash receivable,
 * - expected capital requirement,
 * - expected income effect,
 * - expected allocation effect,
 * - cost-basis interpretation,
 * - performance interpretation,
 * - goal relevance.
 *
 * Critical safeguard:
 * This is a projection only. It never mutates the investor's actual
 * holdings, cash, cost basis, or broker state.
 * ============================================================
 */

export const CORPORATE_ACTION_PORTFOLIO_IMPACT_STATUSES = Object.freeze({
  NOT_APPLICABLE: "NOT_APPLICABLE",
  ELIGIBILITY_UNKNOWN: "ELIGIBILITY_UNKNOWN",
  PROJECTED: "PROJECTED",
  DECISION_REQUIRED: "DECISION_REQUIRED"
});

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

function safeNumber(
  value,
  fallback = 0
) {
  const parsed =
    nullableNumber(value);

  return parsed === null
    ? fallback
    : parsed;
}

function round(
  value,
  decimals = 2
) {
  const parsed =
    nullableNumber(value);

  return parsed === null
    ? null
    : Number(
        parsed.toFixed(
          decimals
        )
      );
}

function normalizeHolding(
  holding = {}
) {
  const quantity =
    nullableNumber(
      holding?.quantity ??
      holding?.currentQuantity
    );

  const price =
    nullableNumber(
      holding?.marketPrice ??
      holding?.price
    );

  const marketValue =
    nullableNumber(
      holding?.marketValue
    ) ??
    (
      quantity !== null &&
      price !== null
        ? quantity *
          price
        : null
    );

  const averageCost =
    nullableNumber(
      holding?.averageCost ??
      holding?.averageCostPerShare
    );

  const costBasis =
    nullableNumber(
      holding?.costBasis
    ) ??
    (
      quantity !== null &&
      averageCost !== null
        ? quantity *
          averageCost
        : null
    );

  return {
    symbol:
      holding?.symbol
        ? String(
            holding.symbol
          )
            .trim()
            .toUpperCase()
        : null,

    quantity,

    marketPrice:
      price,

    marketValue,

    averageCost,

    costBasis
  };
}

function normalizePortfolio(
  portfolio = {}
) {
  return {
    totalMarketValue:
      nullableNumber(
        portfolio
          ?.totalMarketValue ??
        portfolio
          ?.currentValue
      ),

    availableCash:
      nullableNumber(
        portfolio
          ?.availableCash ??
        portfolio
          ?.cash
      ),

    totalCostBasis:
      nullableNumber(
        portfolio
          ?.totalCostBasis
      ),

    goalValue:
      nullableNumber(
        portfolio
          ?.goalValue
      ),

    goalProgressPercentage:
      nullableNumber(
        portfolio
          ?.goalProgressPercentage
      )
  };
}

function buildAllocationImpact({
  currentMarketValue,
  projectedMarketValue,
  portfolioTotalMarketValue,
  expectedCash = 0,
  requiredCapital = 0
} = {}) {
  if (
    portfolioTotalMarketValue ===
      null ||
    portfolioTotalMarketValue ===
      undefined ||
    portfolioTotalMarketValue <=
      0
  ) {
    return {
      currentWeightPercentage:
        null,

      projectedWeightPercentage:
        null,

      weightChangePercentagePoints:
        null
    };
  }

  const currentWeight =
    (
      safeNumber(
        currentMarketValue
      ) /
      portfolioTotalMarketValue
    ) *
    100;

  const projectedPortfolioValue =
    portfolioTotalMarketValue +
    safeNumber(
      expectedCash
    ) -
    safeNumber(
      requiredCapital
    );

  const projectedWeight =
    projectedPortfolioValue >
      0
      ? (
          safeNumber(
            projectedMarketValue
          ) /
          projectedPortfolioValue
        ) *
        100
      : null;

  return {
    currentWeightPercentage:
      round(
        currentWeight,
        2
      ),

    projectedWeightPercentage:
      round(
        projectedWeight,
        2
      ),

    weightChangePercentagePoints:
      projectedWeight ===
        null
        ? null
        : round(
            projectedWeight -
            currentWeight,
            2
          )
  };
}

function buildGoalImpact({
  portfolio,
  expectedCash,
  requiredCapital,
  projectedMarketValueChange
} = {}) {
  const goalValue =
    nullableNumber(
      portfolio?.goalValue
    );

  const currentPortfolioValue =
    nullableNumber(
      portfolio
        ?.totalMarketValue
    );

  if (
    goalValue ===
      null ||
    currentPortfolioValue ===
      null ||
    goalValue <=
      0
  ) {
    return {
      currentGoalProgressPercentage:
        portfolio
          ?.goalProgressPercentage ??
        null,

      projectedGoalProgressPercentage:
        null,

      progressChangePercentagePoints:
        null
    };
  }

  const currentProgress =
    (
      currentPortfolioValue /
      goalValue
    ) *
    100;

  const projectedValue =
    currentPortfolioValue +
    safeNumber(
      expectedCash
    ) -
    safeNumber(
      requiredCapital
    ) +
    safeNumber(
      projectedMarketValueChange
    );

  const projectedProgress =
    (
      projectedValue /
      goalValue
    ) *
    100;

  return {
    currentGoalProgressPercentage:
      round(
        currentProgress,
        2
      ),

    projectedGoalProgressPercentage:
      round(
        projectedProgress,
        2
      ),

    progressChangePercentagePoints:
      round(
        projectedProgress -
        currentProgress,
        2
      )
  };
}

export function buildCorporateActionProjectedHoldingImpact({
  action,
  entitlement,
  holding
} = {}) {
  const normalizedHolding =
    normalizeHolding(
      holding
    );

  const currentQuantity =
    safeNumber(
      normalizedHolding
        .quantity
    );

  const currentMarketValue =
    normalizedHolding
      .marketValue;

  const marketPrice =
    normalizedHolding
      .marketPrice;

  let projectedQuantity =
    currentQuantity;

  let quantityChange =
    0;

  let projectedMarketValue =
    currentMarketValue;

  let projectedAverageCost =
    normalizedHolding
      .averageCost;

  let projectedCostBasis =
    normalizedHolding
      .costBasis;

  let performanceInterpretation =
    "No mechanical holding adjustment is projected.";

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .BONUS_ISSUE
  ) {
    quantityChange =
      safeNumber(
        entitlement
          ?.financialImpact
          ?.expectedShares
      );

    projectedQuantity =
      currentQuantity +
      quantityChange;

    if (
      projectedQuantity >
        0 &&
      normalizedHolding
        .costBasis !==
        null
    ) {
      projectedAverageCost =
        normalizedHolding
          .costBasis /
        projectedQuantity;
    }

    if (
      marketPrice !==
        null
    ) {
      projectedMarketValue =
        projectedQuantity *
        marketPrice;
    }

    performanceInterpretation =
      "Bonus shares increase share quantity. Coach G should not present the additional shares as equivalent new wealth without considering the expected market-price adjustment.";
  }

  if (
    action?.type ===
      CORPORATE_ACTION_TYPES
        .STOCK_SPLIT ||
    action?.type ===
      CORPORATE_ACTION_TYPES
        .SHARE_CONSOLIDATION
  ) {
    const expectedQuantity =
      nullableNumber(
        entitlement
          ?.financialImpact
          ?.expectedQuantity
      );

    if (
      expectedQuantity !==
      null
    ) {
      projectedQuantity =
        expectedQuantity;

      quantityChange =
        projectedQuantity -
        currentQuantity;

      if (
        projectedQuantity >
          0 &&
        normalizedHolding
          .costBasis !==
          null
      ) {
        projectedAverageCost =
          normalizedHolding
            .costBasis /
          projectedQuantity;
      }
    }

    performanceInterpretation =
      "The quantity and per-share cost are mechanically adjusted. Coach G should avoid treating the apparent price or quantity change as an investment gain or loss.";
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .RIGHTS_ISSUE
  ) {
    const entitledRights =
      safeNumber(
        entitlement
          ?.financialImpact
          ?.entitledRights
      );

    const subscriptionPrice =
      nullableNumber(
        action
          ?.subscriptionPrice
      );

    quantityChange =
      entitledRights;

    projectedQuantity =
      currentQuantity +
      entitledRights;

    if (
      normalizedHolding
        .costBasis !==
        null &&
      subscriptionPrice !==
        null
    ) {
      projectedCostBasis =
        normalizedHolding
          .costBasis +
        entitledRights *
        subscriptionPrice;

      projectedAverageCost =
        projectedQuantity >
          0
          ? projectedCostBasis /
            projectedQuantity
          : normalizedHolding
              .averageCost;
    }

    performanceInterpretation =
      "The projected holding assumes the investor exercises the full rights entitlement. This is a scenario, not an executed portfolio change.";
  }

  return {
    current: {
      quantity:
        normalizedHolding
          .quantity,

      averageCost:
        normalizedHolding
          .averageCost,

      costBasis:
        normalizedHolding
          .costBasis,

      marketValue:
        currentMarketValue
    },

    projected: {
      quantity:
        round(
          projectedQuantity,
          6
        ),

      averageCost:
        round(
          projectedAverageCost,
          6
        ),

      costBasis:
        round(
          projectedCostBasis,
          2
        ),

      marketValue:
        round(
          projectedMarketValue,
          2
        )
    },

    change: {
      quantity:
        round(
          quantityChange,
          6
        ),

      marketValue:
        currentMarketValue !==
          null &&
        projectedMarketValue !==
          null
          ? round(
              projectedMarketValue -
              currentMarketValue,
              2
            )
          : null
    },

    performanceInterpretation
  };
}

export function buildCorporateActionCashImpact({
  entitlement,
  portfolio
} = {}) {
  const normalizedPortfolio =
    normalizePortfolio(
      portfolio
    );

  const expectedCash =
    nullableNumber(
      entitlement
        ?.financialImpact
        ?.expectedCash
    );

  const requiredCapital =
    nullableNumber(
      entitlement
        ?.financialImpact
        ?.requiredCapital
    );

  const currentCash =
    normalizedPortfolio
      .availableCash;

  const projectedCash =
    currentCash ===
      null
      ? null
      : currentCash +
        safeNumber(
          expectedCash
        ) -
        safeNumber(
          requiredCapital
        );

  return {
    currentAvailableCash:
      currentCash,

    expectedCashReceivable:
      expectedCash,

    requiredCapital:
      requiredCapital,

    projectedAvailableCash:
      round(
        projectedCash,
        2
      ),

    cashChange:
      currentCash ===
        null ||
      projectedCash ===
        null
        ? null
        : round(
            projectedCash -
            currentCash,
            2
          )
  };
}

export function buildCorporateActionIncomeImpact({
  action,
  entitlement
} = {}) {
  const expectedCash =
    nullableNumber(
      entitlement
        ?.financialImpact
        ?.expectedCash
    );

  const incomeGenerating =
    [
      CORPORATE_ACTION_TYPES
        .CASH_DIVIDEND,
      CORPORATE_ACTION_TYPES
        .SPECIAL_DIVIDEND,
      CORPORATE_ACTION_TYPES
        .CAPITAL_DISTRIBUTION
    ].includes(
      action?.type
    );

  return {
    incomeGenerating,

    expectedIncome:
      incomeGenerating
        ? expectedCash
        : null,

    currency:
      action?.currency ||
      "KES",

    interpretation:
      incomeGenerating
        ? "This expected cash flow may contribute to the investor's income goal or be considered for reinvestment."
        : "This corporate action is not primarily an income event."
  };
}

export function buildCorporateActionPortfolioImpact({
  action,
  holding,
  portfolio = {},
  investorContext = {},
  entitlement = null
} = {}) {
  const resolvedEntitlement =
    entitlement ||
    buildInvestorCorporateActionEntitlement({
      action,
      holding,
      investorContext: {
        ...investorContext,

        availableCash:
          investorContext
            ?.availableCash ??
          portfolio
            ?.availableCash
      }
    });

  if (
    !resolvedEntitlement?.valid
  ) {
    return {
      valid:
        false,

      error:
        resolvedEntitlement
          ?.error ||
        "ENTITLEMENT_UNAVAILABLE"
    };
  }

  if (
    resolvedEntitlement
      .status ===
    CORPORATE_ACTION_ENTITLEMENT_STATUSES
      .INELIGIBLE
  ) {
    return {
      valid:
        true,

      status:
        CORPORATE_ACTION_PORTFOLIO_IMPACT_STATUSES
          .NOT_APPLICABLE,

      actionId:
        action?.id ||
        null,

      symbol:
        action?.symbol ||
        null,

      entitlement:
        resolvedEntitlement,

      explanation:
        "No projected portfolio impact is shown because the investor does not appear eligible."
    };
  }

  if (
    resolvedEntitlement
      .status ===
    CORPORATE_ACTION_ENTITLEMENT_STATUSES
      .ELIGIBILITY_UNKNOWN
  ) {
    return {
      valid:
        true,

      status:
        CORPORATE_ACTION_PORTFOLIO_IMPACT_STATUSES
          .ELIGIBILITY_UNKNOWN,

      actionId:
        action?.id ||
        null,

      symbol:
        action?.symbol ||
        null,

      entitlement:
        resolvedEntitlement,

      explanation:
        "GateCEP needs record-date or equivalent eligibility evidence before presenting this impact as an expected entitlement."
    };
  }

  const holdingImpact =
    buildCorporateActionProjectedHoldingImpact({
      action,
      entitlement:
        resolvedEntitlement,
      holding
    });

  const cashImpact =
    buildCorporateActionCashImpact({
      entitlement:
        resolvedEntitlement,
      portfolio
    });

  const incomeImpact =
    buildCorporateActionIncomeImpact({
      action,
      entitlement:
        resolvedEntitlement
    });

  const normalizedPortfolio =
    normalizePortfolio(
      portfolio
    );

  const allocationImpact =
    buildAllocationImpact({
      currentMarketValue:
        holdingImpact
          ?.current
          ?.marketValue,

      projectedMarketValue:
        holdingImpact
          ?.projected
          ?.marketValue,

      portfolioTotalMarketValue:
        normalizedPortfolio
          .totalMarketValue,

      expectedCash:
        cashImpact
          .expectedCashReceivable,

      requiredCapital:
        cashImpact
          .requiredCapital
    });

  const goalImpact =
    buildGoalImpact({
      portfolio:
        normalizedPortfolio,

      expectedCash:
        cashImpact
          .expectedCashReceivable,

      requiredCapital:
        cashImpact
          .requiredCapital,

      projectedMarketValueChange:
        holdingImpact
          ?.change
          ?.marketValue
    });

  const decisionRequired =
    resolvedEntitlement
      .decisionRequired;

  return {
    valid:
      true,

    status:
      decisionRequired
        ? CORPORATE_ACTION_PORTFOLIO_IMPACT_STATUSES
            .DECISION_REQUIRED
        : CORPORATE_ACTION_PORTFOLIO_IMPACT_STATUSES
            .PROJECTED,

    actionId:
      action?.id ||
      null,

    symbol:
      action?.symbol ||
      null,

    actionType:
      action?.type ||
      null,

    entitlement:
      resolvedEntitlement,

    holdingImpact,

    cashImpact,

    incomeImpact,

    allocationImpact,

    goalImpact,

    decisionRequired,

    coachGContext: {
      shouldExplain:
        true,

      shouldDiscussDecision:
        decisionRequired,

      explanation:
        buildPortfolioImpactExplanation({
          action,
          resolvedEntitlement,
          holdingImpact,
          cashImpact,
          incomeImpact,
          allocationImpact,
          goalImpact,
          investorContext
        })
    },

    safeguards: {
      projectionOnly:
        true,

      portfolioMutated:
        false,

      cashMutated:
        false,

      costBasisMutated:
        false,

      executionPerformed:
        false
    }
  };
}

export function buildPortfolioImpactExplanation({
  action,
  resolvedEntitlement,
  holdingImpact,
  cashImpact,
  allocationImpact,
  goalImpact,
  investorContext
} = {}) {
  if (
    action?.type ===
      CORPORATE_ACTION_TYPES
        .CASH_DIVIDEND ||
    action?.type ===
      CORPORATE_ACTION_TYPES
        .SPECIAL_DIVIDEND
  ) {
    return `The investor is projected to receive ${action.currency || "KES"} ${cashImpact?.expectedCashReceivable ?? "an unknown amount"}. Coach G should explain whether this income is better aligned with spending needs, cash reserves, or reinvestment toward ${investorContext?.goal || "the investor's goals"}.`;
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .BONUS_ISSUE
  ) {
    return `The holding may increase by ${holdingImpact?.change?.quantity ?? "an unknown number of"} share(s). Coach G should explain that the quantity increase is mechanical and should not be interpreted as equivalent new wealth.`;
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .RIGHTS_ISSUE
  ) {
    return `Exercising the full entitlement would require approximately ${action.currency || "KES"} ${cashImpact?.requiredCapital ?? "an unknown amount"} and increase the holding by ${holdingImpact?.change?.quantity ?? "an unknown number of"} share(s). Coach G should compare this scenario with available cash, portfolio concentration, the investment case, and the investor's goals before recommending an action.`;
  }

  if (
    action?.type ===
      CORPORATE_ACTION_TYPES
        .STOCK_SPLIT ||
    action?.type ===
      CORPORATE_ACTION_TYPES
        .SHARE_CONSOLIDATION
  ) {
    return `The share quantity may change from ${holdingImpact?.current?.quantity ?? "unknown"} to ${holdingImpact?.projected?.quantity ?? "unknown"}. Coach G should explain the mechanical adjustment so it is not mistaken for investment performance.`;
  }

  if (
    goalImpact
      ?.progressChangePercentagePoints !==
      null &&
    goalImpact
      ?.progressChangePercentagePoints !==
      undefined
  ) {
    return `The projected corporate action changes estimated goal progress by ${goalImpact.progressChangePercentagePoints} percentage point(s). Coach G should explain whether this materially changes the investor's plan.`;
  }

  if (
    allocationImpact
      ?.weightChangePercentagePoints !==
      null &&
    allocationImpact
      ?.weightChangePercentagePoints !==
      undefined
  ) {
    return `The projected holding weight changes by ${allocationImpact.weightChangePercentagePoints} percentage point(s). Coach G should explain whether this meaningfully changes portfolio concentration.`;
  }

  return resolvedEntitlement
    ?.coachGContext
    ?.explanationFocus ||
    "Coach G should explain the expected investor-specific portfolio impact of this corporate action.";
}

export function buildCorporateActionPortfolioImpactBatch({
  actions = [],
  holdings = [],
  portfolio = {},
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

  return normalizedActions.map(
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

      return buildCorporateActionPortfolioImpact({
        action,
        holding,
        portfolio,
        investorContext
      });
    }
  );
}

export function loadCorporateActionPortfolioImpactsRequiringCoachG({
  actions = [],
  holdings = [],
  portfolio = {},
  investorContext = {}
} = {}) {
  return buildCorporateActionPortfolioImpactBatch({
    actions,
    holdings,
    portfolio,
    investorContext
  }).filter(
    (impact) =>
      impact?.valid &&
      (
        impact
          ?.decisionRequired ||
        impact
          ?.status ===
          CORPORATE_ACTION_PORTFOLIO_IMPACT_STATUSES
            .ELIGIBILITY_UNKNOWN ||
        impact
          ?.incomeImpact
          ?.expectedIncome !==
          null
      )
  );
}
