\set ON_ERROR_STOP on
\echo 'DBest 8-migration sequence with secure delivery-PIN handover and PAD normalization'
BEGIN;
-- Supabase defines these database roles; disposable vanilla PostgreSQL does not.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
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
 payment_method text,
 completed_at timestamptz, status text DEFAULT 'Awaiting Assignment',
 updated_at timestamptz DEFAULT now()
);
\ir ../migrations/20260915185000_vaahak_historical_replay_compatibility_STAGING_ONLY.sql
\ir fixtures/20260915190058_original_trigger.sql
\ir fixtures/20260915190237_original.sql
\ir fixtures/20260915191206_original.sql
\ir fixtures/20260915192326_original.sql
\ir fixtures/20260915192348_original.sql
\ir fixtures/20260915192625_original.sql
\ir fixtures/20260915200257_original.sql
\ir fixtures/20260915204539_original.sql

-- After PIN-security migration the public order PIN columns must be absent.
DO $check$
DECLARE remaining integer;
BEGIN
 SELECT count(*) INTO remaining FROM information_schema.columns
 WHERE table_schema='public' AND table_name='marketplace_orders_live'
 AND column_name IN ('pickup_pin','delivery_pin','pickup_pin_verified_at','delivery_pin_verified_at');
 IF remaining<>0 THEN RAISE EXCEPTION 'FAIL legacy order PIN fields remain'; END IF;
 IF to_regclass('public.marketplace_delivery_pins_live') IS NULL THEN
   RAISE EXCEPTION 'FAIL dedicated delivery PIN table missing';
 END IF;
 IF to_regclass('public.marketplace_handover_events') IS NULL THEN
   RAISE EXCEPTION 'FAIL handover event table missing';
 END IF;
END $check$;

-- Pay-at-delivery must not incorrectly appear as prepaid.
INSERT INTO public.marketplace_orders_live(id,payment_status,payment_method)
 VALUES ('QA_PAD_ORDER','Prepaid','Pay Online at Delivery');
DO $check$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.marketplace_orders_live
    WHERE id='QA_PAD_ORDER' AND payment_status='Pending')
 THEN RAISE EXCEPTION 'FAIL Marketplace Pay-at-Delivery normalization'; END IF;
END $check$;
INSERT INTO public.vaahak_jobs_live
 (id,kind,status,payment_status,payment_method)
 VALUES ('QA_PAD_RIDE','ride','Open','Prepaid','pay_at_delivery');
DO $check$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.vaahak_jobs_live
 WHERE id='QA_PAD_RIDE' AND payment_status='Pending')
 THEN RAISE EXCEPTION 'FAIL Vaahak Pay-at-Delivery normalization'; END IF;
END $check$;

INSERT INTO public.marketplace_orders_live(id,payment_status,payment_method)
 VALUES ('QA_SECURE_ORDER','Pending','Cash');
INSERT INTO public.vaahak_jobs_live(id,kind,status,assigned_partner_id,order_meta)
 VALUES ('QA_SECURE_JOB','delivery','Accepted','QA_VAAHAK',
 '{"marketplaceOrderId":"QA_SECURE_ORDER"}'::jsonb);

DO $check$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.marketplace_delivery_pins_live
 WHERE order_id='QA_SECURE_ORDER' AND pickup_pin ~ '^[0-9]{4}$'
 AND delivery_pin ~ '^[0-9]{4}$' AND pickup_pin<>delivery_pin)
 THEN RAISE EXCEPTION 'FAIL dedicated private PIN registration'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.marketplace_orders_live
 WHERE id='QA_SECURE_ORDER' AND vaahak_job_id='QA_SECURE_JOB')
 THEN RAISE EXCEPTION 'FAIL delivery assignment'; END IF;
END $check$;

-- Guard must reject pickup before dedicated PIN verification.
DO $check$
BEGIN
 BEGIN
   UPDATE public.vaahak_jobs_live SET status='Trip Started',started_at=now()
   WHERE id='QA_SECURE_JOB';
   RAISE EXCEPTION 'FAIL pickup unexpectedly accepted without verified PIN';
 EXCEPTION WHEN others THEN
   IF SQLERRM NOT LIKE '%pickup_pin_verification_required%' THEN RAISE; END IF;
 END;
END $check$;
UPDATE public.marketplace_delivery_pins_live
 SET pickup_verified_at=now() WHERE order_id='QA_SECURE_ORDER';
UPDATE public.vaahak_jobs_live SET status='Trip Started',started_at=now()
 WHERE id='QA_SECURE_JOB';

DO $check$
BEGIN
 BEGIN
   UPDATE public.vaahak_jobs_live SET status='Completed',completed_at=now()
   WHERE id='QA_SECURE_JOB';
   RAISE EXCEPTION 'FAIL delivery unexpectedly accepted without verified PIN';
 EXCEPTION WHEN others THEN
   IF SQLERRM NOT LIKE '%delivery_pin_verification_required%' THEN RAISE; END IF;
 END;
END $check$;
UPDATE public.marketplace_delivery_pins_live
 SET delivery_verified_at=now() WHERE order_id='QA_SECURE_ORDER';
UPDATE public.vaahak_jobs_live
 SET status='Completed',completed_at=now(),payment_status='Received',
 payment_received_at=now() WHERE id='QA_SECURE_JOB';

DO $check$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.marketplace_orders_live
   WHERE id='QA_SECURE_ORDER' AND status='Delivered / Completed'
     AND payment_status='Received' AND completed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'FAIL verified completion/payment sync'; END IF;
END $check$;

INSERT INTO public.marketplace_handover_events
 (order_id,job_id,event,actor_type,actor_id)
 VALUES ('QA_SECURE_ORDER','QA_SECURE_JOB',
 'vendor_handover_confirmed','vendor','QA_VENDOR');
DO $check$
BEGIN
 BEGIN
   INSERT INTO public.marketplace_handover_events
   (order_id,job_id,event,actor_type,actor_id)
   VALUES ('QA_SECURE_ORDER','QA_SECURE_JOB',
           'vendor_handover_confirmed','vendor','QA_VENDOR');
   RAISE EXCEPTION 'FAIL duplicate handover accepted';
 EXCEPTION WHEN unique_violation THEN
   NULL;
 END;
END $check$;
INSERT INTO public.marketplace_handover_events
 (order_id,job_id,event,actor_type,actor_id)
 VALUES ('QA_SECURE_ORDER','QA_SECURE_JOB',
 'customer_delivery_confirmed','member','QA_MEMBER');

DO $check$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.marketplace_handover_events
 WHERE order_id='QA_SECURE_ORDER';
 IF n<>2 THEN RAISE EXCEPTION 'FAIL event uniqueness: count %',n; END IF;
 RAISE NOTICE 'PASS: 8 historical SQL migrations; separated PIN storage, pickup/delivery guard, PAD normalization, handover idempotency';
END $check$;
ROLLBACK;
\echo 'PASS: 8-migration historical replay segment safely rolled back'
