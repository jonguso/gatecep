function text(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return text(value).toUpperCase();
}

function numberText(value) {
  const next = Number(value);

  return Number.isFinite(next)
    ? String(next)
    : "";
}

/*
 * PC-031A32
 *
 * brokerReference identifies the parent broker order and therefore
 * cannot by itself identify an individual execution fill.
 *
 * Prefer an explicit broker execution/fill identity when the imported
 * evidence supplies one. Otherwise derive a deterministic identity
 * from the genuine execution facts.
 */
export function brokerExecutionFillIdentity(row = {}) {
  const explicitFillIdentity =
    text(
      row.fillReference ||
      row.fillId ||
      row.executionReference ||
      row.executionId ||
      row.tradeId ||
      row.transactionId ||
      row.dealNumber
    );

  if (explicitFillIdentity) {
    return `FILL:${explicitFillIdentity}`;
  }

  const brokerReference =
    text(row.brokerReference);

  const executionDate =
    text(
      row.executionDate ||
      row.date ||
      row.createdAt
    );

  const symbol =
    upper(
      row.canonicalSymbol ||
      row.symbol
    );

  const side =
    upper(
      row.side ||
      row.type
    );

  const quantity =
    numberText(
      row.quantity ??
      row.filledQuantity ??
      row.tradedQuantity
    );

  const price =
    numberText(
      row.price ??
      row.averagePrice ??
      row.executionPrice
    );

  if (
    brokerReference &&
    executionDate &&
    symbol &&
    side &&
    quantity &&
    price
  ) {
    return [
      "EXEC",
      brokerReference,
      executionDate,
      symbol,
      side,
      quantity,
      price
    ].join(":");
  }

  const localId =
    text(row.id);

  return localId
    ? `LOCAL:${localId}`
    : "";
}
