-- Synthetic CI tests: authorized activation against local ephemeral PostgreSQL.
BEGIN;
SET LOCAL dbest.native_fcm_hook_activation_approved='reviewed-and-approved';
\i qa/native-fcm-business-events/02_attach_triggers_after_approval.sql
COMMIT;

INSERT INTO public.marketplace_vendors_live(id,owner_approval,active,operational_hold)
VALUES ('vendor-ok','Approved',true,false),
       ('vendor-two','Approved',true,false),
       ('vendor-held','Approved',true,true),
       ('vendor-pending','Pending',false,false);

-- Normal pay-at-delivery is actionable without prepaid confirmation.
INSERT INTO public.marketplace_orders_live
(id,vendor_id,status,vendor_status,payment_status,payment_method)
VALUES ('order-cod','vendor-ok','Order Placed','New Order','Pending','Pay after Delivery');

-- Upfront online pending payment must NOT enqueue.
INSERT INTO public.marketplace_orders_live
(id,vendor_id,status,vendor_status,payment_status,payment_method)
VALUES ('order-online','vendor-ok','Payment Pending','Payment Pending','Pending','Razorpay');
UPDATE public.marketplace_orders_live SET status='Order Placed',
    vendor_status='New Order',payment_status='Received'
WHERE id='order-online';

-- "Pay Online at Delivery" is NOT an upfront-online payment.
INSERT INTO public.marketplace_orders_live
(id,vendor_id,status,vendor_status,payment_status,payment_method)
VALUES ('order-at-delivery','vendor-ok','Order Placed','New Order','Pending',
        'Pay Online at Delivery - Razorpay');

-- Reassignment creates a fresh unique notice to the new approved Vendor.
UPDATE public.marketplace_orders_live SET vendor_id='vendor-two'
WHERE id='order-cod';

-- Pending/held/rejected/cancelled cases never enqueue.
INSERT INTO public.marketplace_orders_live
(id,vendor_id,status,vendor_status,payment_status,payment_method)
VALUES ('order-held','vendor-held','Order Placed','New Order','Pending','Pay at Delivery'),
       ('order-pending-vendor','vendor-pending','Order Placed','New Order','Pending','Pay at Delivery'),
       ('order-cancelled','vendor-ok','Delivery Cancelled','New Order','Pending','Pay at Delivery');

-- Repeated no-op updates must not cause duplicate sends.
UPDATE public.marketplace_orders_live SET payment_status='Pending' WHERE id='order-cod';
UPDATE public.marketplace_orders_live SET payment_status='Received' WHERE id='order-online';

INSERT INTO public.vaahak_partners_live(id,owner_approval,available,operational_hold)
VALUES ('vaahak-one','Approved',true,false),
       ('vaahak-two','Approved',true,false),
       ('vaahak-held','Approved',true,true),
       ('vaahak-offline','Approved',false,false);

-- Only the current, unexpired OFFER to the actual driver is eligible.
INSERT INTO public.vaahak_jobs_live
(id,kind,status,offered_partner_id,offer_expires_at)
VALUES ('ride-offer','ride','Open','vaahak-one',now()+interval '3 minutes'),
       ('ride-expired','ride','Open','vaahak-one',now()-interval '3 minutes'),
       ('ride-held','ride','Open','vaahak-held',now()+interval '3 minutes'),
       ('ride-offline','ride','Open','vaahak-offline',now()+interval '3 minutes'),
       ('ride-accepted','ride','Accepted','vaahak-one',now()+interval '3 minutes');
UPDATE public.vaahak_jobs_live SET offered_partner_id='vaahak-two'
WHERE id='ride-offer';
UPDATE public.vaahak_jobs_live SET status='Accepted'
WHERE id='ride-offer';
UPDATE public.vaahak_jobs_live SET status='Accepted'
WHERE id='ride-offer';

INSERT INTO public.partner_accounts_live(account_id,account_status,roles)
VALUES ('sp-approved','Active',ARRAY['service_partner']),
       ('sp-pending','Active',ARRAY['service_partner']),
       ('sp-rejected','Active',ARRAY['service_partner']),
       ('sp-wrong-role','Active',ARRAY['vendor']),
       ('sp-inactive','Suspended',ARRAY['service_partner']);
