-- Historical schema migration fixture. Run only in disposable PostgreSQL CI. 
alter table public.marketplace_orders_live
  add column if not exists pickup_pin text,
  add column if not exists delivery_pin text,
  add column if not exists pickup_pin_verified_at timestamptz,
  add column if not exists delivery_pin_verified_at timestamptz;

create index if not exists marketplace_orders_live_vaahak_job_idx on public.marketplace_orders_live(vaahak_job_id);
