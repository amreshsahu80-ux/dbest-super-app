-- DBest native FCM pilot, PREVIEW ONLY.
-- Do not apply to production without review and explicit release gating.
-- Web Push tables and all Cab/Marketplace/wallet tables remain unchanged.

create table if not exists public.dbest_native_fcm_devices (
  id uuid primary key default gen_random_uuid(),
  app_package text not null check (app_package in ('com.dbest4u.app','com.dbest4u.partner')),
  recipient_type text not null check (recipient_type in ('Member','Vendor','Vaahak','Service Partner')),
  recipient_id text not null,
  token text not null,
  token_hash text not null,
  enabled boolean not null default false,
  platform text not null default 'Android',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dbest_native_fcm_devices_unique_instance unique (app_package,token_hash),
  constraint dbest_native_fcm_identity_mapping check (
    (app_package='com.dbest4u.app' and recipient_type='Member') or
    (app_package='com.dbest4u.partner' and recipient_type in ('Vendor','Vaahak','Service Partner'))
  )
);

-- Only server-side service role access; client reads/writes go through
-- an Edge Function that authenticates DBest session tokens on every request.
alter table public.dbest_native_fcm_devices enable row level security;
revoke all on table public.dbest_native_fcm_devices from anon, authenticated;
create index if not exists dbest_native_fcm_active_recipient_idx
  on public.dbest_native_fcm_devices(recipient_type, recipient_id, app_package)
  where enabled=true;
create index if not exists dbest_native_fcm_last_seen_idx
  on public.dbest_native_fcm_devices(last_seen_at);
