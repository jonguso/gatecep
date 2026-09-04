import { pool } from "../../database/db.js";

function mapRow(row) {
  return {
    id: String(row.id),
    url: row.canonical_url,
    sourceKey: row.source_key,
    source: row.source_name,
    trustLevel: row.trust_level,
    category: row.category,
    title: row.title,
    detail: row.summary || "Open the original source for complete details.",
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    discoveredAt: new Date(row.discovered_at).toISOString(),
    symbols: row.matched_symbols || [],
    provider: row.upstream_provider
  };
}

export async function upsertVerifiedNewsItems(items = []) {
  let saved = 0;
  for (const item of items) {
    await pool.query(
      `INSERT INTO public.verified_news_items
       (canonical_url, source_key, source_name, trust_level, category, title, summary, published_at, matched_symbols, content_hash, actor_run_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (canonical_url) DO UPDATE SET
         source_key=EXCLUDED.source_key, source_name=EXCLUDED.source_name,
         trust_level=EXCLUDED.trust_level, category=EXCLUDED.category,
         title=EXCLUDED.title, summary=EXCLUDED.summary,
         published_at=COALESCE(EXCLUDED.published_at, public.verified_news_items.published_at),
         matched_symbols=EXCLUDED.matched_symbols, content_hash=EXCLUDED.content_hash,
         actor_run_id=EXCLUDED.actor_run_id, last_seen_at=NOW()`,
      [item.canonicalUrl, item.sourceKey, item.sourceName, item.trustLevel, item.category, item.title, item.summary, item.publishedAt, item.matchedSymbols, item.contentHash, item.actorRunId]
    );
    saved += 1;
  }
  return saved;
}

export async function listVerifiedNewsItems({ category = null, symbol = null, limit = 100 } = {}) {
  const params = [];
  const where = [];
  if (category) { params.push(category); where.push(`category = $${params.length}`); }
  if (symbol) { params.push(String(symbol).toUpperCase()); where.push(`$${params.length} = ANY(matched_symbols)`); }
  params.push(Math.min(100, Math.max(1, Number(limit) || 50)));
  const result = await pool.query(
    `SELECT * FROM public.verified_news_items
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY published_at DESC NULLS LAST, discovered_at DESC
     LIMIT $${params.length}`,
    params
  );
  return result.rows.map(mapRow);
}

export async function saveNewsCollectionRun(run) {
  await pool.query(
    `INSERT INTO public.verified_news_collection_runs
     (started_at, completed_at, status, accepted_count, rejected_count, source_results)
     VALUES ($1, NOW(), $2, $3, $4, $5::jsonb)`,
    [run.startedAt, run.status, run.acceptedCount, run.rejectedCount, JSON.stringify(run.sourceResults || [])]
  );
}

export async function upsertVerifiedCalendarEvents(events = []) {
  let saved = 0;
  for (const event of events) {
    if (Array.isArray(event.matchedSymbols) && event.matchedSymbols.length) {
      await pool.query(
        `DELETE FROM public.verified_calendar_events
         WHERE source_url=$1
           AND event_type=$2
           AND event_date=$3::date
           AND event_key<>$4
           AND matched_symbols @> $5::text[]
           AND cardinality(matched_symbols) > cardinality($5::text[])`,
        [event.sourceUrl, event.eventType, event.eventDate, event.eventKey, event.matchedSymbols]
      );
    }
    if (!event.matchedSymbols.includes("NSE") && event.matchedSymbols.length) {
      await pool.query(
        `DELETE FROM public.verified_calendar_events
          WHERE source_url=$1 AND event_type=$2 AND event_date=$3::date
            AND 'NSE'=ANY(matched_symbols) AND matched_symbols && $4::text[]`,
        [event.sourceUrl, event.eventType, event.eventDate, event.matchedSymbols]
      );
    }
    await pool.query(
      `INSERT INTO public.verified_calendar_events
       (event_key, event_type, event_date, title, detail, source_url, source_name, trust_level, matched_symbols)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (event_key) DO UPDATE SET
         title=EXCLUDED.title, detail=EXCLUDED.detail, source_url=EXCLUDED.source_url,
         source_name=EXCLUDED.source_name, trust_level=EXCLUDED.trust_level,
         matched_symbols=EXCLUDED.matched_symbols, last_seen_at=NOW()`,
      [event.eventKey, event.eventType, event.eventDate, event.title, event.detail, event.sourceUrl, event.sourceName, event.trustLevel, event.matchedSymbols]
    );
    saved += 1;
  }
  return saved;
}

export async function listVerifiedCalendarEvents({ from, to, limit = 250 } = {}) {
  const result = await pool.query(
    `SELECT id, event_type, event_date, title, detail, source_url, source_name,
            trust_level, matched_symbols, upstream_provider
       FROM public.verified_calendar_events
      WHERE event_date >= $1::date AND event_date <= $2::date
      ORDER BY event_date ASC, title ASC
      LIMIT $3`,
    [from, to, Math.min(250, Math.max(1, Number(limit) || 100))]
  );
  return result.rows.map((row) => ({
    id: `NEWS-CALENDAR-${row.id}`,
    type: row.event_type,
    date: row.event_date instanceof Date ? row.event_date.toISOString().slice(0, 10) : String(row.event_date).slice(0, 10),
    title: row.title,
    detail: row.detail || "Open the original source for complete details.",
    url: row.source_url,
    source: row.source_name,
    trustLevel: row.trust_level,
    symbols: row.matched_symbols || [],
    provider: row.upstream_provider
  }));
}
