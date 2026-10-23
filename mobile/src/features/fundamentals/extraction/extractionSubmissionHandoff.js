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
  accessToken = null,
  note = null,
  submitForReview = false
} = {}) {
  if (
    workspaceType ===
    "MULTI_PERIOD"
  ) {
    return submitMultiPeriodExtraction({
      filingReadyJson,
      accessToken,
      note,
      submitForReview
    });
  }

  return submitSinglePeriodExtraction({
    filingReadyJson,
    accessToken,
    note,
    submitForReview
  });
}
