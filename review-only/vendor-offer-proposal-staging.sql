-- Isolated vendor offer proposals; no writes to live vendor offers or customer listings.
create table if not exists public.dbest_vendor_offer_proposal_staging (
 id uuid primary key default gen_random_uuid(),
 master_staging_id uuid not null references public.dbest_master_catalogue_import_staging(id),
 vendor_id text not null,
 proposed_price numeric(12,2) not null check (proposed_price>0),
 proposed_mrp numeric(12,2) not null check (proposed_mrp>=proposed_price),
 stock integer not null check (stock>=0),
 vendor_image_url text,
 status text not null default 'draft' check(status in ('draft','pending_review','rejected','approved_for_migration')),
 submitted_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by text,
 check(vendor_image_url is null or vendor_image_url ~ '^https://')
);
alter table public.dbest_vendor_offer_proposal_staging enable row level security;
revoke all on public.dbest_vendor_offer_proposal_staging from public,anon,authenticated;
-- No client policies. Owner/verified vendor server endpoints only.
