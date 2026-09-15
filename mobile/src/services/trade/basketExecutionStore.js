import { buildRealOrderBrokerEligibility } from "./brokerExecutionEligibilityService";
import { userGetItem, userSetItem } from "../auth/userStorage";
import { placeBrokerOrder } from "../brokers/brokerAdapters";
import { loadBrokerAccounts } from "../brokers/brokerAccountStore";
import { loadTradeBasket } from "./tradeBasketStore";
import { addExecutionAuditEvent } from "./executionAuditStore";
import {
  ORDER_STATUS,
  isActiveOrder
} from "./orderLifecycle";

const ACTIVE_BASKET_EXECUTION_KEY = "activeBasketExecution";

// PC-031A8:
// Prevent two callers in the same running app from submitting the
// same REAL order concurrently. Persisted SUBMITTING state below
// protects the order across reload/restart boundaries.
const REAL_SUBMISSION_LOCKS = new Set();

// PC-031A24:
// Execution audit is observational evidence only.
// An audit-storage failure must never create, reverse, retry,
// block, or otherwise redefine an OMS/broker transition.
async function safeAddExecutionAuditEvent(event = {}) {
  try {
    return await addExecutionAuditEvent(event);
  } catch (error) {
    console.warn(
      "EXECUTION_AUDIT_WRITE_FAILED",
      error?.message || error
    );

    return null;
  }
}

export async function createBasketExecution({ forceNew = false } = {}) {
  const existing = await loadBasketExecution();

  if (!forceNew && existing?.orders?.some((order) => isActiveOrder(order.status))) {
    return existing;
  }

  const basket = await loadTradeBasket();

  if (!basket?.items?.length) {
    return null;
  }

  const now = new Date().toISOString();

  const orders = basket.items.map((item, index) =>
    normalizeOrder({
      id: `EO-${Date.now()}-${index}`,
      basketItemId: item.id || `BI-${index}`,
      symbol: item.symbol,
      name: item.name || item.symbol,
      sector: item.sector || "NSE",
      side: item.side || "BUY",
      amount: Number(item.amount || 0),
      quantity: Number(item.quantity || 0),
      price: Number(item.price || item.limitPrice || 0),
      reason: item.reason || "Coach G recommendation",
      decisionSupport:
        item.decisionSupport && typeof item.decisionSupport === "object"
          ? item.decisionSupport
          : null,
      executionMode: basket.executionMode || "PRACTICE",
      brokerId:
        item.brokerId ||
        basket.brokerId ||
        ((basket.executionMode || "PRACTICE") === "PRACTICE"
          ? "GATECEP_PRACTICE"
          : null),
      brokerAccountId: item.brokerAccountId || basket.brokerAccountId || null,
      status: ORDER_STATUS.REVIEW,
      message: "Pending review before queue",
      createdAt: now,
      updatedAt: now
    })
  );

  const execution = normalizeExecution({
    id: `EXEC-${Date.now()}`,
    basketId: basket.id,
    source: basket.source || "COACH_G",
    executionMode: basket.executionMode || "PRACTICE",
    brokerId:
      basket.brokerId ||
      ((basket.executionMode || "PRACTICE") === "PRACTICE"
        ? "GATECEP_PRACTICE"
        : null),
    brokerAccountId: basket.brokerAccountId || null,
    status: ORDER_STATUS.REVIEW,
    createdAt: now,
    updatedAt: now,
    orders
  });

  await userSetItem(ACTIVE_BASKET_EXECUTION_KEY, JSON.stringify(execution));

  return execution;
}

export async function loadBasketExecution() {
  const raw = await userGetItem(ACTIVE_BASKET_EXECUTION_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed?.orders?.length ? normalizeExecution(parsed) : null;
  } catch {
    return null;
  }
}

export async function saveBasketExecution(execution) {
  if (!execution) return null;

  const next = normalizeExecution({
    ...execution,
    updatedAt: new Date().toISOString()
  });

  await userSetItem(ACTIVE_BASKET_EXECUTION_KEY, JSON.stringify(next));

  return next;
}

export async function clearBasketExecution() {
  await userSetItem(ACTIVE_BASKET_EXECUTION_KEY, "");
}

export async function updateExecutionOrder(orderId, patch = {}) {
  const execution = await loadBasketExecution();

  if (!execution) return null;

  const orders = execution.orders.map((order) =>
    order.id === orderId
      ? normalizeOrder({
          ...order,
          ...patch,
          updatedAt: new Date().toISOString()
        })
      : normalizeOrder(order)
  );

  return await saveBasketExecution({
    ...execution,
    orders
  });
}

