import {
  CORPORATE_ACTION_TYPES
} from "./corporateActionModel";

/*
 * ============================================================
 * PC-027C
 * INVESTOR ENTITLEMENT ENGINE
 * ============================================================
 *
 * Investor-first purpose:
 *
 * Determine whether a specific investor qualifies for a corporate
 * action and calculate the expected investor-specific effect.
 *
 * Inputs:
 * - corporate action
 * - investor holding / eligible quantity
 * - optional investor context
 *
 * Outputs:
 * - eligibility
 * - expected cash
 * - expected shares
 * - rights entitlement
 * - required subscription capital
 * - Coach G explanation context
 *
 * Safeguards:
 * - does not alter holdings
 * - does not alter cash
 * - does not assume broker confirmation
 * - does not fabricate eligibility when evidence is missing
 * ============================================================
 */

export const CORPORATE_ACTION_ENTITLEMENT_STATUSES = Object.freeze({
  NOT_EVALUATED: "NOT_EVALUATED",
  INELIGIBLE: "INELIGIBLE",
  ELIGIBILITY_UNKNOWN: "ELIGIBILITY_UNKNOWN",
  ELIGIBLE: "ELIGIBLE",
  ENTITLED: "ENTITLED",
  ACTION_REQUIRED: "ACTION_REQUIRED"
});

