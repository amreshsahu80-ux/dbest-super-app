-- Historical schema migration fixture. Run only in disposable PostgreSQL CI. 
create or replace function public.dbest_marketplace_ensure_delivery_pins()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.vaahak_job_id is not null then
    if new.pickup_pin is null or new.pickup_pin !~ '^[0-9]{4}$' then
      new.pickup_pin := lpad((floor(random()*9000)+1000)::int::text,4,'0');
    end if;
    if new.delivery_pin is null or new.delivery_pin !~ '^[0-9]{4}$' then
      loop
        new.delivery_pin := lpad((floor(random()*9000)+1000)::int::text,4,'0');
        exit when new.delivery_pin <> new.pickup_pin;
      end loop;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dbest_marketplace_ensure_delivery_pins on public.marketplace_orders_live;
create trigger trg_dbest_marketplace_ensure_delivery_pins
before insert or update of vaahak_job_id on public.marketplace_orders_live
for each row execute function public.dbest_marketplace_ensure_delivery_pins();

create or replace function public.dbest_marketplace_delivery_pin_guard()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  mo public.marketplace_orders_live%rowtype;
begin
  if new.kind <> 'delivery' then return new; end if;
  if new.status is not distinct from old.status then return new; end if;

  select * into mo from public.marketplace_orders_live where vaahak_job_id = new.id limit 1;
  if not found then return new; end if;

  if old.status='Accepted' and new.status='Trip Started' and mo.pickup_pin_verified_at is null then
    raise exception 'pickup_pin_verification_required' using errcode='P0001';
  end if;
  if old.status='Trip Started' and new.status='Completed' and mo.delivery_pin_verified_at is null then
    raise exception 'delivery_pin_verification_required' using errcode='P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dbest_marketplace_delivery_pin_guard on public.vaahak_jobs_live;
create trigger trg_dbest_marketplace_delivery_pin_guard
before update of status on public.vaahak_jobs_live
for each row execute function public.dbest_marketplace_delivery_pin_guard();
