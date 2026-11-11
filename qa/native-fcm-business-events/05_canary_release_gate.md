# DBest Partner FCM — release gate and controlled canary checklist

Status: **QA PASSED; PRODUCTION NOT ACTIVATED**  
CI: https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/42987679409  
Draft PR: https://github.com/amreshsahu80-ux/dbest-super-app/pull/119

## Owner-only phone selection — 11 November 2026

The Owner explicitly selected **their own Android phone as the exclusive intended canary device**. This is consent to **plan the controlled test**, not permission to enable production sending, use historic Partner tokens, approve pending accounts, deploy code, or send real customer alerts.

**Verified current restrictions:** The existing production FCM table contains three old enabled Vaahak app registrations (last observed 2 November 2026), but none is cryptographically verified as the Owner's current phone. The separately installed `com.dbest4u.partner.qa` debug APK is fully unregistered after earlier QA; its device identifiers/registration live in `native_fcm_devices_partner_qa`, **not** the production FCM table. Neither a Vaahak account match nor prior screenshot proves ownership of those three legacy installations. Do not enroll any of them automatically.

The staged worker now **requires exactly one** canary configuration entry containing exact `recipientType`, `recipientId`, and a validated UUID `installationId` in `DBEST_FCM_CANARY_RECIPIENTS_JSON`. In canary mode it selects **only** a registered `com.dbest4u.partner` device with that exact installation ID, correct Partner role/account, `enabled=true` and `permission_status=granted`. It fails closed for missing identity, multiple canaries, or duplicate matching device rows. The Owner's QA debug APK cannot be substituted for a signed production build; production rollout requires separate app verification and approved test enrollment.

Before any production canary, identify the phone using consented authenticated registration in a properly signed production Partner build; verify app package, account/role and installation ID without posting sensitive token or IDs publicly. The existing authorized Vaahak account is currently offline and the previously used Service Partner test profile remains unapproved. Do not change either state merely for notification testing.

## What was actually tested

1. Temporary PostgreSQL generates legitimate business-event **INSERT/UPDATE** transitions for Vendor orders, Vaahak offers, and Service Partner assignments.
2. The staged SQL triggers create 8 deduplicated outbox notices.
3. After the source records change, the staged worker's **actual** `fromEvent` and `isCurrentRecipient` helpers revalidate all queued notices. Five remain eligible; three are rejected as stale (a Vendor reassignment and two no-longer-valid Vaahak offers).
4. Each eligible notice is turned into the **actual staged Partner Android data-only FCM payload**, with correct event key, role and safe deep link.
5. Rollout-gating unit tests verify `DBEST_FCM_SEND_ENABLED` defaults OFF, an explicit canary role/account allowlist, and independent full-rollout authorization.
6. Existing unit suites still validate 11 source-eligibility cases and three Android payload/path cases.
7. Trigger activation refuses an absent owner-release guard; isolated rollback drops only the new hooks.
8. No Firebase API calls, real notifications, customer transactions, payment writes, ride assignments, or business-record changes were made by these CI tests.

## Read-only production baseline (11 November 2026)

- New native FCM business-event triggers installed on live tables: **0**.
- Production FCM outbox events: **0**.
- Enabled production Partner device registrations (Vendor / Vaahak / Service Partner): **3**.
- Isolated Partner QA device registrations after successful earlier unlinks: **0**.

These counts are observational snapshots, not commitments about future state. Three production registrations are **not** evidence of three consenting canary testers.

## Do not activate until all conditions are satisfied

- [ ] Confirm **separate explicit consent to receive real business-event alerts** on the selected phone; the Owner has already named that phone as the intended tester but production sending remains unauthorized. Verify exact Partner role, authenticated account, signed production-app installation UUID and current phone ownership without exposing identifiers in tickets.
- [ ] Confirm a properly signed, reviewed Partner production app build with the intended data-only notification handler and deep link routing; **QA `com.dbest4u.partner.qa` is not interchangeable with production `com.dbest4u.partner`**.
- [ ] Verify real partner consent, Android notification permission, account binding, notification preferences, revocation on logout and correct device isolation.
- [ ] Perform privacy/security review of the three new SQL triggers, the staged worker, role/account eligibility guards and the canary recipient allowlist.
- [ ] Exercise source revalidation for expired/reassigned/accepted/cancelled ride offers; online-payment-pending orders; approved/held/rejected partners; account revocation; FCM invalid tokens; retries; duplicate prevention.
- [ ] Verify application provider credential matches the signed Android app's Firebase project and the production Android foreground/background/notification-tap behavior.
- [ ] Test with genuinely isolated **staging** events, server APIs and a vetted tester; no real users or paid transactions.
- [ ] Decide on a bounded canary window, alert-volume ceiling and observability for `native_fcm_outbox` and `native_fcm_deliveries`.
- [ ] Obtain explicit owner approval to perform the *live* migration and narrow production canary, with an immediate stop/rollback operator available.

## Controlled rollout order (only after approval)

1. Verify baseline and backup change manifest. Keep `DBEST_FCM_SEND_ENABLED=false`, rollout mode `off`.
2. Deploy reviewed staged worker while sending remains OFF. Confirm `health` shows disabled.
3. Install inert trigger function, then attach the three triggers using reviewed guarded migration. Never attach hooks without explicit owner authorization.
4. Register **only the opted-in tester(s)** to a private canary allowlist of exact `recipientType + recipientId` pairs. Do not use an unscoped phone list or broad role.
5. Set rollout mode `canary` with full rollout disabled. Enable sender and invoke the private worker manually for a tightly scoped, observed test case.
6. Check backend enqueue dedupe, source recheck, correct recipient/device, provider acceptance, phone delivery, tap routing, and logout revocation. Reassignment/cancellation must suppress stale queued events.
7. Stop test sending and document results. Broad activation requires its own explicit review and approval.

## Immediate stop and rollback

1. Set production sending disabled and rollout mode OFF before any further processing.
2. Use guarded `04_rollback_triggers.sql` to remove only the new notification hooks. Do not delete existing orders, rides, service jobs, device identities or outbox history.
3. Check for processing/pending queue records; preserve evidence and do not replay deliveries blindly.
4. Reconcile provider-accepted sends with per-device delivery audit and recover only authorized events if explicitly approved.

**Not done:** production deployment, production event-trigger activation, Firebase provider send, live canary, automatic scheduled worker, signed Play Store release.
