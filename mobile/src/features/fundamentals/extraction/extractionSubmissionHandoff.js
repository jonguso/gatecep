import {
  submitMultiPeriodExtraction,
  submitSinglePeriodExtraction
} from "../filings/filingImportBridgeService";

/*
 * ============================================================
 * PC-025F
 * EXTRACTION SUBMISSION HANDOFF
 * ============================================================
 *
 * Small adapter used by PC-025D and PC-025E screens.
 * ============================================================
 */

export async function submitExtractionWorkspaceToFilings({
  filingReadyJson,
  workspaceType,
  actor,
  note = null,
  submitForReview = false,
  allowDuplicate = false
} = {}) {
  if (
    workspaceType ===
    "MULTI_PERIOD"
  ) {
    return submitMultiPeriodExtraction({
      filingReadyJson,
      actor,
      note,
      submitForReview,
      allowDuplicate
    });
  }

  return submitSinglePeriodExtraction({
    filingReadyJson,
    actor,
    note,
    submitForReview,
    allowDuplicate
  });
}
