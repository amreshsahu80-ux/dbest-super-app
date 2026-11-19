-- Build 10 / Samsung Point VND8597199: READ-ONLY diagnosis and DRY-RUN correction.
-- Never run a COMMIT against production without separate explicit release approval.
-- marketplace-live uses app_settings.value.categories as the authoritative registry.
-- First query verifies the exact vendor and its state; no data is changed.
SELECT id, name, type, owner_approval, active, agreement_status, operational_hold,
       profile_meta, updated_at
FROM public.marketplace_vendors_live
WHERE id = 'VND8597199';

-- Inspect active Electronics registry entry before any proposed correction.
SELECT key, value
FROM public.app_settings
WHERE key = 'marketplace_categories';

-- Check catalogue rows that may have legacy category values.
SELECT id, vendor_id, market_type, name, active, stock
FROM public.marketplace_catalog_live
WHERE vendor_id = 'VND8597199'
ORDER BY id;

-- DRY RUN ONLY: transaction intentionally rolls back even if all guards match.
-- A later approved release must re-check current data, expected category,
-- exact vendor identity and owner approval before considering a COMMIT.
BEGIN;
UPDATE public.marketplace_vendors_live
SET type = 'electronics',
    profile_meta = jsonb_set(COALESCE(profile_meta::jsonb, '{}'::jsonb),
                             '{business_category}', '"electronics"'::jsonb, true),
    updated_at = now()
WHERE id = 'VND8597199'
  AND type = 'other'
  AND owner_approval = 'Approved'
  AND active IS TRUE
  AND agreement_status = 'Fully Signed'
  AND operational_hold IS FALSE
  AND EXISTS (
    SELECT 1 FROM public.app_settings s,
    LATERAL jsonb_array_elements(COALESCE(s.value::jsonb->'categories','[]'::jsonb)) c
    WHERE s.key = 'marketplace_categories'
      AND c->>'key' = 'electronics'
      AND COALESCE(c->>'active','true') <> 'false'
      AND COALESCE(c->>'enabled','true') <> 'false'
      AND COALESCE(c->>'is_active','true') <> 'false'
      AND lower(COALESCE(c->>'status','')) IN ('','active','enabled','published','live')
  )
RETURNING id, name, type, profile_meta, updated_at;
ROLLBACK;

-- After an approved change in a separately authorized release, QA must verify:
-- public_catalog({marketType:'electronics'}) includes this approved vendor
-- and active in-stock products, and Main App renders Electronics discovery.
-- Catalogue rows are deliberately NOT rewritten by this script.
