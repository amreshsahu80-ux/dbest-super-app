# Marketplace targeted patch plan (draft; do not deploy directly)

## Preserve tested customer journey
Retain the existing Razorpay-verified checkout, Vendor readiness, Vaahak pickup and customer-confirmed delivery completion.

## Product ownership fix
In marketplace-live, replace the global ID upsert in vendor_catalog_save:
- If a supplied ID exists, require its vendor_id to match the authenticated Vendor.
- Update by BOTH id and vendor_id, and return 403 on a mismatch.
- For a new product, create a server-generated ID and insert under the authenticated Vendor.
- Reject caller-supplied IDs not found in the database, rather than allowing arbitrary new IDs.
- Prefer database policy or atomic RPC enforcing this invariant as a second line of defense.

## Payment authority fix
Do not derive prepaid from b.prepaid or b.paymentStatus. Read payment authority from the existing Razorpay verification and order-payment records. If not verified, keep Pending. Preserve cash-on-delivery logic.

## Delivery creation fix
Keep marketplace-live's existing createDelivery(order,vendor) path used when Vendor marks ready. In vaahak-commerce-live, require authenticated server-side authorization and verified order linkage for create_delivery. Do not disable the legitimate marketplace path. Ensure transaction ID uniqueness and idempotent retries.

## Acceptance and cancellation concurrency
Require atomic database-side transition guards for active Vaahak assignments and ride cancellation; assert affected row count and return 409 when state changed.

## Regression
Test previously working ₹500 + ₹10 order, Razorpay verification, Vendor readiness, Vaahak assignment, pickup, handover and completion. Also test cross-Vendor product ID, unverified prepaid, unauthorized delivery creation, duplicate retry, and concurrent accept/cancel.

Status: implementation and tests pending; production unchanged. PayU deferred.
