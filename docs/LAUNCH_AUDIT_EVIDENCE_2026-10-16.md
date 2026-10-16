# DBest launch audit evidence — 2026-10-16
Status: NO GO. Read-only inspection of deployed Supabase functions, wallet tables, and Vercel releases.

New blocker: marketplace-order-live-v2 v10 inserts DBest Points redemption into dbest_points_ledger before creating the Marketplace order. The ledger trigger immediately adjusts the account. If order insertion fails, the debit is not reversed. Separate API calls are not atomic. Current ledger has one earning entry, zero redemptions, and a reconciled three-point balance; no actual loss observed. Required: atomic database operation with idempotency and failure tests.

New blocker: marketplace-order-live-v2 v10 accepts caller-supplied customerMemberId when no member session was resolved. Identity matching is conditional on having a session. Require authenticated member attribution or explicit anonymous semantics.

Previously identified authorization and payment-verification blockers remain unresolved in vendor-catalog-bulk-live and vaahak-commerce-live. No live fixes applied.

Member wallets: 9/9 reconciled. Vaahak wallets: one difference ₹9; a separate negative ₹36 account reconciles. Razorpay: 22 transactions internally marked Verified, not independently matched to gateway. Marketplace: 12 Paid/Created master records have zero value and zero children. Quote checkout test records: 0. Cab: 14 completed Received and 2 completed Prepaid, not independently payment reconciled.

Release: Vercel production main SHA 190ef3bbbee7cd0d9fdc631f124a83cf86ab42d7; preview audit SHA 709924737c619b61b05ef55cce1bd5c320ef4de2. Audit branch 82 commits ahead of production. No production changes or PayU changes.