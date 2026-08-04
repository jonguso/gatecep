import {
  buildBrokerReconciliation
} from "./brokerReconciliationService";

import {
  loadBrokerResolutions,
  saveBrokerResolution
} from "./brokerResolutionStore";

import {
  addBrokerSyncAuditEvent
} from "./brokerSyncAuditStore";

import {
  addBrokerResolutionLedgerEvent
} from "./brokerResolutionLedgerStore";

import {
  getActiveBrokerReconciliationCase,
  loadBrokerReconciliationCases,
  resolveBrokerReconciliationCaseIssue
} from "./brokerReconciliationCaseStore";

import {
  createRecommendedBrokerAction
} from "./brokerReconciliationActionService";

export const RESOLUTION_OPTIONS = [
  {
    code:
      "PRACTICE_ONLY",

    label:
      "Practice-only position",

    description:
      "This position belongs only to the GateCEP learning portfolio and is not expected at the broker."
  },

  {
    code:
      "BROKER_DATA_PENDING",

    label:
      "Broker data pending",

    description:
      "The broker position may exist, but the latest broker synchronization has not reflected it yet."
  },

  {
    code:
      "POSITION_SOLD_OR_CLOSED",

    label:
      "Position sold or closed",

    description:
      "The broker no longer holds this position and GateCEP has not yet reflected the change."
  },

  {
    code:
      "IMPORT_TO_GATECEP",

    label:
      "Import into GateCEP",

    description:
      "The broker position is legitimate and should eventually be incorporated into the GateCEP investor record."
  },

  {
    code:
      "NEEDS_INVESTIGATION",

    label:
      "Needs investigation",

    description:
      "The discrepancy cannot yet be explained and should remain open for review."
  }
];

function discrepancyKey(
  type,
  symbol
) {
  return `${type}:${symbol || "ACCOUNT"}`;
}

export async function buildBrokerResolutionWorkflow() {
  const [
    reconciliation,
    resolutions
  ] = await Promise.all([
    buildBrokerReconciliation(),
    loadBrokerResolutions()
  ]);

  const existingMap =
    new Map(
      resolutions.map(
        (item) => [
          item.discrepancyKey,
          item
        ]
      )
    );

  const discrepancies = [];

  const holdings =
    Array.isArray(
      reconciliation?.holdings
    )
      ? reconciliation.holdings
      : [];

  holdings.forEach(
    (holding) => {
      if (
        holding.status ===
        "MATCHED"
      ) {
        return;
      }

      let type =
        holding.status;

      const key =
        discrepancyKey(
          type,
          holding.symbol
        );

      discrepancies.push({
        discrepancyKey:
          key,

        type,

        symbol:
          holding.symbol,

        title:
          buildHoldingTitle(
            holding
          ),

        description:
          buildHoldingDescription(
            holding
          ),

        practice:
          holding.practice,

        broker:
          holding.broker,

        resolution:
          existingMap.get(
            key
          ) || null
      });
    }
  );

  const cashDifference =
    Number(
      reconciliation?.summary
        ?.cashDifference ||
      0
    );

  if (
    Math.abs(
      cashDifference
    ) >= 0.01
  ) {
    const key =
      discrepancyKey(
        "CASH_MISMATCH",
        null
      );

    discrepancies.push({
      discrepancyKey:
        key,

      type:
        "CASH_MISMATCH",

      symbol:
        null,

      title:
        "Cash Balance Difference",

      description:
        `The broker cash balance differs from GateCEP by KES ${money(
          cashDifference
        )}.`,

      resolution:
        existingMap.get(
          key
        ) || null
    });
  }

  const resolvedCount =
    discrepancies.filter(
      (item) =>
        item.resolution
          ?.status ===
        "RESOLVED"
    ).length;

  const openCount =
    discrepancies.length -
    resolvedCount;

  let workflowStatus =
    "OPEN";

  if (
    discrepancies.length > 0 &&
    resolvedCount ===
      discrepancies.length
  ) {
    workflowStatus =
      "RESOLVED";
  } else if (
    resolvedCount > 0
  ) {
    workflowStatus =
      "PARTIALLY_RESOLVED";
  }

  if (
    discrepancies.length === 0
  ) {
    workflowStatus =
      "IN_SYNC";
  }

  return {
    generatedAt:
      new Date().toISOString(),

    workflowStatus,

    reconciliation,

    discrepancies,

    summary: {
      total:
        discrepancies.length,

      resolved:
        resolvedCount,

      open:
        openCount
    }
  };
}

