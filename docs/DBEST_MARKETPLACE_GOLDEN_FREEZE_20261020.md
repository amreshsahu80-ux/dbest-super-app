# DBest Marketplace — Owner-Approved Golden Release Freeze

**Decision:** FROZEN — no unauthorized changes to the proven Marketplace flow  
**Approval date:** 20 October 2026  
**Live website:** https://dbest4u.com  
**Unchanged production frontend commit:** `f7305e05d2bedc50760062316dc98ebb7dbe7c31`  
**Unchanged Vercel production deployment:** `dpl_BH4La8R6fTTXKUPWVPJJKjyUtWkk`  
**Marketplace backend/source snapshot commit:** `0ea380bc88bba7cc6d22facfa199c846c192af99`  
**Untouched golden branch:** `release/marketplace-golden-frozen-20261020`  
**Machine-readable source+Edge manifest:** `marketplace-golden-lock.json`  
**Read-only integrity command:** `node tests/marketplace-golden-integrity.cjs`  
**Regression workflow:** `.github/workflows/marketplace-delivery-release-gate.yml`

## Owner acceptance and frozen behavior

The Owner confirmed that Customer, Vendor and Vaahak Marketplace ordering had already been tested end to end and asked for the demonstrated flow to be frozen rather than retested yet again. The 20 October 2026 scoped repair corrected the verified **completed order still appears Ready for Pickup to Vendor** regression. Its code and nine initial / eleven final mocked completion cases passed; the backend was updated in place and source equality verified.

**These proven software behaviors are frozen:**

1. Customer selection of Grocery, Restaurant and Medicines, location radius (Grocery 10 km, Restaurant/Medicines 15 km), local Vendor catalogue and available item prices.
2. Catalogue display, bulk/list/prescription uploads, Vendor quote creation and Customer quote acceptance.
3. Secure member and Vendor sessions, master/child order creation, payment options and verified Razorpay payment requirements.
4. Owner-defined service fees, Vendor net receivable and Vaahak delivery earnings, preserving payment ledgers.
5. Vendor Accept/Reject → Preparing → Ready for Pickup → Vaahak Handover → Delivery Started → Delivery Complete.
6. Vaahak notification, accept/start delivery, verified handover and Customer status milestones.
7. Customer-first and Vaahak-first completion both reach `Delivered / Completed` on the Customer order and Vendor milestone.
8. Retries and repeated completion buttons do not cause duplicate settlement-trigger writes. Unpaid delivery remains blocked from completed/paid status.
9. Normal Cab rides cannot be completed through Marketplace delivery functions.
10. Existing Cab GPS, destination maps, Ride PIN, payment completion and invoice flows stay byte-for-byte unchanged under their own golden release.

**Approved software snapshot:** 41 Git source file fingerprints (38 production UI/shared files + three reviewed Marketplace Edge function sources), and the live deployed version and compiled bundle SHA-256 of 18 Supabase Edge Functions.

## Edge release and recovery

The Marketplace Edge function versions active at freeze are captured in `marketplace-golden-lock.json` with exact bundle SHA-256 digests; these are authoritative for detecting a later deployment drift.

The three delivery-completion functions are specifically:
- `marketplace-handover-live` **v7**
- `marketplace-vaahak-sync` **v7**
- `vaahak-commerce-live` **v15**

Their exact versioned source is preserved in `supabase/functions/<name>/index.ts` on the frozen branch. Earlier live versions are preserved in `supabase/edge-marketplace-backups/20261020/`, including the pre-fix and intermediate versions. All other Edge function version/digest records can be compared to Supabase current versions; their live source is *not automatically restored* by switching the Git branch.

**Never redeploy or roll back these functions without explicit Owner approval, since the functions update real shared production orders and settlement triggers.** The previous function versions are rollback sources, not automatic rollback instructions.

## CI protection and release rules

The Marketplace integrity test checks Git blob SHA-1 of all 41 protected committed files and validates the 18 recorded Edge function identities. It runs before the Marketplace delivery contract tests. The Cab integrity test also runs, followed by simulated authenticated Edge completion tests, quotation/radius/auth tests, and simulated Cab/Vaahak payment and invoice checks.

The Marketplace freeze must block unapproved UI redesigns, catalogue renderer swaps, payment policy modifications, settlement changes and Edge completion changes. Business administrators may continue ordinary Vendor KYC/approval, GPS, stock/rate updates, order processing and legitimate payouts; **freezing code does not freeze business operations or live data**.

For an Owner-approved change:
1. Describe its precise scope and obtain explicit authorization.
2. Create an isolated feature branch and backup all affected live Edge function versions.
3. Preserve the original approved snapshot branch and production deployment.
4. Demonstrate the exact failing case, verify mocked Customer, Vendor, Vaahak and payment paths, and run the Cab golden test.
5. Reconcile the new source versus current production; release only allowed files/functions.
6. Do not edit this manifest in place to bypass failure. Publish a **new dated golden version** after Owner signoff.
7. Verify the deployed backend versions and live URL; rollback only if needed and explicitly authorized.

**Limitations:** This is a Git reference, version manifest and CI source-integrity gate, not a server-side prohibition against all writes. Enforce GitHub branch protection/required checks and Vercel+Supabase deploy permissions in administrator settings for non-bypassable production controls. CI cannot independently authenticate to Supabase to re-read live bundle digests without configured credentials; those digests were checked directly at freeze and must be checked before any later Edge release.

## Separate public-launch issues (not waived by freeze)

The delivery logic is proven/frozen, but all-category public launch remains subject to separate GO/NO-GO checks:
- Grocery/Medicines Vendor KYC, licensing/compliance, Owner approval and geolocated pickup setup.
- Historical Razorpay receipt reconciliation for 12 orphan `Paid / Created` master orders, including one Production-labeled ₹82 record. No automatic refunds or ledger edits.
- Vendor settlement transfer evidence for six completed historical orders, net ₹1,364. Do not mark `Paid` without evidence.
- Four historical completed orders with stale Vendor stage, deliberately not backfilled due to SQL settlement/master-order triggers.
- Catalogue coverage and medicine package image placeholders.

**No fresh live test order is required to preserve the previously user-confirmed working flow.** The 20 October regression source was also independently tested, but it has not been newly signed off by a physical-device booking since the latest repair. Freeze is a stability decision, **not a claim that all Marketplace operational/public-launch checks have passed.**

**Owner freeze instruction:** Preserve and harden the approved Marketplace flow, alongside the already frozen Cab flow, and avoid regressions during work on unrelated DBest sections.
