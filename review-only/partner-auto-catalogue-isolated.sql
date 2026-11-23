-- DBest Partner automatic catalogue assignment: read-only QA contract.
-- Owner publishes a master product once; all active, Owner-approved vendors
-- in the same category inherit it without per-product activation.
-- This view is intentionally server-only, not exposed to browser roles.
create or replace view public.dbest_partner_auto_catalogue_isolated
with (security_invoker=true) as
select v.id as vendor_id, lower(trim(v.type)) as vendor_category,
 m.id as master_product_id, m.name, m.brand, m.category, m.image_url,
 true as auto_assigned, coalesce(o.stock,0) as vendor_stock,
 o.price_inclusive_gst as vendor_price, o.mrp as vendor_mrp,
 (coalesce(o.stock,0)>0) as in_stock,
 (m.image_rights_verified and coalesce((m.specifications->>'customer_publication_blocked')::boolean,false)=false) as publication_checks_passed
from public.marketplace_vendors_live v
join public.dbest_master_products m on lower(trim(v.type))=lower(trim(m.category))
left join public.dbest_vendor_product_offers o on o.vendor_id=v.id and o.master_product_id=m.id
where v.active is true and lower(coalesce(v.owner_approval,''))='approved'
and coalesce(v.operational_hold,false)=false and m.status='approved';
revoke all on public.dbest_partner_auto_catalogue_isolated from public,anon,authenticated;
-- The Partner API must enforce authenticated vendor_id server-side.
-- Do NOT grant direct access or expose all vendors' prices to clients.
