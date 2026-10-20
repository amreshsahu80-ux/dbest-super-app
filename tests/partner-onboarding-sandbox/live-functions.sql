-- EXACT LIVE FUNCTION DEFINITIONS. Retrieved from production as read-only for disposable CI PostgreSQL.
-- Test fixture: NEVER replay directly on production. No tokens, payments, PII or production records included.

-- source: public.dbest_credit_leader_partner_onboarding_incentive
CREATE OR REPLACE FUNCTION public.dbest_credit_leader_partner_onboarding_incentive(p_partner_type text, p_partner_id text, p_leader_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_launch public.leader_partner_onboarding_launches%rowtype;
  v_member record;
  v_amount numeric(12,2);
  v_key text;
  v_ledger_id bigint;
  v_cutoff timestamptz:='2026-10-31 23:59:59+05:30'::timestamptz;
begin
  select * into v_launch
  from public.leader_partner_onboarding_launches
  where partner_type=p_partner_type
    and partner_id=p_partner_id
    and leader_id=p_leader_id
    and status in ('Claimed','Credited')
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok',false,'reason','leader_attribution_not_found');
  end if;

  if v_launch.status='Credited' then
    return jsonb_build_object('ok',true,'alreadyCredited',true,'amount',v_launch.incentive_amount);
  end if;

  if now()>v_cutoff then
    update public.leader_partner_onboarding_launches
    set status='Expired',incentive_amount=0,updated_at=now()
    where id=v_launch.id;
    return jsonb_build_object('ok',false,'reason','promotion_expired','cutoff','2026-10-31T23:59:59+05:30');
  end if;

  select external_id,name,category,status into v_member
  from public.onboarding_records
  where kind='member'
    and external_id=p_leader_id
    and deleted_at is null
  limit 1;

  if not found or lower(coalesce(v_member.category,''))<>'leader' or lower(coalesce(v_member.status,''))<>'active' then
    return jsonb_build_object('ok',false,'reason','leader_not_active');
  end if;

  v_amount:=case p_partner_type
    when 'Vendor' then 300
    when 'Vaahak' then 200
    when 'Service Partner' then 100
    else 0 end;

  if v_amount<=0 then
    return jsonb_build_object('ok',false,'reason','invalid_incentive_amount');
  end if;

  update public.leader_partner_onboarding_launches
  set incentive_amount=v_amount,updated_at=now()
  where id=v_launch.id;

  v_key:='leader-partner-onboarding|'||lower(replace(p_partner_type,' ','_'))||'|'||p_partner_id||'|'||p_leader_id;

  insert into public.member_wallet_accounts(member_id)
  values(p_leader_id)
  on conflict(member_id) do nothing;

  insert into public.member_wallet_ledger(
    member_id,entry_type,balance_bucket,amount_signed,idempotency_key,
    source_transaction_id,reference,metadata
  ) values (
    p_leader_id,'Earning Credit','available',v_amount,v_key,
    'LPO-'||p_partner_id,
    'Leader Partner Onboarding Incentive • '||p_partner_type||' • ₹'||trim(to_char(v_amount,'FM999999990.00')),
    jsonb_build_object(
      'service_key','leader_partner_onboarding',
      'source_event','leader_partner_onboarding_activation',
      'partner_type',p_partner_type,
      'partner_id',p_partner_id,
      'leader_id',p_leader_id,
      'level',0,
      'fixed_incentive',true,
      'promotion_end','2026-10-31T23:59:59+05:30'
    )
  )
  on conflict(idempotency_key) do nothing
  returning id into v_ledger_id;

  if v_ledger_id is not null then
    update public.member_wallet_accounts
    set available_balance=available_balance+v_amount,
        lifetime_earned=lifetime_earned+v_amount,
        updated_at=now()
    where member_id=p_leader_id;

    update public.leader_partner_onboarding_launches
    set status='Credited',credited_at=now(),incentive_amount=v_amount,updated_at=now()
    where id=v_launch.id;

    return jsonb_build_object('ok',true,'credited',true,'amount',v_amount,'ledgerId',v_ledger_id);
  end if;

  update public.leader_partner_onboarding_launches
  set status='Credited',credited_at=coalesce(credited_at,now()),incentive_amount=v_amount,updated_at=now()
  where id=v_launch.id;

  return jsonb_build_object('ok',true,'alreadyCredited',true,'amount',v_amount);
end;
$function$
;

-- source: public.dbest_guard_single_partner_onboarding_source
CREATE OR REPLACE FUNCTION public.dbest_guard_single_partner_onboarding_source()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if coalesce(trim(new.onboarding_admin_id),'')<>'' and coalesce(trim(new.onboarding_leader_id),'')<>'' then
    raise exception 'partner_onboarding_source_conflict';
  end if;
  return new;
end;
$function$
;

-- source: public.dbest_leader_partner_onboarding_trigger
CREATE OR REPLACE FUNCTION public.dbest_leader_partner_onboarding_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  ptype text:=TG_ARGV[0];
  pid text;
  lid text;
  eligible boolean:=false;
begin
  if ptype='Vendor' then
    pid:=new.id; lid:=new.onboarding_leader_id;
    eligible:=coalesce(new.active,false)=true
      and coalesce(new.owner_approval,'')='Approved'
      and coalesce(new.agreement_status,'')='Fully Signed';
  elsif ptype='Vaahak' then
    pid:=new.id; lid:=new.onboarding_leader_id;
    eligible:=coalesce(new.owner_approval,'')='Approved'
      and coalesce(new.agreement_status,'')='Fully Signed';
  else
    pid:=coalesce(new.service_partner_id,new.member_id); lid:=new.onboarding_leader_id;
    eligible:=coalesce(new.active,false)=true
      and coalesce(new.approval_status,'')='Approved';
  end if;

  if eligible and coalesce(trim(lid),'')<>'' and coalesce(trim(pid),'')<>'' then
    perform public.dbest_credit_leader_partner_onboarding_incentive(ptype,pid,lid);
  end if;
  return new;
end;
$function$
;
