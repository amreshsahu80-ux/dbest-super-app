# DBest Hotels broader end-to-end milestone — 30 October 2026

## What now works in the isolated PREVIEW
1. **253 contracted-property catalogue** with 4,958 received hotel tariff lines and the Owner's existing hidden 5% markup. Numeric guest-facing rates come from received supplier quotes only, not synthetic filler.
2. **Occupancy-appropriate DBest reference:** For 1 or 2 adults in one room, the guest occupancy API selects actual Single/Double quoted room tariffs and excludes extra-person charges. Results are contracted selling *references*, not a guaranteed offer for check-in date or tax-inclusive booking price.
3. **Automatic public B2C comparison** on destination/property typing, limited to verified Google Hotels identity crosswalk entries and a maximum of two rate browser lookups per search. The public OTA price is checked against requested dates, and the page rejects stale results when dates/guests change.
4. **Crosswalk coverage endpoint** `/api/hotel-coverage` now serves the set of exact identity-checked hotel mappings from the backend to the guest UI; a mapping cannot be used unless hotel ID, name and city exactly match the private catalogue. This avoids future dual maintenance of the list.
5. **Six verified hotel identities**, up from four: Hotel Nandan (Guwahati), Vivanta Guwahati, Ginger Agartala, Royal Orchid Beach Resort Goa, Polo Hotel Agartala, Spree Resort Sariska. **Mapped does not guarantee a current OTA offer**. Live date-specific public Traveloka rate for Polo Hotel Agartala was observed in the Chromium pilot; Spree Sariska matched name/date but returned zero parsed offers in the live pilot and must display rate-unavailable.
6. Guests see **a DBest reference upfront** and an *indicative* per-OTA price gap if the same-stay public OTA number exists. A smaller OTA offer is acknowledged; no blanket "DBest is always cheapest" or unverified saved amount.
7. **Guest enquiry** remains explicit email composition to the booking team with guest contact details, stay, property and requested room. No payment or voucher claimed; mailto does not automatically send a booking.
8. **Private booking persistence schema staged only in GitHub** `hotel-review/isolated-bookings-schema.sql`. It provides unique client-request idempotency, booking state constraints, confirmed tax-inclusive quote, hotel inventory reference, payment order/payment id, voucher gates, PII-restricted tables, audit and signed gateway event uniqueness. Nothing was applied to the frozen main DBest Supabase database.

## Operational limits and release gates
- **Not 253 live OTA comparisons.** Six identities matched, with some returning no offers; the rest must be matched deliberately. Avoid mass scraping, login bypasses or a paid API surprise. Current public Google Hotels browser method incurs Vercel Chromium compute; it is not proven economical at 100,000 searches/month.
- **Live rates may load after a delay.** DBest contracted reference appears first; public comparison updates asynchronously. Client fetch now aborts after 45 seconds and shows an unavailable state rather than spinning forever. No invented price is used if the browser cannot verify the stay.
- Owner-markup defaults and keys are server-side only. Current received tariffs can have seasonal/room/occupancy/tax caveats; exact-final-payable savings require same-room/tax/cancellation verification.
- **No real end-to-end payment/confirmed booking yet.** Requires a new isolated private database, authenticated Owner dashboard + hotel inventory confirmation, verified Razorpay/PayU order and signed webhook, voucher/invoice generation, refund/cancellation workflow, operational audit and communication.
- New isolated Supabase project has **not** been created, approved or charged. Existing DBest Super Platform Supabase project `ydedmotbacnllkijzmvp` remains untouched, as do Cab, Marketplace, member payouts, and production `dbest4u.com`.
- All work remains on draft unmerged PR #72. Preview is `dbest-hotel-review-preview.vercel.app` (SSO-protected). Launch decision remains NO-GO for taking confirmed bookings or claiming actual guaranteed savings.

## Tests
- New live Chromium checks (15–16 November 2026, 2 adults, 1 room) confirmed the Polo Hotel Agartala public source; Spree Resort Sariska did **not** return parsable offers. 
- Hosted `/api/hotel-coverage`: HTTP 200, six correct identity-checked mappings.
- Hosted `/api/hotel-guest-rate`: HTTP 200, Hotel Nandan Deluxe Double ₹4,961.25 and Polo Hotel Agartala Premiere Room Double ₹6,825. These are marked-up contracted references, not final booking prices.
- Guest mobile rendered Polo Hotel DBest double rate ₹6,825 and preserved search layout. The public OTA section was still loading after 10 seconds; endpoint result not yet verified from guest browser for Polo.
- CI includes crosswalk and isolated booking schema guard tests; do not claim Actions pass until verified.

## Immediate next production-enablement decision
Before making the Book button submit/store customer data: select and authorize a **separate hotel-bookings database** (cost quoted and approved first), secure owner authentication, verified merchant gateway and notification channel. Keep live platform untouched until independent staging acceptance tests pass.
