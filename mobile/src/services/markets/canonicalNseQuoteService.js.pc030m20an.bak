import { API_URL } from "../../config/apiConfig";
import { userGetItem, userSetItem } from "../auth/userStorage";

const CACHE_KEY = "canonicalNseQuoteSnapshot";
const MIN_REFRESH_MS = 45 * 1000;
const MAX_STALE_MS = 24 * 60 * 60 * 1000;
const SYNTHETIC_SOURCE = /(demo|mock|fake|fallback|simulat|generated)/i;

let inFlight = null;
let memorySnapshot = null;

const clean = (value) => String(value ?? "").trim();
const symbol = (value) => {
  const normalized = clean(value).toUpperCase().replace(/\.NR$/i, "");
  return ({ EQT: "EQTY", IM: "IMH" })[normalized] || normalized;
};
const number = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

function ageMs(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? Date.now() - timestamp : Infinity;
}

function normalizeRows(payload = {}) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.prices)
      ? payload.prices
      : [];
  return rows.map((row) => {
    const ticker = symbol(row?.symbol ?? row?.ticker ?? row?.code);
    const price = number(row?.lastPrice ?? row?.currentPrice ?? row?.price ?? row?.close);
    return ticker && price > 0 ? {
      symbol: ticker,
      price,
      previousClose: number(row?.previousClose ?? row?.prevClose),
      change: number(row?.change),
      changePct: number(row?.changePct ?? row?.percentChange),
      quotedAt: row?.quotedAt ?? row?.updatedAt ?? payload?.generatedAt ?? new Date().toISOString()
    } : null;
  }).filter(Boolean);
}

function sourceName(payload = {}) {
  if (Array.isArray(payload)) return "NSE_PRICE_ENDPOINT";
  return clean(payload?.provider ?? payload?.source ?? payload?.priceSource ?? "NSE_PRICE_ENDPOINT");
}

export function buildNsePriceMap(snapshot = {}) {
  return (Array.isArray(snapshot?.quotes) ? snapshot.quotes : []).reduce((map, quote) => {
    map[quote.symbol] = {
      price: quote.price,
      lastPrice: quote.price,
      currentPrice: quote.price,
      quotedAt: quote.quotedAt,
      source: snapshot.source
    };
    return map;
  }, {});
}

export function isNseMarketSessionOpen(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
  }).formatToParts(date).reduce((result, item) => ({ ...result, [item.type]: item.value }), {});
  if (["Sat", "Sun"].includes(parts.weekday)) return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= 9 * 60 && minutes <= 15 * 60 + 30;
}

async function readCache() {
  if (memorySnapshot) return memorySnapshot;
  try {
    const raw = await userGetItem(CACHE_KEY);
    memorySnapshot = raw ? JSON.parse(raw) : null;
  } catch {
    memorySnapshot = null;
  }
  return memorySnapshot;
}

async function fetchSnapshot() {
  const response = await fetch(`${API_URL}/prices?t=${Date.now()}`);
  if (!response.ok) throw new Error("NSE market-price request failed.");
  const payload = await response.json();
  const source = sourceName(payload);
  if (SYNTHETIC_SOURCE.test(source) || payload?.valuationEligible !== true) {
    const error = new Error("Only a verified market provider can value a REAL portfolio.");
    error.code = "UNVERIFIED_PRICE_SOURCE";
    throw error;
  }
  const quotes = normalizeRows(payload);
  if (!quotes.length) throw new Error("The NSE market feed returned no usable prices.");
  const snapshot = {
    status: "LIVE",
    source,
    generatedAt: payload?.generatedAt || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    quotes
  };
  memorySnapshot = snapshot;
  await userSetItem(CACHE_KEY, JSON.stringify(snapshot));
  return snapshot;
}

export async function loadCanonicalNseQuotes({ force = false } = {}) {
  const cached = await readCache();
  if (!force && cached && ageMs(cached.receivedAt) < MIN_REFRESH_MS) return cached;
  if (!inFlight) inFlight = fetchSnapshot().finally(() => { inFlight = null; });
  try {
    return await inFlight;
  } catch (error) {
    if (cached && ageMs(cached.receivedAt) <= MAX_STALE_MS) {
      return { ...cached, status: "STALE", error: error?.message || "Market prices are temporarily unavailable." };
    }
    return {
      status: "UNAVAILABLE", source: null, generatedAt: null, receivedAt: null, quotes: [],
      error: error?.message || "Market prices are unavailable."
    };
  }
}

export function overlayCanonicalNseQuotes(holdings = [], snapshot = {}) {
  const priceMap = buildNsePriceMap(snapshot);
  let updatedCount = 0;
  const enriched = (Array.isArray(holdings) ? holdings : []).map((holding) => {
    const ticker = symbol(holding?.symbol ?? holding?.ticker ?? holding?.code);
    const quote = priceMap[ticker];
    if (!quote) return { ...holding, marketPriceStatus: "BROKER_VALUATION" };
    const quantity = number(holding?.quantity ?? holding?.qty ?? holding?.shares) || 0;
    updatedCount += 1;
    return {
      ...holding,
      brokerMarketPrice: number(holding?.marketPrice ?? holding?.price),
      brokerMarketValue: number(holding?.marketValue ?? holding?.currentValue),
      marketPrice: quote.price,
      price: quote.price,
      marketValue: quantity * quote.price,
      currentValue: quantity * quote.price,
      marketPriceStatus: snapshot?.status,
      marketPriceSource: snapshot?.source,
      marketPriceUpdatedAt: quote.quotedAt || snapshot?.generatedAt
    };
  });
  return { holdings: enriched, updatedCount, totalCount: enriched.length };
}
