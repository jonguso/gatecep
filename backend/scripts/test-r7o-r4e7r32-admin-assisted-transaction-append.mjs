import assert from "node:assert/strict";

import {
  appendAdminAssistedTransactionHistory
} from "../src/modules/admin/adminAssistedTransactionHistoryAppend.service.js";

console.log(
  "===== R7O-R4E7R32 — ISOLATED SERVICE TEST ====="
);

const calls = [];

const context = {
  target: {
    id: "investor-1"
  },

  broker: {
    id: "broker-link-1",
    broker: "AIB-AXYS",
    clientNumber: "137971"
  },

  brokerAccountKey:
    "AIB|137971"
};

const result =
  await appendAdminAssistedTransactionHistory(
    {
      actorUserId:
        "admin-1",

      targetUserId:
        "investor-1",

      brokerLinkId:
        "broker-link-1",

      observedGeneration:
        1,

      executions: [
        {
          executionIdentity:
            "AIB|137971|ORDER-1",

          exchangeOrderNo:
            "ORDER-1",

          symbol:
            "SCOM",

          side:
            "BUY",

          totalTradedQuantity:
            100,

          executionPrice:
            25,

          executionDate:
            "2026-10-26",

          historicalExecutionState:
            "READY",

          executionConfirmed:
            true,

          fifoEligible:
            true,

          canAffectFifo:
            true
        }
      ],

      sourceFileName:
        "order-history-52470471.csv"
    },
    {
      getAdminReconciliationBroker:
        async (input) => {
          calls.push([
            "context",
            input
          ]);

          return context;
        },

      loadAuthenticatedInvestorTransactionHistory:
        async (input) => {
          calls.push([
            "read",
            input
          ]);

          return {
            userId:
              "investor-1",

            brokerLinkId:
              "broker-link-1",

            brokerAccountKey:
              "AIB|137971",

            authorityEstablished:
              true,

            currentGeneration:
              1,

            count:
              0,

            history:
              []
          };
        },

      appendAuthenticatedInvestorTransactionHistory:
        async (input) => {
          calls.push([
            "append",
            input
          ]);

          assert.equal(
            input.authenticatedUserId,
            "investor-1"
          );

          assert.notEqual(
            input.authenticatedUserId,
            "admin-1"
          );

          assert.equal(
            input.brokerLinkId,
            "broker-link-1"
          );

          assert.equal(
            input.observedGeneration,
            1
          );

          return {
            userId:
              "investor-1",

            brokerLinkId:
              "broker-link-1",

            brokerAccountKey:
              "AIB|137971",

            currentGeneration:
              1,

            receivedCount:
              1,

            insertedCount:
              1,

            existingCount:
              0,

            insertedRecords:
              []
          };
        },

      appendAdminAuditEvent:
        async (input) => {
          calls.push([
            "audit",
            input
          ]);

          assert.equal(
            input.actorUserId,
            "admin-1"
          );

          assert.equal(
            input.metadata.targetUserId,
            "investor-1"
          );

          assert.equal(
            input.reason,
            "ADMIN_ASSISTED_TRANSACTION_HISTORY_UPLOAD"
          );

          return {
            id:
              "audit-1"
          };
        }
    }
  );

assert.equal(
  result.actorUserId,
  "admin-1"
);

assert.equal(
  result.targetUserId,
  "investor-1"
);

assert.equal(
  result.insertedCount,
  1
);

assert.equal(
  result.auditEventId,
  "audit-1"
);

assert.deepEqual(
  calls.map(
    ([name]) => name
  ),
  [
    "context",
    "read",
    "append",
    "audit"
  ]
);

console.log(
  "ADMIN_ACTOR_SEPARATE_FROM_TARGET=PASS"
);

console.log(
  "SERVER_VALIDATED_TARGET_BROKER=PASS"
);

console.log(
  "CANONICAL_READ_BEFORE_APPEND=PASS"
);

console.log(
  "CANONICAL_APPEND_TARGETS_INVESTOR=PASS"
);

console.log(
  "AUTOMATIC_AUDIT_REASON=PASS"
);

console.log(
  "R7O_R4E7R32_SERVICE_TEST=PASS"
);
