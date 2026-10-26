import {
  lockAdminReconciliationBrokerContext
} from "./adminReconciliationTarget.service.js";

import {
  findInvestorBrokerTransactionHistoryAuthority,
  listInvestorBrokerTransactionHistory
} from "../transaction-history/investorBrokerTransactionHistory.repository.js";

import {
  pool
} from "../../database/db.js";

import {
  createHash
} from "node:crypto";

function backupError(
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
    throw backupError(
      400,
      "TRANSACTION_HISTORY_BACKUP_INPUT_INVALID",
      `${fieldName} is required.`
    );
  }

  return normalized;
}

/*
 * Deterministic physical-history state token.
 *
 * This is intentionally distinct from payloadSha256:
 *
 * - payloadSha256 proves the exact downloaded backup envelope.
 * - historyStateSha256 proves the canonical physical Transaction
 *   History state for the exact selected broker account.
 *
 * generatedAt, actor identity and presentation-only envelope fields
 * are intentionally excluded.
 *
 * Evidence is sorted explicitly so repository/display ordering cannot
 * change the state token.
 */
function canonicalizeHistoryStateValue(value) {
  if (Array.isArray(value)) {
    return value.map(
      canonicalizeHistoryStateValue
    );
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    return Object.keys(value)
      .sort()
      .reduce(
        (result, key) => {
          result[key] =
            canonicalizeHistoryStateValue(
              value[key]
            );

          return result;
        },
        {}
      );
  }

  return value;
}

export function computeTransactionHistoryStateSha256({
  targetUserId,
  brokerLinkId,
  brokerAccountKey,
  currentGeneration,
  executions = []
} = {}) {
  const normalizedExecutions =
    [...executions]
      .sort((left, right) => {
        const leftKey = [
          Number(left?.authorityGeneration || 0),
          String(left?.executionIdentity || ""),
          String(left?.id || "")
        ].join("|");

        const rightKey = [
          Number(right?.authorityGeneration || 0),
          String(right?.executionIdentity || ""),
          String(right?.id || "")
        ].join("|");

        return leftKey.localeCompare(rightKey);
      });

  const statePayload = {
    schema:
      "GATECEP_ADMIN_TRANSACTION_HISTORY_STATE_V1",

    targetUserId:
      String(targetUserId || "").trim(),

    brokerLinkId:
      String(brokerLinkId || "").trim(),

    brokerAccountKey:
      String(brokerAccountKey || "")
        .trim()
        .toUpperCase(),

    currentGeneration:
      Number(currentGeneration),

    physicalExecutionCount:
      normalizedExecutions.length,

    executions:
      normalizedExecutions
  };

  const canonicalStatePayload =
    canonicalizeHistoryStateValue(
      statePayload
    );

  return createHash("sha256")
    .update(
      JSON.stringify(
        canonicalStatePayload
      ),
      "utf8"
    )
    .digest("hex");
}

export function safeBackupEvidence(row) {
  return {
    id:
      row.id,

    authorityGeneration:
      Number(row.authorityGeneration),

    executionIdentity:
      row.executionIdentity,

    exchangeOrderNo:
      row.exchangeOrderNo,

    symbol:
      row.symbol,

    side:
      row.side,

    totalTradedQuantity:
      row.totalTradedQuantity,

    executionPrice:
      row.executionPrice,

    executionDate:
      row.executionDate,

    historicalExecutionState:
      row.historicalExecutionState,

    executionConfirmed:
      row.executionConfirmed === true,

    fifoEligible:
      row.fifoEligible === true,

    canAffectFifo:
      row.canAffectFifo === true,

    descriptiveOrderStatus:
      row.descriptiveOrderStatus,

    source:
      row.source,

    sourceFileName:
      row.sourceFileName,

    sourceFileSha256:
      row.sourceFileSha256,

    sourceRowNumber:
      row.sourceRowNumber,

    rawEvidence:
      row.rawEvidence,

    verificationMetadata:
      row.verificationMetadata,

    createdAt:
      row.createdAt
  };
}

