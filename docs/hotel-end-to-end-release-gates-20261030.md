# DBest Hotels — end-to-end hardening checkpoint (30 Oct 2026)

## Working and tested in isolation
- Existing separate hotel preview, never `dbest4u.com`, still uses 253-property supplier snapshot and 4,958 received tariff lines. Customer-rate references apply the private 5% Owner setting. Supplier reference alone does **not** guarantee room inventory, final taxes, or booking.
- Google Hotels public pre-login B2C Chrome adapter retrieves provider rows **only** for 3 identity-matched mapped properties: Hotel Nandan, Vivanta Guwahati, Ginger Agartala. The exact stay/2-adult/1-room page header is confirmed before showing numbers. Do not claim same-room tax-inclusive savings until independently verified.
- Wikimedia photo CSP allows all actual redirect hosts; source/credit/license is displayed for verified photos, genuine hotel-identity-matched mappings prioritized, and labeled placeholders shown for other hotels.
- Local real Chromium smoke at desktop 1340px: **5/5 featured photographs loaded** (each `naturalWidth>0`); at mobile 390px: no horizontal overflow or script errors, first three photos loaded in viewport; two offscreen lazy-load images not yet loaded at capture. This verifies page source behavior, not remote preview CDN delivery.
- Guest email-enquiry form captures name/email/phone, checks valid fields, constructs a mailto message and copyable text. Chromium desktop 1360px and mobile 390px smoke: dialog opened, guest details composed with correct line breaks, email link shown, no JS errors or overflow. **Only the customer manually sending email transmits an enquiry.** No backend reservation record or automatic notification is claimed.
- Live OTA freshness guard: page invalidates rates on stay/guest changes, checks that response matches the current selection, and never displays stale rate for another stay. Real browser test verified correct-stay rate, cleared rate on date change and ignored a late response (no script errors).
- New pure `hotel-review/booking-lifecycle.cjs`: statuses REQUESTED → QUOTED → HOTEL_CONFIRMED → PAYMENT_PENDING → PAID → VOUCHER_ISSUED → COMPLETED (with cancellation rules). Invalid dates/guest/contact, owner-only quote, tax-inclusive final quote, confirmed inventory, payment amount matching, signed gateway webhook and verified hotel voucher are *all* release requirements. `tests/hotel-booking-lifecycle.test.cjs` passed **4/4** locally, zero fails.

## HARD NO-GO for commercial public bookings
1. **Durable isolated booking backend:** No separate hotel Supabase/other database has been provisioned. The existing DBest Super Platform database is frozen and must not be used as a shortcut. Need server-side reservations, idempotent writes, audit logs, PII retention policy, owner auth, customer private status lookup.
2. **Availability and final hotel terms:** Outreach supplier tariffs are not live inventory. Need supplier availability confirmation and exact room, meal, tax-inclusive total, cancellation terms and voucher/ref before payment.
3. **Payment gateway:** No isolated customer hotel Razorpay/PayU checkout or verified webhook binding is deployed. Never accept unverified client payment success, create unpaid vouchers, or reuse existing wallet/payout settlement flows without release approval.
4. **OTA supplier matching:** 3 mapped properties, ~250 pending exact Google hotel identity mapping. Browser compute has cost at scale, and current per-instance lookup limit is **not a distributed budget cap**. Need a centralized budget/rate limit, reliability monitoring and commercial-usage permission review before broad deployment.
5. **Images:** Only a small number of contracted properties have licensed, actual hotel photos. Most catalogue entries honestly show placeholders; do not borrow another hotel's picture or scrape copyrighted photos into production.
6. **CI:** Existing isolated workflow covers guest/owner/rate/photo/browser/booking policy tests; end-to-end test run passing on a fresh CI agent still needs verification. Do not merge draft PR #72 before release checks.

## Scope
All changes reside on `feat/hotel-rate-compare-isolated-20261027` / draft PR #72 and unaliased isolated `dbest-hotel-review-preview` project deployments. No `dbest4u.com` changes, no Cab/Marketplace/deeplink changes, no new payouts, no payment collection and no real guest booking creation.

## Next action dependencies
- Select and authorize a **separate** hotel bookings database destination, plus any quoted nonzero creation cost. Do not repurpose the frozen main platform Supabase project.
- Confirm hotel supplier inventory/confirmation operational process and Owner-only final quotation workflow.
- Connect hotel payment service with server-side signed webhook, order-id/amount verification and refund handling, then test paid-to-voucher lifecycle with approved test-mode transactions.
- QA bookability, image/copyright compliance and distributed OTA browser cost under load; promote only after release sign-off.
