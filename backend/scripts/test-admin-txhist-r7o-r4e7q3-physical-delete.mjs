import assert from "node:assert/strict";

import {
  resetAdminBrokerTransactionHistory
} from "../src/modules/admin/adminBrokerTransactionHistoryReset.service.js";

import {
  computeTransactionHistoryStateSha256,
  safeBackupEvidence
} from "../src/modules/admin/adminBrokerTransactionHistoryBackup.service.js";

const ACTOR =
  "admin-user";

const TARGET =
  "investor-user";

const ABC_LINK =
  "abc-link";

const ABC_KEY =
  "ABC|23032";

const AIB_LINK =
  "aib-link";

const AIB_KEY =
  "AIB|137971";

const CURRENT_GENERATION =
  2;

function makeRows(
  {
    count,
    brokerLinkId,
    brokerAccountKey,
    generation = 1,
    prefix
  }
) {
  return Array.from(
    { length: count },
    (_, index) => {
      const n =
        index + 1;

      return {
        id:
          `${prefix}-id-${n}`,

        authorityGeneration:
          generation,

        executionIdentity:
          `${prefix}-order-${n}`,

        exchangeOrderNo:
          `${prefix}-order-${n}`,

        symbol:
          n % 2 === 0
            ? "SCOM"
            : "KCB",

        side:
          n % 2 === 0
            ? "BUY"
            : "SELL",

        totalTradedQuantity:
          n + 10,

        executionPrice:
          10 + n / 100,

        executionDate:
          `2026-01-${String(
            ((n - 1) % 28) + 1
          ).padStart(2, "0")}`,

        historicalExecutionState:
          "READY",

        executionConfirmed:
          true,

        fifoEligible:
          true,

        canAffectFifo:
          true,

        descriptiveOrderStatus:
          "FILLED",

        source:
          "BROKER_UPLOAD",

        sourceFileName:
          `${prefix}.csv`,

        sourceFileSha256:
          "a".repeat(64),

        sourceRowNumber:
          n,

        rawEvidence: {
          row:
            n,

          brokerLinkId,

          brokerAccountKey
        },

        verificationMetadata: {
          verified:
            true,

          nested: {
            b:
              n,

            a:
              prefix
          }
        },

        createdAt:
          `2026-01-${String(
            ((n - 1) % 28) + 1
          ).padStart(2, "0")}T12:00:00.000Z`
      };
    }
  );
}

function stateSha(
  {
    rows,
    brokerLinkId = ABC_LINK,
    brokerAccountKey = ABC_KEY,
    currentGeneration = CURRENT_GENERATION
  }
) {
  return computeTransactionHistoryStateSha256({
    targetUserId:
      TARGET,

    brokerLinkId,

    brokerAccountKey,

    currentGeneration,

    executions:
      rows.map(
        safeBackupEvidence
      )
  });
}

