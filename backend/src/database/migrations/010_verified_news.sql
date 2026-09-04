CREATE TABLE IF NOT EXISTS public.verified_news_items (
  id BIGSERIAL PRIMARY KEY,
  canonical_url TEXT NOT NULL UNIQUE,
  source_key TEXT NOT NULL,
  source_name TEXT NOT NULL,
  trust_level TEXT NOT NULL CHECK (trust_level IN ('OFFICIAL', 'REPORTED')),
  category TEXT NOT NULL CHECK (category IN ('Market', 'Company', 'Dividends')),
  title TEXT NOT NULL,
  summary TEXT,
  published_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  matched_symbols TEXT[] NOT NULL DEFAULT '{}',
  content_hash TEXT NOT NULL,
  upstream_provider TEXT NOT NULL DEFAULT 'APIFY_RAG_WEB_BROWSER',
  actor_run_id TEXT
);

CREATE INDEX IF NOT EXISTS verified_news_published_idx
  ON public.verified_news_items (published_at DESC NULLS LAST, discovered_at DESC);

CREATE INDEX IF NOT EXISTS verified_news_category_idx
  ON public.verified_news_items (category, published_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.verified_news_collection_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  source_results JSONB NOT NULL DEFAULT '[]'::jsonb
);
