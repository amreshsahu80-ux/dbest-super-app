# Marketplace regression gate — 2026-10-13

Preserve the previously tested order and payment lifecycle. This is a regression checklist, not a claim that tests were run.

## Previously exercised
- September 15 order TX50173886738: initial PIN synchronization issue led to authenticated handover design.
- September 16 order TX50465538122: ₹500 merchandise + ₹10 delivery; Razorpay verification and receipt/status were confirmed.
- Customer receipt confirmation is required before Vaahak delivery completion.

## Before modifying production
1. Preserve guest checkout where intended.
2. Confirm the Marketplace order is linked to an approved Vendor and the authoritative payment record.
3. Do not accept an unverified caller flag as proof of prepaid status.
4. Confirm catalogue updates cannot modify a different Vendor's item.
5. Confirm a duplicate request cannot create duplicate delivery jobs or settlements.
6. Run authorized and unauthorized scenarios in staging.
7. Repeat the prior ₹510 checkout, Vendor handover, Vaahak pickup, customer confirmation, and receipt flow.
8. Leave PayU deferred.

No production deployment is authorized by this document.
