-- DBest: Owner-only partner onboarding incentive control (20 Oct 2026)
-- This modifies only the two incentive trigger functions and EXECUTE grants of the two raw credit RPCs.
-- It does not modify Vendor / Vaahak / Service Partner tables, status, wallet rows, onboarding,
-- protected Cab / Marketplace functionality or historical credited amounts.
BEGIN;

-- Preserve operational INSERT / UPDATE triggers but remove automatic money crediting.
CREATE OR REPLACE FUNCTION public.dbest_leader_partner_onboarding_trigger()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $DBEST$
BEGIN
  -- Approval or activation must never credit Leader earnings automatically.
  -- Owner-authorized credit will require a separately reviewed owner-only route.
  RETURN NEW;
END;
$DBEST$;

CREATE OR REPLACE FUNCTION public.dbest_partner_onboarding_incentive_trigger()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $DBEST$
BEGIN
  -- Preserve Territory Distributor onboarding without auto-crediting wallet.
  RETURN NEW;
END;
$DBEST$;

-- Raw incentive-crediting database functions must not be callable from browser API roles.
REVOKE ALL ON FUNCTION public.dbest_credit_leader_partner_onboarding_incentive(text,text,text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dbest_credit_territory_admin_onboarding_incentive(text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dbest_credit_leader_partner_onboarding_incentive(text,text,text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.dbest_credit_territory_admin_onboarding_incentive(text,text,text)
  TO service_role;

INSERT INTO public.owner_audit_log(action,entity_type,entity_ref,details)
VALUES (
  'PartnerOnboardingIncentiveAutoCreditDisabled',
  'OnboardingIncentiveControl',
  'Leader|Territory Distributor',
  jsonb_build_object(
    'approved_policy','Only Owner may authorize incentives or payouts',
    'leader_trigger_credit_enabled',false,
    'territory_trigger_credit_enabled',false,
    'raw_credit_rpc_browser_access',false,
    'historical_wallet_entries_changed',false,
    'owner_credit_ui_status','not yet wired; no credits until Owner-approved workflow',
    'date','2026-10-20'
  )
);
COMMIT;
