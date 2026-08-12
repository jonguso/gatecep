import {
  CORPORATE_ACTION_TYPES
} from "./corporateActionModel";

import {
  CORPORATE_ACTION_ENTITLEMENT_STATUSES,
  buildInvestorCorporateActionEntitlement
} from "./investorCorporateActionEntitlementEngine";

/*
 * ============================================================
 * PC-027E
 * CORPORATE ACTION INCOME & RECEIVABLE ENGINE
 * ============================================================
 *
 * Investor-first purpose:
 *
 * Track expected cash benefits from entitlement through receivable,
 * payment, and reconciliation so Coach G can distinguish:
 *
 * DECLARED
 * → ELIGIBLE
 * → EXPECTED INCOME
 * → RECEIVABLE
 * → PAID
 * → RECONCILED
 *
 * Primary use cases:
 * - dividend income planning
 * - dividend reinvestment guidance
 * - cash-flow awareness
 * - goal tracking
 * - identifying missing payments
 *
 * Safeguards:
 * - does not mutate actual cash balances
 * - does not assume receipt without evidence
 * - does not mark a payment reconciled without matching evidence
 * ============================================================
 */

export const CORPORATE_ACTION_RECEIVABLE_STATUSES = Object.freeze({
  NOT_APPLICABLE: "NOT_APPLICABLE",
  ELIGIBILITY_UNKNOWN: "ELIGIBILITY_UNKNOWN",
  EXPECTED: "EXPECTED",
  RECEIVABLE: "RECEIVABLE",
  PAID_UNCONFIRMED: "PAID_UNCONFIRMED",
  PAID: "PAID",
  RECONCILED: "RECONCILED",
  OVERDUE: "OVERDUE"
});

