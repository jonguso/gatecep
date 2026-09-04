import { collectVerifiedNews } from "./verifiedNews.collector.js";

let timer = null;
let lastRunAt = null;
let lastResult = null;

function intervalMs() {
  return Math.max(60 * 60 * 1000, Number(process.env.NEWS_COLLECTION_INTERVAL_MS || 6 * 60 * 60 * 1000));
}

async function cycle() {
  lastRunAt = new Date().toISOString();
  try {
    lastResult = await collectVerifiedNews();
    console.log(`Verified news collection: ${lastResult.status}, ${lastResult.acceptedCount || 0} accepted.`);
  } catch (error) {
    lastResult = { ok: false, error: error.message };
    console.log("Verified news collection failed; retaining stored news:", error.message);
  }
  return lastResult;
}

export function startVerifiedNewsScheduler() {
  const enabled = String(process.env.NEWS_COLLECTION_ENABLED || "false").toLowerCase() === "true";
  if (!enabled || !process.env.APIFY_API_TOKEN) return { running: false, enabled, reason: "NOT_CONFIGURED" };
  if (timer) return getVerifiedNewsSchedulerStatus();
  cycle();
  timer = setInterval(cycle, intervalMs());
  return getVerifiedNewsSchedulerStatus();
}

export function getVerifiedNewsSchedulerStatus() {
  return { running: Boolean(timer), enabled: String(process.env.NEWS_COLLECTION_ENABLED || "false").toLowerCase() === "true", intervalMs: intervalMs(), lastRunAt, lastResult };
}
