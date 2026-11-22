-- Build 10 isolated Electronics acceptance: read-only contract probes.
-- Run only against an authorized TEST database. No DML, no production correction.
-- Each query returns a gate and evidence; zero matches is a FAIL, not a pass.
WITH registry AS (
  SELECT c->>'key' AS category_key, c->>'label' AS category_label,
         c->>'active' AS active, c->>'status' AS status
  FROM public.app_settings s
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(s.value::jsonb->'categories') = 'array'
      THEN s.value::jsonb->'categories' ELSE '[]'::jsonb END
  ) c
  WHERE s.key='marketplace_categories'
), electronics AS (
  SELECT * FROM registry WHERE lower(trim(category_key))='electronics'
)
SELECT 'electronics_registry_unique_active' AS gate,
       count(*) AS matching_rows,
       CASE WHEN count(*)=1
         AND bool_and(coalesce(lower(active),'true') IN ('true','1','yes','active','enabled','published','live'))
         AND bool_and(coalesce(lower(status),'active') IN ('active','enabled','published','live'))
         THEN 'PASS' ELSE 'FAIL' END AS result
FROM electronics;

WITH vendor AS (
  SELECT id, name, type, owner_approval, active, agreement_status,
         operational_hold, profile_meta->>'business_category' AS business_category
  FROM public.marketplace_vendors_live WHERE id='VND8597199'
)
SELECT 'samsung_point_staging_fixture' AS gate, count(*) AS matching_rows,
       CASE WHEN count(*)=1
         AND bool_and(type='electronics' AND business_category='electronics'
           AND owner_approval='Approved' AND active IS TRUE
           AND agreement_status='Fully Signed' AND operational_hold IS FALSE)
         THEN 'PASS' ELSE 'FAIL' END AS result
FROM vendor;

SELECT 'samsung_point_sellable_catalogue' AS gate,
       count(*) AS matching_rows,
       CASE WHEN count(*)>0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM public.marketplace_catalog_live c
JOIN public.marketplace_vendors_live v ON v.id=c.vendor_id
WHERE v.id='VND8597199' AND v.type='electronics'
  AND c.market_type='electronics' AND c.active IS TRUE AND c.stock>0;

-- SQL-level PASS is necessary but not sufficient: verify the deployed public_catalog
-- endpoint and Main App Electronics UI with the same staging dataset.
