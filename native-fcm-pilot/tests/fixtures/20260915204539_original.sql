-- Historical recorded migration; disposable PostgreSQL QA only.
create or replace function public.dbest_normalize_marketplace_pay_at_delivery_status()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if lower(coalesce(new.payment_status,''))='prepaid'
     and (
       lower(coalesce(new.payment_method,'')) like '%pay online at delivery%'
       or lower(coalesce(new.payment_method,'')) like '%pay_at_delivery%'
       or lower(coalesce(new.payment_method,'')) like '%payment at delivery%'
     ) then
    new.payment_status := 'Pending';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dbest_normalize_marketplace_pad_order on public.marketplace_orders_live;
create trigger trg_dbest_normalize_marketplace_pad_order
before insert or update of payment_status,payment_method on public.marketplace_orders_live
for each row execute function public.dbest_normalize_marketplace_pay_at_delivery_status();

drop trigger if exists trg_dbest_normalize_marketplace_pad_job on public.vaahak_jobs_live;
create trigger trg_dbest_normalize_marketplace_pad_job
before insert or update of payment_status,payment_method on public.vaahak_jobs_live
for each row execute function public.dbest_normalize_marketplace_pay_at_delivery_status();
