# DBest Super Platform — Launch Readiness Evidence (2026-10-24, IST)

**Release decision: NO GO.** Read-only connected-tool audit. This is a point-in-time verification, not an independent payment settlement confirmation or full browser E2E.

## Substantive findings / clarified evidence

1. **Legacy paid master orders are zero-valued despite linked Razorpay-labelled transactions.** Twelve `marketplace_master_orders_live` records have `payment_status='Paid'`, `child_order_count=0`, and `total_amount=0` (aggregate master-order total ₹0). All 12 link by `parent_tx_id=transactions.transaction_id` to 12 `transactions` marked `payment_mode='Razorpay'` and `payment_status='Verified'`, totaling **₹3,840**. All 12 linked transactions have both Razorpay payment/order identifiers, but those identifiers were **not independently checked against Razorpay**. Two metadata records contain QA/test text; the other ten are not established as genuine customer payments or tests. Master records date from 2026-09-11 to 2026-09-13 UTC. **Do not automatically repair, refund, fulfil, or delete these rows without gateway verification and a controlled case review.**

2. **Supabase development branch has failed migrations.** `list_branches` reports branch `main`, `status=MIGRATIONS_FAILED`, `preview_project_status=ACTIVE_HEALTHY`, `updated_at=2026-09-12`. This is a **development-branch / reproducibility gate**, not evidence of a new production outage. Project has 205 migration entries. Investigate failing branch migration before trusting new isolated DB deployments.

3. **Anonymous SECURITY DEFINER RPC exposure persists.** SQL catalog and Supabase security advisor confirm `anon` EXECUTE privilege on `public.dbest_create_quote_checkout_draft`, `public.dbest_save_quote_delivery_address`, `public.dbest_save_quote_delivery_details`. The public wrappers call `dbest_internal` SECURITY DEFINER functions. The internal functions check supplied `p_member` against record `customer_member_id`, but **do not verify that `p_member` belongs to the caller's authenticated session**. This is a cross-account authorization risk. No exploit or write test performed. Proposed remediation: server-side session binding, revoke public RPC grants when compatible, negative authorization tests, isolated staging verification. Do not change frozen checkout without compatibility tests.

4. **Other Supabase advisor findings:** `public.dbest_sync_marketplace_delivery_status` trigger function has mutable `search_path` (not SECURITY DEFINER), and `pg_net` is installed in public schema. Security advisor also flags leaked-password protection disabled; relevance to the app's custom OTP authentication needs review. No schema changes performed. Advisor documentation: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable and https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public.

## Financial and operational control checks

- **Member wallet:** 9 accounts, all 9 available balances equal the sum of available-bucket ledger entries; combined ₹2,901.47.
- **Vaahak wallet:** approved/available partner balance −₹45, ledger −₹45, mismatch ₹0. Rejected QA account balance ₹0, ledger −₹9, mismatch ₹9. Negative balance policy is not an arithmetic mismatch.
- **Razorpay-labelled internal transactions:** 22 entries / ₹7,296 marked Verified; 21 entries / ₹6,896 with both payment and order IDs; 1 / ₹400 without either ID (previously classified QA). **Independent Razorpay gateway settlement check remains unavailable.** Internal statuses are not gateway proof.
- **Marketplace master order totals:** 6 Paid+Completed masters with 1 child each total ₹1,610; 12 Paid+Created masters with zero children total ₹0; 2 Pay after Delivery+Created with zero children total ₹0; 3 Pending+Cancelled with 1 child total ₹650; 2 Pending+Created with zero children total ₹0.
- **Recent activity:** transactions last created 2026-10-23 05:30:49 UTC; Marketplace master order last created 2026-10-02 05:49:46 UTC; Vaahak jobs last created 2026-10-19 17:27:14 UTC. These timestamps alone do not prove outage or normal operation.

## Cab / Marketplace / release gates

- Cab static regression workflow passed on 2026-10-22: https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/39722516211 . Browser/Android Nearby Places, Cab ride completion, Marketplace checkout, settlement, and role-based authorization E2E remain **unverified in this run**.
- Vercel latest production deployment remains `dpl_G7xwtaNKs7mq8LMJRTC57x5jPXwZ`, `READY`, commit `e5a1bbe0a36ed41d9d7099e55d5f17e5063d8eda`, from `feat/homejobs-customer-dashboard-20261020`. Evidence: https://vercel.com/db-est/dbest-super-app/G7xwtaNKs7mq8LMJRTC57x5jPXwZ . `dbest4u.com` domain is verified and associated with the project. READY is not an E2E or security approval.
- Release gates: remove or securely mediate exposed RPCs with session-binding tests; reconcile Razorpay gateway settlement and 12 linked master-order cases; verify wallet and payout idempotency; restore isolated migration branch; prove Cab and Marketplace on Android/mobile with production-safe test data; document rollback and production freeze policy.

## Actions and safety

Read-only Supabase SQL/catalog queries, Supabase advisors/branches/migrations and Vercel/GitHub inspections. **No PayU changes, production deployments, database DDL/DML, wallet corrections, refunds, or real bookings/payments.** Audit report only, stored on isolated `audit/cab-regression-hardening-20261018` branch if commit succeeds.

## Verification SQL (read-only)

```sql
select count(*) as paid_zero_child, count(*) filter(where total_amount=0) as zero_value,
       sum(total_amount) as master_total,
       count(*) filter(where exists(select 1 from public.transactions t where t.transaction_id=m.parent_tx_id)) as linked_transaction_count,
       coalesce(sum((select t.amount from public.transactions t where t.transaction_id=m.parent_tx_id limit 1)),0) as linked_transaction_total
from public.marketplace_master_orders_live m
where payment_status='Paid' and child_order_count=0;
```

All figures above are from connected Supabase project `ydedmotbacnllkijzmvp` and Vercel project `dbest-super-app` at audit time. Internal transaction values are not verified settlements.