export async function resolveBrokerDiscrepancy({
  discrepancy,
  resolutionCode
}) {
  if (!discrepancy) {
    throw new Error(
      "Discrepancy is required."
    );
  }

  const option =
    RESOLUTION_OPTIONS.find(
      (item) =>
        item.code ===
        resolutionCode
    );

  if (!option) {
    throw new Error(
      "Invalid resolution option."
    );
  }

  /*
   * Preserve the reconciliation values that existed
   * at the moment the human made the resolution.
   */
  const gatecepQuantity =
    Number(
      discrepancy?.practice
        ?.quantity ||
      0
    );

  const brokerQuantity =
    Number(
      discrepancy?.broker
        ?.quantity ||
      0
    );

  const gatecepValue =
    Number(
      discrepancy?.practice
        ?.marketValue ||
      0
    );

  const brokerValue =
    Number(
      discrepancy?.broker
        ?.marketValue ||
      0
    );

  /*
   * Save the current resolution state.
   */
  const savedResolution =
    await saveBrokerResolution({
      discrepancyKey:
        discrepancy.discrepancyKey,

      discrepancyType:
        discrepancy.type,

      symbol:
        discrepancy.symbol,

      resolutionCode:
        option.code,

      resolutionLabel:
        option.label,

      broker:
        discrepancy?.broker
          ?.broker ||
        null
    });

  /*
   * Append historical decision ledger entry.
   *
   * Same resolution + same quantities/values will
   * not create another ledger record.
   */
  const ledgerEvent =
    await addBrokerResolutionLedgerEvent({
      discrepancyKey:
        discrepancy.discrepancyKey,

      discrepancyType:
        discrepancy.type,

      symbol:
        discrepancy.symbol,

      broker:
        discrepancy?.broker
          ?.broker ||
        null,

      resolutionCode:
        option.code,

      resolutionLabel:
        option.label,

      gatecepQuantity,

      brokerQuantity,

      gatecepValue,

      brokerValue,

      status:
        savedResolution?.status ||
        "RESOLVED"
    });

 /*
 * ============================================================
 * PC-012 ACTIVE / MATCHING CASE UPDATE
 * ============================================================
 */

const activeCase =
  await getActiveBrokerReconciliationCase();

const allCases =
  await loadBrokerReconciliationCases();

const matchingCase =
  activeCase ||
  (
    Array.isArray(allCases)
      ? allCases.find(
          (item) =>
            Array.isArray(item?.issues) &&
            item.issues.some(
              (issue) =>
                issue?.discrepancyKey ===
                discrepancy?.discrepancyKey
            )
        )
      : null
  );

let updatedCase =
  matchingCase ||
  null;

if (
  matchingCase &&
  discrepancy?.symbol
) {
  updatedCase =
    await resolveBrokerReconciliationCaseIssue(
      matchingCase.id,
      discrepancy.symbol,
      {
        resolutionCode:
          option.code,

        resolutionLabel:
          option.label,

        resolutionDecisionId:
          ledgerEvent?.id ||
          null,

        resolvedAt:
          ledgerEvent?.createdAt ||
          new Date().toISOString()
      }
    );
}

/*
 * ============================================================
 * PC-013 CREATE FOLLOW-UP ACTION
 * ============================================================
 */

let recommendedAction =
  null;

if (
  updatedCase &&
  discrepancy?.discrepancyKey
) {
  const resolvedIssue =
    Array.isArray(
      updatedCase?.issues
    )
      ? updatedCase.issues.find(
          (issue) =>
            issue?.discrepancyKey ===
            discrepancy.discrepancyKey
        )
      : null;

  if (resolvedIssue) {
    recommendedAction =
      await createRecommendedBrokerAction({
        reconciliationCase:
          updatedCase,

        issue:
          resolvedIssue,

        resolution: {
          resolutionCode:
            option.code,

          resolutionLabel:
            option.label
        }
      });

    console.log(
      "PC-013 ACTION RESULT:",
      recommendedAction
    );
  } else {
    console.warn(
      "PC-013 could not find case issue:",
      discrepancy.discrepancyKey
    );
  }
}

const updatedWorkflow =
    await buildBrokerResolutionWorkflow();

  /*
   * Audit the resulting workflow state.
   */
  await addBrokerSyncAuditEvent({
    type:
      "BROKER_RESOLUTION",

    broker:
      updatedWorkflow
        ?.reconciliation
        ?.brokerMirror
        ?.broker ||
      null,

    status:
      updatedWorkflow
        ?.reconciliation
        ?.status ||
      null,

    classification:
      updatedWorkflow
        .workflowStatus,

    brokerTotal:
      updatedWorkflow
        ?.reconciliation
        ?.brokerMirror
        ?.totalValue ||
      0,

    gatecepTotal:
      updatedWorkflow
        ?.reconciliation
        ?.practicePortfolio
        ?.totalValue ||
      0,

    difference:
      updatedWorkflow
        ?.reconciliation
        ?.summary
        ?.totalDifference ||
      0,

    cashDifference:
      updatedWorkflow
        ?.reconciliation
        ?.summary
        ?.cashDifference ||
      0,

    holdingsCount:
      updatedWorkflow
        ?.reconciliation
        ?.brokerMirror
        ?.holdingsCount ||
      0,

    matched:
      updatedWorkflow
        ?.reconciliation
        ?.summary
        ?.matched ||
      0,

    mismatched:
      updatedWorkflow
        ?.reconciliation
        ?.summary
        ?.mismatched ||
      0,

    missingAtBroker:
      updatedWorkflow
        ?.reconciliation
        ?.summary
        ?.missingAtBroker ||
      0,

    extraAtBroker:
      updatedWorkflow
        ?.reconciliation
        ?.summary
        ?.extraAtBroker ||
      0,

    issues:
      updatedWorkflow.discrepancies
        .filter(
          (item) =>
            item.resolution
              ?.status !==
            "RESOLVED"
        )
        .map(
          (item) => ({
            type:
              item.type,

            severity:
              "REVIEW",

            count:
              1,

            symbols:
              item.symbol
                ? [
                    item.symbol
                  ]
                : []
          })
        )
  });

 return {
  ...updatedWorkflow,

  resolutionResult: {
    savedResolution,
    ledgerEvent,
    reconciliationCase:
      updatedCase,
    recommendedAction
  }
};
}

function buildHoldingTitle(
  holding
) {
  switch (
    holding.status
  ) {
    case "MISSING_AT_BROKER":
      return `${holding.symbol} Missing at Broker`;

    case "EXTRA_AT_BROKER":
      return `${holding.symbol} Extra at Broker`;

    case "DIFFERENT":
      return `${holding.symbol} Quantity or Value Difference`;

    default:
      return `${holding.symbol} Reconciliation Issue`;
  }
}

function buildHoldingDescription(
  holding
) {
  if (
    holding.status ===
    "MISSING_AT_BROKER"
  ) {
    return (
      `GateCEP records ${holding.practice?.quantity || 0} shares, ` +
      "but the broker mirror records none."
    );
  }

  if (
    holding.status ===
    "EXTRA_AT_BROKER"
  ) {
    return (
      `The broker records ${holding.broker?.quantity || 0} shares, ` +
      "but GateCEP currently records none."
    );
  }

  return (
    `GateCEP quantity: ${holding.practice?.quantity || 0}. ` +
    `Broker quantity: ${holding.broker?.quantity || 0}.`
  );
}

function money(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}