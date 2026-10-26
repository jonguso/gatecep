import { pool } from "../../database/db.js";

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

function positiveNumber(value, label) {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    throw new Error(
      `${label} must be greater than zero.`
    );
  }

  return number;
}

function nullablePositiveNumber(value) {
  if (
    value === null ||
    value === undefined ||
    clean(value) === ""
  ) {
    return null;
  }

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return null;
  }

  return number;
}

function canonicalState(value) {
  const state =
    clean(value).toUpperCase();

  if (
    state !== "READY" &&
    state !== "NEEDS_REVIEW"
  ) {
    throw new Error(
      "historicalExecutionState must be READY or NEEDS_REVIEW."
    );
  }

  return state;
}

function mapRow(row = {}) {
  return {
    id: row.id,
    userId: row.user_id,
    brokerLinkId: row.broker_link_id,
    brokerAccountKey:
      row.broker_account_key,
    authorityGeneration:
      Number(row.authority_generation),
    executionIdentity:
      row.execution_identity,
    exchangeOrderNo:
      row.exchange_order_no,
    symbol: row.symbol,
    side: row.side,
    totalTradedQuantity:
      Number(row.total_traded_quantity),
    executionPrice:
      row.execution_price === null
        ? null
        : Number(row.execution_price),
    executionDate:
      row.execution_date,
    historicalExecutionState:
      row.historical_execution_state,
    executionConfirmed:
      row.execution_confirmed,
    fifoEligible:
      row.fifo_eligible,
    canAffectFifo:
      row.can_affect_fifo,
    descriptiveOrderStatus:
      row.descriptive_order_status,
    source: row.source,
    sourceFileName:
      row.source_file_name,
    sourceFileSha256:
      row.source_file_sha256,
    sourceRowNumber:
      row.source_row_number,
    rawEvidence:
      row.raw_evidence,
    verificationMetadata:
      row.verification_metadata,
    createdAt:
      row.created_at
  };
}

export async function
createInvestorBrokerTransactionHistoryIfAbsent(
  input = {},
  queryable = pool
) {
  const userId =
    requireText(
      input.userId,
      "userId"
    );

  const brokerLinkId =
    requireText(
      input.brokerLinkId,
      "brokerLinkId"
    );

  const brokerAccountKey =
    requireText(
      input.brokerAccountKey,
      "brokerAccountKey"
    ).toUpperCase();

  const authorityGeneration =
    Number(input.authorityGeneration);

  if (
    !Number.isInteger(authorityGeneration) ||
    authorityGeneration < 1
  ) {
    throw new Error(
      "authorityGeneration must be a positive integer."
    );
  }

  const executionIdentity =
    requireText(
      input.executionIdentity,
      "executionIdentity"
    );

  const exchangeOrderNo =
    requireText(
      input.exchangeOrderNo,
      "exchangeOrderNo"
    );

  const totalTradedQuantity =
    positiveNumber(
      input.totalTradedQuantity,
      "totalTradedQuantity"
    );

  const historicalExecutionState =
    canonicalState(
      input.historicalExecutionState
    );

  const executionPrice =
    nullablePositiveNumber(
      input.executionPrice
    );

  const executionConfirmed =
    input.executionConfirmed === true;

  const fifoEligible =
    input.fifoEligible === true;

  const canAffectFifo =
    input.canAffectFifo === true;

  const symbol =
    clean(input.symbol).toUpperCase() ||
    null;

  const side =
    clean(input.side).toUpperCase() ||
    null;

  const executionDate =
    input.executionDate || null;

  if (
    fifoEligible ||
    canAffectFifo
  ) {
    if (
      !executionConfirmed ||
      !executionPrice ||
      !symbol ||
      !["BUY", "SELL"].includes(side) ||
      !executionDate
    ) {
      throw new Error(
        "FIFO-ready historical execution evidence is incomplete."
      );
    }
  }

  if (
    fifoEligible !==
    canAffectFifo
  ) {
    throw new Error(
      "fifoEligible and canAffectFifo must agree."
    );
  }

  const result =
    await queryable.query(
      `
        INSERT INTO
          public.investor_broker_transaction_history (
            user_id,
            broker_link_id,
            broker_account_key,
            authority_generation,
            execution_identity,
            exchange_order_no,
            symbol,
            side,
            total_traded_quantity,
            execution_price,
            execution_date,
            historical_execution_state,
            execution_confirmed,
            fifo_eligible,
            can_affect_fifo,
            descriptive_order_status,
            source,
            source_file_name,
            source_file_sha256,
            source_row_number,
            raw_evidence,
            verification_metadata
          )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,
          $16,$17,$18,$19,$20,
          $21,$22
        )
        ON CONFLICT (
          user_id,
          broker_link_id,
          broker_account_key,
          authority_generation,
          execution_identity
        )
        DO NOTHING
        RETURNING *
      `,
      [
        userId,
        brokerLinkId,
        brokerAccountKey,
        authorityGeneration,
        executionIdentity,
        exchangeOrderNo,
        symbol,
        side,
        totalTradedQuantity,
        executionPrice,
        executionDate,
        historicalExecutionState,
        executionConfirmed,
        fifoEligible,
        canAffectFifo,
        clean(
          input.descriptiveOrderStatus
        ) || null,
        clean(input.source) || null,
        clean(input.sourceFileName) ||
          null,
        clean(input.sourceFileSha256) ||
          null,
        Number.isInteger(
          Number(input.sourceRowNumber)
        )
          ? Number(input.sourceRowNumber)
          : null,
        input.rawEvidence &&
        typeof input.rawEvidence ===
          "object"
          ? input.rawEvidence
          : {},
        input.verificationMetadata &&
        typeof input.verificationMetadata ===
          "object"
          ? input.verificationMetadata
          : {}
      ]
    );

  if (result.rows.length === 0) {
    return {
      inserted: false,
      record: null
    };
  }

  return {
    inserted: true,
    record:
      mapRow(result.rows[0])
  };
}

