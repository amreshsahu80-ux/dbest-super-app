# DBest Partner Handoff — Tested Release Candidate (Production Deployment Pending)

**Prepared:** 20 October 2026  
**Affected services:** Insurance (Health/Motor/Life/Travel); Flights; Hotels/Packages; Mutual Funds.  
**Production URL:** https://dbest4u.com  
**Approved live production deployment before candidate:** `dpl_BH4La8R6fTTXKUPWVPJJKjyUtWkk` / commit `f7305e05d2bedc50760062316dc98ebb7dbe7c31`.  
**Independently tested preview deployment:** `dpl_2u748VFAZUFeKGaMUGbowpv3dGVQ` / commit `e978e737bc145d069baa43ee1f59a3738891f5d2`.  
**Immutable candidate reference (do not overwrite):** `release/partner-deeplinks-tested-20261020`.  
**Source branch with regression/CI gates:** `fix/partner-deeplinks-handoff-20261020`.

## Confirmed Owner URLs (read from live Owner public-config API)

| DBest sections | Owner partner | Exact destination |
| --- | --- | --- |
| All Insurance — Health, Motor, Life/Term, Travel | InsuranceDekho | `https://www.insurancedekho.com/?source=PARTNER&sub-source=BESTSERVICES_B2C` |
| Flights / Flight + Hotel | DBest Fly | `https://dbestfly.com` |
| Hotels / Packages / Custom Itinerary | DBest Fly | `https://dbestfly.com` |
| Mutual Funds / Portfolio Assistance | NJ Wealth | `https://p.njw.bz/13879` |

All four Owner public links are enabled; their exact URLs were verified against the deployed `owner-control-live` public endpoint on 20 October 2026.

## What was fixed in the isolated release candidate

Only `owner-deeplink-all-sections.js` changes runtime behavior:

1. **Hotel / Travel** is explicitly treated as an existing external partner handoff, not a DBest internal paid application form; other unrelated DBest forms remain unchanged.
2. The existing Insurance, Flights, Mutual Funds and Travel subsection buttons use the common same-tab handoff (avoids Android popup blocking).
3. Authoritative **Owner public configuration** wins over stale browser-cached partner URLs. A disabled/deleted Owner link cannot be re-enabled by local browser cache.
4. A first-time browser waits for the Owner public link refresh. If it fails, the handoff fails closed with a retry message rather than redirecting to an outdated provider.
5. Internal DBest transaction ID, user ID, service and subsection attribution remain attached to the handoff. InsuranceDekho's original `source=PARTNER&sub-source=BESTSERVICES_B2C` tags and NJ Wealth's `/13879` referral path are preserved.
6. Unauthenticated visitors are sent to the existing login flow; HTTPS is required for the four protected partner handoff sections.
7. No Owner tariff, payout, Cab, Marketplace, partner account settings or payment processor configuration was modified.

## Tests run

- **13 Node/V8 unit contract tests passed**, including Health/Motor/Life/Travel Insurance, both Flight choices, Hotel/Packages, MF choices, stale cache, disabled links, unsigned users, unsupported URL schemes, first-time device refresh and unrelated DBest services.
- **8 mobile Chromium-browser handoff tests passed**, executing the actual changed script fetched from the Vercel preview deployment. All outgoing partner navigations were intercepted and all transaction references were synthetic (`TX_QA_NO_PRODUCTION_WRITE`).
- The read-only **live Owner public-config test passed**, matching all exact URLs.
- The **Cab and Marketplace golden integrity tests passed**, including 15 Cab source fingerprints and 41 Marketplace protected source files, plus Cab/Vaahak customer/booking regression tests.
- The built preview is `READY`. The inspected candidate differs from original production source by only the single partner handoff runtime script and its regression test.

**Scope limitation:** The large full-site browser test became unstable in the isolated browser; the mobile Chromium results above use a lightweight DOM test fixture plus the real preview handoff script and public configuration verified separately. They establish the outbound handoff and attribution behavior, not a completed quote, policy, booking or investment on any partner system.

## Production deployment status — BLOCKED BY VERCEL, NOT RELEASED

- Vercel's new production deployment endpoint returned **402 `api-deployments-free-per-day`**, with a reported 24-hour retry window.
- Attempting to promote the already-built preview deployment returned **422 `unprocessable_entity`**.
- Deliberately **did not** alias a Preview-environment deployment directly to `dbest4u.com`, since preview environment variables and APIs may differ from production and would risk the already-frozen Cab/Marketplace business.
- The existing production deployment must remain unchanged until a proper authorized production deploy is available. **Do not describe this candidate as deployed or live.**
- Next release action: after Vercel's deployment limit resets or the Owner resolves the plan/quota, deploy the exact approved partner source (from the tested candidate plus the regression/CI files) as **production**, verify the new deployment SHA and its `dbest4u.com` alias, then run source-level + simulated mobile test against the live assets. Freeze the exact production deployment SHA only after that check.

## Freeze rule

Treat the tested candidate as a **protected release candidate** today, not an Owner-confirmed production flow. The Cab and Marketplace production golden releases remain protected and untouched.

Future partner-handoff edits require the Owner's approval, regression tests, same-tab navigation tests, exact affiliate-tag verification, and a rollback to the current approved production deployment. Before calling the public service **GO**, confirm actual partner login, quotation and post-handoff tracking where the partners permit it.

The tested candidate can be opened at `https://dbest-super-h720tuelw-db-est.vercel.app`, but do not use preview for customer financial transactions.
