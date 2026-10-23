import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const number = (value) => Number(String(value || "").replaceAll(",", ""));

function identityFromText(text) {
  return {
    brokerId: /AXYS INVESTMENT BANK/i.test(text) ? "AIB" : null,
    clientCode: text.match(/Client\s*Code\s*:\s*(\d{4,})/i)?.[1] || null,
    tradingAccount: text.match(/CDS\s*Account\s*Code\s*:\s*(\d{5,})/i)?.[1] || null,
    clientName: text.match(/Client\s*Name\s*:\s*([^\n]+)/i)?.[1]?.trim() || null
  };
}

function parseValuation(text) {
  const rows = [];
  const rowPattern = /^\s*([A-Z][A-Z0-9]{1,9})\s+([\d,]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+(-?[\d,.]+)\s+(-?[\d,.]+)\s*$/gm;
  for (const match of text.matchAll(rowPattern)) {
    rows.push({
      Security: match[1], Quantity: number(match[2]), "Avg.Price": number(match[3]),
      "Market Price": number(match[4]), "Market Value": number(match[5]),
      "Profit / Loss": number(match[6]), "Profit / Loss %": number(match[7])
    });
  }
  return rows;
}

function parseStatement(text) {
  const rows = [];
  const linePattern = /^(\d{2}-[A-Za-z]{3}-\d{4})\s+(Journal|Purchase|Sale|Payment|Receipt|Dividend)\s+(.*)$/gmi;
  const starts = [...text.matchAll(linePattern)];
  starts.forEach((match, index) => {
    const body = text.slice(match.index, starts[index + 1]?.index ?? text.length).replace(/\s+/g, " ").trim();
    const amounts = [...body.matchAll(/-?[\d,]+\.\d{2}/g)].map((item) => item[0]);
    rows.push({
      Date: match[1], Type: match[2], Particulars: body,
      Balance: amounts.at(-1) || "", Debit: amounts.at(-3) || "", Credit: amounts.at(-2) || ""
    });
  });
  return rows;
}

function normalizedPageText(text) {
  return String(text || "")
    .replace(/\\s+/g, " ")
    .trim();
}

function orderHistoryStructureError(message) {
  const error = new Error(
    "The Order History PDF structure could not be safely reconstructed. " +
    message
  );
  error.code = "BROKER_ORDER_HISTORY_STRUCTURE_INVALID";
  return error;
}

function parseOrders(pages, identity) {
  if (!Array.isArray(pages) || pages.length !== 116) {
    throw orderHistoryStructureError(
      `Expected 116 pages, received ${Array.isArray(pages) ? pages.length : 0}.`
    );
  }

  const clientCode = String(identity?.clientCode || "").trim();
  const tradingAccount = String(identity?.tradingAccount || "").trim();
  const clientName = String(identity?.clientName || "").trim();

  if (!clientCode || !tradingAccount || !clientName) {
    throw orderHistoryStructureError(
      "Broker client identity is incomplete."
    );
  }

  const escapeRegExp = (value) =>
    String(value).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const escapedClientCode =
    escapeRegExp(clientCode);

  const escapedClientName =
    escapeRegExp(clientName);

  const escapedTradingAccount =
    escapeRegExp(tradingAccount);

  const band1Pattern = new RegExp(
    "(\\d{2}-[A-Za-z]{3}-\\d{4})\\s+" +
    "(?:(?!" + escapedClientCode + "\\b)(\\S+)\\s+)?" +
    escapedClientCode + "\\s+" +
    escapedClientName + "\\s+" +
    "([A-Z][A-Z0-9&]{1,9})\\s+" +
    "([BS])\\s+" +
    "([\\d,]+)\\s+" +
    "([\\d,]+)",
    "g"
  );

  const band2Pattern =
    /([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+(?:\.\d+)?)\s+(LIMIT|MARKET)\s+(\d{2}-[A-Za-z]{3}-\d{4})\s+(Fully Traded|Cancelled|Expired|Rejected)\b/g;

  const band3Pattern = new RegExp(
    "0\\.00\\s+\\S+\\s+" +
    "\\d{2}-[A-Za-z]{3}-\\d{4}\\s+" +
    "\\S+\\s+(\\S+)\\s+" +
    "(B\\d+)\\s+" +
    "(" + escapedTradingAccount + ")",
    "g"
  );

  const rows = [];

  for (let offset = 0; offset < 29; offset += 1) {
    const pageNumbers = [
      1 + offset,
      30 + offset,
      59 + offset
    ];

    const band1 = [
      ...normalizedPageText(
        pages[pageNumbers[0] - 1]
      ).matchAll(band1Pattern)
    ];

    const band2 = [
      ...normalizedPageText(
        pages[pageNumbers[1] - 1]
      ).matchAll(band2Pattern)
    ];

    const band3 = [
      ...normalizedPageText(
        pages[pageNumbers[2] - 1]
      ).matchAll(band3Pattern)
    ];

    const expected =
      offset === 28 ? 3 : 17;

    if (
      band1.length !== expected ||
      band2.length !== expected ||
      band3.length !== expected
    ) {
      throw orderHistoryStructureError(
        `Pages ${pageNumbers.join("/")} produced ` +
        `${band1.length}/${band2.length}/${band3.length} rows; ` +
        `expected ${expected}/${expected}/${expected}.`
      );
    }

    for (let index = 0; index < expected; index += 1) {
      const a = band1[index];
      const b = band2[index];
      const c = band3[index];

      rows.push({
        "Order Date": a[1],
        "Exchange Order No": a[2] || "",
        "Client Code": clientCode,
        "Client Name": clientName,
        "Security Code": a[3],
        "Buy or Sell": a[4],
        "Original Order Quantity": number(a[5]),
        "Order Quantity": number(a[6]),

        "Pending Order Quantity": number(b[1]),
        "Traded Quantity": number(b[2]),
        "Total Traded Quantity": number(b[3]),
        "Order Price": number(b[4]),
        "Order Type": b[5],
        "Valid Upto": b[6],
        "Order Status": b[7],

        "Order No": c[1],
        "Member Code": c[2],
        "Trading Account": c[3],

        "Can Affect Real Portfolio": false
      });
    }
  }

  if (rows.length !== 479) {
    throw orderHistoryStructureError(
      `Expected 479 reconstructed rows, received ${rows.length}.`
    );
  }

  return rows;
}

function parseCdscPositions(text) {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const rows = [];
  let currentSymbol = null;
  let currentName = null;
  let currentBroker = null;

  for (const line of lines) {
    const security = line.match(/^([A-Z]{2,6}?)\s*[OE]0{4}\s*\[\s*([^\]]+)\]/i);
    if (security) {
      currentSymbol = security[1].toUpperCase();
      currentName = security[2].trim();
      continue;
    }

    const broker = line.match(/^B\d+\s+(.+)$/i);
    if (broker && currentSymbol) {
      currentBroker = broker[1].trim();
      continue;
    }

    if (!currentSymbol) continue;
    const movement = line.match(/^(\d{2}-[A-Za-z]{3}-\d{2,4}|\d{4}-\d{2}-\d{2})\s+(Balance Brought Forward|Balance Carried Forward|Purchase|Sale)\s*(.*)$/i);
    if (!movement) continue;

    const type = movement[2];
    const numeric = [...movement[3].matchAll(/-?[\d,]+(?:\.\d+)?/g)].map((m) => number(m[0]));
    const isBalance = /Balance/i.test(type);
    const quantity = isBalance ? 0 : (numeric.length >= 2 ? numeric[numeric.length - 2] : numeric[0] || 0);
    const balance = numeric.length ? numeric[numeric.length - 1] : 0;

    rows.push({
      Date: movement[1],
      Symbol: currentSymbol,
      "Security Name": currentName,
      Broker: currentBroker,
      Type: type,
      Quantity: quantity,
      Balance: balance,
      Particulars: line
    });
  }
  return rows;
}

function cdscIdentityFromText(text) {
  return {
    accountNumber: text.match(/A(?:c)?count\s*No\s*:\s*(\d+)/i)?.[1] || null,
    clientName: text.match(/^([A-Z][A-Z, ]+)$/m)?.[1]?.trim() || null
  };
}

function cdscPeriodFromText(text) {
  const match = text.match(/Statement of Account between\s+(\d{2}-[A-Za-z]{3}-\d{2,4})\s+and\s+(\d{2}-[A-Za-z]{3}-\d{2,4})/i);
  return { periodStart: match?.[1] || null, periodEnd: match?.[2] || null };
}

export async function extractBrokerPdf(buffer, requestedType = "") {
  const document = await getDocument({
    data: new Uint8Array(buffer), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true
  }).promise;
  if (document.numPages > 150) throw new Error("The broker PDF exceeds the 150-page secure limit.");

  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    let pageText = "";
    for (const item of content.items) pageText += `${item.str}${item.hasEOL ? "\n" : " "}`;
    pages.push(pageText);
  }
  const text = pages.join("\n");
  const detectedType = /Statement of Account between/i.test(text) && /Balance Brought Forward/i.test(text) && /Balance Carried Forward/i.test(text) ? "cdsc_positions"
    : /PORTFOLIO VALUATION/i.test(text) ? "valuation"
      : /CLIENT STATEMENT/i.test(text) ? "cash"
        : /ORDER HISTORY/i.test(text) ? "orders" : null;
  const reportType = String(requestedType || detectedType || "").toLowerCase();
  if (!detectedType || (requestedType && reportType !== detectedType)) {
    throw new Error("The selected PDF does not match the expected broker report type.");
  }
  const identity =
    reportType === "cdsc_positions"
      ? null
      : identityFromText(text);

  const rows = reportType === "valuation" ? parseValuation(text)
    : reportType === "cash" ? parseStatement(text)
      : reportType === "cdsc_positions" ? parseCdscPositions(text)
        : parseOrders(pages, identity);
  if (!rows.length) throw new Error("No structured broker records could be extracted from this PDF.");
  if (reportType === "cdsc_positions") {
    const period = cdscPeriodFromText(text);
    return { reportType, pageCount: document.numPages, identity: cdscIdentityFromText(text), ...period, rows };
  }
  return { reportType, pageCount: document.numPages, identity, rows };
}
