function clean(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function numeric(value) {
  const normalized =
    clean(value)
      .replace(/,/g, "");

  if (!normalized) {
    return null;
  }

  const parsed =
    Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function field(row, name) {
  return clean(
    row?.[name]
  );
}

function normalizeHistoryRows(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError(
      "Order history rows must be an array."
    );
  }

  return rows.map(
    (row, index) => ({
      sourceRowNumber:
        index + 2,

      orderNo:
        field(row, "Order No"),

      exchangeOrderNo:
        field(
          row,
          "Exchange Order No"
        ),

      clientCode:
        field(
          row,
          "Client Code"
        ),

      tradingAccount:
        field(
          row,
          "Trading Account"
        ),

      securityCode:
        field(
          row,
          "Security Code"
        ).toUpperCase(),

      side:
        field(
          row,
          "Buy or Sell"
        ).toUpperCase(),

      status:
        field(
          row,
          "Order Status"
        ),

      totalTradedQuantity:
        numeric(
          row?.[
            "Total Traded Quantity"
          ]
        )
    })
  );
}

function buildIndex(rows, key) {
  const index =
    new Map();

  for (const row of rows) {
    const value =
      row[key];

    if (!value) {
      continue;
    }

    const bucket =
      index.get(value) ?? [];

    bucket.push(row);

    index.set(
      value,
      bucket
    );
  }

  return index;
}

function correlationError(
  code,
  message,
  details
) {
  const error =
    new Error(message);

  error.code =
    code;

  error.details =
    details;

  return error;
}

export function correlateAdminBrokerExecution({
  execution,
  orderHistoryRows
}) {
  if (
    !execution ||
    !Array.isArray(
      execution.orderProvenance?.orders
    ) ||
    execution.orderProvenance.orders.length === 0
  ) {
    throw correlationError(
      "BROKER_EXECUTION_PROVENANCE_REQUIRED",
      "Structured contract-note provenance is required."
    );
  }

  const history =
    normalizeHistoryRows(
      orderHistoryRows
    );

  const byOrderNo =
    buildIndex(
      history,
      "orderNo"
    );

  const byExchangeOrderNo =
    buildIndex(
      history,
      "exchangeOrderNo"
    );

  const matches = [];

  for (
    const provenance
    of execution.orderProvenance.orders
  ) {
    const orderMatches =
      byOrderNo.get(
        clean(
          provenance.orderNo
        )
      ) ?? [];

    const exchangeMatches =
      byExchangeOrderNo.get(
        clean(
          provenance.exchangeOrderNo
        )
      ) ?? [];

    let candidates = [];

    if (
      orderMatches.length > 0 &&
      exchangeMatches.length > 0
    ) {
      const exchangeRows =
        new Set(
          exchangeMatches.map(
            row =>
              row.sourceRowNumber
          )
        );

      candidates =
        orderMatches.filter(
          row =>
            exchangeRows.has(
              row.sourceRowNumber
            )
        );

      if (candidates.length === 0) {
        throw correlationError(
          "BROKER_EXECUTION_REFERENCE_CONFLICT",
          "Order and exchange-order references do not identify the same history row.",
          {
            orderNo:
              provenance.orderNo,
            exchangeOrderNo:
              provenance.exchangeOrderNo
          }
        );
      }
    } else if (
      orderMatches.length > 0
    ) {
      candidates =
        orderMatches;
    } else if (
      exchangeMatches.length > 0
    ) {
      candidates =
        exchangeMatches;
    }

    if (candidates.length === 0) {
      throw correlationError(
        "BROKER_EXECUTION_HISTORY_NOT_FOUND",
        "Contract-note order was not found in order history.",
        {
          orderNo:
            provenance.orderNo,
          exchangeOrderNo:
            provenance.exchangeOrderNo
        }
      );
    }

    if (candidates.length !== 1) {
      throw correlationError(
        "BROKER_EXECUTION_HISTORY_AMBIGUOUS",
        "Contract-note order matched multiple order-history rows.",
        {
          orderNo:
            provenance.orderNo,
          exchangeOrderNo:
            provenance.exchangeOrderNo,
          sourceRows:
            candidates.map(
              row =>
                row.sourceRowNumber
            )
        }
      );
    }

    matches.push({
      provenance,
      history:
        candidates[0]
    });
  }

  const symbols =
    [
      ...new Set(
        matches
          .map(
            match =>
              match.history.securityCode
          )
          .filter(Boolean)
      )
    ];

  if (symbols.length !== 1) {
    throw correlationError(
      symbols.length === 0
        ? "BROKER_EXECUTION_SYMBOL_UNRESOLVED"
        : "BROKER_EXECUTION_SYMBOL_CONFLICT",
      symbols.length === 0
        ? "No security code was resolved from order history."
        : "Contract-note orders resolve to multiple security codes.",
      {
        symbols
      }
    );
  }

  const clientCodes =
    [
      ...new Set(
        matches.map(
          match =>
            match.history.clientCode
        )
      )
    ];

  const tradingAccounts =
    [
      ...new Set(
        matches.map(
          match =>
            match.history.tradingAccount
        )
      )
    ];

  if (
    clientCodes.length !== 1 ||
    clientCodes[0] !==
      clean(execution.clientCode) ||
    tradingAccounts.length !== 1 ||
    tradingAccounts[0] !==
      clean(execution.tradingAccount)
  ) {
    throw correlationError(
      "BROKER_EXECUTION_IDENTITY_MISMATCH",
      "Order-history identity does not match contract-note identity.",
      {
        expectedClientCode:
          execution.clientCode,
        actualClientCodes:
          clientCodes,
        expectedTradingAccount:
          execution.tradingAccount,
        actualTradingAccounts:
          tradingAccounts
      }
    );
  }

  const historyQuantity =
    matches.reduce(
      (sum, match) => {
        const quantity =
          match.history
            .totalTradedQuantity;

        if (
          !Number.isFinite(quantity)
        ) {
          throw correlationError(
            "BROKER_EXECUTION_HISTORY_QUANTITY_INVALID",
            "Matched order-history row has no valid total traded quantity.",
            {
              sourceRowNumber:
                match.history
                  .sourceRowNumber
            }
          );
        }

        return sum + quantity;
      },
      0
    );

  if (
    Math.abs(
      historyQuantity -
      execution.sharesTraded
    ) >= 0.000001
  ) {
    throw correlationError(
      "BROKER_EXECUTION_QUANTITY_MISMATCH",
      "Order-history traded quantity does not reconcile with contract-note execution quantity.",
      {
        contractQuantity:
          execution.sharesTraded,
        historyQuantity
      }
    );
  }

  return {
    symbol:
      symbols[0],

    clientCode:
      clientCodes[0],

    tradingAccount:
      tradingAccounts[0],

    historyQuantity,

    matchedOrders:
      matches.map(
        match => ({
          orderNo:
            match.provenance.orderNo,

          exchangeOrderNo:
            match.provenance
              .exchangeOrderNo,

          contractNumbers:
            [
              ...match.provenance
                .contractNumbers
            ],

          contractOrderQuantity:
            match.provenance
              .orderQuantity,

          contractTradedQuantity:
            match.provenance
              .tradedQuantity,

          historySourceRowNumber:
            match.history
              .sourceRowNumber,

          historyStatus:
            match.history.status,

          historySide:
            match.history.side,

          historyTotalTradedQuantity:
            match.history
              .totalTradedQuantity
        })
      )
  };
}
