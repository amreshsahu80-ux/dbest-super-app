-- STAGING ONLY. DO NOT RUN AGAINST LIVE DBest WITHOUT ISOLATED QA + OWNER APPROVAL.
-- Single-active-installation pilot for Vaahak native ride notifications.
-- The authorized installation pointer contains no FCM token or session token.
begin;
create table if not exists public.native_fcm_vaahak_active_installations (
  recipient_id text primary key,
  app_id text not null default 'com.dbest4u.partner' check (app_id='com.dbest4u.partner'),
  installation_id uuid not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.native_fcm_vaahak_active_installations enable row level security;
revoke all on public.native_fcm_vaahak_active_installations from public, anon, authenticated;
grant select, insert, update, delete on public.native_fcm_vaahak_active_installations to service_role;
-- No user-facing SELECT/UPDATE RLS policy. Only the server-side service role
-- may read or change the Vaahak pilot binding.
commit;
