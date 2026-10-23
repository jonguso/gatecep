BEGIN;

CREATE TABLE IF NOT EXISTS
  public.fundamental_verified_filings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    filing_id TEXT NOT NULL UNIQUE,

    symbol TEXT NOT NULL,
    company_name TEXT,

    filing_type TEXT NOT NULL,

    fiscal_year INTEGER,
    period_start DATE,
    period_end DATE,
    publication_date DATE,

    status TEXT NOT NULL,

    revision_number INTEGER NOT NULL DEFAULT 1,

    supersedes_filing_id TEXT,
    superseded_by_filing_id TEXT,

    duplicate_status TEXT NOT NULL DEFAULT 'UNIQUE',
    duplicate_of_filing_id TEXT,

    content_hash TEXT,

    filing_payload JSONB NOT NULL,

    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT
      fundamental_verified_filings_filing_id_not_blank
      CHECK (BTRIM(filing_id) <> ''),

    CONSTRAINT
      fundamental_verified_filings_symbol_not_blank
      CHECK (BTRIM(symbol) <> ''),

    CONSTRAINT
      fundamental_verified_filings_type_not_blank
      CHECK (BTRIM(filing_type) <> ''),

    CONSTRAINT
      fundamental_verified_filings_status
      CHECK (
        status IN (
          'DRAFT',
          'PENDING_REVIEW',
          'VERIFIED',
          'APPROVED',
          'REJECTED',
          'SUPERSEDED',
          'ARCHIVED'
        )
      ),

    CONSTRAINT
      fundamental_verified_filings_revision_positive
      CHECK (revision_number > 0),

    CONSTRAINT
      fundamental_verified_filings_duplicate_status
      CHECK (
        duplicate_status IN (
          'UNIQUE',
          'POSSIBLE_DUPLICATE',
          'EXACT_DUPLICATE',
          'REVISION'
        )
      ),

    CONSTRAINT
      fundamental_verified_filings_payload_object
      CHECK (
        jsonb_typeof(filing_payload) = 'object'
      ),

    CONSTRAINT
      fundamental_verified_filings_creator_fk
      FOREIGN KEY (created_by_user_id)
      REFERENCES public.auth_users(id),

    CONSTRAINT
      fundamental_verified_filings_not_self_superseding
      CHECK (
        supersedes_filing_id IS NULL OR
        supersedes_filing_id <> filing_id
      ),

    CONSTRAINT
      fundamental_verified_filings_not_self_superseded
      CHECK (
        superseded_by_filing_id IS NULL OR
        superseded_by_filing_id <> filing_id
      ),

    CONSTRAINT
      fundamental_verified_filings_not_self_duplicate
      CHECK (
        duplicate_of_filing_id IS NULL OR
        duplicate_of_filing_id <> filing_id
      )
  );

CREATE INDEX IF NOT EXISTS
  idx_fundamental_verified_filings_symbol_created
ON public.fundamental_verified_filings (
  symbol,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
  idx_fundamental_verified_filings_review_queue
ON public.fundamental_verified_filings (
  status,
  created_at ASC
)
WHERE status IN (
  'PENDING_REVIEW',
  'VERIFIED'
);

CREATE INDEX IF NOT EXISTS
  idx_fundamental_verified_filings_period
ON public.fundamental_verified_filings (
  symbol,
  fiscal_year,
  filing_type,
  revision_number DESC
);

CREATE INDEX IF NOT EXISTS
  idx_fundamental_verified_filings_content_hash
ON public.fundamental_verified_filings (
  content_hash
)
WHERE content_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS
  public.fundamental_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    symbol TEXT NOT NULL UNIQUE,

    company_name TEXT,

    approved_filing_id TEXT NOT NULL,

    revision_number INTEGER NOT NULL,

    fundamental_payload JSONB NOT NULL,

    promoted_by_user_id UUID NOT NULL,
    promoted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT
      fundamental_records_symbol_not_blank
      CHECK (BTRIM(symbol) <> ''),

    CONSTRAINT
      fundamental_records_approved_filing_not_blank
      CHECK (BTRIM(approved_filing_id) <> ''),

    CONSTRAINT
      fundamental_records_revision_positive
      CHECK (revision_number > 0),

    CONSTRAINT
      fundamental_records_payload_object
      CHECK (
        jsonb_typeof(fundamental_payload) = 'object'
      ),

    CONSTRAINT
      fundamental_records_promoter_fk
      FOREIGN KEY (promoted_by_user_id)
      REFERENCES public.auth_users(id),

    CONSTRAINT
      fundamental_records_approved_filing_fk
      FOREIGN KEY (approved_filing_id)
      REFERENCES public.fundamental_verified_filings(filing_id)
  );

CREATE INDEX IF NOT EXISTS
  idx_fundamental_records_approved_filing
ON public.fundamental_records (
  approved_filing_id
);

COMMIT;
