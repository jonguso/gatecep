/*
 * R7O-R4E7R16R2
 *
 * Pure canonical Transaction History execution mapper.
 *
 * No API imports.
 * No auth imports.
 * No broker API imports.
 * No storage access.
 * No network access.
 *
 * Mobile evidence states:
 *   EXECUTED_READY
 *   EXECUTED_NEEDS_PRICE
 *   NEEDS_IDENTITY_REVIEW
 *
 * Canonical server states:
 *   READY
 *   NEEDS_REVIEW
 */

function clean(value) {
  return String(
    value ?? ""
  ).trim();
}

function positiveNumber(value) {
  const number =
    Number(value);

  return Number.isFinite(number) &&
    number > 0
    ? number
    : null;
}

function canonicalServerHistoryState(
  record = {}
) {
  const localState =
    clean(
      record.historicalExecutionState
    ).toUpperCase();

  if (
    record.fifoEligible === true &&
    (
      localState ===
        "EXECUTED_READY" ||
      localState ===
        "READY"
    )
  ) {
    return "READY";
  }

  return "NEEDS_REVIEW";
}

function canonicalExecutionIdentity({
  brokerAccountKey,
  exchangeOrderNo
}) {
  const accountKey =
    clean(
      brokerAccountKey
    ).toUpperCase();

  const orderNo =
    clean(
      exchangeOrderNo
    );

  if (!accountKey) {
    throw new Error(
      "brokerAccountKey is required for canonical execution identity."
    );
  }

  if (!orderNo) {
    throw new Error(
      "Exchange Order No is required for canonical execution identity."
    );
  }

  return (
    accountKey +
    "|" +
    orderNo
  );
}

export function mapVerifiedHistoryEvidenceForServer(
  record = {},
  {
    brokerAccountKey = "",
    sourceFileName = null,
    sourceFileSha256 = null
  } = {}
) {
  const accountKey =
    clean(
      brokerAccountKey ||
      record.brokerAccountKey
    ).toUpperCase();

  const exchangeOrderNo =
    clean(
      record.exchangeOrderNo ||
      record.brokerReference
    );

  const totalTradedQuantity =
    positiveNumber(
      record.totalTradedQuantity
    );

  if (!totalTradedQuantity) {
    throw new Error(
      "Canonical append requires Total Traded Quantity greater than zero."
    );
  }

  const executionPrice =
    positiveNumber(
      record.executionPrice ??
      record.price
    );

  const executionDate =
    clean(
      record.executionDate ||
      record.date
    ) || null;

  const symbol =
    clean(
      record.symbol
    ).toUpperCase();

  const side =
    clean(
      record.side
    ).toUpperCase();

  if (!symbol) {
    throw new Error(
      "Canonical append requires security symbol."
    );
  }

  if (
    side !== "BUY" &&
    side !== "SELL"
  ) {
    throw new Error(
      "Canonical append requires BUY or SELL side."
    );
  }

  const historicalExecutionState =
    canonicalServerHistoryState(
      record
    );

  const fifoEligible =
    historicalExecutionState ===
      "READY" &&
    record.fifoEligible === true;

  return {
    executionIdentity:
      canonicalExecutionIdentity({
        brokerAccountKey:
          accountKey,
        exchangeOrderNo
      }),

    exchangeOrderNo,

    symbol,

    side,

    totalTradedQuantity,

    executionPrice,

    executionDate,

    historicalExecutionState,

    executionConfirmed:
      record.executionConfirmed ===
        true ||
      totalTradedQuantity > 0,

    fifoEligible,

    canAffectFifo:
      fifoEligible &&
      record.canAffectFifo !== false,

    descriptiveOrderStatus:
      clean(
        record.status ||
        record.orderStatus ||
        record.descriptiveOrderStatus
      ) || null,

    source:
      "TRANSACTION_UPLOAD",

    sourceFileName:
      clean(
        sourceFileName ||
        record.sourceFileName
      ) || null,

    sourceFileSha256:
      clean(
        sourceFileSha256 ||
        record.sourceFileSha256
      ) || null,

    sourceRowNumber:
      Number.isInteger(
        Number(
          record.sourceRowNumber
        )
      )
        ? Number(
            record.sourceRowNumber
          )
        : null,

    rawEvidence:
      record.rawEvidence &&
      typeof record.rawEvidence ===
        "object"
        ? record.rawEvidence
        : record,

    verificationMetadata: {
      localHistoricalExecutionState:
        clean(
          record.historicalExecutionState
        ) || null,

      localEvidenceStatus:
        clean(
          record.evidenceStatus
        ) || null,

      mappedBy:
        "R7O-R4E7R16"
    }
  };
}

export function mapVerifiedHistoryBatchForServer(
  records = [],
  options = {}
) {
  if (!Array.isArray(records)) {
    throw new Error(
      "Verified Transaction History evidence must be an array."
    );
  }

  return records.map(
    record =>
      mapVerifiedHistoryEvidenceForServer(
        record,
        options
      )
  );
}
