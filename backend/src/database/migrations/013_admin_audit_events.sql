BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  actor_user_id UUID NOT NULL,

  action TEXT NOT NULL,

  target_type TEXT NOT NULL,

  target_id TEXT,

  before_state JSONB,
  after_state JSONB,

  reason TEXT,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT admin_audit_events_actor_fk
    FOREIGN KEY (actor_user_id)
    REFERENCES public.auth_users(id),

  CONSTRAINT admin_audit_events_action_not_blank
    CHECK (BTRIM(action) <> ''),

  CONSTRAINT admin_audit_events_target_type_not_blank
    CHECK (BTRIM(target_type) <> ''),

  CONSTRAINT admin_audit_events_reason_not_blank
    CHECK (
      reason IS NULL OR
      BTRIM(reason) <> ''
    ),

  CONSTRAINT admin_audit_events_metadata_object
    CHECK (
      jsonb_typeof(metadata) = 'object'
    ),

  CONSTRAINT admin_audit_events_before_object
    CHECK (
      before_state IS NULL OR
      jsonb_typeof(before_state) = 'object'
    ),

  CONSTRAINT admin_audit_events_after_object
    CHECK (
      after_state IS NULL OR
      jsonb_typeof(after_state) = 'object'
    )
);

CREATE INDEX IF NOT EXISTS
  idx_admin_audit_events_created_at
ON public.admin_audit_events (
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
  idx_admin_audit_events_actor_created
ON public.admin_audit_events (
  actor_user_id,
  created_at DESC
);

CREATE INDEX IF NOT EXISTS
  idx_admin_audit_events_target_created
ON public.admin_audit_events (
  target_type,
  target_id,
  created_at DESC
);

COMMIT;
