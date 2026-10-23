BEGIN;

CREATE TABLE IF NOT EXISTS
  public.admin_reconciliation_evidence_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    actor_user_id UUID NOT NULL,
    target_user_id UUID NOT NULL,
    broker_link_id UUID NOT NULL,

    broker_account_key TEXT NOT NULL,

    report_type TEXT NOT NULL,

    file_sha256 TEXT NOT NULL,

    extraction_payload JSONB NOT NULL,
    identity_verification JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,

    CONSTRAINT
      admin_reconciliation_receipts_actor_fk
      FOREIGN KEY (actor_user_id)
      REFERENCES public.auth_users(id),

    CONSTRAINT
      admin_reconciliation_receipts_target_fk
      FOREIGN KEY (target_user_id)
      REFERENCES public.auth_users(id),

    CONSTRAINT
      admin_reconciliation_receipts_broker_fk
      FOREIGN KEY (broker_link_id)
      REFERENCES public.user_broker_links(id),

    CONSTRAINT
      admin_reconciliation_receipts_actor_target_distinct
      CHECK (actor_user_id <> target_user_id),

    CONSTRAINT
      admin_reconciliation_receipts_account_key_not_blank
      CHECK (BTRIM(broker_account_key) <> ''),

    CONSTRAINT
      admin_reconciliation_receipts_report_type
      CHECK (
        report_type IN (
          'valuation',
          'cash'
        )
      ),

    CONSTRAINT
      admin_reconciliation_receipts_sha256_format
      CHECK (
        file_sha256 ~ '^[0-9a-f]{64}$'
      ),

    CONSTRAINT
      admin_reconciliation_receipts_extraction_object
      CHECK (
        jsonb_typeof(extraction_payload) = 'object'
      ),

    CONSTRAINT
      admin_reconciliation_receipts_identity_object
      CHECK (
        jsonb_typeof(identity_verification) = 'object'
      ),

    CONSTRAINT
      admin_reconciliation_receipts_expiry_after_creation
      CHECK (
        expires_at > created_at
      ),

    CONSTRAINT
      admin_reconciliation_receipts_consumed_after_creation
      CHECK (
        consumed_at IS NULL OR
        consumed_at >= created_at
      )
  );

CREATE INDEX IF NOT EXISTS
  idx_admin_reconciliation_receipts_actor
ON public.admin_reconciliation_evidence_receipts (
  actor_user_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
  idx_admin_reconciliation_receipts_target
ON public.admin_reconciliation_evidence_receipts (
  target_user_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
  idx_admin_reconciliation_receipts_broker
ON public.admin_reconciliation_evidence_receipts (
  broker_link_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
  idx_admin_reconciliation_receipts_expiry
ON public.admin_reconciliation_evidence_receipts (
  expires_at
)
WHERE consumed_at IS NULL;

COMMIT;
