-- STAGING REPLAY COMPATIBILITY CANDIDATE — NOT APPLIED TO PRODUCTION
-- Must execute after 20260915181311 and before 20260915190058
-- on a NEW, expendable development database only.
-- The 20260915190058 migration declares an AFTER UPDATE OF trigger on
-- vaahak_jobs_live(payment_status,payment_received_at,order_meta) even though
-- prior recorded migrations have not declared these three columns; later migration 20260915204539 also references
-- payment_method which pre-existing migrations did not establish.
--
-- Four field types/defaults are grounded in the current parent DB catalog; this patch
-- does not assert that all later historical migrations will replay cleanly.
DO $qa$
BEGIN
 IF to_regclass('public.vaahak_jobs_live') IS NULL THEN
   RAISE EXCEPTION 'vaahak_jobs_live missing before compatibility patch';
 END IF;
END
$qa$;

ALTER TABLE public.vaahak_jobs_live
  ADD COLUMN IF NOT EXISTS order_meta jsonb,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS payment_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text;

-- All existing fields should be independently checked for schema drift
-- before this is incorporated into any automated staging replay.
