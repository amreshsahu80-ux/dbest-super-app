-- DBest: Owner-owned payout policy correction (20 Oct 2026)
-- Owner clarification: ordinary earnings credits ARE automatic under Owner-defined payout rules.
-- ONLY bank settlement / real transfers need Owner authorization.
-- No partner onboarding trigger, member wallet, territory wallet, registration or payout business rule is changed.
-- Historical audit: A prior mistaken temporary trigger suspension was RESTORED in live
-- Supabase within the same session and VERIFIED. Never reapply that suspension.
BEGIN;
-- Defense in depth: do not expose raw financial credit RPCs to browser API roles.
-- These functions remain callable by service_role for automatic qualified credits.
REVOKE ALL ON FUNCTION public.dbest_credit_leader_partner_onboarding_incentive(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dbest_credit_territory_admin_onboarding_incentive(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dbest_credit_leader_partner_onboarding_incentive(text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.dbest_credit_territory_admin_onboarding_incentive(text,text,text) TO service_role;
DO $DBEST$
BEGIN
 IF NOT pg_get_functiondef('public.dbest_leader_partner_onboarding_trigger()'::regprocedure) ILIKE '%perform public.dbest_credit_leader_partner_onboarding_incentive%'
 THEN RAISE EXCEPTION 'Leader automatic wallet-credit trigger must stay active'; END IF;
 IF NOT pg_get_functiondef('public.dbest_partner_onboarding_incentive_trigger()'::regprocedure) ILIKE '%perform public.dbest_credit_territory_admin_onboarding_incentive%'
 THEN RAISE EXCEPTION 'Territory automatic wallet-credit trigger must stay active'; END IF;
END $DBEST$;
COMMIT;
