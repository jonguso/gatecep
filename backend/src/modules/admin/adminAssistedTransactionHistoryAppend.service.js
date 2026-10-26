import {
  getAdminReconciliationBroker
} from "./adminReconciliationTarget.service.js";

import {
  loadAuthenticatedInvestorTransactionHistory,
  appendAuthenticatedInvestorTransactionHistory
} from "../transaction-history/investorBrokerTransactionHistory.service.js";

import {
  appendAdminAuditEvent
} from "../admin-audit/adminAudit.repository.js";

function clean(value) {
  return String(value ?? "").trim();
}

function positiveGeneration(value) {
  const generation = Number(value);

  if (
    !Number.isInteger(generation) ||
    generation < 1
  ) {
    const error =
      new Error(
        "A valid observedGeneration is required."
      );

    error.code =
      "OBSERVED_GENERATION_REQUIRED";

    error.status = 400;

    throw error;
  }

  return generation;
}

function requireExecutions(value) {
  if (
    !Array.isArray(value) ||
    value.length === 0
  ) {
    const error =
      new Error(
        "At least one reviewed NEW historical execution is required."
      );

    error.code =
      "HISTORICAL_EXECUTIONS_REQUIRED";

    error.status = 400;

    throw error;
  }

  return value;
}

export async function
appendAdminAssistedTransactionHistory(
  {
    actorUserId,
    targetUserId,
    brokerLinkId,
    observedGeneration,
    executions,
    sourceFileName = null,
    ticketReference = null
  } = {},
  deps = {}
) {
  const actor =
    clean(actorUserId);

  if (!actor) {
    const error =
      new Error(
        "Authenticated Admin actor is required."
      );

    error.code =
      "ADMIN_ACTOR_REQUIRED";

    error.status = 401;

    throw error;
  }

  const target =
    clean(targetUserId);

  const link =
    clean(brokerLinkId);

  if (!target || !link) {
    const error =
      new Error(
        "Target investor and broker account are required."
      );

    error.code =
      "ADMIN_ASSISTED_TRANSACTION_CONTEXT_REQUIRED";

    error.status = 400;

    throw error;
  }

  const generation =
    positiveGeneration(
      observedGeneration
    );

  const reviewedExecutions =
    requireExecutions(
      executions
    );

  const getContext =
    deps.getAdminReconciliationBroker ||
    getAdminReconciliationBroker;

  const loadHistory =
    deps.loadAuthenticatedInvestorTransactionHistory ||
    loadAuthenticatedInvestorTransactionHistory;

  const appendHistory =
    deps.appendAuthenticatedInvestorTransactionHistory ||
    appendAuthenticatedInvestorTransactionHistory;

  const appendAudit =
    deps.appendAdminAuditEvent ||
    appendAdminAuditEvent;

  /*
   * Server authority:
   * - actor comes from authenticated Admin session
   * - target investor comes from route and is revalidated
   * - broker link must belong to that exact target
   * - brokerAccountKey is never accepted from the client
   */
  const context =
    await getContext({
      targetUserId: target,
      brokerLinkId: link
    });

  const canonicalBefore =
    await loadHistory({
      authenticatedUserId:
        context.target.id,

      brokerLinkId:
        context.broker.id
    });

  if (
    canonicalBefore
      ?.authorityEstablished !== true
  ) {
    const error =
      new Error(
        "Canonical Transaction History authority is not established for the selected investor broker account."
      );

    error.code =
      "TRANSACTION_HISTORY_AUTHORITY_NOT_ESTABLISHED";

    error.status = 409;

    throw error;
  }

  if (
    Number(
      canonicalBefore.currentGeneration
    ) !== generation
  ) {
    const error =
      new Error(
        "Transaction History authority changed. Refresh the Admin preview before uploading."
      );

    error.code =
      "STALE_TRANSACTION_HISTORY_GENERATION";

    error.status = 409;

    error.currentGeneration =
      canonicalBefore.currentGeneration;

    throw error;
  }

  const appendResult =
    await appendHistory({
      /*
       * This is intentionally the validated target investor,
       * not the Admin actor.
       */
      authenticatedUserId:
        context.target.id,

      brokerLinkId:
        context.broker.id,

      observedGeneration:
        generation,

      executions:
        reviewedExecutions
    });

  const automaticReason =
    "ADMIN_ASSISTED_TRANSACTION_HISTORY_UPLOAD";

  const auditEvent =
    await appendAudit({
      actorUserId:
        actor,

      action:
        automaticReason,

      targetType:
        "USER_BROKER_TRANSACTION_HISTORY",

      targetId:
        context.broker.id,

      reason:
        automaticReason,

      metadata: {
        assistedUpload: true,

        targetUserId:
          context.target.id,

        brokerLinkId:
          context.broker.id,

        brokerAccountKey:
          context.brokerAccountKey,

        sourceFileName:
          clean(sourceFileName) || null,

        ticketReference:
          clean(ticketReference) || null,

        observedGeneration:
          generation,

        canonicalCountBefore:
          Number(
            canonicalBefore.count || 0
          ),

        submittedNewCount:
          reviewedExecutions.length,

        insertedCount:
          Number(
            appendResult.insertedCount || 0
          ),

        existingCount:
          Number(
            appendResult.existingCount || 0
          )
      },

      before: {
        canonicalCount:
          Number(
            canonicalBefore.count || 0
          )
      },

      after: {
        canonicalCount:
          Number(
            canonicalBefore.count || 0
          ) +
          Number(
            appendResult.insertedCount || 0
          )
      }
    });

  return {
    actorUserId:
      actor,

    targetUserId:
      context.target.id,

    brokerLinkId:
      context.broker.id,

    brokerAccountKey:
      context.brokerAccountKey,

    currentGeneration:
      appendResult.currentGeneration,

    submittedNewCount:
      reviewedExecutions.length,

    insertedCount:
      appendResult.insertedCount,

    existingCount:
      appendResult.existingCount,

    auditEventId:
      auditEvent?.id || null,

    ticketReference:
      clean(ticketReference) || null
  };
}
