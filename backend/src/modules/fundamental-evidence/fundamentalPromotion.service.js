import {
  pool
} from "../../database/db.js";

import {
  lockFundamentalVerifiedFilingById,
  findFundamentalRecordBySymbol,
  upsertFundamentalRecordFromApprovedFiling
} from "./fundamentalPersistence.repository.js";

import {
  appendAdminAuditEvent
} from "../admin-audit/adminAudit.repository.js";

function promotionError(
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
    throw promotionError(
      400,
      "FUNDAMENTAL_PROMOTION_INPUT_INVALID",
      `${fieldName} is required.`
    );
  }

  return normalized;
}

function requireConfirmation(
  value
) {
  if (value !== true) {
    throw promotionError(
      400,
      "FUNDAMENTAL_PROMOTION_CONFIRMATION_REQUIRED",
      "Explicit confirmation is required before authoritative fundamental promotion."
    );
  }
}

function requireApprovedFiling(
  filing
) {
  if (!filing) {
    throw promotionError(
      404,
      "FUNDAMENTAL_FILING_NOT_FOUND",
      "The selected verified filing was not found."
    );
  }

  const status =
    String(
      filing.status || ""
    )
      .trim()
      .toUpperCase();

  if (status !== "APPROVED") {
    throw promotionError(
      409,
      "FUNDAMENTAL_FILING_NOT_APPROVED",
      "Only an approved verified filing can be promoted."
    );
  }

  return filing;
}

function requireCanonicalFilingIdentity(
  filing
) {
  const symbol =
    String(
      filing?.symbol || ""
    )
      .trim()
      .toUpperCase();

  const revisionNumber =
    Number(
      filing?.revisionNumber
    );

  if (
    !symbol ||
    !Number.isInteger(
      revisionNumber
    ) ||
    revisionNumber <= 0
  ) {
    throw promotionError(
      409,
      "FUNDAMENTAL_FILING_IDENTITY_INVALID",
      "The approved filing does not contain a valid canonical symbol and revision."
    );
  }

  if (
    !filing.filingPayload ||
    typeof filing.filingPayload !== "object" ||
    Array.isArray(
      filing.filingPayload
    )
  ) {
    throw promotionError(
      409,
      "FUNDAMENTAL_FILING_PAYLOAD_INVALID",
      "The approved filing does not contain a valid authoritative payload."
    );
  }

  return {
    symbol,
    revisionNumber
  };
}

function assertRevisionCanPromote(
  existing,
  filing
) {
  if (!existing) {
    return;
  }

  const existingRevision =
    Number(
      existing.revisionNumber
    );

  const filingRevision =
    Number(
      filing.revisionNumber
    );

  if (
    Number.isInteger(
      existingRevision
    ) &&
    existingRevision >
      filingRevision
  ) {
    throw promotionError(
      409,
      "FUNDAMENTAL_PROMOTION_REVISION_REGRESSION",
      "An older filing revision cannot replace a newer canonical fundamental record."
    );
  }

  if (
    existingRevision ===
      filingRevision &&
    String(
      existing.approvedFilingId || ""
    ) !==
      String(
        filing.filingId || ""
      )
  ) {
    throw promotionError(
      409,
      "FUNDAMENTAL_PROMOTION_REVISION_CONFLICT",
      "A different filing already owns this canonical revision."
    );
  }
}

