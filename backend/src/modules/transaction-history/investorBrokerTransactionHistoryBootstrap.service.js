import { createHash } from "node:crypto";

import { pool } from "../../database/db.js";

import {
  createInvestorBrokerTransactionHistoryIfAbsent,
  getOrCreateInvestorBrokerTransactionHistoryAuthority
} from "./investorBrokerTransactionHistory.repository.js";

import {
  canonicalTransactionHistoryBroker
} from "./investorBrokerTransactionHistory.service.js";

function clean(value) {
  return String(value ?? "").trim();
}

function requireText(value, label) {
  const result = clean(value);

  if (!result) {
    throw new Error(
      `${label} is required.`
    );
  }

  return result;
}

function requireGeneration(value) {
  const generation = Number(value);

  if (
    !Number.isInteger(generation) ||
    generation < 1
  ) {
    throw new Error(
      "observedGeneration must be a positive integer."
    );
  }

  return generation;
}

function canonicalClientNumber(value) {
  return requireText(
    value,
    "clientNumber"
  ).toUpperCase();
}

function buildHistoryAccountKey({
  broker,
  clientNumber
}) {
  return (
    canonicalTransactionHistoryBroker(
      broker
    ) +
    "|" +
    canonicalClientNumber(
      clientNumber
    )
  );
}

async function loadOwnedBrokerLink(
  {
    authenticatedUserId,
    brokerLinkId
  },
  client
) {
  const result =
    await client.query(
      `
      SELECT
        id,
        user_id,
        broker,
        client_number,
        cds_number,
        status
      FROM
        public.user_broker_links
      WHERE
        id = $1
        AND user_id = $2
      LIMIT 1
      `,
      [
        brokerLinkId,
        authenticatedUserId
      ]
    );

  if (result.rows.length !== 1) {
    throw new Error(
      "Broker account was not found for the authenticated user."
    );
  }

  const row = result.rows[0];

  if (
    clean(row.status).toUpperCase() !==
    "ACTIVE"
  ) {
    throw new Error(
      "Broker account must be ACTIVE."
    );
  }

  return {
    id: row.id,
    userId: row.user_id,
    broker:
      canonicalTransactionHistoryBroker(
        row.broker
      ),
    clientNumber:
      canonicalClientNumber(
        row.client_number
      ),
    brokerAccountKey:
      buildHistoryAccountKey({
        broker: row.broker,
        clientNumber:
          row.client_number
      })
  };
}


/*
 * ADMIN-TXHIST-004D4-R7L-R2
 *
 * Exchange Order No is the immutable historical execution
 * identity. executionIdentity is transport-compatible only and
 * may never redefine Exchange Order No.
 */

export function deriveHistoricalExecutionIdentity(
  input = {}
) {
  const exchangeOrderNo =
    requireText(
      input.exchangeOrderNo,
      "exchangeOrderNo"
    );

  const suppliedIdentity =
    clean(
      input.executionIdentity
    );

  if (
    suppliedIdentity &&
    suppliedIdentity !==
      exchangeOrderNo
  ) {
    const error =
      new Error(
        "Historical execution identity must equal Exchange Order No."
      );

    error.code =
      "HISTORICAL_EXECUTION_IDENTITY_MISMATCH";

    throw error;
  }

  return exchangeOrderNo;
}

function canonicalFingerprintNumber(
  value
) {
  if (
    value === null ||
    value === undefined ||
    clean(value) === ""
  ) {
    return "";
  }

  const numeric =
    Number(value);

  if (!Number.isFinite(numeric)) {
    return clean(value);
  }

  return String(numeric);
}

export function canonicalHistoricalEvidenceFingerprintRows(
  partitions = []
) {
  if (!Array.isArray(partitions)) {
    throw new Error(
      "Bootstrap partitions must be an array."
    );
  }

  const rows = [];

  for (const partition of partitions) {
    const executions =
      Array.isArray(
        partition?.executions
      )
        ? partition.executions
        : [];

    for (const execution of executions) {
      rows.push(
        [
          clean(
            execution.brokerAccountKey
          ),
          deriveHistoricalExecutionIdentity(
            execution
          ),
          clean(
            execution.symbol
          ).toUpperCase(),
          clean(
            execution.side
          ).toUpperCase(),
          canonicalFingerprintNumber(
            execution.totalTradedQuantity
          ),
          canonicalFingerprintNumber(
            execution.executionPrice
          ),
          clean(
            execution.executionDate
          ),
          clean(
            execution.historicalExecutionState
          ).toUpperCase()
        ].join("|")
      );
    }
  }

  return rows.sort();
}

