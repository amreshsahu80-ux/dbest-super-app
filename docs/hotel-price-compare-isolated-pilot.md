# DBest Hotel Price Compare — isolated pilot (27 October 2026)

## Scope
- Customer: destination and dates search, guest/room choice, four-column sample rate comparison, tax-inclusive estimate, savings calculation, enquiry summary copied or downloaded.
- Owner preview: illustrative supplier approval controls, CSV quote importer with row-level validation, import log and connector-readiness panel.
- Preview route: /hotel-rate-compare.html
- All property names and initial prices are fictional. No actual reservations, payments or enquiries are sent.
- Only new files on feature branch. No production source, existing app navigation, Cab, Marketplace, membership, payout, or database changes.

## Production source of truth
- Owner hotel Google Sheet, Hotel Master + Rate History, contains supplier hotel and tariff records. Build a private backend sync after authentication, not public browser exposure.
- Live MakeMyTrip, Booking.com, Goibibo rate sources require legitimate partner permission. Booking.com Demand API is a managed affiliate facility, not a general public API; separately verify contractual price comparison rights.
- Do not scrape, copy protected data, or expose confidential net hotel rates to anonymous users.

## Rate/room matching
Require same verified property identity; exact check-in, checkout, rooms, occupancy and child ages; room-equivalence class; meal plan; refundable/cancellation terms; currency, taxes and mandatory charges. Every comparison must use the final payable amount for the full stay, not mix per-room with per-stay prices.

Suggested fields:
hotel_id, partner_property_id, rate_id, platform, source_offer_id, source_url, check_in, check_out, adult_count, children_ages, rooms, meal_plan, room_id, refundable, base_total_minor, tax_total_minor, fees_total_minor, payable_total_minor, currency, last_checked, expires_at, availability, permission_evidence, owner_approval, approval_timestamp.

Rules:
- Unavailable / expired / unmatched / unauthorized rate: show "Recheck required"; never invent a competitor rate.
- Show savings only when DBest total and one or more competitor totals are genuinely comparable: max(0, lowest_eligible_competitor_total - dbest_total).
- Owner approval and supplier contracting proof must be stored server-side with audit.
- Reprice and confirm inventory before final booking/payment.

## Preview CSV
Header:
hotel_id,platform,check_in,check_out,room,adults,rooms,meal,total_inr,tax_included,source,checked_at,permission,approved

Platform is one of MMT, Booking.com, Goibibo. Hotel ID must be one of the DEMO- IDs found in the prototype. Taxes must be included; data source HTTPS, permission authorized, approval yes, snapshot checked within three hours. These rules are for the demo importer only, not proof that any uploaded CSV is an authorized or real-time price feed. CSV data stays in session memory.

## Launch gates
1. Obtain OTA partner access and explicit comparison-data licensing for all providers.
2. Build private server-side provider adapters and hotel-master sync; verify supplier tariffs and contracts.
3. Require auth and role checks on owner API. Use secret storage and audit logging; never ship keys in frontend.
4. Add freshness checks, nightly fee rules, room mapping, optional currency conversion and stale-rate fallbacks.
5. Authenticate inquiry processing and booking finalization; no payment unless supplier availability reconfirmed.
6. Run mobile, accessibility, RLS/security and Cab/Marketplace regression tests.
7. Release behind a disabled-by-default flag with owner approval and rollback.

Booking.com reference: https://developers.booking.com/demand/docs/getting-started/prerequisites
