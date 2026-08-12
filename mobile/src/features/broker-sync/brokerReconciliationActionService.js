import {
  createBrokerReconciliationAction
} from "./brokerReconciliationActionStore";

/*
 * ============================================================
 * PC-013
 * ACTION RECOMMENDATION ENGINE
 * ============================================================
 *
 * This service converts a reconciliation resolution into the
 * operational action that should follow.
 *
 * IMPORTANT:
 * Nothing here changes holdings or submits broker orders.
 */

export const ACTION_LIBRARY = {
  GATECEP_REAL_ONLY: {
    actionCode: "NO_ACTION_REQUIRED",
    actionLabel: "No action required",
    actionDescription:
      "Position exists only in GateCEP's REAL portfolio. Review the broker statement before changing either record.",
    priority: "LOW",
    requiresApproval: false
  },

  BROKER_DATA_PENDING: {
    actionCode: "REQUEST_BROKER_REFRESH",
    actionLabel: "Request broker refresh",
    actionDescription:
      "Run another broker synchronization before changing records.",
    priority: "NORMAL",
    requiresApproval: false
  },

  POSITION_SOLD_OR_CLOSED: {
    actionCode: "VERIFY_POSITION_CLOSED",
    actionLabel: "Verify closed position",
    actionDescription:
      "Confirm the broker sale before updating GateCEP.",
    priority: "HIGH",
    requiresApproval: true
  },

  IMPORT_TO_GATECEP: {
    actionCode: "QUEUE_IMPORT_REVIEW",
    actionLabel: "Queue import review",
    actionDescription:
      "Hold for controlled portfolio import review.",
    priority: "HIGH",
    requiresApproval: true
  },

  NEEDS_INVESTIGATION: {
    actionCode: "ESCALATE_INVESTIGATION",
    actionLabel: "Escalate investigation",
    actionDescription:
      "Manual investigation required.",
    priority: "HIGH",
    requiresApproval: true
  }
};
/*
 * ============================================================
 * CREATE RECOMMENDED ACTION
 * ============================================================
 */

export async function createRecommendedBrokerAction({
  reconciliationCase,
  issue,
  resolution
}) {
  if (!reconciliationCase) {
    throw new Error(
      "Reconciliation case is required."
    );
  }

  if (!issue) {
    throw new Error(
      "Issue is required."
    );
  }

  if (!resolution?.resolutionCode) {
    return null;
  }

  const template =
    ACTION_LIBRARY[
      resolution.resolutionCode
    ];

  if (!template) {
    return null;
  }

  return createBrokerReconciliationAction({
    caseId:
      reconciliationCase.id,

    issueId:
      issue.id || null,

    discrepancyKey:
      issue.discrepancyKey,

    symbol:
      issue.symbol,

    discrepancyType:
  issue.discrepancyType ||
  issue.type ||
  null,

    broker:
      reconciliationCase.broker,

    accountName:
      reconciliationCase.accountName,

    resolutionCode:
      resolution.resolutionCode,

    resolutionLabel:
      resolution.resolutionLabel,

    actionCode:
      template.actionCode,

    actionLabel:
      template.actionLabel,

    actionDescription:
      template.actionDescription,

    priority:
      template.priority,

    requiresApproval:
      template.requiresApproval
  });
}