export function computeHistoricalEvidenceSha256(
  partitions = []
) {
  return createHash("sha256")
    .update(
      canonicalHistoricalEvidenceFingerprintRows(
        partitions
      ).join("\n"),
      "utf8"
    )
    .digest("hex");
}

export function requireExpectedHistoricalEvidenceSha256(
  value
) {
  const expected =
    clean(value).toLowerCase();

  if (!/^[a-f0-9]{64}$/.test(expected)) {
    const error =
      new Error(
        "A valid expected historical evidence SHA-256 is required."
      );

    error.code =
      "HISTORICAL_EVIDENCE_FINGERPRINT_REQUIRED";

    throw error;
  }

  return expected;
}

export function assertHistoricalEvidenceSha256({
  partitions,
  expectedEvidenceSha256
} = {}) {
  const expected =
    clean(
      expectedEvidenceSha256
    ).toLowerCase();

  if (
    !/^[a-f0-9]{64}$/.test(
      expected
    )
  ) {
    const error =
      new Error(
        "A valid expected historical evidence SHA-256 is required."
      );

    error.code =
      "HISTORICAL_EVIDENCE_FINGERPRINT_REQUIRED";

    throw error;
  }

  const actual =
    computeHistoricalEvidenceSha256(
      partitions
    );

  if (actual !== expected) {
    const error =
      new Error(
        "Historical evidence fingerprint mismatch."
      );

    error.code =
      "HISTORICAL_EVIDENCE_FINGERPRINT_MISMATCH";

    error.expectedEvidenceSha256 =
      expected;

    error.actualEvidenceSha256 =
      actual;

    throw error;
  }

  return actual;
}

function normalizeExecution(
  input,
  {
    authenticatedUserId,
    brokerLink
  }
) {
  if (
    clean(input.userId) ||
    clean(input.targetUserId) ||
    clean(input.actorUserId)
  ) {
    throw new Error(
      "Client-supplied user identity is not accepted."
    );
  }

  if (
    clean(input.brokerAccountKey) &&
    clean(
      input.brokerAccountKey
    ).toUpperCase() !==
      brokerLink.brokerAccountKey
  ) {
    throw new Error(
      "Client brokerAccountKey does not match the server-authoritative broker account."
    );
  }

  return {
    userId:
      authenticatedUserId,

    brokerLinkId:
      brokerLink.id,

    brokerAccountKey:
      brokerLink.brokerAccountKey,

    executionIdentity:
      deriveHistoricalExecutionIdentity(
        input
      ),

    exchangeOrderNo:
      deriveHistoricalExecutionIdentity(
        input
      ),

    symbol:
      clean(input.symbol)
        .toUpperCase() ||
      null,

    side:
      clean(input.side)
        .toUpperCase() ||
      null,

    totalTradedQuantity:
      input.totalTradedQuantity,

    executionPrice:
      input.executionPrice,

    executionDate:
      input.executionDate ||
      null,

    historicalExecutionState:
      requireText(
        input.historicalExecutionState,
        "historicalExecutionState"
      ).toUpperCase(),

    executionConfirmed:
      input.executionConfirmed === true,

    fifoEligible:
      input.fifoEligible === true,

    canAffectFifo:
      input.canAffectFifo === true,

    descriptiveOrderStatus:
      clean(
        input.descriptiveOrderStatus
      ) || null,

    source:
      clean(input.source) ||
      "EXISTING_LOCAL_HISTORY_BOOTSTRAP",

    sourceFileName:
      clean(
        input.sourceFileName
      ) || null,

    sourceFileSha256:
      clean(
        input.sourceFileSha256
      ) || null,

    sourceRowNumber:
      Number.isInteger(
        Number(
          input.sourceRowNumber
        )
      )
        ? Number(
            input.sourceRowNumber
          )
        : null,

    rawEvidence:
      input.rawEvidence &&
      typeof input.rawEvidence ===
        "object"
        ? input.rawEvidence
        : {},

    verificationMetadata:
      input.verificationMetadata &&
      typeof input.verificationMetadata ===
        "object"
        ? input.verificationMetadata
        : {}
  };
}

