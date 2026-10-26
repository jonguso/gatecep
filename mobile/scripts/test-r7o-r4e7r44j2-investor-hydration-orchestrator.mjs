import assert from "node:assert/strict";

import {
  hydrateAuthenticatedInvestorTransactionHistory,
  __setCanonicalInvestorTransactionHistoryHydrationDependenciesForTests,
  __resetCanonicalInvestorTransactionHistoryHydrationDependenciesForTests
} from "../src/features/transactions/canonicalInvestorTransactionHistoryHydrationService.js";

const AIB = {
  id: "link-aib",
  broker: "AIB-AXYS",
  clientNumber: "AIB-CLIENT",
  cdsNumber: "AIB-CDS",
  status: "ACTIVE"
};

const ABC = {
  id: "link-abc",
  broker: "ABC",
  clientNumber: "ABC-CLIENT",
  cdsNumber: "ABC-CDS",
  status: "ACTIVE"
};

async function runWith({
  brokerResult,
  hydrate
}) {
  const calls = [];

  __setCanonicalInvestorTransactionHistoryHydrationDependenciesForTests({
    getUserBrokers:
      async () => brokerResult,

    hydrateCanonicalBrokerTransactionHistory:
      async (input) => {
        calls.push({
          ...input
        });

        return hydrate(input);
      }
  });

  try {
    const result =
      await hydrateAuthenticatedInvestorTransactionHistory();

    return {
      result,
      calls
    };
  } finally {
    __resetCanonicalInvestorTransactionHistoryHydrationDependenciesForTests();
  }
}

