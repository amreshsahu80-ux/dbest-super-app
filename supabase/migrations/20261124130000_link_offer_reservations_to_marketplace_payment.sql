alter table dbest_checkout_private.offer_orders
  add column if not exists razorpay_payment_id text;

create or replace function dbest_checkout_private.expire_unpaid()
returns integer
language plpgsql
security definer
set search_path to 'public','dbest_checkout_private'
as $function$
declare r record; n integer:=0;
begin
 for r in
   select * from dbest_checkout_private.offer_orders
   where status='reserved' and payment_status='unpaid' and expires_at<now()
   for update skip locked
 loop
  update public.dbest_vendor_product_offers o
     set stock=o.stock+r.qty,updated_at=now()
    from public.dbest_uploaded_master_product_links_isolated l
   where l.master_product_id=o.master_product_id
     and l.sku=r.sku and o.vendor_id=r.vendor_id;

  update dbest_checkout_private.offer_orders
     set status='expired'
   where id=r.id;

  update public.marketplace_master_orders_live m
     set payment_status='Expired',status='Payment Expired',updated_at=now()
   where m.payment_status in ('Pending','Unpaid')
     and exists (
       select 1
         from public.marketplace_orders_live c
         cross join lateral jsonb_array_elements(
           case when jsonb_typeof(c.items)='array' then c.items else '[]'::jsonb end
         ) item
        where c.master_order_id=m.id
          and item->>'reservationKey'=r.idempotency_key::text
     );

  update public.marketplace_orders_live c
     set payment_status='Expired',status='Payment Expired',updated_at=now()
   where exists (
       select 1
         from public.marketplace_orders_live x
         cross join lateral jsonb_array_elements(
           case when jsonb_typeof(x.items)='array' then x.items else '[]'::jsonb end
         ) item
        where x.master_order_id=c.master_order_id
          and item->>'reservationKey'=r.idempotency_key::text
     );

  update public.marketplace_delivery_groups_live d
     set status='Payment Expired',updated_at=now()
   where exists (
       select 1 from public.marketplace_orders_live c
        where c.master_order_id=d.master_order_id
          and c.payment_status='Expired'
   );

  n:=n+1;
 end loop;
 return n;
end
$function$;

create or replace function public.dBest_validate_checkout_offer_reservations(p_member text,p_keys uuid[])
returns boolean
language plpgsql
security definer
set search_path to 'public','dbest_checkout_private'
as $function$
declare expected integer; found_count integer;
begin
 if nullif(trim(p_member),'') is null then raise exception 'member_required'; end if;
 perform dbest_checkout_private.expire_unpaid();
 select count(distinct k) into expected from unnest(coalesce(p_keys,'{}'::uuid[])) as k;
 if expected=0 then return true; end if;
 select count(distinct o.idempotency_key) into found_count
   from dbest_checkout_private.offer_orders o
  where o.member_id=p_member and o.idempotency_key=any(p_keys)
    and ((o.status='reserved' and o.payment_status='unpaid' and o.expires_at>now())
         or (o.status='paid' and o.payment_status='paid'));
 if found_count<>expected then raise exception 'offer_reservation_expired_or_invalid'; end if;
 return true;
end
$function$;

create or replace function public.dBest_mark_checkout_offer_reservations_paid(p_member text,p_keys uuid[],p_payment_id text)
returns integer
language plpgsql
security definer
set search_path to 'public','dbest_checkout_private'
as $function$
declare expected integer; found_count integer; changed integer;
begin
 if nullif(trim(p_member),'') is null or nullif(trim(p_payment_id),'') is null then raise exception 'payment_reference_required'; end if;
 perform dbest_checkout_private.expire_unpaid();
 select count(distinct k) into expected from unnest(coalesce(p_keys,'{}'::uuid[])) as k;
 if expected=0 then return 0; end if;
 select count(distinct o.idempotency_key) into found_count
   from dbest_checkout_private.offer_orders o
  where o.member_id=p_member and o.idempotency_key=any(p_keys)
    and ((o.status='reserved' and o.payment_status='unpaid' and o.expires_at>now())
         or (o.status='paid' and o.payment_status='paid'));
 if found_count<>expected then raise exception 'offer_reservation_expired_or_invalid'; end if;
 update dbest_checkout_private.offer_orders
    set status='paid',payment_status='paid',razorpay_payment_id=p_payment_id
  where member_id=p_member and idempotency_key=any(p_keys)
    and status='reserved' and payment_status='unpaid' and expires_at>now();
 get diagnostics changed=row_count;
 return changed;
end
$function$;

