import ApifyNseMarketDataAdapter from "../../services/marketData/ApifyNseMarketDataAdapter.js";
import { readLatestVerifiedEodSnapshot, saveVerifiedEodSnapshot } from "./marketEod.repository.js";
import { getNairobiMarketClock, isEodCollectionDue } from "./marketEodPolicy.js";

let lastAttemptKey = null;
let lastAttemptAt = 0;

export async function collectVerifiedEodIfDue({ force = false, now = new Date() } = {}) {
  const latest = await readLatestVerifiedEodSnapshot();
  const latestMarketDate = latest?.marketDate || null;
  const clock = getNairobiMarketClock(now);
  if (!force && !isEodCollectionDue({ now, latestMarketDate })) {
    return { ok: true, updated: false, reason: "NOT_DUE", latestMarketDate };
  }

  const retryMs = Number(process.env.MARKET_EOD_COLLECTION_RETRY_MS || 3600000);
  if (!force && lastAttemptKey === clock.date && now.getTime() - lastAttemptAt < retryMs) {
    return { ok: true, updated: false, reason: "RETRY_WINDOW", latestMarketDate };
  }
  lastAttemptKey = clock.date;
  lastAttemptAt = now.getTime();

  const upstream = String(process.env.MARKET_EOD_UPSTREAM_PROVIDER || "APIFY_NSE").toUpperCase();
  if (upstream !== "APIFY_NSE") throw new Error(`Unsupported MARKET_EOD_UPSTREAM_PROVIDER: ${upstream}`);
  const snapshot = await ApifyNseMarketDataAdapter.getPrices();
  const minimumQuotes = Number(process.env.MARKET_EOD_MINIMUM_QUOTES || 40);
  if (snapshot.valuationEligible !== true || snapshot.coverage !== "FULL_MARKET") {
    throw new Error("The EOD collector requires a full, valuation-eligible NSE market snapshot.");
  }
  if (Number(snapshot.count || snapshot.data?.length || 0) < minimumQuotes) {
    throw new Error(`The EOD collector received fewer than ${minimumQuotes} verified NSE prices.`);
  }
  const saved = await saveVerifiedEodSnapshot(snapshot);
  return {
    ok: true,
    updated: true,
    provider: snapshot.provider,
    localProvider: "LOCAL_VERIFIED_EOD",
    ...saved
  };
}
