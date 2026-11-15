# DBest development continuity checkpoint — 2026-11-15

Purpose: Resume work without redoing approved functionality. This is a status log, NOT a deployment authorization.

## Frozen/protect
- Main DBest app is published. Preserve live website, Cab booking/search, Marketplace quotation flow, deep links, member onboarding/payouts and existing functioning features.
- Partner app submission is in Google Play review (screenshot 2026-11-15). Do not withdraw/resubmit without approval.
- Owner retains direct onboarding/approval bypass for member, vendor, Vaahak and service partner per existing approved business rules.
- Separate states: specified ≠ coded ≠ QA verified ≠ production deployed.

## Ride QA (Nov 15)
- Customer app created rides TX74172759584 and TX74379244166; both expired with zero offers while GPS stale and preferences initially disabled.
- Rahul Kumar, Vaahak ID VHK32888564049, bike JH067828, approved, signed, online.
- Work preference toggles were successfully persisted: rides, deliveries, marketplace, carpool ON. Verify fresh state before next QA.
- GPS blocker found: vaahak-standalone-v2.html had empty ensureGps(); fixed in isolated PR #157, commit d3bcbf8. Preview successfully sent new GPS coordinates to Supabase at 12:07:01 UTC. NOT in installed Android app.
- Preview URL: https://dbest-super-u5l2fihq5-db-est.vercel.app/vaahak-standalone-v2.html (preview ready during QA).
- Third ride TX74466142018, job VJ74466272225, ₹31 cash, bike, 4.02km. Dispatch offered Rahul on first attempt. GPS and offer assignment PASSED.
- Rahul's preview displayed Accepted and Enter Ride PIN. Customer remained Finding Vaahak, never showed PIN. Database subsequently showed Expired, assigned_partner_id NULL, accepted_at NULL, started_at NULL. Acceptance is NOT confirmed; do not claim ride succeeded.
- NEXT: trace accept_offer request/response and backend status; prevent UI optimistic/stale Accepted, reconcile with server; ensure customer PIN only after accepted. Test ride PIN/start/completion/payment/invoice.
- Do not reuse expired ride or reveal stored PIN. Do not book again until acceptance fix verified.

## Marketplace
- End-to-end vendor acceptance, preparation, handover, Vaahak delivery, payment and completion NOT YET TESTED in this round. Test after ride acceptance issue.
- Rahul delivery eligibility was enabled during QA, but verify it again before delivery testing.

## Android / Play
- DBest Main published. Partner changes in review as of Nov 15.
- Play notice: outdated androidx.fragment:fragment:1.1.0 reported for Partner 1.0.2 release 6. Check if current build still includes it; upgrade compatible stable AndroidX version in next verified build, not blindly.
- Upcoming Partner Build 11 must include tested GPS fix and acceptance fixes. Preserve signing key/package identity and test separately before Play upload.
- UI polish/Partner app icon changes previously deferred; don't block critical QA on icon.

## Authentication
- Single-device + persistent login requirement across Member, Vendor, Vaahak, Service Partner.
- PR #158 staged session uniqueness SQL, RPC and Vaahak auth source; NOT deployed or tested across all roles. Preserve live logins; no forced logout without QA.
- Requirement: new login revokes previous device; app remains logged in across restarts, secure renewal and explicit logout, security exceptions.

## Branches/PRs
- PR #157: fix/vaahak-preferences-sync-20261115 — preferences + GPS preview, unmerged.
- PR #158: feat/single-device-session-policy-isolated-20261115 — staged auth, unmerged.
- Main branch/production unchanged by these isolated PRs.

## Resume order
1. Verify latest branch/deployment state and inspect acceptance logic.
2. Fix accepted-state mismatch, confirm backend accepted_at and customer PIN.
3. Complete one ride E2E and invoice.
4. Complete one marketplace delivery E2E.
5. Merge only validated fixes into Android build, QA, and plan Play submission without disrupting current review.
6. Continue other approved workstreams separately; never redo finalized features unless a regression is confirmed.