export const CORPORATE_ACTION_PAYMENT_EVIDENCE_TYPES = Object.freeze({
  NONE: "NONE",
  MANUAL: "MANUAL",
  ACCOUNT_STATEMENT: "ACCOUNT_STATEMENT",
  TRANSACTION_IMPORT: "TRANSACTION_IMPORT",
  BROKER_FEED: "BROKER_FEED"
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

function round(
  value,
  decimals = 2
) {
  const parsed =
    nullableNumber(value);

  return parsed === null
    ? null
    : Number(
        parsed.toFixed(decimals)
      );
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date
        .toISOString()
        .slice(0, 10);
}

function isCashIncomeAction(
  action
) {
  return [
    CORPORATE_ACTION_TYPES
      .CASH_DIVIDEND,
    CORPORATE_ACTION_TYPES
      .SPECIAL_DIVIDEND,
    CORPORATE_ACTION_TYPES
      .CAPITAL_DISTRIBUTION
  ].includes(
    action?.type
  );
}

export function buildCorporateActionReceivable({
  action,
  holding,
  investorContext = {},
  entitlement = null,
  asOfDate = new Date()
    .toISOString()
    .slice(0, 10)
} = {}) {
  if (
    !isCashIncomeAction(
      action
    )
  ) {
    return {
      valid:
        true,

      status:
        CORPORATE_ACTION_RECEIVABLE_STATUSES
          .NOT_APPLICABLE,

      reason:
        "This corporate action is not primarily a cash-income event."
    };
  }

  const resolvedEntitlement =
    entitlement ||
    buildInvestorCorporateActionEntitlement({
      action,
      holding,
      investorContext
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
        CORPORATE_ACTION_RECEIVABLE_STATUSES
          .NOT_APPLICABLE,

      reason:
        "The investor does not appear eligible for this cash corporate action.",

      entitlement:
        resolvedEntitlement
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
        CORPORATE_ACTION_RECEIVABLE_STATUSES
          .ELIGIBILITY_UNKNOWN,

      reason:
        "GateCEP needs eligibility evidence before treating this income as receivable.",

      entitlement:
        resolvedEntitlement
    };
  }

  const expectedAmount =
    nullableNumber(
      resolvedEntitlement
        ?.financialImpact
        ?.expectedCash
    );

  const paymentDate =
    normalizeDate(
      action?.paymentDate
    );

  const normalizedAsOf =
    normalizeDate(
      asOfDate
    );

  let status =
    CORPORATE_ACTION_RECEIVABLE_STATUSES
      .EXPECTED;

  if (
    paymentDate &&
    normalizedAsOf &&
    normalizedAsOf >=
      paymentDate
  ) {
    status =
      CORPORATE_ACTION_RECEIVABLE_STATUSES
        .RECEIVABLE;
  }

  if (
    paymentDate &&
    normalizedAsOf &&
    normalizedAsOf >
      paymentDate
  ) {
    status =
      CORPORATE_ACTION_RECEIVABLE_STATUSES
        .OVERDUE;
  }

  return {
    valid:
      true,

    receivableId:
      `RECV-${action?.id || "UNKNOWN"}`,

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

    currency:
      action?.currency ||
      "KES",

    status,

    expectedAmount:
      round(
        expectedAmount,
        2
      ),

    eligibleQuantity:
      resolvedEntitlement
        ?.eligibleQuantity ??
      null,

    amountPerShare:
      nullableNumber(
        action
          ?.cashAmountPerShare
      ),

    announcementDate:
      normalizeDate(
        action
          ?.announcementDate
      ),

    exDate:
      normalizeDate(
        action
          ?.exDate
      ),

    recordDate:
      normalizeDate(
        action
          ?.recordDate
      ),

    paymentDate,

    receivedAmount:
      null,

    receivedDate:
      null,

    evidence: {
      type:
        CORPORATE_ACTION_PAYMENT_EVIDENCE_TYPES
          .NONE,

      reference:
        null
    },

    entitlement:
      resolvedEntitlement,

    coachGContext: {
      shouldExplain:
        true,

      shouldMonitor:
        true,

      shouldDiscussReinvestment:
        expectedAmount !==
          null &&
        expectedAmount >
          0,

      explanation:
        `The investor is expected to receive ${action?.currency || "KES"} ${round(expectedAmount, 2) ?? "an unknown amount"} from this corporate action. Coach G should relate the expected income to the investor's cash needs, goals, and reinvestment plan.`
    },

    safeguards: {
      cashMutated:
        false,

      receiptAssumed:
        false,

      reconciliationAssumed:
        false
    }
  };
}

export function recordCorporateActionPayment({
  receivable,
  amount,
  receivedDate,
  evidenceType =
    CORPORATE_ACTION_PAYMENT_EVIDENCE_TYPES
      .MANUAL,
  reference = null
} = {}) {
  if (!receivable?.valid) {
    return {
      success:
        false,

      error:
        "VALID_RECEIVABLE_REQUIRED"
    };
  }

  const receivedAmount =
    nullableNumber(
      amount
    );

  if (
    receivedAmount ===
      null ||
    receivedAmount <
      0
  ) {
    return {
      success:
        false,

      error:
        "VALID_PAYMENT_AMOUNT_REQUIRED"
    };
  }

  const expectedAmount =
    nullableNumber(
      receivable
        ?.expectedAmount
    );

  const difference =
    expectedAmount ===
      null
      ? null
      : round(
          receivedAmount -
          expectedAmount,
          2
        );

  return {
    success:
      true,

    receivable: {
      ...receivable,

      status:
        CORPORATE_ACTION_RECEIVABLE_STATUSES
          .PAID,

      receivedAmount:
        round(
          receivedAmount,
          2
        ),

      receivedDate:
        normalizeDate(
          receivedDate
        ) ||
        new Date()
          .toISOString()
          .slice(0, 10),

      difference,

      evidence: {
        type:
          evidenceType,

        reference:
          reference ||
          null
      },

      coachGContext: {
        ...(receivable
          .coachGContext ||
        {}),

        shouldMonitor:
          true,

        explanation:
          difference ===
            0
            ? "The expected corporate-action income appears to have been paid in full. Reconciliation is still required before the lifecycle is complete."
            : `A payment of ${receivable.currency || "KES"} ${round(receivedAmount, 2)} was recorded against an expected amount of ${receivable.currency || "KES"} ${round(expectedAmount, 2) ?? "unknown"}. Coach G should explain any difference before reconciliation.`
      },

      safeguards: {
        ...(receivable
          .safeguards ||
        {}),

        cashMutated:
          false,

        receiptAssumed:
          false,

        reconciliationAssumed:
          false
      }
    }
  };
}

export function reconcileCorporateActionReceivable({
  receivable,
  tolerance = 0.01
} = {}) {
  if (
    !receivable ||
    receivable.status !==
      CORPORATE_ACTION_RECEIVABLE_STATUSES
        .PAID
  ) {
    return {
      success:
        false,

      error:
        "PAID_RECEIVABLE_REQUIRED"
    };
  }

  const expected =
    nullableNumber(
      receivable
        .expectedAmount
    );

  const received =
    nullableNumber(
      receivable
        .receivedAmount
    );

  if (
    expected ===
      null ||
    received ===
      null
  ) {
    return {
      success:
        false,

      error:
        "EXPECTED_AND_RECEIVED_AMOUNTS_REQUIRED"
    };
  }

  const difference =
    round(
      received -
      expected,
      2
    );

  const reconciled =
    Math.abs(
      difference
    ) <=
    Math.abs(
      tolerance
    );

  return {
    success:
      reconciled,

    reconciled,

    difference,

    receivable: {
      ...receivable,

      status:
        reconciled
          ? CORPORATE_ACTION_RECEIVABLE_STATUSES
              .RECONCILED
          : CORPORATE_ACTION_RECEIVABLE_STATUSES
              .PAID,

      difference,

      coachGContext: {
        ...(receivable
          .coachGContext ||
        {}),

        shouldMonitor:
          !reconciled,

        explanation:
          reconciled
            ? "The corporate-action income has been matched to the expected entitlement and is reconciled."
            : `The received amount differs from the expected entitlement by ${receivable.currency || "KES"} ${difference}. Coach G should surface the mismatch for review.`
      }
    }
  };
}

export function buildCorporateActionIncomeSchedule({
  actions = [],
  holdings = [],
  investorContext = {},
  asOfDate = new Date()
    .toISOString()
    .slice(0, 10)
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
    .filter(
      isCashIncomeAction
    )
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

        return buildCorporateActionReceivable({
          action,
          holding,
          investorContext,
          asOfDate
        });
      }
    )
    .filter(
      (item) =>
        item?.valid &&
        item.status !==
          CORPORATE_ACTION_RECEIVABLE_STATUSES
            .NOT_APPLICABLE
    )
    .sort(
      (
        first,
        second
      ) =>
        String(
          first
            ?.paymentDate ||
          ""
        ).localeCompare(
          String(
            second
              ?.paymentDate ||
            ""
          )
        )
    );
}

export function buildCorporateActionIncomeSummary({
  receivables = []
} = {}) {
  const normalized =
    Array.isArray(
      receivables
    )
      ? receivables
      : [];

  const active =
    normalized.filter(
      (item) =>
        item?.valid &&
        ![
          CORPORATE_ACTION_RECEIVABLE_STATUSES
            .NOT_APPLICABLE,
          CORPORATE_ACTION_RECEIVABLE_STATUSES
            .ELIGIBILITY_UNKNOWN
        ].includes(
          item.status
        )
    );

  const expectedIncome =
    active.reduce(
      (
        total,
        item
      ) =>
        total +
        (
          nullableNumber(
            item
              ?.expectedAmount
          ) ||
          0
        ),
      0
    );

  const receivedIncome =
    active.reduce(
      (
        total,
        item
      ) =>
        total +
        (
          nullableNumber(
            item
              ?.receivedAmount
          ) ||
          0
        ),
      0
    );

  return {
    totalReceivables:
      active.length,

    expectedIncome:
      round(
        expectedIncome,
        2
      ),

    receivedIncome:
      round(
        receivedIncome,
        2
      ),

    outstandingIncome:
      round(
        expectedIncome -
        receivedIncome,
        2
      ),

    overdueCount:
      active.filter(
        (item) =>
          item.status ===
          CORPORATE_ACTION_RECEIVABLE_STATUSES
            .OVERDUE
      ).length,

    reconciledCount:
      active.filter(
        (item) =>
          item.status ===
          CORPORATE_ACTION_RECEIVABLE_STATUSES
            .RECONCILED
      ).length,

    currency:
      active[0]
        ?.currency ||
      "KES"
  };
}

export function loadCorporateActionReceivablesNeedingCoachG({
  receivables = []
} = {}) {
  const normalized =
    Array.isArray(
      receivables
    )
      ? receivables
      : [];

  return normalized.filter(
    (item) =>
      item?.valid &&
      (
        item.status ===
          CORPORATE_ACTION_RECEIVABLE_STATUSES
            .ELIGIBILITY_UNKNOWN ||
        item.status ===
          CORPORATE_ACTION_RECEIVABLE_STATUSES
            .OVERDUE ||
        item.status ===
          CORPORATE_ACTION_RECEIVABLE_STATUSES
            .PAID ||
        item
          ?.coachGContext
          ?.shouldDiscussReinvestment
      )
  );
}
