# Build 10 backend KYC safety gate — 2026-11-16

Scope: isolated PR #136 only. Read-only inspection of connected **DBest Super Platform Test** Supabase project `ydedmotbacnllkijzmvp`, Edge Function `partner-kyc-live` v12. No deployment or data mutation.

## Confirmed release blocker: destructive retry order

The deployed function's `upload` action obtains the old document record via `docsFor(own.id)`, then calls `sb.storage.from('partner-kyc').remove([old.storage_path])` **before** uploading the replacement file and before the `partner_kyc_documents` upsert. If the replacement upload fails, the DB still points to a deleted object. If the upsert fails after the new upload, the DB can still point to a deleted object and the new object is orphaned. The removal error is swallowed. This breaks safe retry and preservation of existing KYC.

**Required fix (isolated source, not live deployment):**
1. Validate session, role-specific document type, content type, size and file data.
2. Upload to a unique new storage key; do not delete the old key yet.
3. Upsert document metadata with ownership constraint and capture errors. On failure, delete only the *new* object, preserving the old object and row.
4. After successful DB persistence, re-read the document row and confirm its storage key matches the new key. Only then attempt best-effort deletion of the old object. Prefer a deferred cleanup queue for deletion failures.
5. Test storage upload failure, DB upsert failure, DB readback failure, retry of same document, and concurrent uploads. Prevent stale concurrent replacement from deleting the winning object.
6. Ensure the response reports success only after confirmed persistence. Keep Owner-only document review and approval checks.

## Authorization observations

`partner-kyc-live` has `verify_jwt:false` and uses service-role access. The function validates Vendor and Vaahak session tokens by hashing them, looking up unexpired sessions, and resolving the associated partner. Owner actions call `validate_owner_session`. This is a code-level authorization observation, **not** a completed adversarial endpoint test.

`service-document-live` authenticates a partner or member session, verifies the transaction belongs to the actor, uploads a new object, then inserts metadata; it removes the new object on DB insert failure. Its path is distinct from Vendor/Vaahak KYC. `service-partner-onboarding-v3.html` uses `service-document-live`, not `partner-kyc-registration-upload-v2.js`. Service Partner upload confirmation checks a returned document id and field, but a persisted-document list/readback was not established in this inspection.

## CI and release status

GitHub Actions for PR #136 head `c6ca9259`: Build 10 isolated KYC checks #84, Production-ID Canary #103 and One-Click FCM QA #100 passed. These are static/mock and unsigned compilation checks; they do not verify the backend replacement transaction, Owner decision flows, OTP, Service Partner persistence or first dashboard login. `supabase/functions/partner-kyc-live/index.ts` is absent from the Build 10 branch (404), so the backend patch must first be added to an isolated branch and tested before any deployment decision.

Release HOLD. Never modify production booking/wallet, existing partner records, notification flows, secrets or original signing keys. No signed versionCode 10 AAB is verified.
