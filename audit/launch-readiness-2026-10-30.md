# DBest Super Platform — Launch Readiness Audit (2026-10-30, IST)

**Release gate: NO GO.** This is a fresh connected-tool, read-only verification. No production or PayU changes. No launch authorization.

## Fresh security verification
- Original Supabase project `ydedmotbacnllkijzmvp` remains `ACTIVE_HEALTHY`. All three public checkout wrappers — `dbest_create_quote_checkout_draft`, `dbest_save_quote_delivery_address`, `dbest_save_quote_delivery_details` — remain `SECURITY DEFINER` and executable by `anon` and `authenticated`. Direct SQL inspection confirms each delegates to a `dbest_internal` function.
- Inspected **all three internal function definitions**, not only their public wrappers. They check request/member or draft/member equality, quote acceptance, input validity and (in one path) an active email-verified onboarding profile, but **none binds supplied `p_member` to an authenticated caller or validated member session**. This confirms the previously reported authorization concern end-to-end at source level. No exploit or data-changing call attempted.
- Fresh Supabase security advisors: `anon_security_definer_function_executable` (3 WARN), `authenticated_security_definer_function_executable` (3 WARN), `function_search_path_mutable` (1 WARN), `extension_in_public` (1 WARN), `auth_leaked_password_protection` (1 WARN), `rls_enabled_no_policy` (81 INFO). The mutable-search-path warning concerns `public.dbest_sync_marketplace_delivery_status`, a **SECURITY INVOKER trigger** whose inspected body only changes `NEW.vendor_status`; do not treat this advisory alone as evidence of exploitability. RLS-without-policy may be intentional for service-role-only tables. Password-protection applicability to the platform's current authentication model needs review.
- Security advisory remediation: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable ; https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable ; https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## Financial, wallet, Marketplace and Cab database checks
- Member wallets: 9 accounts, ₹2,901.47 available, ₹0 held, **0 ledger mismatches**.
- Vaahak wallets: approved partner **−₹45** matches ledger; rejected QA account balance ₹0 versus ledger −₹9 (₹9 mismatch). No adjustment.
- Marketplace: 12 `Paid/Created` master orders, total recorded order value ₹0, **all without child orders**. Reconciliation using `marketplace_master_orders_live.parent_tx_id = transactions.transaction_id` (not the transactions row UUID) confirms **12 distinct internally Verified transactions totaling ₹3,840**. Six other `Paid/Completed` masters total ₹1,610 and have child orders. No payment/order statuses altered.
- Razorpay-labelled internal transactions: **22 Verified / ₹7,296**. Exactly **21** have both `razorpay_payment_id` and `razorpay_order_id` metadata; the other is the **₹400 QA** entry. Thus **21 / ₹6,896** still require independent Razorpay capture/settlement/refund reconciliation. Internal Verified is **not** gateway proof. No gateway settlement ledger was accessible in this audit.
- Payout requests: 1 Failed / ₹10; no action.
- Cab job status distribution: 17 Completed, 17 Cancelled, 28 Expired. This is database history, **not proof of current Android E2E functionality**.
- Marketplace child status distribution: 6 Delivered/Completed, 3 Delivery Cancelled, 1 Vendor Rejected/Review Required. No fresh quote-to-delivery test performed.

## Release and environment checks
- Vercel production alias `dbest4u.com` still resolves to READY `dpl_G7xwtaNKs7mq8LMJRTC57x5jPXwZ` (source `e5a1bbe0a36ed41d9d7099e55d5f17e5063d8eda`). Latest **project** deployment may be a separate preview; do not confuse it with production.
- Vercel environment-key-name inventory (values intentionally excluded) still contains `GOOGLE_MAPS_BROWSER_KEY` but **no `GOOGLE_MAPS_SERVER_KEY`**; the isolated Cab Google Places server provider cannot be assumed functional without correctly scoped configuration and real tests.
- Supabase branch `main` still reports `MIGRATIONS_FAILED`, while its preview database status is `ACTIVE_HEALTHY`.
- Cab isolated audit branch latest GitHub Actions `Cab static regression guards` run on 2026-10-29 **SUCCESS**: https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/40814091036 . Prior Nominatim removal commit `180f9e5fa796bd547b94deea2020a3ae56e51b39` remains **isolated**, not production.
- Android build workflow successes on 2026-10-28 (e.g. https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/40743911562) and separate Partner Android build success (https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/40748707661) are **build evidence only**, not signed-public-release, Play Console, or real-device functional evidence.

## Outstanding public-launch gates
1. Remediate three checkout RPC authorization paths with caller-bound identity/session checks and negative cross-account tests in an isolated environment; controlled deployment only after approval.
2. Obtain independent Razorpay gateway ledger/capture/settlement/refund reconciliation for 21 identified transactions and investigate 12 paid/no-child orders without silently altering historical records.
3. Resolve or document rejected QA wallet mismatch and the approved partner's negative-fee policy.
4. Fix migration state; verify Google Places server-key configuration, Nearby Places, Android system-bar layout, full Cab/Vaahak and Marketplace quote-to-delivery flows on release-equivalent builds.
5. Produce release signoff, rollback plan and verified Play Console/testing evidence. Protect frozen Cab, Marketplace, PayU, deep links and wallet flows from regressions.

**Action taken:** read-only SQL, source review, security advisors, CI/deployment/environment inventory, and this isolated audit evidence commit only. No SQL DDL/DML, PayU change, payout/wallet edit, key-value read, production deployment, or customer-facing change.

**Conclusion: NO GO.** No substantive new fix or changed launch decision; no user action requested during this run.