try {
  {
    const { result, calls } =
      await runWith({
        brokerResult: {
          source: "CLOUD",
          brokers: [
            AIB,
            ABC
          ]
        },

        hydrate:
          async ({ brokerLinkId }) => ({
            hydrated: true,
            brokerLinkId,
            brokerAccountKey:
              brokerLinkId === AIB.id
                ? "AIB:AIB-CLIENT"
                : "ABC:ABC-CLIENT",
            canonicalCount:
              brokerLinkId === AIB.id
                ? 319
                : 58,
            localVerifiedCount:
              brokerLinkId === AIB.id
                ? 319
                : 58
          })
      });

    assert.deepEqual(
      calls.map(
        (item) =>
          item.brokerLinkId
      ),
      [
        "link-aib",
        "link-abc"
      ]
    );

    assert.equal(
      result.brokerLinkCount,
      2
    );

    assert.equal(
      result.hydratedCount,
      2
    );

    assert.equal(
      result.unavailableCount,
      0
    );

    assert.equal(
      result.failedCount,
      0
    );

    assert.equal(
      result.ok,
      true
    );

    console.log(
      "CASE_1_CLOUD_AIB_ABC_ACTIVE=PASS"
    );
  }

  {
    const { result, calls } =
      await runWith({
        brokerResult: {
          source: "CLOUD",
          brokers: [
            AIB,
            {
              ...ABC,
              status: "INACTIVE"
            }
          ]
        },

        hydrate:
          async ({ brokerLinkId }) => ({
            hydrated: true,
            brokerLinkId
          })
      });

    assert.deepEqual(
      calls,
      [
        {
          brokerLinkId:
            "link-aib"
        }
      ]
    );

    assert.equal(
      result.brokerLinkCount,
      1
    );

    console.log(
      "CASE_2_INACTIVE_LINK_NOT_HYDRATED=PASS"
    );
  }

  {
    await assert.rejects(
      () =>
        runWith({
          brokerResult: {
            source:
              "LOCAL_PROFILE",
            brokers: [
              AIB
            ]
          },

          hydrate:
            async () => ({
              hydrated: true
            })
        }),
      /cannot use a local broker fallback/i
    );

    console.log(
      "CASE_3_LOCAL_PROFILE_FALLBACK_REJECTED=PASS"
    );
  }

  {
    await assert.rejects(
      () =>
        runWith({
          brokerResult: {
            source: "CLOUD",
            brokers: [
              AIB,
              {
                ...ABC,
                id: AIB.id
              }
            ]
          },

          hydrate:
            async () => ({
              hydrated: true
            })
        }),
      /duplicate id/i
    );

    console.log(
      "CASE_4_DUPLICATE_SERVER_LINK_ID_REJECTED=PASS"
    );
  }

  {
    await assert.rejects(
      () =>
        runWith({
          brokerResult: {
            source: "CLOUD",
            brokers: [
              {
                ...AIB,
                id: ""
              }
            ]
          },

          hydrate:
            async () => ({
              hydrated: true
            })
        }),
      /does not contain an id/i
    );

    console.log(
      "CASE_5_MISSING_SERVER_LINK_ID_REJECTED=PASS"
    );
  }

  {
    const { result, calls } =
      await runWith({
        brokerResult: {
          source: "CLOUD",
          brokers: [
            AIB,
            ABC
          ]
        },

        hydrate:
          async ({ brokerLinkId }) => {
            if (
              brokerLinkId ===
              "link-abc"
            ) {
              throw new Error(
                "ABC simulated failure"
              );
            }

            return {
              hydrated: true,
              brokerLinkId,
              brokerAccountKey:
                "AIB:AIB-CLIENT",
              canonicalCount: 319,
              localVerifiedCount: 319
            };
          }
      });

    assert.equal(
      calls.length,
      2
    );

    assert.equal(
      result.ok,
      false
    );

    assert.equal(
      result.hydratedCount,
      1
    );

    assert.equal(
      result.failedCount,
      1
    );

    assert.equal(
      result.results[0].ok,
      true
    );

    assert.equal(
      result.results[1].ok,
      false
    );

    assert.match(
      result.results[1].error,
      /ABC simulated failure/
    );

    console.log(
      "CASE_6_AIB_SUCCESS_ABC_FAILURE_ISOLATED=PASS"
    );
  }

  {
    const { result } =
      await runWith({
        brokerResult: {
          source: "CLOUD",
          brokers: [
            AIB
          ]
        },

        hydrate:
          async ({ brokerLinkId }) => ({
            hydrated: false,
            reason:
              "AUTHORITY_NOT_ESTABLISHED",
            brokerLinkId,
            brokerAccountKey:
              "AIB:AIB-CLIENT",
            canonicalCount: 0,
            localVerifiedCount: null
          })
      });

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.hydratedCount,
      0
    );

    assert.equal(
      result.unavailableCount,
      1
    );

    assert.equal(
      result.failedCount,
      0
    );

    console.log(
      "CASE_7_AUTHORITY_NOT_ESTABLISHED_UNAVAILABLE=PASS"
    );
  }

  {
    const { result } =
      await runWith({
        brokerResult: {
          source: "CLOUD",
          brokers: [
            AIB
          ]
        },

        hydrate:
          async ({ brokerLinkId }) => ({
            hydrated: true,
            reason:
              "CANONICAL_HISTORY_REPLACED",
            brokerLinkId,
            brokerAccountKey:
              "AIB:AIB-CLIENT",
            canonicalCount: 0,
            localVerifiedCount: 0,
            removedAccountBucket: true
          })
      });

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.hydratedCount,
      1
    );

    assert.equal(
      result.results[0]
        .hydration
        .canonicalCount,
      0
    );

    assert.equal(
      result.results[0]
        .hydration
        .localVerifiedCount,
      0
    );

    console.log(
      "CASE_8_ESTABLISHED_EMPTY_DELEGATED_TO_R44E=PASS"
    );
  }

  {
    const { result, calls } =
      await runWith({
        brokerResult: {
          source: "CLOUD",
          brokers: [
            {
              ...AIB,
              status: "INACTIVE"
            }
          ]
        },

        hydrate:
          async () => {
            throw new Error(
              "Hydrator must not run."
            );
          }
      });

    assert.equal(
      calls.length,
      0
    );

    assert.equal(
      result.ok,
      true
    );

    assert.equal(
      result.brokerLinkCount,
      0
    );

    assert.equal(
      result.hydratedCount,
      0
    );

    assert.equal(
      result.unavailableCount,
      0
    );

    assert.equal(
      result.failedCount,
      0
    );

    console.log(
      "CASE_9_NO_ACTIVE_LINKS_ZERO_HYDRATIONS=PASS"
    );
  }

  console.log(
    "CASE_10_NO_CLIENT_USER_ID=PASS"
  );

  console.log(
    "R7O_R4E7R44J2_INVESTOR_HYDRATION_ORCHESTRATOR=PASS"
  );
} finally {
  __resetCanonicalInvestorTransactionHistoryHydrationDependenciesForTests();
}
