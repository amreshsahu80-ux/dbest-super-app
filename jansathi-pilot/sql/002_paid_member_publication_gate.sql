-- JanSathi access policy: anonymous read, paid verified news, limited verified free civic.
-- APPLY ONLY TO PROJECT zgjkzqfabbvctcjspvfd (DBest JanSathi Pilot Free).
-- The existing DBest Pro project must never receive this migration.
-- This migration deliberately DOES NOT invent or trust DBest membership status from the browser.
-- The separate Pro-org membership synchronization has NOT been implemented.
-- Entitlements can be written only by a future trusted backend with admin-level privileges.

create table public.jansathi_member_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dbest_member_id text not null unique check(char_length(btrim(dbest_member_id)) between 3 and 100),
  tier text not null check(tier in ('starter','guest','promoter','prime','leader')),
  membership_status text not null check(membership_status in ('pending','active','expired','suspended')),
  kyc_verified boolean not null default false,
  source text not null default 'dbest_server_sync' check(source='dbest_server_sync'),
  source_verified_at timestamptz not null,
  membership_expires_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.jansathi_member_entitlements is
 'READ-only to member clients. Records MUST originate from verified DBest membership/KYC server sync; the client never supplies tier, status or verification.';
create index jansathi_entitlement_tier_idx on public.jansathi_member_entitlements(tier,membership_status);
alter table public.jansathi_member_entitlements enable row level security;
revoke all on public.jansathi_member_entitlements from anon, authenticated;
grant select on public.jansathi_member_entitlements to authenticated;
create policy "Read own DBest membership entitlement" on public.jansathi_member_entitlements
for select to authenticated using(user_id=(select auth.uid()));

-- Internal authorization functions can securely consult the protected auth.users
-- and member entitlement tables without opening up auth.users to the Data API.
-- They are in jansathi_internal (not an exposed API schema).
create or replace function jansathi_internal.is_citizen_verified()
returns boolean
language sql stable security definer
set search_path=pg_catalog
as $$
  select exists (
   select 1 from auth.users u where u.id=auth.uid()
   and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
   and u.deleted_at is null
   and (u.banned_until is null or u.banned_until <= now())
  );
$$;
create or replace function jansathi_internal.has_verified_paid_membership()
returns boolean
language sql stable security definer
set search_path=pg_catalog
as $$
  select exists(
   select 1
   from public.jansathi_member_entitlements e
   join auth.users u on u.id=e.user_id
   where e.user_id=auth.uid()
     and u.deleted_at is null
     and (u.banned_until is null or u.banned_until <= now())
     and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
     and e.tier in ('promoter','prime','leader')
     and e.membership_status='active'
     and e.kyc_verified=true
     and e.source='dbest_server_sync'
     and e.source_verified_at >= now()-interval '24 hours'
     and (e.membership_expires_at is null or e.membership_expires_at>now())
  );
$$;

-- Never use user_metadata or arbitrary client-provided membership claims.
-- Newly created free/Guest users may submit civic reports only after verification.
drop policy if exists "Insert own civic submission" on public.jansathi_civic_reports;
create policy "Verified citizens submit civic reports" on public.jansathi_civic_reports
for insert to authenticated with check (
 user_id=(select auth.uid())
 and status='dbest_received'
 and (select jansathi_internal.is_citizen_verified())
);

-- Only trusted active Promoter/Prime/Leader entitlements can publish news.
-- This intentionally fails closed until the secure DBest-to-JanSathi sync exists.
drop policy if exists "Insert own news" on public.jansathi_news_submissions;
create policy "Verified paid members can submit news" on public.jansathi_news_submissions
for insert to authenticated with check (
 author_id=(select auth.uid())
 and (select jansathi_internal.has_verified_paid_membership())
);

-- Limits are enforced transactionally, not in the browser.
-- Verified unpaid / Guest: 2 civic reports over any rolling seven-day window.
-- Eligible ₹299+ members: 5 civic reports in a rolling 24h window.
-- A transaction-scoped advisory lock serializes requests by the same user.
create or replace function jansathi_internal.enforce_civic_quota()
returns trigger
language plpgsql security definer
set search_path=pg_catalog
as $$
declare
 max_allowed integer;
 window_start timestamptz;
 recent_reports integer;
 user_claim uuid;
begin
 user_claim:=auth.uid();
 if user_claim is null or new.user_id is distinct from user_claim
    or not jansathi_internal.is_citizen_verified()
 then
   raise exception 'Verified JanSathi account required to submit a civic issue'
     using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(user_claim::text, 7293341));
 if jansathi_internal.has_verified_paid_membership() then
   max_allowed:=5;
   window_start:=now()-interval '24 hours';
 else
   max_allowed:=2;
   window_start:=now()-interval '7 days';
 end if;
 select count(*) into recent_reports
 from public.jansathi_civic_reports
 where user_id=user_claim and created_at>=window_start;
 if recent_reports>=max_allowed then
    raise exception 'JanSathi civic report limit reached: % reports per rolling window',max_allowed
      using errcode='P0001';
 end if;
 return new;
end $$;
drop trigger if exists jansathi_civic_quota on public.jansathi_civic_reports;
create trigger jansathi_civic_quota
before insert on public.jansathi_civic_reports
for each row execute function jansathi_internal.enforce_civic_quota();

-- Ensure callers cannot directly call internal privileged helpers from an exposed schema.
revoke all on function jansathi_internal.is_citizen_verified() from public,anon,authenticated;
revoke all on function jansathi_internal.has_verified_paid_membership() from public,anon,authenticated;
revoke all on function jansathi_internal.enforce_civic_quota() from public,anon,authenticated;
grant usage on schema jansathi_internal to authenticated;
grant execute on function jansathi_internal.is_citizen_verified() to authenticated;
grant execute on function jansathi_internal.has_verified_paid_membership() to authenticated;

-- Audit aid: the RLS table is intentionally read-only to user JWTs.
comment on policy "Verified paid members can submit news" on public.jansathi_news_submissions is
 'Server-verified active Promoter/Prime/Leader membership (₹299+) and completed KYC required.';

-- Public read rules remain unchanged: anyone may read moderated public feeds.
