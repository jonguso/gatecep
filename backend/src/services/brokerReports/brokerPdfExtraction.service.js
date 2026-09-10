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

function parseOrders(text) {
  const rows = [];
  const pattern = /^(\d{2}-[A-Za-z]{3}-\d{4})\s+(\S+)\s+(\d{4,})\s+(.+?)\s+([A-Z][A-Z0-9]{1,9})\s+([BS])\s+([\d,]+)\s+([\d,]+)\s*$/gm;
  for (const match of text.matchAll(pattern)) {
    rows.push({
      "Order Date": match[1], "Exchange Order No": match[2], "Client Code": match[3],
      "Client Name": match[4].trim(), "Security Code": match[5], "Buy or Sell": match[6],
      "Original Order Quantity": number(match[7]), "Order Quantity": number(match[8])
    });
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
  const rows = reportType === "valuation" ? parseValuation(text)
    : reportType === "cash" ? parseStatement(text)
      : reportType === "cdsc_positions" ? parseCdscPositions(text) : parseOrders(text);
  if (!rows.length) throw new Error("No structured broker records could be extracted from this PDF.");
  if (reportType === "cdsc_positions") {
    const period = cdscPeriodFromText(text);
    return { reportType, pageCount: document.numPages, identity: cdscIdentityFromText(text), ...period, rows };
  }
  return { reportType, pageCount: document.numPages, identity: identityFromText(text), rows };
}