revoke all on function public.dBest_validate_checkout_offer_reservations(text,uuid[]) from public,anon,authenticated;
revoke all on function public.dBest_mark_checkout_offer_reservations_paid(text,uuid[],text) from public,anon,authenticated;
grant execute on function public.dBest_validate_checkout_offer_reservations(text,uuid[]) to service_role;
grant execute on function public.dBest_mark_checkout_offer_reservations_paid(text,uuid[],text) to service_role;
create or replace function public.dbest_validate_checkout_offer_reservations(p_member text,p_keys uuid[])
returns boolean language plpgsql security definer
set search_path to 'public','dbest_checkout_private'
as $function$
declare expected integer; found_count integer;
begin
 if nullif(trim(p_member),'') is null then raise exception 'member_required'; end if;
 perform dbest_checkout_private.expire_unpaid();
 select count(distinct k) into expected from unnest(coalesce(p_keys,'{}'::uuid[])) as k;
 if expected=0 then return true; end if;
 update dbest_checkout_private.offer_orders set expires_at=now()+interval '15 minutes'
  where member_id=p_member and idempotency_key=any(p_keys) and status='reserved' and payment_status='unpaid' and expires_at>now();
 select count(distinct o.idempotency_key) into found_count from dbest_checkout_private.offer_orders o
  where o.member_id=p_member and o.idempotency_key=any(p_keys)
    and ((o.status='reserved' and o.payment_status='unpaid' and o.expires_at>now()) or (o.status='paid' and o.payment_status='paid'));
 if found_count<>expected then raise exception 'offer_reservation_expired_or_invalid'; end if;
 return true;
end
$function$;
-- If a payment arrives after reservation expiry, reacquire stock only when every
-- expired item is still available; otherwise report -1 so verify-payment refunds.
create or replace function public.dbest_mark_checkout_offer_reservations_paid(p_member text,p_keys uuid[],p_payment_id text)
returns integer
language plpgsql
security definer
set search_path to 'public','dbest_checkout_private'
as $function$
declare expected integer; found_count integer; changed integer:=0; r record; v record; required_qty integer;
begin
 if nullif(trim(p_member),'') is null or nullif(trim(p_payment_id),'') is null then return -1; end if;
 perform dbest_checkout_private.expire_unpaid();
 select count(distinct k) into expected from unnest(coalesce(p_keys,'{}'::uuid[])) as k;
 if expected=0 then return 0; end if;
 select count(distinct o.idempotency_key) into found_count
   from dbest_checkout_private.offer_orders o
  where o.member_id=p_member and o.idempotency_key=any(p_keys)
    and ((o.status='reserved' and o.payment_status='unpaid' and o.expires_at>now())
         or (o.status='expired' and o.payment_status='unpaid')
         or (o.status='paid' and o.payment_status='paid'));
 if found_count<>expected then return -1; end if;
 for r in
   select distinct o.vendor_id,o.sku from dbest_checkout_private.offer_orders o
    where o.member_id=p_member and o.idempotency_key=any(p_keys) and o.status='expired' and o.payment_status='unpaid'
    order by o.vendor_id,o.sku
 loop
   select p.id,p.stock into v from public.dbest_vendor_product_offers p
     join public.dbest_uploaded_master_product_links_isolated l on l.master_product_id=p.master_product_id
    where p.vendor_id=r.vendor_id and l.sku=r.sku and p.active=true
    order by p.updated_at desc limit 1 for update of p;
   if not found then return -1; end if;
   select coalesce(sum(o.qty),0)::integer into required_qty from dbest_checkout_private.offer_orders o
    where o.member_id=p_member and o.idempotency_key=any(p_keys) and o.vendor_id=r.vendor_id and o.sku=r.sku
      and o.status='expired' and o.payment_status='unpaid';
   if coalesce(v.stock,0)<required_qty then return -1; end if;
 end loop;
 for r in
   select distinct o.vendor_id,o.sku from dbest_checkout_private.offer_orders o
    where o.member_id=p_member and o.idempotency_key=any(p_keys) and o.status='expired' and o.payment_status='unpaid'
    order by o.vendor_id,o.sku
 loop
   select p.id into v from public.dbest_vendor_product_offers p
     join public.dbest_uploaded_master_product_links_isolated l on l.master_product_id=p.master_product_id
    where p.vendor_id=r.vendor_id and l.sku=r.sku and p.active=true
    order by p.updated_at desc limit 1;
   select coalesce(sum(o.qty),0)::integer into required_qty from dbest_checkout_private.offer_orders o
    where o.member_id=p_member and o.idempotency_key=any(p_keys) and o.vendor_id=r.vendor_id and o.sku=r.sku
      and o.status='expired' and o.payment_status='unpaid';
   update public.dbest_vendor_product_offers set stock=stock-required_qty,updated_at=now() where id=v.id;
 end loop;
 update dbest_checkout_private.offer_orders set status='paid',payment_status='paid',razorpay_payment_id=p_payment_id
  where member_id=p_member and idempotency_key=any(p_keys) and status in ('reserved','expired') and payment_status='unpaid';
 get diagnostics changed=row_count;
 return changed;
end
$function$;
revoke all on function public.dbest_mark_checkout_offer_reservations_paid(text,uuid[],text) from public,anon,authenticated;
grant execute on function public.dbest_mark_checkout_offer_reservations_paid(text,uuid[],text) to service_role;
