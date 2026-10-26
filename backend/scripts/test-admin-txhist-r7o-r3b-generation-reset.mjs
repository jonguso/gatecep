import assert from "node:assert/strict";

import {
  resetAdminBrokerTransactionHistory
} from "../src/modules/admin/adminBrokerTransactionHistoryReset.service.js";

import {
  getAdminBrokerTransactionHistoryBackup
} from "../src/modules/admin/adminBrokerTransactionHistoryBackup.service.js";

console.log(
  "===== R7O-R3B SYNTHETIC GENERATION VERIFIER ====="
);

function makeClient() {
  const queries = [];

  return {
    queries,
    released: false,

    async query(sql) {
      const text =
        String(sql).trim();

      queries.push(text);

      if (
        /UPDATE\s+public\.investor_broker_transaction_history_authority/i.test(
          text
        )
      ) {
        return {
          rowCount: 1,
          rows: [
            {
              current_generation: 2
            }
          ]
        };
      }

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
      "synthetic-investor",

    email:
      "investor@example.test",

    role:
      "USER",

    status:
      "ACTIVE"
  },

  broker: {
    id:
      "synthetic-link",

    broker:
      "AIB-AXYS",

    clientNumber:
      "12345"
  },

  brokerAccountKey:
    "AIB|12345"
};

const generationOneRows = [
  {
    id: "row-1",
    authorityGeneration: 1,
    executionIdentity: "ORDER-1",
    exchangeOrderNo: "ORDER-1",
    symbol: "SCOM",
    side: "BUY",
    totalTradedQuantity: 100,
    executionPrice: 20,
    executionDate: "2026-01-01",
    historicalExecutionState: "READY",
    executionConfirmed: true,
    fifoEligible: true,
    canAffectFifo: true,
    rawEvidence: {},
    verificationMetadata: {},
    createdAt: "2026-01-01T00:00:00Z"
  },
  {
    id: "row-2",
    authorityGeneration: 1,
    executionIdentity: "ORDER-2",
    exchangeOrderNo: "ORDER-2",
    symbol: "KCB",
    side: "BUY",
    totalTradedQuantity: 50,
    executionPrice: 40,
    executionDate: "2026-01-02",
    historicalExecutionState: "READY",
    executionConfirmed: true,
    fifoEligible: true,
    canAffectFifo: true,
    rawEvidence: {},
    verificationMetadata: {},
    createdAt: "2026-01-02T00:00:00Z"
  }
];

{
  const client =
    makeClient();

  const backup =
    await getAdminBrokerTransactionHistoryBackup(
      {
        actorUserId:
          "admin-1",

        targetUserId:
          "synthetic-investor",

        brokerLinkId:
          "synthetic-link"
      },
      {
        poolOverride:
          makePool(client),

        lockBrokerContext:
          async () => context,

        findAuthority:
          async () => ({
            currentGeneration: 1
          }),

        listHistory:
          async input => {
            assert.equal(
              input.authorityGeneration,
              1
            );

            return generationOneRows;
          }
      }
    );

  assert.equal(
    backup.currentGeneration,
    1
  );

  assert.equal(
    backup.executionCount,
    2
  );

  assert.equal(
    backup.executions.length,
    2
  );

  assert.equal(
    client.released,
    true
  );

  console.log(
    "BACKUP_CURRENT_GENERATION_ONLY=PASS"
  );
}

{
  const client =
    makeClient();

  let auditInput = null;

  const reset =
    await resetAdminBrokerTransactionHistory(
      {
        actorUserId:
          "admin-1",

        targetUserId:
          "synthetic-investor",

        brokerLinkId:
          "synthetic-link",

        observedGeneration:
          1,

        reason:
          "Synthetic generation reset",

        confirmed:
          true
      },
      {
        poolOverride:
          makePool(client),

        lockBrokerContext:
          async () => context,

        getOrCreateAuthority:
          async () => ({
            currentGeneration: 1
          }),

        listHistory:
          async input => {
            if (
              input.authorityGeneration ===
              1
            ) {
              return generationOneRows;
            }

            if (
              input.authorityGeneration ===
              2
            ) {
              return [];
            }

            throw new Error(
              "Unexpected generation."
            );
          },

        appendAudit:
          async input => {
            auditInput = input;

            return {
              id:
                "audit-r7o-r3b"
            };
          }
      }
    );

  assert.equal(
    reset.resetModel,
    "GENERATION_ADVANCE"
  );

  assert.equal(
    reset.previousGeneration,
    1
  );

  assert.equal(
    reset.currentGeneration,
    2
  );

  assert.equal(
    reset.previousExecutionCount,
    2
  );

  assert.equal(
    reset.archivedExecutionCount,
    2
  );

  assert.equal(
    reset.remainingExecutionCount,
    0
  );

  assert.equal(
    reset.deletedCount,
    0
  );

  assert.equal(
    reset.physicalDelete,
    false
  );

  assert.equal(
    reset.auditEventId,
    "audit-r7o-r3b"
  );

  assert.equal(
    auditInput.action,
    "BROKER_TRANSACTION_HISTORY_RESET"
  );

  assert.equal(
    auditInput.targetType,
    "BROKER_TRANSACTION_HISTORY"
  );

  assert.equal(
    auditInput.targetId,
    "synthetic-investor"
  );

  assert.equal(
    auditInput.beforeState
      .authorityGeneration,
    1
  );

  assert.equal(
    auditInput.beforeState
      .executionCount,
    2
  );

  assert.equal(
    auditInput.afterState
      .authorityGeneration,
    2
  );

  assert.equal(
    auditInput.afterState
      .executionCount,
    0
  );

  assert.equal(
    auditInput.metadata.scope,
    "TARGET_BROKER_ACCOUNT_ONLY"
  );

  assert.equal(
    auditInput.metadata
      .previousGeneration,
    1
  );

  assert.equal(
    auditInput.metadata
      .currentGeneration,
    2
  );

  assert.equal(
    auditInput.metadata
      .archivedExecutionCount,
    2
  );

  assert.equal(
    auditInput.metadata
      .deletedCount,
    0
  );

  assert.equal(
    auditInput.metadata
      .physicalDelete,
    false
  );

  assert.equal(
    client.queries.some(
      sql =>
        /^DELETE\b/i.test(sql) ||
        /\bDELETE\s+FROM\b/i.test(sql)
    ),
    false
  );

  assert.equal(
    client.queries.some(
      sql =>
        /UPDATE\s+public\.investor_broker_transaction_history_authority/i.test(
          sql
        )
    ),
    true
  );

  assert.equal(
    client.released,
    true
  );

  console.log(
    "GENERATION_ADVANCE=PASS"
  );

  console.log(
    "PHYSICAL_DELETE=NONE"
  );

  console.log(
    "AUDIT_GENERATION_EVIDENCE=PASS"
  );
}

{
  const client =
    makeClient();

  let auditCalled = false;

  await assert.rejects(
    () =>
      resetAdminBrokerTransactionHistory(
        {
          actorUserId:
            "admin-1",

          targetUserId:
            "synthetic-investor",

          brokerLinkId:
            "synthetic-link",

          observedGeneration:
            1,

          reason:
            "Stale test",

          confirmed:
            true
        },
        {
          poolOverride:
            makePool(client),

          lockBrokerContext:
            async () => context,

          getOrCreateAuthority:
            async () => ({
              currentGeneration: 2
            }),

          listHistory:
            async () => {
              throw new Error(
                "History must not be read after stale authority rejection."
              );
            },

          appendAudit:
            async () => {
              auditCalled = true;
            }
        }
      ),
    error =>
      error?.code ===
        "STALE_TRANSACTION_HISTORY_GENERATION" &&
      error?.observedGeneration === 1 &&
      error?.currentGeneration === 2
  );

  assert.equal(
    auditCalled,
    false
  );

  assert.equal(
    client.queries.some(
      sql =>
        /UPDATE\s+public\.investor_broker_transaction_history_authority/i.test(
          sql
        )
    ),
    false
  );

  assert.equal(
    client.queries.some(
      sql =>
        sql === "ROLLBACK"
    ),
    true
  );

  console.log(
    "STALE_GENERATION_REJECTED=PASS"
  );
}

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
            "synthetic-investor",

          brokerLinkId:
            "synthetic-link",

          observedGeneration:
            1,

          reason:
            "No confirmation",

          confirmed:
            false
        },
        {
          poolOverride:
            makePool(client)
        }
      ),
    error =>
      error?.code ===
      "TRANSACTION_HISTORY_RESET_CONFIRMATION_REQUIRED"
  );

  assert.equal(
    client.queries.length,
    0
  );

  console.log(
    "CONFIRMATION_REQUIRED=PASS"
  );
}

console.log(
  "R7O_R3B_SYNTHETIC_RESULT=PASS"
);
