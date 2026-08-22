import { refreshMarketCache } from "./marketCache.service.js";
import { emitMarketCacheUpdated } from "./marketCache.socket.js";
import { broadcastPortfolioUpdatesForActiveUsers } from "../live-portfolio/livePortfolio.service.js";
import { collectVerifiedEodIfDue } from "./marketEodCollector.service.js";

let refreshTimer = null;

function getRefreshIntervalMs() {
  return Math.max(300000, Number(process.env.MARKET_EOD_SCHEDULER_CHECK_MS || 900000));
}

async function runEodCycle(label) {
  let collectionError = null;
  try {
    const collection = await collectVerifiedEodIfDue();
    if (collection.updated) {
      console.log(`Verified EOD collected: ${collection.count} NSE quotes for ${collection.marketDate}.`);
    }
  } catch (error) {
    collectionError = error;
    console.log("Verified EOD collection failed; retaining the last local snapshot:", error.message);
  }

  const result = await refreshMarketCache();
  console.log(`${label}: ${result.count} quotes from ${result.provider}`);
  if (collectionError) result.collectionError = collectionError.message;

  emitMarketCacheUpdated({
    provider: result.provider,
    marketDate: result.marketDate,
    generatedAt: result.generatedAt,
    count: result.count
  });
  broadcastPortfolioUpdatesForActiveUsers().catch((error) => {
    console.log("Live portfolio broadcast failed:", error.message);
  });
  return result;
}

export function startMarketCacheScheduler() {
  if (refreshTimer) {
    return {
      ok: true,
      running: true,
      intervalMs: getRefreshIntervalMs(),
      message: "Market cache scheduler already running."
    };
  }

  const intervalMs = getRefreshIntervalMs();

  runEodCycle("Market cache initial load")
    .catch((error) => {
      console.log("Market cache initial load failed:", error.message);
    });

  refreshTimer = setInterval(async () => {
    try {
      await runEodCycle("Market cache checked");
    } catch (error) {
      console.log("Market cache refresh failed:", error.message);
    }
  }, intervalMs);

  return {
    ok: true,
    running: true,
    intervalMs,
    version: "MarketCacheScheduler-019D"
  };
}

export function stopMarketCacheScheduler() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  return {
    ok: true,
    running: false,
    intervalMs: getRefreshIntervalMs(),
    version: "MarketCacheScheduler-019D"
  };
}

export function getMarketCacheSchedulerStatus() {
  return {
    ok: true,
    running: Boolean(refreshTimer),
    intervalMs: getRefreshIntervalMs(),
    version: "MarketCacheScheduler-019D"
  };
}
