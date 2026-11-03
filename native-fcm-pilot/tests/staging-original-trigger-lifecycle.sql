\set ON_ERROR_STOP on
\echo 'DBest isolated test: original historical trigger body after staged compatibility migration'
BEGIN;

CREATE TABLE public.vaahak_jobs_live (
  id text PRIMARY KEY, kind text NOT NULL DEFAULT 'ride',
  status text NOT NULL DEFAULT 'Open',
  assigned_partner_id text,
  accepted_at timestamptz,started_at timestamptz,completed_at timestamptz
);
CREATE TABLE public.marketplace_orders_live (
  id text PRIMARY KEY,
  vaahak_job_id text, vaahak_partner_id text,
  vaahak_assigned_at timestamptz,
  picked_up_at timestamptz,
  out_for_delivery_at timestamptz,
  payment_status text DEFAULT 'Pending',
  payment_received_at timestamptz,
  completed_at timestamptz,
  status text DEFAULT 'Awaiting Assignment',
  updated_at timestamptz DEFAULT now()
);

\ir ../migrations/20260915185000_vaahak_historical_replay_compatibility_STAGING_ONLY.sql
\ir fixtures/20260915190058_original_trigger.sql

INSERT INTO public.marketplace_orders_live(id) VALUES ('QA_ORDER_001');
INSERT INTO public.vaahak_jobs_live(id,kind,status,assigned_partner_id,order_meta)
 VALUES ('VJ_QA_DELIVERY_001','delivery','Accepted','VAH_QA_001',
         '{"marketplaceOrderId":"QA_ORDER_001"}'::jsonb);

DO $check$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.marketplace_orders_live WHERE id='QA_ORDER_001'
   AND vaahak_job_id='VJ_QA_DELIVERY_001'
   AND vaahak_partner_id='VAH_QA_001'
   AND status='Vaahak Assigned / Going to Vendor'
 ) THEN
   RAISE EXCEPTION 'FAIL: original trigger did not synchronize assignment';
 END IF;
END
$check$;

UPDATE public.vaahak_jobs_live
 SET status='Trip Started',started_at=now()
 WHERE id='VJ_QA_DELIVERY_001';
DO $check$
BEGIN
 IF NOT EXISTS(
   SELECT 1 FROM public.marketplace_orders_live WHERE id='QA_ORDER_001'
   AND picked_up_at IS NOT NULL AND out_for_delivery_at IS NOT NULL
   AND status='Product Picked Up / Out for Delivery'
 ) THEN
   RAISE EXCEPTION 'FAIL: original trigger did not synchronize pickup';
 END IF;
END
$check$;

UPDATE public.vaahak_jobs_live
 SET status='Completed',completed_at=now(),
     payment_status='Received',payment_received_at=now()
 WHERE id='VJ_QA_DELIVERY_001';
DO $check$
BEGIN
 IF NOT EXISTS(
   SELECT 1 FROM public.marketplace_orders_live WHERE id='QA_ORDER_001'
   AND completed_at IS NOT NULL AND payment_received_at IS NOT NULL
   AND payment_status='Received' AND status='Delivered / Completed'
 ) THEN
   RAISE EXCEPTION 'FAIL: original trigger did not synchronize delivery completion';
 END IF;
END
$check$;

-- A cab/ride job must never mutate an unrelated marketplace order.
INSERT INTO public.vaahak_jobs_live(id,kind,status,assigned_partner_id,order_meta)
 VALUES ('VJ_QA_RIDE_001','ride','Accepted','VAH_QA_001',
         '{"marketplaceOrderId":"QA_ORDER_001"}'::jsonb);
DO $check$
BEGIN
 IF EXISTS(SELECT 1 FROM public.marketplace_orders_live WHERE id='QA_ORDER_001'
   AND vaahak_job_id='VJ_QA_RIDE_001')
 THEN RAISE EXCEPTION 'FAIL: ride wrongly applied marketplace delivery hook';
 END IF;
 RAISE NOTICE 'PASS: actual historical SQL trigger synchronized delivery lifecycle and ignored ordinary rides';
END
$check$;

ROLLBACK;
\echo 'PASS: original historical trigger replay verified; synthetic database changes rolled back'
