# Isolated Supabase Vaahak FCM QA — 2026-11-03

## Scope and privacy
User approved temporary Supabase branch creation at $0.01344/hour. Branch `dbest-vaahak-fcm-isolated-qa-20261103` / project ref `slhvcylhtkkutvgcxpfx`, derived from `ydedmotbacnllkijzmvp`, without copying production data. The branch is **not** an authorization to change live Cab dispatch, upload tokens, enable FCM send flags, or merge any PR.

## Execution
- Branch provisioning succeeded, but inherited migrations finished in `MIGRATIONS_FAILED` state. Of the 207 migrations present on the parent at inspection, only 128 were present in the branch before new QA migrations.
- Branch remained missing key current ride-offer columns (`offer_attempt`, `offer_expires_at`, `dispatch_last_at`, and `offered_partner_id`) on `vaahak_jobs_live`. Therefore **real dispatch-to-notification E2E was NOT executed**.
- Applied **only to isolated branch**: `vaahak_fcm_isolated_pilot_core_tables` and `vaahak_fcm_single_active_device_binding`.
- Verified RLS enabled on `native_fcm_devices`, `native_fcm_outbox`, `native_fcm_deliveries`, and `native_fcm_vaahak_active_installations`. `anon` and `authenticated` had no SELECT permissions.
- SQL transaction/rollback synthetic registration tests PASS: select only newest explicitly bound device; outdated logout does not revoke active binding; current logout disables all delivery with no fallback; expiry disables delivery with no fallback; cross-account mismatch rejected.
- SQL transaction/rollback outbox tests PASS: duplicate event key retains one row; a second offer attempt generates a distinct event.
- Read-only synthetic offer-criteria SQL cases PASS 6/6: current Open ride, cancellation, expiry, near-expiry, stale dispatch, wrong event kind. Actual TypeScript offer rules were independently exercised by GitHub CI.
- Final QA table counts: 0 devices, 0 queue entries, 0 deliveries, 0 active bindings. All synthetic writes were rolled back.
- General business FCM sending remains disabled, and **no production branch or live Cab function was modified**.

## Release decision
**NO-GO** for automated live Vaahak ride FCM. The isolated migration tests passed but the parent migration-chain regression prevents full backend/Android E2E on this branch. Before rollout:
1. Resolve/reconcile Supabase branching migration failure in a separate, controlled migration-repair task.
2. Recreate a clean, up-to-date isolated project with actual ride-offer schema; rerun registration, delivery, cancellation, reassignment, expiry and retry scenarios through real Edge Functions.
3. Run a limited opt-in phone pilot with one real ride only after production rollback/scope safeguards are reviewed.
4. Confirm device binding on reinstall and account switching; production adoption requires current Vaahak app to re-link explicitly.
5. Keep all send flags OFF and frozen live Cab/Marketplace unchanged until Owner GO.

The billed temporary test branch should be deleted after the above evidence is saved so that hourly compute charges stop.
