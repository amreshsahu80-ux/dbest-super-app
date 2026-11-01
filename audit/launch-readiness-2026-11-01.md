# DBest Super Platform — Launch Readiness Audit (1 November 2026, IST)

**Release gate: NO GO.** Read-only verification using connected Supabase, Vercel and GitHub tools. No PayU changes, database mutations, financial adjustments, Git merges or production deployments.

## One-time FCM preview-branch cost safeguard: absent / no longer active
- Checked Supabase parent project `ydedmotbacnllkijzmvp` using `list_branches` on 1 November 2026 around 09:26 IST.
- Expected temporary branch: `dbest-fcm-isolated-qa-20261031`; ID `f25c4bf0-f875-48d7-ba7a-85ae4ca80825`; preview project ref `fmlrqsyvprvsqiokehsw`.
- **Not listed.** Parent returned only `main` (ID `ac3eb26a-e9cf-47e9-9bb9-1db4719b7701`). Direct `get_project(fmlrqsyvprvsqiokehsw)` returned **Project not found**. Project inventory returned only the healthy parent.
- This supports that the preview branch/project has been removed; the precise deletion time and historical billed usage cannot be established by these APIs. Created 31 October 2026; exact lifespan unknown. Quoted branch rate was $0.01344/hour **plus usage while active**. No verified ongoing branch-hour charge; do not claim a billing total.
- **No deletion was performed by this audit.** As requested, this completed one-time disappearance report ends the temporary daily branch-check safeguard; retain all other daily audit checks.

## Security
- Live `pg_proc` privileges: `dbest_create_quote_checkout_draft`, `dbest_save_quote_delivery_address`, `dbest_save_quote_delivery_details` are each SECURITY DEFINER and executable by `anon` and `authenticated`. Caller-bound authorization has not been verified and remains a release blocker; no exploit attempt.
- Supabase security advisor: 3 anonymous SECURITY DEFINER WARN, 3 authenticated SECURITY DEFINER WARN, 1 function search-path WARN, 1 public extension WARN, 1 leaked-password-protection WARN.
- `rls_enabled_no_policy` INFO count increased **81 → 84** compared with 31 October audit. Three FCM tables (`native_fcm_devices`, `native_fcm_outbox`, `native_fcm_deliveries`) exist on parent, each RLS-enabled with no policy, zero rows, and **service_role-only explicit table grants** among checked API roles; no public FCM RPCs identified. This INFO count increase is not proof of a data-exposure vulnerability; review whether parent schema presence is intended for the FCM rollout. No schema changes made.
- Guidance: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

## Wallets and Razorpay (live read-only SQL aggregates)
- Member wallets: 9 accounts, ₹2,901.47 available, ₹0 held, zero account-vs-ledger mismatches.
- Vaahak wallets: 2 accounts; balances vs ledgers `−₹45/−₹45` and `₹0/−₹9`; one ₹9 discrepancy confined to the previously identified QA/rejected wallet. No adjustments.
- Razorpay-labelled internal transactions: 22 / ₹7,296. 21 / ₹6,896 have both payment and order IDs; ₹400 remaining is the previously identified QA record. **Independent Razorpay gateway capture/settlement/refund reconciliation not performed or verified**; internal records alone cannot prove settlement.

## Marketplace and Cab
- 12 Paid/Created Marketplace master orders still have **no child orders**, total master value ₹0, linked to 12 transaction IDs totaling ₹3,840. No backfills, refunds or status edits.
- Other Marketplace masters: 6 Paid/Completed (₹1,610); 3 Pending/Cancelled (₹650); 2 Pending/Created and 2 Pay after Delivery/Created (₹0 each). These are historical records, not a current end-to-end test.
- Historical Vaahak jobs: 17 Completed, 17 Cancelled, 28 Expired. Latest previously recorded isolated Cab static-check job (GitHub Actions run 40814091036) reconfirmed successful, but no real-device Nearby Places, maps, ride completion/invoice or Marketplace quote-to-delivery verification.

## Release
- `dbest4u.com` still aliases READY production Vercel deployment `dpl_G7xwtaNKs7mq8LMJRTC57x5jPXwZ`, commit `e5a1bbe0a36ed41d9d7099e55d5f17e5063d8eda` on `feat/homejobs-customer-dashboard-20261020`; no production change observed.
- Supabase `main` branch still `MIGRATIONS_FAILED` although parent and preview database status are `ACTIVE_HEALTHY`.
- Vercel key-name-only inventory: 22 env entries; `GOOGLE_MAPS_BROWSER_KEY` present; `GOOGLE_MAPS_SERVER_KEY` absent. No secret values recorded.
- No new release-equivalent Android/Play, Cab/Marketplace end-to-end, independent gateway reconciliation, or approved rollback proof.

## Outstanding launch gates
1. Fix and adversarially test caller-bound authorization of 3 Marketplace RPCs in an isolated environment before any controlled production rollout.
2. Obtain independent Razorpay gateway reconciliation for 21 / ₹6,896 and resolve 12 paid/no-child orders linked to ₹3,840; preserve immutable evidence.
3. Document QA wallet discrepancy and negative Vaahak fee policy.
4. Resolve migration failure, Places server provider configuration, and run Android/Cab/Marketplace release-equivalent E2E tests.
5. Verify release/rollback and Play readiness before explicit public launch authorization.

**Decision: NO GO.** The FCM temporary branch is no longer present and does not warrant further daily checks. No production changes or resource creation/deletion performed.
