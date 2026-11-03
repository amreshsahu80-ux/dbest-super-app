\set ON_ERROR_STOP on
\echo 'DBest synthetic migration #9: 20260916081248 Marketplace/Vaahak 50-50 economics'
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE TABLE public.vaahak_jobs_live (
 id text PRIMARY KEY, kind text NOT NULL DEFAULT 'ride',
 status text NOT NULL DEFAULT 'Open', assigned_partner_id text,
 accepted_at timestamptz, started_at timestamptz, completed_at timestamptz,
 partner_earning numeric(12,2), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.marketplace_orders_live (
 id text PRIMARY KEY,
 vaahak_job_id text, vaahak_partner_id text, vaahak_assigned_at timestamptz,
 picked_up_at timestamptz, out_for_delivery_at timestamptz,
 payment_status text DEFAULT 'Pending',payment_method text,
 payment_received_at timestamptz,completed_at timestamptz,cancelled_at timestamptz,
 status text DEFAULT 'Awaiting Assignment',
 vendor_id text, order_value numeric(12,2) DEFAULT 0, delivery_fee numeric(12,2) DEFAULT 0,
 updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.marketplace_vendors_live (
 id text PRIMARY KEY,type text,profile_meta jsonb
);
CREATE TABLE public.marketplace_vendor_settlements_live (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 vendor_id text NOT NULL,order_id text NOT NULL UNIQUE,
 gross_order_value numeric(12,2) DEFAULT 0,
 deductions numeric(12,2) DEFAULT 0,
 net_settlement numeric(12,2) DEFAULT 0,
 status text DEFAULT 'Eligible',updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.app_settings (
 key text PRIMARY KEY,value jsonb,updated_at timestamptz DEFAULT now()
);

-- Apply real, recorded historical migration statements after the staged correction.
\ir ../migrations/20260915185000_vaahak_historical_replay_compatibility_STAGING_ONLY.sql
\ir fixtures/20260915190058_original_trigger.sql
\ir fixtures/20260915190237_original.sql
\ir fixtures/20260915191206_original.sql
\ir fixtures/20260915192326_original.sql
\ir fixtures/20260915192348_original.sql
\ir fixtures/20260915192625_original.sql
\ir fixtures/20260915200257_original.sql
\ir fixtures/20260915204539_original.sql
\ir fixtures/20260916081248_original.sql

INSERT INTO public.marketplace_vendors_live(id,type,profile_meta)
VALUES ('QA_VENDOR_RESTAURANT','restaurant','{"agreedMarginPercent":12}'::jsonb);
INSERT INTO public.marketplace_orders_live
 (id,vendor_id,order_value,delivery_fee,payment_status,payment_method)
VALUES ('QA_ECON_ORDER','QA_VENDOR_RESTAURANT',1000,100,'Pending','Cash');
INSERT INTO public.vaahak_jobs_live
 (id,kind,status,assigned_partner_id,order_meta,partner_earning)
VALUES ('QA_ECON_JOB','delivery','Accepted','QA_VAAHAK',
        '{"marketplaceOrderId":"QA_ECON_ORDER"}'::jsonb,0);

DO $qa$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.vaahak_jobs_live
  WHERE id='QA_ECON_JOB'
   AND partner_earning=50
   AND (order_meta->>'actualDeliveryCharge')::numeric=100
   AND (order_meta->>'dbestDeliveryShare')::numeric=50
 ) THEN RAISE EXCEPTION 'FAIL: 50/50 Vaahak delivery split or metadata'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.marketplace_orders_live
  WHERE id='QA_ECON_ORDER' AND vaahak_job_id='QA_ECON_JOB'
   AND status='Vaahak Assigned / Going to Vendor'
 ) THEN RAISE EXCEPTION 'FAIL: assignment sync after economics migration'; END IF;
END $qa$;

UPDATE public.marketplace_orders_live
 SET payment_status='Received',completed_at=now()
 WHERE id='QA_ECON_ORDER';
SELECT public.dbest_sync_vendor_settlement_for_order('QA_ECON_ORDER');
-- Test idempotent upsert and percentage calculation.
SELECT public.dbest_sync_vendor_settlement_for_order('QA_ECON_ORDER');

DO $qa$
BEGIN
 IF NOT EXISTS (
 SELECT 1 FROM public.marketplace_vendor_settlements_live
 WHERE order_id='QA_ECON_ORDER' AND vendor_id='QA_VENDOR_RESTAURANT'
 AND gross_order_value=1000 AND product_subtotal=900 AND delivery_charge=100
 AND dbest_margin_percent=12 AND dbest_margin_amount=108
 AND deductions=208 AND net_settlement=792
 ) THEN RAISE EXCEPTION 'FAIL: vendor margin and settlement accounting'; END IF;
 IF (SELECT count(*) FROM public.marketplace_vendor_settlements_live
  WHERE order_id='QA_ECON_ORDER')<>1
 THEN RAISE EXCEPTION 'FAIL: duplicate vendor settlement row'; END IF;
END $qa$;

INSERT INTO public.marketplace_orders_live
 (id,vendor_id,order_value,delivery_fee,payment_status,completed_at)
VALUES ('QA_UNPAID_ORDER','QA_VENDOR_RESTAURANT',500,50,'Pending',now());
SELECT public.dbest_sync_vendor_settlement_for_order('QA_UNPAID_ORDER');
DO $qa$
BEGIN
 IF EXISTS (SELECT 1 FROM public.marketplace_vendor_settlements_live
  WHERE order_id='QA_UNPAID_ORDER')
 THEN RAISE EXCEPTION 'FAIL: unverified payment created vendor settlement'; END IF;
END $qa$;

INSERT INTO public.vaahak_jobs_live
 (id,kind,status,assigned_partner_id,order_meta,partner_earning)
VALUES ('QA_RIDE_JOB','ride','Open','QA_VAAHAK',
  '{"marketplaceOrderId":"QA_ECON_ORDER"}'::jsonb,77);
DO $qa$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.vaahak_jobs_live
 WHERE id='QA_RIDE_JOB' AND partner_earning=77
 AND order_meta='{"marketplaceOrderId":"QA_ECON_ORDER"}'::jsonb)
 THEN RAISE EXCEPTION 'FAIL: passenger ride altered by Marketplace earnings guard'; END IF;
 IF EXISTS (SELECT 1 FROM public.marketplace_orders_live
 WHERE id='QA_ECON_ORDER' AND vaahak_job_id='QA_RIDE_JOB')
 THEN RAISE EXCEPTION 'FAIL: passenger ride contaminated vendor delivery'; END IF;
END $qa$;

DO $qa$
BEGIN
 BEGIN
  UPDATE public.marketplace_vendors_live
  SET dbest_margin_percent=150 WHERE id='QA_VENDOR_RESTAURANT';
  RAISE EXCEPTION 'FAIL: 150-percent margin unexpectedly accepted';
 EXCEPTION WHEN check_violation THEN
  NULL;
 END;
 RAISE NOTICE 'PASS: nine historical migrations; 50/50 split, vendor margin, payment guard, idempotency and ride isolation';
END $qa$;
ROLLBACK;
\echo 'PASS: nine-migration synthetic PostgreSQL replay transaction rolled back'
