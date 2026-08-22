CREATE TABLE IF NOT EXISTS public.market_eod_snapshots (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL,
  upstream_source TEXT,
  market_date DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  coverage TEXT NOT NULL DEFAULT 'FULL_MARKET',
  quote_count INTEGER NOT NULL,
  payload_hash TEXT NOT NULL,
  UNIQUE (provider, market_date)
);

CREATE TABLE IF NOT EXISTS public.market_eod_quotes (
  snapshot_id BIGINT NOT NULL REFERENCES public.market_eod_snapshots(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT,
  sector TEXT,
  price NUMERIC(20, 6) NOT NULL CHECK (price > 0),
  previous_close NUMERIC(20, 6),
  change_amount NUMERIC(20, 6),
  change_percent NUMERIC(20, 6),
  volume NUMERIC(24, 4),
  turnover NUMERIC(24, 4),
  bid NUMERIC(20, 6),
  ask NUMERIC(20, 6),
  quoted_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (snapshot_id, symbol)
);

CREATE INDEX IF NOT EXISTS market_eod_snapshots_latest_idx
  ON public.market_eod_snapshots (market_date DESC, generated_at DESC);
