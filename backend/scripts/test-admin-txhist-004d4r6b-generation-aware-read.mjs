import assert from "node:assert/strict";
import fs from "node:fs";

import {
  loadAuthenticatedInvestorTransactionHistory
} from "../src/modules/transaction-history/investorBrokerTransactionHistory.service.js";

const SERVICE =
  new URL(
    "../src/modules/transaction-history/" +
    "investorBrokerTransactionHistory.service.js",
    import.meta.url
  );

const REPOSITORY =
  new URL(
    "../src/modules/transaction-history/" +
    "investorBrokerTransactionHistory.repository.js",
    import.meta.url
  );

const serviceSource =
  fs.readFileSync(
    SERVICE,
    "utf8"
  );

const repositorySource =
  fs.readFileSync(
    REPOSITORY,
    "utf8"
  );

function pass(label) {
  console.log(label + "=PASS");
}

function makePool({
  brokerOwner = "user-1",
  brokerStatus = "ACTIVE"
} = {}) {
  const queries = [];

  const client = {
    async query(sql, values = []) {
      const normalized =
        String(sql)
          .replace(/\s+/g, " ")
          .trim();

      queries.push({
        sql: normalized,
        values
      });

      if (
        /FROM public\.user_broker_links/i
          .test(normalized)
      ) {
        if (
          values[0] !== "broker-link-1" ||
          values[1] !== brokerOwner
        ) {
          return {
            rowCount: 0,
            rows: []
          };
        }

        return {
          rowCount: 1,
          rows: [
            {
              id: "broker-link-1",
              user_id: brokerOwner,
              broker: "AIB-AXYS",
              broker_name: "AIB-AXYS",
              client_number: "137971",
              cds_number: "CDS-1",
              status: brokerStatus
            }
          ]
        };
      }

      return {
        rowCount: 0,
        rows: []
      };
    },

    release() {}
  };

  return {
    queries,

    pool: {
      async connect() {
        return client;
      }
    }
  };
}

const currentRows = [
  {
    id: "current-row",
    authorityGeneration: 2,
    executionIdentity: "EX-200"
  }
];

/*
 * Established authority:
 * read must observe generation 2 and pass it to listHistory.
 */
{
  const fixture =
    makePool();

  let authorityInput = null;
  let listInput = null;

  const result =
    await loadAuthenticatedInvestorTransactionHistory(
      {
        authenticatedUserId:
          "user-1",
        brokerLinkId:
          "broker-link-1"
      },
      {
        pool:
          fixture.pool,

        findAuthority:
          async input => {
            authorityInput = input;

            return {
              userId: "user-1",
              brokerLinkId:
                "broker-link-1",
              brokerAccountKey:
                "AIB|137971",
              currentGeneration: 2
            };
          },

        listHistory:
          async input => {
            listInput = input;

            return currentRows;
          }
      }
    );

  assert.equal(
    authorityInput.userId,
    "user-1"
  );

  assert.equal(
    authorityInput.brokerLinkId,
    "broker-link-1"
  );

  assert.equal(
    authorityInput.brokerAccountKey,
    "AIB|137971"
  );

  pass(
    "AUTHORITY_READ_IS_ACCOUNT_SCOPED"
  );

  assert.equal(
    listInput.userId,
    "user-1"
  );

  assert.equal(
    listInput.brokerLinkId,
    "broker-link-1"
  );

  assert.equal(
    listInput.brokerAccountKey,
    "AIB|137971"
  );

  assert.equal(
    listInput.authorityGeneration,
    2
  );

  pass(
    "CURRENT_GENERATION_PASSED_TO_HISTORY_LIST"
  );

  assert.equal(
    result.authorityEstablished,
    true
  );

  assert.equal(
    result.currentGeneration,
    2
  );

  assert.equal(
    result.count,
    1
  );

  assert.deepEqual(
    result.history,
    currentRows
  );

  pass(
    "READ_RESPONSE_EXPOSES_CURRENT_GENERATION"
  );

  pass(
    "CURRENT_GENERATION_HISTORY_RETURNED"
  );
}

