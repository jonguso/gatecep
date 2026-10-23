import {
  pool
} from "../../database/db.js";

import {
  lockAdminReconciliationBrokerContext
} from "./adminReconciliationTarget.service.js";

import {
  lockAdminReconciliationEvidenceReceipt,
  consumeLockedAdminReconciliationEvidenceReceipt
} from "./adminReconciliationEvidenceReceipt.service.js";

import {
  deriveAdminValuationHoldings,
  deriveAdminCashBalance
} from "./adminReconciliationEvidenceDerivation.service.js";

import {
  replaceUserPortfolioSnapshotWithQueryable
} from "../portfolio/portfolio.repository.js";

import {
  appendAdminAuditEvent
} from "../admin-audit/adminAudit.repository.js";

function commitError(
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
    throw commitError(
      400,
      "RECONCILIATION_COMMIT_INPUT_INVALID",
      `${fieldName} is required.`
    );
  }

  return normalized;
}

function requireConfirmation(
  value
) {
  if (value !== true) {
    throw commitError(
      400,
      "RECONCILIATION_COMMIT_CONFIRMATION_REQUIRED",
      "Explicit confirmation is required before authoritative reconciliation."
    );
  }
}

export async function commitAdminBrokerReconciliation(
  {
    actorUserId,
    targetUserId,
    brokerLinkId,
    valuationReceiptId,
    cashReceiptId,
    reason,
    confirmed
  } = {},
  {
    consumeReceipt =
      consumeLockedAdminReconciliationEvidenceReceipt
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

  const valuationId =
    requireText(
      valuationReceiptId,
      "valuationReceiptId"
    );

  const cashId =
    requireText(
      cashReceiptId,
      "cashReceiptId"
    );

  const normalizedReason =
    requireText(
      reason,
      "reason"
    );

  requireConfirmation(
    confirmed
  );

  if (actor === target) {
    throw commitError(
      409,
      "RECONCILIATION_COMMIT_ACTOR_TARGET_CONFLICT",
      "Admin actor and reconciliation target must be distinct."
    );
  }

  if (valuationId === cashId) {
    throw commitError(
      409,
      "RECONCILIATION_COMMIT_RECEIPTS_MUST_BE_DISTINCT",
      "Valuation and cash evidence receipts must be distinct."
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    /*
     * Lock and revalidate target eligibility and the exact
     * persisted broker relationship inside this transaction.
     *
     * Lock order:
     * target -> broker -> valuation receipt -> cash receipt.
     */
    const context =
      await lockAdminReconciliationBrokerContext(
        {
          targetUserId:
            target,
          brokerLinkId:
            brokerLink
        },
        client
      );

    /*
     * Receipt locks follow the transaction-bound target and
     * broker locks in deterministic report order.
     */
    const valuationReceipt =
      await lockAdminReconciliationEvidenceReceipt(
        {
          receiptId:
            valuationId,
          actorUserId:
            actor,
          targetUserId:
            context.target.id,
          brokerLinkId:
            brokerLink,
          brokerAccountKey:
            context.brokerAccountKey,
          expectedReportType:
            "valuation"
        },
        client
      );

    const cashReceipt =
      await lockAdminReconciliationEvidenceReceipt(
        {
          receiptId:
            cashId,
          actorUserId:
            actor,
          targetUserId:
            context.target.id,
          brokerLinkId:
            brokerLink,
          brokerAccountKey:
            context.brokerAccountKey,
          expectedReportType:
            "cash"
        },
        client
      );

    /*
     * Authoritative values are derived only from the
     * server-owned receipt payloads. The browser never
     * supplies holdings or cash to this service.
     */
    const holdings =
      deriveAdminValuationHoldings({
        extraction:
          valuationReceipt.extractionPayload,
        identityVerification:
          valuationReceipt.identityVerification
      });

    const cashBalance =
      deriveAdminCashBalance({
        extraction:
          cashReceipt.extractionPayload,
        identityVerification:
          cashReceipt.identityVerification
      });

    const replacement =
      await replaceUserPortfolioSnapshotWithQueryable(
        context.target.id,
        context.brokerAccountKey,
        holdings,
        cashBalance,
        client
      );

    const audit =
      await appendAdminAuditEvent(
        {
          actorUserId:
            actor,
          action:
            "BROKER_RECONCILIATION_COMMITTED",
          targetType:
            "USER_PORTFOLIO",
          targetId:
            context.target.id,
          beforeState:
            null,
          afterState: {
            brokerAccountKey:
              context.brokerAccountKey,
            holdingsCount:
              replacement.holdings.length,
            cashBalance:
              replacement.cashBalance
          },
          reason:
            normalizedReason,
          metadata: {
            brokerLinkId:
              brokerLink,
            valuationReceiptId:
              valuationReceipt.id,
            cashReceiptId:
              cashReceipt.id,
            reportTypes: [
              valuationReceipt.reportType,
              cashReceipt.reportType
            ]
          }
        },
        client
      );

    const consumedValuation =
      await consumeReceipt(
        {
          receiptId:
            valuationReceipt.id
        },
        client
      );

    const consumedCash =
      await consumeReceipt(
        {
          receiptId:
            cashReceipt.id
        },
        client
      );

    await client.query(
      "COMMIT"
    );

    return {
      target:
        context.target,
      broker:
        context.broker,
      brokerAccountKey:
        context.brokerAccountKey,
      holdingsCount:
        replacement.holdings.length,
      cashBalance:
        replacement.cashBalance,
      auditEventId:
        audit.id,
      consumedReceiptIds: [
        consumedValuation.id,
        consumedCash.id
      ]
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
