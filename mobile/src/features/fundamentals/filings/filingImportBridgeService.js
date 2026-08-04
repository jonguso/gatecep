import {
  VERIFIED_FILING_STATUSES,
  createVerifiedFiling,
  detectVerifiedFilingDuplicate,
  loadVerifiedFiling
} from "./verifiedFilingDatasetManager";

import {
  saveFilingSubmissionHistoryEntry
} from "./filingSubmissionHistoryService";

/*
 * ============================================================
 * PC-025F
 * FILING IMPORT BRIDGE AND DIRECT SUBMISSION SERVICE
 * ============================================================
 *
 * Bridges filing-ready JSON from PC-025D / PC-025E directly
 * into the PC-025B verified-filing repository.
 *
 * Supports:
 *
 * - single-period extraction submission,
 * - multi-period extraction submission,
 * - payload validation,
 * - duplicate preview,
 * - draft creation,
 * - optional immediate review submission,
 * - submission receipts,
 * - source-workspace metadata,
 * - protection against double submission.
 *
 * Safeguards:
 *
 * - never auto-verifies or auto-approves,
 * - never promotes directly into the main repository,
 * - rejects malformed payloads,
 * - preserves extraction warnings and source references,
 * - detects exact and possible duplicates before creation.
 * ============================================================
 */

export const FILING_BRIDGE_STATUSES = {
  READY: "READY",
  SUBMITTED: "SUBMITTED",
  DUPLICATE_REVIEW_REQUIRED:
    "DUPLICATE_REVIEW_REQUIRED",
  INVALID: "INVALID",
  FAILED: "FAILED"
};

export const FILING_BRIDGE_SUBMISSION_MODES = {
  CREATE_DRAFT: "CREATE_DRAFT",
  CREATE_AND_SUBMIT_FOR_REVIEW:
    "CREATE_AND_SUBMIT_FOR_REVIEW"
};

