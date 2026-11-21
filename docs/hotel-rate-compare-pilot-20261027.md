# DBest Hotel Rate Compare — Isolated Pilot / NO-GO for Public Release

**Pilot branch:** `feat/hotel-rate-compare-isolated-20261027`  
**Screen:** `/hotel-rate-compare.html`  
**Environment:** Vercel preview only. Never promote this branch to production or merge before a release audit.

## Delivered preview functionality
- Mobile-first hotel search: destination, check-in/out, 1–30 nights, occupancy/rooms; illustrative property list.
- Customer-facing **illustrative retail price only**. Supplier B2B base cost is owner-side only.
- Owner-side **demo markup** on all-in supplier sample cost, adjustable from 0–50%; this is not the production tax/pricing engine.
- Three side-by-side comparison displays: MakeMyTrip, Booking.com and Goibibo. All default prices are explicitly fictional.
- Savings based on the **displayed DBest guest price**, not the private supplier cost, against the lowest illustrated OTA price.
- Enquiry preview/copy/download. This does not create an order, send a message or initiate payment.
- Owner preview: supplier tariff review states, comparison CSV ingestion with row-level accept/reject log.
- Comparison input requires identical stay dates, room, occupancy, number of rooms, breakfast; INR final tax-inclusive total, explicit source permission/owner approval and recent checked-at time.
- No DB or API writes; imported CSV and review state are memory-only and vanish on refresh. No live OTA credentials and no automatic data fetch. This is not an authenticated owner interface.

## Master data already available for a later gated adapter
The private consolidated Excel source has **1,536 hotel records and 2,356 hotel tariff rows**. Many source rows are quotes with missing or unclear tax, cancellation, booking window, room, occupancy or validity details. **Never publish raw quotes automatically.** Ingest with keys `Hotel ID`, `Rate ID`, room mapping, meal plan, occupancy, currency and valid dates. Preserve email provenance and existing `DBest Import Gate` decisions; blocked means blocked.

## Proposed integration contract (not yet implemented)
- Supplier offers: `supplier_rate_id, hotel_id, room_type, meal_plan, adults, children, dates_from/to, currency, net_total, included_taxes, cancellation_policy, provenance, approved_by, approved_at, status`.
- OTA snapshots: `hotel_id, ota, ota_property_id, ota_room_id, check_in, check_out, rooms, adults, children, meal_plan, cancellation_tier, currency, tax_inclusive_total, url, fetched_at, terms, license/permission, source_type, verification_status`.
- Price calculation: `guest_total = separately approved owner selling price inclusive of all fees and taxes`. Compare only if *same room benefits and conditions*, including discounts, taxes, extras and cancellation. No fixed assumed tax or markup in live price engine.
- The backend owns crosswalk matching, TTL, audit and integrity. Prices must not be accepted from arbitrary public clients. A real owner-console screen needs authenticated roles and server-side RLS and approval transitions; client-only approval is never sufficient.
- No fabricated savings. If any comparable OTA price is missing or unverified, display `Unavailable` rather than fake data. Do not call stale or manually captured quotes live.
- Production booking/payment can only be enabled after hotel confirmation and an independent, separately reviewed checkout design.

## Gate for OTA source connections
- Booking.com: ask for **Demand API** eligibility/credentials and commercial display rights; its partner endpoint requires affiliate ID/token. Do not confuse its supply-side Connectivity API with general consumer price discovery.
- MMT/Goibibo: obtain contract/partner access or documented authorized data feed, clarify whether onward public display/comparison is permitted. myPartner is a booking portal, **not proof of access to a price-comparison API**.
- No scraping, hidden site calls, unofficial mobile API, API-key sharing or circumventing access rules.

## Regression protection
- No edits to `index.html`, `index-26.html`, Cab, Marketplace, memberships, payouts, checkout, Supabase schemas, production Vercel alias or production env variables.
- Keep the current branch's preview as a **demo only** and request human owner acceptance before any production integration.
- Source branch may be older than current production commit; never merge whole branch to main. Cherry-pick only tested new module files onto a freshly rebased release branch after diff review.

## Manual acceptance matrix
1. 1-night and 5-night totals; 2 adults, 1 room and 4 adults, 2 rooms. Confirm total and savings reflect all nights/rooms.
2. Invalid dates (zero/negative or over 30 nights) must be rejected; place search filters correctly.
3. Guest sees sample selling price and **never supplier B2B cost**; 0%, 12%, and 50% demo markup must not produce negative profit.
4. CSV rows with mismatched room, dates, guests or meals must not match selected stay.
5. CSV rows with tax_included!=yes, permission!=authorized, approved!=yes, non-HTTPS provenance, expired checked_at, invalid amounts/dates must be rejected.
6. All initial OTA values and fictional hotels are clearly labeled demo. Imported snapshots remain unauthenticated demo and are not live inventory.
7. Enquiry opens, copies, downloads, but does not create transactions or take payment.
8. Phone viewport (~375px), tablet (~768px), desktop (~1280px), keyboard tab navigation and focus; no horizontal clipping.
9. Production site unaffected; Cab/Marketplace smoke tests before any separate release.

## Status on 27 Oct 2026
- UI pilot implemented; the Vercel preview for this feature branch reported READY.
- Manual browser E2E / production backend integration / live OTA API approval **not verified**.
- **Release decision: NO-GO for real customer rates or direct booking.**
