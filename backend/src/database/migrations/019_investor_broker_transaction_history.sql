BEGIN;

/*
 * Canonical investor broker Transaction History.
 *
 * IMPORTANT:
 * GateCEP's current migration runner executes every SQL migration
 * on every run. This migration must therefore be safe to rerun.
 *
 * Existing compatible objects are retained.
 * No Transaction History data is deleted or reset here.
 */

/*
 * Required for composite ownership FKs:
 *   (user_id, broker_link_id)
 *     -> user_broker_links(user_id, id)
 */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'user_broker_links_user_id_id_unique'
      AND conrelid =
        'public.user_broker_links'::regclass
  ) THEN
    ALTER TABLE
      public.user_broker_links
    ADD CONSTRAINT
      user_broker_links_user_id_id_unique
    UNIQUE (
      user_id,
      id
    );
  END IF;
END
$$;


/*
 * Server authority/reset epoch for one authenticated
 * investor broker account.
 */
CREATE TABLE IF NOT EXISTS
  public.investor_broker_transaction_history_authority (
    user_id UUID NOT NULL,

    broker_link_id UUID NOT NULL,

    broker_account_key TEXT NOT NULL,

    current_generation BIGINT NOT NULL DEFAULT 1
      CHECK (current_generation >= 1),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (
      user_id,
      broker_link_id,
      broker_account_key
    ),

    CONSTRAINT
      investor_broker_transaction_history_authority_user_fk
      FOREIGN KEY (user_id)
      REFERENCES public.auth_users(id)
      ON DELETE CASCADE,

    CONSTRAINT
      investor_broker_transaction_history_authority_broker_owner_fk
      FOREIGN KEY (
        user_id,
        broker_link_id
      )
      REFERENCES public.user_broker_links(
        user_id,
        id
      )
      ON DELETE RESTRICT
  );


CREATE TABLE IF NOT EXISTS
  public.investor_broker_transaction_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID NOT NULL,
    broker_link_id UUID NOT NULL,

    broker_account_key TEXT NOT NULL,

    authority_generation BIGINT NOT NULL DEFAULT 1
      CHECK (authority_generation >= 1),

    execution_identity TEXT NOT NULL,

    exchange_order_no TEXT NOT NULL,

    symbol TEXT,
    side TEXT,

    total_traded_quantity NUMERIC NOT NULL,

    execution_price NUMERIC,
    execution_date DATE,

    historical_execution_state TEXT NOT NULL,

    execution_confirmed BOOLEAN NOT NULL,
    fifo_eligible BOOLEAN NOT NULL,
    can_affect_fifo BOOLEAN NOT NULL,

    descriptive_order_status TEXT,

    source TEXT,
    source_file_name TEXT,
    source_file_sha256 TEXT,
    source_row_number INTEGER,

    raw_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    verification_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT
      investor_broker_transaction_history_user_fk
      FOREIGN KEY (user_id)
      REFERENCES public.auth_users(id)
      ON DELETE CASCADE,

    CONSTRAINT
      investor_broker_transaction_history_broker_owner_fk
      FOREIGN KEY (
        user_id,
        broker_link_id
      )
      REFERENCES public.user_broker_links(
        user_id,
        id
      )
      ON DELETE RESTRICT,

    CONSTRAINT
      investor_broker_transaction_history_account_required
      CHECK (
        BTRIM(broker_account_key) <> ''
      ),

    CONSTRAINT
      investor_broker_transaction_history_identity_required
      CHECK (
        BTRIM(execution_identity) <> ''
      ),

    CONSTRAINT
      investor_broker_transaction_history_exchange_order_required
      CHECK (
        BTRIM(exchange_order_no) <> ''
      ),

    CONSTRAINT
      investor_broker_transaction_history_positive_total_traded
      CHECK (
        total_traded_quantity > 0
      ),

    CONSTRAINT
      investor_broker_transaction_history_state_allowed
      CHECK (
        historical_execution_state IN (
          'READY',
          'NEEDS_REVIEW'
        )
      ),

    /*
     * Total Traded Quantity > 0 is execution proof.
     * Therefore both historical states are execution-confirmed.
     *
     * NEEDS_REVIEW means execution is confirmed but the
     * evidence is not yet safe to affect FIFO.
     */
    CONSTRAINT
      investor_broker_transaction_history_state_fifo_consistency
      CHECK (
        (
          historical_execution_state = 'NEEDS_REVIEW'
          AND execution_confirmed = TRUE
          AND fifo_eligible = FALSE
          AND can_affect_fifo = FALSE
        )
        OR
        (
          historical_execution_state = 'READY'
          AND execution_confirmed = TRUE
          AND fifo_eligible = TRUE
          AND can_affect_fifo = TRUE
          AND execution_price IS NOT NULL
          AND execution_price > 0
          AND symbol IS NOT NULL
          AND BTRIM(symbol) <> ''
          AND side IN ('BUY', 'SELL')
          AND execution_date IS NOT NULL
        )
      ),

    CONSTRAINT
      investor_broker_transaction_history_fifo_consistency
      CHECK (
        (
          fifo_eligible = FALSE
          AND can_affect_fifo = FALSE
        )
        OR
        (
          fifo_eligible = TRUE
          AND can_affect_fifo = TRUE
          AND execution_confirmed = TRUE
          AND execution_price IS NOT NULL
          AND execution_price > 0
          AND symbol IS NOT NULL
          AND BTRIM(symbol) <> ''
          AND side IN ('BUY', 'SELL')
          AND execution_date IS NOT NULL
        )
      ),

    CONSTRAINT
      investor_broker_transaction_history_unique_execution
      UNIQUE (
        user_id,
        broker_link_id,
        broker_account_key,
        authority_generation,
        execution_identity
      )
  );


