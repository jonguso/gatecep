import {
  findVerifiedEvidenceMatches
} from "./realOrderExecutionEvidenceMatchCore.js";

import {
  ORDER_STATUS
} from "../../services/trade/orderLifecycle.js";

import {
  brokerExecutionFillIdentity
} from "./brokerExecutionFillIdentity.js";

const RECOVERABLE_BROKER_STATUSES = new Set([
  "SUBMITTING",
  "SUBMISSION_UNCERTAIN",
  "MANUAL_CONFIRMATION_REQUIRED"
]);

function text(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return text(value).toUpperCase();
}

function number(value) {
  const next = Number(value);

  return Number.isFinite(next)
    ? next
    : 0;
}

export function buildRealOrderRecoveryTransition({
  order,
  executionMode,
  records = [],
  now = new Date().toISOString()
} = {}) {
  if (!order) {
    return {
      resolved: false,
      status: "ORDER_NOT_FOUND",
      matchCount: 0,
      patch: null,
      evidence: null
    };
  }

  const resolvedExecutionMode =
    upper(
      order?.executionMode ||
      executionMode
    );

  if (resolvedExecutionMode !== "REAL") {
    return {
      resolved: false,
      status: "NOT_REAL_ORDER",
      orderId: order?.id || null,
      matchCount: 0,
      patch: null,
      evidence: null
    };
  }

  const orderStatus =
    upper(order?.status);

  const brokerStatus =
    upper(order?.brokerStatus);

  const isUncertainRecovery =
    orderStatus ===
      ORDER_STATUS.BROKER_SELECTED &&
    RECOVERABLE_BROKER_STATUSES.has(
      brokerStatus
    );

  /*
   * PC-031A32:
   * A REAL partial fill can only have been created through verified
   * broker evidence. It remains recoverable so later authoritative
   * broker transaction evidence can advance the same parent order.
   */
  const isVerifiedPartialRecovery =
    orderStatus ===
      ORDER_STATUS.PARTIAL_FILL &&
    number(order?.remainingQuantity) > 0 &&
    Boolean(
      order?.brokerOrderId &&
      order?.verifiedExecutionEvidence
    );

  if (
    !isUncertainRecovery &&
    !isVerifiedPartialRecovery
  ) {
    return {
      resolved: false,
      status: "ORDER_NOT_RECOVERABLE",
      orderId: order?.id || null,
      brokerStatus,
      matchCount: 0,
      patch: null,
      evidence: null
    };
  }

  const matchedEvidence =
    findVerifiedEvidenceMatches({
      order,
      records
    });

  /*
   * PC-031A32:
   * Broker statements/imports may repeat the same execution row.
   * Recovery must accumulate unique broker fills, not imported rows.
   *
   * brokerReference identifies the parent broker ORDER.
   * brokerExecutionFillIdentity identifies the individual execution.
   *
   * This recalculates from the current authoritative evidence set;
   * it never adds the prior OMS filledQuantity to new evidence.
   */
  const uniqueEvidenceByFill =
    new Map();

  matchedEvidence.forEach(
    (record, index) => {
      const fillIdentity =
        brokerExecutionFillIdentity(
          record
        );

      const key =
        fillIdentity
          ? `FILL:${fillIdentity}`
          : `ROW:${index}`;

      if (
        !uniqueEvidenceByFill.has(
          key
        )
      ) {
        uniqueEvidenceByFill.set(
          key,
          record
        );
      }
    }
  );

  const matches =
    Array.from(
      uniqueEvidenceByFill.values()
    );

  if (matches.length === 0) {
    return {
      resolved: false,
      status: "NO_VERIFIED_MATCH",
      orderId: order?.id || null,
      matchCount: 0,
      patch: null,
      evidence: null
    };
  }

  const hasKnownBrokerReference =
    Boolean(text(order?.brokerOrderId));

  /*
   * Multiple heuristic candidates remain ambiguous.
   *
   * Multiple exact-reference records are different: broker statements
   * may contain several genuine execution fills for one parent broker
   * order, and those fills must be accumulated rather than guessed
   * away as ambiguity.
   */
  if (
    matches.length > 1 &&
    !hasKnownBrokerReference
  ) {
    return {
      resolved: false,
      status: "AMBIGUOUS_VERIFIED_MATCH",
      orderId: order?.id || null,
      matchCount: matches.length,
      brokerReferences:
        matches.map(
          (record) =>
            record?.brokerReference || null
        ),
      patch: null,
      evidence: null
    };
  }

  const totalOrderQuantity =
    number(order?.quantity);

  if (!(totalOrderQuantity > 0)) {
    return {
      resolved: false,
      status: "INVALID_ORDER_QUANTITY",
      orderId: order?.id || null,
      matchCount: matches.length,
      patch: null,
      evidence: null
    };
  }

  const cumulativeFilledQuantity =
    matches.reduce(
      (sum, evidence) =>
        sum + number(evidence?.quantity),
      0
    );

  const EPSILON = 0.000001;

  if (
    cumulativeFilledQuantity >
    totalOrderQuantity + EPSILON
  ) {
    return {
      resolved: false,
      status:
        "VERIFIED_EXECUTION_QUANTITY_EXCEEDS_ORDER",
      orderId: order?.id || null,
      matchCount: matches.length,
      filledQuantity:
        cumulativeFilledQuantity,
      orderQuantity:
        totalOrderQuantity,
      patch: null,
      evidence: null,
      evidenceRecords: matches
    };
  }

  const remainingQuantity =
    Math.max(
      totalOrderQuantity -
        cumulativeFilledQuantity,
      0
    );

  const completelyFilled =
    remainingQuantity <= EPSILON;

  const weightedFillValue =
    matches.reduce(
      (sum, evidence) =>
        sum +
        number(evidence?.quantity) *
          number(evidence?.price),
      0
    );

  const averageFillPrice =
    cumulativeFilledQuantity > 0
      ? weightedFillValue /
        cumulativeFilledQuantity
      : 0;

  const sortedEvidence =
    [...matches].sort(
      (left, right) =>
        new Date(
          left?.executionDate ||
          left?.date ||
          0
        ).getTime() -
        new Date(
          right?.executionDate ||
          right?.date ||
          0
        ).getTime()
    );

  const latestEvidence =
    sortedEvidence[
      sortedEvidence.length - 1
    ];

  const executionDate =
    latestEvidence?.executionDate ||
    latestEvidence?.date ||
    null;

  const transitionStatus =
    completelyFilled
      ? ORDER_STATUS.FILLED
      : ORDER_STATUS.PARTIAL_FILL;

  const reconciliationStatus =
    completelyFilled
      ? "RESOLVED_FROM_VERIFIED_BROKER_EXECUTION"
      : "PARTIAL_FILL_FROM_VERIFIED_BROKER_EXECUTION";

  const patch = {
    executionMode: "REAL",

    status: transitionStatus,

    brokerStatus:
      completelyFilled
        ? (
            latestEvidence?.executionStatus ||
            latestEvidence?.status ||
            "FILLED"
          )
        : "PARTIAL_FILL",

    brokerOrderId:
      order?.brokerOrderId ||
      latestEvidence?.brokerReference ||
      null,

    filledQuantity:
      cumulativeFilledQuantity,

    remainingQuantity,

    fillPercent:
      totalOrderQuantity > 0
        ? Number(
            (
              cumulativeFilledQuantity /
              totalOrderQuantity *
              100
            ).toFixed(6)
          )
        : 0,

    averageFillPrice,

    brokerReceivedAt:
      executionDate,

    message:
      completelyFilled
        ? "Resolved from verified broker execution evidence."
        : `Verified partial broker execution: ${cumulativeFilledQuantity}/${totalOrderQuantity}.`,

    verifiedExecutionEvidence: {
      evidenceStatus:
        "VERIFIED_BROKER_EXECUTION",

      sourceType:
        latestEvidence?.sourceType,

      source:
        latestEvidence?.source ||
        "TRANSACTION_UPLOAD",

      broker:
        latestEvidence?.broker || null,

      brokerReference:
        latestEvidence?.brokerReference ||
        order?.brokerOrderId ||
        null,

      executionDate,

      settlementStatus:
        latestEvidence?.settlementStatus ||
        null,

      settlementDate:
        latestEvidence?.settlementDate ||
        null,

      quantity:
        cumulativeFilledQuantity,

      price:
        averageFillPrice,

      totalFees:
        matches.reduce(
          (sum, evidence) =>
            sum +
            number(
              evidence?.totalFees ??
              evidence?.fees
            ),
          0
        ),

      fillCount:
        matches.length
    },

    verifiedExecutionEvidenceRecords:
      matches,

    realExecutionReconciliation: {
      status:
        reconciliationStatus,

      matchedAt: now,

      matchCount:
        matches.length,

      previousBrokerStatus:
        brokerStatus,

      submissionAttemptId:
        order?.submissionAttemptId ||
        null
    },

    isPractice: false,
    updatedAt: now
  };

  if (completelyFilled) {
    patch.filledAt =
      executionDate;
  } else {
    patch.filledAt = null;
  }

  return {
    resolved: true,
    status:
      reconciliationStatus,
    orderId: order?.id || null,
    matchCount:
      matches.length,
    evidence:
      latestEvidence,
    evidenceRecords:
      matches,
    patch
  };
}
