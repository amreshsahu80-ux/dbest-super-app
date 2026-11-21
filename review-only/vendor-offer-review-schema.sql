-- REVIEW ONLY: not applied to any database.
-- Existing dbest_vendor_product_offers has no review_status/version columns.
-- Must be reviewed with the existing Owner authentication implementation before deployment.
begin;
alter table public.dbest_vendor_product_offers
  add column if not exists review_status text not null default 'pending_review',
  add column if not exists review_version integer not null default 0,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;
alter table public.dbest_vendor_product_offers
  add constraint dbest_vendor_offer_review_status_check
  check (review_status in ('draft','pending_review','approved','rejected','suspended'));
create table if not exists public.dbest_vendor_offer_review_audit (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.dbest_vendor_product_offers(id),
  actor_id text not null,
  prior_status text not null,
  new_status text not null,
  reason text not null default '',
  prior_version integer not null,
  next_version integer not null,
  created_at timestamptz not null default now()
);
alter table public.dbest_vendor_offer_review_audit enable row level security;
-- Intentionally NO anon/authenticated policies: audit is private until server Owner auth is verified.
-- Do not assume active=true means approved; customer visibility must check review_status='approved'.
commit;