INSERT INTO public.service_partner_profiles_live
(member_id,approval_status,active,operational_hold)
VALUES ('sp-approved','Approved',true,false),
       ('sp-pending','Pending',false,false),
       ('sp-rejected','Rejected',false,false),
       ('sp-wrong-role','Approved',true,false),
       ('sp-inactive','Approved',true,false);

INSERT INTO public.hyperlocal_jobs_live(id,status,assigned_partner_member_id)
VALUES ('00000000-0000-4000-8000-000000000001','Assigned','sp-approved'),
       ('00000000-0000-4000-8000-000000000002','Assigned','sp-pending'),
       ('00000000-0000-4000-8000-000000000003','Assigned','sp-rejected'),
       ('00000000-0000-4000-8000-000000000004','Assigned','sp-wrong-role'),
       ('00000000-0000-4000-8000-000000000005','Assigned','sp-inactive'),
       ('00000000-0000-4000-8000-000000000006','Open','sp-approved');
UPDATE public.hyperlocal_jobs_live SET status='Assigned'
WHERE id='00000000-0000-4000-8000-000000000006';
UPDATE public.hyperlocal_jobs_live SET status='Assigned'
WHERE id='00000000-0000-4000-8000-000000000006';

DO $checks$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM public.native_fcm_outbox;
  IF n<>8 THEN RAISE EXCEPTION 'Expected exactly 8 deduplicated notifications, got %',n; END IF;
  SELECT count(*) INTO n FROM public.native_fcm_outbox
   WHERE recipient_type='Vendor';
  IF n<>4 THEN RAISE EXCEPTION 'Vendor count must be 4, got %',n; END IF;
  SELECT count(*) INTO n FROM public.native_fcm_outbox
   WHERE recipient_type='Vaahak';
  IF n<>2 THEN RAISE EXCEPTION 'Vaahak count must be 2, got %',n; END IF;
  SELECT count(*) INTO n FROM public.native_fcm_outbox
   WHERE recipient_type='Service Partner';
  IF n<>2 THEN RAISE EXCEPTION 'Service Partner count must be 2, got %',n; END IF;
  IF EXISTS(SELECT 1 FROM public.native_fcm_outbox
     WHERE recipient_id IN ('vendor-held','vendor-pending',
                            'vaahak-held','vaahak-offline',
                            'sp-pending','sp-rejected','sp-wrong-role','sp-inactive'))
     THEN RAISE EXCEPTION 'Disallowed recipient was queued'; END IF;
  IF EXISTS(SELECT 1 FROM public.native_fcm_outbox
     WHERE recipient_type='Vaahak' AND recipient_id NOT IN ('vaahak-one','vaahak-two'))
     THEN RAISE EXCEPTION 'Vaahak offer leaked'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.native_fcm_outbox
     WHERE event_key='marketplace_vendor_new_order:order-cod:vendor-two')
     THEN RAISE EXCEPTION 'Vendor reassignment did not generate new recipient key'; END IF;
  IF EXISTS(SELECT 1 FROM public.native_fcm_outbox
     WHERE event_key LIKE '%order-held%' OR event_key LIKE '%order-cancelled%'
        OR event_key LIKE '%ride-expired%' OR event_key LIKE '%ride-accepted%')
     THEN RAISE EXCEPTION 'Ineligible or expired source queued'; END IF;
  RAISE NOTICE 'PASS: 8 expected routed business events; no duplicates, expired offers, pending payments or unapproved recipients';
END;
$checks$;

-- Rollback of the new triggers must leave all source records and outbox rows intact.
BEGIN;
SET LOCAL dbest.native_fcm_hook_rollback_approved='reviewed-and-approved';
\i qa/native-fcm-business-events/04_rollback_triggers.sql
COMMIT;
DO $checks$
BEGIN
  IF (SELECT count(*) FROM public.native_fcm_outbox)<>8 THEN
    RAISE EXCEPTION 'Rollback altered queued events'; END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'trg_dbest_fcm_%') THEN
    RAISE EXCEPTION 'Rollback left active notification triggers'; END IF;
  RAISE NOTICE 'PASS: rollback removed only event triggers, preserving outbox';
END;
$checks$;
