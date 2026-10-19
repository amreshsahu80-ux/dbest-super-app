# DBest Partner Deeplink Handoffs — Controlled Repair and Freeze

**Date:** 20 October 2026  
**Approval:** Owner confirmed the existing exact partner destinations and authorized testing, hardening and freezing.  
**Current production:** https://dbest4u.com → Vercel deployment `dpl_BH4La8R6fTTXKUPWVPJJKjyUtWkk`, frontend commit `f7305e05d2bedc50760062316dc98ebb7dbe7c31`.  
**Current source-only baseline:** `release/partner-handoff-live-frozen-20261020` (identical to production).  
**Tested upgrade candidate:** `release/partner-handoff-hardened-candidate-20261020` at `c5ebf3913e65f275836772e2e950f8f1660c6ec3`.  
**Current status:** **HARDENED AND TESTED, NOT YET DEPLOYED** due to Vercel API daily deployment quota. Never represent the tested candidate as already live.

## Exact Owner-approved partner destinations

| Section | Destination | Subsections |
| --- | --- | --- |
| All Insurance | `https://www.insurancedekho.com/?source=PARTNER&sub-source=BESTSERVICES_B2C` | Health Insurance; Motor Insurance; Life / Term Insurance; Travel Insurance |
| Flights / Hotels | `https://dbestfly.com` | Flight Booking; Flight + Hotel; Visa Assistance |
| Hotels n Packages | `https://dbestfly.com` | Hotel Booking; Tour Package; Custom Itinerary |
| Mutual Funds | `https://p.njw.bz/13879` | Mutual Fund Investment; Portfolio Assistance |

**Live Owner configuration:** Existing InsuranceDekho, Flights and NJ Wealth URLs were verified unchanged in `app_settings.owner_console_settings.links`. The previously absent `links.travel` was added on 20 October using the exact DBest Fly URL and an `Explore Hotels & Packages` label; this config-only change is LIVE. No other Owner settings were changed. Core legacy Hotel subsections continue to require a code update before guaranteed direct handoff.

## Issues identified and corrected in candidate

1. **Separate Hotels n Packages screen** originally lacked an effective Owner partner setting and did not classify the service as an external handoff. The main Hotel destination was added to Owner settings, and candidate code routes Hotel Booking/Tour Package/Custom Itinerary through the existing DBest Fly handoff mechanism instead of the unrelated internal application/payment form.
2. **Affiliate URL mutation:** Existing code appended `dbest_tx_id`, `dbest_user_id`, `dbest_section` and `dbest_subsection` to external URLs. For the confirmed partner URLs, the candidate preserves the exact destination string and affiliate parameters. DBest keeps internal transaction tracking independently. An Owner-authored placeholder (e.g. `{DBEST_TX_ID}`) is still honored where deliberately configured.
3. **Stale local links:** Central public Owner settings now take precedence over obsolete links stored on individual customers' devices. Fresh sessions can wait for the public settings refresh before navigating.
4. **Mobile popup blocking:** All handoffs use same-tab `window.location.assign`, not legacy `window.open(...,'_blank')`.
5. **Delayed card race:** Repeated cross-section navigation could inject a former Insurance partner card into a later Hotel view. Candidate invalidates scheduled card renderings when the active service changes and avoids repeatedly triggering Owner refresh requests.
6. **Security:** A visitor must log in before an external tracked handoff. Disabled partner links cannot be used. Non-http(s) Owner URLs are rejected *before* creating a pending transaction.
7. **Accounting:** Redirect creates only `Redirected / Pending` transaction metadata. It must not invent paid/approved partner activity, cashback or referral/payout earnings. Existing external-success proof and Owner verification mechanism remains unchanged.

## Verification

- **13 source-runtime tests:** all passed for every Insurance subtype, all Flights/Hotels and Mutual Fund entries, precise affiliate/referral URL preservation, link disabled, guest login gating, future Owner overrides, stale local links, delayed Owner public config, unsafe schemes and section-navigation races.
- **Mobile visual check:** confirmed correct partner identity and button on Insurance, Flights/Hotels, separate Hotels n Packages and Mutual Funds screens in a simulated 393-pixel mobile browser. The initial test exposed a real late-card race; it was fixed and the mobile checks passed.
- **Link reachability:** DBest Fly responded HTTP 200 (redirecting to www), InsuranceDekho responded HTTP 200 with original affiliate parameters intact.
- **NJ Wealth external-site exception:** The approved `https://p.njw.bz/13879` redirects to an NJ onboarding endpoint, which returned HTTP 404 in a non-authenticated automated HTTP request. DBest must preserve this exact partner link. Confirm its actual behavior on a real phone or with the NJ Wealth Partner Desk before claiming the external onboarding destination is operational. Never substitute a generic NJ Wealth home page without Owner permission.
- **Deployment limitation:** Vercel returned HTTP 402 `api-deployments-free-per-day` when creating the isolated preview. The sandbox had no linked Vercel CLI/project to provide a reliable alternate route. No code was deployed to the public site.
- **Cab and Marketplace:** Existing golden manifests/source-guard tests are included in the candidate. No Cab/Marketplace code, active Edge function, pricing, orders, payments, settlements or transaction ledger records were changed for this task.

## Freeze policy and future release

`partner-handoff-freeze.json` is the review manifest. It records the exact approved partner URLs and Git fingerprints for six handoff/Owner/claim files and the regression suite. `tests/partner-handoff-golden-integrity.cjs` is a read-only guard. A GitHub Actions workflow checks it alongside Cab and Marketplace integrity guards.

**Do not mark release live or update the locked manifest without a verified deployment.**

Once Vercel preview deployments become available:
1. Deploy the reviewed candidate to **preview only** with its exact Git SHA, never from stale `main`.
2. Run automated contract and mobile-browser tests on the preview, including the real Owner `get_public` configuration and exact partner URL handoff attempts with *mocked* internal transaction capture. Make no real external policy purchase, investment or payment.
3. Confirm the NJ redirect on a customer device; escalate the third-party HTTP 404 if reproduced.
4. Confirm the Owner authorizes production promotion and that Cab/Marketplace golden source integrity checks still pass.
5. Deploy this reviewed change alone to `dbest4u.com`; verify release SHA/alias and transaction tracking without real commission.
6. After actual-device confirmation, create a **new deployed golden reference**, update the release status, and freeze it. Preserve both pre-release snapshots and rollback IDs.

## Technical enforcement caveat

Git snapshots, SHA fingerprints and CI checks are safeguards but not unbypassable production access controls. Required GitHub status checks, protected branch rules, Vercel production deployment restrictions and Supabase deployment permissions still require administrator configuration.

**Release decision at this point:** current live partner link destinations protected; new hardening candidate is ready but **NO-GO for production code release until Vercel quota and preview verification clear**.
