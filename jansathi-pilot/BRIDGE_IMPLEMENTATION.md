# JanSathi / DBest verified identity bridge — engineering handoff
**As of 25 October 2026: PREPARED, NOT DEPLOYED OR PRODUCTION ENABLED.**

## Verified source and schema
- Original DBest App Pro Supabase project: `ydedmotbacnllkijzmvp` (read-only inspection only).
- Existing DBest UI authenticates using `member-login-live` email OTP and stores a 72-character two-UUID session token in browser storage under `dbest_member_live_token`.
- The real DBest token is SHA-256 hashed into `member_sessions_live.token_hash` with `member_id` and `expires_at`.
- The authoritative membership *candidate* row resides in `onboarding_records` (`kind='member'`, `external_id`, `category`, `status`, `payment_status`, `email_verified`, `deleted_at`, `payload`). It is **not a sufficient authorization record alone**, because public onboarding INSERT and human-readable approval fields exist.
- Confirmed tiers/fees: Starter ₹0, Guest ₹49, Promoter ₹299, Prime ₹599, Leader ₹999.
- IMPORTANT: the existing `member-login-live` response defaults missing `payload.kyc_status` to `Approved`. **Never trust that display value** as proof of verified KYC. Real source contains members with missing/pending KYC.
- News publishing additionally requires independently validated owner/KYC review plus a trusted payment or activation verification. Do not count `status='Active'`, client-submitted `payment_status='Approved'` or client-originated `payload.kyc_status` alone.
- For civic-support residence, a user-entered city, PIN, current GPS or mere postal match does not prove residence. Trusted geocoded residence must be independently verified and kept private.

## Built and verified in draft branch only
- `bridge/eligibility-core.js`: fail-closed paid publisher and residence-attestation gates; never returns personal documents.
- `tests/eligibility.test.js`: 19 regression assertions passed with isolated module harness.
- `bridge/dbest-readonly-session.js`: server-only, fixed-origin two-query read-only Pro session verification. Uses the existing token's SHA-256; projects only sanitized KYC status using PostgREST JSON path. No source database writes and no JanSathi JWT issuance.
- `tests/member-session.test.js`: mocked REST checks for missing credentials, invalid/missing/expired sessions, strict source and minimum-data projection.
- JanSathi staging UI `https://dbest-jansathi-staging.vercel.app` is live separately; **this new bridge source has not been deployed**.
- No DBest existing membership, Cab, Marketplace, Insurance, Travel, MF, payout or wallet source code changed.

## Next implementation sequence (requires both isolated environments)
1. Establish separate server secrets without surfacing them in browser or chat: use Vercel staging project environment config for DBest Pro server credentials and JanSathi backend credentials; browser must use only publishable key. Staging currently reports **zero configured server environment variables**.
2. Create a production-*unattached* server-to-server identity adapter with non-forgeable, short-lived one-time exchange and request logs excluding raw session tokens. Never put the long-lived DBest token in a URL or a cross-origin browser query.
3. On Pro side, independent activation verification must check a trusted settlement/Owner review source; KYC must have trusted human/identity audit provenance. If source cannot establish either, deny paid publishing.
4. Only then map one **verified DBest member ID → one JanSathi Auth identity** (proof of email control, no duplicate local signup) with replay protection and explicit logout behavior.
5. Write only minimum entitlement values to JanSathi `jansathi_member_entitlements`, valid at most 24h, and verified residences only after trustworthy geocoding/consent.
6. Prove revocations/expired accounts, Starter/Guest civic limits, paid news privileges, PIN cross-boundary distance support, no self support, Owner-only promotion, abuse/reports, and real-device flows.
7. Check Pro and JanSathi DB Security Advisors; red-team credentials, RLS and content moderation. Regress every pre-existing DBest service before release.
8. **Owner explicitly approves GO** before any `main` merge, dbest4u.com route, Pro Edge Function deployment or live Vercel promotion.

## Critical operational boundaries
- The Supabase connector can currently inspect **DBest App Pro only**, not the JanSathi Free organization at the same time.
- Staging is a separate Vercel project. Do not create additional paid projects or move the pilot migrations into DBest Pro.
- The prepared reader is not a deployable SSO feature on its own. **NO-GO remains until server credentials, identity handoff and real E2E pass.**
