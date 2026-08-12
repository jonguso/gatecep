/*
 * ============================================================
 * PC-025F PATCH FOR app/filing-extraction.js
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
 * 3. Add this handler inside FilingExtractionScreen:
 *
 * async function submitToVerifiedFilings() {
 *   try {
 *     setSubmitting(true);
 *
 *     if (!outputJson) {
 *       throw new Error(
 *         "Validate the extraction before submitting."
 *       );
 *     }
 *
 *     const result =
 *       await submitExtractionWorkspaceToFilings({
 *         filingReadyJson:
 *           JSON.parse(outputJson),
 *
 *         workspaceType:
 *           "SINGLE_PERIOD",
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
 * 4. Under the Filing-Ready JSON section add:
 *
 * <Pressable
 *   disabled={submitting || !outputJson}
 *   style={styles.primaryButton}
 *   onPress={submitToVerifiedFilings}
 * >
 *   <Text style={styles.primaryButtonText}>
 *     {submitForReview
 *       ? "Send Directly For Review"
 *       : "Create Draft In Verified Filings"}
 *   </Text>
 * </Pressable>
 *
 * <Pressable
 *   style={styles.secondaryButtonInline}
 *   onPress={() =>
 *     setSubmitForReview(
 *       (current) => !current
 *     )
 *   }
 * >
 *   <Text style={styles.secondaryButtonText}>
 *     Submit For Review: {submitForReview ? "Yes" : "No"}
 *   </Text>
 * </Pressable>
 *
 * 5. Display submissionResult.receipt.filingId and status
 *    when a submission result is available.
 */

export const PC_025F_SINGLE_PERIOD_PATCH = true;
