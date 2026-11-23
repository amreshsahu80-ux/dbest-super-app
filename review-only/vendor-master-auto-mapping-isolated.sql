-- Read-only, isolated automatic mapping. A category assignment is not an active offer.
-- No privileges granted to browsers; server-side authenticated access only.
create or replace view public.dbest_vendor_master_mapping_isolated
with (security_invoker=true) as
select v.id as vendor_id,lower(trim(v.type)) as vendor_category,
 m.id as master_product_id,m.name as product_name,m.category as product_category
from public.marketplace_vendors_live v
join public.dbest_master_products m
 on lower(trim(v.type))=lower(trim(m.category))
where v.active is true
 and lower(coalesce(v.owner_approval,''))='approved'
 and coalesce(v.operational_hold,false)=false
 and m.status='approved';
revoke all on public.dbest_vendor_master_mapping_isolated from public,anon,authenticated;
