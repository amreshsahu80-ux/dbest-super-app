-- REVIEW-ONLY staging correction candidate for Samsung Point VND8597199.
-- DO NOT RUN against the connected "DBest Super Platform Test" project until
-- its isolation from production and downstream consumers is independently established.
-- Explicit release approval is required for any production correction.
-- This script intentionally requires a session-local approval flag AND a captured
-- optimistic-lock timestamp. It is not invoked by CI or the application.
-- In an independently verified staging session, after reviewing the dry-run:
-- BEGIN;
-- SET LOCAL dbest.build10_isolated_staging_approved = 'yes';
-- SET LOCAL dbest.build10_expected_updated_at = '<exact updated_at from preflight>';
-- Execute the DO block below in the SAME transaction, inspect results, then COMMIT.
-- If any assertion fails, ROLLBACK. Do not set the flag on production.

DO $build10$
DECLARE
  v public.marketplace_vendors_live%ROWTYPE;
  registry_value jsonb;
  expected_at timestamptz;
  category_count integer;
  valid_category_count integer;
  affected integer;
  catalogue_row record;
  sellable_electronics_count integer := 0;
BEGIN
  IF current_setting('dbest.build10_isolated_staging_approved', true) IS DISTINCT FROM 'yes'
     OR current_setting('dbest.build10_expected_updated_at', true) IS NULL THEN
    RAISE EXCEPTION 'Build 10 correction blocked: verified staging flag and expected timestamp required';
  END IF;
  expected_at := current_setting('dbest.build10_expected_updated_at')::timestamptz;

  -- Lock the authoritative registry row until the transaction ends so a
  -- concurrent category deactivation cannot race this correction.
  SELECT value::jsonb INTO STRICT registry_value
    FROM public.app_settings WHERE key='marketplace_categories' FOR SHARE;
  IF jsonb_typeof(registry_value) IS DISTINCT FROM 'object'
     OR jsonb_typeof(registry_value->'categories') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Build 10 correction blocked: invalid category registry structure';
  END IF;

  SELECT count(*), count(*) FILTER (
    WHERE c->>'key' = 'electronics'
      AND (nullif(trim(c->>'active'),'') IS NOT NULL
       OR nullif(trim(c->>'enabled'),'') IS NOT NULL
       OR nullif(trim(c->>'is_active'),'') IS NOT NULL
       OR nullif(trim(c->>'status'),'') IS NOT NULL)
      AND (nullif(trim(c->>'active'),'') IS NULL OR lower(trim(c->>'active')) IN ('true','1','yes','active','enabled','published','live'))
      AND (nullif(trim(c->>'enabled'),'') IS NULL OR lower(trim(c->>'enabled')) IN ('true','1','yes','active','enabled','published','live'))
      AND (nullif(trim(c->>'is_active'),'') IS NULL OR lower(trim(c->>'is_active')) IN ('true','1','yes','active','enabled','published','live'))
      AND (nullif(trim(c->>'status'),'') IS NULL OR lower(trim(c->>'status')) IN ('active','enabled','published','live'))
      AND nullif(trim(c->>'deleted_at'),'') IS NULL
      AND nullif(trim(c->>'archived_at'),'') IS NULL
  ) INTO category_count, valid_category_count
  FROM jsonb_array_elements(registry_value->'categories') c
  WHERE lower(trim(c->>'key'))='electronics';

  IF category_count <> 1 OR valid_category_count <> 1 THEN
    RAISE EXCEPTION 'Build 10 correction blocked: Electronics registry not uniquely active';
  END IF;

  SELECT * INTO STRICT v FROM public.marketplace_vendors_live
   WHERE id='VND8597199' FOR UPDATE;

  -- Lock existing catalogue rows while checking their classification and stock.
  -- This prevents concurrent updates/deletions of observed rows during correction.
  -- New inserts still require coordinated application-level writes and later QA.
  FOR catalogue_row IN
    SELECT c.market_type, c.active, c.stock
      FROM public.marketplace_catalog_live c
     WHERE c.vendor_id=v.id FOR SHARE
  LOOP
    IF catalogue_row.market_type IS DISTINCT FROM 'electronics' THEN
      RAISE EXCEPTION 'Build 10 correction blocked: incompatible catalogue category';
    END IF;
    IF catalogue_row.active IS TRUE AND catalogue_row.stock > 0 THEN
      sellable_electronics_count := sellable_electronics_count + 1;
    END IF;
  END LOOP;
  IF sellable_electronics_count = 0 THEN
    RAISE EXCEPTION 'Build 10 correction blocked: no sellable Electronics catalogue rows';
  END IF;

  IF v.updated_at IS DISTINCT FROM expected_at OR v.type IS DISTINCT FROM 'other'
     OR v.owner_approval IS DISTINCT FROM 'Approved' OR v.active IS DISTINCT FROM true
     OR v.agreement_status IS DISTINCT FROM 'Fully Signed' OR v.operational_hold IS DISTINCT FROM false
     OR jsonb_typeof(v.profile_meta) IS DISTINCT FROM 'object'
     OR coalesce(v.profile_meta->>'business_category','') NOT IN ('','other','electronics')
     THEN
    RAISE EXCEPTION 'Build 10 correction blocked: vendor changed or catalogue incompatible';
  END IF;

  UPDATE public.marketplace_vendors_live
     SET type='electronics',
         profile_meta=jsonb_set(v.profile_meta,'{business_category}','"electronics"'::jsonb,true),
         updated_at=now()
   WHERE id=v.id AND updated_at=expected_at AND type='other'
     AND owner_approval='Approved' AND active IS TRUE
     AND agreement_status='Fully Signed' AND operational_hold IS FALSE
     AND profile_meta IS NOT DISTINCT FROM v.profile_meta;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN
    RAISE EXCEPTION 'Build 10 correction blocked: affected % rows, expected exactly one', affected;
  END IF;
  RAISE NOTICE 'Build 10 staging correction updated exactly one vendor; transaction still requires explicit COMMIT';
END
$build10$;

-- Follow with all three SELECT-only staging acceptance gates, separately.
-- SQL success is not evidence of deployed public_catalog or Main App UI discovery.
