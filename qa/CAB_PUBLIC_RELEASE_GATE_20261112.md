# DBest Cab final public-release polish — 12 November 2026 (QA only)

**No production release performed.** This branch extends the 10 Nov Google Places/GPS/photo QA baseline. Live website, AABs, Cab/Marketplace backend, Supabase, payments and Vaahak assignments are untouched.

## Applied targeted fixes
- Destination suggestions: Google Autocomplete (New) cannot display unverified-distance predictions in the default **Nearby 500 km** mode; predictions with explicitly known distances >500 km are removed. The existing bounded Supabase/OSM fallback remains available. The separate explicit **Search all India** option is preserved.
- The selected prediction callback now guards against changed inputs / stale search requests.
- Removed the previously reverted **Hourly Rental** quick tile from the new Cab entry screen; legacy implementation remains untouched to avoid changing existing records.
- Removed the **invented 4–7-minute Vaahak pickup ETA** from vehicle options. The UI now says **Pickup ETA after assignment**, because no live driver-route location is available when selecting a vehicle.
- Restored visible **OpenStreetMap attribution** on the entry-map tiles.
- All nearby-photo merge, late Google photo enrichment, fallback image/author credits, precise-GPS, optional pickup landmark and 500 km logic from baseline remain.

## Static/synthetic automated QA
GitHub Actions runs `node --check cab-selected-ui-v3.js` and `node --test qa/cab-release-polish.test.mjs`. The test invokes the actual Google autocomplete function with fake Google Place predictions, verifies that far away and null-distance suggestions are suppressed, checks coordinate filtering, no fictitious Vaahak ETA, no rental tile and OSM attribution. This does **not** demonstrate live browser geolocation, paid route API or photo fetching.

## Remaining physical and operational release gates
- Confirm a working Google Maps **browser QA** key is restricted to and authorized for the exact preview URL of this branch; the existing key is branch-scoped to `fix/cab-nearby-photo-priority-qa-20261110` so a *new* preview needs appropriate, isolated authorization. Do not change production key.
- On handset Chrome with precise location enabled, check user-selected pickup and editable building/landmark; GPS refresh and denied GPS; Jharkhand autocomplete local places, Kolkata and Bhubaneswar within 500 km, Kerala suppressed; all-India manual switch; Popular Nearby actual Google photos, attribution and icon fallback.
- Routes: **Current Cab booking UI still calls the OSRM public demo routing server.** Google Routes API, secure production backend authentication, server-only key, billing quota and fallback policy have not been integrated. Do not claim traffic-aware routing or guaranteed ETA. This is a quality/reliability risk to address before promising accurate route estimates in the public app.
- End-to-end non-transactional tests of Stop, 2-Way same vehicle, Sedan ₹15/km / SUV ₹18/km, Car Pool, fare quote, acceptance, no actual payments or bookings in QA.
- Confirm marketplace delivery Vaahak flow and dual Cab/Marketplace assignment protection unchanged; do not merge separate experimental [PR #128](https://github.com/amreshsahu80-ux/dbest-super-app/pull/128) as part of this quick Cab release.
- The currently signed DBest Main 1.0.4/build 6 and Partner 1.0.5/build 9 AABs remain independent. They have not yet been uploaded to Google Play or verified on physical devices. Cab page changes require a **separately tested website deployment** before they appear inside the Main WebView.

## Go/no-go
**NO-GO for immediate production promotion** until final physical-device maps, routing and checkout regressions and owner approval. Browser screenshots and GitHub compilation are not equivalent to end-to-end ride booking success.

Review branch without merging into `main` or automatically promoting to production.