/*
 * No authority:
 * ordinary read must not create/fabricate generation 1 and
 * must not call listHistory.
 */
{
  const fixture =
    makePool();

  let listCalled = false;

  const result =
    await loadAuthenticatedInvestorTransactionHistory(
      {
        authenticatedUserId:
          "user-1",
        brokerLinkId:
          "broker-link-1"
      },
      {
        pool:
          fixture.pool,

        findAuthority:
          async () => null,

        listHistory:
          async () => {
            listCalled = true;
            return [];
          }
      }
    );

  assert.equal(
    listCalled,
    false
  );

  assert.equal(
    result.authorityEstablished,
    false
  );

  assert.equal(
    result.currentGeneration,
    null
  );

  assert.equal(
    result.count,
    0
  );

  assert.deepEqual(
    result.history,
    []
  );

  pass(
    "MISSING_AUTHORITY_NOT_FABRICATED"
  );

  pass(
    "MISSING_AUTHORITY_DOES_NOT_LIST_HISTORY"
  );
}

/*
 * Invalid server authority must fail closed.
 */
{
  const fixture =
    makePool();

  let listCalled = false;
  let error = null;

  try {
    await loadAuthenticatedInvestorTransactionHistory(
      {
        authenticatedUserId:
          "user-1",
        brokerLinkId:
          "broker-link-1"
      },
      {
        pool:
          fixture.pool,

        findAuthority:
          async () => ({
            currentGeneration: 0
          }),

        listHistory:
          async () => {
            listCalled = true;
            return [];
          }
      }
    );
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);

  assert.match(
    error.message,
    /authority generation is invalid/i
  );

  assert.equal(
    listCalled,
    false
  );

  pass(
    "INVALID_AUTHORITY_GENERATION_FAILS_CLOSED"
  );
}

/*
 * Cross-user broker ownership must still fail before authority
 * or history access.
 */
{
  const fixture =
    makePool({
      brokerOwner: "user-2"
    });

  let authorityCalled = false;
  let historyCalled = false;
  let error = null;

  try {
    await loadAuthenticatedInvestorTransactionHistory(
      {
        authenticatedUserId:
          "user-1",
        brokerLinkId:
          "broker-link-1"
      },
      {
        pool:
          fixture.pool,

        findAuthority:
          async () => {
            authorityCalled = true;
            return null;
          },

        listHistory:
          async () => {
            historyCalled = true;
            return [];
          }
      }
    );
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);

  assert.equal(
    authorityCalled,
    false
  );

  assert.equal(
    historyCalled,
    false
  );

  pass(
    "BROKER_OWNERSHIP_PRECEDES_AUTHORITY_READ"
  );
}

/*
 * Client-owned identity remains prohibited on read.
 */
{
  const fixture =
    makePool();

  let error = null;

  try {
    await loadAuthenticatedInvestorTransactionHistory(
      {
        authenticatedUserId:
          "user-1",
        brokerLinkId:
          "broker-link-1",
        targetUserId:
          "user-2"
      },
      {
        pool:
          fixture.pool
      }
    );
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);

  pass(
    "CLIENT_TARGET_USER_REJECTED_ON_READ"
  );
}

/*
 * Static repository contract.
 */
assert.match(
  repositorySource,
  /authorityGeneration/
);

pass(
  "LIST_ACCEPTS_AUTHORITY_GENERATION"
);

assert.match(
  repositorySource,
  /authority_generation\s*=\s*["'`]?\s*\$|authority_generation\s*=\s*["'`]?\s*["']?\s*\+/i
);

pass(
  "LIST_FILTERS_AUTHORITY_GENERATION"
);

/*
 * Read service must use the non-mutating finder.
 */
assert.match(
  serviceSource,
  /findInvestorBrokerTransactionHistoryAuthority/
);

pass(
  "READ_USES_NON_MUTATING_AUTHORITY_FINDER"
);

/*
 * Normal service must not contain authority generation UPDATE
 * or history DELETE.
 */
assert.doesNotMatch(
  serviceSource,
  /UPDATE\s+public\.investor_broker_transaction_history_authority/i
);

pass(
  "NORMAL_SERVICE_CANNOT_ADVANCE_GENERATION"
);

assert.doesNotMatch(
  serviceSource,
  /DELETE\s+FROM\s+public\.investor_broker_transaction_history/i
);

pass(
  "NORMAL_SERVICE_CANNOT_RESET_HISTORY"
);

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
  "MIGRATION_019_RUN=NO"
);

console.log(
  "EXISTING_377_HISTORY_MIGRATION=NONE"
);

console.log(
  "ADMIN_RESET_ENABLEMENT=BLOCKED"
);

console.log(
  "ADMIN_TXHIST_004D4_R6B_READ=PASS"
);
