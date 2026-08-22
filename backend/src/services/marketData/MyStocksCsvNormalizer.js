import crypto from "crypto";

const SYMBOL_ALIASES = Object.freeze({
  EQT: "EQTY",
  IM: "IMH"
});

const clean = (value) => String(value ?? "").replace(/^\uFEFF/, "").trim();
const symbol = (value) => {
  const normalized = clean(value).toUpperCase().replace(/\.NR$/, "");
  return SYMBOL_ALIASES[normalized] || normalized;
};
const number = (value) => {
  const normalized = clean(value).replace(/,/g, "").replace(/%$/, "");
  if (!normalized || normalized === "-" || normalized === "?") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export function parseCsv(text = "") {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const input = String(text || "").replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => clean(cell))) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => clean(cell))) rows.push(row);
  return rows;
}

export function detectMyStocksCsvKind(rows = []) {
  const header = (rows[0] || []).map(clean);
  if (header[0] === "CODE" && header.includes("Price") && header.includes("Previous")) {
    return "REAL_TIME_MARKET_WATCH";
  }
  if (header[0] === "Security" && header.includes("Closing") && header.includes("VWAP")) {
    return "DAILY_PRICELIST";
  }
  return "UNKNOWN";
}

function validateMarketDate(marketDate) {
  const value = clean(marketDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error("A valid market date in YYYY-MM-DD format is required.");
  }
  return value;
}

function normalizeRealTime(rows, marketDate, importedAt) {
  const data = [];
  const rejected = [];

  rows.slice(1).forEach((row, rowIndex) => {
    const rawSymbol = symbol(row[0]);
    const name = clean(row[1]);
    if (!rawSymbol || !name || rawSymbol.startsWith("^")) return;
    const price = number(row[6]);
    const previousClose = number(row[7]);
    const volume = number(row[11]);
    if (!(price > 0)) {
      rejected.push({ row: rowIndex + 2, symbol: rawSymbol, reason: "INVALID_PRICE" });
      return;
    }
    const change = previousClose > 0 ? Number((price - previousClose).toFixed(4)) : null;
    const changePct = previousClose > 0
      ? Number(((change / previousClose) * 100).toFixed(4))
      : null;
    data.push({
      symbol: rawSymbol,
      name,
      price,
      lastPrice: price,
      previousClose,
      prevClose: previousClose,
      change,
      changePct,
      volume: volume || 0,
      hasLivePrice: true,
      priceSource: "MYSTOCKS_MANUAL_EXPORT",
      quotedAt: importedAt,
      marketDate
    });
  });

  return { data, rejected, valuationEligible: true };
}

function normalizeDaily(rows, marketDate, importedAt) {
  const data = [];
  const rejected = [];
  rows.slice(1).forEach((row, rowIndex) => {
    const rawSymbol = symbol(row[0]);
    if (!rawSymbol || rawSymbol.startsWith("^")) return;
    const closing = number(row[2]);
    if (!(closing > 0)) {
      rejected.push({ row: rowIndex + 2, symbol: rawSymbol, reason: "INVALID_CLOSING_PRICE" });
      return;
    }
    const previousClose = number(row[1]);
    const change = previousClose > 0 ? Number((closing - previousClose).toFixed(4)) : null;
    data.push({
      symbol: rawSymbol,
      price: closing,
      lastPrice: closing,
      previousClose,
      prevClose: previousClose,
      change,
      changePct: previousClose > 0 ? Number(((change / previousClose) * 100).toFixed(4)) : null,
      high: number(row[5]),
      low: number(row[6]),
      volume: number(row[7]) || 0,
      vwap: number(row[8]),
      deals: number(row[9]) || 0,
      turnoverDisplay: clean(row[10]),
      providerTime: clean(row[12]) || null,
      priceSource: "MYSTOCKS_DAILY_PRICELIST",
      quotedAt: importedAt,
      marketDate
    });
  });
  return { data, rejected, valuationEligible: false };
}

export function normalizeMyStocksCsv({ csvText, fileName, marketDate, importedAt = new Date().toISOString() } = {}) {
  const date = validateMarketDate(marketDate);
  const rows = parseCsv(csvText);
  if (rows.length < 2) throw new Error("The selected CSV contains no market rows.");
  const kind = detectMyStocksCsvKind(rows);
  if (kind === "UNKNOWN") {
    throw new Error("Unsupported CSV. Use the myStocks Equities Real-Time Market Watch or NSE Daily Pricelist export.");
  }
  const normalized = kind === "REAL_TIME_MARKET_WATCH"
    ? normalizeRealTime(rows, date, importedAt)
    : normalizeDaily(rows, date, importedAt);
  if (!normalized.data.length) throw new Error("The CSV contains no usable positive security prices.");
  const checksum = crypto.createHash("sha256").update(String(csvText || "")).digest("hex");
  return {
    provider: kind === "REAL_TIME_MARKET_WATCH"
      ? "MYSTOCKS_MANUAL_EXPORT"
      : "MYSTOCKS_DAILY_PRICELIST",
    upstreamSource: "SYNERGY_SYSTEMS_MYSTOCKS",
    coverage: kind === "REAL_TIME_MARKET_WATCH" ? "FULL_MARKET_EXPORT" : "DAILY_AUDIT_EXPORT",
    kind,
    valuationEligible: normalized.valuationEligible,
    marketDate: date,
    generatedAt: importedAt,
    importedAt,
    fileName: clean(fileName) || "mystocks-market-data.csv",
    checksum,
    count: normalized.data.length,
    pricedCount: normalized.data.length,
    unpricedCount: normalized.rejected.length,
    rejected: normalized.rejected,
    data: normalized.data
  };
}

