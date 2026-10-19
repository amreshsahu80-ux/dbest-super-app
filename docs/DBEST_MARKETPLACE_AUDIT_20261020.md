# DBest Marketplace — Isolated Launch Readiness Audit

**Audit date:** 20 October 2026  
**Release decision:** **NO-GO for full Grocery + Restaurant + Medicines launch**  
**Public production domain:** https://dbest4u.com  
**Protected Cab baseline:** `f7305e05d2bedc50760062316dc98ebb7dbe7c31`  
**Current approved Cab production deployment:** `dpl_BH4La8R6fTTXKUPWVPJJKjyUtWkk`  
**Audit branch:** `audit/marketplace-go-no-go-20261020`  

This is a **read-only audit**. No live orders, payment charges, refunds, historical records, Vendor approvals, payouts, inventory or Cab runtime files have been modified.

## 1. Public catalogue: verified against live API

At Chakradharpur coordinates (22.675, 85.635), the public `marketplace-local-catalog-live` endpoint returned:

| Category | Eligible location-matched Vendors | Purchasable products | Expected radius |
| --- | ---: | ---: | ---: |
| Grocery | 0 | 0 | 10 km |
| Restaurant | 1 | 8 | 15 km |
| Medicines | 0 | 0 | 15 km |

The database contains more **active catalogue records**, but these cannot be treated as deliverable inventory unless the corresponding Vendor is eligible (approved, active, not operationally held, agreement fully signed, pickup GPS, inside radius).

| Category | Active database catalogue records | Valid image URLs on records | Real product imagery |
| --- | ---: | ---: | --- |
| Grocery | 3 | 0 | Not ready |
| Restaurant | 12 | 10 | 10 stored images, though only 6 of 8 currently purchasable local items have image URLs |
| Medicines | 89 | 89 | **All 89 are `placehold.co` placeholder images**, not genuine medicine package photographs |

**Vendor eligibility:** One Grocery Vendor is Pending/KYC required and one is Rejected; the Medicine Vendor is Pending/Compliance Pending. Four Restaurant Vendors are Approved and Active, but **only one** has saved pickup GPS; there are also other pending/rejected Restaurant applicants. These states must not be bypassed for testing or launch.

**Decision:** Category-wide Marketplace launch is blocked by missing compliant, location-enabled Vendors. Medicine ordering must additionally be checked for pharmacy licensing, prescription validation and fulfillment eligibility.

## 2. Payment reconciliation: high priority, do not mutate

There are **12 older Marketplace master orders** recorded as `Created` with `payment_status='Paid'`, `total_amount=₹0`, and **zero linked child delivery orders**. Their corresponding DBest `transactions` ledger entries are marked **Verified** with Razorpay-style `pay_...` references, Razorpay order/payment identifiers and verification timestamps.

| Ledger environment label | Records | Verified ledger amount |
| --- | ---: | ---: |
| Preview | 11 | ₹3,758 |
| Production | 1 | ₹82 |
| **Total** | **12** | **₹3,840** |

**Caution:** The metadata label `Preview` does not prove that no live payment occurred. The `Verified` DBest ledger status does not independently prove settlement or capture at Razorpay. Reconcile against actual Razorpay merchant capture/refund/export records, **starting with the ₹82 Production item**, before taking action. Do not automatically create child orders, change payment status, issue refunds or mark funds received.

## 3. Vendor delivery milestones and payouts

There are 6 historically completed Marketplace child orders with 6 corresponding Vendor settlement rows:

- Gross order values: **₹1,610** total.
- Vendor net settlements: **₹1,364** total.
- No arithmetic mismatches in `gross_order_value - deductions = net_settlement`.
- **None of the six settlement rows is marked Paid**. These may be operationally pending; the Owner must verify actual remittances before changing ledger status.
- **4 of the 6 completed orders** have `vendor_status='Ready for Pickup'` despite `status='Delivered / Completed'` and the Vaahak job being `Completed`. This mismatch can show stale Vendor milestones and should be fixed only prospectively after investigating the responsible completion handler; avoid manually rewriting historical status without audit.

## 4. Upload Bulk Order and quotations

The `marketplace-list-upload-preview-v1.js` Customer UI defines the **Restaurant** button label as `Upload Bulk Order`; Grocery uses `Upload Shopping List`, and Medicines uses `Upload Prescription / Medicine List`.

