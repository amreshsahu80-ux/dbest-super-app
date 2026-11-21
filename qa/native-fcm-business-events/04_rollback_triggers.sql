-- Separate, explicit rollback of new event-hook triggers ONLY.
-- Never deletes business data, existing outbox events, registrations, or
-- production sender configuration.
DO $approval$
BEGIN
 IF current_setting('dbest.native_fcm_hook_rollback_approved',true)
    IS DISTINCT FROM 'reviewed-and-approved' THEN
   RAISE EXCEPTION 'DBest native FCM hook rollback requires an approved operator';
 END IF;
END;
$approval$;

DROP TRIGGER IF EXISTS trg_dbest_fcm_vendor_new_order_v1 ON public.marketplace_orders_live;
DROP TRIGGER IF EXISTS trg_dbest_fcm_vaahak_offer_v1 ON public.vaahak_jobs_live;
DROP TRIGGER IF EXISTS trg_dbest_fcm_service_assignment_v1 ON public.hyperlocal_jobs_live;