function createHarness(
  {
    abcCount = 58,
    aibCount = 319,
    currentGeneration = CURRENT_GENERATION,
    deleteCountOverride = null,
    leaveRowsAfterDelete = 0,
    auditFailure = false,
    dependencyFailure = null
  } = {}
) {
  let abcRows =
    makeRows({
      count:
        abcCount,

      brokerLinkId:
        ABC_LINK,

      brokerAccountKey:
        ABC_KEY,

      generation:
        1,

      prefix:
        "ABC"
    });

  let aibRows =
    makeRows({
      count:
        aibCount,

      brokerLinkId:
        AIB_LINK,

      brokerAccountKey:
        AIB_KEY,

      generation:
        1,

      prefix:
        "AIB"
    });

  const initialAbcRows =
    structuredClone(
      abcRows
    );

  const initialAibRows =
    structuredClone(
      aibRows
    );

  const calls = [];

  let released =
    false;

  let committed =
    false;

  let rolledBack =
    false;

  let transactionSnapshot =
    null;

  const client = {
    async query(sql) {
      const command =
        String(sql)
          .trim()
          .toUpperCase();

      calls.push(
        `SQL:${command}`
      );

      if (command === "BEGIN") {
        transactionSnapshot = {
          abcRows:
            structuredClone(
              abcRows
            ),

          aibRows:
            structuredClone(
              aibRows
            )
        };

        return {
          rowCount:
            null,

          rows:
            []
        };
      }

      if (command === "COMMIT") {
        committed =
          true;

        transactionSnapshot =
          null;

        return {
          rowCount:
            null,

          rows:
            []
        };
      }

      if (command === "ROLLBACK") {
        rolledBack =
          true;

        if (transactionSnapshot) {
          abcRows =
            structuredClone(
              transactionSnapshot.abcRows
            );

          aibRows =
            structuredClone(
              transactionSnapshot.aibRows
            );
        }

        transactionSnapshot =
          null;

        return {
          rowCount:
            null,

          rows:
            []
        };
      }

      throw new Error(
        `Unexpected synthetic SQL: ${sql}`
      );
    },

    release() {
      released =
        true;

      calls.push(
        "CLIENT:RELEASE"
      );
    }
  };

  const poolOverride = {
    async connect() {
      calls.push(
        "POOL:CONNECT"
      );

      return client;
    }
  };

  async function lockBrokerContext(
    {
      targetUserId,
      brokerLinkId
    },
    queryable
  ) {
    calls.push(
      `LOCK:${targetUserId}:${brokerLinkId}`
    );

    assert.equal(
      queryable,
      client
    );

    if (
      dependencyFailure ===
      "LOCK"
    ) {
      throw new Error(
        "Synthetic lock failure"
      );
    }

    assert.equal(
      targetUserId,
      TARGET
    );

    assert.equal(
      brokerLinkId,
      ABC_LINK
    );

    return {
      target: {
        id:
          TARGET
      },

      broker: {
        id:
          ABC_LINK
      },

      brokerAccountKey:
        ABC_KEY
    };
  }

  async function getOrCreateAuthority(
    scope,
    queryable
  ) {
    calls.push(
      "AUTHORITY:LOCK"
    );

    assert.equal(
      queryable,
      client
    );

    assert.deepEqual(
      scope,
      {
        userId:
          TARGET,

        brokerLinkId:
          ABC_LINK,

        brokerAccountKey:
          ABC_KEY
      }
    );

    if (
      dependencyFailure ===
      "AUTHORITY"
    ) {
      throw new Error(
        "Synthetic authority failure"
      );
    }

    return {
      currentGeneration
    };
  }

  async function listHistory(
    scope,
    queryable
  ) {
    calls.push(
      `LIST:${scope.brokerAccountKey}`
    );

    assert.equal(
      queryable,
      client
    );

    if (
      dependencyFailure ===
      "LIST"
    ) {
      throw new Error(
        "Synthetic list failure"
      );
    }

    if (
      scope.userId === TARGET &&
      scope.brokerLinkId === ABC_LINK &&
      scope.brokerAccountKey === ABC_KEY
    ) {
      return structuredClone(
        abcRows
      );
    }

    if (
      scope.userId === TARGET &&
      scope.brokerLinkId === AIB_LINK &&
      scope.brokerAccountKey === AIB_KEY
    ) {
      return structuredClone(
        aibRows
      );
    }

    throw new Error(
      "Synthetic cross-account scope rejected"
    );
  }

  async function deleteHistory(
    scope,
    queryable
  ) {
    calls.push(
      `DELETE:${scope.brokerAccountKey}`
    );

    assert.equal(
      queryable,
      client
    );

    assert.deepEqual(
      scope,
      {
        userId:
          TARGET,

        brokerLinkId:
          ABC_LINK,

        brokerAccountKey:
          ABC_KEY
      }
    );

    if (
      dependencyFailure ===
      "DELETE"
    ) {
      throw new Error(
        "Synthetic delete failure"
      );
    }

    const actualBefore =
      abcRows.length;

    const reportedDeletedCount =
      deleteCountOverride === null
        ? actualBefore
        : deleteCountOverride;

    abcRows =
      leaveRowsAfterDelete > 0
        ? abcRows.slice(
            0,
            leaveRowsAfterDelete
          )
        : [];

    return {
      userId:
        TARGET,

      brokerLinkId:
        ABC_LINK,

      brokerAccountKey:
        ABC_KEY,

      deletedCount:
        reportedDeletedCount,

      deletedRows:
        []
    };
  }

  async function appendAudit(
    event,
    queryable
  ) {
    calls.push(
      "AUDIT:APPEND"
    );

    assert.equal(
      queryable,
      client
    );

    if (
      auditFailure ||
      dependencyFailure ===
        "AUDIT"
    ) {
      throw new Error(
        "Synthetic audit failure"
      );
    }

    assert.equal(
      event.actorUserId,
      ACTOR
    );

    assert.equal(
      event.action,
      "BROKER_TRANSACTION_HISTORY_PHYSICALLY_DELETED"
    );

    assert.equal(
      event.targetType,
      "INVESTOR_BROKER_TRANSACTION_HISTORY"
    );

    assert.equal(
      event.targetId,
      TARGET
    );

    assert.deepEqual(
      event.beforeState,
      {
        brokerLinkId:
          ABC_LINK,

        brokerAccountKey:
          ABC_KEY,

        currentGeneration,

        physicalExecutionCount:
          abcCount,

        historyStateSha256:
          stateSha({
            rows:
              initialAbcRows,

            currentGeneration
          }),

        generations:
          abcCount > 0
            ? [1]
            : []
      }
    );

    assert.deepEqual(
      event.afterState,
      {
        brokerLinkId:
          ABC_LINK,

        brokerAccountKey:
          ABC_KEY,

        currentGeneration,

        physicalExecutionCount:
          0
      }
    );

    assert.equal(
      event.reason,
      "Synthetic Admin Transaction History maintenance test"
    );

    assert.equal(
      event.metadata.source,
      "ADMIN_TRANSACTION_HISTORY_MAINTENANCE"
    );

    assert.equal(
      event.metadata.resetModel,
      "PHYSICAL_DELETE_AFTER_BACKUP"
    );

    assert.equal(
      event.metadata.physicalDelete,
      true
    );

    assert.equal(
      event.metadata.targetUserId,
      TARGET
    );

    assert.equal(
      event.metadata.brokerLinkId,
      ABC_LINK
    );

    assert.equal(
      event.metadata.brokerAccountKey,
      ABC_KEY
    );

    assert.equal(
      event.metadata.currentGeneration,
      currentGeneration
    );

    assert.equal(
      event.metadata.physicalExecutionCountBefore,
      abcCount
    );

    assert.equal(
      event.metadata.physicalExecutionCountAfter,
      0
    );

    assert.equal(
      event.metadata.deletedCount,
      abcCount
    );

    assert.deepEqual(
      event.metadata.generationsDeleted,
      abcCount > 0
        ? [1]
        : []
    );

    return {
      id:
        "audit-event-1"
    };
  }

  const dependencies = {
    poolOverride,
    lockBrokerContext,
    getOrCreateAuthority,
    listHistory,
    deleteHistory,
    appendAudit
  };

  return {
    dependencies,

    calls,

    currentGeneration,

    initialAbcRows,

    initialAibRows,

    getAbcRows:
      () =>
        structuredClone(
          abcRows
        ),

    getAibRows:
      () =>
        structuredClone(
          aibRows
        ),

    wasReleased:
      () =>
        released,

    wasCommitted:
      () =>
        committed,

    wasRolledBack:
      () =>
        rolledBack
  };
}

