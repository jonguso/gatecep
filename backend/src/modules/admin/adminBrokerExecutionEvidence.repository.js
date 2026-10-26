import { pool } from "../../database/db.js";

function requireQueryable(queryable) {
  if (
    !queryable ||
    typeof queryable.query !== "function"
  ) {
    throw new Error(
      "A queryable database client is required."
    );
  }

  return queryable;
}

function mapExecutionEvidence(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,

    actorUserId:
      row.actor_user_id,

    targetUserId:
      row.target_user_id,

    brokerLinkId:
      row.broker_link_id,

    brokerAccountKey:
      row.broker_account_key,

    sourceFileName:
      row.source_file_name,

    sourceFileSha256:
      row.source_file_sha256,

    sourceRowNumber:
      row.source_row_number,

    executionIdentity:
      row.execution_identity,

    brokerReference:
      row.broker_reference,

    fillReference:
      row.fill_reference,

    symbol:
      row.symbol,

    side:
      row.side,

    executedQuantity:
      row.executed_quantity,

    executionPrice:
      row.execution_price,

    executionDate:
      row.execution_date,

    settlementDate:
      row.settlement_date,

    totalFees:
      row.total_fees,

    executionStatus:
      row.execution_status,

    evidenceStatus:
      row.evidence_status,

    canAffectRealPortfolio:
      row.can_affect_real_portfolio,

    rawEvidence:
      row.raw_evidence,

    verificationMetadata:
      row.verification_metadata,

    createdAt:
      row.created_at
  };
}

export async function createAdminBrokerExecutionEvidence(
  {
    actorUserId,
    targetUserId,
    brokerLinkId,
    brokerAccountKey,

    sourceFileName,
    sourceFileSha256,
    sourceRowNumber,

    executionIdentity,

    brokerReference = null,
    fillReference = null,

    symbol,
    side,

    executedQuantity,
    executionPrice = null,

    executionDate = null,
    settlementDate = null,

    totalFees = null,

    executionStatus,
    evidenceStatus,

    canAffectRealPortfolio = false,

    rawEvidence,
    verificationMetadata = {}
  },
  queryable = pool
) {
  const db =
    requireQueryable(queryable);

  const result =
    await db.query(
      `
        INSERT INTO
          public.admin_broker_execution_evidence (
            actor_user_id,
            target_user_id,
            broker_link_id,
            broker_account_key,

            source_file_name,
            source_file_sha256,
            source_row_number,

            execution_identity,

            broker_reference,
            fill_reference,

            symbol,
            side,

            executed_quantity,
            execution_price,

            execution_date,
            settlement_date,

            total_fees,

            execution_status,
            evidence_status,

            can_affect_real_portfolio,

            raw_evidence,
            verification_metadata
          )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7,
          $8,
          $9, $10,
          $11, $12,
          $13, $14,
          $15, $16,
          $17,
          $18, $19,
          $20,
          $21::jsonb,
          $22::jsonb
        )
        RETURNING *
      `,
      [
        actorUserId,
        targetUserId,
        brokerLinkId,
        brokerAccountKey,

        sourceFileName,
        sourceFileSha256,
        sourceRowNumber,

        executionIdentity,

        brokerReference,
        fillReference,

        symbol,
        side,

        executedQuantity,
        executionPrice,

        executionDate,
        settlementDate,

        totalFees,

        executionStatus,
        evidenceStatus,

        canAffectRealPortfolio,

        JSON.stringify(rawEvidence),
        JSON.stringify(
          verificationMetadata ?? {}
        )
      ]
    );

  return mapExecutionEvidence(
    result.rows[0]
  );
}

export async function findAdminBrokerExecutionEvidenceByIdentity(
  {
    targetUserId,
    brokerLinkId,
    brokerAccountKey,
    executionIdentity
  },
  queryable = pool
) {
  const db =
    requireQueryable(queryable);

  const result =
    await db.query(
      `
        SELECT *
        FROM
          public.admin_broker_execution_evidence
        WHERE
          target_user_id = $1
          AND broker_link_id = $2
          AND broker_account_key = $3
          AND execution_identity = $4
        LIMIT 1
      `,
      [
        targetUserId,
        brokerLinkId,
        brokerAccountKey,
        executionIdentity
      ]
    );

  return mapExecutionEvidence(
    result.rows[0]
  );
}

