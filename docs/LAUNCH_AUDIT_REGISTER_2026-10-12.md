# DBest Super Platform — Launch Audit Register
Audit date: 2026-10-12
Status: IN PROGRESS — NO-GO for unrestricted public launch.
Scope: GitHub repository, Vercel production configuration, Supabase database, Edge Functions and payment/role architecture.
Safeguard: no production deployment or database mutation authorized by this audit branch.

## Established inventory
- GitHub tree: 387 blobs, no conventional .test/.spec files and no checked-in SQL migrations detected; Android-build GitHub Action exists.
- Vercel: production deployment READY; working cab nearby GPS/Google photo/category priority verified by owner screenshot.
- Supabase project ydedmotbacnllkijzmvp: ACTIVE_HEALTHY; approximately 85 active Edge Functions, all configured verify_jwt=false (custom auth may apply).
- Public tables include member wallet, payout requests/events, vendor settlements, cab jobs, marketplace orders, notifications, KYC and admin hierarchy.
- Supabase security advisor: 74 RLS-enabled tables without policies (often intentional server-only), pg_net extension in public, leaked-password protection disabled.
- Performance advisor: 7 multiple-permissive-policy warnings, 42 unused-index advisories (do not remove indexes without workload review).

## Critical findings and required verification
P0-01 PayU create-payment accepts caller amount and creates pending record when transaction reference absent; missing authenticated-user gate in handler. PayU is intentionally TEST; do not enable LIVE or change keys/salt. Fix server-authoritative quote, ownership, allowed payment status, replay prevention; test before merge.
P0-02 Membership welcome-email endpoint originally accepted recipient and tier from caller; branch candidate now checks Supabase Auth + active onboarding record. Verify existing registration/session compatibility, email deduplication and authorization before merge. Do not deploy candidate untested.
P0-03 Payout UI includes localStorage rules and browser calculations. Confirm server wallet/allocations as sole financial authority; test Owner-only rule edits, payout approval, hierarchy, KYC, idempotency, withdrawals and reconciliations.
P0-04 All Edge Functions have platform verify_jwt=false; inspect custom session verification per sensitive operation. Never blindly enable JWT globally, as partner sessions use custom tokens.
P0-05 Validate RLS policies and service-role usage for all sensitive tables; 74 no-policy tables may be deliberately private.
P1-01 No automated browser/financial regression suite; implement protected CI and staging before further production patches.
P1-02 Cab discovery GO (observed); booking, fares, dispatch, two-way, carpool, completion and cancellations NOT VERIFIED.
P1-03 Marketplace Grocery/Restaurant/Medicine catalog, orders, COD/UPI/Razorpay, delivery PIN, vendor/vaahak handoff, refunds NOT VERIFIED.
P1-04 Partner onboarding KYC, agreement, approval, wallet, incentives, territory admin role isolation NOT VERIFIED.
P1-05 Notifications, WhatsApp, Resend, push, voice retries and consent NOT VERIFIED.
P1-06 Travel, insurance, mutual fund, government services and partner handoffs NOT VERIFIED.
P1-07 Android signed release, deep links, Google Play testing NOT VERIFIED.
P2-01 Optimize duplicate permissive policies after confirming intended read access.
P2-02 Enable compromised-password protection if compatible with auth plan.
P2-03 Review pg_net schema placement in maintenance window.

## Section go/no-go
Cab nearby discovery: conditional GO for observed UI only.
All financial flows, owner/admin, onboarding, payouts, marketplace fulfillment, cab dispatch, travel, insurance, investments, notifications and Android: NO-GO pending actual end-to-end tests.
PayU live: intentionally DISABLED; test mode only. Razorpay existing flows must be preserved, not assumed fully reconciled without gateway records.

## Release gates
1. Freeze and record working production SHA; maintain separate hardening branch.
2. Verify API and Edge Function authorization; enforce server-side financial calculations.
3. Validate RLS and storage privacy without widening access.
4. Build automated unit, API, role, integration and smoke tests.
5. Run controlled customer/vendor/vaahak/admin end-to-end transactions in staging; test failure/retry/cancel/refund.
6. Reconcile gateway payments to transactions, allocations, wallets and payouts; check duplicate requests.
7. Backup/restore, incident monitoring and rollback drill.
8. Release only after every P0 is closed, critical P1 scenarios pass and owner signs off.

This is a living audit register, not a claim that a complete 100% audit or public-launch certification has been achieved.
