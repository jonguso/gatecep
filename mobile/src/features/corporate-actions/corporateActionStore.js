import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

import {
  CORPORATE_ACTION_STATUSES,
  getCorporateActionCategory
} from "./corporateActionTypes";

const CORPORATE_ACTIONS_KEY =
  "corporateActions";

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function number(
  value
) {
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

function normalizeSymbol(
  value
) {
  return String(
    value ||
    ""
  )
    .trim()
    .toUpperCase();
}

function normalizeDate(
  value
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}

function normalizeActions(
  value
) {
  if (!value) {
    return [];
  }

  if (
    Array.isArray(
      value
    )
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    try {
      const parsed =
        JSON.parse(
          value
        );

      return Array.isArray(
        parsed
      )
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

/*
 * ============================================================
 * NORMALIZE ACTION
 * ============================================================
 */

function normalizeCorporateAction(
  action = {}
) {
  const now =
    new Date()
      .toISOString();

  const actionType =
    action?.actionType ||
    null;

  const ratioNumerator =
    number(
      action?.ratioNumerator
    );

  const ratioDenominator =
    number(
      action?.ratioDenominator
    );

  return {
    id:
      action?.id ||
      `CA-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`,

    type:
      "CORPORATE_ACTION",

    actionType,

    category:
      action?.category ||
      getCorporateActionCategory(
        actionType
      ),

    status:
      action?.status ||
      CORPORATE_ACTION_STATUSES
        .DRAFT,

    symbol:
      normalizeSymbol(
        action?.symbol
      ),

    companyName:
      action?.companyName ||
      null,

    sector:
      action?.sector ||
      null,

    targetSymbol:
      normalizeSymbol(
        action?.targetSymbol
      ) ||
      null,

    targetCompanyName:
      action?.targetCompanyName ||
      null,

    targetSector:
      action?.targetSector ||
      null,

    ratioNumerator,

    ratioDenominator,

    entitlementPrice:
      number(
        action?.entitlementPrice
      ),

    cashConsideration:
      number(
        action?.cashConsideration
      ),

    fractionalShareTreatment:
      action?.fractionalShareTreatment ||
      "ROUND_DOWN",

    announcementDate:
      normalizeDate(
        action?.announcementDate
      ),

    exDate:
      normalizeDate(
        action?.exDate
      ),

    recordDate:
      normalizeDate(
        action?.recordDate
      ),

    electionDeadline:
      normalizeDate(
        action?.electionDeadline
      ),

    effectiveDate:
      normalizeDate(
        action?.effectiveDate
      ),

    paymentDate:
      normalizeDate(
        action?.paymentDate
      ),

    source:
      action?.source ||
      "MANUAL_ENTRY",

    sourceReference:
      action?.sourceReference ||
      null,

    broker:
      action?.broker ||
      null,

    accountName:
      action?.accountName ||
      null,

    requiresApproval:
      action?.requiresApproval !==
      false,

    approved:
      Boolean(
        action?.approved
      ),

    approvedAt:
      normalizeDate(
        action?.approvedAt
      ),

    approvedBy:
      action?.approvedBy ||
      null,

    rejectedAt:
      normalizeDate(
        action?.rejectedAt
      ),

    rejectedBy:
      action?.rejectedBy ||
      null,

    rejectionReason:
      action?.rejectionReason ||
      null,

    executedAt:
      normalizeDate(
        action?.executedAt
      ),

    executedBy:
      action?.executedBy ||
      null,

    executionReference:
      action?.executionReference ||
      null,

    ledgerEventId:
      action?.ledgerEventId ||
      null,

    quantityBefore:
      number(
        action?.quantityBefore
      ),

    quantityChange:
      number(
        action?.quantityChange
      ),

    quantityAfter:
      number(
        action?.quantityAfter
      ),

    cashImpact:
      number(
        action?.cashImpact
      ),

    portfolioValueBefore:
      number(
        action?.portfolioValueBefore
      ),

    portfolioValueAfter:
      number(
        action?.portfolioValueAfter
      ),

    notes:
      action?.notes ||
      null,

    failureReason:
      action?.failureReason ||
      null,

    metadata:
      action?.metadata &&
      typeof action.metadata ===
        "object"
        ? action.metadata
        : {},

    createdAt:
      action?.createdAt ||
      now,

    updatedAt:
      action?.updatedAt ||
      now
  };
}

/*
 * ============================================================
 * LOAD
 * ============================================================
 */

export async function loadCorporateActions() {
  const raw =
    await userGetItem(
      CORPORATE_ACTIONS_KEY
    );

  return normalizeActions(
    raw
  );
}

/*
 * ============================================================
 * SAVE ALL
 * ============================================================
 */

export async function saveCorporateActions(
  actions = []
) {
  const normalized =
    Array.isArray(
      actions
    )
      ? actions
          .map(
            normalizeCorporateAction
          )
          .filter(
            (action) =>
              Boolean(
                action?.actionType &&
                action?.symbol
              )
          )
      : [];

  await userSetItem(
    CORPORATE_ACTIONS_KEY,
    JSON.stringify(
      normalized
    )
  );

  return normalized;
}

/*
 * ============================================================
 * CREATE OR UPDATE
 * ============================================================
 */

export async function saveCorporateAction(
  action = {}
) {
  if (
    !action?.actionType
  ) {
    throw new Error(
      "Corporate action type is required."
    );
  }

  if (
    !action?.symbol
  ) {
    throw new Error(
      "Corporate action security symbol is required."
    );
  }

  const actions =
    await loadCorporateActions();

  const normalized =
    normalizeCorporateAction(
      action
    );

  const existing =
    actions.find(
      (item) =>
        item?.id ===
          normalized.id ||
        (
          item?.actionType ===
            normalized.actionType &&
          item?.symbol ===
            normalized.symbol &&
          item?.recordDate ===
            normalized.recordDate &&
          Boolean(
            normalized.recordDate
          )
        )
    );

  let updated;

  if (existing) {
    updated =
      actions.map(
        (item) =>
          item?.id ===
          existing.id
            ? normalizeCorporateAction({
                ...item,
                ...action,

                id:
                  existing.id,

                createdAt:
                  existing.createdAt,

                updatedAt:
                  new Date()
                    .toISOString()
              })
            : item
      );
  } else {
    updated = [
      normalized,
      ...actions
    ];
  }

  await saveCorporateActions(
    updated
  );

  return (
    updated.find(
      (item) =>
        item?.id ===
        (
          existing?.id ||
          normalized.id
        )
    ) ||
    normalized
  );
}

/*
 * ============================================================
 * GET ONE
 * ============================================================
 */

export async function getCorporateAction(
  actionId
) {
  if (!actionId) {
    return null;
  }

  const actions =
    await loadCorporateActions();

  return (
    actions.find(
      (item) =>
        item?.id ===
        actionId
    ) ||
    null
  );
}

/*
 * ============================================================
 * UPDATE
 * ============================================================
 */

export async function updateCorporateAction(
  actionId,
  updates = {}
) {
  if (!actionId) {
    throw new Error(
      "Corporate action ID is required."
    );
  }

  const current =
    await getCorporateAction(
      actionId
    );

  if (!current) {
    throw new Error(
      "Corporate action was not found."
    );
  }

  return saveCorporateAction({
    ...current,
    ...updates,

    id:
      current.id,

    createdAt:
      current.createdAt,

    updatedAt:
      new Date()
        .toISOString()
  });
}

/*
 * ============================================================
 * SUBMIT FOR REVIEW
 * ============================================================
 */

export async function submitCorporateActionForReview(
  actionId
) {
  return updateCorporateAction(
    actionId,
    {
      status:
        CORPORATE_ACTION_STATUSES
          .UNDER_REVIEW
    }
  );
}

/*
 * ============================================================
 * APPROVE
 * ============================================================
 */

export async function approveCorporateAction(
  actionId,
  approvedBy = "CURRENT_USER"
) {
  const action =
    await getCorporateAction(
      actionId
    );

  if (!action) {
    throw new Error(
      "Corporate action was not found."
    );
  }

  if (
    action?.status ===
    CORPORATE_ACTION_STATUSES
      .EXECUTED
  ) {
    return action;
  }

  return updateCorporateAction(
    actionId,
    {
      status:
        CORPORATE_ACTION_STATUSES
          .APPROVED,

      approved:
        true,

      approvedBy,

      approvedAt:
        new Date()
          .toISOString(),

      rejectedAt:
        null,

      rejectedBy:
        null,

      rejectionReason:
        null
    }
  );
}

/*
 * ============================================================
 * REJECT
 * ============================================================
 */

export async function rejectCorporateAction(
  actionId,
  {
    rejectedBy =
      "CURRENT_USER",
    reason = null
  } = {}
) {
  return updateCorporateAction(
    actionId,
    {
      status:
        CORPORATE_ACTION_STATUSES
          .REJECTED,

      approved:
        false,

      rejectedBy,

      rejectedAt:
        new Date()
          .toISOString(),

      rejectionReason:
        reason,

      approvedAt:
        null,

      approvedBy:
        null
    }
  );
}

/*
 * ============================================================
 * MARK EXECUTED
 * ============================================================
 */

export async function markCorporateActionExecuted(
  actionId,
  execution = {}
) {
  return updateCorporateAction(
    actionId,
    {
      status:
        CORPORATE_ACTION_STATUSES
          .EXECUTED,

      approved:
        true,

      executedAt:
        execution?.executedAt ||
        new Date()
          .toISOString(),

      executedBy:
        execution?.executedBy ||
        "CURRENT_USER",

      executionReference:
        execution
          ?.executionReference ||
        null,

      ledgerEventId:
        execution?.ledgerEventId ||
        null,

      quantityBefore:
        execution
          ?.quantityBefore ||
        0,

      quantityChange:
        execution
          ?.quantityChange ||
        0,

      quantityAfter:
        execution
          ?.quantityAfter ||
        0,

      cashImpact:
        execution
          ?.cashImpact ||
        0,

      portfolioValueBefore:
        execution
          ?.portfolioValueBefore ||
        0,

      portfolioValueAfter:
        execution
          ?.portfolioValueAfter ||
        0,

      failureReason:
        null
    }
  );
}

/*
 * ============================================================
 * MARK FAILED
 * ============================================================
 */

export async function markCorporateActionFailed(
  actionId,
  failureReason
) {
  return updateCorporateAction(
    actionId,
    {
      status:
        CORPORATE_ACTION_STATUSES
          .FAILED,

      failureReason:
        failureReason ||
        "Corporate action execution failed."
    }
  );
}

/*
 * ============================================================
 * CANCEL
 * ============================================================
 */

export async function cancelCorporateAction(
  actionId
) {
  const action =
    await getCorporateAction(
      actionId
    );

  if (
    action?.status ===
    CORPORATE_ACTION_STATUSES
      .EXECUTED
  ) {
    throw new Error(
      "An executed corporate action cannot be cancelled."
    );
  }

  return updateCorporateAction(
    actionId,
    {
      status:
        CORPORATE_ACTION_STATUSES
          .CANCELLED
    }
  );
}

/*
 * ============================================================
 * FILTERS
 * ============================================================
 */

export async function loadCorporateActionsForSymbol(
  symbol
) {
  const normalized =
    normalizeSymbol(
      symbol
    );

  if (!normalized) {
    return [];
  }

  const actions =
    await loadCorporateActions();

  return actions.filter(
    (item) =>
      item?.symbol ===
      normalized
  );
}

export async function loadCorporateActionsForStatus(
  status
) {
  if (!status) {
    return [];
  }

  const actions =
    await loadCorporateActions();

  return actions.filter(
    (item) =>
      item?.status ===
      status
  );
}

export async function loadCorporateActionsForType(
  actionType
) {
  if (!actionType) {
    return [];
  }

  const actions =
    await loadCorporateActions();

  return actions.filter(
    (item) =>
      item?.actionType ===
      actionType
  );
}

/*
 * ============================================================
 * UPCOMING
 * ============================================================
 */

export async function loadUpcomingCorporateActions() {
  const actions =
    await loadCorporateActions();

  const now =
    new Date();

  return actions
    .filter(
      (item) => {
        if (
          item?.status ===
            CORPORATE_ACTION_STATUSES
              .CANCELLED ||
          item?.status ===
            CORPORATE_ACTION_STATUSES
              .REJECTED ||
          item?.status ===
            CORPORATE_ACTION_STATUSES
              .EXECUTED
        ) {
          return false;
        }

        const actionDate =
          item?.effectiveDate ||
          item?.recordDate ||
          item?.exDate;

        if (!actionDate) {
          return true;
        }

        const parsed =
          new Date(
            actionDate
          );

        return (
          !Number.isNaN(
            parsed.getTime()
          ) &&
          parsed >= now
        );
      }
    )
    .sort(
      (a, b) =>
        new Date(
          a?.effectiveDate ||
          a?.recordDate ||
          a?.exDate ||
          0
        ).getTime() -
        new Date(
          b?.effectiveDate ||
          b?.recordDate ||
          b?.exDate ||
          0
        ).getTime()
    );
}

/*
 * ============================================================
 * DELETE
 * ============================================================
 */

export async function deleteCorporateAction(
  actionId
) {
  if (!actionId) {
    return false;
  }

  const actions =
    await loadCorporateActions();

  const action =
    actions.find(
      (item) =>
        item?.id ===
        actionId
    );

  if (
    action?.status ===
    CORPORATE_ACTION_STATUSES
      .EXECUTED
  ) {
    throw new Error(
      "An executed corporate action cannot be deleted."
    );
  }

  const updated =
    actions.filter(
      (item) =>
        item?.id !==
        actionId
    );

  await saveCorporateActions(
    updated
  );

  return (
    updated.length !==
    actions.length
  );
}

/*
 * ============================================================
 * SUMMARY
 * ============================================================
 */

export async function getCorporateActionSummary() {
  const actions =
    await loadCorporateActions();

  const count =
    (status) =>
      actions.filter(
        (item) =>
          item?.status ===
          status
      ).length;

  return {
    total:
      actions.length,

    draft:
      count(
        CORPORATE_ACTION_STATUSES
          .DRAFT
      ),

    announced:
      count(
        CORPORATE_ACTION_STATUSES
          .ANNOUNCED
      ),

    underReview:
      count(
        CORPORATE_ACTION_STATUSES
          .UNDER_REVIEW
      ),

    approved:
      count(
        CORPORATE_ACTION_STATUSES
          .APPROVED
      ),

    executed:
      count(
        CORPORATE_ACTION_STATUSES
          .EXECUTED
      ),

    rejected:
      count(
        CORPORATE_ACTION_STATUSES
          .REJECTED
      ),

    cancelled:
      count(
        CORPORATE_ACTION_STATUSES
          .CANCELLED
      ),

    failed:
      count(
        CORPORATE_ACTION_STATUSES
          .FAILED
      )
  };
}