import assert from "node:assert/strict";

import {
  bootstrapAuthenticatedInvestorTransactionHistory,
  computeHistoricalEvidenceSha256
} from "../src/modules/transaction-history/investorBrokerTransactionHistoryBootstrap.service.js";

const USER =
  "user-investor";

const AIB_LINK =
  "link-aib";

const ABC_LINK =
  "link-abc";

function execution(
  accountKey,
  order,
  symbol
) {
  return {
    brokerAccountKey:
      accountKey,
    executionIdentity:
      order,
    exchangeOrderNo:
      order,
    symbol,
    side: "BUY",
    totalTradedQuantity: 10,
    executionPrice: 25.5,
    executionDate:
      "2026-01-02",
    historicalExecutionState:
      "READY",
    executionConfirmed: true,
    fifoEligible: true,
    canAffectFifo: true,
    descriptiveOrderStatus:
      "FILLED"
  };
}

function makePool({
  failOnIdentity = null,
  generation = 1
} = {}) {
  const calls = [];
  const inserted = [];

  const links = {
    [AIB_LINK]: {
      id: AIB_LINK,
      user_id: USER,
      broker: "AIB-AXYS",
      client_number: "137971",
      cds_number: "52470471",
      status: "ACTIVE"
    },

    [ABC_LINK]: {
      id: ABC_LINK,
      user_id: USER,
      broker: "ABC",
      client_number: "23032",
      cds_number: "52470471",
      status: "ACTIVE"
    }
  };

  const client = {
    async query(sql, values = []) {
      const normalized =
        String(sql)
          .replace(/\s+/g, " ")
          .trim();

      calls.push({
        sql: normalized,
        values
      });

      if (
        normalized === "BEGIN" ||
        normalized === "COMMIT" ||
        normalized === "ROLLBACK"
      ) {
        return {
          rows: []
        };
      }

      if (
        normalized.includes(
          "FROM public.user_broker_links"
        )
      ) {
        const link =
          links[values[0]];

        if (
          !link ||
          link.user_id !==
            values[1]
        ) {
          return {
            rows: []
          };
        }

        return {
          rows: [link]
        };
      }

      throw new Error(
        "Unexpected SQL in synthetic pool: " +
        normalized
      );
    },

    release() {
      calls.push({
        sql: "RELEASE",
        values: []
      });
    }
  };

  return {
    pool: {
      async connect() {
        return client;
      }
    },

    calls,

    inserted,

    getOrCreateAuthority:
      async (
        input,
        queryable
      ) => {
        assert.equal(
          queryable,
          client
        );

        return {
          ...input,
          currentGeneration:
            generation
        };
      },

    createIfAbsent:
      async (
        input,
        queryable
      ) => {
        assert.equal(
          queryable,
          client
        );

        if (
          input.executionIdentity ===
          failOnIdentity
        ) {
          throw new Error(
            "SYNTHETIC_INSERT_FAILURE"
          );
        }

        inserted.push(input);

        return {
          inserted: true,
          record: input
        };
      }
  };
}

async function bootstrapWithEvidenceFingerprint(
  input,
  deps
) {
  return bootstrapAuthenticatedInvestorTransactionHistory(
    {
      ...input,
      expectedEvidenceSha256:
        computeHistoricalEvidenceSha256(
          input.partitions
        )
    },
    deps
  );
}

