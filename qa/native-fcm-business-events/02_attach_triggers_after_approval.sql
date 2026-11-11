-- STAGED RELEASE ARTIFACT: DO NOT APPLY TO PRODUCTION WITHOUT OWNER APPROVAL.
-- Prerequisites: deploy/review hardened native-fcm-events vNext; confirm its
-- process worker scheduling, private credentials, suppressions, canary capacity,
-- owner approval, rollback, and a tested device. All are separate gates.
-- To run deliberately in an isolated test DB or an approved migration session:
--   BEGIN;
--   SET LOCAL dbest.native_fcm_hook_activation_approved = 'reviewed-and-approved';
--   \i qa/native-fcm-business-events/02_attach_triggers_after_approval.sql
--   COMMIT;
--
-- Merely applying 01_inert_trigger_function.sql never attaches triggers.
DO $approval$
BEGIN
 IF current_setting('dbest.native_fcm_hook_activation_approved',true)
      IS DISTINCT FROM 'reviewed-and-approved' THEN
   RAISE EXCEPTION 'DBest native FCM hook activation requires explicit reviewed owner approval';
 END IF;
 IF to_regprocedure('private.dbest_enqueue_native_partner_business_event_v1()') IS NULL THEN
   RAISE EXCEPTION 'Missing reviewed FCM trigger function';
 END IF;
 IF EXISTS (
   SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgname IN
    ('trg_dbest_fcm_vendor_new_order_v1',
     'trg_dbest_fcm_vaahak_offer_v1',
     'trg_dbest_fcm_service_assignment_v1')
 ) THEN
   RAISE EXCEPTION 'FCM business-event triggers already present; refuse ambiguous re-activation';
 END IF;
END;
$approval$;

CREATE TRIGGER trg_dbest_fcm_vendor_new_order_v1
AFTER INSERT OR UPDATE OF status,vendor_status,payment_status,payment_method,vendor_id
ON public.marketplace_orders_live
FOR EACH ROW EXECUTE FUNCTION private.dbest_enqueue_native_partner_business_event_v1();

CREATE TRIGGER trg_dbest_fcm_vaahak_offer_v1
AFTER INSERT OR UPDATE OF status,offered_partner_id,offer_expires_at
ON public.vaahak_jobs_live
FOR EACH ROW EXECUTE FUNCTION private.dbest_enqueue_native_partner_business_event_v1();

CREATE TRIGGER trg_dbest_fcm_service_assignment_v1
AFTER INSERT OR UPDATE OF status,assigned_partner_member_id
ON public.hyperlocal_jobs_live
FOR EACH ROW EXECUTE FUNCTION private.dbest_enqueue_native_partner_business_event_v1();
