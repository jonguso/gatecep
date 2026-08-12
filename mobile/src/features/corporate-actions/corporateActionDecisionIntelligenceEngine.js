import {
  CORPORATE_ACTION_TYPES
} from "./corporateActionModel";

import {
  buildCorporateActionPortfolioImpact
} from "./corporateActionPortfolioImpactEngine";

import {
  buildCorporateActionShareAdjustment
} from "./corporateActionShareAdjustmentEngine";

/*
 * ============================================================
 * PC-027G
 * CORPORATE ACTION DECISION INTELLIGENCE
 * ============================================================
 *
 * Investor-first purpose:
 *
 * Help Coach G reason about corporate actions where the investor
 * has a real choice, such as:
 *
 * - rights issues
 * - scrip dividends
 * - optional reinvestment
 * - merger / acquisition elections
 *
 * Inputs can include:
 * - entitlement
 * - projected portfolio impact
 * - current concentration
 * - available cash
 * - investor goals
 * - Investor DNA context
 * - investment / valuation context
 *
 * Output is ADVISORY only.
 * Coach G explains the trade-offs; the investor decides.
 * ============================================================
 */

export const CORPORATE_ACTION_DECISIONS = Object.freeze({
  EXERCISE_FULL: "EXERCISE_FULL",
  EXERCISE_PARTIAL: "EXERCISE_PARTIAL",
  TAKE_CASH: "TAKE_CASH",
  TAKE_SHARES: "TAKE_SHARES",
  HOLD_WAIT: "HOLD_WAIT",
  REVIEW_FURTHER: "REVIEW_FURTHER",
  NO_ACTION_REQUIRED: "NO_ACTION_REQUIRED"
});

export const CORPORATE_ACTION_DECISION_CONFIDENCE = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW"
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

