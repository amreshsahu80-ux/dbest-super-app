-- Disposable PostgreSQL integration sandbox ONLY. Intentionally uses no Supabase credentials,
-- payment gateway keys, personal data, real members, real partners or actual bank payout.
\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE public.onboarding_records(
 kind text NOT NULL, external_id text NOT NULL, name text, category text,
 status text, deleted_at timestamptz
);
CREATE TABLE public.leader_partner_onboarding_launches(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 leader_id text NOT NULL, partner_type text NOT NULL, partner_id text,
 status text NOT NULL DEFAULT 'Launched', incentive_amount numeric(12,2) NOT NULL DEFAULT 100,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now() + interval '6 hours',
 credited_at timestamptz
);
CREATE TABLE public.member_wallet_accounts(
 member_id text PRIMARY KEY,available_balance numeric(12,2) DEFAULT 0,
 lifetime_earned numeric(12,2) DEFAULT 0, updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.member_wallet_ledger(
 id bigserial PRIMARY KEY,member_id text NOT NULL, entry_type text NOT NULL,
 balance_bucket text DEFAULT 'available', amount_signed numeric(12,2) NOT NULL,
 idempotency_key text NOT NULL UNIQUE, source_transaction_id text, reference text,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.marketplace_vendors_live(
 id text PRIMARY KEY, active boolean DEFAULT false,
 owner_approval text DEFAULT 'Pending', agreement_status text DEFAULT 'Pending',
 onboarding_admin_id text,onboarding_leader_id text
);
CREATE TABLE public.vaahak_partners_live(
 id text PRIMARY KEY, available boolean DEFAULT false,
 owner_approval text DEFAULT 'Pending', agreement_status text DEFAULT 'Pending',
 onboarding_admin_id text,onboarding_leader_id text
);
CREATE TABLE public.service_partner_profiles_live(
 member_id text PRIMARY KEY,service_partner_id text UNIQUE, active boolean DEFAULT false,
 approval_status text DEFAULT 'Pending',onboarding_admin_id text,onboarding_leader_id text
);

-- These three functions below are the exact production definitions, unedited, in an
-- isolated PostgreSQL service for integration tests. No connection to live Supabase.
\i tests/partner-onboarding-sandbox/live-functions.sql

CREATE TRIGGER trg_vendor_leader_onboarding_incentive
 AFTER INSERT OR UPDATE ON public.marketplace_vendors_live
 FOR EACH ROW EXECUTE FUNCTION public.dbest_leader_partner_onboarding_trigger('Vendor');
CREATE TRIGGER trg_vaahak_leader_onboarding_incentive
 AFTER INSERT OR UPDATE ON public.vaahak_partners_live
 FOR EACH ROW EXECUTE FUNCTION public.dbest_leader_partner_onboarding_trigger('Vaahak');
CREATE TRIGGER trg_service_leader_onboarding_incentive
 AFTER INSERT OR UPDATE ON public.service_partner_profiles_live
 FOR EACH ROW EXECUTE FUNCTION public.dbest_leader_partner_onboarding_trigger('Service Partner');
CREATE TRIGGER trg_vendor_single_onboarding_source
 BEFORE INSERT OR UPDATE OF onboarding_admin_id,onboarding_leader_id ON public.marketplace_vendors_live
 FOR EACH ROW EXECUTE FUNCTION public.dbest_guard_single_partner_onboarding_source();
CREATE TRIGGER trg_vaahak_single_onboarding_source
 BEFORE INSERT OR UPDATE OF onboarding_admin_id,onboarding_leader_id ON public.vaahak_partners_live
 FOR EACH ROW EXECUTE FUNCTION public.dbest_guard_single_partner_onboarding_source();
CREATE TRIGGER trg_service_single_onboarding_source
 BEFORE INSERT OR UPDATE OF onboarding_admin_id,onboarding_leader_id ON public.service_partner_profiles_live
 FOR EACH ROW EXECUTE FUNCTION public.dbest_guard_single_partner_onboarding_source();

INSERT INTO public.onboarding_records(kind,external_id,name,category,status)
 VALUES ('member','LEADER-QA','Synthetic Leader','leader','Active'),
        ('member','PENDING-LEADER-QA','Unapproved Synthetic Leader','leader','Pending');
INSERT INTO public.leader_partner_onboarding_launches(leader_id,partner_type,partner_id,status)
 VALUES ('LEADER-QA','Vendor','QA-VEND','Claimed'),
        ('LEADER-QA','Vaahak','QA-VAAH','Claimed'),
        ('LEADER-QA','Service Partner','QA-SERVICE','Claimed'),
        ('PENDING-LEADER-QA','Vendor','QA-UNAPPROVED','Claimed'),
        ('LEADER-QA','Vendor','QA-UNCLAIMED','Launched');

INSERT INTO public.marketplace_vendors_live(id,onboarding_leader_id)
 VALUES ('QA-VEND','LEADER-QA');
INSERT INTO public.vaahak_partners_live(id,onboarding_leader_id)
 VALUES ('QA-VAAH','LEADER-QA');
INSERT INTO public.service_partner_profiles_live(member_id,service_partner_id,onboarding_leader_id)
 VALUES ('QA-MEMBER-SERVICE','QA-SERVICE','LEADER-QA');

DO $$
BEGIN
 IF (SELECT count(*) FROM public.member_wallet_ledger)<>0 THEN
  RAISE EXCEPTION 'FAIL: registration alone must never credit the wallet'; END IF;
END $$;

-- Incomplete Vendor: owner approved, but unsigned and inactive must not credit.
UPDATE public.marketplace_vendors_live SET owner_approval='Approved' WHERE id='QA-VEND';
UPDATE public.marketplace_vendors_live SET agreement_status='Fully Signed' WHERE id='QA-VEND';
DO $$
BEGIN
 IF (SELECT count(*) FROM public.member_wallet_ledger)<>0 THEN
  RAISE EXCEPTION 'FAIL: Vendor not active should not credit'; END IF;
END $$;

-- Vaahak: approved but agreement pending must not credit.
UPDATE public.vaahak_partners_live SET owner_approval='Approved' WHERE id='QA-VAAH';
-- Service Partner: approved but not active must not credit.
UPDATE public.service_partner_profiles_live SET approval_status='Approved'
 WHERE service_partner_id='QA-SERVICE';
DO $$
BEGIN
 IF (SELECT count(*) FROM public.member_wallet_ledger)<>0 THEN
  RAISE EXCEPTION 'FAIL: unsigned Vaahak or inactive Service Partner credited'; END IF;
END $$;

-- All three become eligible using existing Owner/KYC/agreement preconditions:
UPDATE public.marketplace_vendors_live SET active=true WHERE id='QA-VEND';
UPDATE public.vaahak_partners_live SET agreement_status='Fully Signed' WHERE id='QA-VAAH';
UPDATE public.service_partner_profiles_live SET active=true WHERE service_partner_id='QA-SERVICE';

DO $$
DECLARE v_total numeric;v_count integer;v_earned numeric;
BEGIN
 SELECT count(*),coalesce(sum(amount_signed),0)
 INTO v_count,v_total FROM public.member_wallet_ledger;
 IF v_count<>3 OR v_total<>600 THEN
  RAISE EXCEPTION 'FAIL: expected 3 wallet credits totalling INR 600, got % / %',v_count,v_total;
 END IF;
 SELECT available_balance INTO v_earned FROM public.member_wallet_accounts
 WHERE member_id='LEADER-QA';
 IF v_earned<>600 THEN
  RAISE EXCEPTION 'FAIL: leader wallet expected 600 available, got %',v_earned; END IF;
 IF (SELECT count(*) FROM public.leader_partner_onboarding_launches
     WHERE leader_id='LEADER-QA' AND status='Credited')<>3 THEN
  RAISE EXCEPTION 'FAIL: all 3 invitations must show Credited status'; END IF;
 IF (SELECT count(*) FROM public.member_wallet_ledger
     WHERE metadata->>'service_key'='leader_partner_onboarding')<>3 THEN
  RAISE EXCEPTION 'FAIL: credited ledger metadata is missing'; END IF;
 RAISE NOTICE 'PASS: Vendor INR 300, Vaahak INR 200, Service Partner INR 100 credited to synthetic wallet';
END $$;

-- Repeated approval updates must not double-credit due to ledger idempotency.
UPDATE public.marketplace_vendors_live SET active=true WHERE id='QA-VEND';
UPDATE public.vaahak_partners_live SET owner_approval='Approved' WHERE id='QA-VAAH';
UPDATE public.service_partner_profiles_live SET approval_status='Approved'
 WHERE service_partner_id='QA-SERVICE';

-- Fully approved fake partner with PENDING Leader must not credit.
INSERT INTO public.marketplace_vendors_live(id,onboarding_leader_id,owner_approval,agreement_status,active)
 VALUES ('QA-UNAPPROVED','PENDING-LEADER-QA','Approved','Fully Signed',true);
-- The same legitimate Leader cannot earn from an unclaimed invitation.
INSERT INTO public.marketplace_vendors_live(id,onboarding_leader_id,owner_approval,agreement_status,active)
 VALUES ('QA-UNCLAIMED','LEADER-QA','Approved','Fully Signed',true);

-- The dual Leader + Distributor attribution must be rejected by exact live guard function.
DO $$
BEGIN
 BEGIN
  INSERT INTO public.marketplace_vendors_live(id,onboarding_leader_id,onboarding_admin_id)
   VALUES ('QA-DUAL-SOURCE','LEADER-QA','TERRITORY-ADMIN-QA');
  RAISE EXCEPTION 'FAIL: dual Leader/Distributor attribution was incorrectly permitted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE '%partner_onboarding_source_conflict%' THEN RAISE; END IF;
 END;
END $$;

DO $$
DECLARE ledger_count integer;wallet_total numeric;
BEGIN
 SELECT count(*) INTO ledger_count FROM public.member_wallet_ledger;
 SELECT coalesce(sum(available_balance),0) INTO wallet_total FROM public.member_wallet_accounts;
 IF ledger_count<>3 OR wallet_total<>600 THEN
  RAISE EXCEPTION 'FAIL: duplicate, pending Leader or unclaimed source credited (% / %)',ledger_count,wallet_total;
 END IF;
 IF (SELECT count(*) FROM public.member_wallet_ledger
     WHERE entry_type ILIKE '%Payout Paid%')>0 THEN
  RAISE EXCEPTION 'FAIL: no bank payout must be created by onboarding'; END IF;
 RAISE NOTICE 'PASS: approvals do not duplicate credits; ineligible sponsorships pay zero';
 RAISE NOTICE 'PASS: bank payout never initiated by onboarding triggers';
END $$;

-- The entire sandbox database is disposable; transaction is rolled back as extra defense.
ROLLBACK;
