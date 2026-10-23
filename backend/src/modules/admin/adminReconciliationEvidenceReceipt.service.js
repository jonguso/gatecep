import crypto from "node:crypto";

import {
  createAdminReconciliationEvidenceReceipt,
  findAdminReconciliationEvidenceReceiptForUpdate,
  consumeAdminReconciliationEvidenceReceipt
} from "./adminReconciliationEvidenceReceipt.repository.js";

const RECEIPT_TTL_MS =
  15 * 60 * 1000;

function receiptError(
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
    throw receiptError(
      400,
      "RECONCILIATION_RECEIPT_INPUT_INVALID",
      `${fieldName} is required.`
    );
  }

  return normalized;
}

function requireSupportedReportType(
  value
) {
  const reportType =
    requireText(
      value,
      "reportType"
    ).toLowerCase();

  if (
    reportType !== "valuation" &&
    reportType !== "cash"
  ) {
    throw receiptError(
      400,
      "RECONCILIATION_RECEIPT_REPORT_TYPE_INVALID",
      "Receipt evidence must be valuation or cash."
    );
  }

  return reportType;
}

function assertVerifiedIdentity(
  identityVerification
) {
  if (
    identityVerification?.identityVerified !== true
  ) {
    throw receiptError(
      409,
      "RECONCILIATION_RECEIPT_IDENTITY_UNVERIFIED",
      "Only identity-verified broker evidence can create a receipt."
    );
  }
}

function assertExtraction(
  extraction,
  reportType
) {
  if (
    !extraction ||
    typeof extraction !== "object" ||
    Array.isArray(extraction)
  ) {
    throw receiptError(
      422,
      "RECONCILIATION_RECEIPT_EXTRACTION_INVALID",
      "A server-derived extraction payload is required."
    );
  }

  const extractedReportType =
    String(
      extraction.reportType || ""
    )
      .trim()
      .toLowerCase();

  if (
    extractedReportType !==
    reportType
  ) {
    throw receiptError(
      409,
      "RECONCILIATION_RECEIPT_REPORT_TYPE_MISMATCH",
      "Receipt report type does not match the server extraction."
    );
  }

  if (
    !Array.isArray(extraction.rows) ||
    extraction.rows.length === 0
  ) {
    throw receiptError(
      422,
      "RECONCILIATION_RECEIPT_ROWS_REQUIRED",
      "Receipt evidence must contain structured rows."
    );
  }
}

export function sha256EvidenceBuffer(
  fileBuffer
) {
  if (
    !Buffer.isBuffer(fileBuffer) ||
    fileBuffer.length === 0
  ) {
    throw receiptError(
      400,
      "RECONCILIATION_RECEIPT_FILE_REQUIRED",
      "The uploaded evidence buffer is required."
    );
  }

  return crypto
    .createHash("sha256")
    .update(fileBuffer)
    .digest("hex");
}

export async function createVerifiedAdminReconciliationEvidenceReceipt(
  {
    actorUserId,
    targetUserId,
    brokerLinkId,
    brokerAccountKey,
    reportType,
    fileBuffer,
    extraction,
    identityVerification,
    now = new Date()
  } = {},
  queryable
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

  if (actor === target) {
    throw receiptError(
      409,
      "RECONCILIATION_RECEIPT_ACTOR_TARGET_CONFLICT",
      "Admin actor and reconciliation target must be distinct."
    );
  }

  const brokerLink =
    requireText(
      brokerLinkId,
      "brokerLinkId"
    );

  const accountKey =
    requireText(
      brokerAccountKey,
      "brokerAccountKey"
    );

  const normalizedReportType =
    requireSupportedReportType(
      reportType
    );

  assertVerifiedIdentity(
    identityVerification
  );

  assertExtraction(
    extraction,
    normalizedReportType
  );

  const nowDate =
    now instanceof Date
      ? now
      : new Date(now);

  if (
    !Number.isFinite(
      nowDate.getTime()
    )
  ) {
    throw receiptError(
      400,
      "RECONCILIATION_RECEIPT_TIME_INVALID",
      "Receipt creation time is invalid."
    );
  }

  const expiresAt =
    new Date(
      nowDate.getTime() +
      RECEIPT_TTL_MS
    );

  const fileSha256 =
    sha256EvidenceBuffer(
      fileBuffer
    );

  return createAdminReconciliationEvidenceReceipt(
    {
      actorUserId: actor,
      targetUserId: target,
      brokerLinkId:
        brokerLink,
      brokerAccountKey:
        accountKey,
      reportType:
        normalizedReportType,
      fileSha256,
      extractionPayload:
        extraction,
      identityVerification,
      expiresAt
    },
    queryable
  );
}

