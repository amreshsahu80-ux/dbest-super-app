# JanSathi live release gate — 26 Oct 2026
**Decision: NO-GO for public functional release** (Owner approval to proceed is acknowledged; the technical release prerequisites remain unmet).


## Staging visual polish verification — 26 October 2026 evening

- Resolved composite-image crop bleed: `Report a Problem` shows the left-hand road photograph; `Report a News` shows the right-hand school-event photograph, with both cards side by side on narrow mobile screens.
- GitHub source commits `2898d66d` (CSS) and `a15e448b` (regression assertions) on isolated JanSathi feature branch; CI workflow extended at `d0928bff` to execute visual/static release smoke checks on future commits.
- Rebuilt staging Vercel `dpl_En4qjiTcSLNVCvGe3dA14epwFzWJ` — READY. Verified HTTP 200 for both landing HTML and updated CSS at `https://dbest-jansathi-staging.vercel.app`. No real-account browser E2E was performed.
- Main DBest production `dpl_G7xwtaNKs7mq8LMJRTC57x5jPXwZ` remains unchanged. This is **not** a production GO; blocking identity, residence, news moderation, E2E and rollback criteria below continue to apply.

## Verified on 26 Oct 2026
- **JanSathi UI PASS:** two side-by-side image tiles, “Report a Problem” and “Report a News”, with embedded WebP visual sources and no external image host dependency.
- **Staging Vercel PASS:** `dbest-jansathi-staging.vercel.app` points to READY deployment `dpl_En4qjiTcSLNVCvGe3dA14epwFzWJ`.
- **Production regression protection PASS (baseline only):** DBest project `dbest-super-app` production deployment remains `dpl_G7xwtaNKs7mq8LMJRTC57x5jPXwZ`. No edits to Cab, Marketplace, payments, members or payouts.
- **Source isolation PASS:** JanSathi PR #71 remains **draft, unmerged**.
- **JanSathi backend PASS for availability:** Free Supabase project `zgjkzqfabbvctcjspvfd` ACTIVE_HEALTHY. RLS enabled on civic, news, entitlements, support, and private residence/issue-site tables.
- **Supabase security advisory:** four INFO "RLS enabled/no policy" findings in deliberately private `jansathi_internal` tables. These do not, by themselves, establish that public role privileges are safe: review grants and role checks before release.

## BLOCKING (all required)
1. **Trusted DBest member SSO:** zero entitlements linked. The exchange bridge is unactivated, not deployed, and defaults disabled. Source DBest token exists under the `dbest4u.com` origin and cannot be read on staging. Never pass member session tokens in URL or browser-to-other-origin unauthenticated calls. Use an approved same-origin signed one-time handoff, server-side membership lookup, rate limiting, session revocation and logout propagation; real member tests required.
2. **Member eligibility/KYC:** zero linked paid members; approved KYC + live membership must be established server-side before news publishing. Starter/Guest denied news publishing. No client-selected tier.
3. **Trusted residence/issue verification:** zero independently verified residences and zero verified public issue sites. Support-radius voting must remain locked until genuine documented residential provenance and independent public-site verification.
4. **Real-auth HTTP/browser tests:** signup/login/OTP/session refresh, two-account private data isolation, news held/published, problem creation, My Reports, logout, support limits, Owner approvals, rate limits, media upload/privacy and mobile flow are not proven in a real end-to-end environment.
5. **News abuse, complaint handling and legal moderation:** human review, flag/takedown response and audit retention must be operational. JanSathi does **not** send reports to government departments; no automatic official acknowledgement should be promised.
6. **DBest production regressions:** all frozen Cab, Marketplace, Travel, Insurance, Mutual Funds, member onboarding, referrals, payments/payouts must pass smoke tests against reviewed release candidate before any main merge.
7. **Rollback/monitoring:** attach a reviewed production build, health checks, error monitoring, rollback owner and explicit release verification.

## Safe current release state
- Continue offering the existing **clearly labeled pilot** UI on `https://dbest-jansathi-staging.vercel.app` with its current RLS restrictions.
- Never silently relabel the pilot as generally available.
- Do **not** merge PR #71, point `dbest4u.com` at this module, assign a public production domain, enable bridge secrets, or activate government submission until every blocking condition is resolved and reverified.
- User requested release; this document records the objective reasons the full launch has been held, not a withdrawal of the user's approval.

## Required next action
Implement the dedicated trusted cross-origin/same-origin identity handoff **without changing frozen flows** on an isolated DBest preview, connect the JanSathi member-entitlement sync, and run real accounts and abuse/privacy E2E. Then revisit live deployment.
