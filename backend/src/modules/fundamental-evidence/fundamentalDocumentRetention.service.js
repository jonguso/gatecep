import {
  evaluateFundamentalDocumentRetention
} from "./fundamentalDocumentRetention.policy.js";

import {
  retainValidatedFundamentalDocument
} from "./fundamentalDocumentRetention.writer.js";

function requireExpectedIdentity({
  expectedSymbol,
  expectedFiscalYear,
  expectedFilingType
}) {
  if (
    !expectedSymbol ||
    !expectedFiscalYear ||
    !expectedFilingType
  ) {
    throw new Error(
      "Expected filing identity is required."
    );
  }
}

function requireValidatedRetrieval({
  retrieval,
  documentBuffer
}) {
  if (!retrieval) {
    throw new Error(
      "Validated retrieval evidence is required."
    );
  }

  /*
   * Retention integration is intentionally narrower
   * than generic retrieval.
   *
   * A document may reach this service only after the
   * upstream retrieval/identity path has produced the
   * evidence required by the retention policy.
   *
   * The retention policy remains the canonical authority
   * for deciding whether persistence is permitted.
   */
  if (
    !Buffer.isBuffer(documentBuffer) ||
    documentBuffer.length === 0
  ) {
    throw new Error(
      "A non-empty validated document buffer is required."
    );
  }
}

export async function retainValidatedFundamentalFiling({
  expectedSymbol,
  expectedFiscalYear,
  expectedFilingType,
  source,
  identity,
  retrieval,
  documentBuffer,
  storageRoot
} = {}) {
  requireExpectedIdentity({
    expectedSymbol,
    expectedFiscalYear,
    expectedFilingType
  });

  requireValidatedRetrieval({
    retrieval,
    documentBuffer
  });

  /*
   * Do not reconstruct storage identity here.
   * Do not bypass the retention policy.
   *
   * F14C decides whether this exact retrieval +
   * identity combination is eligible.
   */
  const retention =
    evaluateFundamentalDocumentRetention({
      expectedSymbol,
      expectedFiscalYear,
      expectedFilingType,
      source,
      identity,
      retrieval
    });

  if (retention?.eligible !== true) {
    return {
      retained: false,
      created: false,
      idempotent: false,
      reason:
        retention?.reason ||
        "DOCUMENT_NOT_RETENTION_ELIGIBLE",
      retention
    };
  }

  /*
   * F14E performs the only filesystem mutation.
   * It independently re-checks eligibility and
   * canonical storage containment.
   */
  const writeResult =
    await retainValidatedFundamentalDocument({
      retention,
      documentBuffer,
      storageRoot
    });

  return {
    ...writeResult,
    reason:
      "VALIDATED_DOCUMENT_RETAINED",
    retention
  };
}

export default {
  retainValidatedFundamentalFiling
};
