-- Isolated proposal: atomic publication of a previously submitted product.
-- Not applied to production until explicit release approval.
-- Only service_role may call this RPC. Vendor identity is taken from a
-- server-validated submission; never trust vendor_id supplied by the client.
create or replace function public.dbest_auto_publish_matched_submission(
 p_submission_id uuid
) returns jsonb language plpgsql security invoker set search_path=''
as $$
declare
 s public.dbest_vendor_product_submissions%rowtype;
 v public.marketplace_vendors_live%rowtype;
 m public.dbest_master_products%rowtype;
 candidate_count integer;
 offer_id uuid;
 p jsonb;
 b text;
 img text;
begin
 select * into s from public.dbest_vendor_product_submissions
  where id=p_submission_id for update;
 if not found then raise exception 'submission_not_found'; end if;
 if s.status<>'pending_owner_review' then
  return jsonb_build_object('ok',false,'reason','already_processed');
 end if;
 select * into v from public.marketplace_vendors_live
  where id=s.vendor_id for update;
 if not found or v.active is distinct from true or v.owner_approval is distinct from 'Approved'
    or v.operational_hold is distinct from false then
  return jsonb_build_object('ok',false,'reason','vendor_not_eligible');
 end if;
 p:=s.payload;
 if p->>'category'='medicine' or coalesce(p->>'prescriptionRequired','REVIEW')<>'FALSE' then
  return jsonb_build_object('ok',false,'reason','compliance_review_required');
 end if;
 b:=p->>'barcode';
 if b is null or b !~ '^[0-9]{8,14}$' then
  return jsonb_build_object('ok',false,'reason','barcode_required');
 end if;
 select count(*) into candidate_count from public.dbest_master_products
  where barcode_gtin=b and category=p->>'category';
 if candidate_count<>1 then
  return jsonb_build_object('ok',false,'reason','master_match_not_unique');
 end if;
 select * into m from public.dbest_master_products
  where barcode_gtin=b and category=p->>'category' for share;
 if m.status<>'approved' or coalesce(m.specifications->>'test_only','false')='true'
    or m.image_rights_verified is distinct from true or m.gst_verified_at is null then
  return jsonb_build_object('ok',false,'reason','master_not_publishable');
 end if;
 if lower(regexp_replace(trim(m.name),'\\s+',' ','g'))<>lower(regexp_replace(trim(p->>'name'),'\\s+',' ','g'))
    or lower(regexp_replace(trim(coalesce(m.brand,'')),'\\s+',' ','g'))<>lower(regexp_replace(trim(coalesce(p->>'brand','')),'\\s+',' ','g')) then
  return jsonb_build_object('ok',false,'reason','product_identity_mismatch');
 end if;
 if coalesce(p->>'price','') !~ '^[0-9]+(\\.[0-9]+)?
  return jsonb_build_object('ok',false,'reason','invalid_offer');
 end if;
 -- Avoid overwriting another offer or changing an existing vendor's stock.
 if exists(select 1 from public.dbest_vendor_product_offers
           where vendor_id=s.vendor_id and master_product_id=m.id) then
  return jsonb_build_object('ok',false,'reason','existing_offer_requires_review');
 end if;
 img:=nullif(p->>'imageUrl','');
 insert into public.dbest_vendor_product_offers
  (vendor_id,master_product_id,price_inclusive_gst,mrp,stock,active,
   vendor_image_url,vendor_image_review_status)
 values (s.vendor_id,m.id,(p->>'price')::numeric,nullif(p->>'mrp','')::numeric,
         (p->>'stock')::integer,true,img,
         case when img is null then 'none' else 'pending_review' end)
 returning id into offer_id;
 update public.dbest_vendor_product_submissions
  set status='approved',matched_master_product_id=m.id,
      reviewed_by='auto_match_policy',reviewed_at=now()
  where id=s.id;
 return jsonb_build_object('ok',true,'submissionId',s.id,
   'masterProductId',m.id,'offerId',offer_id,'published',true);
end $$;
revoke all on function public.dbest_auto_publish_matched_submission(uuid)
 from public,anon,authenticated;
