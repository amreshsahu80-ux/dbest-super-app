# DBest Super Platform — Launch Readiness Audit (31 October 2026, IST)

**Release gate: NO GO.** Read-only connected-tool audit; no PayU, financial, database, or production changes. No public launch authorization.

## Source and environment
- Connected Supabase original project `ydedmotbacnllkijzmvp` is ACTIVE_HEALTHY (project list, 31 October).
- Vercel canonical production alias `dbest4u.com` still resolves to READY deployment `dpl_G7xwtaNKs7mq8LMJRTC57x5jPXwZ`, source commit `e5a1bbe0a36ed41d9d7099e55d5f17e5063d8eda` from `feat/homejobs-customer-dashboard-20261020`; inspected by Vercel `get_deployment` 31 October. Do not conflate preview builds with production.
- Supabase branch `main` remains `MIGRATIONS_FAILED`, despite preview database `ACTIVE_HEALTHY`.
- Vercel environment **key-name-only** inventory: 22 entries, including `GOOGLE_MAPS_BROWSER_KEY` in production and preview; **no `GOOGLE_MAPS_SERVER_KEY`**. Values were not retrieved or recorded. Isolated Cab server Places provider is not release-proven.

## Security — live SQL/catalog inspection
- `public.dbest_create_quote_checkout_draft`, `public.dbest_save_quote_delivery_address`, `public.dbest_save_quote_delivery_details` are each SECURITY DEFINER and executable by both `anon` and `authenticated` roles, per `pg_proc` and `has_function_privilege`. Prior 30 October audit inspected their internal implementations and found no independent authenticated-caller/member-session binding; no new remediation evidence. No exploitation attempted.
- Supabase security advisor counts unchanged: `anon_security_definer_function_executable` 3 WARN, `authenticated_security_definer_function_executable` 3 WARN, `function_search_path_mutable` 1 WARN, `extension_in_public` 1 WARN, `auth_leaked_password_protection` 1 WARN, `rls_enabled_no_policy` 81 INFO. Some policyless RLS tables may be intentionally service-role-only; advisor count alone does not prove exposure.
- Guidance: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Wallet and payments — read-only SQL aggregates
- Member wallet accounts: **9**, available **₹2,901.47**, held **₹0**, **0** account-vs-ledger mismatches (available/held buckets).
- Vaahak wallet accounts: **2**; approved partner balance **−₹45** matches ledger **−₹45**; rejected QA account balance **₹0** vs ledger **−₹9**, hence **₹9** mismatch. No corrections made.
- Razorpay-labelled internal transaction records: **22 / ₹7,296**; **21 / ₹6,896** have both `razorpay_payment_id` and `razorpay_order_id` metadata; remaining **₹400** is the previously identified QA record. Independent Razorpay gateway capture/settlement/refund reconciliation remains **unavailable/unverified**. Internal Verified status is not independent proof of settlement.
- Marketplace paid/created masters with no children: **12**, all recorded master order total **₹0**; join on `marketplace_master_orders_live.parent_tx_id = transactions.transaction_id` confirms **12 distinct internally Verified transactions totaling ₹3,840**. No backfill/refund or status edits.
- Marketplace: 6 Paid/Completed masters each with 1 child (aggregate ₹1,610); 3 Pending/Cancelled with 1 child (₹650); other non-paid zero-child records. Member payout requests: 1 Failed / ₹10.

## Cab, Marketplace and release checks
- Historical Cab jobs: **17 Completed, 17 Cancelled, 28 Expired**; not evidence of current live-device flow.
- Most recent directly checked isolated Cab static workflow `40814091036` job `cab-static-check`: **success**, including static Cab regression guards. https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/40814091036 . Does **not** verify real Android Nearby Places, booking, Vaahak acceptance/completion, invoice, or map UI.
- Vercel 24h runtime error grouping shows a Node `[DEP0169]` `url.parse()` deprecation warning (31 occurrences across observed history, latest 31 October 03:41:44 UTC), routes `/api/runtime-config` and `/api/razorpay/config`; no fresh proof of customer-facing failure or payment miscalculation. Investigate dependency/source in an isolated branch; no production change justified by warning alone.
- Android release-equivalent testing, Marketplace quote→checkout→vendor→Vaahak→delivery, PayU non-interference, and signed Play distribution are not yet verified. Separate JanSathi PR #71 remains draft/unmerged (checked 31 October).

## Outstanding public launch gates
1. Caller-bound authorization for three checkout RPCs, tested against anonymous and cross-account access in an isolated environment, with controlled review before deployment.
2. Independent Razorpay reconciliation for 21 / ₹6,896 and resolution of 12 paid/no-child Marketplace anomalies (₹3,840 internal linkage); no silent data corrections.
3. Reconcile/document rejected QA wallet ₹9 discrepancy and approve explicit policy for legitimate negative Vaahak balances.
4. Resolve Supabase migration failure and server-side Places key/provider configuration; run release-equivalent Android and Cab/Marketplace end-to-end tests.
5. Confirm release controls, Play Console, rollback and production regression coverage; explicitly authorize a release only after objective evidence.

**Actions:** Connected read-only queries and audit record only. No PayU modification, DB write, wallet adjustment, gateway action, Git merge, Vercel promotion or production deployment. No new launch-changing finding or verified fix relative to 30 October. **NO GO.**
