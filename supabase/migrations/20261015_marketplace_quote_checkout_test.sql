-- Test-mode quotation checkout state. No live payments or order dispatch until verified.
create table if not exists public.marketplace_quote_checkout_tests (
 request_id uuid primary key references public.marketplace_upload_requests_live(id) on delete restrict,
 member_id text not null,
 vendor_id text not null,
 delivery_address text not null,
 drop_lat double precision not null check (drop_lat between -90 and 90),
 drop_lng double precision not null check (drop_lng between -180 and 180),
 item_subtotal numeric(12,2) not null check (item_subtotal >= 0),
 delivery_fee numeric(12,2) not null check (delivery_fee >= 0),
 total_amount numeric(12,2) generated always as (item_subtotal + delivery_fee) stored,
 razorpay_order_id text unique,
 razorpay_payment_id text unique,
 payment_verified_at timestamptz,
 marketplace_order_id text unique,
 status text not null default 'Draft' check (status in ('Draft','Payment Pending','Payment Verified','Order Created','Cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint verified_payment_required_for_order check (marketplace_order_id is null or payment_verified_at is not null)
);
alter table public.marketplace_quote_checkout_tests enable row level security;
revoke all on public.marketplace_quote_checkout_tests from anon, authenticated;
create index if not exists marketplace_quote_checkout_tests_member_idx on public.marketplace_quote_checkout_tests(member_id);