export async function listAdminBrokerExecutionEvidence(
  {
    targetUserId,
    brokerLinkId,
    brokerAccountKey,
    portfolioReadyOnly = false
  },
  queryable = pool
) {
  const db =
    requireQueryable(queryable);

  const values = [
    targetUserId,
    brokerLinkId,
    brokerAccountKey
  ];

  const portfolioClause =
    portfolioReadyOnly
      ? `
          AND
            can_affect_real_portfolio = TRUE
        `
      : "";

  const result =
    await db.query(
      `
        SELECT *
        FROM
          public.admin_broker_execution_evidence
        WHERE
          target_user_id = $1
          AND broker_link_id = $2
          AND broker_account_key = $3
          ${portfolioClause}
        ORDER BY
          execution_date ASC NULLS LAST,
          created_at ASC,
          id ASC
      `,
      values
    );

  return result.rows.map(
    mapExecutionEvidence
  );
}

export async function countAdminBrokerExecutionEvidence(
  {
    targetUserId,
    brokerLinkId,
    brokerAccountKey
  },
  queryable = pool
) {
  const db =
    requireQueryable(queryable);

  const result =
    await db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM
          public.admin_broker_execution_evidence
        WHERE
          target_user_id = $1
          AND broker_link_id = $2
          AND broker_account_key = $3
      `,
      [
        targetUserId,
        brokerLinkId,
        brokerAccountKey
      ]
    );

  return result.rows[0]?.count ?? 0;
}

export async function createAdminBrokerExecutionEvidenceIfAbsent(
  record,
  queryable = pool
) {
  const db =
    requireQueryable(queryable);

  const result =
    await db.query(
      `
        INSERT INTO public.admin_broker_execution_evidence (
          actor_user_id,
          target_user_id,
          broker_link_id,
          broker_account_key,
          source_file_name,
          source_file_sha256,
          source_row_number,
          execution_identity,
          broker_reference,
          fill_reference,
          symbol,
          side,
          executed_quantity,
          execution_price,
          execution_date,
          settlement_date,
          total_fees,
          execution_status,
          evidence_status,
          can_affect_real_portfolio,
          raw_evidence,
          verification_metadata
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21::jsonb,
          $22::jsonb
        )
        ON CONFLICT (
          target_user_id,
          broker_link_id,
          broker_account_key,
          execution_identity
        )
        DO NOTHING
        RETURNING *
      `,
      [
        record.actorUserId,
        record.targetUserId,
        record.brokerLinkId,
        record.brokerAccountKey,
        record.sourceFileName,
        record.sourceFileSha256,
        record.sourceRowNumber,
        record.executionIdentity,
        record.brokerReference ?? null,
        record.fillReference ?? null,
        record.symbol,
        record.side,
        record.executedQuantity,
        record.executionPrice,
        record.executionDate,
        record.settlementDate,
        record.totalFees,
        record.executionStatus,
        record.evidenceStatus,
        record.canAffectRealPortfolio === true,
        JSON.stringify(
          record.rawEvidence ?? {}
        ),
        JSON.stringify(
          record.verificationMetadata ?? {}
        )
      ]
    );

  if (!result.rows[0]) {
    return null;
  }

  return mapExecutionEvidence(
    result.rows[0]
  );
}

/*
 * ADMIN-TXHIST scoped maintenance boundary.
 *
 * This operation is intentionally account-scoped.
 * There is no unrestricted delete-all execution-evidence API.
 *
 * Required scope:
 *   target user
 *   broker link
 *   canonical broker account key
 *
 * The caller is responsible for transaction-bound ownership
 * validation before invoking this destructive operation.
 */
export async function deleteAdminBrokerExecutionEvidenceForAccount(
  {
    targetUserId,
    brokerLinkId,
    brokerAccountKey
  },
  queryable = pool
) {
  const db =
    requireQueryable(queryable);

  const target =
    String(targetUserId || "").trim();

  const brokerLink =
    String(brokerLinkId || "").trim();

  const accountKey =
    String(brokerAccountKey || "").trim();

  if (
    !target ||
    !brokerLink ||
    !accountKey
  ) {
    throw new Error(
      "Target user, broker link, and broker account key are required for scoped execution-history reset."
    );
  }

  const result =
    await db.query(
      `
        DELETE FROM
          public.admin_broker_execution_evidence
        WHERE
          target_user_id = $1
          AND broker_link_id = $2
          AND broker_account_key = $3
        RETURNING
          id,
          execution_identity,
          source_file_sha256
      `,
      [
        target,
        brokerLink,
        accountKey
      ]
    );

  return {
    deletedCount:
      result.rowCount ?? result.rows.length,

    deletedEvidence:
      result.rows.map(
        (row) => ({
          id:
            row.id,

          executionIdentity:
            row.execution_identity,

          sourceFileSha256:
            row.source_file_sha256
        })
      )
  };
}
