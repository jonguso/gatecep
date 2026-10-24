function clean(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

function number(value) {
  const cleaned = clean(value)
    .replaceAll(",", "")
    .replace(/KES/gi, "")
    .replace(/[^\d.-]/g, "")
    .trim();

  const parsed = Number(cleaned);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function readColumn(row = {}, names = []) {
  for (const name of names) {
    if (
      row[name] !== undefined &&
      clean(row[name]) !== ""
    ) {
      return row[name];
    }
  }

  const keys = Object.keys(row);

  for (const key of keys) {
    const normalizedKey =
      clean(key)
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[./_-]/g, "");

    const match =
      names.some((name) => {
        const normalizedName =
          clean(name)
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[./_-]/g, "");

        return normalizedKey === normalizedName;
      });

    if (
      match &&
      clean(row[key]) !== ""
    ) {
      return row[key];
    }
  }

  return "";
}

export function normalizeBrokerTransactionReviewRow(
  rawRow = {},
  index = 0
) {
  const date =
    readColumn(rawRow, [
      "Date",
      "Trade Date",
      "Transaction Date",
      "Order Date",
      "date"
    ]);

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

  const sideRaw =
    upper(
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
        "Trade Type"
      ])
    );

  const side =
    sideRaw === "B" ||
    sideRaw.includes("BUY")
      ? "BUY"
      : sideRaw === "S" ||
        sideRaw.includes("SELL")
      ? "SELL"
      : "";

  /*
   * Historical broker execution authority.
   *
   * Total Traded Quantity is intentionally read independently.
   * Never substitute Traded Quantity, Order Quantity or any
   * requested quantity.
   */
  const totalTradedQuantity =
    number(
      readColumn(rawRow, [
        "Total Traded Quantity"
      ])
    );

  const quantity =
    totalTradedQuantity;

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

  const valueFromFile =
    number(
      readColumn(rawRow, [
        "Value",
        "Amount",
        "Consideration",
        "Gross Amount",
        "Net Amount",
        "Total",
        "Trade Value",
        "Transaction Value"
      ])
    );

  const value =
    valueFromFile > 0
      ? valueFromFile
      : quantity > 0 && price > 0
      ? quantity * price
      : 0;

  /*
   * Historical broker price authority.
   *
   * Price must come from an explicit broker price column.
   * Never manufacture an execution price from:
   *
   *   transaction value / Total Traded Quantity
   *
   * A confirmed execution with missing, zero or negative price
   * must remain review-required until an explicit price is
   * supplied through the intentional correction workflow.
   */
  const finalPrice =
    price > 0
      ? price
      : 0;

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
    id: `REVIEW-${index}`,
    sourceIndex: index,
    rawRow,
    date,
    symbol,
    side,
    quantity,
    price: finalPrice,
    value,
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
    broker:
      readColumn(rawRow, [
        "Broker",
        "Broker Name",
        "Dealer"
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
    source: "TRANSACTION_UPLOAD"
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

  return `${account}::EXCHANGE_ORDER:${order}`;
}

export function reviewBrokerTransactionUpload({
  rawRows = [],
  brokerAccountKey,
  existingVerified = [],
  existingUnverified = []
} = {}) {
  const accountKey =
    upper(brokerAccountKey);

  const existingIdentities =
    new Set(
      [
        ...existingVerified,
        ...existingUnverified
      ]
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
    rawRows.map((rawRow, index) => {
      const row =
        normalizeBrokerTransactionReviewRow(
          rawRow,
          index
        );

      const identity =
        immutableIdentity(
          accountKey,
          row.exchangeOrderNo
        );

      const reasons = [];

      /*
       * No immutable exchange identity or no traded quantity:
       * this is not importable historical execution evidence.
       */
      if (
        !row.exchangeOrderNo ||
        !(row.totalTradedQuantity > 0)
      ) {
        return {
          ...row,
          reviewStatus: "IGNORED",
          reviewReasons: [
            !row.exchangeOrderNo
              ? "NO_EXCHANGE_ORDER"
              : "NO_EXECUTED_QUANTITY"
          ]
        };
      }

      /*
       * Existing Exchange Order is immutable.
       * Upload never updates it.
       */
      if (existingIdentities.has(identity)) {
        return {
          ...row,
          reviewStatus: "EXISTING",
          reviewReasons: [
            "EXCHANGE_ORDER_ALREADY_EXISTS"
          ]
        };
      }

      /*
       * Duplicate within the newly selected file.
       * First occurrence remains the candidate.
       */
      if (batchIdentities.has(identity)) {
        return {
          ...row,
          reviewStatus: "IGNORED",
          reviewReasons: [
            "DUPLICATE_IN_UPLOAD"
          ]
        };
      }

      batchIdentities.add(identity);

      if (!row.date) {
        reasons.push("MISSING_DATE");
      }

      if (!row.symbol) {
        reasons.push("MISSING_SYMBOL");
      }

      if (
        row.side !== "BUY" &&
        row.side !== "SELL"
      ) {
        reasons.push("INVALID_SIDE");
      }

      if (!(row.price > 0)) {
        reasons.push("MISSING_PRICE");
      }

      if (reasons.length) {
        return {
          ...row,
          reviewStatus: "NEEDS_REVIEW",
          reviewReasons: reasons
        };
      }

      return {
        ...row,
        reviewStatus: "NEW",
        reviewReasons: []
      };
    });

  const byStatus =
    (status) =>
      rows.filter(
        (row) =>
          row.reviewStatus === status
      );

  return {
    rows,
    newRows: byStatus("NEW"),
    existingRows: byStatus("EXISTING"),
    reviewRows: byStatus("NEEDS_REVIEW"),
    ignoredRows: byStatus("IGNORED"),
    summary: {
      uploadedCount: rows.length,
      newCount: byStatus("NEW").length,
      existingCount:
        byStatus("EXISTING").length,
      reviewRequiredCount:
        byStatus("NEEDS_REVIEW").length,
      ignoredCount:
        byStatus("IGNORED").length,
      updatedExistingCount: 0,
      deletedExistingCount: 0
    }
  };
}
