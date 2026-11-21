-- PROPOSED ONLY: do not apply to production before preview QA.
-- Separate DBest master catalogue, vendor offers and vendor-submitted products.
create table if not exists public.dbest_master_products (
 id uuid primary key default gen_random_uuid(),
 category text not null check (category in ('grocery','restaurant','medicine','electronics')),
 name text not null, brand text, specifications jsonb not null default '{}'::jsonb,
 barcode_gtin text, hsn_sac text, gst_rate_percent numeric(5,2),
 tax_inclusive boolean, gst_verified_at timestamptz,
 image_url text, image_rights_verified boolean not null default false,
 status text not null default 'draft' check (status in ('draft','approved','suspended')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index if not exists dbest_master_products_barcode_unique
 on public.dbest_master_products(barcode_gtin) where barcode_gtin is not null;
create table if not exists public.dbest_vendor_product_offers (
 id uuid primary key default gen_random_uuid(),
 vendor_id text not null references public.marketplace_vendors_live(id),
 master_product_id uuid not null references public.dbest_master_products(id),
 price_inclusive_gst numeric(12,2) not null check(price_inclusive_gst>0),
 mrp numeric(12,2),stock integer not null default 0 check(stock>=0),
 active boolean not null default false,created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(vendor_id,master_product_id),
 check(mrp is null or mrp>=price_inclusive_gst)
);
create table if not exists public.dbest_vendor_product_submissions (
 id uuid primary key default gen_random_uuid(),
 vendor_id text not null references public.marketplace_vendors_live(id),
 payload jsonb not null,import_batch_id uuid,
 status text not null default 'pending_owner_review'
 check(status in ('pending_owner_review','approved','rejected','needs_correction')),
 matched_master_product_id uuid references public.dbest_master_products(id),
 reviewed_by text,reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
-- No anon/authenticated direct access: only trusted server API may write.
alter table public.dbest_master_products enable row level security;
alter table public.dbest_vendor_product_offers enable row level security;
alter table public.dbest_vendor_product_submissions enable row level security;
revoke all on public.dbest_master_products from anon,authenticated;
revoke all on public.dbest_vendor_product_offers from anon,authenticated;
revoke all on public.dbest_vendor_product_submissions from anon,authenticated;