async function successCase() {
  const fixture =
    makePool();

  const result =
    await bootstrapWithEvidenceFingerprint(
      {
        authenticatedUserId:
          USER,
        observedGeneration: 1,
        partitions: [
          {
            brokerLinkId:
              AIB_LINK,
            executions: [
              execution(
                "AIB|137971",
                "AIB-1",
                "SCOM"
              ),
              execution(
                "AIB|137971",
                "AIB-2",
                "KCB"
              )
            ]
          },
          {
            brokerLinkId:
              ABC_LINK,
            executions: [
              execution(
                "ABC|23032",
                "ABC-1",
                "BAT"
              )
            ]
          }
        ]
      },
      fixture
    );

  assert.equal(
    result.partitionCount,
    2
  );

  assert.equal(
    result.receivedCount,
    3
  );

  assert.equal(
    result.insertedCount,
    3
  );

  assert.equal(
    fixture.inserted.length,
    3
  );

  assert.equal(
    fixture.inserted[0]
      .brokerAccountKey,
    "AIB|137971"
  );

  assert.equal(
    fixture.inserted[2]
      .brokerAccountKey,
    "ABC|23032"
  );

  assert.equal(
    fixture.inserted.every(
      row =>
        row.authorityGeneration ===
        1
    ),
    true
  );

  const operations =
    fixture.calls.map(
      call => call.sql
    );

  assert.equal(
    operations[0],
    "BEGIN"
  );

  assert.equal(
    operations.includes(
      "COMMIT"
    ),
    true
  );

  assert.equal(
    operations.includes(
      "ROLLBACK"
    ),
    false
  );

  console.log(
    "MULTI_BROKER_SINGLE_TRANSACTION=PASS"
  );

  console.log(
    "AIB_HISTORY_KEY=PASS"
  );

  console.log(
    "ABC_HISTORY_KEY=PASS"
  );

  console.log(
    "GENERATION_ONE=PASS"
  );
}

async function rollbackCase() {
  const fixture =
    makePool({
      failOnIdentity:
        "ABC-FAIL"
    });

  await assert.rejects(
    () =>
      bootstrapWithEvidenceFingerprint(
        {
          authenticatedUserId:
            USER,
          observedGeneration: 1,
          partitions: [
            {
              brokerLinkId:
                AIB_LINK,
              executions: [
                execution(
                  "AIB|137971",
                  "AIB-1",
                  "SCOM"
                )
              ]
            },
            {
              brokerLinkId:
                ABC_LINK,
              executions: [
                execution(
                  "ABC|23032",
                  "ABC-FAIL",
                  "BAT"
                )
              ]
            }
          ]
        },
        fixture
      ),
    /SYNTHETIC_INSERT_FAILURE/
  );

  const operations =
    fixture.calls.map(
      call => call.sql
    );

  assert.equal(
    operations.includes(
      "ROLLBACK"
    ),
    true
  );

  assert.equal(
    operations.includes(
      "COMMIT"
    ),
    false
  );

  console.log(
    "FAILURE_ROLLBACK=PASS"
  );

  console.log(
    "PARTIAL_COMMIT=NONE"
  );
}

async function staleCase() {
  const fixture =
    makePool({
      generation: 2
    });

  await assert.rejects(
    () =>
      bootstrapWithEvidenceFingerprint(
        {
          authenticatedUserId:
            USER,
          observedGeneration: 1,
          partitions: [
            {
              brokerLinkId:
                AIB_LINK,
              executions: [
                execution(
                  "AIB|137971",
                  "AIB-1",
                  "SCOM"
                )
              ]
            }
          ]
        },
        fixture
      ),
    error =>
      error?.code ===
      "STALE_TRANSACTION_HISTORY_GENERATION"
  );

  const operations =
    fixture.calls.map(
      call => call.sql
    );

  assert.equal(
    operations.includes(
      "ROLLBACK"
    ),
    true
  );

  assert.equal(
    operations.includes(
      "COMMIT"
    ),
    false
  );

  console.log(
    "STALE_GENERATION_FAIL_CLOSED=PASS"
  );
}

async function identityCase() {
  const fixture =
    makePool();

  await assert.rejects(
    () =>
      bootstrapWithEvidenceFingerprint(
        {
          authenticatedUserId:
            USER,
          targetUserId:
            "someone-else",
          observedGeneration: 1,
          partitions: [
            {
              brokerLinkId:
                AIB_LINK,
              executions: [
                execution(
                  "AIB|137971",
                  "AIB-1",
                  "SCOM"
                )
              ]
            }
          ]
        },
        fixture
      ),
    /Client-supplied user identity/
  );

  console.log(
    "CLIENT_TARGET_USER_REJECTED=PASS"
  );
}

await successCase();
await rollbackCase();
await staleCase();
await identityCase();

console.log(
  "DATABASE_WRITE=NONE_SYNTHETIC_ONLY"
);

console.log(
  "REAL_HISTORY_BOOTSTRAP=NONE"
);

console.log(
  "R7J_R1_SYNTHETIC=PASS"
);
