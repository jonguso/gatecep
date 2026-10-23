BEGIN;

CREATE TABLE IF NOT EXISTS
  public.admin_broker_execution_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    actor_user_id UUID NOT NULL,
    target_user_id UUID NOT NULL,
    broker_link_id UUID NOT NULL,

    broker_account_key TEXT NOT NULL,

    source_file_name TEXT NOT NULL,
    source_file_sha256 TEXT NOT NULL,
    source_row_number INTEGER NOT NULL,

    execution_identity TEXT NOT NULL,

    broker_reference TEXT,
    fill_reference TEXT,

    symbol TEXT NOT NULL,
    side TEXT NOT NULL,

    executed_quantity NUMERIC NOT NULL,
    execution_price NUMERIC,

    execution_date DATE,
    settlement_date DATE,

    total_fees NUMERIC,

    execution_status TEXT NOT NULL,

    evidence_status TEXT NOT NULL,
    can_affect_real_portfolio BOOLEAN NOT NULL DEFAULT FALSE,

    raw_evidence JSONB NOT NULL,
    verification_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT
      admin_broker_execution_evidence_actor_fk
      FOREIGN KEY (actor_user_id)
      REFERENCES public.auth_users(id),

    CONSTRAINT
      admin_broker_execution_evidence_target_fk
      FOREIGN KEY (target_user_id)
      REFERENCES public.auth_users(id),

    CONSTRAINT
      admin_broker_execution_evidence_broker_fk
      FOREIGN KEY (broker_link_id)
      REFERENCES public.user_broker_links(id),

    CONSTRAINT
      admin_broker_execution_evidence_actor_target_distinct
      CHECK (actor_user_id <> target_user_id),

    CONSTRAINT
      admin_broker_execution_evidence_account_key_not_blank
      CHECK (BTRIM(broker_account_key) <> ''),

    CONSTRAINT
      admin_broker_execution_evidence_file_name_not_blank
      CHECK (BTRIM(source_file_name) <> ''),

    CONSTRAINT
      admin_broker_execution_evidence_sha256_format
      CHECK (
        source_file_sha256 ~ '^[0-9a-f]{64}$'
      ),

    CONSTRAINT
      admin_broker_execution_evidence_source_row_positive
      CHECK (source_row_number > 0),

    CONSTRAINT
      admin_broker_execution_evidence_identity_not_blank
      CHECK (BTRIM(execution_identity) <> ''),

    CONSTRAINT
      admin_broker_execution_evidence_symbol_not_blank
      CHECK (BTRIM(symbol) <> ''),

    CONSTRAINT
      admin_broker_execution_evidence_side
      CHECK (side IN ('BUY', 'SELL')),

    CONSTRAINT
      admin_broker_execution_evidence_quantity_positive
      CHECK (executed_quantity > 0),

    CONSTRAINT
      admin_broker_execution_evidence_price_positive
      CHECK (
        execution_price IS NULL OR
        execution_price > 0
      ),

    CONSTRAINT
      admin_broker_execution_evidence_fees_nonnegative
      CHECK (
        total_fees IS NULL OR
        total_fees >= 0
      ),

    CONSTRAINT
      admin_broker_execution_evidence_status_not_blank
      CHECK (BTRIM(execution_status) <> ''),

    CONSTRAINT
      admin_broker_execution_evidence_evidence_status_not_blank
      CHECK (BTRIM(evidence_status) <> ''),

    CONSTRAINT
      admin_broker_execution_evidence_raw_object
      CHECK (
        jsonb_typeof(raw_evidence) = 'object'
      ),

    CONSTRAINT
      admin_broker_execution_evidence_verification_object
      CHECK (
        jsonb_typeof(verification_metadata) = 'object'
      ),

    CONSTRAINT
      admin_broker_execution_evidence_portfolio_gate
      CHECK (
        can_affect_real_portfolio = FALSE
        OR (
          execution_status IN (
            'FULLY TRADED',
            'FILLED',
            'COMPLETED',
            'SETTLED'
          )
          AND execution_price IS NOT NULL
          AND execution_date IS NOT NULL
          AND total_fees IS NOT NULL
          AND settlement_date IS NOT NULL
        )
      ),

    CONSTRAINT
      admin_broker_execution_evidence_account_execution_unique
      UNIQUE (
        target_user_id,
        broker_link_id,
        broker_account_key,
        execution_identity
      )
  );

CREATE INDEX IF NOT EXISTS
  idx_admin_broker_execution_evidence_target_created
ON public.admin_broker_execution_evidence (
  target_user_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
  idx_admin_broker_execution_evidence_broker_created
ON public.admin_broker_execution_evidence (
  broker_link_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
  idx_admin_broker_execution_evidence_account_date
ON public.admin_broker_execution_evidence (
  target_user_id,
  broker_account_key,
  execution_date
);

CREATE INDEX IF NOT EXISTS
  idx_admin_broker_execution_evidence_portfolio_ready
ON public.admin_broker_execution_evidence (
  target_user_id,
  broker_account_key,
  execution_date
)
WHERE can_affect_real_portfolio = TRUE;

COMMIT;
