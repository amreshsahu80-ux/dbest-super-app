-- DBest Hotel: separate project ONLY; migration has deliberately not been applied.
-- Do not run on the existing dbest4u.com Supabase project.
-- Apply only after a new isolated hotel-bookings project is approved and verified.
create extension if not exists pgcrypto;
create table if not exists public.hotel_booking_requests (
 id uuid primary key default gen_random_uuid(),
 client_request_id uuid not null unique,
 hotel_id text not null check (char_length(hotel_id) between 3 and 135),
 hotel_name text not null check (char_length(hotel_name) between 2 and 180),
 check_in date not null,
 check_out date not null,
 adults integer not null check (adults between 1 and 24),
 rooms integer not null check (rooms between 1 and 8),
 guest_name text not null check (char_length(guest_name) between 2 and 110),
 guest_email text not null check (guest_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 guest_phone text not null check (char_length(guest_phone) between 7 and 25),
 requested_room text,
 status text not null default 'REQUESTED' check (status in
  ('REQUESTED','QUOTED','HOTEL_CONFIRMED','PAYMENT_PENDING',
   'PAID','VOUCHER_ISSUED','COMPLETED','CANCELLED')),
 room_confirmed text,
 meal_plan text,
 cancellation_terms text,
 quote_total_paise bigint check (quote_total_paise is null or quote_total_paise > 0),
 quote_tax_inclusive boolean not null default false,
 quote_currency char(3) not null default 'INR' check (quote_currency='INR'),
 quote_expires_at timestamptz,
 hotel_confirmation_reference text,
 hotel_inventory_confirmed_at timestamptz,
 payment_provider text,
 payment_order_id text unique,
 payment_id text unique,
 voucher_reference text unique,
 notes_owner text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint hotel_booking_dates check (check_out > check_in and check_out <= check_in + 30),
 constraint hotel_quote_complete check (status='REQUESTED' or status='CANCELLED'
  or (quote_total_paise is not null and quote_tax_inclusive=true
   and room_confirmed is not null and meal_plan is not null
   and cancellation_terms is not null)),
 constraint hotel_confirmation_gate check (
  status not in ('HOTEL_CONFIRMED','PAYMENT_PENDING','PAID','VOUCHER_ISSUED','COMPLETED')
  or (hotel_confirmation_reference is not null and hotel_inventory_confirmed_at is not null)),
 constraint hotel_payment_gate check (
  status not in ('PAYMENT_PENDING','PAID','VOUCHER_ISSUED','COMPLETED') or payment_order_id is not null),
 constraint hotel_paid_gate check (
  status not in ('PAID','VOUCHER_ISSUED','COMPLETED') or payment_id is not null),
 constraint hotel_voucher_gate check (
  status not in ('VOUCHER_ISSUED','COMPLETED') or voucher_reference is not null)
);
-- DBest internally manages room availability. The allocation is bound to an
-- individual booking and cannot be supplied directly by the customer.
-- The Owner must authenticate on the server before approving or releasing it.
create table if not exists public.hotel_booking_internal_allocations (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null unique references public.hotel_booking_requests(id),
 owner_user_id uuid not null,
 owner_verification_reference text not null unique,
 hotel_id text not null,
 room_confirmed text not null,
 check_in date not null,
 check_out date not null,
 adults integer not null check (adults between 1 and 24),
 rooms integer not null check (rooms between 1 and 8),
 owner_approved boolean not null default false,
 allocation_expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 constraint allocation_valid_stay check(check_out>check_in)
);
create index if not exists hotel_internal_allocations_hotel_stay_idx
 on public.hotel_booking_internal_allocations(hotel_id,check_in,check_out);
alter table public.hotel_booking_internal_allocations enable row level security;
revoke all on public.hotel_booking_internal_allocations from anon,authenticated,public;
grant select,insert,update on public.hotel_booking_internal_allocations to service_role;
-- The server must atomically reserve inventory and verify owner approval,
-- matching booking/room/guest/stay, valid expiry and tax-inclusive total
-- BEFORE creating any merchant payment order. Browser claims never suffice.

create table if not exists public.hotel_booking_audit_events (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.hotel_booking_requests(id),
 actor_role text not null check (actor_role in ('CUSTOMER','OWNER','HOTEL','PAYMENT_PROVIDER','SYSTEM')),
 event_type text not null check (char_length(event_type) between 3 and 80),
 previous_status text,
 next_status text,
 event_fingerprint text unique,
 occurred_at timestamptz not null default now()
);
create table if not exists public.hotel_booking_gateway_events (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.hotel_booking_requests(id),
 provider text not null,
 event_id text not null,
 verified_signature boolean not null check (verified_signature=true),
 amount_paise bigint not null check (amount_paise>0),
 currency char(3) not null check (currency='INR'),
 received_at timestamptz not null default now(),
 unique(provider,event_id)
);
create index if not exists hotel_booking_pending_idx
 on public.hotel_booking_requests(status,created_at desc);
create index if not exists hotel_booking_dates_idx
 on public.hotel_booking_requests(hotel_id,check_in,check_out);
create index if not exists hotel_booking_audit_idx
 on public.hotel_booking_audit_events(booking_id,occurred_at);
-- Fail closed: no browser/anonymous SELECT/INSERT/UPDATE/DELETE, even by signed-in guests.
alter table public.hotel_booking_requests enable row level security;
alter table public.hotel_booking_audit_events enable row level security;
alter table public.hotel_booking_gateway_events enable row level security;
revoke all on public.hotel_booking_requests from anon, authenticated, public;
revoke all on public.hotel_booking_audit_events from anon, authenticated, public;
revoke all on public.hotel_booking_gateway_events from anon, authenticated, public;
-- Only server-side service role uses the tables through isolated credentials.
grant select,insert,update on public.hotel_booking_requests to service_role;
grant select,insert on public.hotel_booking_audit_events to service_role;
grant select,insert on public.hotel_booking_gateway_events to service_role;
-- Required application gates: authenticated Owner verification; server-side supplier
-- confirmation; verified gateway webhook/order/amount; idempotent transaction.
-- No raw payment card data, Aadhaar, PAN or supplier net rates in these tables.
