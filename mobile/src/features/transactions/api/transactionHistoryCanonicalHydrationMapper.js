/*
 * R7O-R4E7R44D
 *
 * Pure canonical-server-history -> local verified evidence mapper.
 *
 * Canonical server history is authoritative.
 * This mapper does not classify incomplete broker rows and does not
 * infer executions. It accepts only executions already persisted as
 * canonical FIFO-ready history.
 */

function clean(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function positiveNumber(value) {
  const number = Number(value);

  return (
    Number.isFinite(number) &&
    number > 0
  )
    ? number
    : null;
}

export function mapCanonicalHistoryRecordToVerifiedEvidence(
  record = {},
  {
    brokerAccountKey = ""
  } = {}
) {
  const accountKey =
    upper(
      brokerAccountKey ||
      record?.brokerAccountKey
    );

  const exchangeOrderNo =
    clean(record?.exchangeOrderNo);

  const executionDate =
    clean(record?.executionDate);

  const symbol =
    upper(record?.symbol);

  const side =
    upper(record?.side);

  const totalTradedQuantity =
    positiveNumber(
      record?.totalTradedQuantity
    );

  const executionPrice =
    positiveNumber(
      record?.executionPrice
    );

  if (!accountKey) {
    throw new Error(
      "Canonical execution is missing brokerAccountKey."
    );
  }

  if (!exchangeOrderNo) {
    throw new Error(
      "Canonical execution is missing Exchange Order No."
    );
  }

  if (!executionDate) {
    throw new Error(
      "Canonical execution is missing execution date."
    );
  }

  if (!symbol) {
    throw new Error(
      "Canonical execution is missing security symbol."
    );
  }

  if (!["BUY", "SELL"].includes(side)) {
    throw new Error(
      "Canonical execution has an invalid side."
    );
  }

  if (!totalTradedQuantity) {
    throw new Error(
      "Canonical execution has invalid traded quantity."
    );
  }

  if (!executionPrice) {
    throw new Error(
      "Canonical execution has invalid execution price."
    );
  }

  if (
    record?.fifoEligible !== true ||
    record?.canAffectFifo !== true
  ) {
    throw new Error(
      "Canonical execution is not FIFO-ready."
    );
  }

  return {
    ...record,

    brokerAccountKey:
      accountKey,

    exchangeOrderNo,

    executionDate,

    date:
      executionDate,

    symbol,

    side,

    quantity:
      totalTradedQuantity,

    tradedQuantity:
      totalTradedQuantity,

    totalTradedQuantity,

    price:
      executionPrice,

    executionPrice,

    executionConfirmed: true,

    historicalExecutionState:
      "EXECUTED_READY",

    fifoEligible: true,

    canAffectFifo: true,

    isPractice: false,

    isReal: true,

    source:
      "CANONICAL_SERVER_HISTORY"
  };
}

export function mapCanonicalHistoryToVerifiedEvidence({
  brokerAccountKey,
  history = []
} = {}) {
  const accountKey =
    upper(brokerAccountKey);

  if (!accountKey) {
    throw new Error(
      "Canonical brokerAccountKey is required."
    );
  }

  if (!Array.isArray(history)) {
    throw new Error(
      "Canonical history must be an array."
    );
  }

  const seen = new Set();

  return history.map((record) => {
    const mapped =
      mapCanonicalHistoryRecordToVerifiedEvidence(
        record,
        {
          brokerAccountKey:
            accountKey
        }
      );

    const identity =
      `${mapped.brokerAccountKey}|${upper(
        mapped.exchangeOrderNo
      )}`;

    if (seen.has(identity)) {
      throw new Error(
        "Canonical history contains duplicate immutable execution identity."
      );
    }

    seen.add(identity);

    return mapped;
  });
}
