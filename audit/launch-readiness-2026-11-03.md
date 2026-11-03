# DBest Super Platform — Launch Readiness Audit (3 November 2026, IST)

**Release gate: NO GO.** Fresh read-only Supabase SQL/catalog/security-advisor, GitHub Actions, and Vercel production/configuration inspection. The only write is this report on the existing isolated audit branch. No PayU, wallet, payment, database, live deployment, branch or resource changes.

## Security
- Supabase parent project `ydedmotbacnllkijzmvp` remains `ACTIVE_HEALTHY`.
- The public `SECURITY DEFINER` RPCs `dbest_create_quote_checkout_draft`, `dbest_save_quote_delivery_address`, and `dbest_save_quote_delivery_details` remain executable by both `anon` and `authenticated` database roles. Catalog inspection confirms all three accept a caller-supplied `p_member`; no `auth.uid`, `auth.jwt`, or `member_sessions_live` reference was found in the public wrappers. Prior inspection of their internal implementations found no independently bound member session. This is a release-blocking caller-authorization concern, not a claim of successful exploitation.
- Security advisor: 3 anonymous and 3 authenticated SECURITY DEFINER executable WARNs, mutable search path WARN 1, extension in public WARN 1, leaked-password protection WARN 1. RLS-enabled/no-policy INFO **85**, versus 84 on 2 November; the new entry is `native_fcm_qa_attempts`. No new anonymous table privilege was observed on the four native FCM tables; the INFO increment alone is not proof of data exposure.
- Advisor remediation: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

## Member and Vaahak wallets
- 9 member wallet accounts; available **₹2,901.47**, held **₹0**, available/held ledger mismatch count **0** (grouped by member and balance bucket).
- 2 Vaahak wallet accounts: approved/available partner **−₹45** account and **−₹45** ledger (reconciled); rejected QA account **₹0** account versus **−₹9** ledger (₹9 mismatch). No correction, fee collection or policy change.

## Razorpay (internal-only evidence)
- `transactions.payment_mode='Razorpay'`: **22** transactions totaling **₹7,296**, all internally `Verified`.
- **21** have both Razorpay payment and order IDs, totaling **₹6,896**. One additional ₹400 record is the previously identified QA-labelled record.
- **Independent gateway capture, refund, settlement and bank payout evidence was not accessible in this audit.** Internal `Verified` is not independent financial reconciliation. No financial action.

## Marketplace
- **12** `Razorpay / Paid / Created` master orders: zero child orders, zero recorded master totals, linked internal transactions **₹3,840**. Anomaly remains unresolved.
- **6** `Paid / Completed` master orders with children, master totals ₹1,610 (4 Razorpay masters ₹700; 2 pay-online-at-delivery masters ₹910).
- **3** `Pending / Cancelled` masters with children totaling ₹650; **2** `Online - Razorpay / Pending / Created` masters with no children and no linked amount.
- **2** `Pay after Delivery / Created` masters with no children and zero master totals link to ₹374 in internal transactions; statuses were previously identified as pending processing, so **not proven collected/settled**. Do not add to ₹3,840 discrepancy.
- 25 master orders total; newest master created 2 October. No quote-to-vendor-to-delivery-to-payment release-equivalent end-to-end proof.

## Cab and Android
- 62 historical Vaahak jobs: 11 completed rides, 14 cancelled rides, 28 expired rides; 6 completed and 3 cancelled delivery jobs. Newest historical job created 19 October.
- GitHub Actions run `40814091036` / job `cab-static-check`: completed **success**; `Run static Cab regression guards` step **success**. This is static-only and does **not** verify Android Nearby Places/images, live maps, ride completion, invoices, push notifications or complete Marketplace flow.

## FCM QA observation (not itself a launch GO/NO-GO change)
- Four `native_fcm_*` tables now present: devices **4 rows**, QA attempts **2 rows**, deliveries **0**, outbox **0**. All four have RLS enabled, and the `anon` role has neither SELECT nor INSERT table privilege. These are aggregate counts only; no token or personal device data read.
- The newly observed `native_fcm_qa_attempts` RLS/no-policy INFO raises advisor count to 85. No claim about FCM push delivery success or user consent from these counts.

## Release / configuration
- `dbest4u.com` resolves to Vercel READY production deployment `dpl_G7xwtaNKs7mq8LMJRTC57x5jPXwZ`, commit `e5a1bbe0a36ed41d9d7099e55d5f17e5063d8eda`, branch `feat/homejobs-customer-dashboard-20261020`; unchanged from previous audit.
- Vercel environment variable **names only** inspected: `GOOGLE_MAPS_BROWSER_KEY` present for production/preview; `GOOGLE_MAPS_SERVER_KEY` absent from listed project configuration. No secret values fetched.
- Supabase branch listing still shows `main` with `MIGRATIONS_FAILED`, though parent project and preview project report healthy.
- No new Play Store/Android end-to-end proof, production rollback drill, or independent Razorpay settlement report obtained.

## Decision and safe next steps
**NO GO.** Resolve authenticated caller binding and negative security tests for three RPCs in isolation; obtain independent Razorpay/bank reconciliation for 21 / ₹6,896 and investigate 12 paid/no-child / ₹3,840 orders; document QA wallet discrepancy and negative-fee policy; resolve migration and Places server configuration; prove Android/Cab/Marketplace E2E and rollback readiness before any authorized production release.

No PayU changes, wallet corrections, data backfills, financial adjustments, production deployments, branch deletions, or resource creation. Existing launch blockers remain; FCM table-count observations are not themselves evidence of a new exploitable vulnerability.
