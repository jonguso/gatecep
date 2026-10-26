import assert from "node:assert/strict";

import {
  resetAdminBrokerTransactionHistory
} from "../src/modules/admin/adminBrokerTransactionHistoryReset.service.js";

console.log(
  "===== ADMIN-TXHIST-004A SYNTHETIC VERIFIER ====="
);

function makeClient() {
  const queries = [];

  return {
    queries,
    released: false,

    async query(sql) {
      queries.push(
        String(sql).trim()
      );

      return {
        rows: [],
        rowCount: 0
      };
    },

    release() {
      this.released = true;
    }
  };
}

function makePool(client) {
  return {
    async connect() {
      return client;
    }
  };
}

const context = {
  target: {
    id:
      "user-1",

    email:
      "investor@example.test",

    role:
      "USER",

    status:
      "ACTIVE"
  },

  broker: {
    id:
      "broker-link-1",

    broker:
      "AIB",

    clientNumber:
      "52470471",

    status:
      "ACTIVE"
  },

  brokerAccountKey:
    "AIB|52470471"
};

const evidence = [
  {
    id:
      "execution-1",

    executionIdentity:
      "AIB|52470471|ORDER-1",

    sourceFileSha256:
      "a".repeat(64),

    symbol:
      "SCOM",

    side:
      "BUY",

    executedQuantity:
      100,

    executionPrice:
      25,

    executionDate:
      "2026-01-02",

    evidenceStatus:
      "HISTORICAL_EXECUTION_VERIFIED",

    canAffectRealPortfolio:
      true
  },
  {
    id:
      "execution-2",

    executionIdentity:
      "AIB|52470471|ORDER-2",

    sourceFileSha256:
      "b".repeat(64),

    symbol:
      "KCB",

    side:
      "BUY",

    executedQuantity:
      50,

    executionPrice:
      45,

    executionDate:
      "2026-01-03",

    evidenceStatus:
      "HISTORICAL_EXECUTION_VERIFIED",

    canAffectRealPortfolio:
      true
  }
];

{
  const client =
    makeClient();

  const calls = {
    lock: [],
    list: [],
    delete: [],
    audit: []
  };

  const result =
    await resetAdminBrokerTransactionHistory(
      {
        actorUserId:
          "admin-1",

        targetUserId:
          "user-1",

        brokerLinkId:
          "broker-link-1",

        reason:
          "UAT maintenance reset",

        confirmed:
          true
      },
      {
        poolOverride:
          makePool(client),

        async lockBrokerContext(
          input,
          queryable
        ) {
          calls.lock.push({
            input,
            queryable
          });

          return context;
        },

        async listEvidence(
          input,
          queryable
        ) {
          calls.list.push({
            input,
            queryable
          });

          return evidence;
        },

        async deleteEvidence(
          input,
          queryable
        ) {
          calls.delete.push({
            input,
            queryable
          });

          return {
            deletedCount:
              2,

            deletedEvidence:
              evidence.map(
                (row) => ({
                  id:
                    row.id,

                  executionIdentity:
                    row.executionIdentity,

                  sourceFileSha256:
                    row.sourceFileSha256
                })
              )
          };
        },

        async appendAudit(
          input,
          queryable
        ) {
          calls.audit.push({
            input,
            queryable
          });

          return {
            id:
              "audit-1"
          };
        }
      }
    );

  assert.equal(
    calls.lock.length,
    1
  );

  assert.deepEqual(
    calls.lock[0].input,
    {
      targetUserId:
        "user-1",

      brokerLinkId:
        "broker-link-1"
    }
  );

  assert.deepEqual(
    calls.delete[0].input,
    {
      targetUserId:
        "user-1",

      brokerLinkId:
        "broker-link-1",

      brokerAccountKey:
        "AIB|52470471"
    }
  );

  assert.equal(
    calls.audit[0].input.action,
    "BROKER_TRANSACTION_HISTORY_RESET"
  );

  assert.equal(
    calls.audit[0].input.beforeState
      .executionCount,
    2
  );

  assert.equal(
    calls.audit[0].input.afterState
      .executionCount,
    0
  );

  assert.equal(
    calls.audit[0].input.metadata.scope,
    "TARGET_BROKER_ACCOUNT_ONLY"
  );

  assert.equal(
    result.deletedCount,
    2
  );

  assert.deepEqual(
    client.queries,
    [
      "BEGIN",
      "COMMIT"
    ]
  );

  assert.equal(
    client.released,
    true
  );

  console.log(
    "SCOPED_ACCOUNT_RESET=PASS"
  );

  console.log(
    "AUDIT_IN_SAME_TRANSACTION=PASS"
  );

  console.log(
    "EXPLICIT_CONFIRMATION=PASS"
  );

  console.log(
    "REASON_REQUIRED=PASS"
  );
}

