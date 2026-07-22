import { applySecurityMaster } from "./nseSecurityMaster";
import { API_URL } from "../config/apiConfig";


const DEFAULT_WATCHLIST = [
  { symbol: "SCOM" },
  { symbol: "KCB" },
  { symbol: "EQT" },
  { symbol: "COOP" },
  { symbol: "EABL" },
  { symbol: "BAT" },
  { symbol: "KEGN" },
  { symbol: "KQ" },
  { symbol: "KPC" },
  { symbol: "KAPC" },
  { symbol: "KPLC" },
  { symbol: "SBIC" },
  { symbol: "SMWF" },
  { symbol: "SCBK" },
  { symbol: "GLD" },
  { symbol: "ABSA" },
  { symbol: "KNRE" },
  { symbol: "IMH" },
  { symbol: "DTK" }
];

export function getDefaultWatchlist() {
  return DEFAULT_WATCHLIST.map(applySecurityMaster);
}

export async function fetchWatchlistMarketRows(items = []) {
  const response = await fetch(`${API_URL}/prices`);

  if (!response.ok) {
    throw new Error("Market price request failed.");
  }

  const json = await response.json();

  const marketRows = Array.isArray(json?.data) ? json.data : [];

  const marketMap = new Map();

  marketRows.forEach((row) => {
    const mastered = applySecurityMaster(row);
    marketMap.set(mastered.symbol, mastered);
  });

  return items
    .map((item) => {
      const mastered = applySecurityMaster(item);
      const market = marketMap.get(mastered.symbol);

      if (!market) {
        return mastered;
      }

      return {
        ...mastered,
        ...market,
        currentPrice: Number(market.price || market.lastPrice || 0),
        changePct: Number(market.changePct || 0),
        updatedAt: json.generatedAt || new Date().toISOString()
      };
    })
    .filter((item) => item.symbol);
}

export function generateWatchlistSignals(items = []) {
  return items.map((item) => {
    const changePct = Number(item.changePct || 0);
    const currentPrice = Number(
      item.currentPrice ||
      item.price ||
      item.lastPrice ||
      0
    );

    let signal = "WATCH";
    let reason = "Price movement is normal. Keep watching.";

    if (changePct >= 3) {
      signal = "HOT";
      reason = "Strong upward movement. Avoid chasing; wait for confirmation.";
    } else if (changePct <= -3) {
      signal = "OPPORTUNITY";
      reason = "Price dropped meaningfully. Review fundamentals before buying.";
    } else if (changePct >= 1) {
      signal = "POSITIVE";
      reason = "Mild positive movement with stable trend.";
    } else if (changePct <= -1) {
      signal = "CAUTION";
      reason = "Mild weakness. Watch before committing new cash.";
    }

    return {
      ...item,
      currentPrice,
      changePct,
      signal,
      reason,
      updatedAt: item.updatedAt || new Date().toISOString()
    };
  });
}