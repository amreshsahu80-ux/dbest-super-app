# DBest launch audit 2026-11-06

Decision: NO GO. Read-only checks against Supabase parent ydedmotbacnllkijzmvp and Vercel.

Security: 3 SECURITY DEFINER functions still anon-executable: dbest_create_quote_checkout_draft; dbest_save_quote_delivery_details; dbest_save_quote_delivery_address. dbest_place_accepted_quote_order has no anon or authenticated EXECUTE. 86 INFO RLS-no-policy notices, unchanged.

Member wallets: 9 accounts; INR 2901.47 available, zero held, zero available-ledger discrepancies.

Vaahak: 2 wallets, 1 ledger discrepancy. No adjustments.

Marketplace: 25 masters; 12 marked paid with no linked child orders. Master total_amount for these sums to 0, distinct from previously reported INR 3840 linked transactions; transaction join not repeated today.

Cab: 62 historical jobs, 17 completed. Android end-to-end not verified.

Razorpay-labelled internal transactions: 22 totaling INR 7296. Prior 21 non-QA totaling INR 6896 require independent gateway reconciliation; no gateway evidence today.

Supabase main branch MIGRATIONS_FAILED. Parent ACTIVE_HEALTHY.

Latest Vercel production deployment listed: dpl_DVewKXrUyfNr9azJFZY34zrzvxkK READY, 2026-11-03, commit 5cce0017a6072b0488e4d161d2bde4a064a10b44. No later production record in latest eight.

No PayU changes, database writes, wallet adjustments, deployments or resource creation. No public launch GO until authentication, reconciliation, migration and release-equivalent functional evidence.