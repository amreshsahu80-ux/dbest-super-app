# DBest Vaahak: One dispatch authority for Cab AND Marketplace (QA only)

Date: 12 Nov 2026. Status: proposed design and isolated synthetic QA — **no live integration, no production key, no changes to pricing or dispatch**.

## Why this exists

A DBest Vaahak performs two distinct kinds of work:
1. Cab **ride**: driver → passenger pickup → destination, including scheduled rides/return trips.
2. Marketplace **delivery**: driver → vendor pickup (restaurant, grocery, pharmacy, other eligible physical categories) → customer drop-off. Digital goods are not delivered. Vendor handover, verified customer receipt, prescription protections, Razorpay payment state, and existing per-category service radius remain authoritative.

Observed source (GitHub): `nearest-vaahak-dispatch.js` already detects `create_ride` AND `create_delivery`, connecting to `vaahak-dispatch-live` and `vaahak-commerce-live`; `vaahak-dashboard-final-v3.js` already has Ride and Delivery history tabs; `vaahak-marketplace-sync-ui.js` handles vendor-arrived and handover/payment states. **Keep those contracts unchanged until a separately tested migration is approved.**

## Shared dispatch requirements

- One **authoritative, server-side** Vaahak availability and reservation record across rides and deliveries. If an active Cab job exists, no Marketplace offer can reserve/assign the same Vaahak, and vice versa. This must be an atomic database operation/transaction; a browser-side eligibility check is not sufficient.
- Offers can expire/reject and release reservation safely; completion/cancellation releases only after all business gates. Retry/duplicate mobile events must be idempotent.
- Dispatch candidates must be approved, online, explicitly enabled for the job type, have fresh GPS and a compatible vehicle, and be inside existing business service-area rules. Route Matrix ETA is from Vaahak current position to **passenger pickup** (ride) or **vendor pickup** (delivery). Never route the driver first to the delivery customer.
- Do not let a new delivery interrupt an accepted/started ride, or a new ride interrupt vendor pickup, handover, or an in-progress delivery. No batching or simultaneous passenger+package handling without a separately approved safety/business policy.
- For deliveries, preserve the already-approved vendor status sequence and customer confirmation/payment, with minimum exposure of medicine/prescription information. Never expose sensitive order contents to unrelated Vaahaks.
- Preserve separate fare engines: Cab ride fares and existing Marketplace category delivery charge rules **must not** change merely because Maps road distance becomes available. Compare against incumbent quotes in QA before any approved tariff changes.
- Real-time location is shared only with the assigned passenger or assigned delivery customer for the active job, with authorization, short retention and a visible tracking status. Do not broadcast all Vaahak GPS positions to all customers.
- FCM notifications: `ride_offer`, `ride_assigned`, `delivery_offer`, `vendor_arrival`, `vendor_handover`, `delivery_started`, `delivery_completed`; deep-link to the correct workspace. Never assume a Firebase-accepted message was displayed on Android.
- For all driver types, handle location denial, loss of network, stale GPS, old offers, app backgrounding, customer cancellations and server retries safely.

## APIs & security

1. Existing QA `GOOGLE_MAPS_BROWSER_KEY` (Maps JavaScript, Places New, Geocoding) stays website-restricted. Do **not** add unrestricted web-service access to that key.
2. Future `GOOGLE_MAPS_SERVER_KEY` must be created separately with Routes API enabled and backend-only access/quotas. It must never appear in `runtime-config.js`, an AAB, GitHub or mobile browser code.
3. `computeRoutes`: road distance, traffic-sensitive duration and supported toll data; `computeRouteMatrix`: candidates to correct pickup, billed per origin×destination element. Limit candidate count and set cost alerts.
4. The current `cab-selected-ui-v3.js` calls public `router.project-osrm.org` for ride routing; replace only after Maps QA passes and a protected backend migration is ready, not in this branch.
5. Evaluate Supabase Realtime for job-scoped updates; RLS or backend authorization must prevent reading other customers' jobs/location. No schema or Supabase production changes in this PR.

## Staged implementation

- Gate A: browser Google Places/GPS photo validation on existing Cab QA preview; no production promotion.
- Gate B: backend Routes/Route Matrix prototype with server-only credentials and fixed test points; validate traffic, failures, rate limiting, costs and vendor-vs-passenger pickups. No paid dispatch in this branch.
- Gate C: atomic shared job reservation across Cab and Marketplace and idempotent retries; test synthetic collisions before touching production.
- Gate D: background location/FCM + correctly scoped customer tracking for both job kinds. Test physical device.
- Gate E: canary with consented Vaahaks, separately authorized releases. Preserve existing business workflows, live Cab and Marketplace.

## Synthetic QA acceptance scenarios

1. Vaahak accepted a ride → unavailable for incoming Marketplace delivery.
2. Vaahak picked up an order → unavailable for Cab rides.
3. Offline/unapproved, stale GPS, wrong service capability → no offer.
4. Marketplace routes to **vendor pickup**, Cab routes to **passenger pickup**.
5. Rank eligible Vaahaks by verified road travel ETA, not latitude/longitude distance.
6. If Google Routes fails or over quota, **do not fabricate an ETA or automatically alter fares**.
7. Vendor handover remains required before starting delivery; payment and customer receipt gates remain unchanged.
8. Race: simultaneous Cab and Marketplace accepts against the same driver → exactly one succeeds, verified in database layer during Gate C.

## Scope of this isolated PR

`qa/vaahak-shared-dispatch-eligibility.mjs` is a dependency-free pure demonstrator. It is not imported into `api/` or live pages and cannot dispatch, modify databases or make chargeable Google calls. Tests use fabricated driver and route data. The actual cross-service atomic reservation must live on the trusted server.
