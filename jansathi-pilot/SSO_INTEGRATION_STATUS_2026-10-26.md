# JanSathi isolated membership and SSO integration — 26 October 2026

## Implemented and verified (Free project only)
Target Supabase project: `zgjkzqfabbvctcjspvfd` — DBest JanSathi Pilot.
- `sql/012_entitlement_sync_identity_guard_and_audit.sql`: installed before/after triggers on `public.jansathi_member_entitlements`, immutable DBest member identity binding, bounded source verification timestamp, private metadata-minimised INSERT/UPDATE/DELETE audit, RLS-protected private audit table.
- Reversible test: active verified Promoter entitlement, rejected member identity change, rejected expired/future verification, suspension audited, deletion audited. Test transaction rolled back. Result PASS; zero records left.
- Reversible access test: verified Promoter passes news eligibility; suspended membership immediately loses access; Pending KYC and Starter never qualify. Result PASS; zero test records left.
- `sql/013_single_use_sso_handoff_nonce.sql`: installed private nonce-claim table and service-role-only `public.jansathi_claim_sso_handoff(text,timestamptz)` API. Exactly one claim allowed for a 64-char SHA256 nonce; invalid/expired/overlong requests rejected.
- Reversible nonce tests: first use true, replay false, expired false, >2min false, malformed false, anonymous/authenticated function execution denied. PASS, zero records left.
- Main DBest Pro database `ydedmotbacnllkijzmvp` has not been modified; Cab/Marketplace/payout flows are untouched.
- JanSathi approved side-by-side image tiles remain in the existing READY staging deployment.

## Not yet connected (blocking public launch)
1. DBest App Pro membership service is not accessible under the currently connected **DBest JanSathi** Supabase organization. The two project organizations cannot be accessed simultaneously through the present connector context.
2. DBest production member login uses an opaque session token in the source origin's browser localStorage; JanSathi's separate origin cannot read that token, and it must never appear in a URL. Source needs a reviewed same-origin server-verified handoff that emits a brief signed one-time assertion.
3. JanSathi needs to verify the signature, consume its newly added single-use nonce, and mint the distinct JanSathi Auth session with locked member linkage. The candidate `bridge/exchange.cjs` remains disabled and is NOT deployed as a working SSO endpoint.
4. DBest session expiry, logout, suspension, and KYC/payment revocation must propagate to JanSathi privilege checks without a 24-hour stale entitlement window; real-account E2E and rollback testing remain outstanding.
5. Verified residential identity/provenance (not just entered PIN) and independently validated public issue location are needed before local support votes are enabled.
6. Staging Vercel contains no server-side SSO environment keys. None should be exposed in browser code or pasted into chat.
7. Real email/password/OTP checks, moderation, two-user privacy/RLS browser tests, owner review, image evidence upload and all-tile DBest regression remain before public release.

## Operational status
**NO-GO for live public launch.** Draft GitHub PR #71 remains unmerged. The isolated JanSathi staging is available, but public reporting integration must not be represented as complete.