export const CORPORATE_ACTION_ELIGIBILITY_REASONS = Object.freeze({
  NO_HOLDING: "NO_HOLDING",
  HOLDING_AVAILABLE: "HOLDING_AVAILABLE",
  RECORD_DATE_EVIDENCE_MISSING: "RECORD_DATE_EVIDENCE_MISSING",
  ELIGIBLE_QUANTITY_AVAILABLE: "ELIGIBLE_QUANTITY_AVAILABLE",
  HOLDING_DATE_AFTER_CUTOFF: "HOLDING_DATE_AFTER_CUTOFF",
  MANUAL_CONFIRMATION: "MANUAL_CONFIRMATION",
  UNSUPPORTED_ACTION_TYPE: "UNSUPPORTED_ACTION_TYPE"
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

function positiveNumber(value) {
  const parsed =
    nullableNumber(value);

  return parsed !== null &&
    parsed > 0
      ? parsed
      : null;
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date
    .toISOString()
    .slice(0, 10);
}

function round(
  value,
  decimals = 4
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return null;
  }

  return Number(
    Number(value).toFixed(
      decimals
    )
  );
}

function floorEntitlement(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return Math.floor(
    Number(value)
  );
}

function normalizeHolding(
  holding = {}
) {
  return {
    symbol:
      holding?.symbol
        ? String(
            holding.symbol
          )
            .trim()
            .toUpperCase()
        : null,

    currentQuantity:
      nullableNumber(
        holding
          ?.currentQuantity ??
        holding
          ?.quantity
      ),

    eligibleQuantity:
      nullableNumber(
        holding
          ?.eligibleQuantity
      ),

    quantityOnRecordDate:
      nullableNumber(
        holding
          ?.quantityOnRecordDate
      ),

    acquiredAt:
      normalizeDate(
        holding?.acquiredAt
      ),

    holdingAsOf:
      normalizeDate(
        holding?.holdingAsOf
      ),

    manuallyConfirmedEligible:
      Boolean(
        holding
          ?.manuallyConfirmedEligible
      )
  };
}

export function determineCorporateActionEligibleQuantity({
  action,
  holding
} = {}) {
  const normalizedHolding =
    normalizeHolding(
      holding
    );

  if (
    normalizedHolding
      .eligibleQuantity !==
    null
  ) {
    return {
      quantity:
        Math.max(
          normalizedHolding
            .eligibleQuantity,
          0
        ),

      status:
        CORPORATE_ACTION_ENTITLEMENT_STATUSES
          .ELIGIBLE,

      reason:
        CORPORATE_ACTION_ELIGIBILITY_REASONS
          .ELIGIBLE_QUANTITY_AVAILABLE,

      evidence:
        "eligibleQuantity"
    };
  }

  if (
    normalizedHolding
      .quantityOnRecordDate !==
    null
  ) {
    return {
      quantity:
        Math.max(
          normalizedHolding
            .quantityOnRecordDate,
          0
        ),

      status:
        CORPORATE_ACTION_ENTITLEMENT_STATUSES
          .ELIGIBLE,

      reason:
        CORPORATE_ACTION_ELIGIBILITY_REASONS
          .ELIGIBLE_QUANTITY_AVAILABLE,

      evidence:
        "quantityOnRecordDate"
    };
  }

  if (
    normalizedHolding
      .manuallyConfirmedEligible
  ) {
    const quantity =
      Math.max(
        normalizedHolding
          .currentQuantity ||
        0,
        0
      );

    return {
      quantity,

      status:
        quantity > 0
          ? CORPORATE_ACTION_ENTITLEMENT_STATUSES
              .ELIGIBLE
          : CORPORATE_ACTION_ENTITLEMENT_STATUSES
              .INELIGIBLE,

      reason:
        CORPORATE_ACTION_ELIGIBILITY_REASONS
          .MANUAL_CONFIRMATION,

      evidence:
        "manualConfirmation"
    };
  }

  const currentQuantity =
    positiveNumber(
      normalizedHolding
        .currentQuantity
    );

  if (!currentQuantity) {
    return {
      quantity:
        0,

      status:
        CORPORATE_ACTION_ENTITLEMENT_STATUSES
          .INELIGIBLE,

      reason:
        CORPORATE_ACTION_ELIGIBILITY_REASONS
          .NO_HOLDING,

      evidence:
        "currentQuantity"
    };
  }

  const cutoffDate =
    normalizeDate(
      action?.recordDate ||
      action?.bookClosureDate ||
      action?.exDate
    );

  if (
    cutoffDate &&
    normalizedHolding
      .acquiredAt &&
    normalizedHolding
      .acquiredAt >
      cutoffDate
  ) {
    return {
      quantity:
        0,

      status:
        CORPORATE_ACTION_ENTITLEMENT_STATUSES
          .INELIGIBLE,

      reason:
        CORPORATE_ACTION_ELIGIBILITY_REASONS
          .HOLDING_DATE_AFTER_CUTOFF,

      evidence:
        "acquiredAt"
    };
  }

  if (
    cutoffDate &&
    !normalizedHolding
      .holdingAsOf &&
    !normalizedHolding
      .acquiredAt
  ) {
    return {
      quantity:
        currentQuantity,

      status:
        CORPORATE_ACTION_ENTITLEMENT_STATUSES
          .ELIGIBILITY_UNKNOWN,

      reason:
        CORPORATE_ACTION_ELIGIBILITY_REASONS
          .RECORD_DATE_EVIDENCE_MISSING,

      evidence:
        "currentQuantity"
    };
  }

  return {
    quantity:
      currentQuantity,

    status:
      CORPORATE_ACTION_ENTITLEMENT_STATUSES
        .ELIGIBLE,

    reason:
      CORPORATE_ACTION_ELIGIBILITY_REASONS
        .HOLDING_AVAILABLE,

    evidence:
      "currentQuantity"
  };
}

function calculateRatioEntitlement({
  eligibleQuantity,
  ratio
} = {}) {
  const newShares =
    positiveNumber(
      ratio?.newShares
    );

  const existingShares =
    positiveNumber(
      ratio?.existingShares
    );

  if (
    !newShares ||
    !existingShares ||
    eligibleQuantity === null ||
    eligibleQuantity === undefined
  ) {
    return null;
  }

  return (
    eligibleQuantity *
    newShares /
    existingShares
  );
}

export function calculateCashDividendEntitlement({
  action,
  eligibleQuantity
} = {}) {
  const amountPerShare =
    positiveNumber(
      action
        ?.cashAmountPerShare
    );

  if (!amountPerShare) {
    return {
      expectedCash:
        null,

      currency:
        action?.currency ||
        "KES",

      valid:
        false,

      reason:
        "DIVIDEND_AMOUNT_MISSING"
    };
  }

  return {
    expectedCash:
      round(
        eligibleQuantity *
        amountPerShare,
        2
      ),

    currency:
      action?.currency ||
      "KES",

    valid:
      true,

    reason:
      "CASH_DIVIDEND_CALCULATED"
  };
}

export function calculateBonusShareEntitlement({
  action,
  eligibleQuantity
} = {}) {
  const raw =
    calculateRatioEntitlement({
      eligibleQuantity,
      ratio:
        action?.ratio
    });

  return {
    expectedShares:
      raw === null
        ? null
        : floorEntitlement(
            raw
          ),

    rawExpectedShares:
      round(
        raw,
        6
      ),

    valid:
      raw !== null,

    reason:
      raw === null
        ? "BONUS_RATIO_MISSING"
        : "BONUS_SHARES_CALCULATED"
  };
}

export function calculateRightsEntitlement({
  action,
  eligibleQuantity
} = {}) {
  const raw =
    calculateRatioEntitlement({
      eligibleQuantity,
      ratio:
        action?.ratio
    });

  const rights =
    raw === null
      ? null
      : floorEntitlement(
          raw
        );

  const subscriptionPrice =
    positiveNumber(
      action
        ?.subscriptionPrice
    );

  return {
    entitledRights:
      rights,

    rawEntitledRights:
      round(
        raw,
        6
      ),

    subscriptionPrice,

    requiredCapital:
      rights !== null &&
      subscriptionPrice !== null
        ? round(
            rights *
            subscriptionPrice,
            2
          )
        : null,

    currency:
      action?.currency ||
      "KES",

    valid:
      rights !== null,

    reason:
      rights === null
        ? "RIGHTS_RATIO_MISSING"
        : "RIGHTS_ENTITLEMENT_CALCULATED"
  };
}

export function calculateSplitEntitlement({
  action,
  eligibleQuantity
} = {}) {
  const raw =
    calculateRatioEntitlement({
      eligibleQuantity,
      ratio:
        action?.ratio
    });

  return {
    expectedQuantity:
      raw === null
        ? null
        : round(
            raw,
            6
          ),

    quantityChange:
      raw === null
        ? null
        : round(
            raw -
            eligibleQuantity,
            6
          ),

    valid:
      raw !== null,

    reason:
      raw === null
        ? "SPLIT_RATIO_MISSING"
        : "SPLIT_QUANTITY_CALCULATED"
  };
}

export function buildInvestorCorporateActionEntitlement({
  action,
  holding,
  investorContext = {}
} = {}) {
  if (!action) {
    return {
      valid:
        false,

      error:
        "CORPORATE_ACTION_REQUIRED"
    };
  }

  const eligibility =
    determineCorporateActionEligibleQuantity({
      action,
      holding
    });

  const eligibleQuantity =
    eligibility.quantity;

  let financialImpact = {
    expectedCash:
      null,

    expectedShares:
      null,

    entitledRights:
      null,

    requiredCapital:
      null,

    expectedQuantity:
      null
  };

  switch (
    action.type
  ) {
    case CORPORATE_ACTION_TYPES
      .CASH_DIVIDEND:

    case CORPORATE_ACTION_TYPES
      .SPECIAL_DIVIDEND: {
      const result =
        calculateCashDividendEntitlement({
          action,
          eligibleQuantity
        });

      financialImpact = {
        ...financialImpact,
        expectedCash:
          result.expectedCash
      };

      break;
    }

    case CORPORATE_ACTION_TYPES
      .BONUS_ISSUE: {
      const result =
        calculateBonusShareEntitlement({
          action,
          eligibleQuantity
        });

      financialImpact = {
        ...financialImpact,
        expectedShares:
          result.expectedShares
      };

      break;
    }

    case CORPORATE_ACTION_TYPES
      .RIGHTS_ISSUE: {
      const result =
        calculateRightsEntitlement({
          action,
          eligibleQuantity
        });

      financialImpact = {
        ...financialImpact,
        entitledRights:
          result.entitledRights,

        requiredCapital:
          result.requiredCapital
      };

      break;
    }

    case CORPORATE_ACTION_TYPES
      .STOCK_SPLIT:

    case CORPORATE_ACTION_TYPES
      .SHARE_CONSOLIDATION: {
      const result =
        calculateSplitEntitlement({
          action,
          eligibleQuantity
        });

      financialImpact = {
        ...financialImpact,
        expectedQuantity:
          result.expectedQuantity
      };

      break;
    }

    default:
      break;
  }

  const decisionRequired =
    action.type ===
      CORPORATE_ACTION_TYPES
        .RIGHTS_ISSUE ||
    action.type ===
      CORPORATE_ACTION_TYPES
        .SCRIP_DIVIDEND ||
    action.type ===
      CORPORATE_ACTION_TYPES
        .MERGER_ACQUISITION;

  const hasFinancialImpact =
    Object.values(
      financialImpact
    ).some(
      (value) =>
        value !==
          null &&
        value !==
          undefined
    );

  const status =
    eligibility.status ===
      CORPORATE_ACTION_ENTITLEMENT_STATUSES
        .INELIGIBLE
      ? CORPORATE_ACTION_ENTITLEMENT_STATUSES
          .INELIGIBLE
      : eligibility.status ===
          CORPORATE_ACTION_ENTITLEMENT_STATUSES
            .ELIGIBILITY_UNKNOWN
        ? CORPORATE_ACTION_ENTITLEMENT_STATUSES
            .ELIGIBILITY_UNKNOWN
        : decisionRequired
          ? CORPORATE_ACTION_ENTITLEMENT_STATUSES
              .ACTION_REQUIRED
          : hasFinancialImpact
            ? CORPORATE_ACTION_ENTITLEMENT_STATUSES
                .ENTITLED
            : CORPORATE_ACTION_ENTITLEMENT_STATUSES
                .ELIGIBLE;

  return {
    valid:
      true,

    actionId:
      action.id ||
      null,

    symbol:
      action.symbol ||
      holding?.symbol ||
      null,

    actionType:
      action.type ||
      null,

    status,

    eligibility,

    eligibleQuantity,

    financialImpact,

    decisionRequired,

    investorContext: {
      goal:
        investorContext?.goal ||
        null,

      timeHorizon:
        investorContext
          ?.timeHorizon ||
        null,

      availableCash:
        nullableNumber(
          investorContext
            ?.availableCash
        ),

      incomePreference:
        investorContext
          ?.incomePreference ||
        null
    },

    coachGContext: {
      shouldExplain:
        status !==
        CORPORATE_ACTION_ENTITLEMENT_STATUSES
          .INELIGIBLE,

      shouldAskForEligibilityEvidence:
        status ===
        CORPORATE_ACTION_ENTITLEMENT_STATUSES
          .ELIGIBILITY_UNKNOWN,

      shouldDiscussDecision:
        decisionRequired,

      explanationFocus:
        buildEntitlementExplanationFocus({
          action,
          status,
          eligibleQuantity,
          financialImpact,
          investorContext
        })
    },

    safeguards: {
      portfolioMutated:
        false,

      cashMutated:
        false,

      brokerConfirmationAssumed:
        false
    }
  };
}

export function buildEntitlementExplanationFocus({
  action,
  status,
  eligibleQuantity,
  financialImpact,
  investorContext
} = {}) {
  if (
    status ===
    CORPORATE_ACTION_ENTITLEMENT_STATUSES
      .INELIGIBLE
  ) {
    return "The investor does not currently appear eligible for this corporate action.";
  }

  if (
    status ===
    CORPORATE_ACTION_ENTITLEMENT_STATUSES
      .ELIGIBILITY_UNKNOWN
  ) {
    return "GateCEP has a current holding but needs record-date or equivalent evidence before confirming entitlement.";
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .CASH_DIVIDEND ||
    action?.type ===
    CORPORATE_ACTION_TYPES
      .SPECIAL_DIVIDEND
  ) {
    return `The investor may receive ${action.currency || "KES"} ${financialImpact?.expectedCash ?? "an unknown amount"} from ${eligibleQuantity} eligible share(s). Coach G should relate this income to the investor's goals and reinvestment preference.`;
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .BONUS_ISSUE
  ) {
    return `The investor may receive ${financialImpact?.expectedShares ?? "an unknown number of"} additional share(s). Coach G should explain that this changes share quantity but does not automatically create equivalent new wealth.`;
  }

  if (
    action?.type ===
    CORPORATE_ACTION_TYPES
      .RIGHTS_ISSUE
  ) {
    return `The investor may be entitled to ${financialImpact?.entitledRights ?? "an unknown number of"} right(s), requiring approximately ${action.currency || "KES"} ${financialImpact?.requiredCapital ?? "an unknown amount"} to exercise fully. Coach G should compare the decision with goals, available cash, portfolio concentration, and the investment case.`;
  }

  if (
    action?.type ===
      CORPORATE_ACTION_TYPES
        .STOCK_SPLIT ||
    action?.type ===
      CORPORATE_ACTION_TYPES
        .SHARE_CONSOLIDATION
  ) {
    return `The investor's share quantity may adjust from ${eligibleQuantity} to ${financialImpact?.expectedQuantity ?? "an unknown quantity"}. Coach G should explain the mechanical adjustment so it is not mistaken for investment gain or loss.`;
  }

  if (
    investorContext?.goal
  ) {
    return `Coach G should explain how this corporate action may affect progress toward the investor's goal: ${investorContext.goal}.`;
  }

  return "Coach G should explain the investor-specific effect of this corporate action and whether any decision is required.";
}

export function buildInvestorCorporateActionEntitlementBatch({
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

      return buildInvestorCorporateActionEntitlement({
        action,
        holding,
        investorContext
      });
    }
  );
}

export function loadInvestorCorporateActionsRequiringDecision({
  actions = [],
  holdings = [],
  investorContext = {}
} = {}) {
  return buildInvestorCorporateActionEntitlementBatch({
    actions,
    holdings,
    investorContext
  }).filter(
    (item) =>
      item.decisionRequired &&
      item.status !==
      CORPORATE_ACTION_ENTITLEMENT_STATUSES
        .INELIGIBLE
  );
}

export function loadInvestorCorporateActionsWithUnknownEligibility({
  actions = [],
  holdings = [],
  investorContext = {}
} = {}) {
  return buildInvestorCorporateActionEntitlementBatch({
    actions,
    holdings,
    investorContext
  }).filter(
    (item) =>
      item.status ===
      CORPORATE_ACTION_ENTITLEMENT_STATUSES
        .ELIGIBILITY_UNKNOWN
  );
}
