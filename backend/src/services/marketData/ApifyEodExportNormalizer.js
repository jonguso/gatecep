import crypto from "crypto";
import { applySecurityMaster } from "../../data/nseSecurityMaster.js";
import { parseCsv } from "./MyStocksCsvNormalizer.js";

const clean = (value) => String(value ?? "").replace(/^\uFEFF/, "").trim();
const numberOrNull = (value) => {
  const parsed = Number(clean(value).replace(/,/g, "").replace(/%$/, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

function parseExport(fileText, fileName) {
  const text = clean(fileText);
  if (!text) throw new Error("The selected Apify export is empty.");
  const looksJson = /\.json$/i.test(clean(fileName)) || text.startsWith("[") || text.startsWith("{");
  if (looksJson) {
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw new Error("The selected Apify JSON is invalid."); }
    const rows = Array.isArray(parsed) ? parsed : parsed?.data || parsed?.items || parsed?.results;
    if (!Array.isArray(rows)) throw new Error("The Apify JSON does not contain a market row array.");
    return { format: "JSON", rows };
  }
  const matrix = parseCsv(text);
  if (matrix.length < 2) throw new Error("The selected Apify CSV contains no market rows.");
  const headers = matrix[0].map((value) => clean(value));
  return {
    format: "CSV",
    rows: matrix.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]])))
  };
}

function marketDateAtNairobi(timestamp) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function canonicalChecksum(data) {
  const canonical = [...data].sort((a, b) => a.symbol.localeCompare(b.symbol)).map((row) => ({
    symbol: row.symbol,
    price: row.price,
    change: row.change,
    changePct: row.changePct,
    volume: row.volume,
    quotedAt: row.quotedAt
  }));
  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function normalizeApifyEodExport({ fileText, csvText, fileName } = {}) {
  const parsed = parseExport(fileText ?? csvText, fileName);
  const rejected = [];
  const bySymbol = new Map();
  let upstreamTimestamp = null;

  parsed.rows.forEach((row, index) => {
    const exchange = clean(row.exchange ?? row.market ?? row.exchangeCode).toUpperCase();
    const rawSymbol = clean(row.ticker ?? row.symbol ?? row.code).toUpperCase().replace(/\.(NR|NSE)$/i, "");
    const price = numberOrNull(row.price ?? row.price_kes ?? row.lastPrice ?? row.close);
    const quotedAt = clean(row.scraped_at ?? row.scrapedAt ?? row.quotedAt ?? row.timestamp);
    if (exchange && exchange !== "NSE" && exchange !== "NAIROBI SECURITIES EXCHANGE") {
      rejected.push({ row: index + 1, symbol: rawSymbol, reason: "NOT_NSE" });
      return;
    }
    if (!rawSymbol || !(price > 0)) {
      rejected.push({ row: index + 1, symbol: rawSymbol, reason: "INVALID_SYMBOL_OR_PRICE" });
      return;
    }
    if (!Number.isFinite(new Date(quotedAt).getTime())) {
      rejected.push({ row: index + 1, symbol: rawSymbol, reason: "INVALID_UPSTREAM_TIMESTAMP" });
      return;
    }
    upstreamTimestamp = !upstreamTimestamp || new Date(quotedAt) > new Date(upstreamTimestamp)
      ? quotedAt : upstreamTimestamp;
    const mastered = applySecurityMaster({
      symbol: rawSymbol,
      name: clean(row.name) || rawSymbol,
      price,
      lastPrice: price,
      change: numberOrNull(row.change),
      changePct: numberOrNull(row.change_pct ?? row.changePct),
      volume: numberOrNull(row.volume) || 0,
      quotedAt: new Date(quotedAt).toISOString(),
      exchange: "NSE",
      priceSource: "APIFY_MANUAL_EOD",
      hasLivePrice: false
    });
    bySymbol.set(mastered.symbol, mastered);
  });

  const data = [...bySymbol.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
  const minimumQuotes = Number(process.env.MARKET_EOD_MINIMUM_QUOTES || 40);
  if (data.length < minimumQuotes) {
    throw new Error(`The Apify export has ${data.length} usable NSE prices; at least ${minimumQuotes} are required.`);
  }
  const marketDate = marketDateAtNairobi(upstreamTimestamp);
  if (!marketDate) throw new Error("The Apify export is missing a valid upstream quote timestamp.");
  const checksum = canonicalChecksum(data);
  return {
    provider: "APIFY_MANUAL_EOD",
    upstreamSource: "APIFY_AFRICAN_STOCK_MARKET_DATA",
    kind: `APIFY_${parsed.format}_EOD_EXPORT`,
    format: parsed.format,
    coverage: "FULL_MARKET",
    valuationEligible: true,
    marketDate,
    generatedAt: new Date(upstreamTimestamp).toISOString(),
    importedAt: new Date().toISOString(),
    fileName: clean(fileName) || `apify-nse-eod.${parsed.format.toLowerCase()}`,
    checksum,
    count: data.length,
    pricedCount: data.length,
    unpricedCount: rejected.length,
    rejected,
    data
  };
}
