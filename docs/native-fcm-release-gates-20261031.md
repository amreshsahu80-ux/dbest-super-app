# DBest Android FCM backend — isolated design, not deployed

This branch prepares the backend for both Android packages registered in Firebase
project `dbest-mobile-notifications`. No production schema or function has been changed.

## Architecture
- Main Android app: `com.dbest4u.app` authenticates a DBest **Member**.
- Partner Android app: `com.dbest4u.partner` authenticates **Vendor**, **Vaahak**, or **Service Partner**.
- Android opt-in occurs only after Android notification permission and an explicit user action.
- FCM auto-init is disabled in the current beta manifests until opt-in.
- Edge Function authenticates the existing DBest session token (SHA-256 hash lookup in existing session tables) and stores the FCM token separately from browser Web Push.
- A single FCM token per app instance is transferred to a new session upon login (upsert unique app and token hash). Old account can't continue receiving notifications for that app instance.
- OFF calls unregister to disable the precise device token; sender queries only opted-in active devices.
- Test sender requires a separate 32+ char private internal secret, **never** a client API key.
- Data-only FCM messages allow native service to respect opt-in before posting any system notification.

## Unmet prerequisites before deployment
1. Review migration, service role/RLS, session types, account switch/logout, permission and incident handling.
2. Apply migration **only to an approved isolated test Supabase environment**; test invalid/expired/foreign-role credentials and both app packages.
3. Configure Supabase secret `DBEST_FCM_PROJECT_ID` = `dbest-mobile-notifications`.
4. Configure `DBEST_FCM_SERVICE_ACCOUNT_JSON` directly in Supabase's protected Edge Function secrets (never in chat, GitHub, APKs or logs), using a least-privileged Firebase Messaging sender. Consider workload identity instead of long-lived JSON where supported.
5. Configure a separate `DBEST_FCM_INTERNAL_SEND_KEY` (random ≥32 chars) in Supabase secrets, and only invoke internal_send_test from an approved server environment.
6. Deploy preview Edge Function with `verify_jwt=false` **only because every register/status/unregister call separately validates a DBest role session**, and the test send checks a server-only secret. Do not expose internal key to the mobile app.
7. Implement opt-in/out flow in each Android app: explicit user action -> Android 13+ permission -> obtain FCM token -> authenticated `register` call -> reflect server success. On OFF: `unregister` and revoke/delete token locally. Handle token refresh/reinstall/log-out/account switch.
8. Test main and all partner roles with real, nonprivileged test accounts; foreground/background/killed state, notification taps, delivery de-duplication, rate limits, preference categories and revoked devices.
9. Only after success, review controlled Production Supabase release and separate Google Play internal builds; do not modify frozen Cab/Marketplace/deeplinks or public release automatically.

## Critical checks
- Never show "Notifications ON" merely because a build succeeds or FCM V1 is enabled.
- No guarantee of Android delivery until Firebase authenticated send credentials and actual FCM token registrations are verified.
- None of the SQL, Edge Functions, or server credentials on this branch have been deployed.
