\set ON_ERROR_STOP on
\echo 'DBest staged sequential migrations 20260915190058 to 20260915192348'
BEGIN;
CREATE TABLE public.vaahak_jobs_live (
 id text PRIMARY KEY, kind text NOT NULL DEFAULT 'ride',
 status text NOT NULL DEFAULT 'Open', assigned_partner_id text,
 accepted_at timestamptz, started_at timestamptz, completed_at timestamptz
);
CREATE TABLE public.marketplace_orders_live (
 id text PRIMARY KEY,
 vaahak_job_id text, vaahak_partner_id text, vaahak_assigned_at timestamptz,
 picked_up_at timestamptz, out_for_delivery_at timestamptz,
 payment_status text DEFAULT 'Pending', payment_received_at timestamptz,
 completed_at timestamptz, status text DEFAULT 'Awaiting Assignment',
 updated_at timestamptz DEFAULT now()
);

-- Put candidate repair before the first historically failed migration.
\ir ../migrations/20260915185000_vaahak_historical_replay_compatibility_STAGING_ONLY.sql
\ir fixtures/20260915190058_original_trigger.sql
\ir fixtures/20260915190237_original.sql
\ir fixtures/20260915191206_original.sql
\ir fixtures/20260915192326_original.sql
\ir fixtures/20260915192348_original.sql

DO $check$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM pg_trigger
 WHERE tgrelid='public.vaahak_jobs_live'::regclass
  AND tgname IN (
   'trg_dbest_sync_marketplace_delivery_from_vaahak_job',
   'trg_dbest_sync_marketplace_from_vaahak_job',
   'trg_dbest_marketplace_delivery_pin_guard'
  ) AND NOT tgisinternal;
 IF n<>3 THEN RAISE EXCEPTION 'Expected 3 historical Vaahak triggers, got %',n; END IF;
END $check$;

INSERT INTO public.marketplace_orders_live(id) VALUES ('QA_NEXT_ORDER');
INSERT INTO public.vaahak_jobs_live(id,kind,status,assigned_partner_id,order_meta)
VALUES ('VJ_NEXT_DELIVERY','delivery','Accepted','VAH_NEXT',
        '{"marketplaceOrderId":"QA_NEXT_ORDER"}'::jsonb);
DO $check$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.marketplace_orders_live
  WHERE id='QA_NEXT_ORDER' AND vaahak_job_id='VJ_NEXT_DELIVERY'
   AND vaahak_partner_id='VAH_NEXT'
   AND status='Vaahak Assigned / Going to Vendor'
   AND pickup_pin ~ '^[0-9]{4}$' AND delivery_pin ~ '^[0-9]{4}$'
   AND pickup_pin<>delivery_pin
 ) THEN
  RAISE EXCEPTION 'FAIL: assignment or four-digit dual-pin generation';
 END IF;
END $check$;

-- An unverified pickup must be rejected.
DO $check$
BEGIN
 BEGIN
  UPDATE public.vaahak_jobs_live
  SET status='Trip Started', started_at=now() WHERE id='VJ_NEXT_DELIVERY';
  RAISE EXCEPTION 'FAIL: pickup transition unexpectedly allowed';
 EXCEPTION WHEN others THEN
  IF SQLERRM NOT LIKE '%pickup_pin_verification_required%' THEN RAISE; END IF;
 END;
END $check$;

UPDATE public.marketplace_orders_live SET pickup_pin_verified_at=now()
WHERE id='QA_NEXT_ORDER';
UPDATE public.vaahak_jobs_live SET status='Trip Started',started_at=now()
WHERE id='VJ_NEXT_DELIVERY';
DO $check$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.marketplace_orders_live
 WHERE id='QA_NEXT_ORDER'
 AND status='Product Picked Up / Out for Delivery'
 AND picked_up_at IS NOT NULL) THEN
  RAISE EXCEPTION 'FAIL: verified pickup did not sync to marketplace';
 END IF;
END $check$;

-- An unverified delivery must be rejected.
DO $check$
BEGIN
 BEGIN
  UPDATE public.vaahak_jobs_live
  SET status='Completed',completed_at=now()
  WHERE id='VJ_NEXT_DELIVERY';
  RAISE EXCEPTION 'FAIL: delivery completion unexpectedly allowed';
 EXCEPTION WHEN others THEN
  IF SQLERRM NOT LIKE '%delivery_pin_verification_required%' THEN RAISE; END IF;
 END;
END $check$;

UPDATE public.marketplace_orders_live SET delivery_pin_verified_at=now()
WHERE id='QA_NEXT_ORDER';
UPDATE public.vaahak_jobs_live
SET status='Completed',completed_at=now(),payment_status='Received',
    payment_received_at=now()
WHERE id='VJ_NEXT_DELIVERY';
DO $check$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.marketplace_orders_live
 WHERE id='QA_NEXT_ORDER'
  AND vaahak_job_id='VJ_NEXT_DELIVERY'
  AND status='Delivered / Completed'
  AND completed_at IS NOT NULL
  AND payment_status='Received'
  AND payment_received_at IS NOT NULL) THEN
  RAISE EXCEPTION 'FAIL: verified delivery/payment completion did not sync';
 END IF;
END $check$;

INSERT INTO public.vaahak_jobs_live(id,kind,status,assigned_partner_id,order_meta)
VALUES ('VJ_NEXT_RIDE','ride','Accepted','VAH_NEXT',
        '{"marketplaceOrderId":"QA_NEXT_ORDER"}'::jsonb);
DO $check$
BEGIN
 IF EXISTS(SELECT 1 FROM public.marketplace_orders_live
  WHERE id='QA_NEXT_ORDER' AND vaahak_job_id='VJ_NEXT_RIDE')
 THEN RAISE EXCEPTION 'FAIL: ride improperly changed a Marketplace delivery'; END IF;
 RAISE NOTICE 'PASS: 5 historical migrations; dual-PIN, assignment, pickup, payment, ride isolation';
END $check$;
ROLLBACK;
\echo 'PASS: sequential historical migration QA completed with rollback'
