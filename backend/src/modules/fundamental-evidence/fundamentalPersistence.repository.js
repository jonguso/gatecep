import {
  pool
} from "../../database/db.js";

function requireQueryable(
  queryable
) {
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

function mapFilingRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    filingId: row.filingId,
    symbol: row.symbol,
    companyName: row.companyName,
    filingType: row.filingType,
    fiscalYear: row.fiscalYear,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    publicationDate: row.publicationDate,
    status: row.status,
    revisionNumber: row.revisionNumber,
    supersedesFilingId:
      row.supersedesFilingId,
    supersededByFilingId:
      row.supersededByFilingId,
    duplicateStatus:
      row.duplicateStatus,
    duplicateOfFilingId:
      row.duplicateOfFilingId,
    contentHash: row.contentHash,
    filingPayload: row.filingPayload,
    createdByUserId:
      row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function mapFundamentalRecordRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    symbol: row.symbol,
    companyName: row.companyName,
    approvedFilingId:
      row.approvedFilingId,
    revisionNumber:
      row.revisionNumber,
    fundamentalPayload:
      row.fundamentalPayload,
    promotedByUserId:
      row.promotedByUserId,
    promotedAt:
      row.promotedAt,
    createdAt:
      row.createdAt,
    updatedAt:
      row.updatedAt
  };
}

const FILING_SELECT = `
  SELECT
    id,
    filing_id AS "filingId",
    symbol,
    company_name AS "companyName",
    filing_type AS "filingType",
    fiscal_year AS "fiscalYear",
    period_start AS "periodStart",
    period_end AS "periodEnd",
    publication_date AS "publicationDate",
    status,
    revision_number AS "revisionNumber",
    supersedes_filing_id AS "supersedesFilingId",
    superseded_by_filing_id AS "supersededByFilingId",
    duplicate_status AS "duplicateStatus",
    duplicate_of_filing_id AS "duplicateOfFilingId",
    content_hash AS "contentHash",
    filing_payload AS "filingPayload",
    created_by_user_id AS "createdByUserId",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM
    public.fundamental_verified_filings
`;

export async function insertFundamentalVerifiedFiling(
  {
    filingId,
    symbol,
    companyName = null,
    filingType,
    fiscalYear = null,
    periodStart = null,
    periodEnd = null,
    publicationDate = null,
    status,
    revisionNumber = 1,
    supersedesFilingId = null,
    supersededByFilingId = null,
    duplicateStatus = "UNIQUE",
    duplicateOfFilingId = null,
    contentHash = null,
    filingPayload,
    createdByUserId
  },
  queryable = pool
) {
  requireQueryable(queryable);

  const result =
    await queryable.query(
      `
        INSERT INTO
          public.fundamental_verified_filings (
            filing_id,
            symbol,
            company_name,
            filing_type,
            fiscal_year,
            period_start,
            period_end,
            publication_date,
            status,
            revision_number,
            supersedes_filing_id,
            superseded_by_filing_id,
            duplicate_status,
            duplicate_of_filing_id,
            content_hash,
            filing_payload,
            created_by_user_id
          )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14,
          $15, $16::jsonb, $17
        )
        RETURNING
          id,
          filing_id AS "filingId",
          symbol,
          company_name AS "companyName",
          filing_type AS "filingType",
          fiscal_year AS "fiscalYear",
          period_start AS "periodStart",
          period_end AS "periodEnd",
          publication_date AS "publicationDate",
          status,
          revision_number AS "revisionNumber",
          supersedes_filing_id AS "supersedesFilingId",
          superseded_by_filing_id AS "supersededByFilingId",
          duplicate_status AS "duplicateStatus",
          duplicate_of_filing_id AS "duplicateOfFilingId",
          content_hash AS "contentHash",
          filing_payload AS "filingPayload",
          created_by_user_id AS "createdByUserId",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        filingId,
        symbol,
        companyName,
        filingType,
        fiscalYear,
        periodStart,
        periodEnd,
        publicationDate,
        status,
        revisionNumber,
        supersedesFilingId,
        supersededByFilingId,
        duplicateStatus,
        duplicateOfFilingId,
        contentHash,
        JSON.stringify(filingPayload),
        createdByUserId
      ]
    );

  return mapFilingRow(
    result.rows[0]
  );
}

export async function findFundamentalVerifiedFilingByContentHash(
  {
    symbol,
    contentHash
  },
  queryable = pool
) {
  requireQueryable(queryable);

  const normalizedSymbol =
    String(symbol || "")
      .trim()
      .toUpperCase();

  const normalizedContentHash =
    String(contentHash || "")
      .trim()
      .toLowerCase();

  if (
    !normalizedSymbol ||
    !/^[0-9a-f]{64}$/.test(
      normalizedContentHash
    )
  ) {
    return null;
  }

  const result =
    await queryable.query(
      `
        ${FILING_SELECT}
        WHERE
          symbol = $1
          AND content_hash = $2
        ORDER BY
          created_at ASC,
          filing_id ASC
        LIMIT 1
      `,
      [
        normalizedSymbol,
        normalizedContentHash
      ]
    );

  return mapFilingRow(
    result.rows[0]
  );
}

export async function findFundamentalVerifiedFilingById(
  filingId,
  queryable = pool
) {
  requireQueryable(queryable);

  const result =
    await queryable.query(
      `
        ${FILING_SELECT}
        WHERE filing_id = $1
        LIMIT 1
      `,
      [filingId]
    );

  return mapFilingRow(
    result.rows[0]
  );
}

export async function lockFundamentalVerifiedFilingById(
  filingId,
  queryable
) {
  requireQueryable(queryable);

  const result =
    await queryable.query(
      `
        ${FILING_SELECT}
        WHERE filing_id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [filingId]
    );

  return mapFilingRow(
    result.rows[0]
  );
}

