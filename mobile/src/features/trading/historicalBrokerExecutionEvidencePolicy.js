function clean(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function positiveNumber(value) {
  const number =
    Number(
      String(value ?? "")
        .replaceAll(",", "")
        .replace(/KES/gi, "")
        .replace(/[^\d.-]/g, "")
        .trim()
    );

  return Number.isFinite(number) && number > 0
    ? number
    : 0;
}

export function classifyHistoricalBrokerExecutionEvidence(
  record = {},
  {
    brokerAccountKey = "",
    brokerId = ""
  } = {}
) {
  const accountKey =
    upper(
      brokerAccountKey ||
      record.brokerAccountKey
    );

  const broker =
    upper(
      brokerId ||
      record.broker
    );

  const exchangeOrderNo =
    clean(record.exchangeOrderNo);

  const executionDate =
    clean(
      record.executionDate ||
      record.date
    );

  const symbol =
    upper(record.symbol);

  const side =
    upper(record.side);

  /*
   * IMPORTANT:
   *
   * Total Traded Quantity is the authoritative historical
   * execution quantity.
   *
   * Do not substitute:
   *   - Traded Quantity
   *   - Order Quantity
   *   - Original Order Quantity
   *
   * Mapping into this contract must provide the broker's
   * Total Traded Quantity explicitly.
   */
  const totalTradedQuantity =
    positiveNumber(
      record.totalTradedQuantity
    );

  const price =
    positiveNumber(record.price);

  const status =
    upper(
      record.status ||
      record.orderStatus
    );

  const identityMissing = [];

  if (!accountKey) {
    identityMissing.push("BROKER_ACCOUNT");
  }

  if (!exchangeOrderNo) {
    identityMissing.push("EXCHANGE_ORDER_NO");
  }

  const executionConfirmed =
    totalTradedQuantity > 0;

  let reviewReason = null;
  let historicalExecutionState =
    "NOT_EXECUTED";

  /*
   * The broker's Total Traded Quantity establishes whether
   * execution occurred.
   *
   * Price does NOT establish execution.
   *
   * Price determines whether a confirmed execution is ready
   * to participate in FIFO cost calculations.
   */
  if (executionConfirmed) {
    if (identityMissing.length > 0) {
      historicalExecutionState =
        "NEEDS_IDENTITY_REVIEW";

      reviewReason =
        identityMissing[0];
    } else if (!(price > 0)) {
      historicalExecutionState =
        "EXECUTED_NEEDS_PRICE";

      reviewReason =
        "EXECUTED_PRICE";
    } else {
      historicalExecutionState =
        "EXECUTED_READY";
    }
  }

  /*
   * Execution metadata can still be incomplete even after
   * broker execution is established.
   *
   * These fields are retained for review/audit. They do not
   * cause Total Traded Quantity to stop being execution proof.
   */
  const metadataWarnings = [];

  if (
    executionConfirmed &&
    (
      !executionDate ||
      Number.isNaN(
        new Date(executionDate).getTime()
      )
    )
  ) {
    metadataWarnings.push(
      "BROKER_EXECUTION_DATE"
    );
  }

  if (
    executionConfirmed &&
    !symbol
  ) {
    metadataWarnings.push(
      "SECURITY"
    );
  }

  if (
    executionConfirmed &&
    !["BUY", "SELL"].includes(side)
  ) {
    metadataWarnings.push(
      "SIDE"
    );
  }

  const historicalExecutionVerified =
    executionConfirmed &&
    identityMissing.length === 0;

  const fifoEligible =
    historicalExecutionState ===
    "EXECUTED_READY" &&
    metadataWarnings.length === 0;

  return {
    ...record,

    brokerAccountKey:
      accountKey,

    broker:
      broker ||
      upper(
        accountKey.split("|")[0]
      ),

    /*
     * Exchange Order No is the immutable historical
     * execution identity/reference.
     */
    brokerReference:
      exchangeOrderNo,

    exchangeOrderNo,

    executionDate,
    date:
      executionDate,

    symbol,
    side,

    /*
     * Keep both names explicit so downstream code cannot
     * accidentally substitute Order Quantity.
     */
    quantity:
      totalTradedQuantity,

    totalTradedQuantity,

    price,

    /*
     * Status is retained exactly as useful broker history,
     * but is not an execution gate.
     */
    executionStatus:
      status,

    historicalExecutionState,

    executionConfirmed,

    historicalExecutionVerified,

    fifoEligible,

    needsPriceReview:
      historicalExecutionState ===
      "EXECUTED_NEEDS_PRICE",

    reviewReason,

    missingEvidence:
      [
        ...identityMissing,
        ...(
          historicalExecutionState ===
          "EXECUTED_NEEDS_PRICE"
            ? ["EXECUTED_PRICE"]
            : []
        )
      ],

    metadataWarnings,

    /*
     * Historical execution history can retain a confirmed
     * execution that still needs price correction.
     *
     * FIFO must use fifoEligible instead.
     */
    canAffectHistoricalExecutionHistory:
      historicalExecutionVerified,

    canAffectFifo:
      fifoEligible,

    settlementStatus:
      clean(record.settlementStatus) || null,

    settlementDate:
      clean(record.settlementDate) || null,

    /*
     * Do not manufacture fees.
     */
    totalFees:
      clean(
        record.totalFees ??
        record.fees
      )
        ? Number(
            record.totalFees ??
            record.fees
          )
        : null,

    evidenceStatus:
      !executionConfirmed
        ? "NOT_EXECUTED"
        : historicalExecutionState ===
            "NEEDS_IDENTITY_REVIEW"
          ? "UNVERIFIED"
          : historicalExecutionState ===
              "EXECUTED_NEEDS_PRICE"
            ? "VERIFIED_EXECUTION_NEEDS_PRICE"
            : fifoEligible
              ? "VERIFIED_HISTORICAL_BROKER_EXECUTION"
              : "VERIFIED_EXECUTION_NEEDS_REVIEW",

    sourceType:
      "HISTORICAL_BROKER_EXECUTION_EVIDENCE"
  };
}

export function partitionHistoricalBrokerExecutionEvidence(
  records = [],
  context = {}
) {
  const classified =
    records.map(record =>
      classifyHistoricalBrokerExecutionEvidence(
        record,
        context
      )
    );

  return {
    /*
     * Confirmed broker executions with sufficient evidence
     * for FIFO calculation.
     */
    verified:
      classified.filter(
        record =>
          record.fifoEligible
      ),

    /*
     * Confirmed executions that require human correction
     * before FIFO may consume them.
     */
    needsReview:
      classified.filter(
        record =>
          record.executionConfirmed &&
          !record.fifoEligible
      ),

    needsPrice:
      classified.filter(
        record =>
          record.historicalExecutionState ===
          "EXECUTED_NEEDS_PRICE"
      ),

    /*
     * No Total Traded Quantity means no historical execution.
     */
    ignored:
      classified.filter(
        record =>
          !record.executionConfirmed
      ),

    /*
     * Compatibility bucket:
     * anything not FIFO-ready is not canonical verified FIFO
     * evidence yet.
     */
    unverified:
      classified.filter(
        record =>
          !record.fifoEligible
      ),

    classified
  };
}
