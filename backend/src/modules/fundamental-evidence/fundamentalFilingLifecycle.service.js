import {
  pool
} from "../../database/db.js";

import {
  lockFundamentalVerifiedFilingById,
  updateFundamentalVerifiedFilingStatus
} from "./fundamentalPersistence.repository.js";

import {
  applyFundamentalFilingTransition
} from "./fundamentalFilingLifecycle.policy.js";

import {
  appendAdminAuditEvent
} from "../admin-audit/adminAudit.repository.js";

function lifecycleError(
  status,
  code,
  message
) {
  const error =
    new Error(message);

  error.status = status;
  error.code = code;

  return error;
}

function requireText(
  value,
  fieldName
) {
  const normalized =
    String(value || "").trim();

  if (!normalized) {
    throw lifecycleError(
      400,
      "FUNDAMENTAL_FILING_LIFECYCLE_INPUT_INVALID",
      `${fieldName} is required.`
    );
  }

  return normalized;
}

function requireActorUserId(
  value
) {
  return requireText(
    value,
    "actorUserId"
  );
}

function buildPersistedActor(
  actorUserId
) {
  return {
    id:
      actorUserId,

    name:
      actorUserId
  };
}

export async function transitionFundamentalVerifiedFiling({
  actorUserId,
  filingId,
  action,
  note = null
} = {}) {
  const persistedActorUserId =
    requireActorUserId(
      actorUserId
    );

  const requestedFilingId =
    requireText(
      filingId,
      "filingId"
    );

  const requestedAction =
    requireText(
      action,
      "action"
    )
      .toUpperCase();

  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    /*
     * The locked database row is authoritative for current
     * lifecycle state and filing payload. Browser-supplied
     * status/review/audit data is intentionally absent.
     */
    const filing =
      await lockFundamentalVerifiedFilingById(
        requestedFilingId,
        client
      );

    if (!filing) {
      throw lifecycleError(
        404,
        "FUNDAMENTAL_FILING_NOT_FOUND",
        "The selected verified filing was not found."
      );
    }

    const transition =
      applyFundamentalFilingTransition({
        currentStatus:
          filing.status,

        action:
          requestedAction,

        actor:
          buildPersistedActor(
            persistedActorUserId
          ),

        note,

        filingPayload:
          filing.filingPayload
      });

    /*
     * Relational status and the complete lifecycle envelope
     * are persisted by one UPDATE statement.
     */
    const updated =
      await updateFundamentalVerifiedFilingStatus(
        {
          filingId:
            filing.filingId,

          status:
            transition.status,

          filingPayload:
            transition.filingPayload
        },
        client
      );

    if (!updated) {
      throw lifecycleError(
        409,
        "FUNDAMENTAL_FILING_LIFECYCLE_WRITE_FAILED",
        "The filing lifecycle transition could not be persisted."
      );
    }

    /*
     * Append the authoritative admin audit event inside the
     * same transaction as the filing lifecycle write.
     */
    const normalizedNote =
      String(note || "").trim() ||
      null;

    const auditEvent =
      await appendAdminAuditEvent(
        {
          actorUserId:
            persistedActorUserId,

          action:
            "FUNDAMENTAL_FILING_LIFECYCLE_TRANSITION",

          targetType:
            "FUNDAMENTAL_VERIFIED_FILING",

          targetId:
            filing.filingId,

          beforeState: {
            status:
              transition.previousStatus
          },

          afterState: {
            status:
              transition.status
          },

          reason:
            normalizedNote,

          metadata: {
            filingId:
              filing.filingId,

            symbol:
              filing.symbol,

            lifecycleAction:
              transition.action
          }
        },
        client
      );

    await client.query(
      "COMMIT"
    );

    return {
      filing:
        updated,

      transition: {
        action:
          transition.action,

        previousStatus:
          transition.previousStatus,

        status:
          transition.status
      },

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
      // Preserve the original lifecycle failure.
    }

    throw error;
  } finally {
    client.release();
  }
}
