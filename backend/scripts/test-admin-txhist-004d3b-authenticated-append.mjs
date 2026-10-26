import assert from "node:assert/strict";

import {
  appendAuthenticatedInvestorTransactionHistory,
  loadAuthenticatedInvestorTransactionHistory
} from "../src/modules/transaction-history/investorBrokerTransactionHistory.service.js";

function pass(label) {
  console.log(
    `${label}=PASS`
  );
}

const AUTH_USER =
  "11111111-1111-1111-1111-111111111111";

const OTHER_USER =
  "22222222-2222-2222-2222-222222222222";

const BROKER_LINK =
  "33333333-3333-3333-3333-333333333333";

function makeDatabase({
  ownerUserId = AUTH_USER,
  status = "ACTIVE",
  broker = "AIB-AXYS",
  clientNumber = "137971"
} = {}) {
  const calls = [];

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
          rows: [],
          rowCount: 0
        };
      }

      if (
        normalized.includes(
          "FROM public.user_broker_links"
        )
      ) {
        if (
          values[0] !== BROKER_LINK ||
          values[1] !== ownerUserId
        ) {
          return {
            rows: [],
            rowCount: 0
          };
        }

        return {
          rows: [
            {
              id:
                BROKER_LINK,
              user_id:
                ownerUserId,
              broker,
              client_number:
                clientNumber,
              cds_number:
                "CDS-DEMO",
              status
            }
          ],
          rowCount: 1
        };
      }

      if (
        normalized.includes(
          "FROM public.investor_broker_transaction_history_authority"
        ) &&
        normalized.includes(
          "current_generation"
        ) &&
        normalized.includes(
          "user_id = $1"
        ) &&
        normalized.includes(
          "broker_link_id = $2"
        ) &&
        normalized.includes(
          "broker_account_key = $3"
        )
      ) {
        return {
          rows: [
            {
              user_id:
                values[0],
              broker_link_id:
                values[1],
              broker_account_key:
                values[2],
              current_generation:
                1,
              created_at:
                null,
              updated_at:
                null
            }
          ],
          rowCount: 1
        };
      }

      throw new Error(
        `Unexpected SQL: ${normalized}`
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
    calls,

    pool: {
      async connect() {
        return client;
      }
    }
  };
}

function execution(
  overrides = {}
) {
  return {
    executionIdentity:
      "EXCHANGE_ORDER|ABC123",
    exchangeOrderNo:
      "ABC123",
    symbol:
      "SCOM",
    side:
      "BUY",
    totalTradedQuantity:
      100,
    executionPrice:
      25.5,
    executionDate:
      "2026-10-20",
    historicalExecutionState:
      "READY",
    executionConfirmed:
      true,
    fifoEligible:
      true,
    canAffectFifo:
      true,
    descriptiveOrderStatus:
      "REJECTED",
    source:
      "TRANSACTION_UPLOAD",
    sourceFileName:
      "history.csv",
    sourceRowNumber:
      8,
    rawEvidence: {
      exchangeOrderNo:
        "ABC123",
      totalTradedQuantity:
        100
    },
    ...overrides
  };
}

{
  const db =
    makeDatabase();

  const captured = [];

  const result =
    await appendAuthenticatedInvestorTransactionHistory(
    {
        authenticatedUserId:
          AUTH_USER,
        brokerLinkId:
          BROKER_LINK,
      observedGeneration: 1,
        executions: [
          execution()
        ]
      
    },
    {
      getOrCreateAuthority:
        async () => ({
          currentGeneration: 1
        }),

        pool:
          db.pool,

        async createIfAbsent(
          input,
          queryable
        ) {
          captured.push({
            input,
            queryable
          });

          return {
            inserted: true,
            record: {
              executionIdentity:
                input.executionIdentity
            }
          };
        }
      }
    );

  assert.equal(
    result.userId,
    AUTH_USER
  );

  assert.equal(
    result.brokerLinkId,
    BROKER_LINK
  );

  assert.equal(
    result.brokerAccountKey,
    "AIB|137971"
  );

  assert.equal(
    result.insertedCount,
    1
  );

  assert.equal(
    captured.length,
    1
  );

  assert.equal(
    captured[0].input.userId,
    AUTH_USER
  );

  assert.equal(
    captured[0].input.brokerLinkId,
    BROKER_LINK
  );

  assert.equal(
    captured[0].input.brokerAccountKey,
    "AIB|137971"
  );

  assert.equal(
    captured[0].input.descriptiveOrderStatus,
    "REJECTED"
  );

  assert.equal(
    captured[0].input.executionConfirmed,
    true
  );

  assert.ok(
    db.calls.some(
      call =>
        call.sql === "COMMIT"
    )
  );

  pass(
    "AUTHENTICATED_OWNER_APPEND"
  );
}

{
  const db =
    makeDatabase({
      ownerUserId:
        OTHER_USER
    });

  await assert.rejects(
    () =>
      appendAuthenticatedInvestorTransactionHistory(
    {
          authenticatedUserId:
            AUTH_USER,
          brokerLinkId:
            BROKER_LINK,
      observedGeneration: 1,
          executions: [
            execution()
          ]
        
    },
    {
      getOrCreateAuthority:
        async () => ({
          currentGeneration: 1
        }),

          pool:
            db.pool,

          async createIfAbsent() {
            throw new Error(
              "must not insert"
            );
          }
        }
      ),
    /not found for the authenticated user/i
  );

  assert.ok(
    db.calls.some(
      call =>
        call.sql ===
        "ROLLBACK"
    )
  );

  pass(
    "CROSS_USER_BROKER_LINK_REJECTED"
  );
}