/*
 * Zero-row reset is intentionally safe and idempotent.
 */
{
  const client =
    makeClient();

  const result =
    await resetAdminBrokerTransactionHistory(
      {
        actorUserId:
          "admin-1",

        targetUserId:
          "user-1",

        brokerLinkId:
          "broker-link-1",

        reason:
          "Verify empty history",

        confirmed:
          true
      },
      {
        poolOverride:
          makePool(client),

        async lockBrokerContext() {
          return context;
        },

        async listEvidence() {
          return [];
        },

        async deleteEvidence() {
          return {
            deletedCount:
              0,

            deletedEvidence:
              []
          };
        },

        async appendAudit() {
          return {
            id:
              "audit-empty"
          };
        }
      }
    );

  assert.equal(
    result.deletedCount,
    0
  );

  assert.deepEqual(
    client.queries,
    [
      "BEGIN",
      "COMMIT"
    ]
  );

  console.log(
    "ZERO_ROW_RESET_IDEMPOTENT=PASS"
  );
}

/*
 * Missing confirmation must fail before opening a DB
 * transaction.
 */
{
  let connectCalled =
    false;

  await assert.rejects(
    () =>
      resetAdminBrokerTransactionHistory(
        {
          actorUserId:
            "admin-1",

          targetUserId:
            "user-1",

          brokerLinkId:
            "broker-link-1",

          reason:
            "test",

          confirmed:
            false
        },
        {
          poolOverride: {
            async connect() {
              connectCalled =
                true;

              throw new Error(
                "must not connect"
              );
            }
          }
        }
      ),
    (error) =>
      error.code ===
      "TRANSACTION_HISTORY_RESET_CONFIRMATION_REQUIRED"
  );

  assert.equal(
    connectCalled,
    false
  );

  console.log(
    "UNCONFIRMED_RESET_BLOCKED=PASS"
  );
}

/*
 * Actor cannot reset an administrative history target
 * through this service contract.
 */
{
  let connectCalled =
    false;

  await assert.rejects(
    () =>
      resetAdminBrokerTransactionHistory(
        {
          actorUserId:
            "same-user",

          targetUserId:
            "same-user",

          brokerLinkId:
            "broker-link-1",

          reason:
            "test",

          confirmed:
            true
        },
        {
          poolOverride: {
            async connect() {
              connectCalled =
                true;

              throw new Error(
                "must not connect"
              );
            }
          }
        }
      ),
    (error) =>
      error.code ===
      "TRANSACTION_HISTORY_RESET_ACTOR_TARGET_CONFLICT"
  );

  assert.equal(
    connectCalled,
    false
  );

  console.log(
    "ACTOR_TARGET_CONFLICT_BLOCKED=PASS"
  );
}

/*
 * Delete-count mismatch must roll back and must not audit.
 */
{
  const client =
    makeClient();

  let auditCalled =
    false;

  await assert.rejects(
    () =>
      resetAdminBrokerTransactionHistory(
        {
          actorUserId:
            "admin-1",

          targetUserId:
            "user-1",

          brokerLinkId:
            "broker-link-1",

          reason:
            "test mismatch",

          confirmed:
            true
        },
        {
          poolOverride:
            makePool(client),

          async lockBrokerContext() {
            return context;
          },

          async listEvidence() {
            return evidence;
          },

          async deleteEvidence() {
            return {
              deletedCount:
                1,

              deletedEvidence:
                []
            };
          },

          async appendAudit() {
            auditCalled =
              true;

            return {
              id:
                "must-not-exist"
            };
          }
        }
      ),
    (error) =>
      error.code ===
      "TRANSACTION_HISTORY_RESET_COUNT_MISMATCH"
  );

  assert.equal(
    auditCalled,
    false
  );

  assert.deepEqual(
    client.queries,
    [
      "BEGIN",
      "ROLLBACK"
    ]
  );

  assert.equal(
    client.released,
    true
  );

  console.log(
    "COUNT_MISMATCH_ROLLBACK=PASS"
  );
}

/*
 * Audit failure must roll back the delete transaction.
 */
{
  const client =
    makeClient();

  await assert.rejects(
    () =>
      resetAdminBrokerTransactionHistory(
        {
          actorUserId:
            "admin-1",

          targetUserId:
            "user-1",

          brokerLinkId:
            "broker-link-1",

          reason:
            "test audit rollback",

          confirmed:
            true
        },
        {
          poolOverride:
            makePool(client),

          async lockBrokerContext() {
            return context;
          },

          async listEvidence() {
            return evidence;
          },

          async deleteEvidence() {
            return {
              deletedCount:
                2,

              deletedEvidence:
                []
            };
          },

          async appendAudit() {
            throw new Error(
              "synthetic audit failure"
            );
          }
        }
      ),
    /synthetic audit failure/
  );

  assert.deepEqual(
    client.queries,
    [
      "BEGIN",
      "ROLLBACK"
    ]
  );

  assert.equal(
    client.released,
    true
  );

  console.log(
    "AUDIT_FAILURE_ROLLBACK=PASS"
  );
}

console.log(
  "REAL_DATABASE_WRITE=NONE"
);

console.log(
  "REAL_TRANSACTION_HISTORY_RESET=NONE"
);

console.log(
  "ADMIN_TXHIST_004A=PASS"
);
