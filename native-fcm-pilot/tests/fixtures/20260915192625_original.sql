-- Historical recorded migration; disposable PostgreSQL QA only.
create table if not exists public.marketplace_delivery_pins_live (
  order_id text primary key references public.marketplace_orders_live(id) on delete cascade,
  pickup_pin text not null,
  delivery_pin text not null,
  pickup_verified_at timestamptz,
  delivery_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pickup_pin_four_digits check (pickup_pin ~ '^[0-9]{4}$'),
  constraint delivery_pin_four_digits check (delivery_pin ~ '^[0-9]{4}$')
);

insert into public.marketplace_delivery_pins_live(order_id,pickup_pin,delivery_pin,pickup_verified_at,delivery_verified_at)
select id,
       coalesce(nullif(pickup_pin,''), lpad((floor(random()*9000)+1000)::int::text,4,'0')),
       coalesce(nullif(delivery_pin,''), lpad((floor(random()*9000)+1000)::int::text,4,'0')),
       pickup_pin_verified_at,
       delivery_pin_verified_at
from public.marketplace_orders_live
where vaahak_job_id is not null
on conflict(order_id) do nothing;

create or replace function public.dbest_marketplace_ensure_delivery_pins()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare p text; d text;
begin
  if new.vaahak_job_id is not null then
    p := lpad((floor(random()*9000)+1000)::int::text,4,'0');
    loop
      d := lpad((floor(random()*9000)+1000)::int::text,4,'0');
      exit when d <> p;
    end loop;
    insert into public.marketplace_delivery_pins_live(order_id,pickup_pin,delivery_pin)
    values(new.id,p,d)
    on conflict(order_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dbest_marketplace_ensure_delivery_pins on public.marketplace_orders_live;
create trigger trg_dbest_marketplace_ensure_delivery_pins
after insert or update of vaahak_job_id on public.marketplace_orders_live
for each row execute function public.dbest_marketplace_ensure_delivery_pins();

create or replace function public.dbest_marketplace_delivery_pin_guard()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare oid text; pv timestamptz; dv timestamptz;
begin
  if new.kind <> 'delivery' then return new; end if;
  if new.status is not distinct from old.status then return new; end if;
  select id into oid from public.marketplace_orders_live where vaahak_job_id=new.id limit 1;
  if oid is null then return new; end if;
  select pickup_verified_at,delivery_verified_at into pv,dv from public.marketplace_delivery_pins_live where order_id=oid;
  if old.status='Accepted' and new.status='Trip Started' and pv is null then
    raise exception 'pickup_pin_verification_required' using errcode='P0001';
  end if;
  if old.status='Trip Started' and new.status='Completed' and dv is null then
    raise exception 'delivery_pin_verification_required' using errcode='P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dbest_marketplace_delivery_pin_guard on public.vaahak_jobs_live;
create trigger trg_dbest_marketplace_delivery_pin_guard
before update of status on public.vaahak_jobs_live
for each row execute function public.dbest_marketplace_delivery_pin_guard();

alter table public.marketplace_orders_live
  drop column if exists pickup_pin,
  drop column if exists delivery_pin,
  drop column if exists pickup_pin_verified_at,
  drop column if exists delivery_pin_verified_at;
