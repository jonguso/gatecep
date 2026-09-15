import {
  loadBasketExecution,
  updateExecutionOrder
} from "../../services/trade/basketExecutionStore";

import {
  buildRealOrderRecoveryTransition
} from "./realOrderExecutionRecoveryTransitionCore.js";

import {
  addExecutionAuditEvent
} from "../../services/trade/executionAuditStore.js";

async function safeAddRecoveryAuditEvent(event = {}) {
  try {
    return await addExecutionAuditEvent(event);
  } catch (error) {
    console.warn(
      "REAL_RECOVERY_AUDIT_WRITE_FAILED",
      error?.message || error
    );

    return null;
  }
}

export {
  findVerifiedEvidenceMatches,
  buildVerifiedEvidenceMatchAudit
} from "./realOrderExecutionEvidenceMatchCore.js";

export {
  buildRealOrderRecoveryTransition
} from "./realOrderExecutionRecoveryTransitionCore.js";

export async function reconcileUncertainRealOrderFromVerifiedEvidence({
  orderId,
  records = []
} = {}) {
  const execution =
    await loadBasketExecution();

  const order =
    execution?.orders?.find(
      (item) => item.id === orderId
    );

  const decision =
    buildRealOrderRecoveryTransition({
      order,
      executionMode:
        execution?.executionMode,
      records
    });

  if (!decision.resolved) {
    return {
      ...decision,
      orderId:
        decision?.orderId ||
        orderId
    };
  }

  const updated =
    await updateExecutionOrder(
      orderId,
      decision.patch
    );

  // PC-031A15:
  // A verified evidence match is not enough by itself.
  // Recovery is resolved only after the FILLED transition
  // is actually persisted into the active execution store.
  if (!updated) {
    await safeAddRecoveryAuditEvent({
      executionId: execution?.id || null,
      orderId,
      executionMode: "REAL",
      symbol: order?.symbol || "",
      eventType:
        "REAL_RECOVERY_PERSISTENCE_FAILED",
      status: order?.status || "",
      brokerStatus:
        order?.brokerStatus || null,
      message:
        "Verified broker evidence uniquely matched the REAL order, but the OMS recovery transition could not be persisted.",
      brokerId: order?.brokerId || null,
      brokerAccountId:
        order?.brokerAccountId || null,
      brokerName:
        order?.brokerName || null,
      brokerOrderId:
        order?.brokerOrderId || null,
      adapterReportedBrokerId:
        order?.adapterReportedBrokerId || null,
      submissionAttemptId:
        order?.submissionAttemptId || null,
      submissionAttemptCount:
        order?.submissionAttemptCount || null,
      evidenceStatus:
        decision?.evidence?.evidenceStatus ||
        null,
      brokerReference:
        decision?.evidence?.brokerReference ||
        null,
      payload: {
        evidenceMatched: true,
        persistenceSucceeded: false
      }
    });

    return {
      resolved: false,
      status:
        "RECONCILIATION_PERSISTENCE_FAILED",
      orderId,
      matchCount:
        decision?.matchCount || 1,
      evidence:
        decision?.evidence || null,
      evidenceMatched: true,
      persistenceSucceeded: false,
      execution: null
    };
  }

  await safeAddRecoveryAuditEvent({
    executionId:
      updated?.id ||
      execution?.id ||
      null,
    orderId,
    executionMode: "REAL",
    symbol: order?.symbol || "",
    eventType: "REAL_RECOVERY_MATCHED",
    status:
      decision?.patch?.status ||
      "FILLED",
    brokerStatus:
      decision?.patch?.brokerStatus ||
      null,
    message:
      "A unique VERIFIED_BROKER_EXECUTION matched the REAL OMS order.",
    brokerId: order?.brokerId || null,
    brokerAccountId:
      order?.brokerAccountId || null,
    brokerName:
      order?.brokerName || null,
    brokerOrderId:
      decision?.patch?.brokerOrderId ||
      order?.brokerOrderId ||
      null,
    adapterReportedBrokerId:
      order?.adapterReportedBrokerId || null,
    submissionAttemptId:
      order?.submissionAttemptId || null,
    submissionAttemptCount:
      order?.submissionAttemptCount || null,
    evidenceStatus:
      decision?.evidence?.evidenceStatus ||
      null,
    brokerReference:
      decision?.evidence?.brokerReference ||
      null,
    payload: {
      matchCount:
        decision?.matchCount || 1,
      persistenceSucceeded: true
    }
  });

  const recoveredAsPartial =
    decision?.patch?.status ===
    "PARTIAL_FILL";

  await safeAddRecoveryAuditEvent({
    executionId:
      updated?.id ||
      execution?.id ||
      null,
    orderId,
    executionMode: "REAL",
    symbol: order?.symbol || "",
    eventType:
      recoveredAsPartial
        ? "REAL_ORDER_PARTIAL_FILL_FROM_VERIFIED_EVIDENCE"
        : "REAL_ORDER_FILLED_FROM_VERIFIED_EVIDENCE",
    status:
      decision?.patch?.status ||
      "FILLED",
    brokerStatus:
      decision?.patch?.brokerStatus ||
      null,
    message:
      decision?.patch?.message ||
      (
        recoveredAsPartial
          ? "REAL OMS order partially filled from verified broker execution evidence."
          : "REAL OMS order filled from verified broker execution evidence."
      ),
    brokerId: order?.brokerId || null,
    brokerAccountId:
      order?.brokerAccountId || null,
    brokerName:
      order?.brokerName || null,
    brokerOrderId:
      decision?.patch?.brokerOrderId ||
      null,
    adapterReportedBrokerId:
      order?.adapterReportedBrokerId || null,
    submissionAttemptId:
      order?.submissionAttemptId || null,
    submissionAttemptCount:
      order?.submissionAttemptCount || null,
    evidenceStatus:
      decision?.evidence?.evidenceStatus ||
      null,
    brokerReference:
      decision?.evidence?.brokerReference ||
      null,
    payload: {
      executionDate:
        decision?.evidence?.executionDate ||
        decision?.evidence?.date ||
        null,
      quantity:
        decision?.evidence?.quantity ??
        null,
      price:
        decision?.evidence?.price ??
        null,
      sourceType:
        decision?.evidence?.sourceType ||
        null
    }
  });

  return {
    resolved: true,
    status: decision.status,
    orderId,
    matchCount:
      decision?.matchCount || 1,
    evidence: decision.evidence,
    evidenceMatched: true,
    persistenceSucceeded: true,
    execution: updated
  };
}
