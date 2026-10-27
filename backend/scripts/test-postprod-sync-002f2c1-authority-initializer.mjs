import assert from "node:assert/strict";

import {
  initializeAuthenticatedInvestorTransactionHistoryAuthority
} from "../src/modules/transaction-history/investorBrokerTransactionHistory.service.js";

import {
  getOrCreateInvestorBrokerTransactionHistoryAuthority
} from "../src/modules/transaction-history/investorBrokerTransactionHistory.repository.js";

const AUTH_USER =
  "11111111-1111-1111-1111-111111111111";

const OTHER_USER =
  "22222222-2222-2222-2222-222222222222";

const BROKER_LINK =
  "33333333-3333-3333-3333-333333333333";

function pass(name) {
  console.log(`${name}=PASS`);
}

function makeDatabase({
  ownerUserId = AUTH_USER,
  status = "ACTIVE",
  initialGeneration = null,
  broker = "AIB-AXYS",
  clientNumber = "137971"
} = {}) {
  const calls = [];

  let generation =
    initialGeneration;

  let authorityInsertCount = 0;
  let historyWriteCount = 0;

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

      /*
       * Authenticated ownership lookup.
       */
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

      /*
       * Authority creation.
       *
       * Simulates:
       * INSERT ... VALUES (..., 1)
       * ON CONFLICT ... DO NOTHING
       */
      if (
        normalized.includes(
          "INSERT INTO public.investor_broker_transaction_history_authority"
        )
      ) {
        if (generation === null) {
          generation = 1;
          authorityInsertCount += 1;
        }

        return {
          rows: [],
          rowCount:
            generation === 1
              ? 1
              : 0
        };
      }

      /*
       * Authority locked read.
       */
      if (
        normalized.includes(
          "FROM public.investor_broker_transaction_history_authority"
        ) &&
        normalized.includes(
          "FOR UPDATE"
        )
      ) {
        if (generation === null) {
          return {
            rows: [],
            rowCount: 0
          };
        }

        return {
          rows: [
            {
              user_id:
                AUTH_USER,
              broker_link_id:
                BROKER_LINK,
              broker_account_key:
                "AIB|137971",
              current_generation:
                generation,
              created_at:
                null,
              updated_at:
                null
            }
          ],
          rowCount: 1
        };
      }

      /*
       * Any attempted Transaction History write is a defect
       * in this initializer test.
       */
      if (
        normalized.includes(
          "investor_broker_transaction_history"
        ) &&
        !normalized.includes(
          "investor_broker_transaction_history_authority"
        )
      ) {
        historyWriteCount += 1;

        throw new Error(
          "Authority initializer attempted Transaction History persistence."
        );
      }

      throw new Error(
        "Unexpected SQL in test: " +
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

    client,

    calls,

    get generation() {
      return generation;
    },

    get authorityInsertCount() {
      return authorityInsertCount;
    },

    get historyWriteCount() {
      return historyWriteCount;
    }
  };
}

async function initialize(
  db,
  {
    authenticatedUserId = AUTH_USER,
    brokerLinkId = BROKER_LINK
  } = {}
) {
  return (
    initializeAuthenticatedInvestorTransactionHistoryAuthority(
      {
        authenticatedUserId,
        brokerLinkId
      },
      {
        pool:
          db.pool,

        getOrCreateAuthority:
          (input, queryable) =>
            getOrCreateInvestorBrokerTransactionHistoryAuthority(
              input,
              queryable
            )
      }
    )
  );
}

/*
 * TEST 1
 * Never-established authority becomes generation 1.
 */
{
  const db =
    makeDatabase();

  const result =
    await initialize(db);

  assert.equal(
    result.authorityEstablished,
    true
  );

  assert.equal(
    result.currentGeneration,
    1
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
    db.generation,
    1
  );

  assert.equal(
    db.historyWriteCount,
    0
  );

  assert.ok(
    db.calls.some(
      call =>
        call.sql === "COMMIT"
    )
  );

  pass(
    "FIRST_USE_AUTHORITY_GENERATION_1"
  );

  pass(
    "FIRST_USE_NO_HISTORY_APPEND"
  );
}

/*
 * TEST 2
 * Calling initialization again is idempotent.
 */
{
  const db =
    makeDatabase();

  const first =
    await initialize(db);

  const second =
    await initialize(db);

  assert.equal(
    first.currentGeneration,
    1
  );

  assert.equal(
    second.currentGeneration,
    1
  );

  assert.equal(
    db.generation,
    1
  );

  assert.equal(
    db.authorityInsertCount,
    1
  );

  assert.equal(
    db.historyWriteCount,
    0
  );

  pass(
    "REPEATED_INITIALIZATION_IDEMPOTENT"
  );
}

