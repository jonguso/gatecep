BEGIN;

ALTER TABLE public.auth_users
  ADD COLUMN IF NOT EXISTS status TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.auth_users
    WHERE status IS NOT NULL
      AND UPPER(BTRIM(status))
        NOT IN ('ACTIVE', 'DISABLED')
  ) THEN
    RAISE EXCEPTION
      'Unsupported legacy auth_users status value detected';
  END IF;
END
$$;

UPDATE public.auth_users
SET status = CASE
  WHEN status IS NULL THEN 'ACTIVE'
  WHEN UPPER(BTRIM(status)) = 'ACTIVE'
    THEN 'ACTIVE'
  WHEN UPPER(BTRIM(status)) = 'DISABLED'
    THEN 'DISABLED'
  ELSE status
END;

ALTER TABLE public.auth_users
  ALTER COLUMN status SET DEFAULT 'ACTIVE';

ALTER TABLE public.auth_users
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.auth_users
  DROP CONSTRAINT IF EXISTS auth_users_status_check;

ALTER TABLE public.auth_users
  ADD CONSTRAINT auth_users_status_check
  CHECK (status IN ('ACTIVE', 'DISABLED'));

COMMIT;