export async function lockAdminReconciliationEvidenceReceipt(
  {
    receiptId,
    actorUserId,
    targetUserId,
    brokerLinkId,
    brokerAccountKey,
    expectedReportType,
    now = new Date()
  } = {},
  queryable
) {
  const id =
    requireText(
      receiptId,
      "receiptId"
    );

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

  const accountKey =
    requireText(
      brokerAccountKey,
      "brokerAccountKey"
    );

  const reportType =
    requireSupportedReportType(
      expectedReportType
    );

  const nowDate =
    now instanceof Date
      ? now
      : new Date(now);

  if (
    !Number.isFinite(
      nowDate.getTime()
    )
  ) {
    throw receiptError(
      400,
      "RECONCILIATION_RECEIPT_TIME_INVALID",
      "Receipt validation time is invalid."
    );
  }

  const receipt =
    await findAdminReconciliationEvidenceReceiptForUpdate(
      {
        receiptId: id
      },
      queryable
    );

  if (!receipt) {
    throw receiptError(
      404,
      "RECONCILIATION_RECEIPT_NOT_FOUND",
      "Reconciliation evidence receipt was not found."
    );
  }

  if (
    receipt.actorUserId !== actor ||
    receipt.targetUserId !== target ||
    receipt.brokerLinkId !== brokerLink ||
    receipt.brokerAccountKey !== accountKey ||
    receipt.reportType !== reportType
  ) {
    throw receiptError(
      409,
      "RECONCILIATION_RECEIPT_CONTEXT_MISMATCH",
      "Reconciliation evidence receipt does not match the current Admin target and broker context."
    );
  }

  if (receipt.consumedAt) {
    throw receiptError(
      409,
      "RECONCILIATION_RECEIPT_ALREADY_CONSUMED",
      "Reconciliation evidence receipt has already been consumed."
    );
  }

  const expiresAt =
    new Date(
      receipt.expiresAt
    );

  if (
    !Number.isFinite(
      expiresAt.getTime()
    ) ||
    expiresAt.getTime() <=
      nowDate.getTime()
  ) {
    throw receiptError(
      409,
      "RECONCILIATION_RECEIPT_EXPIRED",
      "Reconciliation evidence receipt has expired."
    );
  }

  assertVerifiedIdentity(
    receipt.identityVerification
  );

  assertExtraction(
    receipt.extractionPayload,
    reportType
  );

  return receipt;
}

export async function consumeLockedAdminReconciliationEvidenceReceipt(
  {
    receiptId
  } = {},
  queryable
) {
  const id =
    requireText(
      receiptId,
      "receiptId"
    );

  if (
    !queryable ||
    typeof queryable.query !== "function"
  ) {
    throw new Error(
      "A transaction-bound queryable database client is required."
    );
  }

  const consumed =
    await consumeAdminReconciliationEvidenceReceipt(
      {
        receiptId: id
      },
      queryable
    );

  if (!consumed) {
    throw receiptError(
      409,
      "RECONCILIATION_RECEIPT_CONSUME_CONFLICT",
      "Reconciliation evidence receipt could not be consumed."
    );
  }

  return consumed;
}

