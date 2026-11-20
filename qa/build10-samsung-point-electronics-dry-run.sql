-- Build 10: Samsung Point VND8597199 diagnostic and proposed correction PREVIEW ONLY.
-- This file deliberately contains no DML, transaction, or COMMIT. A rolled-back UPDATE
-- can still invoke non-transactional external triggers; SELECT-only is safer for production.
-- Do not execute a correction without separate explicit production release approval.
SELECT id, name, type, owner_approval, active, agreement_status, operational_hold,
       profile_meta, updated_at
FROM public.marketplace_vendors_live
WHERE id = 'VND8597199';

SELECT key, value
FROM public.app_settings
WHERE key = 'marketplace_categories';

SELECT id, vendor_id, market_type, name, active, stock
FROM public.marketplace_catalog_live
WHERE vendor_id = 'VND8597199'
ORDER BY id;

-- Evaluate the exact guarded correction as a projection, without writing anything.
-- Review existing values, eligibility, and expected after-values side by side.
WITH registry AS (
  SELECT (SELECT COUNT(*)
    FROM (SELECT 1
    FROM public.app_settings s
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(s.value::jsonb->'categories') = 'array'
        THEN s.value::jsonb->'categories' ELSE '[]'::jsonb END
    ) c
    WHERE s.key = 'marketplace_categories'
      AND c->>'key' = 'electronics'
      AND c->>'active' IS DISTINCT FROM 'false'
      AND c->>'enabled' IS DISTINCT FROM 'false'
      AND c->>'is_active' IS DISTINCT FROM 'false'
      AND lower(COALESCE(c->>'status','')) IN ('','active','enabled','published','live')
    ) eligible) = 1
    AND (SELECT COUNT(*) FROM public.app_settings s
         CROSS JOIN LATERAL jsonb_array_elements(
           CASE WHEN jsonb_typeof(s.value::jsonb->'categories') = 'array'
             THEN s.value::jsonb->'categories' ELSE '[]'::jsonb END
         ) c
         WHERE s.key = 'marketplace_categories' AND c->>'key' = 'electronics') = 1
    AS electronics_enabled
), candidate AS (
  SELECT v.*, r.electronics_enabled,
    (v.type = 'other'
      AND v.owner_approval = 'Approved'
      AND v.active IS TRUE
      AND v.agreement_status = 'Fully Signed'
      AND v.operational_hold IS FALSE
      AND r.electronics_enabled
      -- jsonb_set requires an object; reject malformed legacy metadata rather than erroring.
      AND (v.profile_meta IS NULL OR jsonb_typeof(v.profile_meta::jsonb) = 'object')
      AND COALESCE(v.profile_meta::jsonb->>'business_category','') IN ('','other','electronics')
      -- Changing the vendor alone cannot make legacy 'other' catalogue rows
      -- discoverable through an Electronics-only public_catalog query.
      -- Include NULL market_type as non-Electronics: SQL <> would silently skip NULL.
      -- Fail closed until those rows have a separately reviewed migration plan.
      AND NOT EXISTS (SELECT 1 FROM public.marketplace_catalog_live i
                      WHERE i.vendor_id = v.id AND i.market_type IS DISTINCT FROM 'electronics')
    ) AS correction_eligible
  FROM public.marketplace_vendors_live v CROSS JOIN registry r
  WHERE v.id = 'VND8597199'
)
SELECT id, name, type AS current_type, owner_approval, active,
       agreement_status, operational_hold, electronics_enabled, correction_eligible,
       (SELECT COUNT(*) FROM public.marketplace_catalog_live i
        WHERE i.vendor_id = candidate.id AND i.market_type = 'other') AS legacy_other_catalogue_rows,
       (SELECT COUNT(*) FROM public.marketplace_catalog_live i
        WHERE i.vendor_id = candidate.id AND i.market_type IS NULL) AS null_category_catalogue_rows,
       (SELECT COUNT(*) FROM public.marketplace_catalog_live i
        WHERE i.vendor_id = candidate.id AND i.market_type = 'electronics') AS electronics_catalogue_rows,
       CASE WHEN correction_eligible THEN 'electronics' ELSE type END AS proposed_type,
       profile_meta AS current_profile_meta,
       CASE WHEN profile_meta IS NULL OR jsonb_typeof(profile_meta::jsonb) = 'object'
         THEN 'valid_object_or_null' ELSE 'invalid_non_object' END AS profile_meta_shape,
       CASE WHEN correction_eligible
         THEN jsonb_set(COALESCE(profile_meta::jsonb,'{}'::jsonb),
                        '{business_category}', '"electronics"'::jsonb, true)
         ELSE profile_meta::jsonb END AS proposed_profile_meta
FROM candidate;

-- Post-approval QA (not executed here): verify public_catalog({marketType:'electronics'})
-- returns this Vendor's active in-stock items, and Main App Electronics discovery renders.
-- Existing 'other' or NULL-category catalogue rows block eligibility: owner correction alone is
-- insufficient for Main App Electronics discovery. No rows are changed here.