export async function
bootstrapAuthenticatedInvestorTransactionHistory(
  input = {},
  deps = {}
) {
  const authenticatedUserId =
    requireText(
      input.authenticatedUserId,
      "authenticatedUserId"
    );

  if (
    clean(input.userId) ||
    clean(input.targetUserId) ||
    clean(input.actorUserId)
  ) {
    throw new Error(
      "Client-supplied user identity is not accepted."
    );
  }

  const observedGeneration =
    requireGeneration(
      input.observedGeneration
    );

  const partitions =
    Array.isArray(input.partitions)
      ? input.partitions
      : [];

  if (partitions.length === 0) {
    throw new Error(
      "At least one broker history partition is required."
    );
  }

  const seenBrokerLinks =
    new Set();

  for (const partition of partitions) {
    const brokerLinkId =
      requireText(
        partition.brokerLinkId,
        "brokerLinkId"
      );

    if (
      seenBrokerLinks.has(
        brokerLinkId
      )
    ) {
      throw new Error(
        "Duplicate brokerLinkId is not accepted in one bootstrap."
      );
    }

    seenBrokerLinks.add(
      brokerLinkId
    );

    if (
      !Array.isArray(
        partition.executions
      ) ||
      partition.executions.length === 0
    ) {
      throw new Error(
        "Each broker history partition must contain at least one execution."
      );
    }
  }

  /*
   * ADMIN-TXHIST-004D4-R7L-R3
   *
   * Evidence integrity is validated before acquiring a database
   * client. No route or caller may bypass the canonical bootstrap
   * fingerprint boundary.
   */
  const expectedEvidenceSha256 =
    requireExpectedHistoricalEvidenceSha256(
      input.expectedEvidenceSha256
    );

  const database =
    deps.pool || pool;

  const getOrCreateAuthority =
    deps.getOrCreateAuthority ||
    getOrCreateInvestorBrokerTransactionHistoryAuthority;

  const createIfAbsent =
    deps.createIfAbsent ||
    createInvestorBrokerTransactionHistoryIfAbsent;

  const client =
    await database.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const prepared = [];

    /*
     * Resolve every broker account and validate
     * every execution before inserting history.
     */
    for (const partition of partitions) {
      const brokerLink =
        await loadOwnedBrokerLink(
          {
            authenticatedUserId,
            brokerLinkId:
              partition.brokerLinkId
          },
          client
        );

      const normalized =
        partition.executions.map(
          execution =>
            normalizeExecution(
              execution,
              {
                authenticatedUserId,
                brokerLink
              }
            )
        );

      prepared.push({
        brokerLink,
        normalized
      });
    }

    const evidenceSha256 =
      assertHistoricalEvidenceSha256({
        partitions:
          prepared.map(
            partition => ({
              executions:
                partition.normalized
            })
          ),
        expectedEvidenceSha256
      });

    const results = [];

    for (const partition of prepared) {
      const authority =
        await getOrCreateAuthority(
          {
            userId:
              authenticatedUserId,
            brokerLinkId:
              partition.brokerLink.id,
            brokerAccountKey:
              partition.brokerLink
                .brokerAccountKey
          },
          client
        );

      const currentGeneration =
        Number(
          authority?.currentGeneration
        );

      if (
        !Number.isInteger(
          currentGeneration
        ) ||
        currentGeneration < 1
      ) {
        throw new Error(
          "Transaction History authority generation is invalid."
        );
      }

      if (
        observedGeneration !==
        currentGeneration
      ) {
        const error =
          new Error(
            "Transaction History generation is stale. " +
            "Refresh server authority before bootstrapping history."
          );

        error.code =
          "STALE_TRANSACTION_HISTORY_GENERATION";

        error.observedGeneration =
          observedGeneration;

        error.currentGeneration =
          currentGeneration;

        throw error;
      }

      let insertedCount = 0;
      let existingCount = 0;

      for (
        const execution
        of partition.normalized
      ) {
        const result =
          await createIfAbsent(
            {
              ...execution,
              authorityGeneration:
                currentGeneration
            },
            client
          );

        if (result.inserted) {
          insertedCount += 1;
        } else {
          existingCount += 1;
        }
      }

      results.push({
        brokerLinkId:
          partition.brokerLink.id,
        brokerAccountKey:
          partition.brokerLink
            .brokerAccountKey,
        currentGeneration,
        receivedCount:
          partition.normalized.length,
        insertedCount,
        existingCount
      });
    }

    await client.query(
      "COMMIT"
    );

    return {
      userId:
        authenticatedUserId,
      observedGeneration,
      evidenceSha256,
      partitionCount:
        results.length,
      receivedCount:
        results.reduce(
          (sum, result) =>
            sum +
            result.receivedCount,
          0
        ),
      insertedCount:
        results.reduce(
          (sum, result) =>
            sum +
            result.insertedCount,
          0
        ),
      existingCount:
        results.reduce(
          (sum, result) =>
            sum +
            result.existingCount,
          0
        ),
      partitions:
        results
    };
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch {}

    throw error;
  } finally {
    client.release();
  }
}
