import axios from "axios";
import { buildNewsQueries } from "./newsQueryPolicy.js";

function actorId() {
  return String(process.env.APIFY_NEWS_ACTOR_ID || "apify/rag-web-browser").trim().replace(/\//g, "~");
}

export async function runApifyNewsQuery(sourceQuery) {
  const token = String(process.env.APIFY_API_TOKEN || "").trim();
  if (!token) throw new Error("APIFY_API_TOKEN is required for verified news collection.");
  const timeoutSeconds = Math.min(180, Math.max(30, Number(process.env.APIFY_NEWS_TIMEOUT_SECONDS || 90)));
  const response = await axios.post(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId())}/run-sync-get-dataset-items`,
    {
      query: sourceQuery.query,
      maxResults: Math.min(10, Math.max(1, Number(process.env.APIFY_NEWS_MAX_RESULTS || 8))),
      outputFormats: ["markdown"],
      requestTimeoutSecs: Math.min(75, timeoutSeconds - 5),
      scrapingTool: sourceQuery.scrapingTool || "raw-http",
      ...(sourceQuery.dynamicContentWaitSecs ? { dynamicContentWaitSecs: sourceQuery.dynamicContentWaitSecs } : {})
    },
    {
      params: {
        format: "json",
        timeout: timeoutSeconds,
        maxItems: 10,
        maxTotalChargeUsd: Number(process.env.APIFY_NEWS_MAX_TOTAL_CHARGE_USD || 0.1)
      },
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      timeout: (timeoutSeconds + 15) * 1000
    }
  );
  return Array.isArray(response.data) ? response.data : [];
}

export { buildNewsQueries };
