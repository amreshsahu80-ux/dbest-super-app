# DBest Cab – Owner-Approved Golden Release Freeze

**Approved on:** 20 October 2026  
**Public site:** https://dbest4u.com  
**Verified production commit:** `f7305e05d2bedc50760062316dc98ebb7dbe7c31`  
**Verified Vercel deployment:** `dpl_BH4La8R6fTTXKUPWVPJJKjyUtWkk`  
**Untouched source snapshot:** `release/cab-golden-frozen-20261020`  
**Machine-readable manifest:** `cab-golden-lock.json` (in governance branch)  
**Golden integrity check:** `node tests/cab-golden-integrity.cjs`

## Release decision

The Owner has tested and explicitly accepted the end-to-end Cab flow. **FREEZE / NO UNAUTHORIZED CHANGES.** No new visual redesign, convenience feature, global loader, invoice patch or marketplace change may alter the approved Cab journey without explicit Owner approval and a new separate verified release.

The frozen behavior covers:

- User location, pickup and destination suggestions biased toward India and nearby places, with a pin-on-map fallback.
- Popular Nearby Places and Owner-configured tariffs, including minimum fares, Auto/E-Rickshaw, Bike, Sedan, SUV and round trip / same vehicle logic.
- Booking, Cash selection, nearest eligible Vaahak dispatch and live handoff.
- Online/GPS readiness, Vaahak offer acceptance, Ride PIN, active route map and Google navigation link.
- Payment confirmation only when money is actually collected, then separate Complete Ride.
- Customer's real-time milestones including **Completed** without reverting to Finding Vaahak.
- Persistent **My Rides / Invoices** tabs in Cab and member dashboard; member-authenticated historical records and transaction-specific completion receipts.
- Owner controls, referral/payout calculations, real earnings, marketplace dispatch conflict rules and existing non-Cab sections unchanged.

## Proof of the approved flow

The approved manual test was Bike Cash ride `TX43083335020`, database job `VJ43083490855`, completed successfully on 19 October 2026, receipt `DBR-43083490855`, recorded fare ₹48. The customer confirmed completion, ride history and invoice visibility on a physical phone. This reference is **evidence only**, not a test fixture to replay or update.

## Matching backend release references

These Supabase Edge Functions were active when the Cab baseline was frozen:

| Edge Function | Version |
| --- | ---: |
| `vaahak-live` | 29 |
| `vaahak-dispatch-live` | 36 |
| `vaahak-complete-live` | 2 |
| `member-ride-history` | 7 |
| `vaahak-customer-session-live` | 1 |

**Do not modify or redeploy the above functions as part of unrelated section updates.** Backend versions are recorded for comparison; unlike the protected repository files, the manifest does not technically lock external Supabase deployments.

## Requirements for any future Cab change

1. Obtain the Owner's explicit approval with the precise functional change and affected files.
2. Branch from the exact golden commit or from a documented, previously Owner-approved new Cab release, **never from a stale `main` without comparing**.
3. Preserve this snapshot branch and current Vercel deployment for rollback.
4. Run `node tests/cab-golden-integrity.cjs` when unchanged Cab behavior is required. If intentional approved Cab changes exist, make a **new versioned manifest**; never quietly edit the old golden baseline to pass.
5. Pass Cab UI/provider fallback, Owner tariff, booking-to-Vaahak handoff, GPS/map, payment/complete, Customer completed-state, history/invoice and core-startup regression suites.
6. Execute mobile-browser preview checks on isolated mocked data. Confirm the candidate changes only authorized files; never create real payments or ledger records for smoke tests.
7. Deploy to preview, then Production **only with Owner release consent**, verify the domain's exact deployment SHA and run post-deploy checks.
8. Complete a controlled real-device end-to-end check, preserving all existing customer history and payouts.
9. If validation fails, restore the last approved production deployment; freeze remains in force.

## Scope and enforcement limits

- The golden branch points at the **exact approved commit** and must not be rebased or force-pushed.
- `cab-golden-lock.json` records 15 critical source-code fingerprints (Git blob SHA-1); the integrity script flags any unexpected modification.
- The repository workflow executes protected Cab regression checks on the governance release branch. GitHub's **server-side branch protection / required status checks and Vercel production deployment policy** must also be configured by authorized administrators for a technically unbypassable lock; a Git branch and CI script alone cannot prevent someone with direct deployment credentials from deploying different code.
- Continue developing Insurance, Travel, Mutual Funds and Marketplace independently; do not silently change frozen Cab modules.

## Recovery

Prior approved Vercel production deployment: `dpl_BH4La8R6fTTXKUPWVPJJKjyUtWkk`. Golden commit: `f7305e05d2bedc50760062316dc98ebb7dbe7c31`. Do not roll back without assessing the impact on non-Cab changes deployed after the snapshot. **A Vercel rollback changes code, not live database transactions.**

Owner signoff: **Cab end-to-end flow accepted and frozen (20 October 2026).**
