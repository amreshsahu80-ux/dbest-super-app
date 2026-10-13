# Marketplace Upload API Contract — draft

Implementation target: Supabase Edge Function `marketplace-upload-requests`. No live endpoint is deployed yet.

## Actions
- `create_request`: validate category, selected approved Vendor, customer identity or securely issued guest tracking session; create a pending upload record and short-lived upload permission for a private object path. Never accept a client-provided storage path.
- `finalize_upload`: verify actual object metadata (size ≤8 MB, MIME, magic bytes, permitted extension), associate the object with the pending request, mark Submitted.
- `vendor_list`: validate active Vendor session, return only that Vendor's requests.
- `vendor_quote`: validate Vendor session and ownership, itemized quantities and pricing, then mark Quote Ready. No payment accepted here.
- `customer_status`: validate request-specific customer token or authenticated member ownership; return quote and status, never disclose other customers' documents.
- `customer_accept`: validate quote version and customer token, store acceptance; then create a server-authoritative checkout session.
- `cancel_request`: allow authenticated owner of the request to cancel while eligible.

## Guardrails
- Use private storage and expiring signed URLs; no public prescription URLs.
- No raw service-role credential in browser. Never trust client prepaid status or quotation totals.
- Atomic status transitions, expiry, idempotency keys and audit events.
- Validate medicine prescriptions through the licensed pharmacy workflow; no automated approval of restricted medicines.
- Rate limits and retention policy; protect sensitive contact and medical documents.
- Keep existing catalogue orders and Razorpay checkout unchanged until staging regression passes. PayU remains deferred.

## Test gate
1. Grocery/Medicine/Restaurant request upload and quote.
2. File-type spoof, oversized file, unauthorized Vendor access, expired URL and repeat request.
3. Quote change after approval must invalidate acceptance.
4. Customer must approve amount before Razorpay checkout; no delivery job before payment/approved COD workflow.
5. Existing ₹510 catalogue checkout and handover/receipt confirmation remain unaffected.

Status: design only; API not implemented or deployed.