function requestFor(
  harness,
  overrides = {}
) {
  const rows =
    harness.initialAbcRows;

  return {
    actorUserId:
      ACTOR,

    targetUserId:
      TARGET,

    brokerLinkId:
      ABC_LINK,

    observedGeneration:
      harness.currentGeneration,

    physicalExecutionCount:
      rows.length,

    historyStateSha256:
      stateSha({
        rows,
        currentGeneration:
          harness.currentGeneration
      }),

    reason:
      "Synthetic Admin Transaction History maintenance test",

    confirmed:
      true,

    ...overrides
  };
}

async function expectError(
  label,
  {
    harness,
    request,
    code
  }
) {
  let caught =
    null;

  try {
    await resetAdminBrokerTransactionHistory(
      request,
      harness.dependencies
    );
  } catch (error) {
    caught =
      error;
  }

  assert.ok(
    caught,
    `${label}: expected error`
  );

  if (code) {
    assert.equal(
      caught.code,
      code,
      `${label}: unexpected error code`
    );
  }

  return caught;
}

let failures =
  0;

async function test(
  name,
  fn
) {
  try {
    await fn();

    console.log(
      `${name}=PASS`
    );
  } catch (error) {
    failures +=
      1;

    console.log(
      `${name}=FAIL`
    );

    console.log(
      error?.stack ||
      error
    );
  }
}