export async function cancelExecutionOrder(orderId) {
  return await updateExecutionOrder(orderId, {
    status: ORDER_STATUS.CANCELLED,
    message: "Cancelled before routing"
  });
}


async function assertRealOrderBrokerAssignment(order = {}, execution = {}) {
  const executionMode = canonicalExecutionMode(
    order?.executionMode || execution?.executionMode
  );

  if (executionMode !== "REAL") {
    return true;
  }

  const brokerAccountId = String(order?.brokerAccountId || "").trim();
  const brokerId = String(order?.brokerId || "").trim();

  if (
    !brokerAccountId ||
    !brokerId ||
    isPracticeBrokerIdentity(brokerId)
  ) {
    const error = new Error("REAL_ORDER_BROKER_ASSIGNMENT_REQUIRED");
    error.code = "REAL_ORDER_BROKER_ASSIGNMENT_REQUIRED";
    error.orderId = order?.id || null;
    throw error;
  }

  const eligibility = await buildRealOrderBrokerEligibility({
    order,
    executionOrders: execution?.orders || []
  });

  const selected = (eligibility?.candidates || []).find(
    (candidate) =>
      String(candidate?.brokerAccountId || "").trim() === brokerAccountId &&
      String(candidate?.brokerId || "").trim().toUpperCase() ===
        brokerId.toUpperCase()
  );

  if (!selected || selected.eligible !== true) {
    const error = new Error("REAL_ORDER_BROKER_ELIGIBILITY_REQUIRED");
    error.code = "REAL_ORDER_BROKER_ELIGIBILITY_REQUIRED";
    error.orderId = order?.id || null;
    error.brokerAccountId = brokerAccountId;
    error.brokerId = brokerId;
    error.eligibilityReason =
      selected?.reason ||
      eligibility?.reason ||
      "BROKER_NOT_ELIGIBLE";
    throw error;
  }

  return selected;
}

