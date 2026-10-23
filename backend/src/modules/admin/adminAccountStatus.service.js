/**
 * STATUS: ACTIVE
 * PURPOSE:
 * Controlled administrative mutation of canonical auth-user
 * account access status.
 *
 * Security invariants:
 * - persisted ADMIN actor required
 * - target identity is persisted and locked
 * - ACTIVE / DISABLED only
 * - administrative reason required
 * - self-disable forbidden
 * - final active ADMIN cannot be disabled
 * - no-op mutations rejected
 * - audit event shares mutation transaction
 */

import {
  pool
} from "../../database/db.js";

import {
  appendAdminAuditEvent
} from "../admin-audit/adminAudit.repository.js";

const ALLOWED_STATUSES =
  new Set([
    "ACTIVE",
    "DISABLED"
  ]);

function canonicalStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function canonicalRole(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeReason(value) {
  return String(value || "")
    .trim();
}

function serviceError(
  code,
  message,
  status = 400
) {
  const error =
    new Error(message);

  error.code = code;
  error.status = status;

  return error;
}

export async function changeAdminUserStatus({
  actorUserId,
  targetUserId,
  status,
  reason
}) {
  const actorId =
    String(actorUserId || "").trim();

  const targetId =
    String(targetUserId || "").trim();

  const nextStatus =
    canonicalStatus(status);

  const normalizedReason =
    normalizeReason(reason);

  if (!actorId) {
    throw serviceError(
      "ACTOR_REQUIRED",
      "Authenticated administrator is required.",
      401
    );
  }

  if (!targetId) {
    throw serviceError(
      "TARGET_REQUIRED",
      "Target user is required."
    );
  }

  if (!ALLOWED_STATUSES.has(nextStatus)) {
    throw serviceError(
      "INVALID_ACCOUNT_STATUS",
      "Account status must be ACTIVE or DISABLED."
    );
  }

  if (!normalizedReason) {
    throw serviceError(
      "ADMIN_REASON_REQUIRED",
      "Administrative reason is required."
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Serialize security-sensitive administrative identity
     * mutations before row-level decisions.
     */
    await client.query(
      `
        SELECT pg_advisory_xact_lock(
          hashtext('gatecep-admin-auth-user-security')
        )
      `
    );

    const actorResult =
      await client.query(
        `
          SELECT
            id,
            role,
            status
          FROM public.auth_users
          WHERE id = $1
          FOR UPDATE
        `,
        [actorId]
      );

    const actor =
      actorResult.rows[0];

    if (!actor) {
      throw serviceError(
        "ACTOR_NOT_FOUND",
        "Authenticated administrator was not found.",
        401
      );
    }

    if (
      canonicalRole(actor.role) !==
        "ADMIN"
    ) {
      throw serviceError(
        "ADMIN_REQUIRED",
        "Administrator access is required.",
        403
      );
    }

    if (
      canonicalStatus(actor.status) !==
        "ACTIVE"
    ) {
      throw serviceError(
        "ACTOR_ACCOUNT_DISABLED",
        "Disabled administrators cannot change account status.",
        403
      );
    }

    const targetResult =
      actorId === targetId
        ? actorResult
        : await client.query(
            `
              SELECT
                id,
                role,
                status
              FROM public.auth_users
              WHERE id = $1
              FOR UPDATE
            `,
            [targetId]
          );

    const target =
      targetResult.rows[0];

    if (!target) {
      throw serviceError(
        "TARGET_NOT_FOUND",
        "Target user was not found.",
        404
      );
    }

    const currentStatus =
      canonicalStatus(
        target.status
      );

    const targetRole =
      canonicalRole(
        target.role
      );

    if (
      actorId === targetId &&
      nextStatus === "DISABLED"
    ) {
      throw serviceError(
        "SELF_DISABLE_FORBIDDEN",
        "Administrators cannot disable their own account.",
        409
      );
    }

    if (
      currentStatus === nextStatus
    ) {
      throw serviceError(
        "ACCOUNT_STATUS_UNCHANGED",
        "Target account already has the requested status.",
        409
      );
    }

    if (
      currentStatus === "ACTIVE" &&
      nextStatus === "DISABLED" &&
      targetRole === "ADMIN"
    ) {
      const activeAdminCountResult =
        await client.query(
          `
            SELECT COUNT(*)::integer AS count
            FROM public.auth_users
            WHERE role = 'ADMIN'
              AND status = 'ACTIVE'
          `
        );

      const activeAdminCount =
        Number(
          activeAdminCountResult
            .rows[0]?.count || 0
        );

      if (activeAdminCount <= 1) {
        throw serviceError(
          "LAST_ACTIVE_ADMIN_PROTECTED",
          "The final active administrator cannot be disabled.",
          409
        );
      }
    }

    const updateResult =
      await client.query(
        `
          UPDATE public.auth_users
          SET
            status = $2,
            updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            email,
            username,
            role,
            status,
            created_at AS "createdAt",
            updated_at AS "updatedAt"
        `,
        [
          targetId,
          nextStatus
        ]
      );

    const updatedUser =
      updateResult.rows[0];

    const auditAction =
      nextStatus === "DISABLED"
        ? "USER_ACCOUNT_DISABLED"
        : "USER_ACCOUNT_ENABLED";

    await appendAdminAuditEvent(
      {
        actorUserId: actorId,
        action: auditAction,
        targetType: "AUTH_USER",
        targetId,
        beforeState: {
          status: currentStatus
        },
        afterState: {
          status: nextStatus
        },
        reason: normalizedReason,
        metadata: {
          source:
            "ADMIN_ACCOUNT_STATUS_SERVICE"
        }
      },
      client
    );

    await client.query("COMMIT");

    return updatedUser;
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch {
      // Preserve original mutation failure.
    }

    throw error;
  } finally {
    client.release();
  }
}
