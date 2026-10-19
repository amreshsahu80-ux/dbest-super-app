-- DBest Cab hardening candidate, reviewed but NOT executed on production.
-- Apply ONLY after an isolated Supabase staging branch passes migration checks.
-- Align all completion endpoints, including vaahak-complete-live RPC, with the
-- existing vaahak-live roundtrip + payment preconditions.
create or replace function public.dbest_complete_vaahak_job_live(
    p_job_id text, p_partner_id text
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  j public.vaahak_jobs_live%rowtype;
  now_ts timestamptz := now();
  meta jsonb;
begin
  select * into j
    from public.vaahak_jobs_live
    where id = p_job_id and assigned_partner_id = p_partner_id
    for update;
  if not found then
    return jsonb_build_object('ok',false,'error','job_not_found');
  end if;
  if j.status = 'Completed' then
    return jsonb_build_object('ok',true,'already',true,'id',j.id,
                              'status',j.status,'completed_at',j.completed_at);
  end if;
  if j.kind <> 'ride' then
    return jsonb_build_object('ok',false,'error','ride_completion_only');
  end if;
  if j.status <> 'Trip Started' then
    return jsonb_build_object('ok',false,'error','job_not_ready_to_complete','status',j.status);
  end if;
  meta := coalesce(j.order_meta,'{}'::jsonb);
  if lower(coalesce(meta->>'roundTrip','false')) = 'true'
     and lower(coalesce(meta->>'sameVehicle','false')) = 'true'
     and coalesce(meta->>'returnLegStatus','') <> 'started' then
    return jsonb_build_object('ok',false,'error','return_leg_not_started');
  end if;
  -- This accepted-state list mirrors both current completion endpoints.
  -- Recheck trusted payment-state writers before a production migration.
  if coalesce(j.payment_status,'') not in
        ('Received','Prepaid','Paid','Razorpay Verified','Legacy Completed') then
    return jsonb_build_object('ok',false,'error','payment_confirmation_required',
                              'payment_status',j.payment_status);
  end if;
  update public.vaahak_jobs_live
    set status = 'Completed', completed_at = now_ts, updated_at = now_ts
    where id = j.id and assigned_partner_id = p_partner_id and status = 'Trip Started'
    returning * into j;
  if not found then
    return jsonb_build_object('ok',false,'error','completion_race');
  end if;
  return jsonb_build_object('ok',true,'id',j.id,
                            'status',j.status,'completed_at',j.completed_at);
end;
$function$;
