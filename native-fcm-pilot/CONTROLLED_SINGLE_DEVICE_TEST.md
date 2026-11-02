# Controlled backend-to-Firebase delivery QA (single Vaahak device)

**Status: ISOLATED QA FUNCTION DEPLOYED / SENDING STILL OFF / NO-GO FOR PRODUCTION as of 2026-11-02**

The existing production Supabase project currently has two privately registered native FCM devices (one DBest Member test app and one Vaahak partner app). Both passed registration, revocation and reconnection tests, but **no server-to-FCM notification has been sent**.

## Prepared, not activated

- Private `native_fcm_qa_attempts` table in the existing Supabase project, RLS enabled; no anon/authenticated grants; no rows created.
- Isolated `native-fcm-qa-single` Edge Function **deployed** as version 1 after successful authenticated plugin deployment. General automatic event delivery is still separate and gated OFF by default. No QA sends or audit attempts yet.
- Intended design: explicit signed-in/approved Vaahak consent; installation ID and recipient verified against the server-side device registry; one device per test, max three test attempts in 24 hours, 15-minute idempotency window; no ride or Marketplace table writes; redact server credentials and FCM token from responses; store only FCM provider acceptance, not device-delivery confirmation.

## Requirements before ANY test

1. Security-review QA function source and any credential handling before deploying.
2. Securely configure Firebase project `dbest-mobile-notifications` service account in Supabase Edge Function Secrets under `DBEST_FCM_SERVICE_ACCOUNT_JSON`. **Never paste JSON into ChatGPT, a GitHub commit, an APK or website code.** Only project owners/authorized administrators should store it in the secrets UI.
3. Allow the isolated QA switch `DBEST_FCM_QA_SEND_ENABLED=true` for the single controlled test only. This must remain independent of `DBEST_FCM_SEND_ENABLED` (keep general sending OFF).
4. Expose a deliberate, rate-limited in-app test action from an authenticated approved Vaahak pilot build; do not accept public arbitrary recipient ids, tokens, phone numbers or notification content.
5. Verify *server accepted* from HTTP v1 response, then independently confirm the physical device received and opened the alert. FCM acceptance is **not** device delivery.
6. Turn QA flag back OFF after test, inspect audit records for one send only, confirm no unrelated recipients and no changes to Cab/Marketplace events or live orders.

## Live checks before deployment

- `native-fcm-register`: ACTIVE
- `native-fcm-events`: ACTIVE (general sending still gated)
- `native-fcm-qa-single`: **ACTIVE v1 (default QA switch disabled)**
- `native_fcm_outbox`: 0 events
- `native_fcm_deliveries`: 0 events
- `native_fcm_qa_attempts`: 0 events

Follow Firebase's official FCM HTTP v1 authorization guidance, and Supabase's Edge Function Secrets guidance. The existing Android `google-services.json` does not authorize server sends.

## Android QA test build

- Separate branch: `feat/dbest-partner-fcm-one-device-qa-20261102`; draft PR #84.
- GitHub Actions run 41492578970 **SUCCESS**; Android debug APK artifact 13163939429 generated and verified.
- App user flow after upgrading: on home turn Partner test OFF before uninstalling old signed build (revoke stale registration), install new test build, re-enable and connect approved Vaahak account; tap `🔔 Link` -> `Send one Vaahak backend test alert`.
- When ready for physical test the owner must add a **separate** `DBEST_FCM_QA_SEND_ENABLED=true` secret in Supabase, not the general sender flag. After test revert to `false`. No test has been sent or acknowledged yet.