grant execute on function public.dbest_auto_publish_matched_submission(uuid)
 to service_role;

    or coalesce(p->>'stock','') !~ '^[0-9]+
  return jsonb_build_object('ok',false,'reason','invalid_offer');
 end if;
 -- Avoid overwriting another offer or changing an existing vendor's stock.
 if exists(select 1 from public.dbest_vendor_product_offers
           where vendor_id=s.vendor_id and master_product_id=m.id) then
  return jsonb_build_object('ok',false,'reason','existing_offer_requires_review');
 end if;
 img:=nullif(p->>'imageUrl','');
 insert into public.dbest_vendor_product_offers
  (vendor_id,master_product_id,price_inclusive_gst,mrp,stock,active,
   vendor_image_url,vendor_image_review_status)
 values (s.vendor_id,m.id,(p->>'price')::numeric,nullif(p->>'mrp','')::numeric,
         (p->>'stock')::integer,true,img,
         case when img is null then 'none' else 'pending_review' end)
 returning id into offer_id;
 update public.dbest_vendor_product_submissions
  set status='approved',matched_master_product_id=m.id,
      reviewed_by='auto_match_policy',reviewed_at=now()
  where id=s.id;
 return jsonb_build_object('ok',true,'submissionId',s.id,
   'masterProductId',m.id,'offerId',offer_id,'published',true);
end $$;
revoke all on function public.dbest_auto_publish_matched_submission(uuid)
 from public,anon,authenticated;
grant execute on function public.dbest_auto_publish_matched_submission(uuid)
 to service_role;

    or (nullif(p->>'mrp','') is not null and (p->>'mrp') !~ '^[0-9]+(\\.[0-9]+)?
  return jsonb_build_object('ok',false,'reason','invalid_offer');
 end if;
 -- Avoid overwriting another offer or changing an existing vendor's stock.
 if exists(select 1 from public.dbest_vendor_product_offers
           where vendor_id=s.vendor_id and master_product_id=m.id) then
  return jsonb_build_object('ok',false,'reason','existing_offer_requires_review');
 end if;
 img:=nullif(p->>'imageUrl','');
 insert into public.dbest_vendor_product_offers
  (vendor_id,master_product_id,price_inclusive_gst,mrp,stock,active,
   vendor_image_url,vendor_image_review_status)
 values (s.vendor_id,m.id,(p->>'price')::numeric,nullif(p->>'mrp','')::numeric,
         (p->>'stock')::integer,true,img,
         case when img is null then 'none' else 'pending_review' end)
 returning id into offer_id;
 update public.dbest_vendor_product_submissions
  set status='approved',matched_master_product_id=m.id,
      reviewed_by='auto_match_policy',reviewed_at=now()
  where id=s.id;
 return jsonb_build_object('ok',true,'submissionId',s.id,
   'masterProductId',m.id,'offerId',offer_id,'published',true);
end $$;
revoke all on function public.dbest_auto_publish_matched_submission(uuid)
 from public,anon,authenticated;
grant execute on function public.dbest_auto_publish_matched_submission(uuid)
 to service_role;
) then
  return jsonb_build_object('ok',false,'reason','invalid_offer');
 end if;
 if (p->>'price')::numeric<=0 or (p->>'stock')::numeric>2147483647
    or (nullif(p->>'mrp','') is not null and (p->>'mrp')::numeric<(p->>'price')::numeric) then
  return jsonb_build_object('ok',false,'reason','invalid_offer');
 end if;
 -- Avoid overwriting another offer or changing an existing vendor's stock.
 if exists(select 1 from public.dbest_vendor_product_offers
           where vendor_id=s.vendor_id and master_product_id=m.id) then
  return jsonb_build_object('ok',false,'reason','existing_offer_requires_review');
 end if;
 img:=nullif(p->>'imageUrl','');
 insert into public.dbest_vendor_product_offers
  (vendor_id,master_product_id,price_inclusive_gst,mrp,stock,active,
   vendor_image_url,vendor_image_review_status)
 values (s.vendor_id,m.id,(p->>'price')::numeric,nullif(p->>'mrp','')::numeric,
         (p->>'stock')::integer,true,img,
         case when img is null then 'none' else 'pending_review' end)
 returning id into offer_id;
 update public.dbest_vendor_product_submissions
  set status='approved',matched_master_product_id=m.id,
      reviewed_by='auto_match_policy',reviewed_at=now()
  where id=s.id;
 return jsonb_build_object('ok',true,'submissionId',s.id,
   'masterProductId',m.id,'offerId',offer_id,'published',true);
end $$;
revoke all on function public.dbest_auto_publish_matched_submission(uuid)
 from public,anon,authenticated;
grant execute on function public.dbest_auto_publish_matched_submission(uuid)
 to service_role;
