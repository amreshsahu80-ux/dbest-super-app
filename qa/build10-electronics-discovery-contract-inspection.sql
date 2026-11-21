-- DBest Partner Build 10: Main App Electronics discovery contract inspection.
-- SELECT-only, metadata-only, no invocation of application functions or mutations.
-- Execute in an authorized isolated/staging database before proposing any correction.
-- Function overloads, security-definer status and source are displayed for human review.
-- Never execute a guessed public_catalog signature against production.

SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       pg_get_function_result(p.oid) AS return_type,
       p.prosecdef AS security_definer,
       p.provolatile AS volatility,
       pg_get_functiondef(p.oid) AS function_definition
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND (p.proname ILIKE '%public_catalog%'
       OR p.proname ILIKE '%marketplace%catalog%'
       OR p.proname ILIKE '%category%')
ORDER BY n.nspname, p.proname, identity_arguments;

-- Identify views/materialized views that may enforce category or stock filtering.
SELECT schemaname, viewname, definition
FROM pg_catalog.pg_views
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND (viewname ILIKE '%catalog%' OR viewname ILIKE '%categor%')
ORDER BY schemaname, viewname;

-- Inspect only schema contracts for the vendor/catalogue join and registry fields.
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('marketplace_vendors_live', 'marketplace_catalog_live', 'app_settings')
  AND column_name IN ('id','vendor_id','type','market_type','active','stock',
                      'profile_meta','owner_approval','agreement_status',
                      'operational_hold','key','value')
ORDER BY table_name, ordinal_position;

-- Acceptance must separately demonstrate (1) an active registry Electronics key,
-- (2) Samsung Point VND8597199 approved/signed/active with persisted Electronics,
-- (3) eligible active in-stock catalogue items, (4) the actual deployed public
-- discovery function/query returning those items, and (5) Main App UI rendering.
-- This metadata inspection proves NONE of (2)-(5). No production correction authorized.
