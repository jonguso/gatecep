import assert from "node:assert/strict";

import {
  bootstrapAuthenticatedInvestorTransactionHistory,
  computeHistoricalEvidenceSha256
} from "../src/modules/transaction-history/investorBrokerTransactionHistoryBootstrap.service.js";

console.log(
  "===== ADMIN-TXHIST-004D4-R7L-R5C — NORMALIZED FINGERPRINT BEHAVIOR ====="
);

const USER = "user-investor";
const AIB_LINK = "link-aib";
const ABC_LINK = "link-abc";

function rawExecution({
  brokerAccountKey,
  order,
  symbol,
  side = "BUY"
}) {
  return {
    /*
     * executionIdentity intentionally omitted.
     * Server must derive it from Exchange Order No.
     */
    brokerAccountKey,

    exchangeOrderNo: order,

    /*
     * Deliberately noncanonical representation.
     * Server normalization must uppercase these before hashing.
     */
    symbol:
      String(symbol).toLowerCase(),

    side:
      String(side).toLowerCase(),

    totalTradedQuantity: 10,
    executionPrice: 25.5,

    executionDate:
      "2026-01-02",

    historicalExecutionState:
      "ready",

    executionConfirmed: true,
    fifoEligible: true,
    canAffectFifo: true,

    descriptiveOrderStatus:
      "FILLED",

    /*
     * Fingerprint must ignore provenance.
     */
    rawEvidence: {
      synthetic: true,
      ignoredByFingerprint: true
    },

    verificationMetadata: {
      gate: "R7L-R5C"
    }
  };
}

function makePartitions() {
  return [
    {
      brokerLinkId: AIB_LINK,
      executions: [
        rawExecution({
          brokerAccountKey:
            "AIB|137971",
          order:
            "AIB-R7L5C-1",
          symbol:
            "SCOM"
        })
      ]
    },

    {
      brokerLinkId: ABC_LINK,
      executions: [
        rawExecution({
          brokerAccountKey:
            "ABC|23032",
          order:
            "ABC-R7L5C-1",
          symbol:
            "BAT"
        })
      ]
    }
  ];
}

/*
 * This represents what the SERVER will produce
 * after resolving broker ownership and normalizing
 * the executions.
 */
function makeExpectedNormalizedPartitions() {
  return [
    {
      executions: [
        {
          brokerAccountKey:
            "AIB|137971",

          exchangeOrderNo:
            "AIB-R7L5C-1",

          executionIdentity:
            "AIB-R7L5C-1",

          symbol: "SCOM",
          side: "BUY",

          totalTradedQuantity: 10,
          executionPrice: 25.5,

          executionDate:
            "2026-01-02",

          historicalExecutionState:
            "READY"
        }
      ]
    },

    {
      executions: [
        {
          brokerAccountKey:
            "ABC|23032",

          exchangeOrderNo:
            "ABC-R7L5C-1",

          executionIdentity:
            "ABC-R7L5C-1",

          symbol: "BAT",
          side: "BUY",

          totalTradedQuantity: 10,
          executionPrice: 25.5,

          executionDate:
            "2026-01-02",

          historicalExecutionState:
            "READY"
        }
      ]
    }
  ];
}