export async function updateFundamentalVerifiedFilingStatus(
  {
    filingId,
    status,
    filingPayload
  },
  queryable
) {
  requireQueryable(queryable);

  const result =
    await queryable.query(
      `
        UPDATE
          public.fundamental_verified_filings
        SET
          status = $2,
          filing_payload = $3::jsonb,
          updated_at = NOW()
        WHERE
          filing_id = $1
        RETURNING
          id,
          filing_id AS "filingId",
          symbol,
          company_name AS "companyName",
          filing_type AS "filingType",
          fiscal_year AS "fiscalYear",
          period_start AS "periodStart",
          period_end AS "periodEnd",
          publication_date AS "publicationDate",
          status,
          revision_number AS "revisionNumber",
          supersedes_filing_id AS "supersedesFilingId",
          superseded_by_filing_id AS "supersededByFilingId",
          duplicate_status AS "duplicateStatus",
          duplicate_of_filing_id AS "duplicateOfFilingId",
          content_hash AS "contentHash",
          filing_payload AS "filingPayload",
          created_by_user_id AS "createdByUserId",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        filingId,
        status,
        JSON.stringify(filingPayload)
      ]
    );

  return mapFilingRow(
    result.rows[0]
  );
}

export async function findFundamentalRecordBySymbol(
  symbol,
  queryable = pool
) {
  requireQueryable(queryable);

  const result =
    await queryable.query(
      `
        SELECT
          id,
          symbol,
          company_name AS "companyName",
          approved_filing_id AS "approvedFilingId",
          revision_number AS "revisionNumber",
          fundamental_payload AS "fundamentalPayload",
          promoted_by_user_id AS "promotedByUserId",
          promoted_at AS "promotedAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM
          public.fundamental_records
        WHERE
          symbol = $1
        LIMIT 1
      `,
      [symbol]
    );

  return mapFundamentalRecordRow(
    result.rows[0]
  );
}

export async function upsertFundamentalRecordFromApprovedFiling(
  {
    symbol,
    companyName = null,
    approvedFilingId,
    revisionNumber,
    fundamentalPayload,
    promotedByUserId
  },
  queryable
) {
  requireQueryable(queryable);

  const result =
    await queryable.query(
      `
        INSERT INTO
          public.fundamental_records (
            symbol,
            company_name,
            approved_filing_id,
            revision_number,
            fundamental_payload,
            promoted_by_user_id
          )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5::jsonb,
          $6
        )
        ON CONFLICT (symbol)
        DO UPDATE SET
          company_name =
            EXCLUDED.company_name,
          approved_filing_id =
            EXCLUDED.approved_filing_id,
          revision_number =
            EXCLUDED.revision_number,
          fundamental_payload =
            EXCLUDED.fundamental_payload,
          promoted_by_user_id =
            EXCLUDED.promoted_by_user_id,
          promoted_at =
            NOW(),
          updated_at =
            NOW()
        RETURNING
          id,
          symbol,
          company_name AS "companyName",
          approved_filing_id AS "approvedFilingId",
          revision_number AS "revisionNumber",
          fundamental_payload AS "fundamentalPayload",
          promoted_by_user_id AS "promotedByUserId",
          promoted_at AS "promotedAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `,
      [
        symbol,
        companyName,
        approvedFilingId,
        revisionNumber,
        JSON.stringify(
          fundamentalPayload
        ),
        promotedByUserId
      ]
    );

  return mapFundamentalRecordRow(
    result.rows[0]
  );
}
