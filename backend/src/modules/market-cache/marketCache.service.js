import { marketDataGateway } from "../../services/marketData/MarketDataGateway.js";
import { readLatestManualMarketImport } from "./manualMarketImport.service.js";

let quoteCache = {
  provider: "UNKNOWN",
  valuationEligible: false,
  coverage: null,
  pricedCount: 0,
  unpricedCount: 0,
  marketDate: null,
  generatedAt: null,
  count: 0,
  data: [],
  bySymbol: {}
};
let refreshInFlight = null;
let manualSnapshotActive = false;

function normalizeSymbol(symbol) {
  const normalized = String(symbol || "").toUpperCase().trim().replace(/\.NR$/, "");
  return ({ EQT: "EQTY", IM: "IMH" })[normalized] || normalized;
}

async function performMarketCacheRefresh() {
  try {
    const prices = await marketDataGateway.getPrices();
    if (prices?.valuationEligible !== true) {
      throw new Error(`${prices?.provider || "Configured provider"} is not eligible for REAL portfolio valuation.`);
    }
    const refreshed = installSnapshot(prices, { manual: false });
    return { ...refreshed, refreshStatus: "AUTOMATIC_PROVIDER_ACTIVE", refreshError: null };
  } catch (error) {
    if (manualSnapshotActive && quoteCache.valuationEligible && quoteCache.count > 0) {
      return {
        ...getMarketCache(),
        refreshStatus: "MANUAL_FALLBACK_RETAINED",
        refreshError: error?.message || String(error)
      };
    }
    throw error;
  }
}

function installSnapshot(prices, { manual = false } = {}) {
  const rows = prices?.data || [];
  const bySymbol = {};
  rows.forEach((row) => {
    const symbol = normalizeSymbol(row.symbol);
    const price = Number(row.price || row.lastPrice || 0);
    if (!symbol || !(price > 0)) return;
    bySymbol[symbol] = {
      ...row,
      symbol,
      price,
      lastPrice: price,
      prevClose: Number(row.prevClose || row.previousClose || 0),
      change: Number(row.change || 0),
      changePct: Number(row.changePct || 0),
      volume: Number(row.volume || 0),
      turnover: Number(row.turnover || 0),
      bid: Number(row.bid || 0),
      ask: Number(row.ask || 0),
      priceSource: row.priceSource || prices.provider || "UNKNOWN",
      cachedAt: new Date().toISOString()
    };
  });
  quoteCache = {
    provider: prices?.provider || "UNKNOWN",
    valuationEligible: prices?.valuationEligible === true,
    upstreamSource: prices?.upstreamSource || null,
    coverage: prices?.coverage || null,
    pricedCount: Number(prices?.pricedCount ?? Object.keys(bySymbol).length),
    unpricedCount: Number(prices?.unpricedCount || 0),
    marketDate: prices?.marketDate || null,
    generatedAt: prices?.generatedAt || new Date().toISOString(),
    fileName: prices?.fileName || null,
    checksum: prices?.checksum || null,
    importKind: prices?.kind || null,
    count: Object.keys(bySymbol).length,
    data: Object.values(bySymbol),
    bySymbol
  };
  manualSnapshotActive = manual && quoteCache.valuationEligible;
  return getMarketCache();
}

export function installManualMarketSnapshot(snapshot) {
  if (snapshot?.provider !== "MYSTOCKS_MANUAL_EXPORT" || snapshot?.valuationEligible !== true) {
    throw new Error("Only a validated myStocks real-time market export can replace the valuation cache.");
  }
  return installSnapshot(snapshot, { manual: true });
}

export async function restoreLatestManualMarketSnapshot() {
  const snapshot = await readLatestManualMarketImport();
  if (!snapshot || snapshot?.provider !== "MYSTOCKS_MANUAL_EXPORT" || snapshot?.valuationEligible !== true) {
    return null;
  }
  return installSnapshot(snapshot, { manual: true });
}

export async function refreshMarketCache() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = performMarketCacheRefresh();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export function getMarketCache() {
  return {
    provider: quoteCache.provider,
    valuationEligible: quoteCache.valuationEligible,
    upstreamSource: quoteCache.upstreamSource,
    coverage: quoteCache.coverage,
    pricedCount: quoteCache.pricedCount,
    unpricedCount: quoteCache.unpricedCount,
    marketDate: quoteCache.marketDate,
    generatedAt: quoteCache.generatedAt,
    fileName: quoteCache.fileName || null,
    checksum: quoteCache.checksum || null,
    importKind: quoteCache.importKind || null,
    count: quoteCache.count,
    data: quoteCache.data
  };
}

export function getCachedQuote(symbol) {
  return quoteCache.bySymbol[normalizeSymbol(symbol)] || null;
}

export function getCachedQuotes(symbols = []) {
  return symbols.map((symbol) => getCachedQuote(symbol)).filter(Boolean);
}

export function getMarketCacheStatus() {
  return {
    ok: true,
    provider: quoteCache.provider,
    valuationEligible: quoteCache.valuationEligible,
    coverage: quoteCache.coverage,
    pricedCount: quoteCache.pricedCount,
    unpricedCount: quoteCache.unpricedCount,
    marketDate: quoteCache.marketDate,
    generatedAt: quoteCache.generatedAt,
    fileName: quoteCache.fileName || null,
    importKind: quoteCache.importKind || null,
    count: quoteCache.count,
    ready: quoteCache.count > 0,
    manualSnapshotActive,
    version: "MarketCache-PC030M10F"
  };
}
