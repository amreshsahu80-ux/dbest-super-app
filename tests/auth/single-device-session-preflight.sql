-- READ-ONLY preflight for the single-device login rollout.
SELECT 'member' AS role, count(*) AS sessions, count(DISTINCT member_id) AS accounts
 FROM public.member_sessions_live
UNION ALL SELECT 'vendor',count(*),count(DISTINCT vendor_id)
 FROM public.marketplace_vendor_sessions_live
UNION ALL SELECT 'vaahak',count(*),count(DISTINCT partner_id)
 FROM public.vaahak_sessions_live
UNION ALL SELECT 'partner',count(*),count(DISTINCT account_id)
 FROM public.partner_sessions_live;
-- Invariant: sessions=accounts for each role before/after deployment.
-- Additional E2E tests must cover session replacement, renewal and push revocation.
