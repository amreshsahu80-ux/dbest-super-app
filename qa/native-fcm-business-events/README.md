# DBest Partner genuine business-event FCM hooks — STAGED ONLY

**Status, 11 November 2026: QA code written and tested in an isolated GitHub branch. Not deployed into DBest production.**

## Verified existing architecture

- Authoritative event sources: public.marketplace_orders_live (Vendor), public.vaahak_jobs_live (Vaahak) and public.hyperlocal_jobs_live (Service Partner).
- Production native-fcm-events Edge Function v7 already provides server-authenticated enqueue, preview and process, backed by native_fcm_outbox and delivery audit tables. It re-reads event records before sending. No automatic FCM triggers were attached to these three business source tables during inspection; the outbox had no rows.
- Earlier controlled synthetic Firebase tests successfully delivered to the separate com.dbest4u.partner.qa package for all three roles. This is not a substitute for a signed public Android release and production device registrations.
- Existing Service Partner profile member_id values matched partner_accounts_live.account_id for the two examined profiles; account roles are represented by service_partner (lowercase). Those profiles were not approved. Do not bypass Owner approval.

## Files

1. 01_inert_trigger_function.sql: defines only a security-definer trigger function that queues eligible events and uses unique event keys, but deliberately attaches NO database trigger. A queue problem must not roll back a real customer order, ride assignment or service job.
2. 02_attach_triggers_after_approval.sql: separately guarded activation file, blocked without an explicit owner-reviewed session setting. DO NOT EXECUTE ON PRODUCTION YET.
3. edge/native-fcm-events/index.ts: staged source snapshot of the existing worker, with additional payment/offer/approval eligibility and safe canary rollout gates. NOT DEPLOYED.
4. 04_rollback_triggers.sql: guarded rollback removes only the newly introduced notification triggers, retaining all outbox records and business data.
5. tests and GitHub Actions workflow: ephemeral PostgreSQL database and Deno typechecking. These tests use synthetic data only.

## Event design

| Role | When to stage a notification | Unique key |
| --- | --- | --- |
| Vendor | Approved active Vendor has an actionable New Order; real upfront payment must be confirmed, while pay-at-delivery may be pending collection | event + order ID + Vendor ID |
| Vaahak | Exact approved and available partner receives an Open job offer with future offer expiration | event + job ID + offered Vaahak ID |
| Service Partner | Job changes to Assigned for an approved active non-held Service Partner whose account has the service_partner role | event + job ID + partner account ID |

The worker always rechecks the source before sending. Stale/expired offers, reassigned jobs, cancelled/pending orders, blocked accounts and unapproved Service Partners must not receive an alert. The unique event key suppresses repeats, and a reassignment gives the new partner a distinct key.

## Default OFF rollout gates

- DBEST_FCM_SEND_ENABLED must be explicitly true to process anything.
- DBEST_FCM_ROLLOUT_MODE must be canary or all. Missing/other value fails closed.
- Canary requires a valid private allowlist of exact recipientType/recipientId pairs via DBEST_FCM_CANARY_RECIPIENTS_JSON. The list must be nonempty and at most 20 pairs. No identities or credentials are stored in the repository.
- Full rollout additionally requires DBEST_FCM_FULL_ROLLOUT_APPROVED=true, authorized separately.
- The branch does not set any flag, change any secrets, schedule a production worker, upload an AAB, or enable triggers.

## QA checks passed

Ephemeral PostgreSQL tests confirm eight uniquely queued synthetic events: 4 Vendor, 2 Vaahak, 2 Service Partner. Suppression tests cover pending upfront payment, held and unapproved vendors, expired rides, unavailable Vaahaks, and pending/rejected/suspended/wrong-role Service Partners. Reassignment produces a new recipient key; repeated changes do not duplicate. Trigger activation is rejected without approval. Rollback removes only new triggers and retains queued data. The staged Edge worker typechecks with Deno.

## Release prerequisites — NOT DONE

1. Confirm public signed Android Partner build, eligible registered production devices, explicit permissions/consent, correct recipient role and active valid sessions. Never send actual business events to the .qa app ID or public consumers without ownership checks.
2. Test genuine no-charge business-event transitions in a controlled staging environment and verify correct recipient, duplicate prevention, payment status, expiry and owner approval, including source revalidation.
3. Review, separately deploy and inspect the hardened Edge worker with sending OFF. Check private service role authorization and queue health. Confirm a scheduled authorized worker, retries and monitoring before allowing triggers to queue events.
4. Obtain explicit approval of the canary recipient and worker schedule. In a guarded, reviewed transaction, attach triggers, enable only private canary processing, and check outbox and delivery audit. DO NOT enable the full sender automatically.
5. After canary success, require explicit approval for wider rollout. Maintain frozen Cab/Marketplace flows, account-deletion compliance and Play reviewer access. Roll back by disabling sender and removing only newly added triggers; preserve business transactions and audit records.

No code or CI result here establishes that actual production rides, Vendor orders or Service Partner jobs are generating notifications yet. The production work remains isolated.
