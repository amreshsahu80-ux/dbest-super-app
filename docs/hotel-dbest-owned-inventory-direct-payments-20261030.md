# DBest Hotels: direct payment with DBest-managed room availability

**Customer journey**: Search destination/property and dates → see DBest contracted consumer price and available public OTA B2C references → select room → Book & Pay DBest → Razorpay-secured checkout → payment.captured verified server-side → hotel confirmation voucher and invoice in account/email.

No customer-to-hotel enquiry or customer mailto is part of the target workflow. The isolated prototype's old enquiry modal must be replaced when the real secure checkout backend is connected.

## Availability: DBest internal arrangement
- DBest Owner controls availability and holds/sales allocations. A live OTA/hotel API is **not required** for inventory. DBest must maintain real, fulfilable inventory internally.
- The *server* reads DBest's authenticated Owner-approved allocation and final tax-inclusive room quote; never trusts a `roomAvailable` flag or amount from the browser.
- A booking's hotel ID, check-in, check-out, room, rooms, guests, expiry, availability reference, price/INR, cancellation and meal terms must match the allocation.
- Allocations can be pre-approved in batches by DBest for instant customer checkout. Booking checkout must atomically hold/reduce inventory to prevent two guests paying for the last room.
- No inventory approval or expired allocation → do **not** create a Razorpay payment order or charge. If DBest cannot supply availability instantly, the customer should see Sold Out/Unavailable; no charge.
- The payment order should be created through DBest's merchant account server-to-server. Use the final all-inclusive consumer selling price (the hidden 5% Owner markup is already accounted for in the DBest tariff, never added again).
- Never treat a guest-side checkout success callback as payment confirmation. Verify signed webhook (raw request body), captured status, Razorpay order ID, amount in paise, INR currency and unique event; only then mark PAID.
- Voucher issuance requires paid booking and DBest's internally approved allocation reference. Cancellation/refund requires its own controlled workflow and audit, not silent success.
- Avoid exposing net supplier rates, Supabase service keys or Razorpay secret in client code.

## Code implemented and verified
- `hotel-review/dbest-inventory-gate.cjs` provides the server-side pure checkout readiness predicate.
- `hotel-review/razorpay-verification.cjs` verifies raw signed webhooks, captured payment status, matching order/amount/currency, and checkout callback HMAC.
- `tests/hotel-dbest-inventory-gate.test.cjs` (4 tests) and `tests/hotel-razorpay-verification.test.cjs` (3 tests) passed in isolated Node runner on 30 October 2026.
- `hotel-review/isolated-bookings-schema.sql` now includes an isolated private DBest allocation table and RLS; **not applied to existing Supabase or any production database**.

## Missing for production
1. A NEW isolated hotel-bookings Supabase project. Current only connected DB is `DBest Super Platform Test`; do not migrate hotel tables there. Cost tool quoted `amount:10, recurrence:monthly` for a new project in `DBest App` organisation, currency not returned in its payload. Project creation needs owner selection and cost approval.
2. Apply and audit schema ONLY to new approved hotel database. Owner authentication/claims, atomic inventory hold, idempotent booking creation, owner management UI and customer lookup/notifications must be built and tested.
3. Securely configure DBest Razorpay merchant **test-mode** keys and webhook secret in isolated Vercel project. Keys exist in other project scopes but must never be copied/printed. Validate test payment first; then obtain explicit approval for live mode.
4. Finish `/api/hotel-direct-checkout` order creation, bank reconciliations, webhook persistence, duplicate handling, refunds and voucher/invoice generation. The customer Pay button must not become active until these pass full end-to-end test.
5. Expand exact OTA mapping and imagery. Supplier contracted tariffs are not dates/terms-guaranteed room booking prices; do not claim unverified like-for-like savings.

**No main deployment, wallet, Cab, Marketplace, existing Supabase or live payment flow has been modified by this work.**
