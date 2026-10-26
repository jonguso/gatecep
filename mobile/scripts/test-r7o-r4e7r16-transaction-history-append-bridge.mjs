import assert from "node:assert/strict";

import {
  mapVerifiedHistoryEvidenceForServer,
  mapVerifiedHistoryBatchForServer
} from "../src/features/transactions/api/transactionHistoryCanonicalMapper.js";

const ACCOUNT =
  "AIB|137971";

const verified = {
  brokerAccountKey:
    ACCOUNT,

  brokerReference:
    "ORDER-001",

  exchangeOrderNo:
    "ORDER-001",

  executionDate:
    "2026-10-26",

  date:
    "2026-10-26",

  symbol:
    "SCOM",

  side:
    "BUY",

  quantity:
    100,

  totalTradedQuantity:
    100,

  price:
    25.5,

  status:
    "FULLY TRADED",

  historicalExecutionState:
    "EXECUTED_READY",

  executionConfirmed:
    true,

  fifoEligible:
    true,

  canAffectFifo:
    true,

  evidenceStatus:
    "VERIFIED_HISTORICAL_BROKER_EXECUTION"
};

const mapped =
  mapVerifiedHistoryEvidenceForServer(
    verified,
    {
      brokerAccountKey:
        ACCOUNT,

      sourceFileName:
        "AIB-history.csv"
    }
  );

assert.equal(
  mapped.executionIdentity,
  "AIB|137971|ORDER-001"
);

assert.equal(
  mapped.exchangeOrderNo,
  "ORDER-001"
);

assert.equal(
  mapped.symbol,
  "SCOM"
);

assert.equal(
  mapped.side,
  "BUY"
);

assert.equal(
  mapped.totalTradedQuantity,
  100
);

assert.equal(
  mapped.executionPrice,
  25.5
);

assert.equal(
  mapped.executionDate,
  "2026-10-26"
);

assert.equal(
  mapped.historicalExecutionState,
  "READY"
);

assert.equal(
  mapped.executionConfirmed,
  true
);

assert.equal(
  mapped.fifoEligible,
  true
);

assert.equal(
  mapped.canAffectFifo,
  true
);

assert.equal(
  mapped.descriptiveOrderStatus,
  "FULLY TRADED"
);

assert.equal(
  mapped.source,
  "TRANSACTION_UPLOAD"
);

assert.equal(
  mapped.sourceFileName,
  "AIB-history.csv"
);

assert.equal(
  mapped.verificationMetadata
    ?.localHistoricalExecutionState,
  "EXECUTED_READY"
);

console.log(
  "EXECUTED_READY_TO_READY=PASS"
);

console.log(
  "PRICE_TO_EXECUTION_PRICE=PASS"
);

console.log(
  "DATE_TO_EXECUTION_DATE=PASS"
);

console.log(
  "EXCHANGE_ORDER_IDENTITY=PASS"
);

{
  const review =
    mapVerifiedHistoryEvidenceForServer(
      {
        ...verified,

        historicalExecutionState:
          "EXECUTED_NEEDS_PRICE",

        fifoEligible:
          false,

        canAffectFifo:
          false,

        price:
          null
      },
      {
        brokerAccountKey:
          ACCOUNT
      }
    );

  assert.equal(
    review.historicalExecutionState,
    "NEEDS_REVIEW"
  );

  assert.equal(
    review.executionPrice,
    null
  );

  assert.equal(
    review.fifoEligible,
    false
  );

  assert.equal(
    review.canAffectFifo,
    false
  );

  console.log(
    "NON_READY_TO_NEEDS_REVIEW=PASS"
  );
}

{
  const batch =
    mapVerifiedHistoryBatchForServer(
      [
        verified,
        {
          ...verified,
          exchangeOrderNo:
            "ORDER-002",
          brokerReference:
            "ORDER-002"
        }
      ],
      {
        brokerAccountKey:
          ACCOUNT
      }
    );

  assert.equal(
    batch.length,
    2
  );

  assert.equal(
    batch[1]
      .executionIdentity,
    "AIB|137971|ORDER-002"
  );

  console.log(
    "BATCH_MAPPING=PASS"
  );
}

{
  assert.throws(
    () =>
      mapVerifiedHistoryEvidenceForServer(
        {
          ...verified,
          totalTradedQuantity:
            0
        },
        {
          brokerAccountKey:
            ACCOUNT
        }
      ),
    /Total Traded Quantity/
  );

  console.log(
    "ZERO_TOTAL_TRADED_REJECTED=PASS"
  );
}

{
  assert.throws(
    () =>
      mapVerifiedHistoryEvidenceForServer(
        {
          ...verified,
          exchangeOrderNo:
            "",
          brokerReference:
            ""
        },
        {
          brokerAccountKey:
            ACCOUNT
        }
      ),
    /Exchange Order No/
  );

  console.log(
    "MISSING_EXCHANGE_ORDER_REJECTED=PASS"
  );
}

{
  assert.throws(
    () =>
      mapVerifiedHistoryEvidenceForServer(
        {
          ...verified,
          side:
            "UNKNOWN"
        },
        {
          brokerAccountKey:
            ACCOUNT
        }
      ),
    /BUY or SELL/
  );

  console.log(
    "INVALID_SIDE_REJECTED=PASS"
  );
}

console.log(
  "R7O_R4E7R16_MAPPER_TEST=PASS"
);
