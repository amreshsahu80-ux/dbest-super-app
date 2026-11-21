-- DBest single-device session enforcement — REVIEW BEFORE APPLYING.
-- Not applied to live Supabase. Preserve existing sessions.
-- Current read-only inspection: 30 member, 5 vendor, 2 vaahak, 1 partner
-- sessions, with zero duplicate account IDs (2026-11-15).
-- Preflight: abort if any duplicate account IDs exist.
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.member_sessions_live GROUP BY member_id HAVING count(*)>1)
 OR EXISTS (SELECT 1 FROM public.marketplace_vendor_sessions_live GROUP BY vendor_id HAVING count(*)>1)
 OR EXISTS (SELECT 1 FROM public.vaahak_sessions_live GROUP BY partner_id HAVING count(*)>1)
 OR EXISTS (SELECT 1 FROM public.partner_sessions_live GROUP BY account_id HAVING count(*)>1)
 THEN RAISE EXCEPTION 'Duplicate sessions: review and reconcile before unique indexes'; END IF;
END $$;

-- One session row per account. Unique indexes also protect against races.
CREATE UNIQUE INDEX IF NOT EXISTS member_sessions_one_per_account
 ON public.member_sessions_live(member_id);
CREATE UNIQUE INDEX IF NOT EXISTS vendor_sessions_one_per_account
 ON public.marketplace_vendor_sessions_live(vendor_id);
CREATE UNIQUE INDEX IF NOT EXISTS vaahak_sessions_one_per_account
 ON public.vaahak_sessions_live(partner_id);
CREATE UNIQUE INDEX IF NOT EXISTS partner_sessions_one_per_account
 ON public.partner_sessions_live(account_id);

-- Edge login handlers MUST be upgraded to atomic upsert with ON CONFLICT
-- (account ID) DO UPDATE SET token_hash=excluded.token_hash,
-- expires_at=excluded.expires_at, created_at=now().
-- DO NOT deploy these indexes before upgrading all four login handlers.
-- Renewal: update expires_at only when authenticated token hash matches
-- and existing expires_at > now(); cap to an approved absolute expiry.
-- Logout: delete where account_id and token_hash match; do not revoke
-- another device's session.
