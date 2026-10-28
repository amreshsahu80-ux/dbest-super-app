# DBest Super Platform — Launch Readiness Audit (2026-10-28, 09:46–10:00 IST)

**Release gate: NO GO.** Read-only connected evidence; no real payment gateway settlement export, Android device E2E, or public-launch signoff.

## Substantive new finding — original DBest database access restored

- The Supabase connection again lists and permits read-only SQL against original DBest project `ydedmotbacnllkijzmvp` (currently displayed as **DBest Super Platform Test**, `ACTIVE_HEALTHY`). This reverses the 26–27 October permission-denied audit blocker. At 2026-10-28 04:17:10 UTC the SQL query executed successfully, returning `current_user=postgres` and 92 public tables.
- This confirms the original project is accessible to the audit connector. It does **not** establish that all application paths use this database or that its data are live gateway settlements.

## Security — still NO GO, freshly reverified

- Exactly **three** `public` functions with `SECURITY DEFINER` are executable by the `anon` role: `dbest_create_quote_checkout_draft(p_request,p_offer,p_member)`, `dbest_save_quote_delivery_address(p_request,p_member,p_address)`, and `dbest_save_quote_delivery_details(p_request,p_member,p_name,p_mobile,p_address)`.
- Each public function delegates to an elevated `dbest_internal` function. Source inspection shows request/member equality or draft/member equality checks, but **no authenticated caller/session binding** in these function bodies (no `auth.uid()` or validated member session). The delivery-details function additionally accepts caller-provided name/mobile/address and writes them into the draft. The delivery-address variant retrieves an active verified member profile but still does not verify that the caller owns the member identity.
- This is a **confirmed authorization design gap**, not a demonstrated exploitation. Do not revoke EXECUTE or alter SQL in production until isolated negative authorization tests and controlled migration/rollback are ready.

## Financial reconciliation — freshly reverified, no writes

- Member wallets: **9/9 reconcile**, total available ₹2,901.47, held ₹0.00, using sums of `member_wallet_ledger` by balance bucket.
- Vaahak wallets: approved available partner balance **−₹45**, exactly matching ledger; rejected/held QA partner account balance ₹0 versus ledger −₹9 (**₹9 discrepancy confined to QA**).
- Marketplace: **12 Paid/Created master orders** with total order value ₹0 and **no child orders**, all linked by `parent_tx_id` to internally Verified transactions totalling **₹3,840**. There are also 6 Paid/Completed masters totalling ₹1,610 with child orders. Internal status is not gateway settlement proof.
- Transactions: **22 Razorpay/Verified transactions totalling ₹7,296**, of which 21 carry recognized payment-ID metadata; prior evidence classifies the remaining ₹400 as QA. Independent Razorpay capture/settlement/refund matching remains **not performed**.
- Member payout requests: **1 Failed request totalling ₹10**; no payout write attempted.
- Newest transaction row was created 2026-10-26 15:02:02 UTC; latest Marketplace master order 2026-10-02; latest child order 2026-10-17. Counts reflect data available at audit time, not gateway confirmation.

## Cab, Marketplace, migrations and release

- Cab audit-branch static regression run [40448130219](https://github.com/amreshsahu80-ux/dbest-super-app/actions/runs/40448130219) succeeded on 2026-10-27. This is **static-only**, not Nearby Places or Android E2E proof.
- The isolated audit branch still contains five **concurrent** requests to public Nominatim via `Promise.allSettled(searches.map(...))`. It must not be promoted as-is; public Nominatim's [usage policy](https://operations.osmfoundation.org/policies/nominatim/) limits request rates and disallows systematic POI search.
- Original Supabase project's development branch `main` still reports `MIGRATIONS_FAILED`; preview status `ACTIVE_HEALTHY`. No migrations applied.
- Vercel `dbest4u.com` production alias remains on READY deployment `dpl_G7xwtaNKs7mq8LMJRTC57x5jPXwZ` (commit `e5a1bbe0a36ed41d9d7099e55d5f17e5063d8eda`), not the newer hotel-comparison preview. [Deployment](https://vercel.com/db-est/dbest-super-app/G7xwtaNKs7mq8LMJRTC57x5jPXwZ).
- Cab/Vaahak completion, Nearby Places on real Android, Marketplace quote→checkout→delivery→invoice, negative authorization cases, payment idempotency, payout governance, and rollback remain insufficiently verified.

## Release decision and safety

**NO GO.** Database audit access is restored, but three anonymous elevated-privilege checkout RPCs, ₹3,840 in anomalous internally verified order-linked transactions, independent Razorpay settlement reconciliation, migration failure, noncompliant preview fallback, and real E2E gaps remain.

No PayU changes, gateway actions, financial adjustments, SQL writes, Edge Function changes, production deployments, or alterations to frozen Cab/Marketplace flows were performed. Evidence was gathered via read-only SQL, GitHub and Vercel APIs.