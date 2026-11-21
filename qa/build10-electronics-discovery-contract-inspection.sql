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


-- Materialized views are absent from pg_views; inspect them separately to avoid
-- falsely concluding that no cached catalogue/category projection exists.
SELECT schemaname, matviewname, definition, ispopulated
FROM pg_catalog.pg_matviews
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND (matviewname ILIKE '%catalog%' OR matviewname ILIKE '%categor%')
ORDER BY schemaname, matviewname;

-- Read the RLS policy definitions governing discovery source tables.
-- This does not test effective permissions for the Main App's runtime role.
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('marketplace_vendors_live', 'marketplace_catalog_live', 'app_settings')
ORDER BY tablename, policyname;

-- Inspect only schema contracts for the vendor/catalogue join and registry fields.
SELECT table_schema, table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('marketplace_vendors_live', 'marketplace_catalog_live', 'app_settings')
  AND column_name IN ('id','vendor_id','type','market_type','active','stock',
                      'profile_meta','owner_approval','agreement_status',
                      'operational_hold','key','value')
ORDER BY table_name, ordinal_position;


-- Runtime exposure audit: policy definitions alone cannot show whether RLS is
-- enabled/forced or whether the anonymous/authenticated roles have SELECT.
-- These are metadata checks only, not proof that a user can see Samsung Point.
SELECT n.nspname AS schema_name, c.relname AS relation_name,
       c.relkind AS relation_kind, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced,
       CASE WHEN to_regrole('anon') IS NOT NULL
            THEN has_table_privilege('anon', c.oid, 'SELECT') ELSE NULL END AS anon_select,
       CASE WHEN to_regrole('authenticated') IS NOT NULL
            THEN has_table_privilege('authenticated', c.oid, 'SELECT') ELSE NULL END AS authenticated_select
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('marketplace_vendors_live', 'marketplace_catalog_live', 'app_settings')
ORDER BY c.relname;

-- Function execution grants for catalogue/category RPCs; privileges do not
-- bypass row policies, and SECURITY DEFINER functions require separate review.
SELECT n.nspname AS schema_name, p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       p.prosecdef AS security_definer,
       CASE WHEN to_regrole('anon') IS NOT NULL
            THEN has_function_privilege('anon', p.oid, 'EXECUTE') ELSE NULL END AS anon_execute,
       CASE WHEN to_regrole('authenticated') IS NOT NULL
            THEN has_function_privilege('authenticated', p.oid, 'EXECUTE') ELSE NULL END AS authenticated_execute
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (p.proname ILIKE '%public_catalog%'
       OR p.proname ILIKE '%marketplace%catalog%'
       OR p.proname ILIKE '%category%')
ORDER BY p.proname, identity_arguments;

-- Discover whether public catalogue/category views depend on vendor/catalogue
-- tables. A view name alone is not evidence that the Main App reads that table.
-- This is a dependency map, not an execution of the discovery query.
SELECT DISTINCT source_ns.nspname AS source_schema,
       source.relname AS source_relation,
       dependent_ns.nspname AS dependent_schema,
       dependent.relname AS dependent_view,
       dependent.relkind AS dependent_kind
FROM pg_catalog.pg_rewrite rewrite_rule
JOIN pg_catalog.pg_class dependent ON dependent.oid = rewrite_rule.ev_class
JOIN pg_catalog.pg_namespace dependent_ns ON dependent_ns.oid = dependent.relnamespace
JOIN pg_catalog.pg_depend dependency ON dependency.objid = rewrite_rule.oid
JOIN pg_catalog.pg_class source ON source.oid = dependency.refobjid
JOIN pg_catalog.pg_namespace source_ns ON source_ns.oid = source.relnamespace
WHERE dependent.relkind IN ('v', 'm')
  AND dependent_ns.nspname = 'public'
  AND source_ns.nspname = 'public'
  AND source.relname IN ('marketplace_vendors_live', 'marketplace_catalog_live', 'app_settings')
  AND source.oid <> dependent.oid
ORDER BY source_relation, dependent_view;


-- View security context matters: ordinary PostgreSQL views can evaluate source
-- table permissions/RLS as the view owner, whereas security_invoker views use
-- the calling role. Inspect view options and ownership before interpreting RLS.
-- This is metadata-only and does not evaluate the view or expose vendor records.
SELECT n.nspname AS schema_name, c.relname AS view_name,
       c.relkind AS view_kind,
       pg_get_userbyid(c.relowner) AS view_owner,
       COALESCE('security_invoker=true' = ANY(c.reloptions), FALSE) AS security_invoker,
       COALESCE('security_barrier=true' = ANY(c.reloptions), FALSE) AS security_barrier,
       c.reloptions AS view_options
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('v', 'm')
  AND (c.relname ILIKE '%catalog%' OR c.relname ILIKE '%categor%')
ORDER BY c.relname;

-- Acceptance must separately demonstrate (1) an active registry Electronics key,
-- (2) Samsung Point VND8597199 approved/signed/active with persisted Electronics,
-- (3) eligible active in-stock catalogue items, (4) the actual deployed public
-- discovery function/query returning those items, and (5) Main App UI rendering.
-- This metadata inspection proves NONE of (2)-(5). No production correction authorized.