function round(value, decimals = 2) {
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

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function scoreSignal({
  condition,
  positive = 0,
  negative = 0
}) {
  return condition
    ? positive
    : negative;
}

function normalizeContext(
  context = {}
) {
  return {
    availableCash:
      nullableNumber(
        context?.availableCash
      ),

    concentrationPercentage:
      nullableNumber(
        context
          ?.concentrationPercentage
      ),

    maxPreferredConcentrationPercentage:
      nullableNumber(
        context
          ?.maxPreferredConcentrationPercentage
      ) ??
      25,

    goal:
      context?.goal ||
      null,

    timeHorizon:
      context?.timeHorizon ||
      null,

    incomePreference:
      context?.incomePreference ||
      null,

    liquidityNeed:
      context?.liquidityNeed ||
      null,

    behaviorSignals:
      context?.behaviorSignals ||
      {},

    valuation:
      context?.valuation ||
      {},

    investmentCase:
      context?.investmentCase ||
      {},

    dna:
      context?.dna ||
      {}
  };
}

export function calculateCorporateActionDecisionScore({
  action,
  portfolioImpact,
  investorContext = {}
} = {}) {
  const context =
    normalizeContext(
      investorContext
    );

  let score =
    50;

  const reasons = [];

  const requiredCapital =
    nullableNumber(
      portfolioImpact
        ?.cashImpact
        ?.requiredCapital
    );

  const projectedWeight =
    nullableNumber(
      portfolioImpact
        ?.allocationImpact
        ?.projectedWeightPercentage
    );

  const valuationUpside =
    nullableNumber(
      context
        ?.valuation
        ?.upsidePercentage
    );

  const qualityScore =
    nullableNumber(
      context
        ?.investmentCase
        ?.qualityScore
    );

  const convictionScore =
    nullableNumber(
      context
        ?.investmentCase
        ?.convictionScore
    );

  if (
    requiredCapital !==
      null &&
    context.availableCash !==
      null
  ) {
    const affordable =
      context.availableCash >=
      requiredCapital;

    score +=
      scoreSignal({
        condition:
          affordable,
        positive:
          12,
        negative:
          -18
      });

    reasons.push(
      affordable
        ? "The available cash appears sufficient to fund the full election."
        : "The available cash appears insufficient to fund the full election without affecting liquidity."
    );
  }

  if (
    projectedWeight !==
      null
  ) {
    const withinConcentration =
      projectedWeight <=
      context
        .maxPreferredConcentrationPercentage;

    score +=
      scoreSignal({
        condition:
          withinConcentration,
        positive:
          10,
        negative:
          -15
      });

    reasons.push(
      withinConcentration
        ? "The projected holding remains within the current concentration guideline."
        : "The projected holding would exceed the current concentration guideline."
    );
  }

  if (
    valuationUpside !==
      null
  ) {
    if (
      valuationUpside >=
      20
    ) {
      score +=
        15;

      reasons.push(
        "The current valuation context suggests meaningful upside."
      );
    } else if (
      valuationUpside <=
      -10
    ) {
      score -=
        15;

      reasons.push(
        "The current valuation context suggests limited or negative upside."
      );
    }
  }

  if (
    qualityScore !==
      null
  ) {
    if (
      qualityScore >=
      70
    ) {
      score +=
        8;

      reasons.push(
        "The underlying investment case has a relatively strong quality score."
      );
    } else if (
      qualityScore <
      45
    ) {
      score -=
        8;

      reasons.push(
        "The underlying investment case has a weak quality score."
      );
    }
  }

  if (
    convictionScore !==
      null
  ) {
    if (
      convictionScore >=
      70
    ) {
      score +=
        5;
    } else if (
      convictionScore <
      40
    ) {
      score -=
        5;
    }
  }

  if (
    context
      ?.liquidityNeed ===
    "HIGH"
  ) {
    score -=
      12;

    reasons.push(
      "The investor currently has a high liquidity need."
    );
  }

  if (
    context
      ?.incomePreference ===
    "INCOME"
  ) {
    if (
      action?.type ===
      CORPORATE_ACTION_TYPES
        .SCRIP_DIVIDEND
    ) {
      score -=
        10;

      reasons.push(
        "The investor currently prefers cash income over additional shares."
      );
    }
  }

  if (
    context
      ?.behaviorSignals
      ?.recentOverconcentration
  ) {
    score -=
      8;

    reasons.push(
      "Recent behavior suggests a tendency toward overconcentration, so increasing the position deserves extra caution."
    );
  }

  return {
    score:
      clamp(
        round(
          score,
          0
        ),
        0,
        100
      ),

    reasons
  };
}

export function classifyCorporateActionDecision({
  action,
  decisionScore,
  portfolioImpact,
  investorContext = {}
} = {}) {
  const context =
    normalizeContext(
      investorContext
    );

  const score =
    nullableNumber(
      decisionScore
        ?.score
    ) ??
    50;

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .RIGHTS_ISSUE
  ) {
    const requiredCapital =
      nullableNumber(
        portfolioImpact
          ?.cashImpact
          ?.requiredCapital
      );

    const canFullyFund =
      requiredCapital ===
        null ||
      context.availableCash ===
        null
        ? null
        : context.availableCash >=
          requiredCapital;

    if (
      score >=
        70 &&
      canFullyFund !==
        false
    ) {
      return {
        decision:
          CORPORATE_ACTION_DECISIONS
            .EXERCISE_FULL,

        rationale:
          "The current evidence supports exercising the full entitlement, subject to investor confirmation."
      };
    }

    if (
      score >=
      50
    ) {
      return {
        decision:
          CORPORATE_ACTION_DECISIONS
            .EXERCISE_PARTIAL,

        rationale:
          "The current evidence supports considering only part of the entitlement rather than increasing the position fully."
      };
    }

    if (
      score <
      40
    ) {
      return {
        decision:
          CORPORATE_ACTION_DECISIONS
            .HOLD_WAIT,

        rationale:
          "The current portfolio, liquidity, or investment context does not support increasing the position immediately."
      };
    }

    return {
      decision:
        CORPORATE_ACTION_DECISIONS
          .REVIEW_FURTHER,

      rationale:
        "The evidence is mixed and Coach G should discuss the trade-offs before recommending an election."
    };
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .SCRIP_DIVIDEND
  ) {
    if (
      context
        .incomePreference ===
      "INCOME"
    ) {
      return {
        decision:
          CORPORATE_ACTION_DECISIONS
            .TAKE_CASH,

        rationale:
          "The investor currently prefers income, making the cash election more aligned with the stated objective."
      };
    }

    if (
      score >=
      60
    ) {
      return {
        decision:
          CORPORATE_ACTION_DECISIONS
            .TAKE_SHARES,

        rationale:
          "The current portfolio and investment context supports taking shares rather than cash."
      };
    }

    return {
      decision:
        CORPORATE_ACTION_DECISIONS
          .TAKE_CASH,

      rationale:
        "The current evidence does not strongly support increasing the position through a scrip election."
    };
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .MERGER_ACQUISITION
  ) {
    return {
      decision:
        CORPORATE_ACTION_DECISIONS
          .REVIEW_FURTHER,

      rationale:
        "Merger and acquisition elections require review of the specific transaction terms before Coach G should recommend a choice."
    };
  }

  return {
    decision:
      CORPORATE_ACTION_DECISIONS
        .NO_ACTION_REQUIRED,

    rationale:
      "This corporate action does not currently require an investor election."
  };
}

export function classifyCorporateActionDecisionConfidence({
  score,
  reasons = []
} = {}) {
  const normalizedScore =
    nullableNumber(score) ??
    50;

  const distance =
    Math.abs(
      normalizedScore -
      50
    );

  if (
    distance >=
      25 &&
    reasons.length >=
      3
  ) {
    return CORPORATE_ACTION_DECISION_CONFIDENCE
      .HIGH;
  }

  if (
    distance >=
      12 &&
    reasons.length >=
      2
  ) {
    return CORPORATE_ACTION_DECISION_CONFIDENCE
      .MEDIUM;
  }

  return CORPORATE_ACTION_DECISION_CONFIDENCE
    .LOW;
}

