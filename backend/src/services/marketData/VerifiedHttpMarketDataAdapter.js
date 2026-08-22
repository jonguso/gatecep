import axios from "axios";
import { applySecurityMaster } from "../../data/nseSecurityMaster.js";

const forbiddenSource = /(demo|mock|fake|fallback|simulat|generated|local[_ -]?eod)/i;
const clean = (value) => String(value ?? "").trim();
const number = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

function requireConfiguration() {
  const url = clean(process.env.MARKET_DATA_URL);
  const provider = clean(process.env.MARKET_DATA_PROVIDER_NAME);
  if (!url) throw new Error("MARKET_DATA_URL is required for VERIFIED_HTTP market data.");
  if (!provider || forbiddenSource.test(provider)) {
    throw new Error("MARKET_DATA_PROVIDER_NAME must identify a genuine licensed or broker market feed.");
  }
  return { url, provider };
}

function requestHeaders() {
  const token = clean(process.env.MARKET_DATA_API_KEY);
  const header = clean(process.env.MARKET_DATA_API_KEY_HEADER || "Authorization");
  const prefix = process.env.MARKET_DATA_API_KEY_PREFIX === undefined
    ? "Bearer "
    : String(process.env.MARKET_DATA_API_KEY_PREFIX);
  return token ? { [header]: `${prefix}${token}` } : {};
}

function normalizeRows(payload = {}) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.prices)
        ? payload.prices
        : Array.isArray(payload?.quotes)
          ? payload.quotes
          : [];

  return rows.map((row) => {
    const symbol = clean(row?.symbol ?? row?.ticker ?? row?.code).toUpperCase().replace(/\.NR$/i, "");
    const price = number(row?.lastPrice ?? row?.currentPrice ?? row?.price ?? row?.close);
    if (!symbol || !(price > 0)) return null;
    return applySecurityMaster({
      ...row,
      symbol,
      price,
      lastPrice: price,
      prevClose: number(row?.prevClose ?? row?.previousClose),
      change: number(row?.change),
      changePct: number(row?.changePct ?? row?.percentChange),
      volume: number(row?.volume),
      turnover: number(row?.turnover),
      bid: number(row?.bid),
      ask: number(row?.ask),
      hasLivePrice: true
    });
  }).filter(Boolean);
}

function assertFresh(asOf) {
  const timestamp = Date.parse(asOf || "");
  const maxAgeMinutes = Number(process.env.MARKET_DATA_MAX_AGE_MINUTES || 30);
  if (!Number.isFinite(timestamp)) throw new Error("Verified market response is missing a valid quote timestamp.");
  if (Date.now() - timestamp > maxAgeMinutes * 60 * 1000) {
    throw new Error("Verified market response is older than the configured freshness limit.");
  }
}

const adapter = {
  async getPrices() {
    const { url, provider } = requireConfiguration();
    const response = await axios.get(url, {
      headers: requestHeaders(),
      timeout: Number(process.env.MARKET_DATA_TIMEOUT_MS || 12000)
    });
    const payload = response.data || {};
    const upstreamSource = clean(payload?.provider ?? payload?.source ?? provider);
    if (forbiddenSource.test(upstreamSource)) throw new Error("Upstream returned a synthetic market-data source.");
    const asOf = payload?.asOf ?? payload?.generatedAt ?? payload?.updatedAt;
    assertFresh(asOf);
    const data = normalizeRows(payload);
    if (!data.length) throw new Error("Verified market provider returned no usable NSE quotes.");
    return {
      provider,
      upstreamSource,
      valuationEligible: true,
      delayed: Boolean(payload?.delayed),
      marketDate: payload?.marketDate || String(asOf).slice(0, 10),
      generatedAt: asOf,
      count: data.length,
      data: data.map((row) => ({ ...row, priceSource: provider, quotedAt: row?.quotedAt || asOf }))
    };
  }
};

export default adapter;