The `marketplace-upload-client-v1.js` source supports JPG, PNG and PDF up to 8 MB, member-authenticated upload, signed storage upload, Vendor PIN/session authentication, Vendor quote submission and Customer acceptance. The existing secure member/vendor authentication must remain enforced.

At audit:
- **12 Restaurant upload requests** remain `Submitted`, all older than 48 hours.
- **1 Restaurant upload request** is `Quote Ready`.
- **2 Restaurant upload requests** are `Customer Accepted`.
- The quotation checkout drafts include an `order_created` record, but Customer acceptance alone does not prove a complete, fulfilled order.

**Follow-up:** Validate request-to-vendor routing, notifications, quote delivery, checkout and Vaahak handoff for this pipeline before public launch. Expired or pilot requests should be reviewed, not silently marked complete.

The quotation comparison tests currently validate Grocery radius 10 km; Restaurant/Medicine radius 15 km; sorting by landed price; rejecting invalid amounts; and expired quotes.

## 5. Code and safety gates

**Passed:**
- Existing 7 Marketplace test assertions (quotation radii, offer sorting, invalid price/quantity, expiry, authenticated sensitive multi-vendor calls, feature default-disabled, no service-role secret in client).
- The live public catalogue API responds HTTP 200 for Grocery, Restaurant, Medicines and Digital and enforces Vendor/location availability.
- Backend source requires approved fully-signed Vendors and an authenticated member for master-order creation.
- The handover backend checks verified payment before Customer delivery confirmation (source audit).
- Six Vendor settlements exist for six completed orders and reconcile arithmetically.

**Coverage limitations:**
- The legacy file `vendor-image-storage-fix.js` has a JavaScript syntax error, but no active loader references to that file were found; classify it as **unused legacy code** unless a new reference appears.
- Only 7 automated Marketplace assertions were present; these do **not** cover full real Vendor acceptance → Vaahak pickup → verified payment → customer delivery → settlement.
- The isolated live-site mobile-browser audit crashed and cannot be claimed as a passed UI test.
- No authorized Customer/Vendor logged-in live end-to-end order has been simulated or created in production during this audit.
- The multi-vendor quote provider uses an external demo routing service for road distance and returns a service error when unavailable, creating an availability dependency.

## 6. Prioritized resolution sequence

1. **P0: Financial reconciliation.** Verify the 12 Razorpay references, especially the ₹82 Production record, against the merchant's actual captured/refunded status. Determine whether missing delivery child orders are historical test data or real unfulfilled orders.
2. **P0: Eligible Vendor coverage.** Complete pending Grocery and Medicines KYC/compliance, Owner approval, Vendor agreement signing and pickup GPS; add Restaurant pickup coordinates where missing. Do not auto-approve.
3. **P1: Vendor payment reconciliation.** Review ₹1,364 net outstanding in settlement rows against actual Vendor transfers. Do not auto-mark as Paid.
4. **P1: Status hardening.** Repair prospective Vendor delivery milestone updates so `Delivered / Completed` cannot be accompanied by a stale `Ready for Pickup` Vendor stage. Verify the Customer milestones too.
5. **P1: Catalogue completion.** Populate genuinely relevant images/brands and product categories; remove medicine placeholders; ensure product images are appropriate to their actual items, without repeated generic images.
6. **P1: Upload/quote reliability.** Verify 12 aged Submitted requests, outstanding Quote Ready and Customer Accepted paths, real Vendor notification and checkout-to-order reconciliation.
7. **P1: Run 3-category isolated end-to-end tests** with mocked payment/dispatch and authenticated Vendor/Customer sessions; test rejected/missing GPS/stock/payment cases, multi-vendor orders and active ride versus delivery conflicts.
8. **P2: Harden ongoing CI**, remove unreferenced invalid legacy JavaScript and restrict production release to an explicit approved source branch, full test suite, owner signoff and rollback readiness.

## 7. Production release policy

**Maintain the Cab golden freeze.** Marketplace audit and future Marketplace fixes must occur in an isolated branch/preview. Do not modify Cab UI, Cab tariff, Google location, Vaahak ride payment, current Cab completion receipts or protected Cab release baselines.

**No automatic financial mutations:** No test orders in live payments, fake Razorpay charges, fabricated Vendor settlements, approval bypasses, mass order status updates or retroactive customer-account changes.

**Release gate:** Marketplace remains **NO-GO for all-category public launch** until Vendor coverage, accounting exceptions and end-to-end Customer/Vendor/Vaahak journeys are resolved and independently verified. The Restaurant pilot may continue only within existing eligible-store geography and monitored transactions.
