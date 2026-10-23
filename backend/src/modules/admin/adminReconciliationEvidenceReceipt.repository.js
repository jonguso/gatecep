import {
  pool
} from "../../database/db.js";

export async function createAdminReconciliationEvidenceReceipt(
  {
    actorUserId,
    targetUserId,
    brokerLinkId,
    brokerAccountKey,
    reportType,
    fileSha256,
    extractionPayload,
    identityVerification,
    expiresAt
  },
  queryable = pool
) {
  if (
    !queryable ||
    typeof queryable.query !== "function"
  ) {
    throw new Error(
      "A queryable database client is required."
    );
  }

  const result =
    await queryable.query(
      `
        INSERT INTO
          public.admin_reconciliation_evidence_receipts (
            actor_user_id,
            target_user_id,
            broker_link_id,
            broker_account_key,
            report_type,
            file_sha256,
            extraction_payload,
            identity_verification,
            expires_at
          )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7::jsonb,
          $8::jsonb,
          $9
        )
        RETURNING
          id,
          actor_user_id AS "actorUserId",
          target_user_id AS "targetUserId",
          broker_link_id AS "brokerLinkId",
          broker_account_key AS "brokerAccountKey",
          report_type AS "reportType",
          file_sha256 AS "fileSha256",
          extraction_payload AS "extractionPayload",
          identity_verification AS "identityVerification",
          created_at AS "createdAt",
          expires_at AS "expiresAt",
          consumed_at AS "consumedAt"
      `,
      [
        actorUserId,
        targetUserId,
        brokerLinkId,
        brokerAccountKey,
        reportType,
        fileSha256,
        JSON.stringify(
          extractionPayload
        ),
        JSON.stringify(
          identityVerification
        ),
        expiresAt
      ]
    );

  return result.rows[0];
}

export async function consumeAdminReconciliationEvidenceReceipt(
  {
    receiptId
  },
  queryable
) {
  if (
    !queryable ||
    typeof queryable.query !== "function"
  ) {
    throw new Error(
      "A transaction-bound queryable database client is required."
    );
  }

  const result =
    await queryable.query(
      `
        UPDATE
          public.admin_reconciliation_evidence_receipts
        SET
          consumed_at = NOW()
        WHERE
          id = $1
          AND consumed_at IS NULL
        RETURNING
          id,
          actor_user_id AS "actorUserId",
          target_user_id AS "targetUserId",
          broker_link_id AS "brokerLinkId",
          broker_account_key AS "brokerAccountKey",
          report_type AS "reportType",
          created_at AS "createdAt",
          expires_at AS "expiresAt",
          consumed_at AS "consumedAt"
      `,
      [
        receiptId
      ]
    );

  return result.rows[0] || null;
}

export async function findAdminReconciliationEvidenceReceiptForUpdate(
  {
    receiptId
  },
  queryable
) {
  if (
    !queryable ||
    typeof queryable.query !== "function"
  ) {
    throw new Error(
      "A transaction-bound queryable database client is required."
    );
  }

  const result =
    await queryable.query(
      `
        SELECT
          id,
          actor_user_id AS "actorUserId",
          target_user_id AS "targetUserId",
          broker_link_id AS "brokerLinkId",
          broker_account_key AS "brokerAccountKey",
          report_type AS "reportType",
          file_sha256 AS "fileSha256",
          extraction_payload AS "extractionPayload",
          identity_verification AS "identityVerification",
          created_at AS "createdAt",
          expires_at AS "expiresAt",
          consumed_at AS "consumedAt"
        FROM
          public.admin_reconciliation_evidence_receipts
        WHERE
          id = $1
        FOR UPDATE
      `,
      [
        receiptId
      ]
    );

  return result.rows[0] || null;
}
