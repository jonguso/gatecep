/*
 * ============================================================
 * PC-025F PATCH FOR app/multi-period-filing-extraction.js
 * ============================================================
 *
 * 1. Add this import:
 *
 * import {
 *   submitExtractionWorkspaceToFilings
 * } from "../src/features/fundamentals/extraction/extractionSubmissionHandoff";
 *
 * 2. Add state:
 *
 * const [submitting, setSubmitting] = useState(false);
 * const [submissionResult, setSubmissionResult] = useState(null);
 * const [submitForReview, setSubmitForReview] = useState(false);
 *
 * 3. Add this handler:
 *
 * async function submitToVerifiedFilings() {
 *   try {
 *     setSubmitting(true);
 *
 *     if (!outputJson) {
 *       throw new Error(
 *         "Run the comparison before submitting."
 *       );
 *     }
 *
 *     const result =
 *       await submitExtractionWorkspaceToFilings({
 *         filingReadyJson:
 *           JSON.parse(outputJson),
 *
 *         workspaceType:
 *           "MULTI_PERIOD",
 *
 *         actor: {
 *           id:
 *             "gatecep-extraction-user",
 *
 *           name:
 *             "Gatecep Extraction User"
 *         },
 *
 *         submitForReview
 *       });
 *
 *     setSubmissionResult(result);
 *   } catch (error) {
 *     setSubmissionResult({
 *       submitted:
 *         false,
 *
 *       status:
 *         "FAILED",
 *
 *       error:
 *         error?.message ||
 *         "Submission failed."
 *     });
 *   } finally {
 *     setSubmitting(false);
 *   }
 * }
 *
 * 4. Under Combined Filing-Ready JSON add a direct-submit
 *    button and a Submit For Review toggle exactly as shown
 *    in the single-period patch.
 */

export const PC_025F_MULTI_PERIOD_PATCH = true;
