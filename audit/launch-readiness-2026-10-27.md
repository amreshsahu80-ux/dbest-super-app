# DBest Super Platform — Launch Readiness Audit (2026-10-27, 09:38–10:00 IST)

**Release gate: NO GO.** Evidence from connected read-only Supabase, Vercel, GitHub and the OpenStreetMap Foundation's official Nominatim usage policy. This audit is not a live browser/Android E2E or independent Razorpay settlement verification.

## New verified finding — Cab preview fallback violates public Nominatim request policy

- The isolated audit branch's `api/runtime-config.js` defines `nominatimFallback`, with five location-bounded category searches (`hospital`, `railway station`, `bus station`, `college`, `park`) dispatched **concurrently** using `Promise.allSettled(searches.map(...fetch(...)))` to `https://nominatim.openstreetmap.org/search`. The route also calls this fallback concurrently with Google Places and Overpass providers using `Promise.any`.
- The public Nominatim policy states an **absolute maximum of 1 request per second per application**, encourages caching, and explicitly prohibits systematic queries to download POIs in an area. A five-request concurrent fallback has no global throttle or persistent per-place caching, so it is not suitable for a public-launch Cab Nearby Places fallback. Source: https://operations.osmfoundation.org/policies/nominatim/ .
- **Scope:** this is a confirmed source-level issue on the **isolated audit branch**; it is **not evidence of a live production violation**. The code was not modified because removing or replacing a fallback in the frozen Cab flow requires a controlled preview E2E and provider-compliance review. Do not promote this branch as-is. Prefer a provider authorized for production POI search, or a compliant self-hosted/contracted service with application-wide rate limiting, caching, attribution, and suitable terms.
- The latest static Cab CI success (2026-10-26, run `40265489312`) covers static regression guards, **not** provider usage compliance, Android Nearby Places or real rides. https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/40265489312

## Current read-only access and release evidence

- **Supabase audit access remains blocked:** `list_projects` exposes only JanSathi Pilot `zgjkzqfabbvctcjspvfd` (ACTIVE_HEALTHY). `get_project` and read-only `execute_sql` against the original DBest production project `ydedmotbacnllkijzmvp` both returned **permission denied** on 2026-10-27. No original production database balances, policies, RPC grants, or recent transactions were freshly verified. Do not substitute JanSathi data.
- **Production alias:** Vercel `get_alias('dbest4u.com')` still maps to deployment `dpl_G7xwtaNKs7mq8LMJRTC57x5jPXwZ`, `READY`, production commit `e5a1bbe0a36ed41d9d7099e55d5f17e5063d8eda` from `feat/homejobs-customer-dashboard-20261020`. No production release change established today. https://vercel.com/db-est/dbest-super-app/G7xwtaNKs7mq8LMJRTC57x5jPXwZ
- **Audit-branch CI:** 2026-10-26 workflow `40265489312` completed SUCCESS; its sole job `cab-static-check` ran static Cab regression guards. Not an E2E pass.

## Unresolved historical blockers — NOT reverified today

1. Three anonymously callable elevated-privilege Marketplace checkout RPCs lack verified authenticated caller-to-member binding; prior SQL evidence dated 2026-10-25. Requires safe isolated remediation and negative authorization tests.
2. Twelve Paid Marketplace masters with zero child orders and zero order value, linked to ₹3,840 in internally Verified Razorpay-labelled transactions; cannot classify as settled or QA without independent gateway evidence.
3. Historical Razorpay-labelled total: 22/₹7,296, of which 21/₹6,896 have payment/order IDs and 1/₹400 is a QA-labelled entry without IDs. **No independent Razorpay gateway reconciliation**.
4. Historical wallet: nine member wallets reconciled; approved Vaahak at −₹45 reconciled; rejected QA account has ₹9 mismatch. No fresh 2026-10-27 database checks or financial writes.
5. Development database branch previously `MIGRATIONS_FAILED`; Cab Android Nearby Places, Cab/Vaahak completion, Marketplace checkout/quotation, payouts, idempotency, rollback plan and public-launch signoff lack current comprehensive E2E evidence.

## Safe next actions and constraints

- Restore **scoped read-only access** to original DBest production Supabase project, without touching JanSathi; rerun wallet, payout, RPC grants, order and internal transaction queries.
- Reconcile transaction IDs directly against authorized Razorpay payment and settlement records before any refunds, wallet entries, or order repairs.
- Replace/disable the noncompliant Nominatim fallback only after a controlled isolated preview plan with regression tests; do not change working production Cab or Marketplace.
- Keep PayU unchanged. No SQL writes, gateway charges, refunds, payout adjustments, real bookings, schema/Edge Function changes or production deployments were performed in this audit.

**Decision: NO GO.** Production release safety, authorization, reconciliation, and actual end-to-end behavior remain unproven.