/*
 * ------------------------------------------------------------
 * 1. Happy path: ABC-like 58 -> 0, AIB-like 319 untouched.
 * ------------------------------------------------------------
 */
await test(
  "SUCCESS_ABC_58_TO_ZERO_AIB_319_UNTOUCHED",
  async () => {
    const harness =
      createHarness();

    const result =
      await resetAdminBrokerTransactionHistory(
        requestFor(
          harness
        ),
        harness.dependencies
      );

    assert.equal(
      result.resetModel,
      "PHYSICAL_DELETE_AFTER_BACKUP"
    );

    assert.equal(
      result.validationOnly,
      false
    );

    assert.equal(
      result.physicalDelete,
      true
    );

    assert.equal(
      result.deletedCount,
      58
    );

    assert.equal(
      result.physicalExecutionCount,
      58
    );

    assert.equal(
      result.physicalExecutionCountAfter,
      0
    );

    assert.equal(
      result.currentGeneration,
      2
    );

    assert.deepEqual(
      result.generationsDeleted,
      [1]
    );

    assert.equal(
      result.auditEventId,
      "audit-event-1"
    );

    assert.equal(
      harness.getAbcRows().length,
      0
    );

    assert.equal(
      harness.getAibRows().length,
      319
    );

    assert.equal(
      harness.wasCommitted(),
      true
    );

    assert.equal(
      harness.wasRolledBack(),
      false
    );

    assert.equal(
      harness.wasReleased(),
      true
    );

    assert.deepEqual(
      harness.calls,
      [
        "POOL:CONNECT",
        "SQL:BEGIN",
        `LOCK:${TARGET}:${ABC_LINK}`,
        "AUTHORITY:LOCK",
        `LIST:${ABC_KEY}`,
        `DELETE:${ABC_KEY}`,
        `LIST:${ABC_KEY}`,
        "AUDIT:APPEND",
        "SQL:COMMIT",
        "CLIENT:RELEASE"
      ]
    );
  }
);

/*
 * ------------------------------------------------------------
 * 2. Stale generation must fail before delete.
 * ------------------------------------------------------------
 */
await test(
  "STALE_GENERATION_BLOCKS_DELETE",
  async () => {
    const harness =
      createHarness();

    await expectError(
      "STALE_GENERATION",
      {
        harness,

        request:
          requestFor(
            harness,
            {
              observedGeneration:
                1
            }
          ),

        code:
          "STALE_TRANSACTION_HISTORY_GENERATION"
      }
    );

    assert.equal(
      harness.calls.some(
        value =>
          value.startsWith(
            "DELETE:"
          )
      ),
      false
    );

    assert.equal(
      harness.getAbcRows().length,
      58
    );

    assert.equal(
      harness.getAibRows().length,
      319
    );

    assert.equal(
      harness.wasRolledBack(),
      true
    );
  }
);