export async function
listInvestorBrokerTransactionHistory(
  {
    userId,
    brokerLinkId = null,
    brokerAccountKey = null,
    authorityGeneration = null
  } = {},
  queryable = pool
) {
  const normalizedUserId =
    requireText(
      userId,
      "userId"
    );

  const values = [
    normalizedUserId
  ];

  const predicates = [
    "user_id = $1"
  ];

  if (clean(brokerLinkId)) {
    values.push(
      clean(brokerLinkId)
    );

    predicates.push(
      `broker_link_id = $${values.length}`
    );
  }

  if (clean(brokerAccountKey)) {
    values.push(
      clean(
        brokerAccountKey
      ).toUpperCase()
    );

    predicates.push(
      `broker_account_key = $${values.length}`
    );
  }

  if (
    authorityGeneration !== null &&
    authorityGeneration !== undefined
  ) {
    const normalizedAuthorityGeneration =
      Number(
        authorityGeneration
      );

    if (
      !Number.isInteger(
        normalizedAuthorityGeneration
      ) ||
      normalizedAuthorityGeneration < 1
    ) {
      throw new Error(
        "authorityGeneration must be a positive integer."
      );
    }

    values.push(
      normalizedAuthorityGeneration
    );

    predicates.push(
      `authority_generation = $${values.length}`
    );
  }

  const result =
    await queryable.query(
      `
        SELECT *
        FROM
          public.investor_broker_transaction_history
        WHERE
          ${predicates.join(
            "\n          AND "
          )}
        ORDER BY
          execution_date ASC NULLS LAST,
          created_at ASC,
          execution_identity ASC
      `,
      values
    );

  return result.rows.map(mapRow);
}

export async function
countInvestorBrokerTransactionHistory(
  {
    userId,
    brokerLinkId = null,
    brokerAccountKey = null
  } = {},
  queryable = pool
) {
  const rows =
    await listInvestorBrokerTransactionHistory(
      {
        userId,
        brokerLinkId,
        brokerAccountKey
      },
      queryable
    );

  return rows.length;
}

/*
 * Server-owned Transaction History authority.
 *
 * This row is the reset epoch for one authenticated investor
 * broker account.
 *
 * Normal history append may read/create this authority row but
 * must never advance current_generation.
 *
 * Generation advancement belongs only to the future protected
 * Admin maintenance transaction.
 */
