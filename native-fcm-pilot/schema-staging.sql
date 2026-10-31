-- ISOLATED DESIGN ARTIFACT - NOT APPLIED TO ANY DATABASE.
-- Review + apply only to a verified non-production Supabase branch first.
-- App authentication is through DBest's hashed, expiring application sessions.
-- Never expose registration tokens or this queue to anon/authenticated API roles.
begin;
create table if not exists public.native_fcm_devices (
  id uuid primary key default gen_random_uuid(),
  recipient_type text not null check (recipient_type in ('Member','Vendor','Vaahak','Service Partner')),
  recipient_id text not null,
  installation_id uuid not null,
  app_id text not null check (app_id in ('com.dbest4u.app','com.dbest4u.partner','com.dbest4u.app.test')),
  fcm_token text not null check (length(fcm_token) between 40 and 4096),
  token_hash text not null check (length(token_hash)=64),
  enabled boolean not null default true,
  permission_status text not null default 'granted' check (permission_status in ('granted','revoked','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (app_id, installation_id),
  unique (token_hash)
);
create index if not exists native_fcm_devices_by_recipient_idx
  on public.native_fcm_devices(recipient_type,recipient_id) where enabled=true;

create table if not exists public.native_fcm_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null,
  recipient_type text not null check (recipient_type in ('Member','Vendor','Vaahak','Service Partner')),
  recipient_id text not null,
  category text not null check (category in ('order','ride','job','payment','transactional')),
  title text not null check (length(title) between 1 and 160),
  body text not null check (length(body) between 1 and 500),
  target_url text not null default '/',
  state text not null default 'pending' check (state in ('pending','processing','sent','skipped','dead')),
  attempts integer not null default 0 check(attempts between 0 and 10),
  next_attempt_at timestamptz not null default now(),
  error_code text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists native_fcm_outbox_queue_idx
  on public.native_fcm_outbox(next_attempt_at,created_at) where state='pending';

create table if not exists public.native_fcm_deliveries (
  id uuid primary key default gen_random_uuid(),
  outbox_id uuid not null references public.native_fcm_outbox(id) on delete cascade,
  device_id uuid not null references public.native_fcm_devices(id) on delete cascade,
  state text not null check(state in ('sent','failed','invalid')),
  provider_message_id text,
  error_code text,
  attempted_at timestamptz not null default now(),
  unique (outbox_id, device_id)
);

alter table public.native_fcm_devices enable row level security;
alter table public.native_fcm_outbox enable row level security;
alter table public.native_fcm_deliveries enable row level security;
-- No permissive policies. Only trusted server service-role may access.
revoke all on public.native_fcm_devices from public, anon, authenticated;
revoke all on public.native_fcm_outbox from public, anon, authenticated;
revoke all on public.native_fcm_deliveries from public, anon, authenticated;
commit;