/*
 * ------------------------------------------------------------
 * 3. Stale physical count must fail before delete.
 * ------------------------------------------------------------
 */
await test(
  "STALE_PHYSICAL_COUNT_BLOCKS_DELETE",
  async () => {
    const harness =
      createHarness();

    await expectError(
      "STALE_COUNT",
      {
        harness,

        request:
          requestFor(
            harness,
            {
              physicalExecutionCount:
                57
            }
          ),

        code:
          "TRANSACTION_HISTORY_BACKUP_PHYSICAL_COUNT_STALE"
      }
    );

    assert.equal(
      harness.calls.some(
        value =>
          value.startsWith(
            "DELETE:"
          )
      ),
      false
    );

    assert.equal(
      harness.getAbcRows().length,
      58
    );
  }
);

/*
 * ------------------------------------------------------------
 * 4. Stale SHA must fail before delete.
 * ------------------------------------------------------------
 */
await test(
  "STALE_STATE_SHA_BLOCKS_DELETE",
  async () => {
    const harness =
      createHarness();

    await expectError(
      "STALE_SHA",
      {
        harness,

        request:
          requestFor(
            harness,
            {
              historyStateSha256:
                "f".repeat(64)
            }
          ),

        code:
          "TRANSACTION_HISTORY_BACKUP_STATE_STALE"
      }
    );

    assert.equal(
      harness.calls.some(
        value =>
          value.startsWith(
            "DELETE:"
          )
      ),
      false
    );

    assert.equal(
      harness.getAbcRows().length,
      58
    );
  }
);

/*
 * ------------------------------------------------------------
 * 5. Wrong delete count must roll back.
 * ------------------------------------------------------------
 */
await test(
  "DELETE_COUNT_MISMATCH_ROLLS_BACK",
  async () => {
    const harness =
      createHarness({
        deleteCountOverride:
          57
      });

    await expectError(
      "DELETE_COUNT_MISMATCH",
      {
        harness,

        request:
          requestFor(
            harness
          ),

        code:
          "TRANSACTION_HISTORY_DELETE_COUNT_MISMATCH"
      }
    );

    assert.equal(
      harness.wasCommitted(),
      false
    );

    assert.equal(
      harness.wasRolledBack(),
      true
    );

    assert.equal(
      harness.getAbcRows().length,
      58
    );

    assert.equal(
      harness.getAibRows().length,
      319
    );

    assert.equal(
      harness.calls.includes(
        "AUDIT:APPEND"
      ),
      false
    );
  }
);

/*
 * ------------------------------------------------------------
 * 6. Rows remaining after delete must roll back.
 * ------------------------------------------------------------
 */
await test(
  "POST_DELETE_NONZERO_ROLLS_BACK",
  async () => {
    const harness =
      createHarness({
        leaveRowsAfterDelete:
          1
      });

    await expectError(
      "POST_DELETE_NONZERO",
      {
        harness,

        request:
          requestFor(
            harness
          ),

        code:
          "TRANSACTION_HISTORY_DELETE_INCOMPLETE"
      }
    );

    assert.equal(
      harness.wasCommitted(),
      false
    );

    assert.equal(
      harness.wasRolledBack(),
      true
    );

    assert.equal(
      harness.getAbcRows().length,
      58
    );

    assert.equal(
      harness.getAibRows().length,
      319
    );

    assert.equal(
      harness.calls.includes(
        "AUDIT:APPEND"
      ),
      false
    );
  }
);

/*
 * ------------------------------------------------------------
 * 7. Audit failure must roll back successful physical delete.
 * ------------------------------------------------------------
 */
