-- JanSathi Free backend ONLY: zgjkzqfabbvctcjspvfd.
-- Guard cross-project member sync and record security-relevant changes.
-- No changes to DBest membership, login, payments, payouts, or production data.
-- This does NOT enable cross-project SSO; an authenticated trusted producer is still required.

create table jansathi_internal.member_entitlement_sync_audit (
  audit_id bigint generated always as identity primary key,
  jan_user_id uuid not null,
  dbest_member_id text not null,
  operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
  old_tier text,
  new_tier text,
  old_status text,
  new_status text,
  old_kyc_verified boolean,
  new_kyc_verified boolean,
  source_verified_at timestamptz,
  recorded_at timestamptz not null default now()
);

comment on table jansathi_internal.member_entitlement_sync_audit is
  'Private, append-only evidence of server-sync entitlement changes. Never includes name, email, KYC documents, home coordinates or session tokens.';

create index jansathi_member_sync_audit_user_time_idx
  on jansathi_internal.member_entitlement_sync_audit(jan_user_id,recorded_at desc);
alter table jansathi_internal.member_entitlement_sync_audit enable row level security;
revoke all on jansathi_internal.member_entitlement_sync_audit from public,anon,authenticated;
revoke all on sequence jansathi_internal.member_entitlement_sync_audit_audit_id_seq from public,anon,authenticated;

create function jansathi_internal.enforce_entitlement_sync_identity()
returns trigger language plpgsql security definer
set search_path=pg_catalog
as $fn$
begin
  if TG_OP='UPDATE' and
    (new.user_id is distinct from old.user_id or
     new.dbest_member_id is distinct from old.dbest_member_id) then
    raise exception 'DBest identity relinking is forbidden in an entitlement update'
      using errcode='23514';
  end if;
  -- Source must be verified now, never forged with a date far in the future
  -- or replayed with a stale timestamp. Authorization still consults source
  -- freshness on every protected operation.
  if new.source_verified_at < now()-interval '10 minutes' or
     new.source_verified_at > now()+interval '60 seconds' then
    raise exception 'DBest entitlement sync timestamp is stale or in the future'
      using errcode='23514';
  end if;
  if TG_OP='UPDATE' and new.source_verified_at < old.source_verified_at then
    raise exception 'DBest entitlement sync cannot move verification time backward'
      using errcode='23514';
  end if;
  new.updated_at:=now();
  return new;
end;
$fn$;

revoke all on function jansathi_internal.enforce_entitlement_sync_identity() from public,anon,authenticated;
create trigger jansathi_guard_member_entitlement_identity
  before insert or update on public.jansathi_member_entitlements
  for each row execute function jansathi_internal.enforce_entitlement_sync_identity();

create function jansathi_internal.audit_entitlement_sync()
returns trigger language plpgsql security definer
set search_path=pg_catalog
as $fn$
begin
  insert into jansathi_internal.member_entitlement_sync_audit
    (jan_user_id,dbest_member_id,operation,old_tier,new_tier,
     old_status,new_status,old_kyc_verified,new_kyc_verified,source_verified_at)
  values (
    case when TG_OP='DELETE' then old.user_id else new.user_id end,
    case when TG_OP='DELETE' then old.dbest_member_id else new.dbest_member_id end,
    TG_OP,
    case when TG_OP='INSERT' then null else old.tier end,
    case when TG_OP='DELETE' then null else new.tier end,
    case when TG_OP='INSERT' then null else old.membership_status end,
    case when TG_OP='DELETE' then null else new.membership_status end,
    case when TG_OP='INSERT' then null else old.kyc_verified end,
    case when TG_OP='DELETE' then null else new.kyc_verified end,
    case when TG_OP='DELETE' then old.source_verified_at else new.source_verified_at end
  );
  return null;
end;
$fn$;

revoke all on function jansathi_internal.audit_entitlement_sync() from public,anon,authenticated;
create trigger jansathi_audit_member_entitlement_sync
  after insert or update or delete on public.jansathi_member_entitlements
  for each row execute function jansathi_internal.audit_entitlement_sync();
