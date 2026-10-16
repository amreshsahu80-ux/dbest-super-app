# Marketplace upload security and release checklist — 13 October 2026

## Before staging deployment
- [ ] Confirm Vendor approval value and Vendor category column from production schema. Do not assume `owner_approval='Approved'` or `type` without verifying real values.
- [ ] Confirm member token accessor and runtime Supabase publishable key. Current client adapter names are placeholders until verified.
- [ ] Add server-side MIME signature inspection, including rejecting polyglot files, encrypted PDFs where inspection is required, and metadata mismatches.
- [ ] Implement atomic per-member rate limiting, pending-upload expiration and cleanup of orphaned private objects.
- [ ] Prevent quotation races by using a database RPC with conditional update and audit event; validate money in integer paise.
- [ ] Confirm signed-upload method/headers against installed Supabase JS and browser; verify URL encoding and object-path restrictions.
- [ ] Validate quote version with server-generated immutable revision, not only timestamps.
- [ ] Add authenticated Vendor UI, customer Vendor selection, and customer request status/acceptance UI.
- [ ] Integrate accepted quote into server-authoritative Razorpay checkout; never infer payment from browser.
- [ ] Keep prescription documents private, require pharmacist review and define deletion/retention rules.
- [ ] Verify SQL migration on staging including Storage bucket policy, constraints and RLS.
- [ ] Test expired/reused signed URLs, cross-Vendor access, member impersonation, file spoofing, oversize, double-submit, quote edit race.
- [ ] Re-run existing catalogue Razorpay checkout, COD (if enabled), Vendor fulfilment and Vaahak handover regression.
- [ ] Explicitly approve production rollout only after staging and rollback validation.

## Current decision
NO DEPLOY. Code is draft; no claim of production readiness or end-to-end validation. PayU excluded.