/*
 * Read-only administrative backup/preview.
 *
 * The browser supplies only targetUserId and brokerLinkId.
 * brokerAccountKey is derived from the persisted broker link.
 *
 * Every physical canonical Transaction History execution for the
 * exact server-authoritative investor + broker link + broker account
 * is returned, irrespective of authority generation.
 *
 * currentGeneration remains authority metadata and is not used to
 * exclude historical physical rows from this maintenance backup.
 *
 * No mutation occurs.
 */
export async function getAdminBrokerTransactionHistoryBackup(
  {
    actorUserId,
    targetUserId,
    brokerLinkId
  } = {},
  {
    poolOverride = pool,
    lockBrokerContext =
      lockAdminReconciliationBrokerContext,
    findAuthority =
      findInvestorBrokerTransactionHistoryAuthority,
    listHistory =
      listInvestorBrokerTransactionHistory
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

  if (actor === target) {
    throw backupError(
      409,
      "TRANSACTION_HISTORY_BACKUP_ACTOR_TARGET_CONFLICT",
      "Admin actor and Transaction History target must be distinct."
    );
  }

  if (
    !poolOverride ||
    typeof poolOverride.connect !== "function"
  ) {
    throw backupError(
      500,
      "TRANSACTION_HISTORY_BACKUP_DATABASE_UNAVAILABLE",
      "A database pool is required."
    );
  }

  const client =
    await poolOverride.connect();

  try {
    await client.query(
      "BEGIN"
    );

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

    const authority =
      await findAuthority(
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

    if (!authority) {
      throw backupError(
        409,
        "TRANSACTION_HISTORY_AUTHORITY_NOT_ESTABLISHED",
        "Canonical Transaction History authority has not been established for this broker account."
      );
    }

    const currentGeneration =
      Number(
        authority.currentGeneration
      );

    if (
      !Number.isInteger(
        currentGeneration
      ) ||
      currentGeneration < 1
    ) {
      throw backupError(
        409,
        "TRANSACTION_HISTORY_AUTHORITY_INVALID",
        "Canonical Transaction History authority generation is invalid."
      );
    }

    const rows =
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

    const executions =
      rows.map(
        safeBackupEvidence
      );

    await client.query(
      "COMMIT"
    );

    const backupPayload = {
      /*
       * V2 is a complete physical canonical-history backup
       * for the exact selected investor broker account.
       *
       * currentGeneration remains authority metadata only.
       */
      schema:
        "GATECEP_ADMIN_TRANSACTION_HISTORY_BACKUP_V2",

      generatedAt:
        new Date().toISOString(),

      target: {
        id:
          context.target.id,

        email:
          context.target.email,

        username:
          context.target.username
      },

      broker: {
        id:
          context.broker.id,

        broker:
          context.broker.broker,

        clientNumber:
          context.broker.clientNumber,

        cdsNumber:
          context.broker.cdsNumber
      },

      actorUserId:
        actor,

      targetUserId:
        context.target.id,

      brokerLinkId:
        context.broker.id,

      brokerAccountKey:
        context.brokerAccountKey,

      authorityEstablished:
        true,

      currentGeneration,

      scope:
        "ALL_PHYSICAL_CANONICAL_HISTORY_FOR_TARGET_BROKER_ACCOUNT",

      physicalExecutionCount:
        executions.length,

      executionCount:
        executions.length,

      executions
    };

    const historyStateSha256 =
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

    const payloadSha256 =
      createHash("sha256")
        .update(
          JSON.stringify(
            backupPayload
          ),
          "utf8"
        )
        .digest("hex");

    return {
      ...backupPayload,

      integrity: {
        algorithm:
          "SHA-256",

        payloadSha256,

        historyStateSha256
      }
    };
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch {}

    throw error;
  } finally {
    client.release();
  }
}
