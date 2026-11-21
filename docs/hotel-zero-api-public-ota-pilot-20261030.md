# DBest public OTA HTML pilot — 30 October 2026

**Scope:** Isolated hotel-rate compare branch and Vercel project only. No mutation of `dbest4u.com`, Cab, Marketplace, wallet, owner bank settlements, main Supabase, or deployed public booking process.

## What was built
- `hotel-review/public-page-rate-probe.cjs`: on-demand public hotel page retrieval with no DataForSEO, login credentials, agent rates or API key. Two verified Hotel Nandan Guwahati listing URLs: MakeMyTrip and Goibibo. Unknown hotels are deliberately not mapped.
- `hotel-review/hotel-free-ota-api.template.cjs`: read-only deployment at `/api/hotel-free-ota`, accepts one catalogue-backed hotel ID and checked dates/occupancy, deduplicates concurrent calls, caches results for 15 minutes in-function, and never accepts arbitrary target URLs.
- `hotel-simple-flow.html`: Hotel Nandan's public-OTA check button now calls the free pilot; other hotels still keep prior gated API and honest pending states. No silent paid searches.
- Strict validity: **only an exact date-specific structured offer for this named hotel, guests, one room, INR and an explicit per-night price** may show a number. Search snippets, generic nightly marketing claims, old default page prices and offers that cannot be mapped to the requested stay are not shown. Savings are disabled unless full price and room terms become comparable.
- `tests/hotel-public-page-rate-probe.test.cjs` and dedicated isolated CI check.

## Actual external requests (not mocks)
For the one-room, two-adult `2026-11-15` to `2026-11-16` Hotel Nandan search:
- IAD1 Vercel, 7-second timeout: **MakeMyTrip SOURCE_TIMEOUT; Goibibo SOURCE_TIMEOUT**.
- IAD1 Vercel, 12-second timeout: **MakeMyTrip SOURCE_TIMEOUT; Goibibo SOURCE_TIMEOUT**.
- BOM1 (Mumbai) Vercel, 12-second timeout: **MakeMyTrip SOURCE_TIMEOUT; Goibibo SOURCE_TIMEOUT**.
- Public response for BOM1 deployment `dpl_BzUPyWK1zq9NPKshtcp46UdDxhFF` returned HTTP 200, `status=NO_VERIFIED_PUBLIC_PAGE_OFFERS`, `providers=[]`, `live=false`. Snapshot still `253` hotels, `4,958` supplier-rate rows.
- **No live numerical OTA rate has been obtained.** These findings describe direct page retrieval; they do not prove the OTA has no rooms or prices. The servers or networks may impose limitations, and the pages may use JavaScript rendering.

## Engineering next step
Evaluate an India-hosted interactive, visible-browser public-page proof of concept (no access bypass or accounts), or an official data partnership. Require a logged-out B2C, correct hotel and selected stay, user-verifiable rate, taxes/room/meal/cancellation fields, enough successful trials to establish reliability, and reasonable operating cost. Do not enable 100,000 scans/month based on these failed fetches.

## Controls
- Does not scrape entire site, only on explicit click, no third-party credentials, no bulk search, 2 known source URLs only.
- Does not claim that a public number is a final checkout total; no unverified savings.
- No booking/payment integration; Book with DBest remains an enquiry.
- Isolated preview remains **NO-GO for public price comparison and bookings** until actual live success and legal/commercial review.
