import {
  authorizeFundamentalDocumentRetention
} from "./fundamentalDocumentRetentionAction.policy.js";

import {
  buildFundamentalDocumentRetentionBoundary
} from "./fundamentalDocumentRetentionBoundary.js";

import {
  retainValidatedFundamentalFiling
} from "./fundamentalDocumentRetention.service.js";

/*
 * Controlled explicit document-retention action.
 *
 * Composition only:
 *
 * 1. F14J authorizes the explicit administrative action.
 * 2. F14H constructs the validated retention boundary.
 * 3. F14F evaluates retention eligibility and performs the
 *    canonical idempotent write.
 *
 * This service does NOT:
 * - retrieve a document,
 * - verify a filing,
 * - approve a filing,
 * - promote fundamentals,
 * - publish fundamentals,
 * - mutate the fundamental database.
 *
 * storageRoot is deliberately injected by the caller.
 * No production storage configuration is selected here.
 */
export async function executeFundamentalDocumentRetention({
  actor,
  confirmed,
  reason,

  symbol,
  identity,
  extraction,
  retrieval,
  source,

  documentBuffer,
  storageRoot
} = {}) {
  const authorization =
    authorizeFundamentalDocumentRetention({
      actor,
      confirmed,
      reason
    });

  /*
   * Authorization happens before the retention boundary
   * and before any filesystem-capable service is invoked.
   */
  const boundary =
    buildFundamentalDocumentRetentionBoundary({
      symbol,
      identity,
      extraction,
      retrieval,
      source
    });

  const retention =
    await retainValidatedFundamentalFiling({
      ...boundary,
      documentBuffer,
      storageRoot
    });

  return {
    ...retention,

    action: {
      actor:
        authorization.actor,
      confirmed:
        authorization.confirmed,
      reason:
        authorization.reason
    }
  };
}

export default {
  executeFundamentalDocumentRetention
};