export const FILING_BRIDGE_SOURCE_WORKSPACES = {
  SINGLE_PERIOD:
    "PC-025D",
  MULTI_PERIOD:
    "PC-025E",
  EXTERNAL:
    "EXTERNAL"
};

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeCode(value) {
  return String(value || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
}

function normalizeText(value) {
  return String(value || "")
    .trim();
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function nowIso() {
  return new Date().toISOString();
}

function createReceiptId() {
  return `BRIDGE-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;
}

function normalizeActor(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return {
      id:
        value,

      name:
        value
    };
  }

  return {
    id:
      value?.id ||
      value?.email ||
      value?.name ||
      null,

    name:
      value?.name ||
      value?.email ||
      value?.id ||
      "Unknown User",

    email:
      value?.email ||
      null
  };
}

function hasFinancialEvidence(
  company
) {
  return safeArray(
    company?.periods
  ).some(
    (period) =>
      [
        period?.revenue,
        period?.netIncome,
        period?.totalAssets,
        period?.totalLiabilities,
        period?.totalEquity,
        period?.earningsPerShare,
        period?.bookValuePerShare,
        period?.freeCashFlow,
        period?.dividendPerShare
      ].some(
        (value) =>
          value !== null &&
          value !== undefined
      )
  );
}

export function validateFilingBridgePayload(
  payload = {}
) {
  const errors = [];
  const warnings = [];

  const symbol =
    normalizeSymbol(
      payload?.symbol ||
      payload?.company?.symbol
    );

  const companyName =
    normalizeText(
      payload?.companyName ||
      payload?.company?.name
    );

  const periods =
    safeArray(
      payload?.company?.periods
    );

  if (!symbol) {
    errors.push({
      code:
        "MISSING_SYMBOL",

      message:
        "A filing symbol is required."
    });
  }

  if (!companyName) {
    warnings.push({
      code:
        "MISSING_COMPANY_NAME",

      message:
        "Company name is not available."
    });
  }

  if (!payload?.filingType) {
    errors.push({
      code:
        "MISSING_FILING_TYPE",

      message:
        "A filing type is required."
    });
  }

  if (!periods.length) {
    errors.push({
      code:
        "MISSING_PERIODS",

      message:
        "At least one normalized financial period is required."
    });
  }

  if (
    periods.length &&
    !hasFinancialEvidence(
      payload?.company
    )
  ) {
    warnings.push({
      code:
        "NO_FINANCIAL_EVIDENCE",

      message:
        "The payload contains periods but no recognized financial value."
    });
  }

  if (
    payload
      ?.metadata
      ?.extractionErrors &&
    safeArray(
      payload
        .metadata
        .extractionErrors
    ).length
  ) {
    warnings.push({
      code:
        "EXTRACTION_ERRORS_PRESENT",

      message:
        "The extraction payload contains unresolved extraction errors."
    });
  }

  if (
    payload
      ?.metadata
      ?.multiPeriodErrors &&
    safeArray(
      payload
        .metadata
        .multiPeriodErrors
    ).length
  ) {
    warnings.push({
      code:
        "MULTI_PERIOD_ERRORS_PRESENT",

      message:
        "The multi-period payload contains unresolved comparison errors."
    });
  }

  return {
    valid:
      errors.length === 0,

    symbol,
    companyName,
    periodCount:
      periods.length,

    errors,
    warnings
  };
}

export async function previewFilingBridgeSubmission({
  payload,
  sourceWorkspace =
    FILING_BRIDGE_SOURCE_WORKSPACES
      .EXTERNAL
} = {}) {
  const validation =
    validateFilingBridgePayload(
      payload
    );

  if (!validation.valid) {
    return {
      generatedAt:
        nowIso(),

      status:
        FILING_BRIDGE_STATUSES
          .INVALID,

      sourceWorkspace:
        normalizeCode(
          sourceWorkspace
        ),

      validation,

      duplicate:
        null,

      filingPreview:
        null
    };
  }

  const filingPreview = {
    ...payload,

    symbol:
      validation.symbol,

    companyName:
      validation.companyName,

    status:
      VERIFIED_FILING_STATUSES
        .DRAFT,

    metadata: {
      ...(payload?.metadata || {}),

      bridge: {
        sourceWorkspace:
          normalizeCode(
            sourceWorkspace
          ),

        previewedAt:
          nowIso()
      }
    }
  };

  const duplicate =
    await detectVerifiedFilingDuplicate({
      filing:
        filingPreview
    });

  return {
    generatedAt:
      nowIso(),

    status:
      duplicate?.status ===
        "UNIQUE"
        ? FILING_BRIDGE_STATUSES
            .READY
        : FILING_BRIDGE_STATUSES
            .DUPLICATE_REVIEW_REQUIRED,

    sourceWorkspace:
      normalizeCode(
        sourceWorkspace
      ),

    validation,

    duplicate,

    filingPreview
  };
}

async function submitFilingReadyPayloadInternal({
  payload,
  sourceWorkspace =
    FILING_BRIDGE_SOURCE_WORKSPACES
      .EXTERNAL,
  submissionMode =
    FILING_BRIDGE_SUBMISSION_MODES
      .CREATE_DRAFT,
  actor = null,
  note = null,
  allowDuplicate = false
} = {}) {
  const preview =
    await previewFilingBridgeSubmission({
      payload,

      sourceWorkspace
    });

  if (
    preview.status ===
    FILING_BRIDGE_STATUSES
      .INVALID
  ) {
    return {
      ...preview,

      submitted:
        false,

      receipt:
        null
    };
  }

  if (
    preview.status ===
      FILING_BRIDGE_STATUSES
        .DUPLICATE_REVIEW_REQUIRED &&
    !allowDuplicate
  ) {
    return {
      ...preview,

      submitted:
        false,

      receipt:
        null
    };
  }

  const receiptId =
    createReceiptId();

  const reviewer =
    normalizeActor(actor);

  const created =
    await createVerifiedFiling({
      filing: {
        ...preview.filingPreview,

        status:
          VERIFIED_FILING_STATUSES
            .DRAFT,

        metadata: {
          ...(preview
            .filingPreview
            ?.metadata ||
          {}),

          bridge: {
            ...(preview
              .filingPreview
              ?.metadata
              ?.bridge ||
            {}),

            receiptId,

            submittedAt:
              nowIso(),

            submissionMode:
              normalizeCode(
                submissionMode
              ),

            submittedBy:
              reviewer,

            duplicateOverride:
              Boolean(
                allowDuplicate
              )
          }
        }
      },

      actor:
        reviewer
    });

  let finalFiling =
    created;

  if (
    normalizeCode(
      submissionMode
    ) ===
    FILING_BRIDGE_SUBMISSION_MODES
      .CREATE_AND_SUBMIT_FOR_REVIEW
  ) {
    const {
      submitVerifiedFilingForReview
    } =
      await import(
        "./verifiedFilingDatasetManager"
      );

    finalFiling =
      await submitVerifiedFilingForReview({
        filingId:
          created.id,

        reviewer,

        note:
          note ||
          "Submitted directly from the filing extraction workspace."
      });
  }

  const confirmed =
    await loadVerifiedFiling(
      finalFiling.id
    );

  const receipt = {
    id:
      receiptId,

    filingId:
      confirmed?.id ||
      finalFiling.id,

    symbol:
      confirmed?.symbol ||
      preview.validation.symbol,

    status:
      confirmed?.status ||
      finalFiling.status,

    sourceWorkspace:
      normalizeCode(
        sourceWorkspace
      ),

    submissionMode:
      normalizeCode(
        submissionMode
      ),

    duplicateStatus:
      confirmed
        ?.duplicateStatus ||
      preview
        ?.duplicate
        ?.status ||
      null,

    submittedAt:
      nowIso(),

    submittedBy:
      reviewer
  };

  return {
    generatedAt:
      nowIso(),

    status:
      FILING_BRIDGE_STATUSES
        .SUBMITTED,

    submitted:
      true,

    validation:
      preview.validation,

    duplicate:
      preview.duplicate,

    filing:
      confirmed ||
      finalFiling,

    receipt
  };
}

export async function submitFilingReadyPayload({
  payload,
  sourceWorkspace =
    FILING_BRIDGE_SOURCE_WORKSPACES
      .EXTERNAL,
  submissionMode =
    FILING_BRIDGE_SUBMISSION_MODES
      .CREATE_DRAFT,
  actor = null,
  note = null,
  allowDuplicate = false,
  historyParentId = null
} = {}) {
  const request = {
    payload,
    sourceWorkspace,
    submissionMode,
    actor,
    note,
    allowDuplicate
  };

  try {
    const result =
      await submitFilingReadyPayloadInternal(
        request
      );

    const historyEntry =
      await saveFilingSubmissionHistoryEntry({
        request,

        result,

        parentHistoryId:
          historyParentId
      });

    return {
      ...result,

      historyId:
        historyEntry.id
    };
  } catch (error) {
    const historyEntry =
      await saveFilingSubmissionHistoryEntry({
        request,

        result: {
          status:
            FILING_BRIDGE_STATUSES
              .FAILED,

          submitted:
            false,

          error:
            error?.message ||
            "Submission failed."
        },

        error,

        parentHistoryId:
          historyParentId
      });

    return {
      generatedAt:
        nowIso(),

      status:
        FILING_BRIDGE_STATUSES
          .FAILED,

      submitted:
        false,

      error:
        error?.message ||
        "Submission failed.",

      historyId:
        historyEntry.id,

      receipt:
        null
    };
  }
}

export async function submitSinglePeriodExtraction({
  filingReadyJson,
  actor = null,
  note = null,
  submitForReview = false,
  allowDuplicate = false
} = {}) {
  return submitFilingReadyPayload({
    payload:
      filingReadyJson,

    sourceWorkspace:
      FILING_BRIDGE_SOURCE_WORKSPACES
        .SINGLE_PERIOD,

    submissionMode:
      submitForReview
        ? FILING_BRIDGE_SUBMISSION_MODES
            .CREATE_AND_SUBMIT_FOR_REVIEW
        : FILING_BRIDGE_SUBMISSION_MODES
            .CREATE_DRAFT,

    actor,
    note,
    allowDuplicate
  });
}

export async function submitMultiPeriodExtraction({
  filingReadyJson,
  actor = null,
  note = null,
  submitForReview = false,
  allowDuplicate = false
} = {}) {
  return submitFilingReadyPayload({
    payload:
      filingReadyJson,

    sourceWorkspace:
      FILING_BRIDGE_SOURCE_WORKSPACES
        .MULTI_PERIOD,

    submissionMode:
      submitForReview
        ? FILING_BRIDGE_SUBMISSION_MODES
            .CREATE_AND_SUBMIT_FOR_REVIEW
        : FILING_BRIDGE_SUBMISSION_MODES
            .CREATE_DRAFT,

    actor,
    note,
    allowDuplicate
  });
}
