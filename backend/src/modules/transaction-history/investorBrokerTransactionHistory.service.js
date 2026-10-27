import { pool } from "../../database/db.js";

import {
  createInvestorBrokerTransactionHistoryIfAbsent,
  listInvestorBrokerTransactionHistory,
  getOrCreateInvestorBrokerTransactionHistoryAuthority,
  findInvestorBrokerTransactionHistoryAuthority
} from "./investorBrokerTransactionHistory.repository.js";

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

function requirePositiveGeneration(
  value,
  label = "observedGeneration"
) {
  const generation =
    Number(value);

  if (
    !Number.isInteger(generation) ||
    generation < 1
  ) {
    throw new Error(
      `${label} must be a positive integer.`
    );
  }

  return generation;
}


/*
 * Canonical broker identity used specifically by
 * server Transaction History account keys.
 *
 * Persisted broker-link display/registry identity remains
 * unchanged. In particular, the authoritative AIB broker
 * link remains AIB-AXYS while historical evidence uses the
 * established AIB account partition.
 */
export function canonicalTransactionHistoryBroker(
  value
) {
  const broker =
    requireText(
      value,
      "broker"
    ).toUpperCase();

  if (
    broker === "AIB" ||
    broker === "AIB AXYS" ||
    broker === "AIB-AXYS"
  ) {
    return "AIB";
  }

  if (
    broker === "ABC" ||
    broker === "ABC CAPITAL"
  ) {
    return "ABC";
  }

  return broker;
}

function canonicalBroker(value) {
  return canonicalTransactionHistoryBroker(
    value
  );
}

function canonicalClientNumber(value) {
  return requireText(
    value,
    "clientNumber"
  ).toUpperCase();
}

function buildBrokerAccountKey({
  broker,
  clientNumber
}) {
  return (
    canonicalBroker(broker) +
    "|" +
    canonicalClientNumber(clientNumber)
  );
}

function canonicalStatus(value) {
  return clean(value).toUpperCase();
}

function safeInteger(value) {
  const number = Number(value);

  return Number.isInteger(number)
    ? number
    : null;
}

async function loadOwnedBrokerLink(
  {
    authenticatedUserId,
    brokerLinkId
  },
  queryable
) {
  const userId =
    requireText(
      authenticatedUserId,
      "authenticatedUserId"
    );

  const linkId =
    requireText(
      brokerLinkId,
      "brokerLinkId"
    );

  const result =
    await queryable.query(
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
        linkId,
        userId
      ]
    );

  if (result.rows.length !== 1) {
    throw new Error(
      "Broker account was not found for the authenticated user."
    );
  }

  const row =
    result.rows[0];

  if (
    canonicalStatus(row.status) !==
    "ACTIVE"
  ) {
    throw new Error(
      "Broker account must be ACTIVE."
    );
  }

  const broker =
    canonicalBroker(row.broker);

  const clientNumber =
    canonicalClientNumber(
      row.client_number
    );

  return {
    id: row.id,
    userId: row.user_id,
    broker,
    clientNumber,
    cdsNumber:
      clean(row.cds_number) ||
      null,
    status:
      canonicalStatus(row.status),
    brokerAccountKey:
      buildBrokerAccountKey({
        broker,
        clientNumber
      })
  };
}

