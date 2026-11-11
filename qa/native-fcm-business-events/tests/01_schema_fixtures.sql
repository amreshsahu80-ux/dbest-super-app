-- All records are synthetic and exist ONLY in ephemeral CI PostgreSQL.
CREATE SCHEMA IF NOT EXISTS private;
DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.native_fcm_outbox (
  event_key text UNIQUE NOT NULL,
  event_type text NOT NULL,
  recipient_type text NOT NULL,
  recipient_id text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  target_url text NOT NULL,
  state text NOT NULL DEFAULT 'pending'
);
CREATE TABLE public.marketplace_vendors_live (
  id text PRIMARY KEY,
  owner_approval text NOT NULL,
  active boolean NOT NULL,
  operational_hold boolean NOT NULL DEFAULT false
);
CREATE TABLE public.marketplace_orders_live (
  id text PRIMARY KEY,
  vendor_id text,
  status text,
  vendor_status text,
  payment_status text,
  payment_method text
);
CREATE TABLE public.vaahak_partners_live (
  id text PRIMARY KEY,
  owner_approval text NOT NULL,
  available boolean NOT NULL,
  operational_hold boolean NOT NULL DEFAULT false
);
CREATE TABLE public.vaahak_jobs_live (
  id text PRIMARY KEY,
  kind text NOT NULL,
  status text NOT NULL,
  offered_partner_id text,
  offer_expires_at timestamptz
);
CREATE TABLE public.partner_accounts_live (
  account_id text PRIMARY KEY,
  account_status text,
  roles text[]
);
CREATE TABLE public.service_partner_profiles_live (
  member_id text PRIMARY KEY,
  approval_status text,
  active boolean NOT NULL,
  operational_hold boolean NOT NULL DEFAULT false
);
CREATE TABLE public.hyperlocal_jobs_live (
  id uuid PRIMARY KEY,
  status text NOT NULL,
  assigned_partner_member_id text
);
