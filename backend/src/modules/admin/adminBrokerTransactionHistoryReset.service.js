import {
  lockAdminReconciliationBrokerContext
} from "./adminReconciliationTarget.service.js";

import {
  deleteInvestorBrokerTransactionHistoryForAccount,
  getOrCreateInvestorBrokerTransactionHistoryAuthority,
  listInvestorBrokerTransactionHistory
} from "../transaction-history/investorBrokerTransactionHistory.repository.js";

import {
  computeTransactionHistoryStateSha256,
  safeBackupEvidence
} from "./adminBrokerTransactionHistoryBackup.service.js";

import {
  pool
} from "../../database/db.js";

import {
  appendAdminAuditEvent
} from "../admin-audit/adminAudit.repository.js";

function resetError(
  status,
  code,
  message
) {
  const error =
    new Error(message);

  error.status =
    status;

  error.code =
    code;

  return error;
}

function requireText(
  value,
  fieldName
) {
  const normalized =
    String(value || "").trim();

  if (!normalized) {
    throw resetError(
      400,
      "TRANSACTION_HISTORY_RESET_INPUT_INVALID",
      `${fieldName} is required.`
    );
  }

  return normalized;
}

function requireObservedGeneration(
  value
) {
  const generation =
    Number(value);

  if (
    !Number.isInteger(generation) ||
    generation < 1
  ) {
    throw resetError(
      400,
      "TRANSACTION_HISTORY_RESET_GENERATION_INVALID",
      "observedGeneration must be a positive integer."
    );
  }

  return generation;
}

function requirePhysicalExecutionCount(
  value
) {
  const count =
    Number(value);

  if (
    !Number.isInteger(count) ||
    count < 0
  ) {
    throw resetError(
      400,
      "TRANSACTION_HISTORY_RESET_PHYSICAL_COUNT_INVALID",
      "physicalExecutionCount must be a non-negative integer."
    );
  }

  return count;
}

function requireHistoryStateSha256(
  value
) {
  const sha =
    String(value || "")
      .trim()
      .toLowerCase();

  if (!/^[a-f0-9]{64}$/.test(sha)) {
    throw resetError(
      400,
      "TRANSACTION_HISTORY_RESET_STATE_SHA_INVALID",
      "historyStateSha256 must be a SHA-256 hexadecimal digest."
    );
  }

  return sha;
}

/*
 * Protected administrative Transaction History maintenance reset.
 *
 * The exact investor + broker account is locked, its authority
 * generation is verified, every physical canonical history row is
 * re-read, and the complete physical state is compared with the
 * downloaded backup evidence.
 *
 * Only after those interlocks pass may the exact selected broker
 * account history be physically deleted. Destructive audit evidence
 * is written inside the same transaction. Any failure rolls back.
 *
 * Authority generation is deliberately preserved so a subsequent
 * investor upload is processed under the current authority.
 */
