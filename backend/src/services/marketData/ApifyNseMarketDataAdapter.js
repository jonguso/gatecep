import axios from "axios";
import { normalizeApifyNseRows, resolveApifyAsOf, resolveApifySource } from "./ApifyNseNormalizer.js";
import { assertFreshApifyNseQuote, normalizeApifyActorId } from "./ApifyNsePolicy.js";

const clean = (value) => String(value ?? "").trim();

function configuration() {
  const token = clean(process.env.APIFY_API_TOKEN);
  const actorId = normalizeApifyActorId(
    process.env.APIFY_ACTOR_ID || "mansalabs/african-stock-market-data"
  );
  if (!token) throw new Error("APIFY_API_TOKEN is required for APIFY_NSE market data.");
  let input = {};
  try {
    input = JSON.parse(process.env.APIFY_ACTOR_INPUT_JSON || "{}");
  } catch {
    throw new Error("APIFY_ACTOR_INPUT_JSON must be valid JSON.");
  }
  return { token, actorId, input };
}

const adapter = {
  async getPrices() {
    const { token, actorId, input } = configuration();
    const runTimeoutSeconds = Math.min(300, Math.max(30, Number(process.env.APIFY_RUN_TIMEOUT_SECONDS || 180)));
    const response = await axios.post(
      `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items`,
      input,
      {
        params: {
          format: "json",
          timeout: runTimeoutSeconds,
          maxItems: Number(process.env.APIFY_MAX_ITEMS || 500),
          maxTotalChargeUsd: Number(process.env.APIFY_MAX_TOTAL_CHARGE_USD || 0.25)
        },
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        timeout: (runTimeoutSeconds + 15) * 1000
      }
    );
    const payload = response.data || [];
    const asOf = resolveApifyAsOf(payload);
    assertFreshApifyNseQuote(asOf);
    const data = normalizeApifyNseRows(payload, asOf);
    if (!data.length) throw new Error("Apify NSE Actor returned no usable quote rows.");
    const provider = "APIFY_NSE_KENYA_MARKET_DATA";
    const inputRows = Array.isArray(payload)
      ? payload.filter((row) => !row?.exchange || String(row.exchange).toUpperCase() === "NSE").length
      : 0;
    const categories = [...new Set((Array.isArray(payload) ? payload : []).map((row) => row?.category).filter(Boolean))];
    return {
      provider,
      upstreamSource: resolveApifySource(payload),
      valuationEligible: true,
      coverage: data.length < inputRows || categories.length ? "PARTIAL_RANKED_MARKET" : "FULL_MARKET",
      pricedCount: data.length,
      unpricedCount: Math.max(0, inputRows - data.length),
      categories,
      generatedAt: asOf,
      marketDate: String(asOf).slice(0, 10),
      count: data.length,
      data: data.map((row) => ({ ...row, priceSource: provider, quotedAt: row.quotedAt || asOf }))
    };
  }
};

export default adapter;