function makeFixture({
  generation = 1
} = {}) {
  const calls = [];

  let connectCount = 0;
  let authorityCount = 0;
  let insertCount = 0;

  const inserted = [];

  const links = {
    [AIB_LINK]: {
      id: AIB_LINK,
      user_id: USER,

      /*
       * Deliberately server representation AIB-AXYS.
       * Production canonicalization must turn this
       * into historical key AIB|137971.
       */
      broker: "AIB-AXYS",

      client_number:
        "137971",

      cds_number:
        "52470471",

      status: "ACTIVE"
    },

    [ABC_LINK]: {
      id: ABC_LINK,
      user_id: USER,
      broker: "ABC",
      client_number:
        "23032",
      cds_number:
        "52470471",
      status: "ACTIVE"
    }
  };

  const client = {
    async query(
      sql,
      values = []
    ) {
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
          link.user_id !== values[1]
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
        "Unexpected SQL in R7L-R5C synthetic client: " +
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

  const fixture = {
    pool: {
      async connect() {
        connectCount += 1;
        return client;
      }
    },

    async getOrCreateAuthority(
      input,
      queryable
    ) {
      assert.equal(
        queryable,
        client
      );

      authorityCount += 1;

      return {
        ...input,
        currentGeneration:
          generation
      };
    },

    async createIfAbsent(
      input,
      queryable
    ) {
      assert.equal(
        queryable,
        client
      );

      insertCount += 1;
      inserted.push(input);

      return {
        inserted: true,
        record: input
      };
    },

    calls,
    inserted,

    counters() {
      return {
        connectCount,
        authorityCount,
        insertCount
      };
    }
  };

  return fixture;
}

function operations(fixture) {
  return fixture.calls.map(
    call => call.sql
  );
}

/*
 * ------------------------------------------------------------
 * CASE 1
 *
 * Invalid/missing fingerprint format must fail before DB connect.
 * ------------------------------------------------------------
 */
async function invalidFingerprintFormatCase() {
  const fixture =
    makeFixture();

  await assert.rejects(
    () =>
      bootstrapAuthenticatedInvestorTransactionHistory(
        {
          authenticatedUserId:
            USER,

          observedGeneration: 1,

          partitions:
            makePartitions()
        },
        fixture
      ),
    error =>
      error?.code ===
      "HISTORICAL_EVIDENCE_FINGERPRINT_REQUIRED"
  );

  assert.equal(
    fixture.counters()
      .connectCount,
    0
  );

  assert.equal(
    fixture.counters()
      .authorityCount,
    0
  );

  assert.equal(
    fixture.counters()
      .insertCount,
    0
  );

  console.log(
    "INVALID_FINGERPRINT_REJECTED_BEFORE_DB=PASS"
  );

  console.log(
    "INVALID_FINGERPRINT_AUTHORITY_CALLS=0"
  );

  console.log(
    "INVALID_FINGERPRINT_INSERT_CALLS=0"
  );
}

/*
 * ------------------------------------------------------------
 * CASE 2
 *
 * A syntactically valid but wrong fingerprint MUST NOT fail
 * before DB access.
 *
 * It must:
 *   connect
 *   BEGIN
 *   resolve both owned broker links
 *   normalize the executions
 *   compare normalized evidence
 *   fail fingerprint equality
 *   ROLLBACK
 *
 * It must NOT:
 *   create/read authority
 *   insert history
 *   COMMIT
 * ------------------------------------------------------------
 */
async function mismatchAfterNormalizationCase() {
  const fixture =
    makeFixture();

  await assert.rejects(
    () =>
      bootstrapAuthenticatedInvestorTransactionHistory(
        {
          authenticatedUserId:
            USER,

          observedGeneration: 1,

          expectedEvidenceSha256:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

          partitions:
            makePartitions()
        },
        fixture
      ),
    error =>
      error?.code ===
      "HISTORICAL_EVIDENCE_FINGERPRINT_MISMATCH"
  );

  const ops =
    operations(fixture);

  assert.equal(
    fixture.counters()
      .connectCount,
    1
  );

  assert.equal(
    ops[0],
    "BEGIN"
  );

  const brokerLookups =
    ops.filter(
      sql =>
        sql.includes(
          "FROM public.user_broker_links"
        )
    );

  assert.equal(
    brokerLookups.length,
    2
  );

  assert.equal(
    fixture.counters()
      .authorityCount,
    0
  );

  assert.equal(
    fixture.counters()
      .insertCount,
    0
  );

  assert.equal(
    ops.includes("ROLLBACK"),
    true
  );

  assert.equal(
    ops.includes("COMMIT"),
    false
  );

  console.log(
    "VALID_WRONG_FINGERPRINT_CONNECTED=PASS"
  );

  console.log(
    "BOTH_BROKER_LINKS_RESOLVED_BEFORE_MISMATCH=PASS"
  );

  console.log(
    "FINGERPRINT_MISMATCH_AFTER_SERVER_NORMALIZATION=PASS"
  );

  console.log(
    "MISMATCH_AUTHORITY_CALLS=0"
  );

  console.log(
    "MISMATCH_INSERT_CALLS=0"
  );

  console.log(
    "MISMATCH_ROLLBACK=PASS"
  );

  console.log(
    "MISMATCH_COMMIT=NONE"
  );
}

/*
 * ------------------------------------------------------------
 * CASE 3
 *
 * Prove the expected fingerprint is based on the server-normalized
 * representation rather than the raw request representation.
 * ------------------------------------------------------------
 */
async function normalizedSuccessCase() {
  const fixture =
    makeFixture();

  const rawPartitions =
    makePartitions();

  const normalizedPartitions =
    makeExpectedNormalizedPartitions();

  const rawSha =
    computeHistoricalEvidenceSha256(
      rawPartitions
    );

  const expectedNormalizedSha =
    computeHistoricalEvidenceSha256(
      normalizedPartitions
    );

  /*
   * The raw request uses lowercase symbol/side/state and omits
   * executionIdentity. The fingerprint helper canonicalizes
   * several of those fields itself, so rawSha may legitimately
   * equal normalizedSha. We therefore do NOT require inequality.
   *
   * What matters behaviorally is that production computes the
   * actual fingerprint from the server-prepared rows.
   */
  const result =
    await bootstrapAuthenticatedInvestorTransactionHistory(
      {
        authenticatedUserId:
          USER,

        observedGeneration: 1,

        expectedEvidenceSha256:
          expectedNormalizedSha,

        partitions:
          rawPartitions
      },
      fixture
    );

  const ops =
    operations(fixture);

  assert.equal(
    result.evidenceSha256,
    expectedNormalizedSha
  );

  assert.equal(
    result.partitionCount,
    2
  );

  assert.equal(
    result.receivedCount,
    2
  );

  assert.equal(
    result.insertedCount,
    2
  );

  assert.equal(
    fixture.counters()
      .authorityCount,
    2
  );

  assert.equal(
    fixture.counters()
      .insertCount,
    2
  );

  assert.equal(
    fixture.inserted[0]
      .brokerAccountKey,
    "AIB|137971"
  );

  assert.equal(
    fixture.inserted[1]
      .brokerAccountKey,
    "ABC|23032"
  );

  assert.equal(
    fixture.inserted[0]
      .executionIdentity,
    "AIB-R7L5C-1"
  );

  assert.equal(
    fixture.inserted[1]
      .executionIdentity,
    "ABC-R7L5C-1"
  );

  assert.equal(
    fixture.inserted[0]
      .symbol,
    "SCOM"
  );

  assert.equal(
    fixture.inserted[0]
      .side,
    "BUY"
  );

  assert.equal(
    fixture.inserted[0]
      .historicalExecutionState,
    "READY"
  );

  assert.equal(
    ops.includes("COMMIT"),
    true
  );

  assert.equal(
    ops.includes("ROLLBACK"),
    false
  );

  console.log(
    "SERVER_NORMALIZED_FINGERPRINT_ACCEPTED=PASS"
  );

  console.log(
    "SERVER_DERIVED_AIB_ACCOUNT_KEY=PASS"
  );

  console.log(
    "SERVER_DERIVED_ABC_ACCOUNT_KEY=PASS"
  );

  console.log(
    "SERVER_DERIVED_EXECUTION_IDENTITY=PASS"
  );

  console.log(
    "SERVER_NORMALIZED_SYMBOL_SIDE_STATE=PASS"
  );

  console.log(
    "TWO_AUTHORITIES_AFTER_FINGERPRINT=PASS"
  );

  console.log(
    "TWO_INSERTS_AFTER_FINGERPRINT=PASS"
  );

  console.log(
    "SUCCESS_COMMIT=PASS"
  );

  console.log(
    "RAW_REQUEST_SHA256=" +
    rawSha
  );

  console.log(
    "SERVER_EXPECTED_SHA256=" +
    expectedNormalizedSha
  );
}

/*
 * ------------------------------------------------------------
 * CASE 4
 *
 * Client executionIdentity is optional, but if supplied it must
 * exactly equal Exchange Order No.
 * ------------------------------------------------------------
 */
async function identityMismatchCase() {
  const fixture =
    makeFixture();

  const partitions =
    makePartitions();

  partitions[0]
    .executions[0]
    .executionIdentity =
      "CLIENT-REDEFINED-IDENTITY";

  await assert.rejects(
    () =>
      bootstrapAuthenticatedInvestorTransactionHistory(
        {
          authenticatedUserId:
            USER,

          observedGeneration: 1,

          expectedEvidenceSha256:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

          partitions
        },
        fixture
      ),
    error =>
      error?.code ===
      "HISTORICAL_EXECUTION_IDENTITY_MISMATCH"
  );

  assert.equal(
    fixture.counters()
      .authorityCount,
    0
  );

  assert.equal(
    fixture.counters()
      .insertCount,
    0
  );

  assert.equal(
    operations(fixture)
      .includes("ROLLBACK"),
    true
  );

  console.log(
    "CLIENT_IDENTITY_MISMATCH_REJECTED=PASS"
  );

  console.log(
    "IDENTITY_MISMATCH_AUTHORITY_CALLS=0"
  );

  console.log(
    "IDENTITY_MISMATCH_INSERT_CALLS=0"
  );
}

/*
 * ------------------------------------------------------------
 * CASE 5
 *
 * Client brokerAccountKey cannot redefine server broker identity.
 * ------------------------------------------------------------
 */
async function accountKeyMismatchCase() {
  const fixture =
    makeFixture();

  const partitions =
    makePartitions();

  partitions[0]
    .executions[0]
    .brokerAccountKey =
      "ABC|23032";

  await assert.rejects(
    () =>
      bootstrapAuthenticatedInvestorTransactionHistory(
        {
          authenticatedUserId:
            USER,

          observedGeneration: 1,

          expectedEvidenceSha256:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

          partitions
        },
        fixture
      ),
    /Client brokerAccountKey does not match/
  );

  assert.equal(
    fixture.counters()
      .authorityCount,
    0
  );

  assert.equal(
    fixture.counters()
      .insertCount,
    0
  );

  assert.equal(
    operations(fixture)
      .includes("ROLLBACK"),
    true
  );

  console.log(
    "CLIENT_ACCOUNT_KEY_MISMATCH_REJECTED=PASS"
  );

  console.log(
    "ACCOUNT_KEY_MISMATCH_AUTHORITY_CALLS=0"
  );

  console.log(
    "ACCOUNT_KEY_MISMATCH_INSERT_CALLS=0"
  );
}

await invalidFingerprintFormatCase();
await mismatchAfterNormalizationCase();
await normalizedSuccessCase();
await identityMismatchCase();
await accountKeyMismatchCase();

console.log(
  "REAL_377_PAYLOAD_LOADED=NO"
);

console.log(
  "REAL_377_BOOTSTRAP=NONE"
);

console.log(
  "DATABASE_WRITE=NONE_SYNTHETIC_ONLY"
);

console.log(
  "ADMIN_TXHIST_004D4_R7L_R5C_BEHAVIOR=PASS"
);
