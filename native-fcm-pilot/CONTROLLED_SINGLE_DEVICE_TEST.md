# Controlled backend-to-Firebase delivery QA (single Vaahak device)

**Status: NOT DEPLOYED / NO-GO as of 2026-11-02**

The existing production Supabase project currently has two privately registered native FCM devices (one DBest Member test app and one Vaahak partner app). Both passed registration, revocation and reconnection tests, but **no server-to-FCM notification has been sent**.

## Prepared, not activated

- Private `native_fcm_qa_attempts` table in the existing Supabase project, RLS enabled; no anon/authenticated grants; no rows created.
- Draft, isolated `native-fcm-qa-single` Edge Function source in this branch. Deployment was blocked by a security check. It is **not** an active Edge Function; do not treat it as operational.
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
- `native-fcm-qa-single`: **NOT DEPLOYED**
- `native_fcm_outbox`: 0 events
- `native_fcm_deliveries`: 0 events
- `native_fcm_qa_attempts`: 0 events

Follow Firebase's official FCM HTTP v1 authorization guidance, and Supabase's Edge Function Secrets guidance. The existing Android `google-services.json` does not authorize server sends.
