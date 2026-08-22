import {
  nseSecurityMaster,
  applySecurityMaster
} from "../../data/nseSecurityMaster.js";
import { nseEodPrices } from "../../data/nseEodPrices.js";

function getProviderName() {
  return String(process.env.MARKET_DATA_PROVIDER || "LOCAL_EOD")
    .trim()
    .toUpperCase();
}

function buildLocalEodPrices() {
  const priceMap = new Map();

  nseEodPrices.data.forEach((row) => {
    const mastered = applySecurityMaster(row);
    priceMap.set(mastered.symbol, mastered);
  });

  const data = Object.values(nseSecurityMaster).map((security) => {
    const eod = priceMap.get(security.symbol);

    const price = Number(eod?.price || security.price || 0);
    const prevClose = Number(eod?.prevClose || security.price || price || 0);
    const change = Number((price - prevClose).toFixed(2));

    const changePct =
      prevClose > 0
        ? Number(((change / prevClose) * 100).toFixed(2))
        : 0;

    const volume = Number(eod?.volume || 0);

    return applySecurityMaster({
      symbol: security.symbol,
      name: security.name,
      sector: security.sector,
      price,
      lastPrice: price,
      prevClose,
      open: prevClose,
      high: Math.max(price, prevClose),
      low: Math.min(price, prevClose),
      change,
      changePct,
      volume,
      turnover: Math.round(price * volume),
      bid: Number((price * 0.995).toFixed(2)),
      ask: Number((price * 1.005).toFixed(2)),
      hasLivePrice: false,
      priceSource: "LOCAL_EOD",
      marketDate: nseEodPrices.marketDate
    });
  });

  return {
    provider: "LOCAL_EOD",
    valuationEligible: false,
    generatedAt: new Date().toISOString(),
    marketDate: nseEodPrices.marketDate,
    count: data.length,
    data
  };
}

async function loadAdapter(provider) {
  if (provider === "LOCAL_EOD" || provider === "LOCAL_VERIFIED_EOD") {
    const module = await import("./LocalVerifiedEodAdapter.js");
    return module.default;
  }
  if (provider === "APIFY_NSE") {
    const module = await import("./ApifyNseMarketDataAdapter.js");
    return module.default;
  }
  if (provider === "VERIFIED_HTTP") {
    const module = await import("./VerifiedHttpMarketDataAdapter.js");
    return module.default;
  }
  if (provider === "SIMULATED") {
    const module = await import("./SimulatedDataAdapter.js");
    return module.default;
  }

  if (provider === "DELAYED_PUBLIC") {
    const module = await import("./DelayedPublicDataAdapter.js");
    return module.default;
  }

  if (provider === "LICENSED_NSE") {
    const module = await import("./LicensedNseVendorAdapter.js");
    return module.default;
  }

  return null;
}

class MarketDataGateway {
  async getPrices() {
    const provider = getProviderName();

    if (provider === "BUNDLED_EOD_REFERENCE") {
      return buildLocalEodPrices();
    }

    const adapter = await loadAdapter(provider);

    if (!adapter?.getPrices) throw new Error(`Unsupported MARKET_DATA_PROVIDER: ${provider}`);

    return await adapter.getPrices();
  }

  async getCandles(symbol, interval = "1m") {
    const provider = getProviderName();
    const adapter = await loadAdapter(provider);

    if (adapter?.getCandles) {
      return await adapter.getCandles(symbol, interval);
    }

    return {
      provider: "LOCAL_EOD",
      symbol,
      interval,
      data: []
    };
  }

  async getMarketSummary() {
    const provider = getProviderName();
    const adapter = await loadAdapter(provider);
    const prices = provider === "BUNDLED_EOD_REFERENCE"
      ? buildLocalEodPrices()
      : adapter?.getMarketSummary
        ? await adapter.getMarketSummary()
        : await this.getPrices();

    const rows = prices.data.map((row) => ({
      ...row,
      changePct: Number(row.changePct || 0),
      volume: Number(row.volume || 0)
    }));

    return {
      provider: "LOCAL_EOD",
      marketStatus: "EOD",
      marketDate: prices.marketDate,
      gainers: rows
        .slice()
        .sort((a, b) => b.changePct - a.changePct)
        .slice(0, 5),
      losers: rows
        .slice()
        .sort((a, b) => a.changePct - b.changePct)
        .slice(0, 5),
      active: rows
        .slice()
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5)
    };
  }
}

export const marketDataGateway = new MarketDataGateway();
