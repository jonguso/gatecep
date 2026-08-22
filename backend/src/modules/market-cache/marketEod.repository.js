import crypto from "node:crypto";
import { pool } from "../../database/db.js";

const numberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function normalizeRows(rows = []) {
  const bySymbol = new Map();
  rows.forEach((row) => {
    const symbol = String(row?.symbol || "").trim().toUpperCase();
    const price = numberOrNull(row?.price ?? row?.lastPrice);
    if (!symbol || !(price > 0)) return;
    bySymbol.set(symbol, { ...row, symbol, price, lastPrice: price });
  });
  return [...bySymbol.values()];
}

export async function saveVerifiedEodSnapshot(snapshot = {}) {
  if (snapshot?.valuationEligible !== true) throw new Error("Only valuation-eligible market data can be persisted as verified EOD.");
  const marketDate = String(snapshot.marketDate || "").slice(0, 10);
  const generatedAt = new Date(snapshot.generatedAt || "");
  const rows = normalizeRows(snapshot.data);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(marketDate)) throw new Error("Verified EOD snapshot requires a market date.");
  if (!Number.isFinite(generatedAt.getTime())) throw new Error("Verified EOD snapshot requires a valid generated timestamp.");
  if (!rows.length) throw new Error("Verified EOD snapshot contains no usable prices.");

  const payloadHash = crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const saved = await client.query(
      `INSERT INTO public.market_eod_snapshots
        (provider, upstream_source, market_date, generated_at, coverage, quote_count, payload_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (provider, market_date) DO UPDATE SET
         upstream_source = EXCLUDED.upstream_source,
         generated_at = EXCLUDED.generated_at,
         collected_at = NOW(),
         coverage = EXCLUDED.coverage,
         quote_count = EXCLUDED.quote_count,
         payload_hash = EXCLUDED.payload_hash
       RETURNING id`,
      [
        "LOCAL_VERIFIED_EOD",
        snapshot.provider || snapshot.upstreamSource || "VERIFIED_UPSTREAM",
        marketDate,
        generatedAt.toISOString(),
        snapshot.coverage || "FULL_MARKET",
        rows.length,
        payloadHash
      ]
    );
    const snapshotId = saved.rows[0].id;
    await client.query("DELETE FROM public.market_eod_quotes WHERE snapshot_id = $1", [snapshotId]);
    for (const row of rows) {
      await client.query(
        `INSERT INTO public.market_eod_quotes
          (snapshot_id, symbol, name, sector, price, previous_close, change_amount, change_percent,
           volume, turnover, bid, ask, quoted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          snapshotId,
          row.symbol,
          row.name || row.symbol,
          row.sector || "Unknown",
          row.price,
          numberOrNull(row.prevClose),
          numberOrNull(row.change),
          numberOrNull(row.changePct),
          numberOrNull(row.volume),
          numberOrNull(row.turnover),
          numberOrNull(row.bid),
          numberOrNull(row.ask),
          new Date(row.quotedAt || snapshot.generatedAt).toISOString()
        ]
      );
    }
    await client.query("COMMIT");
    return { snapshotId, marketDate, count: rows.length, payloadHash };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function readLatestVerifiedEodSnapshot() {
  const snapshotResult = await pool.query(
    `SELECT id, provider, upstream_source, market_date, generated_at, collected_at,
            coverage, quote_count, payload_hash
       FROM public.market_eod_snapshots
      ORDER BY market_date DESC, generated_at DESC
      LIMIT 1`
  );
  const snapshot = snapshotResult.rows[0];
  if (!snapshot) return null;
  const quoteResult = await pool.query(
    `SELECT symbol, name, sector, price, previous_close, change_amount, change_percent,
            volume, turnover, bid, ask, quoted_at
       FROM public.market_eod_quotes
      WHERE snapshot_id = $1
      ORDER BY symbol`,
    [snapshot.id]
  );
  const data = quoteResult.rows.map((row) => ({
    symbol: row.symbol,
    name: row.name,
    sector: row.sector,
    price: Number(row.price),
    lastPrice: Number(row.price),
    prevClose: numberOrNull(row.previous_close),
    change: numberOrNull(row.change_amount),
    changePct: numberOrNull(row.change_percent),
    volume: numberOrNull(row.volume),
    turnover: numberOrNull(row.turnover),
    bid: numberOrNull(row.bid),
    ask: numberOrNull(row.ask),
    quotedAt: row.quoted_at,
    priceSource: "LOCAL_VERIFIED_EOD",
    hasLivePrice: false
  }));
  return {
    provider: "LOCAL_VERIFIED_EOD",
    upstreamSource: snapshot.upstream_source,
    valuationEligible: true,
    coverage: snapshot.coverage,
    marketDate: String(snapshot.market_date).slice(0, 10),
    generatedAt: snapshot.generated_at,
    collectedAt: snapshot.collected_at,
    payloadHash: snapshot.payload_hash,
    pricedCount: data.length,
    unpricedCount: 0,
    count: data.length,
    data
  };
}
