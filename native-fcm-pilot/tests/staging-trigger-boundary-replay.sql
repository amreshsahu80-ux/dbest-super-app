\set ON_ERROR_STOP on
\echo 'DBest isolated historical migration boundary reproduction'
-- PostgreSQL-only structural replay (not a complete 207-migration replay).
-- Schema baseline derived from vaahak_live_dispatch migration 20260821105323.
-- The trigger column list matches the 20260915190058 migration.
BEGIN;
CREATE TABLE public.vaahak_jobs_live (
  id text PRIMARY KEY,
  kind text NOT NULL DEFAULT 'ride',
  status text NOT NULL DEFAULT 'Open',
  assigned_partner_id text,
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
);
CREATE FUNCTION public.dbest_sync_marketplace_delivery_from_vaahak_job()
RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RETURN NEW; END $f$;

DO $test$
DECLARE
  missing integer;
  failure_state text;
  failure_message text;
BEGIN
  SELECT count(*) INTO missing
  FROM (VALUES ('order_meta'),('payment_status'),('payment_received_at')) v(col)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema='public' AND c.table_name='vaahak_jobs_live'
      AND c.column_name=v.col
  );
  IF missing <> 3 THEN
    RAISE EXCEPTION 'Expected three missing historical columns, got %',missing;
  END IF;

  BEGIN
    EXECUTE 'CREATE TRIGGER trg_dbest_sync_marketplace_delivery_from_vaahak_job
    AFTER INSERT OR UPDATE OF status,assigned_partner_id,accepted_at,
    started_at,completed_at,payment_status,payment_received_at,order_meta
    ON public.vaahak_jobs_live FOR EACH ROW
    EXECUTE FUNCTION public.dbest_sync_marketplace_delivery_from_vaahak_job()';
    RAISE EXCEPTION 'The pre-patch migration unexpectedly created its trigger';
  EXCEPTION WHEN undefined_column THEN
    GET STACKED DIAGNOSTICS failure_state=RETURNED_SQLSTATE, failure_message=MESSAGE_TEXT;
    IF failure_state <> '42703' THEN
      RAISE EXCEPTION 'Wrong SQLSTATE: %',failure_state;
    END IF;
    RAISE NOTICE 'CONFIRMED: original migration trigger fails pre-patch, SQLSTATE %, %',
      failure_state, failure_message;
  END;
END
$test$;

\echo 'Apply staged compatibility patch at historical replay boundary'
\ir ../migrations/20260915185000_vaahak_historical_replay_compatibility_STAGING_ONLY.sql
-- Compatibility script must be safe if a replay setup runs it twice.
\ir ../migrations/20260915185000_vaahak_historical_replay_compatibility_STAGING_ONLY.sql

DO $test$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM information_schema.columns
  WHERE table_schema='public' AND table_name='vaahak_jobs_live'
  AND column_name IN ('order_meta','payment_status','payment_received_at');
  IF n<>3 THEN
    RAISE EXCEPTION 'Compatibility patch failed, found % of 3 expected columns',n;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public'
      AND table_name='vaahak_jobs_live' AND column_name='payment_status'
      AND data_type='text' AND is_nullable='NO'
  ) THEN
    RAISE EXCEPTION 'Required payment_status type/nullability mismatch';
  END IF;
END
$test$;

CREATE TRIGGER trg_dbest_sync_marketplace_delivery_from_vaahak_job
AFTER INSERT OR UPDATE OF status,assigned_partner_id,accepted_at,
started_at,completed_at,payment_status,payment_received_at,order_meta
ON public.vaahak_jobs_live FOR EACH ROW
EXECUTE FUNCTION public.dbest_sync_marketplace_delivery_from_vaahak_job();

DO $test$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.vaahak_jobs_live'::regclass
      AND tgname='trg_dbest_sync_marketplace_delivery_from_vaahak_job'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Historical trigger not created after compatibility patch';
  END IF;
  RAISE NOTICE 'PASS: historical trigger now creates after staging-only compatibility patch';
END
$test$;
ROLLBACK;
\echo 'PASS: PostgreSQL historical boundary reproduction; all changes rolled back'
