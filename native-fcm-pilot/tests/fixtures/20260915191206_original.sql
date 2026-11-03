-- Historical schema migration fixture. Run only in disposable PostgreSQL CI. 
create or replace function public.dbest_sync_marketplace_delivery_from_vaahak_job()
returns trigger
language plpgsql
as $$
declare
  v_order_id text;
  v_now timestamptz := now();
begin
  if new.kind is distinct from 'delivery' then return new; end if;
  v_order_id := nullif(btrim(coalesce(new.order_meta->>'marketplaceOrderId','')), '');
  if v_order_id is null then
    select id into v_order_id from public.marketplace_orders_live where vaahak_job_id = new.id limit 1;
  end if;
  if v_order_id is null then return new; end if;

  update public.marketplace_orders_live m
  set vaahak_job_id = new.id,
      vaahak_partner_id = coalesce(new.assigned_partner_id,m.vaahak_partner_id),
      vaahak_assigned_at = case when new.assigned_partner_id is not null and new.status in ('Accepted','Trip Started','Completed') then coalesce(m.vaahak_assigned_at,new.accepted_at,v_now) else m.vaahak_assigned_at end,
      picked_up_at = case when new.status in ('Trip Started','Completed') then coalesce(m.picked_up_at,new.started_at,v_now) else m.picked_up_at end,
      out_for_delivery_at = case when new.status in ('Trip Started','Completed') then coalesce(m.out_for_delivery_at,new.started_at,v_now) else m.out_for_delivery_at end,
      payment_status = case when new.payment_status in ('Received','Prepaid','Legacy Completed') then case when new.payment_status='Prepaid' then 'Prepaid' else 'Received' end else m.payment_status end,
      payment_received_at = case when new.payment_status in ('Received','Prepaid','Legacy Completed') then coalesce(m.payment_received_at,new.payment_received_at,case when new.status='Completed' then v_now else null end) else m.payment_received_at end,
      completed_at = case when new.status='Completed' then coalesce(m.completed_at,new.completed_at,v_now) else m.completed_at end,
      status = case when new.status='Completed' then 'Delivered / Completed' when new.status='Trip Started' then 'Product Picked Up / Out for Delivery' when new.status='Accepted' then 'Vaahak Assigned / Going to Vendor' when new.status='Cancelled' then 'Delivery Cancelled' else m.status end,
      updated_at = v_now
  where m.id = v_order_id;
  return new;
end;
$$;
