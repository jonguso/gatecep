function clean(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function number(value) {
  const cleaned =
    clean(value)
      .replaceAll(",", "")
      .replace(/KES/gi, "")
      .replace(/[^\d.-]/g, "")
      .trim();

  const parsed =
    Number(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function readColumn(row, names = []) {
  if (!row || typeof row !== "object") {
    return "";
  }

  for (const name of names) {
    if (
      Object.prototype.hasOwnProperty.call(
        row,
        name
      )
    ) {
      const value = row[name];

      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }
  }

  /*
   * Broker files sometimes vary only by case/spacing.
   * Preserve the investor review behavior while allowing
   * the server extraction object to be normalized safely.
   */
  const normalizeColumnKey =
    (value) =>
      clean(value)
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[./_-]/g, "");

  const normalized =
    new Map(
      Object.entries(row).map(
        ([key, value]) => [
          normalizeColumnKey(key),
          value
        ]
      )
    );

  for (const name of names) {
    const value =
      normalized.get(
        normalizeColumnKey(name)
      );

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return "";
}

function normalizeSide(value) {
  const side =
    upper(value);

  if (
    side === "BUY" ||
    side === "B"
  ) {
    return "BUY";
  }

  if (
    side === "SELL" ||
    side === "S"
  ) {
    return "SELL";
  }

  return side;
}

export function
normalizeAdminTransactionReviewRow(
  rawRow,
  index = 0
) {
  const quantity =
    number(
      readColumn(rawRow, [
        "Quantity",
        "Order Quantity",
        "Qty"
      ])
    );

  const totalTradedQuantity =
    number(
      readColumn(rawRow, [
        "Total Traded Quantity",
        "Total Traded Qty"
      ])
    );

  const price =
    number(
      readColumn(rawRow, [
        "Price",
        "Unit Price",
        "Trade Price",
        "Rate",
        "Average Price",
        "Avg Price",
        "Execution Price",
        "Order Price"
      ])
    );

  const date =
    clean(
      readColumn(rawRow, [
        "Date",
        "Trade Date",
        "Transaction Date",
        "Order Date",
        "Execution Date",
        "date"
      ])
    );

  const symbol =
    upper(
      readColumn(rawRow, [
        "Symbol",
        "Security",
        "Ticker",
        "Code",
        "Counter",
        "Scrip",
        "Stock",
        "Security Code",
        "Instrument"
      ])
    );

  const side =
    normalizeSide(
      readColumn(rawRow, [
        "Side",
        "Type",
        "Action",
        "Transaction Type",
        "Transaction",
        "Buy/Sell",
        "Buy Sell",
        "Buy or Sell",
        "B/S",
        "Order Side",
        "Trade Type",
        "Order Type"
      ])
    );

  const exchangeOrderNo =
    clean(
      readColumn(rawRow, [
        "Exchange Order No",
        "Exchange Order Number",
        "Exchange Order",
        "Exchange Order ID"
      ])
    );

  const status =
    clean(
      readColumn(rawRow, [
        "Order Status",
        "Status"
      ])
    ) || "UNKNOWN";

  return {
    id:
      `ADMIN-REVIEW-${index}`,

    sourceIndex:
      index,

    rawRow,

    date,

    executionDate:
      date,

    symbol,

    side,

    quantity,

    price,

    executionPrice:
      price,

    status,

    exchangeOrderNo,

    totalTradedQuantity,

    brokerReference:
      readColumn(rawRow, [
        "Broker Reference",
        "Contract Note",
        "Contract Note Number",
        "Trade Reference",
        "Order Reference"
      ]),

    fillReference:
      readColumn(rawRow, [
        "Fill Reference",
        "Fill ID",
        "Execution Reference",
        "Execution ID",
        "Trade ID",
        "Transaction ID",
        "Deal Number"
      ]),

    fees:
      number(
        readColumn(rawRow, [
          "Total Fees",
          "Fees",
          "Brokerage and Fees",
          "Charges"
        ])
      ),

    settlementStatus:
      readColumn(rawRow, [
        "Settlement Status"
      ]),

    settlementDate:
      readColumn(rawRow, [
        "Settlement Date"
      ]),

    source:
      "TRANSACTION_UPLOAD"
  };
}

function immutableIdentity(
  brokerAccountKey,
  exchangeOrderNo
) {
  const account =
    upper(brokerAccountKey);

  const order =
    upper(exchangeOrderNo);

  if (!account || !order) {
    return "";
  }

  return (
    `${account}::EXCHANGE_ORDER:${order}`
  );
}

export function
reviewAdminTransactionHistoryUpload({
  rawRows = [],
  brokerAccountKey,
  existingCanonicalHistory = []
} = {}) {
  if (!Array.isArray(rawRows)) {
    throw new Error(
      "Admin Transaction History rows must be an array."
    );
  }

  const accountKey =
    upper(brokerAccountKey);

  if (!accountKey) {
    throw new Error(
      "Server broker account identity is required."
    );
  }

  const existingIdentities =
    new Set(
      (
        Array.isArray(
          existingCanonicalHistory
        )
          ? existingCanonicalHistory
          : []
      )
        .map((row) =>
          immutableIdentity(
            accountKey,
            row?.exchangeOrderNo
          )
        )
        .filter(Boolean)
    );

  const batchIdentities =
    new Set();

  const rows =
    rawRows.map(
      (rawRow, index) => {
        const row =
          normalizeAdminTransactionReviewRow(
            rawRow,
            index
          );

        const identity =
          immutableIdentity(
            accountKey,
            row.exchangeOrderNo
          );

        if (
          !row.exchangeOrderNo ||
          !(row.totalTradedQuantity > 0)
        ) {
          return {
            ...row,

            reviewStatus:
              "IGNORED",

            reviewReasons: [
              !row.exchangeOrderNo
                ? "NO_EXCHANGE_ORDER"
                : "NO_EXECUTED_QUANTITY"
            ]
          };
        }

        if (
          existingIdentities.has(
            identity
          )
        ) {
          return {
            ...row,

            reviewStatus:
              "EXISTING",

            reviewReasons: [
              "EXCHANGE_ORDER_ALREADY_EXISTS"
            ]
          };
        }

        if (
          batchIdentities.has(
            identity
          )
        ) {
          return {
            ...row,

            reviewStatus:
              "IGNORED",

            reviewReasons: [
              "DUPLICATE_IN_UPLOAD"
            ]
          };
        }

        batchIdentities.add(
          identity
        );

        const reasons = [];

        if (!row.date) {
          reasons.push(
            "MISSING_DATE"
          );
        }

        if (!row.symbol) {
          reasons.push(
            "MISSING_SYMBOL"
          );
        }

        if (
          row.side !== "BUY" &&
          row.side !== "SELL"
        ) {
          reasons.push(
            "INVALID_SIDE"
          );
        }

        if (!(row.price > 0)) {
          reasons.push(
            "MISSING_PRICE"
          );
        }

        if (reasons.length) {
          return {
            ...row,

            reviewStatus:
              "NEEDS_REVIEW",

            reviewReasons:
              reasons
          };
        }

        return {
          ...row,

          reviewStatus:
            "NEW",

          reviewReasons: []
        };
      }
    );

  const byStatus =
    (status) =>
      rows.filter(
        (row) =>
          row.reviewStatus === status
      );

  const newRows =
    byStatus("NEW");

  const existingRows =
    byStatus("EXISTING");

  const reviewRows =
    byStatus("NEEDS_REVIEW");

  const ignoredRows =
    byStatus("IGNORED");

  return {
    rows,
    newRows,
    existingRows,
    reviewRows,
    ignoredRows,

    summary: {
      uploadedCount:
        rows.length,

      newCount:
        newRows.length,

      existingCount:
        existingRows.length,

      reviewRequiredCount:
        reviewRows.length,

      ignoredCount:
        ignoredRows.length,

      updatedExistingCount:
        0,

      deletedExistingCount:
        0
    }
  };
}

export function
mapAdminReviewedNewExecutionsForCanonicalAppend(
  rows = [],
  {
    brokerAccountKey,
    sourceFileName = null
  } = {}
) {
  const accountKey =
    upper(brokerAccountKey);

  return rows.map(
    (row, index) => {
      if (
        row?.reviewStatus !== "NEW"
      ) {
        throw new Error(
          "Only server-reviewed NEW Transaction History rows may be mapped for canonical append."
        );
      }

      if (
        !row.exchangeOrderNo ||
        !(Number(
          row.totalTradedQuantity
        ) > 0) ||
        !row.executionDate ||
        !row.symbol ||
        (
          row.side !== "BUY" &&
          row.side !== "SELL"
        ) ||
        !(Number(
          row.executionPrice
        ) > 0)
      ) {
        throw new Error(
          "Server-reviewed NEW execution is incomplete."
        );
      }

      return {
        executionIdentity:
          `${accountKey}|${upper(
            row.exchangeOrderNo
          )}`,

        exchangeOrderNo:
          clean(
            row.exchangeOrderNo
          ),

        symbol:
          upper(row.symbol),

        side:
          row.side,

        totalTradedQuantity:
          Number(
            row.totalTradedQuantity
          ),

        executionPrice:
          Number(
            row.executionPrice
          ),

        executionDate:
          clean(
            row.executionDate
          ),

        historicalExecutionState:
          "READY",

        executionConfirmed:
          true,

        fifoEligible:
          true,

        canAffectFifo:
          true,

        descriptiveOrderStatus:
          clean(
            row.status
          ) || null,

        source:
          "TRANSACTION_UPLOAD",

        sourceFileName:
          clean(
            sourceFileName
          ) || null,

        sourceRowNumber:
          Number.isInteger(
            Number(
              row.sourceIndex
            )
          )
            ? Number(
                row.sourceIndex
              ) + 1
            : index + 1,

        rawEvidence:
          row.rawRow &&
          typeof row.rawRow ===
            "object"
            ? row.rawRow
            : row,

        verificationMetadata: {
          reviewStatus:
            "NEW",

          reviewedBy:
            "ADMIN_SERVER_TRANSACTION_REVIEW",

          executionAuthority:
            "EXCHANGE_ORDER_AND_TOTAL_TRADED_QUANTITY"
        }
      };
    }
  );
}
