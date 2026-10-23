import {
  pool
} from "../../database/db.js";

import {
  buildFundamentalFilingDraft
} from "./fundamentalFilingIntake.policy.js";

import {
  findFundamentalVerifiedFilingByContentHash,
  insertFundamentalVerifiedFiling
} from "./fundamentalPersistence.repository.js";

import {
  appendAdminAuditEvent
} from "../admin-audit/adminAudit.repository.js";

function intakeServiceError(
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
    throw intakeServiceError(
      400,
      "FUNDAMENTAL_FILING_INTAKE_INPUT_INVALID",
      `${fieldName} is required.`
    );
  }

  return normalized;
}

export async function createFundamentalVerifiedFilingDraft({
  actorUserId,
  payload
} = {}) {
  const persistedActorUserId =
    requireText(
      actorUserId,
      "actorUserId"
    );

  /*
   * The policy derives all authoritative filing identity
   * and lifecycle defaults. Browser-supplied status,
   * revision, duplicate state, actor, hash, review and
   * audit fields are rejected before persistence.
   */
  const draft =
    buildFundamentalFilingDraft({
      payload,
      actorUserId:
        persistedActorUserId
    });

  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    /*
     * Serialize intake for this security. This closes the
     * race between duplicate lookup and insert when two
     * requests for the same security arrive concurrently.
     */
    await client.query(
      `
        SELECT
          pg_advisory_xact_lock(
            hashtext($1)
          )
      `,
      [
        `fundamental:${draft.symbol}`
      ]
    );

    /*
     * Exact duplicate identity is server-derived:
     * canonical symbol + deterministic SHA-256 payload hash.
     */
    const duplicate =
      await findFundamentalVerifiedFilingByContentHash(
        {
          symbol:
            draft.symbol,

          contentHash:
            draft.contentHash
        },
        client
      );

    if (duplicate) {
      throw intakeServiceError(
        409,
        "FUNDAMENTAL_FILING_EXACT_DUPLICATE",
        "An identical filing already exists for this security."
      );
    }

    const filing =
      await insertFundamentalVerifiedFiling(
        draft,
        client
      );

    if (!filing) {
      throw intakeServiceError(
        409,
        "FUNDAMENTAL_FILING_CREATE_FAILED",
        "The verified filing draft could not be created."
      );
    }

    /*
     * Creation is audited in the same database transaction.
     * We intentionally avoid copying the full filing payload
     * into the Admin audit record.
     */
    const auditEvent =
      await appendAdminAuditEvent(
        {
          actorUserId:
            persistedActorUserId,

          action:
            "FUNDAMENTAL_FILING_CREATED",

          targetType:
            "FUNDAMENTAL_VERIFIED_FILING",

          targetId:
            filing.filingId,

          beforeState:
            null,

          afterState: {
            status:
              filing.status
          },

          reason:
            "Single verified filing draft created.",

          metadata: {
            filingId:
              filing.filingId,

            symbol:
              filing.symbol,

            filingType:
              filing.filingType,

            fiscalYear:
              filing.fiscalYear,

            revisionNumber:
              filing.revisionNumber,

            contentHash:
              filing.contentHash
          }
        },
        client
      );

    await client.query(
      "COMMIT"
    );

    return {
      filing,
      auditEventId:
        auditEvent?.id ||
        null
    };
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch {
      // Preserve the original intake failure.
    }

    throw error;
  } finally {
    client.release();
  }
}
