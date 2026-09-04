import { runApifyNewsQuery } from "./apifyNews.adapter.js";
import { buildNewsQueries } from "./newsQueryPolicy.js";
import { normalizeApifyNewsItems } from "./verifiedNews.normalizer.js";
import { extractVerifiedCalendarEvents } from "./verifiedCalendar.extractor.js";
import { saveNewsCollectionRun, upsertVerifiedCalendarEvents, upsertVerifiedNewsItems } from "./verifiedNews.repository.js";

let collecting = false;

export async function collectVerifiedNews({ now = new Date() } = {}) {
  if (collecting) return { ok: true, updated: false, reason: "COLLECTION_IN_PROGRESS" };
  collecting = true;
  const startedAt = now.toISOString();
  const sourceResults = [];
  let acceptedCount = 0;
  let rejectedCount = 0;
  try {
    for (const source of buildNewsQueries(now)) {
      try {
        const rows = await runApifyNewsQuery(source);
        const normalized = normalizeApifyNewsItems(rows);
        const saved = await upsertVerifiedNewsItems(normalized.accepted);
        const calendarSaved = await upsertVerifiedCalendarEvents(extractVerifiedCalendarEvents(normalized.accepted));
        acceptedCount += saved;
        rejectedCount += normalized.rejected.length;
        const rejectionReasons = normalized.rejected.reduce((counts, item) => ({ ...counts, [item.reason]: (counts[item.reason] || 0) + 1 }), {});
        sourceResults.push({ source: source.key, ok: true, received: rows.length, accepted: saved, calendarEvents: calendarSaved, rejected: normalized.rejected.length, rejectionReasons });
      } catch (error) {
        sourceResults.push({ source: source.key, ok: false, error: error.message });
      }
    }
    const successfulSources = sourceResults.filter((item) => item.ok).length;
    const status = successfulSources ? (successfulSources === sourceResults.length ? "COMPLETE" : "PARTIAL") : "FAILED";
    await saveNewsCollectionRun({ startedAt, status, acceptedCount, rejectedCount, sourceResults });
    if (!successfulSources) throw new Error("All verified news sources failed. Existing news was retained.");
    return { ok: true, updated: acceptedCount > 0, status, acceptedCount, rejectedCount, sourceResults };
  } finally {
    collecting = false;
  }
}
