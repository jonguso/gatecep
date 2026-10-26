import {
  getUserBrokers
} from "../brokers/api/userBrokerApi.js";

import {
  hydrateCanonicalBrokerTransactionHistory
} from "./canonicalTransactionHistoryHydrationService.js";


let userBrokersLoader =
  getUserBrokers;

let brokerHistoryHydrator =
  hydrateCanonicalBrokerTransactionHistory;

export function __setCanonicalInvestorTransactionHistoryHydrationDependenciesForTests({
  getUserBrokers: nextUserBrokersLoader,
  hydrateCanonicalBrokerTransactionHistory: nextBrokerHistoryHydrator
} = {}) {
  if (
    nextUserBrokersLoader !== undefined &&
    typeof nextUserBrokersLoader !== "function"
  ) {
    throw new Error(
      "getUserBrokers test dependency must be a function."
    );
  }

  if (
    nextBrokerHistoryHydrator !== undefined &&
    typeof nextBrokerHistoryHydrator !== "function"
  ) {
    throw new Error(
      "hydrateCanonicalBrokerTransactionHistory test dependency must be a function."
    );
  }

  if (nextUserBrokersLoader) {
    userBrokersLoader =
      nextUserBrokersLoader;
  }

  if (nextBrokerHistoryHydrator) {
    brokerHistoryHydrator =
      nextBrokerHistoryHydrator;
  }
}

export function __resetCanonicalInvestorTransactionHistoryHydrationDependenciesForTests() {
  userBrokersLoader =
    getUserBrokers;

  brokerHistoryHydrator =
    hydrateCanonicalBrokerTransactionHistory;
}

/*
 * R7O-R4E7R44I
 *
 * Central authenticated-investor canonical Transaction History hydration.
 *
 * Authority model:
 * - /user-brokers supplies authenticated server broker links.
 * - local broker account ids are never treated as server brokerLinkIds.
 * - local broker profile fallback is not sufficient authority.
 * - R44E remains responsible for canonical history read, strict mapping,
 *   exact-account replacement, and established-empty clearing.
 *
 * Failure model:
 * - one broker failure does not clear or invent history for another broker.
 * - authority-not-established remains non-destructive inside R44E.
 * - consumers continue reading the derived local evidence cache.
 */

function clean(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function activeServerBrokerLinks(result) {
  if (result?.source !== "CLOUD") {
    throw new Error(
      "Authenticated server broker links are unavailable. Canonical Transaction History hydration cannot use a local broker fallback."
    );
  }

  const brokers =
    Array.isArray(result?.brokers)
      ? result.brokers
      : [];

  const active = brokers.filter(
    (item) =>
      upper(item?.status) === "ACTIVE"
  );

  const seen = new Set();

  return active.map((item) => {
    const brokerLinkId =
      clean(item?.id);

    if (!brokerLinkId) {
      throw new Error(
        "An active authenticated server broker link does not contain an id."
      );
    }

    if (seen.has(brokerLinkId)) {
      throw new Error(
        "Authenticated server broker links contain a duplicate id."
      );
    }

    seen.add(brokerLinkId);

    return {
      brokerLinkId,
      broker:
        clean(item?.broker) || null,
      clientNumber:
        clean(item?.clientNumber) || null,
      cdsNumber:
        clean(item?.cdsNumber) || null,
      status:
        upper(item?.status)
    };
  });
}

export async function hydrateAuthenticatedInvestorTransactionHistory() {
  const brokerResult =
    await userBrokersLoader();

  const brokerLinks =
    activeServerBrokerLinks(
      brokerResult
    );

  const results = [];

  for (const brokerLink of brokerLinks) {
    try {
      const hydration =
        await brokerHistoryHydrator({
          brokerLinkId:
            brokerLink.brokerLinkId
        });

      results.push({
        ok: true,
        brokerLink,
        hydration
      });
    } catch (error) {
      results.push({
        ok: false,
        brokerLink,
        error:
          error instanceof Error
            ? error.message
            : String(error)
      });
    }
  }

  const hydrated =
    results.filter(
      (item) =>
        item.ok === true &&
        item.hydration?.hydrated === true
    );

  const unavailable =
    results.filter(
      (item) =>
        item.ok === true &&
        item.hydration?.hydrated !== true
    );

  const failed =
    results.filter(
      (item) =>
        item.ok !== true
    );

  return {
    ok:
      failed.length === 0,
    source:
      "AUTHENTICATED_SERVER_BROKER_LINKS",
    brokerLinkCount:
      brokerLinks.length,
    hydratedCount:
      hydrated.length,
    unavailableCount:
      unavailable.length,
    failedCount:
      failed.length,
    results
  };
}
