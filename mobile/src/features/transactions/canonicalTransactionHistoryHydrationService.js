/*
 * R7O-R4E7R44E
 *
 * Authenticated canonical Transaction History -> derived local
 * verified evidence hydration.
 *
 * Server canonical history remains authoritative.
 * Local transaction evidence is a derived cache used by existing
 * FIFO, Coach G and analytics consumers.
 */

import {
  loadCanonicalBrokerTransactionHistory
} from "./api/transactionHistoryApi.js";

import {
  mapCanonicalHistoryToVerifiedEvidence
} from "./api/transactionHistoryCanonicalHydrationMapper.js";

import {
  replaceBrokerTransactionHistoryEvidenceFromCanonical
} from "../trading/brokerTransactionHistoryEvidenceStore.js";

function clean(value) {
  return String(value ?? "").trim();
}

export async function hydrateCanonicalBrokerTransactionHistory({
  brokerLinkId
} = {}) {
  const linkId =
    clean(brokerLinkId);

  if (!linkId) {
    throw new Error(
      "brokerLinkId is required to hydrate canonical Transaction History."
    );
  }

  const canonical =
    await loadCanonicalBrokerTransactionHistory({
      brokerLinkId:
        linkId
    });

  if (
    !canonical ||
    canonical.authorityEstablished !== true
  ) {
    /*
     * No established canonical authority is NOT interpreted as an
     * empty authoritative history.
     *
     * Therefore do not erase an existing local cache merely because
     * authority has not been established.
     */
    return {
      hydrated: false,
      reason:
        "AUTHORITY_NOT_ESTABLISHED",
      brokerLinkId:
        linkId,
      brokerAccountKey:
        clean(canonical?.brokerAccountKey) ||
        null,
      canonicalCount: 0,
      localVerifiedCount: null
    };
  }

  const brokerAccountKey =
    clean(
      canonical?.brokerAccountKey
    );

  if (!brokerAccountKey) {
    throw new Error(
      "Canonical Transaction History is missing brokerAccountKey."
    );
  }

  const history =
    Array.isArray(canonical?.history)
      ? canonical.history
      : [];

  const verified =
    mapCanonicalHistoryToVerifiedEvidence({
      brokerAccountKey,
      history
    });

  const replacement =
    await replaceBrokerTransactionHistoryEvidenceFromCanonical({
      brokerAccountKey,
      verified,
      source:
        "CANONICAL_SERVER_HISTORY"
    });

  return {
    hydrated: true,
    reason:
      "CANONICAL_HISTORY_REPLACED",
    brokerLinkId:
      linkId,
    brokerAccountKey,
    canonicalCount:
      history.length,
    localVerifiedCount:
      replacement.canonicalVerifiedCount,
    removedAccountBucket:
      replacement.removedAccountBucket
  };
}
