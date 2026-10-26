# DBest → JanSathi SSO: isolated integration adapter (NOT ACTIVATED)

Status: **Code prepared on draft PR #71; NO live rollout**. Original `dbest4u.com`, existing Cab/Marketplace, payouts, and the DBest Pro database remain unchanged.

## Verified source evidence

- DBest's existing member login sends an OTP and stores a session token in `localStorage['dbest_member_live_token']`.
- The authoritative session table is `public.member_sessions_live` with `SHA-256` `token_hash`, `member_id`, and `expires_at`. Local browser `d2_session` is **NOT** authoritative.
- Member facts come from `public.onboarding_records`, `kind='member'`, `status='Active'`, `deleted_at is null`, `email_verified=true`, approved payment, and `payload.kyc_status` **exactly approved**.
- Fee tiers are Starter ₹0, Guest ₹49, Promoter ₹299, Prime ₹599, Leader ₹999. Starter and Guest cannot publish news, even if KYC is approved. Missing/Pending/Aadhaar Submitted KYC cannot authorize paid publication.
- Residence PIN and independently verified coarse home coordinates do **not** exist in the standard DBest member record. Do not infer or fabricate them.
- JanSathi Free Supabase project is currently inaccessible through the ChatGPT Supabase connector while DBest App Pro is selected.

## Prepared files (not deployed)

- `bridge/dbest-eligibility.cjs`: strict, fail-closed eligibility parsing and session-token shape/checksum helper.
- `bridge/exchange.cjs`: server-only validation of DBest session hash/expiry, member/KYC facts, duplicate identity rejection, JanSathi Auth session and server-controlled entitlement insertion.
- `bridge/dbest-eligibility.test.cjs`: positive/negative eligibility regression scenarios.

Bridge has no browser-exposed service-role keys. Admin DBest access is used **read-only**; all writes are limited to the isolated JanSathi Auth + entitlement backend. It does not modify the main DBest session, account, member hierarchy, payment, or payout records.

**Security restriction:** This bridge is an unactivated candidate. Before enabling, code-review all admin Auth API calls, confirm magic-link token-hash flows with a real test member, record identity linking/audit evidence, add rate limits, implement robust logout/session-revocation propagation, and ensure no identity/kYC data is logged. The provider's existing long-lived DBest session and JanSathi independent refresh token require a unified revocation design.

## Configuration — secure server runtime only, never browser

- `DBEST_PRO_SUPABASE_URL` — official DBest App Pro project URL
- `DBEST_PRO_SERVICE_ROLE_KEY` — read-only **use only temporarily for isolated server staging**; replace with least-privilege dedicated signed member-assertion endpoint for production (the service role is powerful, not inherently read-only).
- `JANSATHI_SUPABASE_URL` — existing isolated JanSathi project URL
- `JANSATHI_SERVICE_ROLE_KEY` — secret only in isolated backend, never in JavaScript
- `JANSATHI_ALLOWED_ORIGIN` — one exact approved origin

**No secret is committed to GitHub.** The GitHub branch is intentionally isolated and must not be merged to `main`.

## Same-origin prerequisite

The DBest session token is stored in localStorage on `dbest4u.com` and **cannot be read from a separate staging hostname**. A real unified-login journey needs a server-verified same-origin handoff route on an isolated preview with an approved authenticated handoff, then an explicit Owner-approved live release. Do **not** put a member session token in a URL query string/fragment, send it in an email, or instruct users to copy it into the staging site.

The JanSathi backend currently signs in separate pilot Supabase Auth users; the cross-project Auth exchange must produce a real `auth.users` identity to satisfy existing RLS checks and must not rely on `user_metadata` or a client-selected tier.

## Test evidence

- 4 isolated pure entitlement checks passed in the tool runtime: verified Promoter, Pending KYC, unverified email, Guest denial.
- 7 synthetic bridge-response checks passed: GET rejected, wrong origin rejected, invalid bearer rejected, revoked session rejected, valid mock accepted, Pending KYC not elevated, conflicting member ID rejected.
- No real membership data, DBest session, or JanSathi user was changed during these tests.

## GO / NO-GO gates

1. Connect the JanSathi Free Supabase org in a separate authorized session or compatible read-only connector; verify project URL and service config without losing production access.
2. Deploy bridge **only to isolated staging**, add server-only secrets through Vercel UI, and verify unauthenticated and malicious requests fail closed.
3. Run genuine member sign-in and complete JanSathi Auth exchange with approved/denied test identities; test email update and member ID collisions; test source logout/revocation.
4. Implement trusted residence PIN validation and geocoding with KYC-backed provenance; keep support votes locked until this is verified.
5. Full JanSathi E2E: citizen followups, Owner review/national promotion, new issue location, abuse controls, 24h entitlement freshness, rate-limit safeguards.
6. Full **all-tile** DBest regression; production rollback plan; Owner's explicit **GO** before any main merge or public deployment.

**Release state: NO-GO.** 
