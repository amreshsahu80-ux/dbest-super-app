# DBest native Firebase push integration — isolated pilot (2026-11-01)

## Deployed backend pieces
- Existing Supabase project `ydedmotbacnllkijzmvp`: **new** private tables `native_fcm_devices`, `native_fcm_outbox`, `native_fcm_deliveries`. No existing table, trigger, site route or checkout flow modified.
- Edge Function `native-fcm-register`: DBest application session authentication; per-device, opt-in register/status/unregister. Supports `Member` → `com.dbest4u.app` / `com.dbest4u.app.test`; `Vendor`, `Vaahak`, `Service Partner` → `com.dbest4u.partner`. Rejects unauthenticated requests and mismatched app IDs.
- Edge Function `native-fcm-events`: server-only `health`, `preview`, `enqueue`, `process` endpoints. Source records resolved server-side; clients cannot supply arbitrary notification recipients or freeform content.

## Critical sending gate
Dispatch **does not run** without the server-side environment value `DBEST_FCM_SEND_ENABLED=true`.
Even when enabled, dispatch requires the **private** Firebase service-account JSON through `DBEST_FCM_SERVICE_ACCOUNT_JSON`, restricted to a backend secret store. Do not commit or upload that file to GitHub, Android resources, Vercel public environment variables or frontend code.
Do not enable sending before controlled pilot delivery and authenticated app account-binding testing.

## Progress and release blockers
- [x] Two independently verified Firebase device-token smoke tests: DBest Main test and DBest Partner (user verified notifications, app opening, and OFF behavior).
- [x] Private schema and RLS grants in existing Supabase project.
- [x] New independent registration and outbox functions deployed.
- [x] Idempotency check in rollback-only database transaction.
- [ ] Android app native-to-authenticated-session token registration handoff. Current "Test ON" switches are **device-only**.
- [ ] Validate logout / account switching and server-side token revocation.
- [ ] Configure service-account JSON in secret storage and test single-device server dispatch.
- [ ] Wire verified production events to `enqueue`: vendor order created, Vaahak offer, Service Partner job assigned, member confirmations / updates. Do not hook to frozen flows before regression test.
- [ ] Worker schedule, retry/recovery tests, topic/category preferences, stale-device cleanup and error-rate monitoring.
- [ ] Play signing/release, Data safety updates and actual nonprivileged account end-to-end QA.
- [ ] Owner controls: channel preference, audit log, allowlisted audience and explicit transactional/marketing consent.
- [ ] Security assessment for application token handling, abuse prevention, Firebase App Check or equivalent device-integrity mechanism.

## Verified event-type allowlist
`marketplace_vendor_new_order`, `marketplace_customer_status`, `marketplace_payment_confirmed`, `vaahak_ride_offer`, `vaahak_ride_status`, `service_partner_job_assigned`, `service_customer_job_status`.

`native-fcm-events` validates the referenced database object and derives the recipient from that object before enqueue or send. Never expose service-role keys to Android clients or website.

## Compatibility rule
Existing `push-notification-live` is **Web Push**, using VAPID / browser subscriptions. It is *not* FCM Android token registration. Keep both pipelines separate until migration is deliberately approved.

## Do not merge or deploy Android changes to the Play release until these gates pass.
