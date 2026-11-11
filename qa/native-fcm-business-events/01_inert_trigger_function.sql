-- DBest native FCM real-event bridge, STAGED ONLY.
-- This file creates a trigger function but attaches NO trigger. It must not
-- be applied to production without an approved migration/release plan.
-- The companion 02_attach_triggers_after_approval.sql is separately gated.
-- Outbox delivery remains controlled by native-fcm-events/process and its
-- DBEST_FCM_SEND_ENABLED switch. No FCM network calls from this function.
--
-- Event keys are immutable/idempotent:
-- Vendor  marketplace_vendor_new_order:<order-id>:<vendor-id>
-- Vaahak vaahak_ride_offer:<job-id>:<offered-vaahak-id>
-- Service service_partner_job_assigned:<job-id>:<partner-account-id>

CREATE OR REPLACE FUNCTION private.dbest_enqueue_native_partner_business_event_v1()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $fcm$
DECLARE
  v_event_key text;
  v_event_type text;
  v_recipient_type text;
  v_recipient_id text;
  v_category text;
  v_title text;
  v_body text;
  v_target_url text;
  v_payment_method text;
  v_is_delivery_payment boolean;
  v_is_online_payment boolean;
BEGIN
  -- Be entirely inert for unexpected invocation/other source relations.
  IF TG_TABLE_SCHEMA <> 'public' OR TG_OP NOT IN ('INSERT','UPDATE') THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'marketplace_orders_live' THEN
    IF TG_OP = 'UPDATE' THEN
      IF OLD.status IS NOT DISTINCT FROM NEW.status
         AND OLD.vendor_status IS NOT DISTINCT FROM NEW.vendor_status
         AND OLD.payment_status IS NOT DISTINCT FROM NEW.payment_status
         AND OLD.payment_method IS NOT DISTINCT FROM NEW.payment_method
         AND OLD.vendor_id IS NOT DISTINCT FROM NEW.vendor_id THEN
        RETURN NEW;
      END IF;
    END IF;
    IF coalesce(NEW.vendor_id,'') = ''
       OR NEW.vendor_status <> 'New Order'
       OR NEW.status NOT IN ('Order Placed','Awaiting Vendor Confirmation') THEN
      RETURN NEW;
    END IF;
    -- An online-upfront order must not notify a vendor before payment clears.
    -- "Pay Online at Delivery - Razorpay" is intentionally PAY-AT-DELIVERY.
    v_payment_method := lower(coalesce(NEW.payment_method,''));
    v_is_delivery_payment := v_payment_method ~ '(at delivery|after delivery|on delivery|cash on delivery|cod)';
    v_is_online_payment := v_payment_method ~ '(razorpay|payu|online|prepaid|card|upi)';
    IF v_is_online_payment AND NOT v_is_delivery_payment
       AND lower(coalesce(NEW.payment_status,'')) NOT IN
           ('paid','prepaid','received','verified','razorpay verified') THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.marketplace_vendors_live v
      WHERE v.id=NEW.vendor_id AND v.owner_approval='Approved'
        AND v.active IS TRUE AND coalesce(v.operational_hold,false) IS FALSE
    ) THEN RETURN NEW; END IF;

    v_event_type := 'marketplace_vendor_new_order';
    v_event_key := v_event_type || ':' || NEW.id || ':' || NEW.vendor_id;
    v_recipient_type := 'Vendor';
    v_recipient_id := NEW.vendor_id;
    v_category := 'order';
    v_title := 'New DBest Marketplace order';
    v_body := 'A customer order is awaiting your review.';
    v_target_url := '/Vendor';

  ELSIF TG_TABLE_NAME = 'vaahak_jobs_live' THEN
    IF TG_OP = 'UPDATE' THEN
      IF OLD.status IS NOT DISTINCT FROM NEW.status
         AND OLD.offered_partner_id IS NOT DISTINCT FROM NEW.offered_partner_id
         AND OLD.offer_expires_at IS NOT DISTINCT FROM NEW.offer_expires_at THEN
        RETURN NEW;
      END IF;
    END IF;
    -- An accepted, expired, cancelled, held or unoffered job is NOT an offer.
    IF NEW.status <> 'Open'
       OR coalesce(NEW.offered_partner_id,'') = ''
       OR NEW.offer_expires_at IS NULL
       OR NEW.offer_expires_at <= now() THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.vaahak_partners_live p
      WHERE p.id=NEW.offered_partner_id AND p.owner_approval='Approved'
        AND p.available IS TRUE AND coalesce(p.operational_hold,false) IS FALSE
    ) THEN RETURN NEW; END IF;

    v_event_type := 'vaahak_ride_offer';
    v_event_key := v_event_type || ':' || NEW.id || ':' || NEW.offered_partner_id;
    v_recipient_type := 'Vaahak';
    v_recipient_id := NEW.offered_partner_id;
    v_category := 'ride';
    v_title := CASE WHEN lower(coalesce(NEW.kind,''))='delivery'
                    THEN 'New DBest delivery' ELSE 'New DBest ride request' END;
    v_body := 'A new request is available. Open your Vaahak workspace to respond.';
    v_target_url := '/vaahak';

  ELSIF TG_TABLE_NAME = 'hyperlocal_jobs_live' THEN
    IF TG_OP = 'UPDATE' THEN
      IF OLD.status IS NOT DISTINCT FROM NEW.status
         AND OLD.assigned_partner_member_id IS NOT DISTINCT FROM NEW.assigned_partner_member_id THEN
        RETURN NEW;
      END IF;
    END IF;
    IF NEW.status <> 'Assigned'
       OR coalesce(NEW.assigned_partner_member_id,'') = '' THEN
      RETURN NEW;
    END IF;
    -- The account ID used for FCM must equal the authenticated partner session
    -- account_id (service_partner_profiles_live.member_id). Never notify
    -- pending/rejected/unapproved accounts.
    IF NOT EXISTS (
      SELECT 1 FROM public.service_partner_profiles_live p
      JOIN public.partner_accounts_live a ON a.account_id=p.member_id
      WHERE p.member_id=NEW.assigned_partner_member_id
        AND p.approval_status='Approved' AND p.active IS TRUE
        AND coalesce(p.operational_hold,false) IS FALSE
        AND a.account_status='Active' AND 'service_partner'=ANY(a.roles)
    ) THEN RETURN NEW; END IF;

    v_event_type := 'service_partner_job_assigned';
    v_event_key := v_event_type || ':' || NEW.id::text || ':' || NEW.assigned_partner_member_id;
    v_recipient_type := 'Service Partner';
    v_recipient_id := NEW.assigned_partner_member_id;
    v_category := 'job';
    v_title := 'DBest service assignment';
    v_body := 'A service request has been assigned to your account.';
    v_target_url := '/ServicePartnerDashboard';
  ELSE
    RETURN NEW;
  END IF;

  -- Atomically stage a single immutable event per source + recipient.
  -- This does not send; a separately authorized worker must later process it.
  INSERT INTO public.native_fcm_outbox (
      event_key,event_type,recipient_type,recipient_id,
      category,title,body,target_url
  ) VALUES (
      v_event_key,v_event_type,v_recipient_type,v_recipient_id,
      v_category,v_title,v_body,v_target_url
  ) ON CONFLICT (event_key) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A transient FCM queue problem must never block a customer checkout,
  -- operational ride dispatch, or service-job assignment.
  RAISE LOG 'dbest_fcm_partner_enqueue_failed source=% sqlstate=%',TG_TABLE_NAME,SQLSTATE;
  RETURN NEW;
END;
$fcm$;

REVOKE ALL ON FUNCTION private.dbest_enqueue_native_partner_business_event_v1() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.dbest_enqueue_native_partner_business_event_v1() FROM anon, authenticated;
