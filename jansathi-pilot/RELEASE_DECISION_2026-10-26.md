# DBest JanSathi — release readiness decision (26 October 2026)

**Decision: NO-GO for public deployment or merge into `dbest4u.com`.**

Owner approved pursuing final polish and live deployment, but functional launch safety gates **have not passed**. This file documents actual verified status and prevents accidental release of unfinished membership/abuse/location workflows.


## Staging visual polish verification — 26 October 2026 evening

- Resolved composite-image crop bleed: `Report a Problem` shows the left-hand road photograph; `Report a News` shows the right-hand school-event photograph, with both cards side by side on narrow mobile screens.
- GitHub source commits `2898d66d` (CSS) and `a15e448b` (regression assertions) on isolated JanSathi feature branch; CI workflow extended at `d0928bff` to execute visual/static release smoke checks on future commits.
- Rebuilt staging Vercel `dpl_En4qjiTcSLNVCvGe3dA14epwFzWJ` — READY. Verified HTTP 200 for both landing HTML and updated CSS at `https://dbest-jansathi-staging.vercel.app`. No real-account browser E2E was performed.
- Main DBest production `dpl_G7xwtaNKs7mq8LMJRTC57x5jPXwZ` remains unchanged. This is **not** a production GO; blocking identity, residence, news moderation, E2E and rollback criteria below continue to apply.

## Verified achievements

- Approved home UI: **two large side-by-side image tiles** (Report a Problem and Report a News) with mobile two-column layout; embedded WebP composite image means neither tile needs an external image host. Sample image caption states illustrative content.
- Current JanSathi staging: https://dbest-jansathi-staging.vercel.app, Vercel READY deployment `dpl_En4qjiTcSLNVCvGe3dA14epwFzWJ`.
- JanSathi Free Supabase project `zgjkzqfabbvctcjspvfd` is healthy with RLS-backed private submissions and public filtered feeds.
- Static review: **10/10 checks passed** on homepage, image assets, mobile layout, UI element references, login/news gates, preservation of owner controls and JavaScript syntax.
- Reusable no-dependency smoke regression test added at `jansathi-pilot/tests/release-smoke.cjs`.
- DBest production Vercel `dbest-super-app` remains unchanged at `dpl_G7xwtaNKs7mq8LMJRTC57x5jPXwZ`. Cab, Marketplace, Insurance, Travel, MF and membership/payout flows were **not changed or tested end-to-end** in this release check.

## Verified failures / blockers

1. JanSathi user auth count **0**, server-linked DBest member entitlements **0**; no live user identity handoff. Existing DBest session is bound to its own origin; cross-domain token access must not be faked. The isolated handoff adapter exists only in draft PR #71 with `JANSATHI_BRIDGE_ENABLED` disabled by default and no Vercel server env configuration. No real SSO success tested.
2. Trusted verified resident locations **0** and independently verified public issue sites **0**. No residence provenance from production DBest KYC yet. Distance-based support correctly stays locked.
3. Unfinished moderation, abuse-response and public-safety controls; first-pass keyword/PII filter is not sufficient to launch public news.
4. Real cross-user browser/API tests, email verification, session revocation, image upload permissions, and full end-to-end flows have **not** been verified.
5. Production DBest regression across known-working sections and rollback drill have **not** been run.

Supabase's security advisor had only four informational `rls_enabled_no_policy` notices on internal, non-client-exposed tables; **no critical finding was observed**, but advisor checks alone do not establish a production GO.

## Next scoped engineering sequence

1. Establish a server-side DBest member assertion limited to necessary read-only claims (member ID, tier, account/OTP/email-verification, payment, KYC approval, expiry) rather than passing service-role keys into a public client. No production payout or member records are modified.
2. Configure a secure, **staging-only**, disabled-default backend exchange with authentication, TTL, rate limiting, nonce/CSRF safeguards, session revocation and duplicate-identity handling.
3. Test real isolated JanSathi Auth users, reject Guest/Starter for news, reject unverified paid accounts, and test cross-user privacy/Owner roles. Never request members to copy session tokens.
4. Add trusted residence verification and coarse geospatial mapping with audit, consent, and owner-reviewed public-issue coordinates; prove allowed/disallowed distances under SQL and browser flows.
5. Complete public moderation, reporting and takedown; run multi-user phone/browser tests, sample-to-real-data transitions, load/rollback checks.
6. Confirm all previously frozen DBest Cab/Marketplace/deeplink/membership/payment flows with regression evidence. Obtain an explicit second GO once the actual checks pass. Then merge scoped JanSathi code and deploy using a controlled release, not by promoting a preview blindly.

## Guardrails

- Do not merge draft PR #71 or deploy to production while this NO-GO remains.
- Do not assert that static tests establish public login or location functionality.
- Keep the working staging alias and live `dbest4u.com` untouched.
- Do not expose Supabase service-role keys, original DBest sessions, resident coordinates, or private report contacts in UI/URLs/logs.
