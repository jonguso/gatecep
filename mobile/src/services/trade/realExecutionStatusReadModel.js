import { ORDER_STATUS } from "./orderLifecycle.js";

const RECOVERY_BROKER_STATUSES = new Set([
  "SUBMITTING",
  "SUBMISSION_UNCERTAIN",
  "MANUAL_CONFIRMATION_REQUIRED"
]);

function upper(value, fallback = "") {
  return String(value ?? fallback).trim().toUpperCase();
}

export function executionModeOf(order = {}, execution = {}) {
  return upper(
    order?.executionMode ||
      execution?.executionMode ||
      execution?.orders?.[0]?.executionMode ||
      "PRACTICE"
  ) === "REAL"
    ? "REAL"
    : "PRACTICE";
}

export function isRealExecutionOrder(order = {}, execution = {}) {
  return executionModeOf(order, execution) === "REAL";
}

export function requiresRealOrderRecovery(order = {}, execution = {}) {
  if (!isRealExecutionOrder(order, execution)) return false;

  const status = upper(order?.status);
  const brokerStatus = upper(order?.brokerStatus);

  return (
    (
      status === ORDER_STATUS.BROKER_SELECTED &&
      RECOVERY_BROKER_STATUSES.has(brokerStatus)
    ) ||
    (
      status === ORDER_STATUS.PARTIAL_FILL &&
      Number(order?.remainingQuantity || 0) > 0 &&
      Boolean(
        order?.brokerOrderId &&
        order?.verifiedExecutionEvidence
      )
    )
  );
}

export function buildExecutionStatusReadModel(
  order = {},
  execution = {}
) {
  const executionMode = executionModeOf(order, execution);
  const status = upper(order?.status, ORDER_STATUS.REVIEW);
  const brokerStatus = upper(order?.brokerStatus);
  const isReal = executionMode === "REAL";

  const recoveryRequired =
    isReal &&
    (
      (
        status === ORDER_STATUS.BROKER_SELECTED &&
        RECOVERY_BROKER_STATUSES.has(brokerStatus)
      ) ||
      (
        status === ORDER_STATUS.PARTIAL_FILL &&
        Number(order?.remainingQuantity || 0) > 0 &&
        Boolean(
          order?.brokerOrderId &&
          order?.verifiedExecutionEvidence
        )
      )
    );

  let phase = "REVIEW";
  let label = "Review";
  let explanation = "Review the order before preparing it.";
  let canRetryRouting = false;

  if (status === ORDER_STATUS.QUEUED) {
    phase = "QUEUED";
    label = "Queued";
    explanation = isReal
      ? "Prepared for submission through the selected broker."
      : "Queued for Practice broker simulation.";
    canRetryRouting = true;
  } else if (
    status === ORDER_STATUS.BROKER_SELECTED &&
    brokerStatus === "ADAPTER_ERROR"
  ) {
    phase = "ROUTING_FAILED";
    label = "Broker Routing Failed";
    explanation =
      "The broker adapter reported a definite pre-submission failure. The same selected broker may be retried.";
    canRetryRouting = true;
  } else if (
    status === ORDER_STATUS.BROKER_SELECTED &&
    brokerStatus === "SUBMITTING"
  ) {
    phase = "RECONCILIATION_REQUIRED";
    label = "Broker Submission Pending";
    explanation =
      "GateCEP cannot safely determine the broker outcome yet. Verify genuine broker evidence before retrying.";
  } else if (
    status === ORDER_STATUS.BROKER_SELECTED &&
    brokerStatus === "SUBMISSION_UNCERTAIN"
  ) {
    phase = "RECONCILIATION_REQUIRED";
    label = "Broker Outcome Uncertain";
    explanation =
      "The broker submission outcome is uncertain. Reconcile genuine broker evidence before retrying or changing execution state.";
  } else if (
    status === ORDER_STATUS.BROKER_SELECTED &&
    brokerStatus === "MANUAL_CONFIRMATION_REQUIRED"
  ) {
    phase = "RECONCILIATION_REQUIRED";
    label = "Broker Confirmation Required";
    explanation =
      "Verified broker evidence is required before this REAL order can be treated as executed.";
  } else if (status === ORDER_STATUS.BROKER_SELECTED) {
    phase = "BROKER_SELECTED";
    label = "Broker Selected";
    explanation =
      "A broker is selected, but broker receipt or execution has not been proven.";
  } else if (status === ORDER_STATUS.ROUTED) {
    phase = "ROUTED";
    label = "Routed to Broker";
    explanation = isReal
      ? "The broker accepted the submission handoff. This is not execution confirmation."
      : "The Practice order has been routed.";
  } else if (status === ORDER_STATUS.BROKER_RECEIVED) {
    phase = "BROKER_RECEIVED";
    label = "Broker Received";
    explanation = isReal
      ? "Broker receipt is recorded. A fill still requires genuine broker execution evidence."
      : "The Practice broker received the simulated order.";
  } else if (status === ORDER_STATUS.PARTIAL_FILL) {
    phase = "PARTIAL_FILL";
    label = "Partially Filled";
    explanation = isReal
      ? "Verified broker evidence shows a partial REAL execution. Upload current authoritative broker transaction evidence to reconcile the remaining quantity."
      : "The Practice order is partially filled.";
  } else if (status === ORDER_STATUS.FILLED) {
    phase = "FILLED";
    label = "Filled";
    explanation = isReal
      ? "Verified broker execution evidence resolved this REAL order as filled."
      : "The Practice order is filled.";
  } else if (status === ORDER_STATUS.CANCELLED) {
    phase = "CANCELLED";
    label = "Cancelled";
    explanation = "The order is closed without further execution.";
  } else if (status === ORDER_STATUS.REJECTED) {
    phase = "REJECTED";
    label = "Rejected";
    explanation = "The order was rejected and is not an executed trade.";
  }

  return Object.freeze({
    executionMode,
    isReal,
    rawStatus: status,
    brokerStatus: brokerStatus || null,
    phase,
    label,
    explanation,

    brokerId: order?.brokerId || null,
    brokerAccountId: order?.brokerAccountId || null,
    brokerName: order?.brokerName || null,
    brokerOrderId: order?.brokerOrderId || null,

    recoveryRequired,
    canRetryRouting,

    executionConfirmed:
      status === ORDER_STATUS.FILLED,

    portfolioEffectClaimed: false
  });
}

export function buildExecutionStatusCounts(
  orders = [],
  execution = {}
) {
  return orders.reduce((counts, order) => {
    const model = buildExecutionStatusReadModel(order, execution);

    counts[model.phase] = (counts[model.phase] || 0) + 1;

    return counts;
  }, {});
}
