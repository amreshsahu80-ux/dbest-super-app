-- Export the authoritative source and trigger-generated outbox rows
-- from the ephemeral GitHub Actions PostgreSQL fixture, not live Supabase.
-- This JSON is consumed by a Deno worker-policy integration test.
SELECT json_build_object(
  'outbox', COALESCE((SELECT json_agg(to_jsonb(t)) FROM public.native_fcm_outbox t), '[]'::json),
  'tables', json_build_object(
    'marketplace_orders_live',COALESCE((SELECT json_agg(to_jsonb(t)) FROM public.marketplace_orders_live t),'[]'::json),
    'marketplace_vendors_live',COALESCE((SELECT json_agg(to_jsonb(t)) FROM public.marketplace_vendors_live t),'[]'::json),
    'vaahak_jobs_live',COALESCE((SELECT json_agg(to_jsonb(t)) FROM public.vaahak_jobs_live t),'[]'::json),
    'vaahak_partners_live',COALESCE((SELECT json_agg(to_jsonb(t)) FROM public.vaahak_partners_live t),'[]'::json),
    'hyperlocal_jobs_live',COALESCE((SELECT json_agg(to_jsonb(t)) FROM public.hyperlocal_jobs_live t),'[]'::json),
    'service_partner_profiles_live',COALESCE((SELECT json_agg(to_jsonb(t)) FROM public.service_partner_profiles_live t),'[]'::json),
    'partner_accounts_live',COALESCE((SELECT json_agg(to_jsonb(t)) FROM public.partner_accounts_live t),'[]'::json)
  )
);