export async function queueExecutionOrders() {
  const execution = await loadBasketExecution();

  if (!execution) return null;

  for (const order of execution.orders || []) {
    if (!isActiveOrder(order.status)) continue;
    await assertRealOrderBrokerAssignment(order, execution);
  }

  const orders = execution.orders.map((order) => {
    if (!isActiveOrder(order.status)) return normalizeOrder(order);

    return normalizeOrder({
      ...order,
      status: ORDER_STATUS.QUEUED,
      message: "Queued for broker routing",
      queuedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  const saved = await saveBasketExecution({
    ...execution,
    orders
  });

  if (saved) {
    const previousById = new Map(
      (execution.orders || []).map((order) => [
        order.id,
        order
      ])
    );

    for (const order of saved.orders || []) {
      const previous = previousById.get(order.id);

      if (
        canonicalExecutionMode(
          order?.executionMode || saved?.executionMode
        ) === "REAL" &&
        order?.status === ORDER_STATUS.QUEUED &&
        previous?.status !== ORDER_STATUS.QUEUED
      ) {
        await safeAddExecutionAuditEvent({
          executionId: saved.id || null,
          orderId: order.id || null,
          executionMode: "REAL",
          symbol: order.symbol || "",
          eventType: "REAL_ORDER_QUEUED",
          status: ORDER_STATUS.QUEUED,
          message: order.message || "Queued for broker routing",
          brokerId: order.brokerId || null,
          brokerAccountId: order.brokerAccountId || null,
          brokerName: order.brokerName || null,
          brokerOrderId: order.brokerOrderId || null
        });
      }
    }
  }

  return saved;
}

export async function routeExecutionOrder(orderId, broker = {}) {
  return await updateExecutionOrder(orderId, {
    brokerId: broker.id || broker.brokerId || "GATECEP_PRACTICE",
    brokerName: broker.name || broker.brokerName || "GateCEP Broker",
    status: ORDER_STATUS.ROUTED,
    message: "Routed to broker",
    routedAt: new Date().toISOString()
  });
}

function canonicalExecutionMode(value = "PRACTICE") {
  return String(value || "PRACTICE").toUpperCase() === "REAL"
    ? "REAL"
    : "PRACTICE";
}

function isPracticeBrokerIdentity(value = "") {
  const raw = String(value || "").trim().toUpperCase();

  return [
    "GATECEP_PRACTICE",
    "GATECEP PRACTICE",
    "GATECEP BROKER",
    "SIM",
    "SIMULATION BROKER",
    "GATECEP-DEMO",
    "GATECEP DEMO"
  ].includes(raw);
}

function isConnectedRealBrokerAccount(account = {}) {
  const brokerId = String(account?.brokerId || account?.id || "").trim();
  const mode = String(account?.connectionMode || "").toUpperCase();
  const status = String(account?.status || "ACTIVE").toUpperCase();

  return (
    !!brokerId &&
    !isPracticeBrokerIdentity(brokerId) &&
    !/PRACTICE|DEMO|SIMULATION/.test(mode) &&
    status !== "INACTIVE" &&
    status !== "DISCONNECTED" &&
    (account?.connected === true || account?.linked === true)
  );
}

async function resolveRealBrokerAccount(order = {}) {
  const accounts = (await loadBrokerAccounts()).filter(
    isConnectedRealBrokerAccount
  );

  const requestedAccountId = String(order?.brokerAccountId || "").trim();
  const requestedBrokerId = String(order?.brokerId || "")
    .trim()
    .toUpperCase();

  if (
    !requestedAccountId ||
    !requestedBrokerId ||
    isPracticeBrokerIdentity(requestedBrokerId)
  ) {
    return null;
  }

  return (
    accounts.find(
      (account) =>
        String(account?.id || "").trim() === requestedAccountId &&
        String(account?.brokerId || account?.id || "")
          .trim()
          .toUpperCase() === requestedBrokerId
    ) || null
  );
}

export async function routeExecutionOrderByMode(orderId) {
  const execution = await loadBasketExecution();

  if (!execution) {
    throw new Error("ACTIVE_EXECUTION_REQUIRED");
  }

  const order = (execution.orders || []).find((item) => item.id === orderId);

  if (!order) {
    throw new Error("EXECUTION_ORDER_NOT_FOUND");
  }

  const executionMode = canonicalExecutionMode(
    order.executionMode || execution.executionMode
  );

  if (executionMode === "PRACTICE") {
    const now = new Date().toISOString();

    await routeExecutionOrder(orderId, {
      id: "GATECEP_PRACTICE",
      name: "GateCEP Broker"
    });

    return await updateExecutionOrder(orderId, {
      executionMode: "PRACTICE",
      brokerId: "GATECEP_PRACTICE",
      brokerName: "GateCEP Broker",
      brokerOrderId: `PRACTICE-${Date.now()}-${order.symbol}`,
      brokerStatus: "PRACTICE_RECEIVED",
      status: ORDER_STATUS.BROKER_RECEIVED,
      message: "GateCEP Broker received the Practice order.",
      submittedAt: now,
      brokerReceivedAt: now,
      adapterResponse: {
        ok: true,
        isPractice: true,
        brokerId: "GATECEP_PRACTICE",
        brokerName: "GateCEP Broker",
        status: "PRACTICE_RECEIVED",
        submittedAt: now,
        receivedAt: now
      },
      isPractice: true,
      updatedAt: now
    });
  }

  const realRoutingStatus = String(order?.status || "").toUpperCase();
  const realBrokerStatus = String(order?.brokerStatus || "").toUpperCase();

  if (
    ![
      ORDER_STATUS.QUEUED,
      ORDER_STATUS.BROKER_SELECTED
    ].includes(realRoutingStatus)
  ) {
    const error = new Error("REAL_ORDER_NOT_READY_FOR_ROUTING");
    error.code = "REAL_ORDER_NOT_READY_FOR_ROUTING";
    error.orderId = order?.id || null;
    error.status = realRoutingStatus || null;
    throw error;
  }

  // A REAL order that already has a broker reference must never be
  // blindly submitted again. Its broker state must be reconciled.
  if (String(order?.brokerOrderId || "").trim()) {
    const error = new Error("REAL_ORDER_ALREADY_HAS_BROKER_REFERENCE");
    error.code = "REAL_ORDER_ALREADY_HAS_BROKER_REFERENCE";
    error.orderId = order?.id || null;
    error.brokerOrderId = order?.brokerOrderId || null;
    throw error;
  }

  if (realRoutingStatus === ORDER_STATUS.BROKER_SELECTED) {
    if (realBrokerStatus === "SUBMITTING") {
      const error = new Error("REAL_ORDER_SUBMISSION_IN_PROGRESS");
      error.code = "REAL_ORDER_SUBMISSION_IN_PROGRESS";
      error.orderId = order?.id || null;
      error.submissionAttemptId = order?.submissionAttemptId || null;
      throw error;
    }

    if (
      realBrokerStatus === "SUBMISSION_UNCERTAIN" ||
      realBrokerStatus === "MANUAL_CONFIRMATION_REQUIRED"
    ) {
      const error = new Error("REAL_ORDER_RECONCILIATION_REQUIRED");
      error.code = "REAL_ORDER_RECONCILIATION_REQUIRED";
      error.orderId = order?.id || null;
      error.brokerStatus = realBrokerStatus;
      throw error;
    }

    if (realBrokerStatus !== "ADAPTER_ERROR") {
      const error = new Error("REAL_ORDER_RETRY_NOT_ALLOWED");
      error.code = "REAL_ORDER_RETRY_NOT_ALLOWED";
      error.orderId = order?.id || null;
      error.brokerStatus = realBrokerStatus || null;
      throw error;
    }

    // Retry must remain pinned to the original assigned broker/account.
    const retryBrokerAccountId = String(
      order?.submissionBrokerAccountId || ""
    ).trim();

    const retryBrokerId = String(
      order?.submissionBrokerId || ""
    )
      .trim()
      .toUpperCase();

    const assignedBrokerAccountId = String(
      order?.brokerAccountId || ""
    ).trim();

    const assignedBrokerId = String(order?.brokerId || "")
      .trim()
      .toUpperCase();

    if (
      (retryBrokerAccountId &&
        retryBrokerAccountId !== assignedBrokerAccountId) ||
      (retryBrokerId && retryBrokerId !== assignedBrokerId)
    ) {
      const error = new Error("REAL_ORDER_RETRY_BROKER_MISMATCH");
      error.code = "REAL_ORDER_RETRY_BROKER_MISMATCH";
      error.orderId = order?.id || null;
      error.expectedBrokerAccountId =
        order?.submissionBrokerAccountId || null;
      error.expectedBrokerId = order?.submissionBrokerId || null;
      error.actualBrokerAccountId = order?.brokerAccountId || null;
      error.actualBrokerId = order?.brokerId || null;
      throw error;
    }
  }

  // Process-level duplicate-submit guard.
  if (REAL_SUBMISSION_LOCKS.has(orderId)) {
    const error = new Error("REAL_ORDER_SUBMISSION_IN_PROGRESS");
    error.code = "REAL_ORDER_SUBMISSION_IN_PROGRESS";
    error.orderId = orderId;
    throw error;
  }

  REAL_SUBMISSION_LOCKS.add(orderId);

  try {
    // PC-031A7 + A8:
    // Revalidate immediately before every REAL broker handoff/retry.
    const selectedEligibility = await assertRealOrderBrokerAssignment(
      order,
      execution
    );

    const account = await resolveRealBrokerAccount(order);

    if (!account) {
      const error = new Error("REAL_ASSIGNED_BROKER_UNAVAILABLE");
      error.code = "REAL_ASSIGNED_BROKER_UNAVAILABLE";
      error.orderId = order?.id || null;
      error.brokerAccountId = order?.brokerAccountId || null;
      error.brokerId = order?.brokerId || null;
      throw error;
    }

    const brokerId = String(account.brokerId || account.id || "").trim();
    const brokerAccountId = account.id || order.brokerAccountId || null;
    const brokerName =
      account.brokerName ||
      account.name ||
      account.broker ||
      brokerId;

    const existingSubmissionBrokerAccountId =
      order?.submissionBrokerAccountId || null;
    const existingSubmissionBrokerId =
      order?.submissionBrokerId || null;

    if (
      existingSubmissionBrokerAccountId &&
      String(existingSubmissionBrokerAccountId).trim() !==
        String(brokerAccountId || "").trim()
    ) {
      const error = new Error("REAL_ORDER_RETRY_BROKER_MISMATCH");
      error.code = "REAL_ORDER_RETRY_BROKER_MISMATCH";
      error.orderId = order?.id || null;
      throw error;
    }

    if (
      existingSubmissionBrokerId &&
      String(existingSubmissionBrokerId).trim().toUpperCase() !==
        String(brokerId || "").trim().toUpperCase()
    ) {
      const error = new Error("REAL_ORDER_RETRY_BROKER_MISMATCH");
      error.code = "REAL_ORDER_RETRY_BROKER_MISMATCH";
      error.orderId = order?.id || null;
      throw error;
    }

    const now = new Date().toISOString();
    const submissionAttemptCount =
      Number(order?.submissionAttemptCount || 0) + 1;

    const submissionAttemptId =
      `REAL-SUB-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

    const executionEligibility = {
      ...(order?.executionEligibility || {}),
      side: selectedEligibility?.side || order?.side || null,
      reason: selectedEligibility?.reason || "ELIGIBLE",
      estimatedCharges:
        selectedEligibility?.estimatedCharges ??
        order?.estimatedCharges ??
        null,
      requiredCash:
        selectedEligibility?.requiredCash ??
        order?.executionEligibility?.requiredCash ??
        null,
      projectedAvailableCash:
        selectedEligibility?.projectedAvailableCash ?? null,
      requiredQuantity:
        selectedEligibility?.requiredQuantity ??
        order?.executionEligibility?.requiredQuantity ??
        null,
      projectedAvailableQuantity:
        selectedEligibility?.projectedAvailableQuantity ?? null,
      validatedAt: now,
      validationStage: "PRE_BROKER_HANDOFF"
    };

    // Persist the lock BEFORE calling the REAL broker adapter.
    // If the app restarts after this point, SUBMITTING blocks a blind retry.
    const submittingExecution =
      await updateExecutionOrder(orderId, {
        executionMode: "REAL",
        brokerId,
        brokerAccountId,
        brokerName,
        status: ORDER_STATUS.BROKER_SELECTED,
        brokerStatus: "SUBMITTING",
        brokerOrderId: null,
        adapterError: false,
        executionEligibility,
        submissionAttemptId,
        submissionAttemptCount,
        lastSubmissionAttemptAt: now,
        submissionBrokerAccountId:
          existingSubmissionBrokerAccountId || brokerAccountId,
        submissionBrokerId:
          existingSubmissionBrokerId || brokerId,
        message:
          "Submitting to assigned REAL broker. Do not retry until the broker outcome is known.",
        isPractice: false,
        updatedAt: now
      });

    if (submittingExecution) {
      await safeAddExecutionAuditEvent({
        executionId: submittingExecution.id || execution.id || null,
        orderId: order.id || orderId,
        executionMode: "REAL",
        symbol: order.symbol || "",
        eventType: "REAL_SUBMISSION_STARTED",
        status: ORDER_STATUS.BROKER_SELECTED,
        brokerStatus: "SUBMITTING",
        message:
          "REAL order submission started with the assigned broker.",
        brokerId,
        brokerAccountId,
        brokerName,
        brokerOrderId: null,
        submissionAttemptId,
        submissionAttemptCount,
        payload: {
          validationStage: "PRE_BROKER_HANDOFF",
          submissionBrokerAccountId:
            existingSubmissionBrokerAccountId || brokerAccountId,
          submissionBrokerId:
            existingSubmissionBrokerId || brokerId
        }
      });
    }

    const submittedOrder = {
      ...order,
      executionMode: "REAL",
      brokerId,
      brokerAccountId,
      brokerName,
      executionEligibility,
      submissionAttemptId,
      submissionAttemptCount,
      submissionBrokerAccountId:
        existingSubmissionBrokerAccountId || brokerAccountId,
      submissionBrokerId:
        existingSubmissionBrokerId || brokerId
    };

    let brokerResponse;

    try {
      brokerResponse = await placeBrokerOrder(submittedOrder);
    } catch (error) {
      // Only an adapter that explicitly certifies a pre-submission failure
      // may return the order to automatic retry.
      const safeToRetry =
        error?.safeToRetry === true ||
        error?.beforeSubmission === true;

      const failureStatus = safeToRetry
        ? "ADAPTER_ERROR"
        : "SUBMISSION_UNCERTAIN";

      const failedExecution =
        await updateExecutionOrder(orderId, {
          executionMode: "REAL",
          brokerId,
          brokerAccountId,
          brokerName,
          status: ORDER_STATUS.BROKER_SELECTED,
          brokerStatus: failureStatus,
          brokerOrderId: null,
          message: safeToRetry
            ? error?.message ||
              "Broker adapter failed before submission. Retry is permitted with the same broker."
            : error?.message ||
              "Broker submission outcome is uncertain. Reconcile with the assigned broker before retrying.",
          adapterError: true,
          adapterErrorCode: error?.code || null,
          submissionAttemptId,
          submissionAttemptCount,
          lastSubmissionAttemptAt: now,
          submissionBrokerAccountId:
            existingSubmissionBrokerAccountId || brokerAccountId,
          submissionBrokerId:
            existingSubmissionBrokerId || brokerId,
          isPractice: false,
          updatedAt: new Date().toISOString()
        });

      if (failedExecution) {
        await safeAddExecutionAuditEvent({
          executionId: failedExecution.id || execution.id || null,
          orderId: order.id || orderId,
          executionMode: "REAL",
          symbol: order.symbol || "",
          eventType: safeToRetry
            ? "REAL_SUBMISSION_SAFE_FAILURE"
            : "REAL_SUBMISSION_UNCERTAIN",
          status: ORDER_STATUS.BROKER_SELECTED,
          brokerStatus: failureStatus,
          message:
            error?.message ||
            (
              safeToRetry
                ? "Broker adapter failed before submission."
                : "Broker submission outcome is uncertain."
            ),
          brokerId,
          brokerAccountId,
          brokerName,
          brokerOrderId: null,
          submissionAttemptId,
          submissionAttemptCount,
          payload: {
            adapterErrorCode: error?.code || null,
            safeToRetry
          }
        });
      }

      return failedExecution;
    }

    const responseBrokerOrderId = String(
      brokerResponse?.brokerOrderId || ""
    ).trim();

    const adapterConfirmedSubmission =
      brokerResponse?.ok === true &&
      !!responseBrokerOrderId;

    if (!adapterConfirmedSubmission) {
      // A returned response without both explicit success and a broker
      // order reference is not proof of successful submission.
      //
      // Example today:
      // MANUAL_CONFIRMATION_REQUIRED from pendingBrokerAdapter.
      const uncertainExecution =
        await updateExecutionOrder(orderId, {
        executionMode: "REAL",
        // PC-031A23:
        // The REAL broker identity was authorized and pinned before handoff.
        // Adapter metadata may be recorded for audit, but it must not redefine
        // the canonical broker assignment attached to this OMS order.
        brokerId,
        brokerAccountId,
        brokerName: brokerResponse?.brokerName || brokerName,
        adapterReportedBrokerId:
          brokerResponse?.brokerId || null,
        brokerOrderId: responseBrokerOrderId || null,
        brokerStatus: "SUBMISSION_UNCERTAIN",
        adapterReportedStatus:
          brokerResponse?.status || null,
        status: ORDER_STATUS.BROKER_SELECTED,
        message:
          brokerResponse?.message ||
          "Broker submission could not be verified. Reconcile broker state before retrying.",
        submittedAt:
          brokerResponse?.submittedAt || now,
        brokerReceivedAt: null,
        adapterResponse: brokerResponse || null,
        adapterError: brokerResponse?.ok === false,
        submissionAttemptId,
        submissionAttemptCount,
        lastSubmissionAttemptAt: now,
        submissionBrokerAccountId:
          existingSubmissionBrokerAccountId || brokerAccountId,
        submissionBrokerId:
          existingSubmissionBrokerId || brokerId,
        isPractice: false,
        updatedAt: new Date().toISOString()
      });

      if (uncertainExecution) {
        await safeAddExecutionAuditEvent({
          executionId:
            uncertainExecution.id ||
            execution.id ||
            null,
          orderId: order.id || orderId,
          executionMode: "REAL",
          symbol: order.symbol || "",
          eventType: "REAL_SUBMISSION_UNCERTAIN",
          status: ORDER_STATUS.BROKER_SELECTED,
          brokerStatus: "SUBMISSION_UNCERTAIN",
          message:
            brokerResponse?.message ||
            "Broker submission could not be verified.",
          brokerId,
          brokerAccountId,
          brokerName:
            brokerResponse?.brokerName || brokerName,
          brokerOrderId:
            responseBrokerOrderId || null,
          adapterReportedBrokerId:
            brokerResponse?.brokerId || null,
          submissionAttemptId,
          submissionAttemptCount,
          payload: {
            adapterReportedStatus:
              brokerResponse?.status || null,
            adapterOk:
              brokerResponse?.ok === true
          }
        });
      }

      return uncertainExecution;
    }

    const routedExecution =
      await updateExecutionOrder(orderId, {
      executionMode: "REAL",
      // PC-031A23:
      // Successful broker submission cannot change the broker/account
      // identity that GateCEP authorized immediately before handoff.
      brokerId,
      brokerAccountId,
      brokerName: brokerResponse?.brokerName || brokerName,
      adapterReportedBrokerId:
        brokerResponse?.brokerId || null,
      brokerOrderId: responseBrokerOrderId,
      brokerStatus:
        brokerResponse?.status || "SUBMITTED",
      status: ORDER_STATUS.ROUTED,
      message:
        brokerResponse?.message ||
        "Routed to broker adapter. Awaiting verified broker confirmation.",
      submittedAt:
        brokerResponse?.submittedAt || now,
      brokerReceivedAt: null,
      adapterResponse: brokerResponse || null,
      adapterError: false,
      submissionAttemptId,
      submissionAttemptCount,
      lastSubmissionAttemptAt: now,
      submissionBrokerAccountId:
        existingSubmissionBrokerAccountId || brokerAccountId,
      submissionBrokerId:
        existingSubmissionBrokerId || brokerId,
      isPractice: false,
      updatedAt: new Date().toISOString()
    });

    if (routedExecution) {
      await safeAddExecutionAuditEvent({
        executionId:
          routedExecution.id ||
          execution.id ||
          null,
        orderId: order.id || orderId,
        executionMode: "REAL",
        symbol: order.symbol || "",
        eventType: "REAL_ORDER_ROUTED",
        status: ORDER_STATUS.ROUTED,
        brokerStatus:
          brokerResponse?.status || "SUBMITTED",
        message:
          brokerResponse?.message ||
          "Routed to broker adapter. Awaiting verified broker confirmation.",
        brokerId,
        brokerAccountId,
        brokerName:
          brokerResponse?.brokerName || brokerName,
        brokerOrderId: responseBrokerOrderId,
        adapterReportedBrokerId:
          brokerResponse?.brokerId || null,
        submissionAttemptId,
        submissionAttemptCount
      });
    }

    return routedExecution;
  } finally {
    REAL_SUBMISSION_LOCKS.delete(orderId);
  }

}

export async function markBrokerReceived(orderId, brokerPayload = {}) {
  const execution = await loadBasketExecution();
  const order = execution?.orders?.find((item) => item.id === orderId);
  const executionMode = canonicalExecutionMode(
    order?.executionMode || execution?.executionMode
  );

  if (executionMode === "REAL") {
    const error = new Error(
      "REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION"
    );
    error.code = "REAL_BROKER_RECEIPT_REQUIRES_VERIFIED_EVIDENCE_INGESTION";
    throw error;
  }

  return await updateExecutionOrder(orderId, {
    executionMode: "PRACTICE",
    brokerId: order?.brokerId || "GATECEP_PRACTICE",
    brokerName: order?.brokerName || "GateCEP Broker",
    brokerOrderId: brokerPayload.brokerOrderId || brokerPayload.id || null,
    brokerStatus: brokerPayload.status || ORDER_STATUS.BROKER_RECEIVED,
    status: ORDER_STATUS.BROKER_RECEIVED,
    message: brokerPayload.message || "GateCEP Broker received Practice order",
    brokerReceivedAt: brokerPayload.receivedAt || new Date().toISOString(),
    isPractice: true
  });
}

export async function markExecutionOrderPartial(orderId, trade = {}) {
  const execution = await loadBasketExecution();
  const order = execution?.orders?.find((item) => item.id === orderId);
  const executionMode = canonicalExecutionMode(
    order?.executionMode || execution?.executionMode
  );

  if (executionMode === "REAL") {
    const error = new Error(
      "REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION"
    );
    error.code =
      "REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION";
    throw error;
  }

  const filledQuantity = Number(
    trade?.filledQuantity || 0
  );

  const totalQuantity = Number(
    order?.quantity || trade?.quantity || 0
  );

  const remainingQuantity = Math.max(
    Number(
      trade?.remainingQuantity ??
        (totalQuantity - filledQuantity)
    ),
    0
  );

  return await updateExecutionOrder(orderId, {
    executionMode: "PRACTICE",
    status: ORDER_STATUS.PARTIAL_FILL,
    filledQuantity,
    remainingQuantity,
    message:
      trade?.message ||
      `Partial fill: ${filledQuantity}/${totalQuantity}`,
    trade: {
      ...trade,
      executionMode: "PRACTICE",
      isPractice: true
    },
    isPractice: true,
    updatedAt: new Date().toISOString()
  });
}

export async function markExecutionOrderFilled(orderId, trade = {}) {
  const execution = await loadBasketExecution();
  const order = execution?.orders?.find((item) => item.id === orderId);
  const executionMode = canonicalExecutionMode(
    order?.executionMode || execution?.executionMode
  );

  if (executionMode === "REAL") {
    const error = new Error("REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION");
    error.code = "REAL_ORDER_REQUIRES_VERIFIED_BROKER_EXECUTION";
    throw error;
  }

  return await updateExecutionOrder(orderId, {
    status: ORDER_STATUS.FILLED,
    message: "Filled by GateCEP Broker in Practice",
    trade: {
      ...trade,
      executionMode: "PRACTICE",
      isPractice: true
    },
    filledAt: new Date().toISOString()
  });
}

export function getActiveExecutionOrders(execution = {}) {
  return (execution.orders || []).filter((order) => isActiveOrder(order.status));
}

export function normalizeExecution(execution = {}) {
  const orders = Array.isArray(execution.orders)
    ? execution.orders.map(normalizeOrder)
    : [];

  const activeOrders = orders.filter((order) => isActiveOrder(order.status));
  const completedOrders = orders.filter((order) => order.status === ORDER_STATUS.FILLED).length;
  const cancelledOrders = orders.filter((order) => order.status === ORDER_STATUS.CANCELLED).length;
  const rejectedOrders = orders.filter((order) => order.status === ORDER_STATUS.REJECTED).length;
  const failedOrders = rejectedOrders;
  const queuedOrders = orders.filter((order) => order.status === ORDER_STATUS.QUEUED).length;
  const routedOrders = orders.filter((order) =>
    [ORDER_STATUS.ROUTED, ORDER_STATUS.BROKER_RECEIVED, ORDER_STATUS.PARTIAL_FILL].includes(order.status)
  ).length;
  const reviewOrders = orders.filter((order) =>
    [ORDER_STATUS.REVIEW, ORDER_STATUS.PENDING, ORDER_STATUS.DRAFT].includes(order.status)
  ).length;

  let status = execution.status || ORDER_STATUS.REVIEW;

  if (orders.length > 0 && activeOrders.length === 0) {
    status = ORDER_STATUS.FILLED;
  } else if (routedOrders > 0) {
    status = ORDER_STATUS.ROUTED;
  } else if (queuedOrders > 0) {
    status = ORDER_STATUS.QUEUED;
  } else if (reviewOrders > 0) {
    status = ORDER_STATUS.REVIEW;
  }

  const executionMode = canonicalExecutionMode(
    execution.executionMode || orders[0]?.executionMode
  );

  return {
    ...execution,
    executionMode,
    brokerId:
      execution.brokerId ||
      (executionMode === "PRACTICE" ? "GATECEP_PRACTICE" : null),
    status,
    totalOrders: orders.length,
    activeOrders: activeOrders.length,
    completedOrders,
    cancelledOrders,
    failedOrders,
    queuedOrders,
    routedOrders,
    reviewOrders,
    totalAmount: activeOrders.reduce(
      (sum, order) => sum + Number(order.amount || order.gross || 0),
      0
    ),
    orders,
    updatedAt: execution.updatedAt || new Date().toISOString()
  };
}

export function normalizeOrder(order = {}) {
  const price = Number(order.price || order.limitPrice || 0);
  const amount = Number(order.amount || 0);

  const quantity =
    Number(order.quantity || 0) > 0
      ? Number(order.quantity)
      : price > 0 && amount > 0
      ? Math.floor(amount / price)
      : 0;

  const gross = quantity * price;

  const executionMode = canonicalExecutionMode(order.executionMode);

  return {
    ...order,
    executionMode,
    brokerId:
      order.brokerId ||
      (executionMode === "PRACTICE" ? "GATECEP_PRACTICE" : null),
    symbol: String(order.symbol || "").toUpperCase(),
    side: order.side || "BUY",
    price,
    quantity,
    gross,
    amount: amount || gross,
    status: String(order.status || ORDER_STATUS.REVIEW).toUpperCase(),
    message: order.message || "Pending review"
  };
}

export async function deleteExecutionOrder(orderId) {
  const execution = await loadBasketExecution();

  if (!execution) return null;

  const orders = execution.orders.filter((order) => order.id !== orderId);

  return await saveBasketExecution({
    ...execution,
    orders
  });
}

export async function queueSingleOrder(orderId) {
  const execution = await loadBasketExecution();

  if (!execution) return null;

  const order = (execution.orders || []).find(
    (item) => item.id === orderId
  );

  if (!order) {
    const error = new Error("EXECUTION_ORDER_NOT_FOUND");
    error.code = "EXECUTION_ORDER_NOT_FOUND";
    throw error;
  }

  await assertRealOrderBrokerAssignment(order, execution);

  const queuedExecution =
    await updateExecutionOrder(orderId, {
      status: ORDER_STATUS.QUEUED,
      message: "Queued for broker routing",
      queuedAt: new Date().toISOString()
    });

  if (
    queuedExecution &&
    canonicalExecutionMode(
      order?.executionMode ||
      execution?.executionMode
    ) === "REAL" &&
    order?.status !== ORDER_STATUS.QUEUED
  ) {
    await safeAddExecutionAuditEvent({
      executionId:
        queuedExecution.id ||
        execution.id ||
        null,
      orderId: order.id || orderId,
      executionMode: "REAL",
      symbol: order.symbol || "",
      eventType: "REAL_ORDER_QUEUED",
      status: ORDER_STATUS.QUEUED,
      message: "Queued for broker routing",
      brokerId: order.brokerId || null,
      brokerAccountId:
        order.brokerAccountId || null,
      brokerName: order.brokerName || null,
      brokerOrderId:
        order.brokerOrderId || null
    });
  }

  return queuedExecution;
}