/*
 * TEST 3
 * Existing generation must never be advanced.
 */
{
  const db =
    makeDatabase({
      initialGeneration: 7
    });

  const result =
    await initialize(db);

  assert.equal(
    result.currentGeneration,
    7
  );

  assert.equal(
    db.generation,
    7
  );

  assert.equal(
    db.authorityInsertCount,
    0
  );

  assert.equal(
    db.historyWriteCount,
    0
  );

  pass(
    "EXISTING_GENERATION_UNCHANGED"
  );
}

/*
 * TEST 4
 * Another user's broker link is rejected.
 */
{
  const db =
    makeDatabase({
      ownerUserId:
        OTHER_USER
    });

  await assert.rejects(
    () =>
      initialize(db),
    /not found for the authenticated user/i
  );

  assert.equal(
    db.generation,
    null
  );

  assert.equal(
    db.historyWriteCount,
    0
  );

  assert.ok(
    db.calls.some(
      call =>
        call.sql === "ROLLBACK"
    )
  );

  pass(
    "CROSS_USER_BROKER_LINK_REJECTED"
  );
}

/*
 * TEST 5
 * Inactive broker links cannot establish authority.
 */
{
  const db =
    makeDatabase({
      status:
        "PAUSED"
    });

  await assert.rejects(
    () =>
      initialize(db),
    /must be ACTIVE/i
  );

  assert.equal(
    db.generation,
    null
  );

  assert.equal(
    db.historyWriteCount,
    0
  );

  assert.ok(
    db.calls.some(
      call =>
        call.sql === "ROLLBACK"
    )
  );

  pass(
    "INACTIVE_BROKER_LINK_REJECTED"
  );
}

/*
 * TEST 6
 * Canonical brokerAccountKey must come from the server
 * broker-link row, not from caller-controlled input.
 */
{
  const db =
    makeDatabase({
      broker:
        "AIB-AXYS",
      clientNumber:
        "137971"
    });

  const captured = [];

  const result =
    await initializeAuthenticatedInvestorTransactionHistoryAuthority(
      {
        authenticatedUserId:
          AUTH_USER,
        brokerLinkId:
          BROKER_LINK,

        /*
         * Deliberately malicious/incorrect extra input.
         * Service must ignore it.
         */
        brokerAccountKey:
          "ABC|999999"
      },
      {
        pool:
          db.pool,

        async getOrCreateAuthority(
          input
        ) {
          captured.push(input);

          return {
            currentGeneration:
              1
          };
        }
      }
    );

  assert.equal(
    captured.length,
    1
  );

  assert.equal(
    captured[0].userId,
    AUTH_USER
  );

  assert.equal(
    captured[0].brokerLinkId,
    BROKER_LINK
  );

  assert.equal(
    captured[0].brokerAccountKey,
    "AIB|137971"
  );

  assert.equal(
    result.brokerAccountKey,
    "AIB|137971"
  );

  assert.equal(
    db.historyWriteCount,
    0
  );

  pass(
    "BROKER_ACCOUNT_IDENTITY_SERVER_DERIVED"
  );
}

/*
 * TEST 7
 * Repository/authority failure must roll back.
 */
{
  const db =
    makeDatabase();

  await assert.rejects(
    () =>
      initializeAuthenticatedInvestorTransactionHistoryAuthority(
        {
          authenticatedUserId:
            AUTH_USER,
          brokerLinkId:
            BROKER_LINK
        },
        {
          pool:
            db.pool,

          async getOrCreateAuthority() {
            throw new Error(
              "simulated authority failure"
            );
          }
        }
      ),
    /simulated authority failure/i
  );

  assert.ok(
    db.calls.some(
      call =>
        call.sql === "ROLLBACK"
    )
  );

  assert.equal(
    db.historyWriteCount,
    0
  );

  pass(
    "AUTHORITY_FAILURE_ROLLS_BACK"
  );
}

/*
 * TEST 8
 * Every transaction must release its client.
 */
{
  const db =
    makeDatabase();

  await initialize(db);

  assert.ok(
    db.calls.some(
      call =>
        call.sql === "RELEASE"
    )
  );

  pass(
    "DATABASE_CLIENT_RELEASED"
  );
}

console.log(
  "POSTPROD_SYNC_002F2C1_BEHAVIOR=PASS"
);
