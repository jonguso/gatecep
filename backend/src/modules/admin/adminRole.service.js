import {
  pool
} from "../../database/db.js";

import {
  appendAdminAuditEvent
} from "../admin-audit/adminAudit.repository.js";

const ALLOWED_ROLES =
  new Set([
    "USER",
    "ADMIN"
  ]);

function canonicalRole(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function requireId(value, fieldName) {
  const normalized =
    String(value || "").trim();

  if (!normalized) {
    throw new Error(
      fieldName + " is required"
    );
  }

  return normalized;
}

function serviceError(
  code,
  message,
  status
) {
  const error =
    new Error(message);

  error.code = code;
  error.status = status;

  return error;
}

export async function changeUserRole({
  actorUserId,
  targetUserId,
  requestedRole,
  reason
}) {
  const actorId =
    requireId(
      actorUserId,
      "actorUserId"
    );

  const targetId =
    requireId(
      targetUserId,
      "targetUserId"
    );

  const nextRole =
    canonicalRole(
      requestedRole
    );

  const normalizedReason =
    String(reason || "").trim();

  if (!ALLOWED_ROLES.has(nextRole)) {
    throw serviceError(
      "INVALID_ROLE",
      "Role must be USER or ADMIN",
      400
    );
  }

  if (!normalizedReason) {
    throw serviceError(
      "REASON_REQUIRED",
      "Administrative reason is required",
      400
    );
  }

  if (actorId === targetId) {
    throw serviceError(
      "SELF_ROLE_CHANGE_FORBIDDEN",
      "Administrators cannot change their own role",
      409
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

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
        [
          actorId
        ]
      );

    if (actorResult.rowCount !== 1) {
      throw serviceError(
        "ACTOR_NOT_FOUND",
        "Administrative actor was not found",
        401
      );
    }

    const actorRole =
      canonicalRole(
        actorResult.rows[0].role
      );

    if (actorRole !== "ADMIN") {
      throw serviceError(
        "ADMIN_REQUIRED",
        "Administrative authorization is required",
        403
      );
    }

    const actorStatus =
      String(
        actorResult.rows[0].status || ""
      )
        .trim()
        .toUpperCase();

    if (actorStatus !== "ACTIVE") {
      throw serviceError(
        "ACTOR_ACCOUNT_DISABLED",
        "Disabled administrators cannot change roles",
        403
      );
    }

    const targetResult =
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
        [
          targetId
        ]
      );

    if (targetResult.rowCount !== 1) {
      throw serviceError(
        "TARGET_NOT_FOUND",
        "Target user was not found",
        404
      );
    }

    const currentRole =
      canonicalRole(
        targetResult.rows[0].role
      );

    const currentStatus =
      String(
        targetResult.rows[0].status || ""
      )
        .trim()
        .toUpperCase();

    if (currentRole === nextRole) {
      throw serviceError(
        "ROLE_UNCHANGED",
        "Target user already has the requested role",
        409
      );
    }

    if (
      currentRole === "ADMIN" &&
      currentStatus === "ACTIVE" &&
      nextRole === "USER"
    ) {
      const activeAdminCountResult =
        await client.query(
          `
          SELECT COUNT(*)::int AS count
          FROM public.auth_users
          WHERE role = 'ADMIN'
            AND status = 'ACTIVE'
          `
        );

      if (
        activeAdminCountResult.rows[0].count <= 1
      ) {
        throw serviceError(
          "LAST_ACTIVE_ADMIN_PROTECTED",
          "The final active administrator cannot be demoted",
          409
        );
      }
    }

    const updatedResult =
      await client.query(
        `
        UPDATE public.auth_users
        SET
          role = $2,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          email,
          username,
          role,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        `,
        [
          targetId,
          nextRole
        ]
      );

    const updatedUser =
      updatedResult.rows[0];

    await appendAdminAuditEvent(
      {
        actorUserId:
          actorId,

        action:
          "USER_ROLE_CHANGED",

        targetType:
          "AUTH_USER",

        targetId:
          targetId,

        beforeState: {
          role:
            currentRole
        },

        afterState: {
          role:
            nextRole
        },

        reason:
          normalizedReason,

        metadata: {
          source:
            "ADMIN_ROLE_SERVICE"
        }
      },
      client
    );

    await client.query("COMMIT");

    return updatedUser;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
    }

    throw error;
  } finally {
    client.release();
  }
}