/*
 * Reconcile the state constraint for databases where the
 * Transaction History tables were established before this
 * migration became part of the normal migration runner.
 *
 * This changes no history rows.
 */
ALTER TABLE
  public.investor_broker_transaction_history
DROP CONSTRAINT IF EXISTS
  investor_broker_transaction_history_state_fifo_consistency;

ALTER TABLE
  public.investor_broker_transaction_history
ADD CONSTRAINT
  investor_broker_transaction_history_state_fifo_consistency
CHECK (
  (
    historical_execution_state = 'NEEDS_REVIEW'
    AND execution_confirmed = TRUE
    AND fifo_eligible = FALSE
    AND can_affect_fifo = FALSE
  )
  OR
  (
    historical_execution_state = 'READY'
    AND execution_confirmed = TRUE
    AND fifo_eligible = TRUE
    AND can_affect_fifo = TRUE
    AND execution_price IS NOT NULL
    AND execution_price > 0
    AND symbol IS NOT NULL
    AND BTRIM(symbol) <> ''
    AND side IN ('BUY', 'SELL')
    AND execution_date IS NOT NULL
  )
);


/*
 * Account-level authority FK.
 */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'investor_broker_transaction_history_authority_account_fk'
      AND conrelid =
        'public.investor_broker_transaction_history'::regclass
  ) THEN
    ALTER TABLE
      public.investor_broker_transaction_history
    ADD CONSTRAINT
      investor_broker_transaction_history_authority_account_fk
    FOREIGN KEY (
      user_id,
      broker_link_id,
      broker_account_key
    )
    REFERENCES
      public.investor_broker_transaction_history_authority (
        user_id,
        broker_link_id,
        broker_account_key
      )
    ON DELETE RESTRICT;
  END IF;
END
$$;


CREATE INDEX IF NOT EXISTS
  idx_investor_broker_tx_history_user
  ON public.investor_broker_transaction_history (
    user_id
  );

CREATE INDEX IF NOT EXISTS
  idx_investor_broker_tx_history_account
  ON public.investor_broker_transaction_history (
    user_id,
    broker_link_id,
    broker_account_key
  );

CREATE INDEX IF NOT EXISTS
  idx_investor_broker_tx_history_fifo
  ON public.investor_broker_transaction_history (
    user_id,
    broker_account_key,
    can_affect_fifo
  );

COMMIT;
