BEGIN;

ALTER TABLE public.auth_users
  ADD COLUMN IF NOT EXISTS role TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.auth_users
    WHERE role IS NOT NULL
      AND LOWER(BTRIM(role)) NOT IN ('user', 'admin')
  ) THEN
    RAISE EXCEPTION
      'Unsupported legacy auth_users role value detected';
  END IF;
END
$$;

UPDATE public.auth_users
SET role = CASE
  WHEN role IS NULL THEN 'USER'
  WHEN LOWER(BTRIM(role)) = 'user' THEN 'USER'
  WHEN LOWER(BTRIM(role)) = 'admin' THEN 'ADMIN'
  ELSE role
END;

ALTER TABLE public.auth_users
  ALTER COLUMN role SET DEFAULT 'USER';

ALTER TABLE public.auth_users
  ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.auth_users
  DROP CONSTRAINT IF EXISTS auth_users_role_check;

ALTER TABLE public.auth_users
  ADD CONSTRAINT auth_users_role_check
  CHECK (role IN ('USER', 'ADMIN'));

COMMIT;
