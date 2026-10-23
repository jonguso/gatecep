import crypto from "node:crypto";
import {
  getDocument
} from "pdfjs-dist/legacy/build/pdf.mjs";

function clean(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function capture(text, regex) {
  return clean(
    text.match(regex)?.[1] ?? ""
  );
}

function decimal(value) {
  const normalized =
    String(value ?? "")
      .replace(/,/g, "")
      .trim();

  if (!normalized) {
    return null;
  }

  const number =
    Number(normalized);

  return Number.isFinite(number)
    ? number
    : null;
}

function requireValue(
  value,
  field,
  pageNumber
) {
  if (
    value == null ||
    value === ""
  ) {
    const error =
      new Error(
        `Contract note page ${pageNumber} ` +
        `is missing ${field}.`
      );

    error.code =
      "CONTRACT_NOTE_FIELD_MISSING";

    error.field = field;
    error.pageNumber = pageNumber;

    throw error;
  }

  return value;
}

function parseOrderProvenance(text) {
  const raw =
    clean(
      text.match(
        /Order No\.\s+Exchange Order No\.\s+Contract No\.\s+Order Qty\.\s+Traded Qty\.\s+Balance Qty\.\s+(.+)$/i
      )?.[1] ?? ""
    );

  if (!raw) {
    const error =
      new Error(
        "Contract note order provenance is missing."
      );

    error.code =
      "CONTRACT_NOTE_ORDER_PROVENANCE_MISSING";

    throw error;
  }

  const tokens =
    raw
      .split(" ")
      .filter(Boolean);

  const numericToken =
    /^\d{1,3}(?:,\d{3})*(?:\.\d+)?$|^\d+(?:\.\d+)?$/;

  const parseQuantity =
    value => {
      const number =
        Number(
          String(value ?? "")
            .replace(/,/g, "")
        );

      return Number.isFinite(number)
        ? number
        : NaN;
    };

  const orders = [];
  let index = 0;

  while (index < tokens.length) {
    const orderNo =
      tokens[index];

    const exchangeOrderNo =
      tokens[index + 1];

    if (
      !/^\d+$/.test(orderNo ?? "") ||
      !exchangeOrderNo
    ) {
      const error =
        new Error(
          "Contract note order provenance row is malformed."
        );

      error.code =
        "CONTRACT_NOTE_ORDER_PROVENANCE_INVALID";

      throw error;
    }

    index += 2;

    const contractTokens = [];

    while (
      index < tokens.length &&
      !numericToken.test(
        tokens[index]
      )
    ) {
      contractTokens.push(
        tokens[index]
      );

      index += 1;
    }

    if (
      contractTokens.length === 0 ||
      index + 2 >= tokens.length
    ) {
      const error =
        new Error(
          "Contract note order provenance row is incomplete."
        );

      error.code =
        "CONTRACT_NOTE_ORDER_PROVENANCE_INVALID";

      throw error;
    }

    const orderQuantity =
      parseQuantity(
        tokens[index++]
      );

    const tradedQuantity =
      parseQuantity(
        tokens[index++]
      );

    const balanceQuantity =
      parseQuantity(
        tokens[index++]
      );

    if (
      !Number.isFinite(orderQuantity) ||
      !Number.isFinite(tradedQuantity) ||
      !Number.isFinite(balanceQuantity)
    ) {
      const error =
        new Error(
          "Contract note order provenance quantities are invalid."
        );

      error.code =
        "CONTRACT_NOTE_ORDER_PROVENANCE_INVALID";

      throw error;
    }

    const contractNumbers =
      contractTokens
        .join(" ")
        .split(",")
        .map(value =>
          value.trim()
        )
        .filter(Boolean);

    orders.push({
      orderNo,
      exchangeOrderNo,
      contractNumbers,
      orderQuantity,
      tradedQuantity,
      balanceQuantity
    });
  }

  return {
    raw,
    orders
  };
}
function buildExecutionIdentity({
  broker,
  clientCode,
  tradingAccount,
  tradeDate,
  side,
  isin,
  sharesTraded,
  averageTradePrice
}) {
  const identityBase = [
    clean(broker).toUpperCase(),
    clean(clientCode),
    clean(tradingAccount),
    clean(tradeDate),
    clean(side).toUpperCase(),
    clean(isin).toUpperCase(),
    String(sharesTraded),
    Number(averageTradePrice).toFixed(4)
  ].join("|");

  const executionIdentity =
    crypto
      .createHash("sha256")
      .update(identityBase)
      .digest("hex");

  return {
    identityBase,
    executionIdentity
  };
}

function parsePage(
  text,
  pageNumber
) {
  const side =
    /\bPURCHASED\b/i.test(text)
      ? "BUY"
      : /\bSOLD\b/i.test(text)
        ? "SELL"
        : "";

  const tradeDate =
    capture(
      text,
      /Trade Date\s*:\s*(\d{1,2}-[A-Za-z]{3}-\d{4})/i
    );

  const settlementDate =
    capture(
      text,
      /Settlement Date\s*:\s*(\d{1,2}-[A-Za-z]{3}-\d{4})/i
    );

  const clientCode =
    capture(
      text,
      /Client Code\s*:\s*([A-Za-z0-9/-]+)/i
    );

  const tradingAccount =
    capture(
      text,
      /Trading Account No\.\s*:\s*([A-Za-z0-9/-]+)/i
    );

  const securityName =
    capture(
      text,
      /Security Name\s*:\s*(.+?)\s+ISIN Code\s*:/i
    );

  const isin =
    capture(
      text,
      /ISIN Code\s*:\s*([A-Za-z0-9]+)/i
    );

  const sharesTraded =
    decimal(
      capture(
        text,
        /No\.\s*of Shares Traded\s*:\s*([\d,]+(?:\.\d+)?)/i
      )
    );

  const averageTradePrice =
    decimal(
      capture(
        text,
        /Avg Trade Price\s*:\s*([\d,]+(?:\.\d+)?)/i
      )
    );

  const grossMatch =
    text.match(
      /Gross Consideration\s+([\d,]+(?:\.\d+)?)\s*@\s*([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)/i
    );

  const grossQuantity =
    decimal(grossMatch?.[1]);

  const grossUnitPrice =
    decimal(grossMatch?.[2]);

  const grossConsideration =
    decimal(grossMatch?.[3]);

  const totalCharges =
    decimal(
      capture(
        text,
        /Total Charges\s*-\s*([\d,]+(?:\.\d+)?)/i
      )
    );

  const netPayable =
    decimal(
      capture(
        text,
        /Net Amount Payable\s*-\s*([\d,]+(?:\.\d+)?)/i
      )
    );

  const netReceivable =
    decimal(
      capture(
        text,
        /Net Amount Receivable\s*-\s*([\d,]+(?:\.\d+)?)/i
      )
    );

  requireValue(side, "side", pageNumber);
  requireValue(
    tradeDate,
    "tradeDate",
    pageNumber
  );
  requireValue(
    settlementDate,
    "settlementDate",
    pageNumber
  );
  requireValue(
    clientCode,
    "clientCode",
    pageNumber
  );
  requireValue(
    tradingAccount,
    "tradingAccount",
    pageNumber
  );
  requireValue(
    securityName,
    "securityName",
    pageNumber
  );
  requireValue(
    isin,
    "isin",
    pageNumber
  );
  requireValue(
    sharesTraded,
    "sharesTraded",
    pageNumber
  );
  requireValue(
    averageTradePrice,
    "averageTradePrice",
    pageNumber
  );
  requireValue(
    grossQuantity,
    "grossQuantity",
    pageNumber
  );
  requireValue(
    grossUnitPrice,
    "grossUnitPrice",
    pageNumber
  );
  requireValue(
    grossConsideration,
    "grossConsideration",
    pageNumber
  );
  requireValue(
    totalCharges,
    "totalCharges",
    pageNumber
  );

  if (
    side === "BUY" &&
    netPayable == null
  ) {
    throw new Error(
      `Contract note page ${pageNumber} ` +
      "is missing Net Amount Payable."
    );
  }

  if (
    side === "SELL" &&
    netReceivable == null
  ) {
    throw new Error(
      `Contract note page ${pageNumber} ` +
      "is missing Net Amount Receivable."
    );
  }

  if (
    sharesTraded <= 0 ||
    averageTradePrice <= 0 ||
    grossConsideration <= 0 ||
    totalCharges < 0
  ) {
    throw new Error(
      `Contract note page ${pageNumber} ` +
      "contains invalid execution economics."
    );
  }

  if (
    grossQuantity !== sharesTraded
  ) {
    throw new Error(
      `Contract note page ${pageNumber} ` +
      "gross quantity does not match shares traded."
    );
  }

  const unitDifference =
    Math.abs(
      grossUnitPrice -
      averageTradePrice
    );

  if (unitDifference > 0.0001) {
    throw new Error(
      `Contract note page ${pageNumber} ` +
      "gross unit price does not match average trade price."
    );
  }

  const accountingExpected =
    side === "BUY"
      ? grossConsideration +
        totalCharges
      : grossConsideration -
        totalCharges;

  const accountingActual =
    side === "BUY"
      ? netPayable
      : netReceivable;

  const accountingDifference =
    Math.abs(
      accountingExpected -
      accountingActual
    );

  if (accountingDifference > 0.02) {
    throw new Error(
      `Contract note page ${pageNumber} ` +
      "fails gross/charges/net reconciliation."
    );
  }

  const {
    identityBase,
    executionIdentity
  } =
    buildExecutionIdentity({
      broker: "AIB",
      clientCode,
      tradingAccount,
      tradeDate,
      side,
      isin,
      sharesTraded,
      averageTradePrice
    });

  return {
    pageNumber,

    broker: "AIB",

    clientCode,
    tradingAccount,

    side,

    tradeDate,
    settlementDate,

    securityName,
    isin,

    sharesTraded,
    averageTradePrice,

    grossConsideration,
    totalCharges,

    netAmount:
      side === "BUY"
        ? netPayable
        : netReceivable,

    netAmountType:
      side === "BUY"
        ? "PAYABLE"
        : "RECEIVABLE",

    executionIdentity,
    identityBase,

    orderProvenance:
      parseOrderProvenance(text),

    economicsVerified: true
  };
}

export async function extractAdminBrokerContractNote(
  buffer
) {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length === 0
  ) {
    const error =
      new Error(
        "Contract note PDF buffer is required."
      );

    error.code =
      "CONTRACT_NOTE_FILE_REQUIRED";

    throw error;
  }

  const pdf =
    await getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    }).promise;

  const records = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber += 1
  ) {
    const page =
      await pdf.getPage(pageNumber);

    const content =
      await page.getTextContent();

    const text =
      clean(
        content.items
          .map(item => item.str ?? "")
          .join(" ")
      );

    records.push(
      parsePage(
        text,
        pageNumber
      )
    );
  }

  return {
    reportType:
      "contract_note",

    pageCount:
      pdf.numPages,

    records
  };
}
