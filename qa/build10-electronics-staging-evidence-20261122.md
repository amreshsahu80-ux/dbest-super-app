# Build 10 — staging Electronics discovery evidence (2026-11-22)

Scope: connected Supabase project **DBest Super Platform Test** (`ydedmotbacnllkijzmvp`) only. All observations below came from read-only SQL. **No production access, correction, or mutation.** This document is an acceptance blocker, not evidence of Main App E2E success.

## Observations

- `public.marketplace_vendors_live` exists and has 15 vendor rows; 2 currently have `type='other'`.
- An exact lookup for `id='VND8597199'` returned **zero rows** in this test project. A separate case-insensitive Samsung Point name count also returned zero.
- `public.app_settings` contains a `marketplace_categories` JSON object with a `categories` array.
- Querying that registry for Electronics in either `key` or `label` returned **zero rows**. Do not silently invent Electronics or reclassify unrelated vendors.
- Catalogue fields include `vendor_id`, `market_type`, `active`, `stock`, `mrp`, `price`, and `image_url`. These schema fields alone do not prove Main App discovery.

## Reproduce safely in authorized isolated staging

```sql
SELECT id,name,type,owner_approval,active,agreement_status,operational_hold,
       profile_meta->>'business_category' AS business_category
FROM public.marketplace_vendors_live
WHERE id = 'VND8597199';

SELECT category->>'key' AS category_key,
       category->>'label' AS category_label,
       category->>'active' AS active
FROM public.app_settings s
CROSS JOIN LATERAL jsonb_array_elements(s.value->'categories') category
WHERE s.key='marketplace_categories'
  AND (category->>'key' ILIKE '%electronic%'
       OR category->>'label' ILIKE '%electronic%');

SELECT count(*) AS matching_catalogue_items,
       count(*) FILTER (WHERE c.active IS TRUE AND c.stock > 0) AS sellable_items
FROM public.marketplace_catalog_live c
WHERE c.vendor_id = 'VND8597199';
```

## Required next acceptance steps

1. Identify the **correct isolated QA dataset** containing Samsung Point; do not assume this test project mirrors production.
2. Have the Owner registry contract expose active `electronics` in that dataset, using an approved isolated fixture or migration (not an unapproved production change).
3. Verify Owner and regular onboarding persist the registry key to the canonical vendor `type`, without changing approval, signature, or operational flags.
4. Verify catalogue item category, vendor eligibility, deployed discovery endpoint and actual Main App UI in the same environment.
5. Prepare a separately reviewed, narrowly scoped data correction for Samsung Point only after confirming its true source record and category provenance. Never execute it against production without explicit approval.

**Build 10 release gate: HOLD.** Existing icon and signing identity unchanged; no Android artifact or Play release authorized by these observations.
