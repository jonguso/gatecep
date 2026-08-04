import {
  VERIFIED_FILING_STATUSES,
  approveVerifiedFiling,
  buildVerifiedFilingSummary,
  loadPendingVerifiedFilings,
  rejectVerifiedFiling,
  verifyVerifiedFiling
} from "./verifiedFilingDatasetManager";

/*
 * ============================================================
 * PC-025B
 * VERIFIED FILING REVIEW SERVICE
 * ============================================================
 *
 * Adds reviewer-oriented queue and batch actions.
 * ============================================================
 */

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

export async function buildVerifiedFilingReviewQueue() {
  const filings =
    await loadPendingVerifiedFilings();

  return {
    generatedAt:
      new Date()
        .toISOString(),

    total:
      filings.length,

    pendingVerification:
      filings.filter(
        (filing) =>
          filing.status ===
          VERIFIED_FILING_STATUSES
            .PENDING_REVIEW
      ),

    pendingApproval:
      filings.filter(
        (filing) =>
          filing.status ===
          VERIFIED_FILING_STATUSES
            .VERIFIED
      ),

    summary:
      await buildVerifiedFilingSummary()
  };
}

export async function batchVerifyVerifiedFilings({
  filingIds = [],
  reviewer,
  note = null
} = {}) {
  const results = [];

  for (
    const filingId of safeArray(
      filingIds
    )
  ) {
    try {
      results.push({
        filingId,

        success:
          true,

        filing:
          await verifyVerifiedFiling({
            filingId,

            reviewer,

            note
          })
      });
    } catch (error) {
      results.push({
        filingId,

        success:
          false,

        error:
          error?.message ||
          "Verification failed."
      });
    }
  }

  return {
    processed:
      results.length,

    succeeded:
      results.filter(
        (result) =>
          result.success
      ).length,

    failed:
      results.filter(
        (result) =>
          !result.success
      ).length,

    results
  };
}

export async function batchApproveVerifiedFilings({
  filingIds = [],
  reviewer,
  note = null,
  promote = true
} = {}) {
  const results = [];

  for (
    const filingId of safeArray(
      filingIds
    )
  ) {
    try {
      results.push({
        filingId,

        success:
          true,

        filing:
          await approveVerifiedFiling({
            filingId,

            reviewer,

            note,

            promote
          })
      });
    } catch (error) {
      results.push({
        filingId,

        success:
          false,

        error:
          error?.message ||
          "Approval failed."
      });
    }
  }

  return {
    processed:
      results.length,

    succeeded:
      results.filter(
        (result) =>
          result.success
      ).length,

    failed:
      results.filter(
        (result) =>
          !result.success
      ).length,

    results
  };
}

export async function batchRejectVerifiedFilings({
  filings = [],
  reviewer,
  reason,
  note = null
} = {}) {
  const results = [];

  for (
    const item of safeArray(
      filings
    )
  ) {
    const filingId =
      typeof item ===
        "string"
        ? item
        : item?.filingId;

    try {
      results.push({
        filingId,

        success:
          true,

        filing:
          await rejectVerifiedFiling({
            filingId,

            reviewer,

            reason:
              item?.reason ||
              reason,

            note:
              item?.note ||
              note
          })
      });
    } catch (error) {
      results.push({
        filingId,

        success:
          false,

        error:
          error?.message ||
          "Rejection failed."
      });
    }
  }

  return {
    processed:
      results.length,

    succeeded:
      results.filter(
        (result) =>
          result.success
      ).length,

    failed:
      results.filter(
        (result) =>
          !result.success
      ).length,

    results
  };
}