await test(
  "AUDIT_FAILURE_ROLLS_BACK_DELETE",
  async () => {
    const harness =
      createHarness({
        auditFailure:
          true
      });

    await expectError(
      "AUDIT_FAILURE",
      {
        harness,

        request:
          requestFor(
            harness
          )
      }
    );

    assert.equal(
      harness.wasCommitted(),
      false
    );

    assert.equal(
      harness.wasRolledBack(),
      true
    );

    assert.equal(
      harness.getAbcRows().length,
      58
    );

    assert.equal(
      harness.getAibRows().length,
      319
    );
  }
);

/*
 * ------------------------------------------------------------
 * 8. Explicit confirmation remains mandatory.
 * ------------------------------------------------------------
 */
await test(
  "CONFIRMATION_REQUIRED_BEFORE_DATABASE",
  async () => {
    const harness =
      createHarness();

    await expectError(
      "CONFIRMATION_REQUIRED",
      {
        harness,

        request:
          requestFor(
            harness,
            {
              confirmed:
                false
            }
          ),

        code:
          "TRANSACTION_HISTORY_RESET_CONFIRMATION_REQUIRED"
      }
    );

    assert.deepEqual(
      harness.calls,
      []
    );
  }
);

/*
 * ------------------------------------------------------------
 * 9. Reason remains mandatory.
 * ------------------------------------------------------------
 */
await test(
  "REASON_REQUIRED_BEFORE_DATABASE",
  async () => {
    const harness =
      createHarness();

    await expectError(
      "REASON_REQUIRED",
      {
        harness,

        request:
          requestFor(
            harness,
            {
              reason:
                "x"
            }
          ),

        code:
          "TRANSACTION_HISTORY_RESET_REASON_INVALID"
      }
    );

    assert.deepEqual(
      harness.calls,
      []
    );
  }
);

/*
 * ------------------------------------------------------------
 * 10. Admin cannot target self.
 * ------------------------------------------------------------
 */
await test(
  "ACTOR_TARGET_CONFLICT_BEFORE_DATABASE",
  async () => {
    const harness =
      createHarness();

    await expectError(
      "ACTOR_TARGET_CONFLICT",
      {
        harness,

        request:
          requestFor(
            harness,
            {
              actorUserId:
                TARGET
            }
          ),

        code:
          "TRANSACTION_HISTORY_RESET_ACTOR_TARGET_CONFLICT"
      }
    );

    assert.deepEqual(
      harness.calls,
      []
    );
  }
);

/*
 * ------------------------------------------------------------
 * 11. Delete dependency failure rolls back.
 * ------------------------------------------------------------
 */
await test(
  "DELETE_DEPENDENCY_FAILURE_ROLLS_BACK",
  async () => {
    const harness =
      createHarness({
        dependencyFailure:
          "DELETE"
      });

    await expectError(
      "DELETE_DEPENDENCY_FAILURE",
      {
        harness,

        request:
          requestFor(
            harness
          )
      }
    );

    assert.equal(
      harness.wasRolledBack(),
      true
    );

    assert.equal(
      harness.wasCommitted(),
      false
    );

    assert.equal(
      harness.getAbcRows().length,
      58
    );

    assert.equal(
      harness.getAibRows().length,
      319
    );
  }
);

/*
 * ------------------------------------------------------------
 * 12. Exact-account isolation: synthetic AIB cannot be touched.
 * ------------------------------------------------------------
 */
await test(
  "EXACT_ACCOUNT_SCOPE_ONLY",
  async () => {
    const harness =
      createHarness();

    await resetAdminBrokerTransactionHistory(
      requestFor(
        harness
      ),
      harness.dependencies
    );

    const deleteCalls =
      harness.calls.filter(
        value =>
          value.startsWith(
            "DELETE:"
          )
      );

    assert.deepEqual(
      deleteCalls,
      [
        `DELETE:${ABC_KEY}`
      ]
    );

    assert.equal(
      harness.getAibRows().length,
      319
    );
  }
);

console.log(
  `SYNTHETIC_TEST_FAILURES=${failures}`
);

if (failures > 0) {
  process.exitCode =
    1;
}
