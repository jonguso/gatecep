import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

const ACTIONS_KEY =
  "practiceBrokerReconciliationActions";

/*
 * Serialize action creation so two rapid clicks cannot both
 * read the same pre-save action list.
 */
let actionCreationQueue =
  Promise.resolve();

function buildActionIdentity(
  action = {}
) {
  return [
    String(
      action?.caseId || ""
    ).trim(),

    String(
      action?.discrepancyKey || ""
    )
      .trim()
      .toUpperCase(),

    String(
      action?.actionCode || ""
    )
      .trim()
      .toUpperCase()
  ].join("::");
}

/*
 * ============================================================
 * NORMALIZATION
 * ============================================================
 */

function normalizeActions(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed =
        JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeAction(
  action = {}
) {
  return {
    id:
      action?.id ||
      `BRA-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`,

    type:
      "BROKER_RECONCILIATION_ACTION",

    caseId:
      action?.caseId ||
      null,

    issueId:
      action?.issueId ||
      null,

    discrepancyKey:
      action?.discrepancyKey ||
      null,

    symbol:
      action?.symbol ||
      null,

    discrepancyType:
      action?.discrepancyType ||
      null,

    broker:
      action?.broker ||
      null,

    accountName:
      action?.accountName ||
      null,

    resolutionCode:
      action?.resolutionCode ||
      null,

    resolutionLabel:
      action?.resolutionLabel ||
      null,

    actionCode:
      action?.actionCode ||
      null,

    actionLabel:
      action?.actionLabel ||
      null,

    actionDescription:
      action?.actionDescription ||
      null,

    status:
      action?.status ||
      "PLANNED",

    priority:
      action?.priority ||
      "NORMAL",

    requiresApproval:
      Boolean(
        action?.requiresApproval
      ),

    approved:
      Boolean(
        action?.approved
      ),

    approvedAt:
      action?.approvedAt ||
      null,

    approvedBy:
      action?.approvedBy ||
      null,

    completedAt:
      action?.completedAt ||
      null,

    cancelledAt:
      action?.cancelledAt ||
      null,

    notes:
      action?.notes ||
      null,

    source:
      action?.source ||
      "PC_013_ACTION_ENGINE",

    createdAt:
      action?.createdAt ||
      new Date().toISOString(),

    updatedAt:
      action?.updatedAt ||
      new Date().toISOString()
  };
}

/*
 * ============================================================
 * LOAD
 * ============================================================
 */

export async function loadBrokerReconciliationActions() {
  const raw =
    await userGetItem(
      ACTIONS_KEY
    );

  return normalizeActions(
    raw
  );
}

/*
 * ============================================================
 * SAVE
 * ============================================================
 */

export async function saveBrokerReconciliationActions(
  actions = []
) {
  const safeActions =
    Array.isArray(actions)
      ? actions
      : [];

  await userSetItem(
    ACTIONS_KEY,
    JSON.stringify(
      safeActions
    )
  );

  return safeActions;
}

/*
 * ============================================================
 * CREATE ACTION
 * ============================================================
 */

export function createBrokerReconciliationAction(
  action = {}
) {
  const operation =
    actionCreationQueue.then(
      async () => {
        if (!action?.caseId) {
          throw new Error(
            "Reconciliation case ID is required."
          );
        }

        if (!action?.actionCode) {
          throw new Error(
            "Reconciliation action code is required."
          );
        }

        const actions =
          await loadBrokerReconciliationActions();

        const record =
          normalizeAction({
            ...action,

            createdAt:
              action?.createdAt ||
              new Date().toISOString(),

            updatedAt:
              new Date().toISOString()
          });

        const recordIdentity =
          buildActionIdentity(
            record
          );

        /*
         * One operational action per case issue and action type.
         *
         * This check includes PLANNED, APPROVED, IN_PROGRESS,
         * COMPLETED, and CANCELLED records. Repeated resolution
         * clicks must not create another action for the same
         * reconciliation issue.
         */
        const duplicate =
          actions.find(
            (item) =>
              buildActionIdentity(
                item
              ) ===
              recordIdentity
          );

        if (duplicate) {
          return duplicate;
        }

        const updated = [
          record,
          ...actions
        ];

        await saveBrokerReconciliationActions(
          updated
        );

        return record;
      }
    );

  /*
   * Keep the queue usable even when one creation attempt fails.
   */
  actionCreationQueue =
    operation.catch(
      () => null
    );

  return operation;
}
/*
 * ============================================================
 * GET ACTION
 * ============================================================
 */

export async function getBrokerReconciliationAction(
  actionId
) {
  if (!actionId) {
    return null;
  }

  const actions =
    await loadBrokerReconciliationActions();

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
 * LOAD ACTIONS FOR CASE
 * ============================================================
 */

export async function loadActionsForReconciliationCase(
  caseId
) {
  if (!caseId) {
    return [];
  }

  const actions =
    await loadBrokerReconciliationActions();

  return actions.filter(
    (item) =>
      item?.caseId ===
      caseId
  );
}

/*
 * ============================================================
 * LOAD ACTIONS FOR ISSUE
 * ============================================================
 */

export async function loadActionsForReconciliationIssue({
  caseId,
  discrepancyKey
}) {
  if (
    !caseId ||
    !discrepancyKey
  ) {
    return [];
  }

  const actions =
    await loadBrokerReconciliationActions();

  return actions.filter(
    (item) =>
      item?.caseId ===
        caseId &&
      item?.discrepancyKey ===
        discrepancyKey
  );
}

/*
 * ============================================================
 * UPDATE ACTION
 * ============================================================
 */

export async function updateBrokerReconciliationAction(
  actionId,
  updates = {}
) {
  if (!actionId) {
    throw new Error(
      "Reconciliation action ID is required."
    );
  }

  const actions =
    await loadBrokerReconciliationActions();

  const now =
    new Date().toISOString();

  let updatedAction =
    null;

  const updatedActions =
    actions.map(
      (item) => {
        if (
          item?.id !==
          actionId
        ) {
          return item;
        }

        const nextStatus =
          updates?.status ||
          item?.status ||
          "PLANNED";

        updatedAction =
          normalizeAction({
            ...item,
            ...updates,

            id:
              item.id,

            status:
              nextStatus,

            approvedAt:
              nextStatus ===
                "APPROVED"
                ? item?.approvedAt ||
                  updates?.approvedAt ||
                  now
                : updates?.approvedAt ??
                  item?.approvedAt ??
                  null,

            completedAt:
              nextStatus ===
                "COMPLETED"
                ? item?.completedAt ||
                  updates?.completedAt ||
                  now
                : updates?.completedAt ??
                  item?.completedAt ??
                  null,

            cancelledAt:
              nextStatus ===
                "CANCELLED"
                ? item?.cancelledAt ||
                  updates?.cancelledAt ||
                  now
                : updates?.cancelledAt ??
                  item?.cancelledAt ??
                  null,

            updatedAt:
              now
          });

        return updatedAction;
      }
    );

  await saveBrokerReconciliationActions(
    updatedActions
  );

  return updatedAction;
}

/*
 * ============================================================
 * START ACTION
 * ============================================================
 */

export async function startBrokerReconciliationAction(
  actionId
) {
  return updateBrokerReconciliationAction(
    actionId,
    {
      status:
        "IN_PROGRESS"
    }
  );
}

/*
 * ============================================================
 * APPROVE ACTION
 * ============================================================
 */

export async function approveBrokerReconciliationAction(
  actionId,
  approvedBy = null
) {
  return updateBrokerReconciliationAction(
    actionId,
    {
      status:
        "APPROVED",

      approved:
        true,

      approvedBy,

      approvedAt:
        new Date().toISOString()
    }
  );
}

/*
 * ============================================================
 * COMPLETE ACTION
 * ============================================================
 */

export async function completeBrokerReconciliationAction(
  actionId,
  notes = null
) {
  return updateBrokerReconciliationAction(
    actionId,
    {
      status:
        "COMPLETED",

      notes,

      completedAt:
        new Date().toISOString()
    }
  );
}

/*
 * ============================================================
 * CANCEL ACTION
 * ============================================================
 */

export async function cancelBrokerReconciliationAction(
  actionId,
  notes = null
) {
  return updateBrokerReconciliationAction(
    actionId,
    {
      status:
        "CANCELLED",

      notes,

      cancelledAt:
        new Date().toISOString()
    }
  );
}

/*
 * ============================================================
 * SUMMARY
 * ============================================================
 */

export async function getBrokerReconciliationActionSummary() {
  const actions =
    await loadBrokerReconciliationActions();

  return {
    total:
      actions.length,

    planned:
      actions.filter(
        (item) =>
          item?.status ===
          "PLANNED"
      ).length,

    inProgress:
      actions.filter(
        (item) =>
          item?.status ===
          "IN_PROGRESS"
      ).length,

    approved:
      actions.filter(
        (item) =>
          item?.status ===
          "APPROVED"
      ).length,

    completed:
      actions.filter(
        (item) =>
          item?.status ===
          "COMPLETED"
      ).length,

    cancelled:
      actions.filter(
        (item) =>
          item?.status ===
          "CANCELLED"
      ).length
  };
}