export async function promoteApprovedFundamentalFiling(
  {
    actorUserId,
    filingId,
    reason,
    confirmed
  } = {}
) {
  const actor =
    requireText(
      actorUserId,
      "actorUserId"
    );

  const requestedFilingId =
    requireText(
      filingId,
      "filingId"
    );

  const normalizedReason =
    requireText(
      reason,
      "reason"
    );

  requireConfirmation(
    confirmed
  );

  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    /*
     * The persisted filing is the authoritative source.
     * Browser-supplied symbol, revision, company fundamentals,
     * approval state, or canonical payload are intentionally
     * absent from this service contract.
     */
    const filing =
      requireApprovedFiling(
        await lockFundamentalVerifiedFilingById(
          requestedFilingId,
          client
        )
      );

    const {
      symbol,
      revisionNumber
    } =
      requireCanonicalFilingIdentity(
        filing
      );

    /*
     * Lock the canonical symbol identity before inspecting
     * or changing its promoted record. PostgreSQL advisory
     * transaction locks also serialize the first promotion,
     * when no fundamental_records row exists yet.
     */
    await client.query(
      `
        SELECT
          pg_advisory_xact_lock(
            hashtext($1)
          )
      `,
      [
        `fundamental:${symbol}`
      ]
    );

    const existing =
      await findFundamentalRecordBySymbol(
        symbol,
        client
      );

    assertRevisionCanPromote(
      existing,
      filing
    );

    /*
     * Re-promoting the exact same approved filing is
     * idempotent. Do not rewrite timestamps or append a
     * duplicate audit event.
     */
    if (
      existing &&
      String(
        existing.approvedFilingId || ""
      ) === filing.filingId &&
      Number(
        existing.revisionNumber
      ) === revisionNumber
    ) {
      await client.query(
        "COMMIT"
      );

      return {
        filingId:
          filing.filingId,
        symbol,
        revisionNumber,
        record:
          existing,
        auditEventId:
          null,
        idempotent:
          true
      };
    }

    const companyPayload =
      filing.filingPayload?.company;

    if (
      !companyPayload ||
      typeof companyPayload !== "object" ||
      Array.isArray(companyPayload)
    ) {
      throw promotionError(
        409,
        "FUNDAMENTAL_FILING_COMPANY_PAYLOAD_INVALID",
        "Approved filing does not contain a valid company fundamentals payload."
      );
    }

    const sourceDocument =
      filing.filingPayload?.sourceDocument;

    const existingSources =
      Array.isArray(companyPayload.sources)
        ? companyPayload.sources
        : [];

    const source =
      sourceDocument?.source || null;

    const canonicalPayload = {
      ...companyPayload,

      symbol,

      name:
        filing.companyName ||
        companyPayload.name ||
        null,

      sources: [
        ...existingSources,
        source
      ].filter(Boolean),

      metadata: {
        ...(companyPayload.metadata || {}),

        approvedFilingId:
          filing.filingId,

        approvedFilingRevision:
          revisionNumber,

        approvedAt:
          filing.filingPayload
            ?.review
            ?.approvedAt ||
          null,

        approvedBy:
          filing.filingPayload
            ?.review
            ?.approvedBy ||
          null
      }
    };

    const record =
      await upsertFundamentalRecordFromApprovedFiling(
        {
          symbol,
          companyName:
            filing.companyName,
          approvedFilingId:
            filing.filingId,
          revisionNumber,
          fundamentalPayload:
            canonicalPayload,
          promotedByUserId:
            actor
        },
        client
      );

    const audit =
      await appendAdminAuditEvent(
        {
          actorUserId:
            actor,
          action:
            "FUNDAMENTAL_FILING_PROMOTED",
          targetType:
            "FUNDAMENTAL_RECORD",
          targetId:
            symbol,
          beforeState:
            existing
              ? {
                  approvedFilingId:
                    existing.approvedFilingId,
                  revisionNumber:
                    existing.revisionNumber
                }
              : null,
          afterState: {
            approvedFilingId:
              filing.filingId,
            revisionNumber,
            symbol
          },
          reason:
            normalizedReason,
          metadata: {
            filingId:
              filing.filingId,
            filingType:
              filing.filingType,
            fiscalYear:
              filing.fiscalYear,
            periodEnd:
              filing.periodEnd
          }
        },
        client
      );

    await client.query(
      "COMMIT"
    );

    return {
      filingId:
        filing.filingId,
      symbol,
      revisionNumber,
      record,
      auditEventId:
        audit.id,
      idempotent:
        false
    };
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch {
      // Preserve the original transaction failure.
    }

    throw error;
  } finally {
    client.release();
  }
}
