import assert from "node:assert/strict";

import {
  createInvestorTransactionHistoryBootstrapHandler
} from "../src/modules/transaction-history/investorBrokerTransactionHistoryBootstrap.controller.js";

const USER =
  "user-investor";

const HASH =
  "2b6198f6e154add84f31ea97d57b58a32b38f84cb90b41dacd9c7c532d53f508";

function execution(
  brokerAccountKey,
  exchangeOrderNo
) {
  return {
    brokerAccountKey,
    exchangeOrderNo,
    executionIdentity:
      exchangeOrderNo,
    symbol:
      "SCOM",
    side:
      "BUY",
    totalTradedQuantity:
      10,
    executionPrice:
      30.95,
    executionDate:
      "2026-01-02",
    historicalExecutionState:
      "READY",
    executionConfirmed:
      true,
    fifoEligible:
      true,
    canAffectFifo:
      true
  };
}

function validBody() {
  return {
    observedGeneration: 1,

    expectedEvidenceSha256:
      HASH,

    partitions: [
      {
        brokerLinkId:
          "link-aib",

        executions: [
          execution(
            "AIB|137971",
            "AIB-1"
          )
        ]
      },

      {
        brokerLinkId:
          "link-abc",

        executions: [
          execution(
            "ABC|23032",
            "ABC-1"
          )
        ]
      }
    ]
  };
}

function responseRecorder() {
  const state = {
    statusCode: null,
    payload: null
  };

  return {
    state,

    response: {
      status(code) {
        state.statusCode =
          code;

        return this;
      },

      json(payload) {
        state.payload =
          payload;

        return payload;
      }
    }
  };
}

async function invoke({
  user = {
    id: USER
  },

  body =
    validBody(),

  bootstrap
} = {}) {
  const recorder =
    responseRecorder();

  const handler =
    createInvestorTransactionHistoryBootstrapHandler({
      bootstrap
    });

  await handler(
    {
      user,
      body
    },
    recorder.response
  );

  return recorder.state;
}

/*
 * Success contract:
 * one coordinator call,
 * authenticated user derived from req.user.id,
 * both partitions passed together.
 */
{
  const calls = [];

  const result =
    await invoke({
      bootstrap:
        async input => {
          calls.push(input);

          return {
            userId:
              input.authenticatedUserId,

            observedGeneration:
              input.observedGeneration,

            evidenceSha256:
              input.expectedEvidenceSha256,

            partitionCount:
              input.partitions.length,

            receivedCount:
              2,

            insertedCount:
              2,

            existingCount:
              0,

            partitions: []
          };
        }
    });

  assert.equal(
    result.statusCode,
    200
  );

  assert.equal(
    result.payload.ok,
    true
  );

  assert.equal(
    calls.length,
    1
  );

  assert.equal(
    calls[0].authenticatedUserId,
    USER
  );

  assert.equal(
    calls[0].observedGeneration,
    1
  );

  assert.equal(
    calls[0].expectedEvidenceSha256,
    HASH
  );

  assert.equal(
    calls[0].partitions.length,
    2
  );

  console.log(
    "AUTHENTICATED_USER_FROM_REQ_USER=PASS"
  );

  console.log(
    "TWO_PARTITIONS_ONE_COORDINATOR_CALL=PASS"
  );

  console.log(
    "EXPECTED_FINGERPRINT_FORWARDED=PASS"
  );
}

/*
 * No authenticated user.
 */
{
  let calls = 0;

  const result =
    await invoke({
      user: null,

      bootstrap:
        async () => {
          calls += 1;
        }
    });

  assert.equal(
    result.statusCode,
    401
  );

  assert.equal(
    calls,
    0
  );

  console.log(
    "UNAUTHENTICATED_REQUEST_REJECTED=PASS"
  );
}

/*
 * Client target-user injection.
 */
for (
  const field of [
    "userId",
    "targetUserId",
    "actorUserId",
    "authenticatedUserId"
  ]
) {
  let calls = 0;

  const body =
    validBody();

  body[field] =
    "other-user";

  const result =
    await invoke({
      body,

      bootstrap:
        async () => {
          calls += 1;
        }
    });

  assert.equal(
    result.statusCode,
    403
  );

  assert.equal(
    calls,
    0
  );
}

console.log(
  "CLIENT_TARGET_USER_FIELDS_REJECTED=PASS"
);

/*
 * Client authority generation injection.
 */
