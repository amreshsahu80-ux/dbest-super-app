-- Original migration snapshot from recorded history. Only disposable PostgreSQL CI.
create or replace function private.dbest_accrue_vaahak_active_day_fee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vehicle text;
  v_class text;
  v_cfg jsonb;
  v_fee numeric(10,2);
  v_day date;
begin
  -- Daily platform fee remains for Cab rides only.
  -- Marketplace delivery economics are fully settled by the 50% Vaahak / 50% DBest delivery-charge split.
  if new.status='Completed'
     and old.status is distinct from 'Completed'
     and new.assigned_partner_id is not null
     and new.kind='ride' then
    select vehicle into v_vehicle from public.vaahak_partners_live where id=new.assigned_partner_id;
    select value into v_cfg from public.app_settings where key='vaahak_economy_model_v1';
    if coalesce((v_cfg->>'noJobNoFee')::boolean,true) then
      v_class := private.dbest_vaahak_vehicle_class(v_vehicle);
      v_fee := private.dbest_vaahak_effective_daily_fee(new.assigned_partner_id);
      v_day := (coalesce(new.completed_at,now()) at time zone 'Asia/Kolkata')::date;
      insert into public.vaahak_platform_fee_ledger_live(
        partner_id,fee_date,vehicle_class,fee_amount,source_job_id,source_kind,status
      ) values(
        new.assigned_partner_id,v_day,v_class,greatest(v_fee,0),new.id,'ride','Accrued'
      ) on conflict(partner_id,fee_date,source_kind) do nothing;
    end if;
  end if;
  return new;
end
$$;

-- Reverse any previously charged Marketplace delivery platform fee without deleting audit history.
do $$
declare r record;
begin
  for r in
    select f.id,f.partner_id,f.fee_amount,f.source_job_id
    from public.vaahak_platform_fee_ledger_live f
    where f.source_kind='delivery' and coalesce(f.status,'')<>'Reversed'
  loop
    if not exists (
      select 1 from public.vaahak_wallet_transactions_live t
      where t.partner_id=r.partner_id
        and t.tx_type='Adjustment'
        and t.reference='MKT-FEE-REV-'||r.id::text
    ) then
      insert into public.vaahak_wallet_transactions_live(
        partner_id,tx_type,amount_signed,reference,metadata,created_at
      ) values(
        r.partner_id,'Adjustment',greatest(r.fee_amount,0),'MKT-FEE-REV-'||r.id::text,
        jsonb_build_object('reason','Marketplace delivery uses 50/50 delivery-charge split; extra platform fee reversed','sourceFeeId',r.id,'sourceJobId',r.source_job_id),now()
      );
      update public.vaahak_wallet_accounts_live
      set balance=coalesce(balance,0)+greatest(r.fee_amount,0),updated_at=now()
      where partner_id=r.partner_id;
    end if;
    update public.vaahak_platform_fee_ledger_live set status='Reversed' where id=r.id;
  end loop;
end $$;
