-- STAGED ONLY. Do not apply until Owner Console endpoint and access controls are reviewed.
-- Transactional Owner review RPC. Access restricted to service_role, never anon/authenticated.
create or replace function public.dbest_owner_review_vendor_offer(
 p_owner_token text,p_offer_id uuid,p_expected_version integer,
 p_decision text,p_reason text default ''
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
 v_email text; v_offer public.dbest_vendor_product_offers%rowtype;
 v_master_status text; v_next text;
begin
 v_email := public.validate_owner_session(p_token => p_owner_token);
 if v_email is null then raise exception 'owner_session_invalid' using errcode='28000'; end if;
 if p_expected_version is null or p_expected_version < 0 then
   raise exception 'invalid_version'; end if;
 if p_decision not in ('approve','reject','suspend') then
   raise exception 'invalid_decision'; end if;
 select * into v_offer from public.dbest_vendor_product_offers
   where id=p_offer_id for update;
 if not found then raise exception 'offer_not_found'; end if;
 if v_offer.review_version <> p_expected_version then
   raise exception 'stale_review_version'; end if;
 v_next := case p_decision when 'approve' then 'approved'
   when 'reject' then 'rejected' else 'suspended' end;
 if v_offer.review_status=v_next then raise exception 'duplicate_review'; end if;
 if p_decision='approve' then
   select status into v_master_status from public.dbest_master_products
     where id=v_offer.master_product_id;
   if v_master_status is distinct from 'approved' then
     raise exception 'master_not_approved'; end if;
   if v_offer.active is distinct from true or v_offer.stock <= 0
      or v_offer.mrp is null or v_offer.mrp < v_offer.price_inclusive_gst then
     raise exception 'offer_not_sellable'; end if;
 elsif nullif(btrim(coalesce(p_reason,'')),'') is null then
   raise exception 'review_reason_required';
 end if;
 update public.dbest_vendor_product_offers
 set review_status=v_next,review_version=v_offer.review_version+1,
     reviewed_at=now(),reviewed_by=v_email
 where id=p_offer_id;
 insert into public.dbest_vendor_offer_review_audit
   (offer_id,actor_id,prior_status,new_status,reason,prior_version,next_version)
 values (p_offer_id,v_email,v_offer.review_status,v_next,coalesce(p_reason,''),
   v_offer.review_version,v_offer.review_version+1);
 return jsonb_build_object('ok',true,'offerId',p_offer_id,
   'reviewStatus',v_next,'reviewVersion',v_offer.review_version+1);
end $$;
revoke all on function public.dbest_owner_review_vendor_offer(text,uuid,integer,text,text)
 from public,anon,authenticated;
grant execute on function public.dbest_owner_review_vendor_offer(text,uuid,integer,text,text)
 to service_role;
