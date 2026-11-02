# Vaahak New Ride Native FCM — isolated intake pilot

**Status (2026-11-02): PREVIEW-READY, NOT LIVE AUTOMATIC SENDING.**

The live Supabase project has a new *separate* Edge Function `native-fcm-vaahak-intake`. Its source lives in this isolated branch. No live Cab/Marketplace source file, ride job, job status, or partner assignment was modified. A minimal hook for the existing `vaahak-dispatch-live` offer-creation branch is stored under `staged-dispatch-reference/` for comparison; it was **not deployed**.

## Operation
- `POST /functions/v1/native-fcm-vaahak-intake` with `apikey` equal to the **server-side service-role key**. Public or member/partner client credentials cannot call it.
- JSON `{"action":"preview"}` performs a read-only eligibility check.
- JSON `{"action":"enqueue","jobId":"VJ..."}` targets exactly ONE dispatch-issued job and is **disabled by default**. It requires **both** private environment flags `DBEST_FCM_RIDE_INTAKE_ENABLED=true` and `DBEST_FCM_SEND_ENABLED=true`. Neither was set or changed in this work. A caller cannot override these flags.
- Does not create rides, update jobs, change assignments, or call the existing dispatch/ride APIs.
- A prospective live offer must have `kind=ride`, `status=Open`, a real `offered_partner_id`, no accepted `assigned_partner_id`, positive `offer_attempt`, unexpired `offer_expires_at`, and recent `dispatch_last_at`. Requires at least **60 seconds of offer time remaining**.
- Recipient must be an **approved, available, not-on-hold Vaahak**, with rides not opted out and an enabled, permission-granted Partner app device recently seen.
- Idempotency key: `vaahak_ride_offer:<job ID>:<offer attempt>:<offered partner ID>`, so a reoffer to another Vaahak or later attempt has separate identity. Repeated intake calls for one attempt cannot enqueue duplicates.
- The **staged** worker on this branch re-reads job, attempt, target recipient and driver eligibility before sending, uses remaining-offer TTL, and targets the newest Vaahak Partner installation only to avoid duplicate stale-installation messages. **This staged worker source has not been deployed to the existing `native-fcm-events` function.**
- The previously tested QA-only notification function remains separately hard-disabled. General sending must stay OFF.

## Verification
- GitHub Actions `Vaahak FCM Offer Rules QA`: tests passed for valid offers, status and expiry rejection, assigned rides, deliveries, absent recipients, missing and stale timestamps, future timestamps, and offer attempt deduplication.
- SQL snapshot at review: zero current valid live ride offers; zero native FCM outbox events; zero business FCM delivery attempts.
- Two registered Vaahak installation records remain for one account after reinstall. They need token/device lifecycle review before production rollout.

## Required release gates
1. Review native-fcm-events worker changes and verify after simulated reassignment, cancellation and expiry that no alert can reach wrong recipient.
2. Add a **staged** event invocation from the **actual offer creation branch** in `vaahak-dispatch-live`, with immediate enqueue/worker processing. Do not modify live dispatch unless golden-path regression tests pass and Owner approves promotion.
3. Confirm the correct Vaahak workspace opens on Android notification tap, on foreground and background paths, without compromising login or showing another user's data.
4. Resolve stale installation registrations and handle logout/session switch and device token rotations.
5. Test with isolated synthetic rides and sandbox partner accounts only. No backfills or historical job notifications.
6. Enable live intake and sender switches only for a separately approved limited rollout, with monitoring, rate limits, pause/rollback and cost controls.

**NO-GO for public automatic push until every gate passes.**