{
  const db =
    makeDatabase({
      status:
        "PAUSED"
    });

  await assert.rejects(
    () =>
      appendAuthenticatedInvestorTransactionHistory(
    {
          authenticatedUserId:
            AUTH_USER,
          brokerLinkId:
            BROKER_LINK,
      observedGeneration: 1,
          executions: [
            execution()
          ]
        
    },
    {
      getOrCreateAuthority:
        async () => ({
          currentGeneration: 1
        }),

          pool:
            db.pool
        }
      ),
    /must be ACTIVE/i
  );

  pass(
    "INACTIVE_BROKER_LINK_REJECTED"
  );
}

{
  const db =
    makeDatabase();

  await assert.rejects(
    () =>
      appendAuthenticatedInvestorTransactionHistory(
    {
          authenticatedUserId:
            AUTH_USER,
          brokerLinkId:
            BROKER_LINK,
      observedGeneration: 1,
          executions: [
            execution({
              userId:
                OTHER_USER
            })
          ]
        
    },
    {
      getOrCreateAuthority:
        async () => ({
          currentGeneration: 1
        }),

          pool:
            db.pool
        }
      ),
    /Client-supplied user identity is not accepted/i
  );

  pass(
    "CLIENT_USER_ID_REJECTED"
  );
}

{
  const db =
    makeDatabase();

  await assert.rejects(
    () =>
      appendAuthenticatedInvestorTransactionHistory(
    {
          authenticatedUserId:
            AUTH_USER,
          brokerLinkId:
            BROKER_LINK,
      observedGeneration: 1,
          executions: [
            execution({
              brokerAccountKey:
                "ABC|999999"
            })
          ]
        
    },
    {
      getOrCreateAuthority:
        async () => ({
          currentGeneration: 1
        }),

          pool:
            db.pool
        }
      ),
    /does not match the server-authoritative broker account/i
  );

  pass(
    "CLIENT_ACCOUNT_KEY_MISMATCH_REJECTED"
  );
}

{
  const db =
    makeDatabase();

  let calls = 0;

  const result =
    await appendAuthenticatedInvestorTransactionHistory(
    {
        authenticatedUserId:
          AUTH_USER,
        brokerLinkId:
          BROKER_LINK,
      observedGeneration: 1,
        executions: [
          execution(),
          execution()
        ]
      
    },
    {
      getOrCreateAuthority:
        async () => ({
          currentGeneration: 1
        }),

        pool:
          db.pool,

        async createIfAbsent() {
          calls += 1;

          if (calls === 1) {
            return {
              inserted: true,
              record: {}
            };
          }

          return {
            inserted: false,
            record: null
          };
        }
      }
    );

  assert.equal(
    result.receivedCount,
    2
  );

  assert.equal(
    result.insertedCount,
    1
  );

  assert.equal(
    result.existingCount,
    1
  );

  pass(
    "IDEMPOTENT_EXISTING_ROW_REPORTED"
  );
}

{
  const db =
    makeDatabase();

  const captured = [];

  await appendAuthenticatedInvestorTransactionHistory(
    {
      authenticatedUserId:
        AUTH_USER,
      brokerLinkId:
        BROKER_LINK,
      observedGeneration: 1,
      executions: [
        execution({
          executionPrice:
            null,
          historicalExecutionState:
            "NEEDS_REVIEW",
          executionConfirmed:
            true,
          fifoEligible:
            false,
          canAffectFifo:
            false
        })
      ]
    
    },
    {
      getOrCreateAuthority:
        async () => ({
          currentGeneration: 1
        }),

      pool:
        db.pool,

      async createIfAbsent(input) {
        captured.push(input);

        return {
          inserted: true,
          record: {}
        };
      }
    }
  );

  assert.equal(
    captured[0]
      .totalTradedQuantity,
    100
  );

  assert.equal(
    captured[0]
      .executionPrice,
    null
  );

  assert.equal(
    captured[0]
      .historicalExecutionState,
    "NEEDS_REVIEW"
  );

  assert.equal(
    captured[0]
      .executionConfirmed,
    true
  );

  assert.equal(
    captured[0]
      .fifoEligible,
    false
  );

  assert.equal(
    captured[0]
      .canAffectFifo,
    false
  );

  pass(
    "NEEDS_REVIEW_EXECUTION_RETAINED_FIFO_BLOCKED"
  );
}

{
  const db =
    makeDatabase();

  const history = [
    {
      executionIdentity:
        "EXCHANGE_ORDER|ABC123"
    }
  ];

  const result =
    await loadAuthenticatedInvestorTransactionHistory(
      {
        authenticatedUserId:
          AUTH_USER,
        brokerLinkId:
          BROKER_LINK
      },
      {
        pool:
          db.pool,

        async listHistory(
          input
        ) {
          assert.equal(
            input.userId,
            AUTH_USER
          );

          assert.equal(
            input.brokerLinkId,
            BROKER_LINK
          );

          assert.equal(
            input.brokerAccountKey,
            "AIB|137971"
          );

          return history;
        }
      }
    );

  assert.equal(
    result.count,
    1
  );

  assert.deepEqual(
    result.history,
    history
  );

  pass(
    "AUTHENTICATED_HISTORY_READ_SCOPE"
  );
}

console.log(
  "ROUTE_CONNECTION=NONE"
);
console.log(
  "MOBILE_CONNECTION=NONE"
);
console.log(
  "DATABASE_WRITE=NONE_SYNTHETIC_ONLY"
);
console.log(
  "MIGRATION_017_RUN=NO"
);
console.log(
  "EXISTING_HISTORY_MIGRATION=NONE"
);
console.log(
  "REAL_HISTORY_RESET=NONE"
);
console.log(
  "ADMIN_TXHIST_004D3B_SERVICE=PASS"
);
