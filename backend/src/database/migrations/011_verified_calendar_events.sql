CREATE TABLE IF NOT EXISTS public.verified_calendar_events (
  id BIGSERIAL PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  trust_level TEXT NOT NULL CHECK (trust_level IN ('OFFICIAL', 'REPORTED')),
  matched_symbols TEXT[] NOT NULL DEFAULT '{}',
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  upstream_provider TEXT NOT NULL DEFAULT 'APIFY_RAG_WEB_BROWSER'
);

CREATE INDEX IF NOT EXISTS verified_calendar_event_date_idx
  ON public.verified_calendar_events (event_date ASC);
