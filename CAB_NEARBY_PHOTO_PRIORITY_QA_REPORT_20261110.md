# DBest Cab Nearby Photo Priority — QA Readiness Report (2026-11-10)

## Confirmed live comparison, read-only
- GET `https://dbest4u.com/api/runtime-config?mode=nearby&lat=22.67&lng=85.63` returned HTTP 200, 5 place records around Chakradharpur.
- Live records included Railway Hospital, Government Hospital, Chakradharpur Railway Station, Lotapahar Railway Station, Barabambo Railway Station.
- This endpoint does not return a place photo field. Real photos rely on successful Google Places JavaScript responses in the browser; not every place necessarily has a photo.
- Live Cab script still has a first-nonempty-provider-wins guard, explaining why photo-free fallback cards can remain even after Google responds.

## Isolated QA corrections
- Merge results from both providers, matching normalized place names and nearby coordinates; keep a valid Google image on subsequent photo-free responses.
- Show category icon *behind* any valid photo, and let it remain visible if the photo fails to load.
- Keep author-attribution text when the associated image is present.
- Do not cache Google's photo URLs or Places data server-side.
- Preserve precise GPS pickup, optional pickup landmark, 500 km *destination* scope, Search all India, route, payments, Cab/Marketplace features.

## Actual tests
- Source syntax checked successfully.
- Read-only integration fixture from 5 actual Chakradharpur live place records.
- Seven in-process renderer checks passed: display real fallback data, enrich photo, show credit, image layering, photo survives later fallback, one card per same place, correct result in either provider arrival order.
- Vercel preview deployment needed at current commit; verify served script.
- Existing QA nearby backend returned HTTP 503 because preview Google Maps credentials are absent and public OSM fallbacks are rate-limited.
- **A successful live photograph was not verified.** These tests use a *synthetic* Google photo URL to verify rendering only.

## Required before controlled production release
- [ ] Preview Google Maps browser key restricted to QA origin and enabled Maps JavaScript + Places API (New), or approved isolated equivalent test origin.
- [ ] Real Google Places responses, place photo displays, broken-image fallback, required Google branding and attribution links on Android Chrome.
- [ ] Cab pickup/address editing, destinations 500 km, outstation switch, Popular Near You, route, Add Stop, 2 Way, Car Pool, price, booking and payment *non-transactional* regression.
- [ ] Main and Partner Android notification/login/account-switch/logout physical-device regression, Play/App Signing/versionCode/Data Safety checks.
- [ ] Owner approval of an exact tested release candidate.

**DO NOT merge into live branch or publish Play Store apps prior to release checks.**
