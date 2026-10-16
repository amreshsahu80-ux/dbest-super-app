-- Proposed additive schema for multi-vendor quotations; NOT applied.
create table if not exists public.marketplace_quote_invitations (
 request_id uuid not null references public.marketplace_upload_requests_live(id) on delete cascade,
 vendor_id text not null references public.marketplace_vendors_live(id),
 created_at timestamptz not null default now(),
 primary key(request_id,vendor_id)
);
create table if not exists public.marketplace_quote_offers (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null,
 vendor_id text not null,
 version integer not null default 1 check(version>0),
 items jsonb not null,
 subtotal numeric(12,2) not null check(subtotal>=0),
 delivery_fee numeric(12,2) not null check(delivery_fee>=0),
 status text not null default 'submitted' check(status in ('submitted','withdrawn','accepted','declined','expired')),
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 unique(request_id,vendor_id,version),
 foreign key(request_id,vendor_id) references public.marketplace_quote_invitations(request_id,vendor_id)
);
create unique index if not exists marketplace_one_accepted_offer_per_request on public.marketplace_quote_offers(request_id) where status='accepted';
create table if not exists public.marketplace_quote_order_links (
 request_id uuid primary key references public.marketplace_upload_requests_live(id),
 offer_id uuid not null unique references public.marketplace_quote_offers(id),
 order_id text not null unique references public.marketplace_orders_live(id),
 created_at timestamptz not null default now()
);
alter table public.marketplace_quote_invitations enable row level security;
alter table public.marketplace_quote_offers enable row level security;
alter table public.marketplace_quote_order_links enable row level security;
revoke all on public.marketplace_quote_invitations, public.marketplace_quote_offers, public.marketplace_quote_order_links from anon, authenticated;
-- Server Edge Functions must authenticate members/vendors and perform authorized service-role operations.
-- Never enable direct browser access to these tables without ownership policies.