export async function getOrCreateInvestorBrokerTransactionHistoryAuthority(
  {
    userId,
    brokerLinkId,
    brokerAccountKey
  },
  queryable = pool
) {
  const normalizedUserId =
    clean(userId);

  const normalizedBrokerLinkId =
    clean(brokerLinkId);

  const normalizedBrokerAccountKey =
    clean(brokerAccountKey).toUpperCase();

  if (
    !normalizedUserId ||
    !normalizedBrokerLinkId ||
    !normalizedBrokerAccountKey
  ) {
    throw new Error(
      "User, broker link and broker account are required for Transaction History authority."
    );
  }

  await queryable.query(
    `
      INSERT INTO
        public.investor_broker_transaction_history_authority (
          user_id,
          broker_link_id,
          broker_account_key,
          current_generation
        )
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (
        user_id,
        broker_link_id,
        broker_account_key
      )
      DO NOTHING
    `,
    [
      normalizedUserId,
      normalizedBrokerLinkId,
      normalizedBrokerAccountKey
    ]
  );

  const result =
    await queryable.query(
      `
        SELECT
          user_id,
          broker_link_id,
          broker_account_key,
          current_generation,
          created_at,
          updated_at
        FROM
          public.investor_broker_transaction_history_authority
        WHERE
          user_id = $1
          AND broker_link_id = $2
          AND broker_account_key = $3
        FOR UPDATE
      `,
      [
        normalizedUserId,
        normalizedBrokerLinkId,
        normalizedBrokerAccountKey
      ]
    );

  if (result.rowCount !== 1) {
    throw new Error(
      "Transaction History authority could not be resolved."
    );
  }

  const row = result.rows[0];

  return {
    userId: row.user_id,
    brokerLinkId: row.broker_link_id,
    brokerAccountKey:
      row.broker_account_key,
    currentGeneration:
      Number(row.current_generation),
    createdAt:
      row.created_at ?? null,
    updatedAt:
      row.updated_at ?? null
  };
}


/*
 * Read-only authority lookup for sync/handshake flows.
 *
 * This does not create or advance a generation.
 */
export async function findInvestorBrokerTransactionHistoryAuthority(
  {
    userId,
    brokerLinkId,
    brokerAccountKey
  },
  queryable = pool
) {
  const normalizedUserId =
    clean(userId);

  const normalizedBrokerLinkId =
    clean(brokerLinkId);

  const normalizedBrokerAccountKey =
    clean(brokerAccountKey).toUpperCase();

  if (
    !normalizedUserId ||
    !normalizedBrokerLinkId ||
    !normalizedBrokerAccountKey
  ) {
    throw new Error(
      "User, broker link and broker account are required for Transaction History authority."
    );
  }

  const result =
    await queryable.query(
      `
        SELECT
          user_id,
          broker_link_id,
          broker_account_key,
          current_generation,
          created_at,
          updated_at
        FROM
          public.investor_broker_transaction_history_authority
        WHERE
          user_id = $1
          AND broker_link_id = $2
          AND broker_account_key = $3
      `,
      [
        normalizedUserId,
        normalizedBrokerLinkId,
        normalizedBrokerAccountKey
      ]
    );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    userId: row.user_id,
    brokerLinkId: row.broker_link_id,
    brokerAccountKey:
      row.broker_account_key,
    currentGeneration:
      Number(row.current_generation),
    createdAt:
      row.created_at ?? null,
    updatedAt:
      row.updated_at ?? null
  };
}

/*
 * ADMIN MAINTENANCE ONLY.
 *
 * Physically deletes canonical historical broker executions for one
 * exact investor + connected broker account.
 *
 * IMPORTANT:
 *   - This is NOT normal upload behavior.
 *   - There is deliberately NO authority_generation predicate.
 *   - Authority generation is not changed here.
 *   - Callers performing destructive maintenance must execute this
 *     inside their own locked database transaction.
 */
export async function deleteInvestorBrokerTransactionHistoryForAccount(
  {
    userId,
    brokerLinkId,
    brokerAccountKey
  } = {},
  queryable = pool
) {
  const normalizedUserId =
    String(userId ?? "").trim();

  const normalizedBrokerLinkId =
    String(brokerLinkId ?? "").trim();

  const normalizedBrokerAccountKey =
    String(brokerAccountKey ?? "")
      .trim()
      .toUpperCase();

  if (
    !normalizedUserId ||
    !normalizedBrokerLinkId ||
    !normalizedBrokerAccountKey
  ) {
    throw new Error(
      "Exact investor and broker-account scope is required before Transaction History can be deleted."
    );
  }

  if (
    !queryable ||
    typeof queryable.query !== "function"
  ) {
    throw new Error(
      "A database queryable is required to delete Transaction History."
    );
  }

  const result =
    await queryable.query(
      `
        DELETE FROM public.investor_broker_transaction_history
        WHERE user_id = $1
          AND broker_link_id = $2
          AND broker_account_key = $3
        RETURNING
          id,
          authority_generation AS "authorityGeneration",
          execution_identity AS "executionIdentity"
      `,
      [
        normalizedUserId,
        normalizedBrokerLinkId,
        normalizedBrokerAccountKey
      ]
    );

  return {
    userId:
      normalizedUserId,

    brokerLinkId:
      normalizedBrokerLinkId,

    brokerAccountKey:
      normalizedBrokerAccountKey,

    deletedCount:
      result.rowCount ?? result.rows?.length ?? 0,

    deletedRows:
      Array.isArray(result.rows)
        ? result.rows
        : []
  };
}

