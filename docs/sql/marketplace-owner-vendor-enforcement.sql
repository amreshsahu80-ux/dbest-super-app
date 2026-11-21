-- Isolated proposed transactional vendor enforcement. Review before applying to production.
create table if not exists public.dbest_vendor_enforcement_audit (
 id uuid primary key default gen_random_uuid(),
 vendor_id text not null references public.marketplace_vendors_live(id),
 actor_admin_id text not null,
 action text not null check (action in ('suspend','reinstate','terminate')),
 reason text not null default '',
 previous_active boolean,
 previous_operational_hold boolean,
 created_at timestamptz not null default now()
);
alter table public.dbest_vendor_enforcement_audit enable row level security;
revoke all on public.dbest_vendor_enforcement_audit from anon,authenticated;
grant select,insert on public.dbest_vendor_enforcement_audit to service_role;
-- No deletion of vendor/order data. Termination is irreversible via this API.
create schema if not exists dbest_internal;
revoke all on schema dbest_internal from public,anon,authenticated;
grant usage on schema dbest_internal to service_role;
create or replace function dbest_internal.dbest_enforce_vendor(
 p_token_hash text,p_vendor_id text,p_action text,p_reason text
) returns jsonb language plpgsql security definer
set search_path = ''
as $$
declare v_admin text; v_vendor public.marketplace_vendors_live%rowtype;
begin
 select admin_id into v_admin from public.super_admin_sessions
 where token_hash=p_token_hash and expires_at>now() limit 1;
 if v_admin is null then raise exception 'invalid_owner_session'; end if;
 if p_action not in ('suspend','reinstate','terminate') then raise exception 'invalid_vendor_action'; end if;
 if p_action <> 'reinstate' and length(trim(coalesce(p_reason,'')))<10 then raise exception 'reason_required'; end if;
 select * into v_vendor from public.marketplace_vendors_live where id=p_vendor_id for update;
 if not found then raise exception 'vendor_not_found'; end if;
 if p_action='reinstate' and v_vendor.active=false then raise exception 'inactive_vendor_cannot_reinstate'; end if;
 if p_action='suspend' then
  update public.marketplace_vendors_live set operational_hold=true,
   operational_hold_reason=p_reason,operational_hold_at=now(),updated_at=now() where id=p_vendor_id;
 elsif p_action='reinstate' then
  update public.marketplace_vendors_live set operational_hold=false,
   operational_hold_reason=null,operational_hold_at=null,updated_at=now() where id=p_vendor_id;
 else
  update public.marketplace_vendors_live set active=false,operational_hold=true,
   operational_hold_reason=p_reason,operational_hold_at=now(),updated_at=now() where id=p_vendor_id;
 end if;
 insert into public.dbest_vendor_enforcement_audit
 (vendor_id,actor_admin_id,action,reason,previous_active,previous_operational_hold)
 values(p_vendor_id,v_admin,p_action,coalesce(p_reason,''),v_vendor.active,v_vendor.operational_hold);
 return jsonb_build_object('ok',true,'vendorId',p_vendor_id,'action',p_action);
end $$;
revoke all on function dbest_internal.dbest_enforce_vendor(text,text,text,text) from public,anon,authenticated;
grant execute on function dbest_internal.dbest_enforce_vendor(text,text,text,text) to service_role;
