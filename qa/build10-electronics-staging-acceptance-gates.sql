-- Build 10 isolated Electronics acceptance: read-only contract probes.
-- Run only against an authorized TEST database. No DML, no production correction.
-- Each query returns a gate and evidence; zero matches is a FAIL, not a pass.
-- Missing registry active/status flags fail closed; catalogue requires a sellable approved vendor.
WITH registry AS (
  SELECT c->>'key' AS category_key, c->>'label' AS category_label,
         c->>'active' AS active, c->>'enabled' AS enabled,
         c->>'is_active' AS is_active, c->>'status' AS status,
         c->>'deleted_at' AS deleted_at, c->>'archived_at' AS archived_at
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
         AND (SELECT count(*) FROM public.app_settings WHERE key='marketplace_categories')=1
         AND (SELECT count(*) FROM public.app_settings WHERE key='marketplace_categories'
              AND jsonb_typeof(value::jsonb)='object'
              AND jsonb_typeof(value::jsonb->'categories')='array')=1
         AND bool_and(
           (nullif(trim(active),'') IS NOT NULL OR nullif(trim(enabled),'') IS NOT NULL
            OR nullif(trim(is_active),'') IS NOT NULL OR nullif(trim(status),'') IS NOT NULL)
           AND (nullif(trim(active),'') IS NULL OR lower(trim(active)) IN ('true','1','yes','active','enabled','published','live'))
           AND (nullif(trim(enabled),'') IS NULL OR lower(trim(enabled)) IN ('true','1','yes','active','enabled','published','live'))
           AND (nullif(trim(is_active),'') IS NULL OR lower(trim(is_active)) IN ('true','1','yes','active','enabled','published','live'))
           AND (nullif(trim(status),'') IS NULL OR lower(trim(status)) IN ('active','enabled','published','live'))
           AND nullif(trim(deleted_at),'') IS NULL
           AND nullif(trim(archived_at),'') IS NULL
         )
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
  AND lower(trim(coalesce(v.profile_meta->>'business_category','')))='electronics'
  AND v.owner_approval='Approved' AND v.active IS TRUE
  AND v.agreement_status='Fully Signed' AND v.operational_hold IS FALSE
  AND c.market_type='electronics' AND c.active IS TRUE AND c.stock>0;

-- SQL-level PASS is necessary but not sufficient: verify the deployed public_catalog
-- endpoint and Main App Electronics UI with the same staging dataset.
