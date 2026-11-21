# DBest Hotel Preview — Image Fix / Isolated QA — 30 October 2026

## Scope
Only the isolated `feat/hotel-rate-compare-isolated-20261027` GitHub branch and unaliased hotel preview project `dbest-hotel-review-preview`. No edits to `dbest4u.com`, Cab, Marketplace, bank settlements, wallet, owner markup, unrelated Supabase schema, or OTA provider logic.

## Root causes
1. Browser page CSP previously permitted only `commons.wikimedia.org`; the real `Special:Redirect/file` thumbnail URL redirects to `thumb.wikimedia.org` or `upload.wikimedia.org`. These destinations were blocked. Added both redirect hosts to **img-src only**, preserving the restrictive directives for scripts, styles, network connections and form submissions.
2. The 6 static introductory hotel records contained 5 licensed photo references, but the real outreach catalogue has **253** hotels and most of those are not among the 6; therefore those photo references did not map to real catalogue entries. Added exact real Hotel ID keyed licensed photos for **Royal Orchid Beach Resort & Spa Goa, Bolgatty Palace and Island Resort, Samode Palace, Shiv Niwas Palace**.
3. Broken image URLs previously lacked a failure handler. Added a capturing image-error listener that removes a failed image and its source credit; a labeled hotel-specific nonphotographic placeholder remains visible.
4. Unverified hotel-photo imagery is **not fabricated** or silently reused for unrelated properties. Additional catalogue properties remain clearly marked `Verified hotel photograph pending`.

## Photo sources
- Royal Orchid Beach Resort & Spa Goa — `https://commons.wikimedia.org/wiki/File:RoyalOrchid_Goa3450.jpg`; ChandruROHL, CC BY-SA 4.0.
- Bolgatty Palace and Island Resort — `https://commons.wikimedia.org/wiki/File:Bolgatty_Palace_Hotel_by_Augustus.jpg`; Augustus Binu, CC BY-SA 3.0.
- Samode Palace — `https://commons.wikimedia.org/wiki/File:Samode_Palace_Jaipur.jpg`; Pcrtravel, CC BY-SA 4.0.
- Shiv Niwas Palace — `https://commons.wikimedia.org/wiki/File:Shiv_Niwas_Palace%2C_Udaipur%2C_20191207_1409_7147.jpg`; Jakub Hałun, CC BY-SA 4.0.

The existing 5 static example photos also retain their source and license attribution. Remote image URLs for all 5 example photos plus 3 new properties were verified with HTTP 200 and image/jpeg response.

## Runtime testing (real Chrome, Mumbai isolated QA sandbox)
- The corrected HTML embedded script passed `node --check`.
- Real Chromium loaded the original 6 introductory cards; **all 5 licensed property images loaded with nonzero naturalWidth** (960/640). Errors about `file:///api/` are expected because this was a standalone local-file image-only test, not a production API test.
- Simulated server catalogue load with four **exact known hotel IDs** on a **375-pixel mobile viewport**: all **4 real images loaded**, all widths nonzero (960, 960, 800, 960), zero horizontal overflow. This check uses the *real image URLs and browser*, but mocks only the catalogue JSON to test the ID mapping.
- The deployed Vercel preview `dpl_73hN4S8ziqRabcJV7qcp6wwJKMGQ` is **READY**; includes the private supplier catalogue, OTA browser API and updated HTML. Extra QA alias: `https://dbest-hotel-photo-pilot.vercel.app/hotel-simple-flow.html`.
- The Vercel deployment URL and separate QA alias currently enforce Vercel SSO, so an end-to-end screenshot on the **deployed** page could not be collected by the unauthenticated browser. The local Chromium checks are not a substitute for an authenticated deployed-page acceptance test.

## Follow-up
Complete wider catalogue image coverage by collecting owner/hotel-supplied original photos with explicit redisplay permission and stable hosting; use exact hotel IDs, license/provenance records, and browser image checks. Do **not** bulk hotlink OTA or Google Hotels photos without photo reuse permissions. Keep the generic fallback for properties without authorized source images.
