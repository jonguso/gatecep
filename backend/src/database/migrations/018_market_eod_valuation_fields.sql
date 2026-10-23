ALTER TABLE public.market_eod_quotes
  ADD COLUMN IF NOT EXISTS shares_outstanding NUMERIC(24, 4),
  ADD COLUMN IF NOT EXISTS market_cap NUMERIC(24, 4);

ALTER TABLE public.market_eod_quotes
  DROP CONSTRAINT IF EXISTS market_eod_quotes_shares_outstanding_positive;

ALTER TABLE public.market_eod_quotes
  ADD CONSTRAINT market_eod_quotes_shares_outstanding_positive
  CHECK (
    shares_outstanding IS NULL
    OR shares_outstanding > 0
  );

ALTER TABLE public.market_eod_quotes
  DROP CONSTRAINT IF EXISTS market_eod_quotes_market_cap_positive;

ALTER TABLE public.market_eod_quotes
  ADD CONSTRAINT market_eod_quotes_market_cap_positive
  CHECK (
    market_cap IS NULL
    OR market_cap > 0
  );
