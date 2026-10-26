import assert from "node:assert/strict";

import {
  createInvestorTransactionHistoryAppendHandler
} from "../src/modules/transaction-history/investorBrokerTransactionHistoryAppend.controller.js";

function makeResponse() {
  return {
    statusCode: 200,
    payload: null,

    status(code) {
      this.statusCode =
        code;

      return this;
    },

    json(payload) {
      this.payload =
        payload;

      return this;
    }
  };
}

const AUTH_USER =
  "11111111-1111-1111-1111-111111111111";

const BROKER_LINK =
  "33333333-3333-3333-3333-333333333333";

const execution = {
  executionIdentity:
    "AIB|137971|ORDER-001",

  exchangeOrderNo:
    "ORDER-001",

  symbol:
    "SCOM",

  side:
    "BUY",

  totalTradedQuantity:
    100,

  executionPrice:
    25.5,

  executionDate:
    "2026-10-26",

  historicalExecutionState:
    "READY",

  executionConfirmed:
    true,

  fifoEligible:
    true,

  canAffectFifo:
    true,

  descriptiveOrderStatus:
    "FULLY TRADED",

  source:
    "TRANSACTION_UPLOAD"
};

let captured = null;

const handler =
  createInvestorTransactionHistoryAppendHandler({
    append:
      async input => {
        captured =
          input;

        return {
          userId:
            input.authenticatedUserId,

          brokerLinkId:
            input.brokerLinkId,

          brokerAccountKey:
            "AIB|137971",

          currentGeneration:
            input.observedGeneration,

          receivedCount:
            input.executions.length,

          insertedCount:
            input.executions.length,

          existingCount:
            0,

          insertedRecords:
            []
        };
      }
  });

{
  const req = {
    user: {
      id:
        AUTH_USER
    },

    body: {
      brokerLinkId:
        BROKER_LINK,

      observedGeneration:
        1,

      executions: [
        execution
      ]
    }
  };

  const res =
    makeResponse();

  await handler(
    req,
    res
  );

  assert.equal(
    res.statusCode,
    200
  );

  assert.equal(
    res.payload?.ok,
    true
  );

  assert.equal(
    captured?.authenticatedUserId,
    AUTH_USER
  );

  assert.equal(
    captured?.brokerLinkId,
    BROKER_LINK
  );

  assert.equal(
    captured?.observedGeneration,
    1
  );

  assert.equal(
    captured?.executions?.length,
    1
  );

  console.log(
    "AUTHENTICATED_APPEND_TRANSPORT=PASS"
  );
}

{
  const req = {
    user: {
      id:
        AUTH_USER
    },

    body: {
      userId:
        "attacker-user",

      brokerLinkId:
        BROKER_LINK,

      observedGeneration:
        1,

      executions: [
        execution
      ]
    }
  };

  const res =
    makeResponse();

  await handler(
    req,
    res
  );

  assert.equal(
    res.statusCode,
    403
  );

  assert.equal(
    res.payload?.ok,
    false
  );

  assert.equal(
    res.payload?.error?.code,
    "CLIENT_TRANSACTION_HISTORY_IDENTITY_REJECTED"
  );

  console.log(
    "CLIENT_USER_ID_REJECTED=PASS"
  );
}

{
  const req = {
    user: {
      id:
        AUTH_USER
    },

    body: {
      brokerAccountKey:
        "ABC|OTHER",

      brokerLinkId:
        BROKER_LINK,

      observedGeneration:
        1,

      executions: [
        execution
      ]
    }
  };

  const res =
    makeResponse();

  await handler(
    req,
    res
  );

  assert.equal(
    res.statusCode,
    403
  );

  assert.equal(
    res.payload?.error?.code,
    "CLIENT_TRANSACTION_HISTORY_IDENTITY_REJECTED"
  );

  console.log(
    "CLIENT_BROKER_ACCOUNT_KEY_REJECTED=PASS"
  );
}

{
  const req = {
    user: {
      id:
        AUTH_USER
    },

    body: {
      brokerLinkId:
        BROKER_LINK,

      observedGeneration:
        0,

      executions: [
        execution
      ]
    }
  };

  const res =
    makeResponse();

  await handler(
    req,
    res
  );

  assert.equal(
    res.statusCode,
    400
  );

  assert.equal(
    res.payload?.error?.code,
    "OBSERVED_GENERATION_REQUIRED"
  );

  console.log(
    "INVALID_OBSERVED_GENERATION_REJECTED=PASS"
  );
}

{
  const req = {
    user: {
      id:
        AUTH_USER
    },

    body: {
      brokerLinkId:
        BROKER_LINK,

      observedGeneration:
        1,

      executions:
        []
    }
  };

  const res =
    makeResponse();

  await handler(
    req,
    res
  );

  assert.equal(
    res.statusCode,
    400
  );

  assert.equal(
    res.payload?.error?.code,
    "HISTORICAL_EXECUTIONS_REQUIRED"
  );

  console.log(
    "EMPTY_EXECUTION_BATCH_REJECTED=PASS"
  );
}

{
  const staleHandler =
    createInvestorTransactionHistoryAppendHandler({
      append:
        async () => {
          const error =
            new Error(
              "Transaction History generation is stale."
            );

          error.code =
            "STALE_TRANSACTION_HISTORY_GENERATION";

          throw error;
        }
    });

  const req = {
    user: {
      id:
        AUTH_USER
    },

    body: {
      brokerLinkId:
        BROKER_LINK,

      observedGeneration:
        1,

      executions: [
        execution
      ]
    }
  };

  const res =
    makeResponse();

  await staleHandler(
    req,
    res
  );

  assert.equal(
    res.statusCode,
    409
  );

  assert.equal(
    res.payload?.error?.code,
    "STALE_TRANSACTION_HISTORY_GENERATION"
  );

  console.log(
    "STALE_GENERATION_CONFLICT=PASS"
  );
}

console.log(
  "R7O_R4E7R15_TRANSPORT_TEST=PASS"
);
