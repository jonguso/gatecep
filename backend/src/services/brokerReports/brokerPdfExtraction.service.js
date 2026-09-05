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
  const detectedType = /PORTFOLIO VALUATION/i.test(text) ? "valuation"
    : /CLIENT STATEMENT/i.test(text) ? "cash"
      : /ORDER HISTORY/i.test(text) ? "orders" : null;
  const reportType = String(requestedType || detectedType || "").toLowerCase();
  if (!detectedType || (requestedType && reportType !== detectedType)) {
    throw new Error("The selected PDF does not match the expected broker report type.");
  }
  const rows = reportType === "valuation" ? parseValuation(text)
    : reportType === "cash" ? parseStatement(text) : parseOrders(text);
  if (!rows.length) throw new Error("No structured broker records could be extracted from this PDF.");
  return { reportType, pageCount: document.numPages, identity: identityFromText(text), rows };
}