for (
  const field of [
    "authorityGeneration",
    "currentGeneration"
  ]
) {
  let calls = 0;

  const body =
    validBody();

  body[field] =
    999;

  const result =
    await invoke({
      body,

      bootstrap:
        async () => {
          calls += 1;
        }
    });

  assert.equal(
    result.statusCode,
    403
  );

  assert.equal(
    calls,
    0
  );
}

console.log(
  "CLIENT_AUTHORITY_GENERATION_REJECTED=PASS"
);

/*
 * observedGeneration required.
 */
{
  let calls = 0;

  const body =
    validBody();

  delete body.observedGeneration;

  const result =
    await invoke({
      body,

      bootstrap:
        async () => {
          calls += 1;
        }
    });

  assert.equal(
    result.statusCode,
    400
  );

  assert.equal(
    calls,
    0
  );

  console.log(
    "OBSERVED_GENERATION_REQUIRED_AT_TRANSPORT=PASS"
  );
}

/*
 * Fingerprint required.
 */
{
  let calls = 0;

  const body =
    validBody();

  delete body.expectedEvidenceSha256;

  const result =
    await invoke({
      body,

      bootstrap:
        async () => {
          calls += 1;
        }
    });

  assert.equal(
    result.statusCode,
    400
  );

  assert.equal(
    calls,
    0
  );

  console.log(
    "EXPECTED_FINGERPRINT_REQUIRED_AT_TRANSPORT=PASS"
  );
}

/*
 * Exactly two partitions.
 */
for (
  const partitions of [
    [],
    [
      validBody()
        .partitions[0]
    ],
    [
      ...validBody()
        .partitions,

      {
        brokerLinkId:
          "link-third",

        executions: [
          execution(
            "THIRD|1",
            "THIRD-1"
          )
        ]
      }
    ]
  ]
) {
  let calls = 0;

  const body =
    validBody();

  body.partitions =
    partitions;

  const result =
    await invoke({
      body,

      bootstrap:
        async () => {
          calls += 1;
        }
    });

  assert.equal(
    result.statusCode,
    400
  );

  assert.equal(
    calls,
    0
  );
}

console.log(
  "EXACTLY_TWO_PARTITIONS_REQUIRED=PASS"
);

/*
 * Duplicate broker partition rejected.
 */
{
  let calls = 0;

  const body =
    validBody();

  body.partitions[1].brokerLinkId =
    body.partitions[0].brokerLinkId;

  const result =
    await invoke({
      body,

      bootstrap:
        async () => {
          calls += 1;
        }
    });

  assert.equal(
    result.statusCode,
    400
  );

  assert.equal(
    calls,
    0
  );

  console.log(
    "DUPLICATE_BROKER_PARTITION_REJECTED=PASS"
  );
}

/*
 * Coordinator error mapping remains fail closed.
 */
{
  const result =
    await invoke({
      bootstrap:
        async () => {
          const error =
            new Error(
              "Historical evidence fingerprint mismatch."
            );

          error.code =
            "HISTORICAL_EVIDENCE_FINGERPRINT_MISMATCH";

          throw error;
        }
    });

  assert.equal(
    result.statusCode,
    409
  );

  assert.equal(
    result.payload.ok,
    false
  );

  assert.equal(
    result.payload.error.code,
    "HISTORICAL_EVIDENCE_FINGERPRINT_MISMATCH"
  );

  console.log(
    "FINGERPRINT_MISMATCH_FAILS_CLOSED_AT_TRANSPORT=PASS"
  );
}

{
  const result =
    await invoke({
      bootstrap:
        async () => {
          const error =
            new Error(
              "Stale transaction history generation."
            );

          error.code =
            "STALE_TRANSACTION_HISTORY_GENERATION";

          throw error;
        }
    });

  assert.equal(
    result.statusCode,
    409
  );

  assert.equal(
    result.payload.error.code,
    "STALE_TRANSACTION_HISTORY_GENERATION"
  );

  console.log(
    "STALE_GENERATION_FAILS_CLOSED_AT_TRANSPORT=PASS"
  );
}

console.log(
  "REAL_377_PAYLOAD_LOADED=NO"
);

console.log(
  "REAL_BOOTSTRAP_REQUEST=NONE"
);

console.log(
  "DATABASE_WRITE=NONE_SYNTHETIC_ONLY"
);

console.log(
  "ADMIN_TXHIST_004D4_R7M_TRANSPORT=PASS"
);
