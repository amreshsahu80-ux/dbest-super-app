# Cab destination autocomplete — local-first QA (10 November 2026)

## Reported issue
With precise pickup GPS in Jharkhand, the destination autocomplete displayed distant results (e.g. Kerala). Previously the Google legacy Places API used a location bias but not a hard restriction; the Supabase and OpenStreetMap fallbacks were searching nationwide.

## Proposed QA-only fix
- Default to **Nearby destinations**, within 500 km of current GPS or manually selected pickup coordinates; sort by distance where coordinates are available.
- Display an explicit **Search all India** toggle for intentional outstation journeys, and a **Search nearby** control to return to local mode.
- Google Places (new) uses a restricted map bounds + origin. Google Places legacy only displays results with a known distance <= 500 km in nearby mode.
- Supabase fallback passes locality hints but **also filters returned coordinates**. OSM Nominatim uses a bounded viewbox and validates the returned coordinates.
- If pickup position is not yet known, show a location prompt instead of unscoped nationwide matches.
- Manually selected and typed destinations are checked again before booking to prevent bypassing the nearby restriction.
- Retain Cab GPS pickup, editable landmark, compact Back/Home header, map, fare and booking calculations, vehicle types, carpool and payments. No production services or app bundles changed.

## Updated radius (owner request)
- 10 November 2026: increased local radius from 65 km to **500 km**.
- Location filter/Google bounded query/Supabase hints/OSM bounding box use the same 500 km constant.
- Approximate test origins near Chakradharpur: Ranchi, Jamshedpur, Kolkata, Bhubaneswar permitted; Kochi (Kerala) and Delhi excluded from default local mode. "Search all India" remains available.

## Static validation
JavaScript compiles. Pure logic tests passed: nearby Jharkhand allowed, distant Kerala rejected, local results sorted, location-less local searches blocked, all-India mode permits outstation selection.

## Release gates still pending
- [ ] Vercel preview deployed at exact change commit.
- [ ] Physical-device typing test near Chakradharpur, Jharkhand: local suggestions appear, Kerala suppressed.
- [ ] "Search all India" reveals intentional outstation places; switching back restores local-only results.
- [ ] Manual GPS/selected pickup change re-centers suggestions.
- [ ] Backend unavailable still never shows distant places by default; Google browser SDK unavailability does not circumvent filtering.
- [ ] Nearby Places, route, 2-Way, Car Pool, Add Stop and booking handoff regression tests.
- [ ] Configure authorized preview-domain Google Maps browser key, with appropriate restrictions, before verifying Google Places.
- [ ] Product owner approval before production merge / Play release.

No live deployment, DB change, signing or payment test authorized.