function normalizeHistoricalExecution(
  input = {},
  {
    authenticatedUserId,
    brokerLink
  }
) {
  const clientUserFields = [
    input.userId,
    input.targetUserId,
    input.actorUserId
  ].filter(
    value => clean(value)
  );

  if (clientUserFields.length > 0) {
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
      requireText(
        input.executionIdentity,
        "executionIdentity"
      ),

    exchangeOrderNo:
      requireText(
        input.exchangeOrderNo,
        "exchangeOrderNo"
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
      input.executionConfirmed ===
      true,

    fifoEligible:
      input.fifoEligible ===
      true,

    canAffectFifo:
      input.canAffectFifo ===
      true,

    descriptiveOrderStatus:
      clean(
        input.descriptiveOrderStatus
      ) || null,

    source:
      clean(input.source) ||
      "TRANSACTION_UPLOAD",

    sourceFileName:
      clean(input.sourceFileName) ||
      null,

    sourceFileSha256:
      clean(
        input.sourceFileSha256
      ) || null,

    sourceRowNumber:
      safeInteger(
        input.sourceRowNumber
      ),

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
initializeAuthenticatedInvestorTransactionHistoryAuthority(
  input = {},
  deps = {}
) {
  const authenticatedUserId =
    requireText(
      input.authenticatedUserId,
      "authenticatedUserId"
    );

  const brokerLinkId =
    requireText(
      input.brokerLinkId,
      "brokerLinkId"
    );

  const database =
    deps.pool || pool;

  const getOrCreateAuthority =
    deps.getOrCreateAuthority ||
    getOrCreateInvestorBrokerTransactionHistoryAuthority;

  const client =
    await database.connect();

  try {
    await client.query("BEGIN");

    /*
     * Security boundary:
     *
     * The authenticated investor is authoritative.
     * brokerLinkId is accepted only as a selector for an
     * account owned by that authenticated investor.
     *
     * brokerAccountKey is never accepted from the client
     * as canonical identity.
     */
    const brokerLink =
      await loadOwnedBrokerLink(
        {
          authenticatedUserId,
          brokerLinkId
        },
        client
      );

    /*
     * This repository primitive is intentionally idempotent:
     *
     * - no authority -> establish generation 1
     * - existing authority -> return existing generation
     *
     * It must not append history and must not advance an
     * already-established generation.
     */
    const authority =
      await getOrCreateAuthority(
        {
          userId:
            authenticatedUserId,
          brokerLinkId:
            brokerLink.id,
          brokerAccountKey:
            brokerLink.brokerAccountKey
        },
        client
      );

    const currentGeneration =
      Number(
        authority?.currentGeneration
      );

    if (
      !Number.isInteger(currentGeneration) ||
      currentGeneration < 1
    ) {
      throw new Error(
        "Transaction History authority generation is invalid."
      );
    }

    await client.query("COMMIT");

    return {
      brokerLinkId:
        brokerLink.id,

      brokerAccountKey:
        brokerLink.brokerAccountKey,

      authorityEstablished:
        true,

      currentGeneration
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    throw error;
  } finally {
    client.release();
  }
}

export async function
appendAuthenticatedInvestorTransactionHistory(
  input = {},
  deps = {}
) {
  const authenticatedUserId =
    requireText(
      input.authenticatedUserId,
      "authenticatedUserId"
    );

  const brokerLinkId =
    requireText(
      input.brokerLinkId,
      "brokerLinkId"
    );

  const observedGeneration =
    requirePositiveGeneration(
      input.observedGeneration,
      "observedGeneration"
    );

  const executions =
    Array.isArray(input.executions)
      ? input.executions
      : [];

  if (executions.length === 0) {
    throw new Error(
      "At least one historical execution is required."
    );
  }

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

    const brokerLink =
      await loadOwnedBrokerLink(
        {
          authenticatedUserId,
          brokerLinkId
        },
        client
      );

    const authority =
      await getOrCreateAuthority(
        {
          userId:
            authenticatedUserId,
          brokerLinkId:
            brokerLink.id,
          brokerAccountKey:
            brokerLink.brokerAccountKey
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
          "Refresh server authority before appending history."
        );

      error.code =
        "STALE_TRANSACTION_HISTORY_GENERATION";

      error.observedGeneration =
        observedGeneration;

      error.currentGeneration =
        currentGeneration;

      throw error;
    }

    const normalized =
      executions.map(
        execution =>
          normalizeHistoricalExecution(
            execution,
            {
              authenticatedUserId,
              brokerLink
            }
          )
      );

    let insertedCount = 0;
    let existingCount = 0;

    const insertedRecords = [];

    for (
      const execution of normalized
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

        if (result.record) {
          insertedRecords.push(
            result.record
          );
        }
      } else {
        existingCount += 1;
      }
    }

    await client.query(
      "COMMIT"
    );

    return {
      userId:
        authenticatedUserId,
      brokerLinkId:
        brokerLink.id,
      brokerAccountKey:
        brokerLink.brokerAccountKey,
      currentGeneration,
      receivedCount:
        normalized.length,
      insertedCount,
      existingCount,
      insertedRecords
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

export async function
loadAuthenticatedInvestorTransactionHistory(
  input = {},
  deps = {}
) {
  const authenticatedUserId =
    requireText(
      input.authenticatedUserId,
      "authenticatedUserId"
    );

  const brokerLinkId =
    requireText(
      input.brokerLinkId,
      "brokerLinkId"
    );

  const prohibitedIdentityFields = [
    "userId",
    "targetUserId",
    "actorUserId"
  ];

  for (const field of prohibitedIdentityFields) {
    if (
      input[field] !== undefined &&
      input[field] !== null
    ) {
      throw new Error(
        field +
        " must not be supplied by the client."
      );
    }
  }

  if (
    input.brokerAccountKey !== undefined &&
    input.brokerAccountKey !== null
  ) {
    throw new Error(
      "brokerAccountKey must not be supplied by the client."
    );
  }

  const database =
    deps.pool || pool;

  const findAuthority =
    deps.findAuthority ||
    findInvestorBrokerTransactionHistoryAuthority;

  const listHistory =
    deps.listHistory ||
    listInvestorBrokerTransactionHistory;

  const client =
    await database.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const brokerLink =
      await loadOwnedBrokerLink(
        {
          authenticatedUserId,
          brokerLinkId
        },
        client
      );

    const authority =
      await findAuthority(
        {
          userId:
            authenticatedUserId,
          brokerLinkId:
            brokerLink.id,
          brokerAccountKey:
            brokerLink.brokerAccountKey
        },
        client
      );

    /*
     * A normal authenticated read is intentionally
     * non-mutating. If the authority row does not yet exist,
     * do not fabricate generation 1 and do not create it.
     *
     * Bootstrap/migration establishes generation 1 before
     * server history becomes canonical.
     */
    if (!authority) {
      await client.query(
        "COMMIT"
      );

      return {
        userId:
          authenticatedUserId,
        brokerLinkId:
          brokerLink.id,
        brokerAccountKey:
          brokerLink.brokerAccountKey,
        authorityEstablished:
          false,
        currentGeneration:
          null,
        count:
          0,
        history:
          []
      };
    }

    const currentGeneration =
      Number(
        authority.currentGeneration
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

    const history =
      await listHistory(
        {
          userId:
            authenticatedUserId,
          brokerLinkId:
            brokerLink.id,
          brokerAccountKey:
            brokerLink.brokerAccountKey,
          authorityGeneration:
            currentGeneration
        },
        client
      );

    await client.query(
      "COMMIT"
    );

    return {
      userId:
        authenticatedUserId,
      brokerLinkId:
        brokerLink.id,
      brokerAccountKey:
        brokerLink.brokerAccountKey,
      authorityEstablished:
        true,
      currentGeneration,
      count:
        history.length,
      history
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
