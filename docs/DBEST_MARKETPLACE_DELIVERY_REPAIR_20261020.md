# DBest Marketplace — Restored Delivery Completion / Protected Release

**Date:** 20 October 2026  
**Project:** DBest Super Platform  
**Public website:** https://dbest4u.com  
**Approved Cab production deployment:** `dpl_BH4La8R6fTTXKUPWVPJJKjyUtWkk` — **unchanged**  
**Reviewed Marketplace Edge source branch:** `fix/marketplace-completion-hardening-20261020`  
**Status:** Delivery completion regression patched and live; full Marketplace launch still requires operational acceptance checks.

## Confirmed incident

Historical completed deliveries could show `vendor_status = Ready for Pickup` while the Customer order and Vaahak job both had final `Completed` statuses. Three distinct completion paths could create or preserve this discrepancy. The Customer-first and Vaahak-first ordering also had an asymmetric double-completion behavior.

## Deployed functions (all ACTIVE)

| Supabase Edge function | Previous version | Current version | Scoped change |
| --- | ---: | ---: | --- |
| `marketplace-handover-live` | 5 | **7** | Complete both Customer and Vendor stages when already-Completed Vaahak job is confirmed; no duplicate update when already reconciled |
| `marketplace-vaahak-sync` | 6 | **7** | Synchronize Vendor completed status on completion and late payment notifications, reject unpaid completion |
| `vaahak-commerce-live` | 13 | **15** | Complete the child order and Vendor stage together; acknowledge a second completion action with `already:true`, no additional settlement writes |

**Authentication retained:** the existing `verify_jwt=false` setting is unchanged; these functions enforce their own session/token checks. Unauthenticated, mutation-shaped smoke requests without valid session tokens all return HTTP **401**.

## Release validation

All **11** synthetic authenticated completion tests passed against TypeScript-transpiled copies of the actual Edge source:

- Vaahak-first successful paid completion.
- Rejection of unpaid Vaahak completion.
- Late completed-job synchronization and late payment synchronization.
- Rejection of unpaid job-status synchronization.
- Customer confirmation after Vaahak-first completion; original completion timestamp preserved.
- Customer-first delivery completion.
- Vaahak second completion after Customer-first is idempotent.
- Repeated Customer confirmation causes no additional order-settlement-trigger writes.
- Rejection of unpaid Customer confirmation.
- Cab ride cannot be completed as a Marketplace delivery.

The existing seven Marketplace quotation/security checks and protected Cab end-to-end simulated tests also passed.

The byte-for-byte Cab integrity guard verified **15 protected production files**. No production Vercel website release, Cab tariff change, Cab Edge redeploy, booking mutation, refund, payment mutation, KYC approval, Vendor payout or historic order update occurred in this repair.

## Approved rollback sources

Original Edge functions are preserved under `supabase/edge-marketplace-backups/20261020/`:

- `marketplace-handover-live-v5.ts` and intermediate v6
- `marketplace-vaahak-sync-v6.ts`
- `vaahak-commerce-live-v13.ts` and intermediate v14

**Rollback requires a separately authorized Edge deployment** of the intended source with original `verify_jwt=false`; do not automatically roll back without investigating impacts on subsequent delivery orders.

## Unresolved operational and historical items

1. At Chakradharpur coordinates, the public catalogue currently returns **0 Grocery Vendors/0 products, 1 Restaurant Vendor/8 products, 0 Medicine Vendors/0 products**. Active catalogue inventory is not equal to approved, compliant, geolocated deliverable stock. Grocery/Medicine applicants still require legitimate KYC/compliance/Owner actions; Restaurant Vendors without pickup coordinates need GPS setup.
2. Four **historical** completed orders retain stale `vendor_status`. They were **deliberately not backfilled** because UPDATE triggers can recalculate settlement and master-order state; investigate and obtain explicit review before correcting history.
3. Twelve historical `Paid / Created` master orders have zero child orders; matching DBest ledgers are marked Verified for **₹3,840** (11 Preview-labeled records ₹3,758; one Production-labeled record ₹82). Merchant Razorpay capture/refund verification is needed before financial action.
4. Six completed Marketplace orders have six Vendor settlement records, **₹1,610 gross / ₹1,364 net**, none marked `Paid`. Confirm actual remittance before recording payment.
5. 89 Medicine catalogue image URLs point to placeholders and three Grocery records have no images. Correct real product media and eligibility separately, without making unsupported medicine claims.
6. A completed **live new order**, on two phones with genuine Customer/Vendor/Vaahak sessions, has **not yet been retested after this repair**. The mocked tests validate logic but cannot prove a real user's dashboard, notifications or merchant capture.

## Suggested live acceptance criteria

Use one legitimate Restaurant Vendor already approved and GPS-enabled, a real Customer session, and an available Vaahak.

1. Customer places an order and sees the correct item/price/delivery rule.
2. Vendor accepts → prepares → ready for pickup.
3. Vaahak assigned and confirms Vendor handover.
4. Vaahak starts delivery. Customer and Vendor see correct live milestones.
5. Verified **Razorpay** payment is received (no fake payment or cash workaround where payment is online only).
6. Customer confirms delivery / Vaahak completes. Both Customer and Vendor statuses must display **Delivered / Completed**, and the Vaahak job should be Completed.
7. Check Vendor net settlement and Vaahak delivery-earning amount without marking an unpaid settlement `Paid`.
8. Repeat any safe completion action and confirm no additional payment, payout or duplicate order.

After the Owner confirms real-device acceptance and financial reconciliation, freeze Marketplace in the same manner as Cab. Until then, full three-category Marketplace launch is still **NO-GO**, while the code regression itself has been corrected.