export async function resetAdminBrokerTransactionHistory(
  {
    actorUserId,
    targetUserId,
    brokerLinkId,
    observedGeneration,
    physicalExecutionCount,
    historyStateSha256,
    reason,
    confirmed
  } = {},
  {
    poolOverride = pool,
    lockBrokerContext =
      lockAdminReconciliationBrokerContext,
    getOrCreateAuthority =
      getOrCreateInvestorBrokerTransactionHistoryAuthority,
    listHistory =
      listInvestorBrokerTransactionHistory,
    deleteHistory =
      deleteInvestorBrokerTransactionHistoryForAccount,
    appendAudit =
      appendAdminAuditEvent
  } = {}
) {
  const actor =
    requireText(
      actorUserId,
      "actorUserId"
    );

  const target =
    requireText(
      targetUserId,
      "targetUserId"
    );

  const brokerLink =
    requireText(
      brokerLinkId,
      "brokerLinkId"
    );

  const generation =
    requireObservedGeneration(
      observedGeneration
    );

  const expectedPhysicalExecutionCount =
    requirePhysicalExecutionCount(
      physicalExecutionCount
    );

  const expectedHistoryStateSha256 =
    requireHistoryStateSha256(
      historyStateSha256
    );

  const normalizedReason =
    requireText(
      reason,
      "reason"
    );

  if (
    normalizedReason.length < 3
  ) {
    throw resetError(
      400,
      "TRANSACTION_HISTORY_RESET_REASON_INVALID",
      "A meaningful reset reason is required."
    );
  }

  if (confirmed !== true) {
    throw resetError(
      400,
      "TRANSACTION_HISTORY_RESET_CONFIRMATION_REQUIRED",
      "Explicit Transaction History reset confirmation is required."
    );
  }

  if (actor === target) {
    throw resetError(
      409,
      "TRANSACTION_HISTORY_RESET_ACTOR_TARGET_CONFLICT",
      "Admin actor and Transaction History target must be distinct."
    );
  }

  if (
    !poolOverride ||
    typeof poolOverride.connect !== "function"
  ) {
    throw resetError(
      500,
      "TRANSACTION_HISTORY_RESET_DATABASE_UNAVAILABLE",
      "A database pool is required."
    );
  }

  const client =
    await poolOverride.connect();

  let transactionOpen =
    false;

  try {
    await client.query(
      "BEGIN"
    );

    transactionOpen =
      true;

    const context =
      await lockBrokerContext(
        {
          targetUserId:
            target,

          brokerLinkId:
            brokerLink
        },
        client
      );

    /*
     * This repository call performs SELECT ... FOR UPDATE.
     * Authority is therefore serialized while the backup-state
     * interlock is recomputed.
     */
    const authority =
      await getOrCreateAuthority(
        {
          userId:
            context.target.id,

          brokerLinkId:
            context.broker.id,

          brokerAccountKey:
            context.brokerAccountKey
        },
        client
      );

    const currentGeneration =
      Number(
        authority?.currentGeneration
      );

    if (
      !Number.isInteger(
        currentGeneration
      ) ||
      currentGeneration < 1
    ) {
      throw resetError(
        409,
        "TRANSACTION_HISTORY_AUTHORITY_INVALID",
        "Canonical Transaction History authority generation is invalid."
      );
    }

    if (
      generation !==
      currentGeneration
    ) {
      const error =
        resetError(
          409,
          "STALE_TRANSACTION_HISTORY_GENERATION",
          "Transaction History generation is stale. Refresh the backup before resetting."
        );

      error.observedGeneration =
        generation;

      error.currentGeneration =
        currentGeneration;

      throw error;
    }

    /*
     * IMPORTANT:
     * No authorityGeneration filter.
     *
     * This is the complete physical canonical history for the exact
     * selected investor + broker account. This correctly handles
     * accounts such as ABC where authority generation may be newer
     * than the generation carried by existing physical rows.
     */
    const beforeRows =
      await listHistory(
        {
          userId:
            context.target.id,

          brokerLinkId:
            context.broker.id,

          brokerAccountKey:
            context.brokerAccountKey
        },
        client
      );

    const currentPhysicalExecutionCount =
      beforeRows.length;

    if (
      currentPhysicalExecutionCount !==
      expectedPhysicalExecutionCount
    ) {
      const error =
        resetError(
          409,
          "TRANSACTION_HISTORY_BACKUP_PHYSICAL_COUNT_STALE",
          "Transaction History physical row count changed. Generate and download a fresh backup before continuing."
        );

      error.expectedPhysicalExecutionCount =
        expectedPhysicalExecutionCount;

      error.currentPhysicalExecutionCount =
        currentPhysicalExecutionCount;

      throw error;
    }

    const executions =
      beforeRows.map(
        safeBackupEvidence
      );

    const currentHistoryStateSha256 =
      computeTransactionHistoryStateSha256({
        targetUserId:
          context.target.id,

        brokerLinkId:
          context.broker.id,

        brokerAccountKey:
          context.brokerAccountKey,

        currentGeneration,

        executions
      });

    if (
      currentHistoryStateSha256 !==
      expectedHistoryStateSha256
    ) {
      const error =
        resetError(
          409,
          "TRANSACTION_HISTORY_BACKUP_STATE_STALE",
          "Transaction History state changed. Generate and download a fresh backup before continuing."
        );

      error.expectedHistoryStateSha256 =
        expectedHistoryStateSha256;

      error.currentHistoryStateSha256 =
        currentHistoryStateSha256;

      throw error;
    }

    /*
     * Backup state now exactly matches the locked physical canonical
     * history for this investor + broker account.
     *
     * ADMIN MAINTENANCE ONLY:
     * physically remove the exact selected broker-account bucket.
     *
     * IMPORTANT:
     * No authority-generation filter is used by the delete primitive.
     * The authority generation itself is NOT advanced.
     */
    const generationsDeleted =
      [
        ...new Set(
          beforeRows
            .map(
              row =>
                Number(
                  row?.authorityGeneration
                )
            )
            .filter(
              Number.isInteger
            )
        )
      ].sort(
        (left, right) =>
          left - right
      );

    const deletion =
      await deleteHistory(
        {
          userId:
            context.target.id,

          brokerLinkId:
            context.broker.id,

          brokerAccountKey:
            context.brokerAccountKey
        },
        client
      );

    const deletedCount =
      Number(
        deletion?.deletedCount ?? -1
      );

    if (
      !Number.isInteger(
        deletedCount
      ) ||
      deletedCount !==
        currentPhysicalExecutionCount
    ) {
      throw resetError(
        409,
        "TRANSACTION_HISTORY_DELETE_COUNT_MISMATCH",
        "Transaction History delete count did not match the verified backup state."
      );
    }

    /*
     * Re-read the exact same account inside the same transaction.
     * Successful destructive maintenance requires physical zero.
     */
    const remainingRows =
      await listHistory(
        {
          userId:
            context.target.id,

          brokerLinkId:
            context.broker.id,

          brokerAccountKey:
            context.brokerAccountKey
        },
        client
      );

    const remainingPhysicalExecutionCount =
      remainingRows.length;

    if (
      remainingPhysicalExecutionCount !== 0
    ) {
      throw resetError(
        409,
        "TRANSACTION_HISTORY_DELETE_INCOMPLETE",
        "Transaction History physical delete did not leave the selected broker account empty."
      );
    }

    /*
     * Audit evidence is written using the SAME transaction client.
     * Audit failure therefore rolls the physical delete back.
     */
    const auditEvent =
      await appendAudit(
        {
          actorUserId:
            actor,

          action:
            "BROKER_TRANSACTION_HISTORY_PHYSICALLY_DELETED",

          targetType:
            "INVESTOR_BROKER_TRANSACTION_HISTORY",

          targetId:
            context.target.id,

          beforeState: {
            brokerLinkId:
              context.broker.id,

            brokerAccountKey:
              context.brokerAccountKey,

            currentGeneration,

            physicalExecutionCount:
              currentPhysicalExecutionCount,

            historyStateSha256:
              currentHistoryStateSha256,

            generations:
              generationsDeleted
          },

          afterState: {
            brokerLinkId:
              context.broker.id,

            brokerAccountKey:
              context.brokerAccountKey,

            currentGeneration,

            physicalExecutionCount:
              0
          },

          reason:
            normalizedReason,

          metadata: {
            source:
              "ADMIN_TRANSACTION_HISTORY_MAINTENANCE",

            resetModel:
              "PHYSICAL_DELETE_AFTER_BACKUP",

            physicalDelete:
              true,

            targetUserId:
              context.target.id,

            brokerLinkId:
              context.broker.id,

            brokerAccountKey:
              context.brokerAccountKey,

            currentGeneration,

            generationsDeleted,

            deletedCount,

            physicalExecutionCountBefore:
              currentPhysicalExecutionCount,

            physicalExecutionCountAfter:
              0,

            historyStateSha256:
              currentHistoryStateSha256
          }
        },
        client
      );

    if (!auditEvent?.id) {
      throw resetError(
        500,
        "TRANSACTION_HISTORY_RESET_AUDIT_FAILED",
        "Transaction History maintenance audit evidence could not be persisted."
      );
    }

    await client.query(
      "COMMIT"
    );

    transactionOpen =
      false;

    return {
      actorUserId:
        actor,

      targetUserId:
        context.target.id,

      brokerLinkId:
        context.broker.id,

      brokerAccountKey:
        context.brokerAccountKey,

      reason:
        normalizedReason,

      resetModel:
        "PHYSICAL_DELETE_AFTER_BACKUP",

      validationOnly:
        false,

      currentGeneration,

      physicalExecutionCount:
        currentPhysicalExecutionCount,

      physicalExecutionCountAfter:
        0,

      historyStateSha256:
        currentHistoryStateSha256,

      deletedCount,

      physicalDelete:
        true,

      generationsDeleted,

      auditEventId:
        auditEvent.id
    };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch {}
    }

    throw error;
  } finally {
    client.release();
  }
}
