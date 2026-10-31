# DBest Hotel public B2C OTA — isolated live-activation checklist

**Status as of 30 October 2026:** Provider adapter and customer "Check public B2C OTA prices" action exist, but the separate `dbest-hotel-review-preview` Vercel project has **no DataForSEO API credentials or live activation flags**. The `GET /api/hotel-ota-b2c?view=status` endpoint reports the connection state **without making paid calls**.

## Objective
Display genuinely observed **logged-out, public B2C booking-site** hotel prices for the selected property, stay dates and guest count. Do not substitute B2B/agent rates from MakeMyTrip, Goibibo, Booking.com, TBO or any other wholesale feed. The Google Hotels provider determines which OTAs have public rates available; no OTA is guaranteed to appear.

## Owner / supplier pricing
- All received hotel outreach tariff lines are commercially accepted as **supplier quotations**. Owner-side selling markup currently **5%** (configured privately in isolated Vercel `HOTEL_REVIEW_MARKUP_PERCENT`).
- Never expose the supplier's net amount, email provenance, markup percentage or account credentials to guests.
- The cheapest supplier-line reference is **not** a verified date-specific all-in price; it may have unclear taxes, occupancy, validity or cancellation. Never calculate or advertise a savings amount against it without a comparable total.

## Required third-party account actions
1. Create or sign into **DataForSEO**: https://app.dataforseo.com/api-access . API credentials must be created by the account Owner and stored as **sensitive** environment variables; do not put them in GitHub files, client code or chat.
2. In the DataForSEO account, **configure an account-level daily limit** before any paid lookup and disable automatic refill unless explicitly desired. Live Google Hotel Searches and Hotel Info each incur charges; consult https://dataforseo.com/pricing/business-data/google-hotels-api for current costs. Sandbox responses are dummy, not live hotel rates. https://docs.dataforseo.com/v3/appendix-sandbox/
3. Obtain documentation/written clearance that this project can publicly display the returned third-party hotel price references/comparisons and link to their source. Do not assume DataForSEO automatically grants copyright, attribution, OTA trademark, or redisplay rights.
4. Only in the **separate hotel preview Vercel project**, set secret values `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, and set `HOTEL_OTA_SPENDING_LIMIT_CONFIRMED=true`, `HOTEL_OTA_COMMERCIAL_DISPLAY_AUTHORIZED=true`, `HOTEL_OTA_LIVE_ENABLED=true` after verification. They are **absent** today; disabled is the safe default. Never add these to DBest's main Vercel project.
5. Redeploy the **isolated** hotel project with its existing **private supplier-snapshot injection**. A raw GitHub checkout is **not a complete deployable source**, because the catalog template has `__PRIVATE_SNAPSHOT__` and the project's private snapshot must never be committed or sent to a public browser.

## Acceptance
- `GET /api/hotel-ota-b2c?view=status` returns `READY` and `liveConnected: true` without making a paid provider call.
- An explicit customer click with one hotel, valid check-in/out and supported 1-room adults triggers a two-step property-identity search and public Hotel Info retrieval. Exact property match only. Cache repeated lookups for 15 minutes.
- Price rows show actual OTA provider name, INR price/night, retrieval time and provider link where available. If an OTA is absent in the provider result, show "not listed"; never invent prices.
- Show "DBest Advantage" with a numerical savings amount **only** when supplier/DBest and OTA final tax-inclusive totals match dates, rooms, occupancy, meals, cancellation terms and currency; the current provider reference does **not** provide enough data to make this claim.
- The "Book with DBest" button remains an enquiry only until authenticated booking, inventory confirmation and payment reconciliation have been implemented and tested.
- Run CI, inspect response and costs with one deliberately chosen test hotel, then check mobile view and ensure no changes to `dbest4u.com`, Cab, Marketplace, wallet, payout or main Supabase.

## Provider limitation
Google Hotels public listing prices are independent from a customer's logged-in promotional rates and may differ from the checkout total. Published data is a reference, not an OTA B2C checkout guarantee. Do not promise MakeMyTrip/Goibibo/Booking.com results for every hotel.

**No production rollout until Owner activation, provider permissions, paid-account cost cap, snapshot deployment validation and manual end-to-end test.**
