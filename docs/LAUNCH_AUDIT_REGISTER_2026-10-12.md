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

## Read-only financial verification — 2026-10-13
- All nine member wallet account available balances individually reconcile to the signed wallet ledger: 0 mismatches (threshold ₹0.009).
- Ledger totals: 70 Earning Credit entries ₹2,995.91; 6 Earning Reversal entries -₹95.40; one ₹10 Payout Hold and one ₹10 Payout Release; net ₹2,900.51.
- 70 earning allocations have non-null idempotency keys; no duplicate keys; no orphan Earning Credit ledger rows; no linked earning-credit/allocation amount mismatch; no duplicate credited source/beneficiary/earning-level tuples found.
- Fifteen wallet ledger entries lack a match in transactions.transaction_id, but all 15 match member_earning_allocations.source_transaction_id; 11 credits ₹113.26 and 4 reversals -₹75.40. Their underlying original service records remain unverified. Marketplace allocations include cab_completed labels; investigate event naming and source semantics before treating as a defect.
- Razorpay: 22 transactions internally marked Verified, sum ₹7,296; independent Razorpay gateway settlement not verified.
- Payouts: one ₹10 request, status Failed; events Requested → Approved → Processing → Failed. Corresponding hold/release is consistent with returned wallet funds. No successful bank payout verified; authorization and replay controls still need end-to-end tests.
- PayU is expressly DEFERRED by owner; do not test, modify, or enable live PayU in this audit phase.
- All verification above is read-only. No production deployment or database mutation.

## Owner and wallet access review — 2026-10-13
- Inspected deployed Supabase Edge Function source for owner-control-live and member-wallet-live (read-only).
- owner-control-live requires x-dbest-owner-token validated via validate_owner_session RPC before get_owner/save_snapshot; get_public intentionally returns a subset of configuration without owner authentication. Review whether public subset contains sensitive settings.
- member-wallet-live validates hashed, unexpired member session against active member record for wallet/status and payout requests; explicitly excludes Starter. Owner payout listing, payout decisions and rule editing all validate x-dbest-owner-token using validate_owner_session RPC.
- Database metadata: dbest_member_request_payout, dbest_member_wallet_summary, dbest_owner_update_member_payout and validate_owner_session are SECURITY DEFINER functions; anon and authenticated roles have no EXECUTE privileges on these four RPCs. This supports service-role-only access to sensitive financial RPCs.
- No live negative-auth requests were issued. Remaining gates: inspect RPC implementation, owner token/session revocation, public config exposure, unauthorized-role denial tests, race/replay controls, bank payout evidence.
- PayU remains deferred by owner; no PayU changes or tests.

## Payout account and RLS checks — 2026-10-13
- Two member_payout_accounts records: one status Verified, one other status. Do not expose bank account details in audit reports.
- One payout request, status Failed, with no bank_reference and no paid_at; no successful bank payout evidence.
- RLS is enabled on member_payout_accounts, member_payout_requests, member_payout_events, member_wallet_accounts, member_wallet_ledger, member_wallet_payout_rules, owner_audit_log.
- pg_policies returned no policies for the six member payout/wallet tables; service-role-only access appears intended, but must be confirmed by access tests and privilege review. owner_audit_log has an authenticated-role ALL policy; review its USING/WITH CHECK predicates and grants before approval.
- Live member-wallet function derives member identity from an unexpired hashed member session; it rejects Starter wallet and payouts, and invokes RPC for payout business rules. Payout RPC implementation inspection was blocked; do not claim database transition or replay logic verified.
- All checks read-only; no PayU tests or modifications, no production deployment.

## Critical audit-log privilege remediation — 2026-10-13
- Confirmed owner_audit_log RLS policy owner_manage_audit_log restricts authenticated row operations using JWT email comparison to designated owner. Avoid printing email in public audit summary.
- Discovered TRUNCATE privilege granted to anon and authenticated on owner_audit_log; TRUNCATE bypasses RLS and represented a real integrity risk.
- Applied production Supabase migration restrict_owner_audit_log_truncate_privileges_20261013: REVOKE TRUNCATE ON TABLE public.owner_audit_log FROM anon, authenticated;
- Verified has_table_privilege for TRUNCATE: anon=false, authenticated=false, service_role=true. SELECT grants remain, with RLS still governing row-level access.
- Remaining: review authenticated DELETE/UPDATE/INSERT grants on audit log for append-only design; consider moving to server-only write model after confirming consumers. Negative-auth execution tests and gateway settlement remain outstanding. This migration modified permissions only; no row data changed. PayU untouched.

## Cross-section audit finding — 2026-10-13
- Inspected deployed transaction-ledger-live, marketplace-live, vaahak-dispatch-live, owner-report-data and member-login-live. All contain session/token handling in inspected portions; this is NOT a full functional verification.
- P0 candidate: transaction-ledger-live action=record accepts client-supplied transaction amount, payment_status, payment_mode and metadata for newly created transactions; preserves authoritative evidence only for existing transactions. Member session authentication is present but does not establish payment authority. Server should restrict client-created records to nonauthoritative statuses, prohibit client-supplied payout/commission authority, and preserve server-confirmed statuses atomically. Must assess dependent UI and test before deploying.
- Read-only count: 277 transactions; 28 statuses containing verified/paid/captured/received; 6 of these use non-Razorpay/non-PayU modes (may be legitimate cash/other flows; no fraud conclusion).
- Razorpay: 22 internally Verified records; all have non-null reference; 0 duplicate references. Gateway settlement remains unverified.
- Owner audit-log TRUNCATE fix applied and confirmed in previous section.
- Public GO BLOCKED until payment-authority integrity, cross-role negative tests, Cab and Marketplace complete lifecycles, and payout/settlement evidence are verified. PayU remains deferred and untouched.

## Marketplace deployed-code review (13 October 2026)
- create_order trusts the caller's prepaid flag or payment status, and accepts extra amounts above the server-priced catalogue subtotal. Require server-verified payment evidence and a server-derived delivery quote.
- vendor_catalog_save upserts a caller-supplied global item ID without checking ownership of an existing record. Implement an ownership-scoped update and a separate safe insert, then test cross-vendor attempts.
- vendor_order_action validates vendor session and vendor ID and checks workflow states, but concurrent transitions need regression tests.
- No Marketplace production code changed. These are launch blockers until fixed and verified in staging. PayU remains deferred.
