# DBest Cab pickup autofill — isolated QA, 10 November 2026

Status: SOURCE PATCHED / PREVIEW READY / PHYSICAL GPS VALIDATION PENDING.
Scope: Cab pickup UI (`cab-selected-ui-v3.js`) only. Public `dbest4u.com`, Android Play builds, payment, dispatch, and Supabase are **NOT** changed.

## Diagnosed from source
1. Entry triggers `useGps(false)`, but the WebView may return a cached location (previous maximumAge 30000ms) and the separate map render could use a different 60s-old low-accuracy GPS fix.
2. Google and OSM reverse-geocoders were raced, so a fast lower-detail address could supersede Google even though Google Maps is already integrated.
3. The configured Google Maps key is loaded asynchronously and could be missed by an early call.
4. GPS/lookup callbacks could overwrite selected pickup coordinates or leave coordinate-only placeholder text when late.
5. The UI did not display the phone's reported GPS accuracy or explain when address lookup failed.

## Changes staged
- GPS `enableHighAccuracy:true, timeout:20000, maximumAge:0`.
- Coordinates stored with accuracy and timestamp, and used as the pickup pin for routing.
- Existing Google Maps reverse-geocoder queried first, with OSM fallback only when necessary; dynamically waits for the existing runtime key.
- Pickup status displays live accuracy `± metres`; when >100 m warns to confirm or correct pickup.
- Async generation guards prevent GPS/map/address callbacks from overwriting manually typed/chosen pickup.
- Map won't trigger a separate coarse cached GPS request in parallel.
- Destination autocomplete, nearby places, Cab prices and booking code not edited.
- Syntax parse passes; Vercel preview deployed at commit `70ba9e7d26920091a064586c76fd7ac14512cd3a`.

## Manual physical-device tests required
- [ ] Open preview over HTTPS in Chrome; allow *Precise* location.
- [ ] Open Cab: pickup should auto-fill with readable Google address if API permitted for preview domain.
- [ ] Compare pin to actual handset location; use reported `±Xm` accuracy and do not assume house-number precision.
- [ ] Tap **◎** to refresh GPS; verify updated accuracy and pickup text.
- [ ] While GPS resolving, type/choose a different pickup: late GPS must not overwrite manual choice.
- [ ] GPS OFF/denied/approximate: clear actionable message and manual entry remains possible.
- [ ] Google Maps geocoder slow/unavailable: OSM/address fallback and coordinate location remain usable without silently claiming an exact address.
- [ ] Nearby Places and destination autosuggestions work for current city, with images and no unrelated long-distance suggestions.
- [ ] Pickup route/map uses the same coordinate, then Cab pricing, return, stops, car pool, ETA smoke test without making real payment or booking.
- [ ] Check refresh/reopen, moving device, background/resume and network changes.
- [ ] After approval, retest on Android WebView QA build under production origin restrictions before creating a signed Play update.

**Do not submit a production update until these checks pass.**
