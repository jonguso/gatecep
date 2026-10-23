import {
  pool
} from "../../database/db.js";

const FORBIDDEN_AUDIT_KEYS =
  new Set([
    "password",
    "passwordhash",
    "password_hash",
    "authorization",
    "jwt",
    "token",
    "accesstoken",
    "access_token",
    "refreshtoken",
    "refresh_token",
    "apikey",
    "api_key",
    "secret",
    "clientsecret",
    "client_secret"
  ]);

function canonicalAuditKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function assertNoAuditSecrets(
  value,
  path = "audit"
) {
  if (
    value === null ||
    value === undefined
  ) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(
      (item, index) =>
        assertNoAuditSecrets(
          item,
          path + "[" + index + "]"
        )
    );

    return;
  }

  if (typeof value !== "object") {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    const canonical =
      canonicalAuditKey(key);

    if (
      FORBIDDEN_AUDIT_KEYS.has(canonical)
    ) {
      throw new Error(
        "Forbidden secret-bearing audit field: " +
        path +
        "." +
        key
      );
    }

    assertNoAuditSecrets(
      nested,
      path + "." + key
    );
  }
}

function normalizeOptionalText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized || null;
}

function requireText(value, fieldName) {
  const normalized =
    normalizeOptionalText(value);

  if (!normalized) {
    throw new Error(
      fieldName + " is required"
    );
  }

  return normalized;
}

export async function appendAdminAuditEvent(
  {
    actorUserId,
    action,
    targetType,
    targetId = null,
    beforeState = null,
    afterState = null,
    reason = null,
    metadata = {}
  },
  queryable = pool
) {
  const event = {
    actorUserId:
      requireText(
        actorUserId,
        "actorUserId"
      ),

    action:
      requireText(
        action,
        "action"
      ),

    targetType:
      requireText(
        targetType,
        "targetType"
      ),

    targetId:
      normalizeOptionalText(
        targetId
      ),

    beforeState,
    afterState,

    reason:
      normalizeOptionalText(
        reason
      ),

    metadata:
      metadata ?? {}
  };

  assertNoAuditSecrets(
    {
      beforeState:
        event.beforeState,

      afterState:
        event.afterState,

      metadata:
        event.metadata
    }
  );

  const result =
    await queryable.query(
      `
      INSERT INTO public.admin_audit_events (
        actor_user_id,
        action,
        target_type,
        target_id,
        before_state,
        after_state,
        reason,
        metadata
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5::jsonb,
        $6::jsonb,
        $7,
        $8::jsonb
      )
      RETURNING
        id,
        actor_user_id AS "actorUserId",
        action,
        target_type AS "targetType",
        target_id AS "targetId",
        before_state AS "beforeState",
        after_state AS "afterState",
        reason,
        metadata,
        created_at AS "createdAt"
      `,
      [
        event.actorUserId,
        event.action,
        event.targetType,
        event.targetId,
        event.beforeState == null
          ? null
          : JSON.stringify(
              event.beforeState
            ),
        event.afterState == null
          ? null
          : JSON.stringify(
              event.afterState
            ),
        event.reason,
        JSON.stringify(
          event.metadata
        )
      ]
    );

  return result.rows[0];
}

export async function listAdminAuditEvents(
  {
    limit = 100
  } = {},
  queryable = pool
) {
  const safeLimit =
    Math.max(
      1,
      Math.min(
        Number.isInteger(limit)
          ? limit
          : 100,
        200
      )
    );

  const result =
    await queryable.query(
      `
      SELECT
        id,
        actor_user_id AS "actorUserId",
        action,
        target_type AS "targetType",
        target_id AS "targetId",
        before_state AS "beforeState",
        after_state AS "afterState",
        reason,
        metadata,
        created_at AS "createdAt"
      FROM public.admin_audit_events
      ORDER BY
        created_at DESC,
        id DESC
      LIMIT $1
      `,
      [
        safeLimit
      ]
    );

  return result.rows;
}