export function buildCorporateActionDecisionIntelligence({
  action,
  holding,
  portfolio = {},
  investorContext = {},
  entitlement = null
} = {}) {
  const portfolioImpact =
    buildCorporateActionPortfolioImpact({
      action,
      holding,
      portfolio,
      investorContext,
      entitlement
    });

  if (
    !portfolioImpact?.valid
  ) {
    return {
      valid:
        false,

      error:
        portfolioImpact
          ?.error ||
        "PORTFOLIO_IMPACT_UNAVAILABLE"
    };
  }

  if (
    !portfolioImpact
      ?.decisionRequired
  ) {
    return {
      valid:
        true,

      actionId:
        action?.id ||
        null,

      symbol:
        action?.symbol ||
        null,

      decisionRequired:
        false,

      recommendation: {
        decision:
          CORPORATE_ACTION_DECISIONS
            .NO_ACTION_REQUIRED,

        rationale:
          "No investor election is currently required."
      },

      portfolioImpact
    };
  }

  const score =
    calculateCorporateActionDecisionScore({
      action,
      portfolioImpact,
      investorContext
    });

  const recommendation =
    classifyCorporateActionDecision({
      action,
      decisionScore:
        score,
      portfolioImpact,
      investorContext
    });

  const confidence =
    classifyCorporateActionDecisionConfidence({
      score:
        score.score,

      reasons:
        score.reasons
    });

  const shareAdjustmentScenario =
    action?.type ===
    CORPORATE_ACTION_TYPES
      .RIGHTS_ISSUE
      ? buildCorporateActionShareAdjustment({
          action,
          holding,
          investorContext,
          entitlement:
            portfolioImpact
              ?.entitlement
        })
      : null;

  return {
    valid:
      true,

    actionId:
      action?.id ||
      null,

    symbol:
      action?.symbol ||
      null,

    actionType:
      action?.type ||
      null,

    decisionRequired:
      true,

    decisionScore:
      score.score,

    confidence,

    reasons:
      score.reasons,

    recommendation,

    portfolioImpact,

    shareAdjustmentScenario,

    coachGContext: {
      shouldExplain:
        true,

      shouldAskInvestor:
        true,

      shouldPresentTradeoffs:
        true,

      explanation:
        buildCorporateActionDecisionExplanation({
          action,
          recommendation,
          score,
          portfolioImpact,
          investorContext
        })
    },

    safeguards: {
      advisoryOnly:
        true,

      investorDecisionRequired:
        true,

      executionPerformed:
        false,

      portfolioMutated:
        false
    }
  };
}

export function buildCorporateActionDecisionExplanation({
  action,
  recommendation,
  score,
  portfolioImpact,
  investorContext = {}
} = {}) {
  const requiredCapital =
    portfolioImpact
      ?.cashImpact
      ?.requiredCapital;

  const projectedWeight =
    portfolioImpact
      ?.allocationImpact
      ?.projectedWeightPercentage;

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .RIGHTS_ISSUE
  ) {
    return `Coach G currently leans toward ${recommendation?.decision || "further review"}. Exercising the full entitlement may require approximately ${action?.currency || "KES"} ${requiredCapital ?? "an unknown amount"} and may move the holding to approximately ${projectedWeight ?? "an unknown"}% of the portfolio. The recommendation score is ${score?.score ?? "unknown"}/100. Coach G should explain the reasons, confirm whether the investor's goals or circumstances have changed, and let the investor decide.`;
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .SCRIP_DIVIDEND
  ) {
    return `Coach G currently leans toward ${recommendation?.decision || "further review"}. The choice between cash and shares should reflect the investor's income needs, portfolio concentration, investment conviction, and current goals.`;
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .MERGER_ACQUISITION
  ) {
    return "Coach G should explain the transaction terms and investor-specific consequences before discussing an election.";
  }

  if (
    investorContext?.goal
  ) {
    return `Coach G should explain how this decision could affect progress toward ${investorContext.goal}.`;
  }

  return "Coach G should explain the investor-specific trade-offs and allow the investor to make the final decision.";
}

export function buildCorporateActionDecisionIntelligenceBatch({
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

        return buildCorporateActionDecisionIntelligence({
          action,
          holding,
          portfolio,
          investorContext
        });
      }
    )
    .filter(
      (item) =>
        item?.valid
    );
}

export function loadCorporateActionDecisionsRequiringCoachG({
  actions = [],
  holdings = [],
  portfolio = {},
  investorContext = {}
} = {}) {
  return buildCorporateActionDecisionIntelligenceBatch({
    actions,
    holdings,
    portfolio,
    investorContext
  })
    .filter(
      (item) =>
        item
          ?.decisionRequired
    )
    .sort(
      (
        first,
        second
      ) =>
        (
          second
            ?.decisionScore ||
          0
        ) -
        (
          first
            ?.decisionScore ||
          0
        )
    );
}
