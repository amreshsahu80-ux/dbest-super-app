# DBest Hotel public OTA browser comparison — verified isolated preview (30 October 2026)

## Working proof
The independent `dbest-hotel-review-preview` Vercel project now has a read-only, on-demand Chromium API `/api/hotel-google-b2c` showing observed public B2C offers listed in Google Hotels. It uses `@sparticuz/chromium@153.0.0` + `puppeteer-core@25.16.0` on Mumbai-region serverless functions, **not DataForSEO or any paid hotel-pricing API**.

**Verified preview:** https://dbest-hotel-review-preview-hsj341ly0-db-est.vercel.app/hotel-simple-flow.html  
**Vercel deployment:** `dpl_HskD9SuHUaXGxRcmL7uQXXR4fZKU`, READY and unaliased.  
**GitHub branch:** `feat/hotel-rate-compare-isolated-20261027`, draft PR #72; NOT merged.

### Live E2E tests
All tested requests: check-in `2026-11-15`, check-out `2026-11-16`, **2 adults / 1 room**. The browser verified the property title and visible dates before following Google Hotels' full public price listing.

1. `HOTEL-NANDAN-GHY` / Hotel Nandan, Guwahati: HTTP 200, `PUBLIC_GOOGLE_B2C_OFFERS_FOUND`, 10 real publicly observed provider rows, including **MakeMyTrip ₹5,707, Goibibo ₹5,302, Yatra ₹4,247, Cleartrip ₹4,410 and Agoda ₹4,342** per Google Hotels nightly reference.
2. `HIST-016` / Vivanta Guwahati: HTTP 200, `PUBLIC_GOOGLE_B2C_OFFERS_FOUND`, 7 observed provider rows; MakeMyTrip ₹18,290, Booking.com ₹18,290, Agoda ₹18,290, Bluepillow ₹13,570.
3. `DBEST-REPL-20261026-697` / Ginger Agartala: HTTP 200, `PUBLIC_GOOGLE_B2C_OFFERS_FOUND`, 8 observed provider rows; Cleartrip ₹4,103, MakeMyTrip ₹5,669, Booking.com ₹4,934 and Agoda ₹4,934.
4. A distinct date `2026-11-21`–`2026-11-22` for Hotel Nandan also returned HTTP 200 with the verified request-stay object.
5. Unmapped `DBEST-GOLDEN-TULIP-AGRA` returned HTTP 200 `PROPERTY_NOT_MAPPED`, zero providers and **no browser lookup**. Invalid multi-room occupancy returned HTTP 422.
6. Supplier catalogue still returned **253 partner hotels, 4,958 supplier quotes**. The rate-reference endpoint returned **238 numeric hotel customer price references** including Hotel Nandan **₹4,016.25 with the hidden Owner-side 5% markup**.

### Safeguards and limitations
- **Only 3 exact Google entity-to-DBest hotel mappings currently enabled.** The other approximately 250 hotels require a verified property crosswalk before their public OTA numbers can appear.
- The displayed prices come from Google Hotels' publicly visible, logged-out B2C OTA offers, not OTA B2B portals, post-login member pricing, or confidential distributor costs. Direct automated visits to MakeMyTrip and Goibibo previously timed out; their quotes were found via Google Hotels.
- Serverless browser compute is **not free at scale**, even though no paid hotel-rate API is used. The endpoint launches Chrome only on explicit click for a mapped hotel. It uses an in-memory 15-minute cache, concurrent deduplication and a best-effort 8-unique-lookups-per-instance-hour guard. **This is not a global spending cap** or a production quota. Validate cost at realistic load before expanding.
- A Google Hotels public nightly reference is **not guaranteed to equal the OTA's final booking total**. Different OTAs may list different room classes, meal policies, taxes, fees or cancellation terms. **No verified DBest savings may be shown until room and stay terms match.**
- No confirmed DBest hotel inventory. The customer-facing **Book with DBest** interaction remains an enquiry by email, not an actual reservation or payment. Owner approval / tax and cancellation validation / production checkout remain pending.
- This was deployed only to an **unaliased preview** of the **separate hotel pilot** project. Main `dbest4u.com`, Cab, Marketplace, wallet, payments, main Supabase and partner deep links were **not changed**.
- Commercial permission and ongoing operational reliability review remain release gates; do not change the pilot into mass automated collection without appropriate controls.
- CI tests for the Google rate adapter are committed, but the latest Actions test run has **not been independently confirmed passed**.

### Next implementation milestone
1. Safely map remaining real hotel catalogue properties to Google Hotels, using independent property identity verification (name, city, location), and retain an explicit unmatched state. Never guess entity matches.
2. Add distributed/centralized quota and cache, load-test realistic search volume, and evaluate per-comparison browser CPU/memory costs against booking profit.
3. Link individual OTA booking terms and room details; calculate **DBest Advantage savings only on like-for-like final payable totals**.
4. Build authenticated owner inventory confirmation, customer reservation and invoice/payment reconciliation separately, with regression protection for frozen DBest modules.

**Release status: pilot verified for three properties; NO-GO for a public all-hotel automatic booking or savings claim.**
