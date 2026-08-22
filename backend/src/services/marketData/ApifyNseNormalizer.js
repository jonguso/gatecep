import { applySecurityMaster } from "../../data/nseSecurityMaster.js";

const clean = (value) => String(value ?? "").trim();
const numeric = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, "").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

function candidateRows(payload) {
  if (!Array.isArray(payload)) return [];
  if (payload.length !== 1) return payload;
  const item = payload[0] || {};
  for (const key of ["data", "prices", "quotes", "items", "results", "stocks", "securities"]) {
    if (Array.isArray(item[key])) return item[key];
  }
  return payload;
}

function isNseRow(row = {}) {
  const exchange = clean(row?.exchange ?? row?.market ?? row?.exchangeCode).toUpperCase();
  return !exchange || exchange === "NSE" || exchange === "NAIROBI SECURITIES EXCHANGE";
}

export function resolveApifyAsOf(payload) {
  const first = Array.isArray(payload) ? payload[0] || {} : payload || {};
  return clean(first.asOf ?? first.generatedAt ?? first.updatedAt ?? first.timestamp ?? first.quoteTime ?? first.scrapedAt ?? first.scraped_at ?? first.marketDate ?? first.market_date);
}

export function resolveApifySource(payload) {
  const first = Array.isArray(payload) ? payload[0] || {} : payload || {};
  return clean(first.source ?? first.provider ?? first.dataSource ?? "NSE Kenya Market Data");
}

export function normalizeApifyNseRows(payload, fallbackAsOf) {
  return candidateRows(payload).filter(isNseRow).map((row) => {
    const symbol = clean(row?.symbol ?? row?.ticker ?? row?.code ?? row?.securityCode ?? row?.counter ?? row?.security)
      .toUpperCase().replace(/\.(NR|NSE)$/i, "");
    const price = numeric(row?.lastPrice ?? row?.currentPrice ?? row?.marketPrice ?? row?.price ?? row?.price_kes ?? row?.close ?? row?.lastTradedPrice);
    if (!symbol || !(price > 0)) return null;
    const quotedAt = clean(row?.quotedAt ?? row?.asOf ?? row?.updatedAt ?? row?.timestamp ?? row?.quoteTime ?? row?.scrapedAt ?? row?.scraped_at ?? fallbackAsOf);
    return applySecurityMaster({
      ...row,
      symbol,
      price,
      lastPrice: price,
      prevClose: numeric(row?.prevClose ?? row?.previousClose ?? row?.previousPrice),
      change: numeric(row?.change ?? row?.priceChange),
      changePct: numeric(row?.changePct ?? row?.change_pct ?? row?.percentChange ?? row?.percentageChange),
      volume: numeric(row?.volume ?? row?.sharesTraded),
      turnover: numeric(row?.turnover ?? row?.valueTraded),
      bid: numeric(row?.bid ?? row?.bestBid),
      ask: numeric(row?.ask ?? row?.bestAsk),
      quotedAt,
      exchange: "NSE",
      hasLivePrice: true
    });
  }).filter(Boolean);
}
