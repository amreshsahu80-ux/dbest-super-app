-- Original recorded migration; disposable Postgres CI only. Never production.
alter table public.marketplace_vendors_live
  add column if not exists dbest_margin_percent numeric;

alter table public.marketplace_vendor_settlements_live
  add column if not exists product_subtotal numeric,
  add column if not exists delivery_charge numeric,
  add column if not exists dbest_margin_percent numeric,
  add column if not exists dbest_margin_amount numeric;

alter table public.marketplace_vendors_live
  drop constraint if exists marketplace_vendors_live_dbest_margin_percent_check;
alter table public.marketplace_vendors_live
  add constraint marketplace_vendors_live_dbest_margin_percent_check
  check (dbest_margin_percent is null or (dbest_margin_percent >= 0 and dbest_margin_percent <= 100));

insert into public.app_settings(key,value,updated_at)
values(
  'vaahak_marketplace_delivery_rate',
  '{"mode":"percentage_of_actual_delivery_charge","vaahak_share_percent":50,"dbest_share_percent":50,"settlement":"Weekly"}'::jsonb,
  now()
)
on conflict(key) do update set value=excluded.value,updated_at=excluded.updated_at;

insert into public.app_settings(key,value,updated_at)
values(
  'marketplace_vendor_commission_rules',
  '{"mode":"agreed_margin","priority":["vendor_override","category_rule"],"grocery":null,"restaurant":null,"medicine":null,"digital":null,"other":null}'::jsonb,
  now()
)
on conflict(key) do nothing;

create or replace function public.dbest_marketplace_job_economics_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order_id text;
  v_delivery numeric := 0;
  v_vaahak numeric := 0;
  v_dbest numeric := 0;
begin
  if new.kind <> 'delivery' then return new; end if;
  v_order_id := nullif(trim(coalesce(new.order_meta->>'marketplaceOrderId','')),'');
  if v_order_id is null then return new; end if;

  select greatest(0,coalesce(delivery_fee,0))
    into v_delivery
  from public.marketplace_orders_live
  where id=v_order_id;

  if not found then return new; end if;

  v_vaahak := round((v_delivery * 0.50)::numeric,2);
  v_dbest := round((v_delivery - v_vaahak)::numeric,2);
  new.partner_earning := v_vaahak;
  new.order_meta := coalesce(new.order_meta,'{}'::jsonb) || jsonb_build_object(
    'actualDeliveryCharge',v_delivery,
    'vaahakDeliveryEarning',v_vaahak,
    'dbestDeliveryShare',v_dbest,
    'deliveryEarningRule','50% Vaahak / 50% DBest'
  );
  return new;
end
$$;

drop trigger if exists trg_dbest_marketplace_job_economics on public.vaahak_jobs_live;
create trigger trg_dbest_marketplace_job_economics
before insert or update of kind,order_meta,partner_earning
on public.vaahak_jobs_live
for each row execute function public.dbest_marketplace_job_economics_guard();

create or replace function public.dbest_sync_vendor_settlement_for_order(p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  v record;
  v_rules jsonb := '{}'::jsonb;
  gross numeric := 0;
  delivery numeric := 0;
  base numeric := 0;
  margin_pct numeric := 0;
  margin_amt numeric := 0;
  net_amt numeric := 0;
  v_category text := 'other';
begin
  select id,vendor_id,order_value,delivery_fee,completed_at,payment_status,cancelled_at
    into o from public.marketplace_orders_live where id=p_order_id;
  if not found or o.completed_at is null or o.cancelled_at is not null then return; end if;
  if coalesce(o.payment_status,'') not in ('Prepaid','Received','Paid','Razorpay Verified','Legacy Completed') then return; end if;

  select id,type,profile_meta,dbest_margin_percent into v
    from public.marketplace_vendors_live where id=o.vendor_id;

  gross := greatest(0,coalesce(o.order_value,0));
  delivery := greatest(0,coalesce(o.delivery_fee,0));
  base := greatest(0,gross-delivery);
  v_category := lower(coalesce(nullif(v.type,''),'other'));
  if v_category not in ('grocery','restaurant','medicine','digital') then v_category := 'other'; end if;

  select coalesce(value,'{}'::jsonb) into v_rules
    from public.app_settings where key='marketplace_vendor_commission_rules';

  begin
    margin_pct := coalesce(
      v.dbest_margin_percent,
      nullif(v.profile_meta->>'agreedMarginPercent','')::numeric,
      nullif(v.profile_meta->>'marketplaceMarginPercent','')::numeric,
      nullif(v_rules->>v_category,'')::numeric,
      0
    );
  exception when others then
    margin_pct := 0;
  end;
  margin_pct := greatest(0,least(100,coalesce(margin_pct,0)));
  margin_amt := round((base*margin_pct/100.0)::numeric,2);
  net_amt := greatest(0,round((base-margin_amt)::numeric,2));

  insert into public.marketplace_vendor_settlements_live(
    vendor_id,order_id,gross_order_value,deductions,net_settlement,status,
    product_subtotal,delivery_charge,dbest_margin_percent,dbest_margin_amount
  ) values(
    o.vendor_id,o.id,gross,(delivery+margin_amt),net_amt,'Eligible',
    base,delivery,margin_pct,margin_amt
  )
  on conflict(order_id) do update set
    gross_order_value=excluded.gross_order_value,
    deductions=excluded.deductions,
    net_settlement=excluded.net_settlement,
    product_subtotal=excluded.product_subtotal,
    delivery_charge=excluded.delivery_charge,
    dbest_margin_percent=excluded.dbest_margin_percent,
    dbest_margin_amount=excluded.dbest_margin_amount,
    updated_at=now();
end
$$;

update public.vaahak_jobs_live j
set partner_earning = round((greatest(0,coalesce(o.delivery_fee,0))*0.50)::numeric,2),
    order_meta = coalesce(j.order_meta,'{}'::jsonb) || jsonb_build_object(
      'actualDeliveryCharge',greatest(0,coalesce(o.delivery_fee,0)),
      'vaahakDeliveryEarning',round((greatest(0,coalesce(o.delivery_fee,0))*0.50)::numeric,2),
      'dbestDeliveryShare',round((greatest(0,coalesce(o.delivery_fee,0))*0.50)::numeric,2),
      'deliveryEarningRule','50% Vaahak / 50% DBest'
    ),
    updated_at=now()
from public.marketplace_orders_live o
where j.kind='delivery'
  and nullif(trim(coalesce(j.order_meta->>'marketplaceOrderId','')),'')=o.id;

do $$
declare r record;
begin
  for r in select id from public.marketplace_orders_live
           where completed_at is not null and cancelled_at is null
             and coalesce(payment_status,'') in ('Prepaid','Received','Paid','Razorpay Verified','Legacy Completed')
  loop
    perform public.dbest_sync_vendor_settlement_for_order(r.id);
  end loop;
end $$;

revoke execute on function public.dbest_sync_vendor_settlement_for_order(text) from public, anon, authenticated;
grant execute on function public.dbest_sync_vendor_settlement_for_order(text) to service_role;
