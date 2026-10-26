# JanSathi membership access policy — approved 25 October 2026

## Membership privileges

| DBest tier | Paid membership | View moderated public news/issues | Publish community news | Civic issues |
| --- | --- | --- | --- | --- |
| Starter | Free | Yes | No | Yes, with verified account and quota |
| Guest | ₹49 | Yes | No | Yes, with verified account and quota |
| Promoter | ₹299 | Yes | Yes after active membership + KYC verification | Yes |
| Prime | ₹599 | Yes | Yes after active membership + KYC verification | Yes |
| Leader | ₹999 | Yes | Yes after active membership + KYC verification | Yes |

This is NOT a separate JanSathi subscription. Existing approved DBest membership should grant access when the secure Pro-to-Free membership verification handoff is built.

## Implemented on isolated Free Supabase project

Migration `sql/002_paid_member_publication_gate.sql` has been **applied only** to the `DBest JanSathi Pilot` Free Supabase project `zgjkzqfabbvctcjspvfd`.

- Anonymous visitors can read published public news and issue feeds without registering.
- News INSERT is blocked at the RLS policy layer unless an authenticated user has a trusted, active Promoter/Prime/Leader membership row with KYC verified and a fresh (within 24 hours) backend verification.
- All entitlement records are **read-only to end-user JWTs**. Only a future trusted DBest backend sync will create/change these records. Clients cannot select/forge membership levels.
- The entitlement also requires the JanSathi identity to be confirmed (email or phone) and not banned/deleted.
- Civic INSERT requires a confirmed email or phone in Supabase Auth. **Starter / Guest / unpaid verified:** max 2 civic issues per rolling 7 days. **Verified eligible paid:** max 5 per rolling 24 hours.
- The civic quota is enforced within a database transaction under a per-user advisory lock to reduce concurrency bypass.
- Anonymous viewing is unchanged; public published news remains autoapproved after the pre-existing conservative moderation check.
- The JanSathi public feed does not expose author identity. Government receipt is never implied by the DBest's initial status.
- New public table `jansathi_member_entitlements` is RLS-protected and read-only for the owner, with no public grants.
- All 9 JanSathi public tables have RLS enabled. Supabase Security Advisor returned 0 security lints on 25 October 2026.

## Testing already completed (synthetic, rolled back)

- Starter and Guest cannot pass the paid-news eligibility check.
- Promoter, Prime and Leader with active membership, KYC and verified identity can pass.
- Suspended, expired or stale (more than 24 hours since backend verification) memberships cannot pass.
- Confirmed free pilot accounts could insert 2 civic reports and were blocked on attempt #3 in the rolling seven-day window.
- Unconfirmed accounts could not submit civic reports.
- Unauthorized client inserts into `jansathi_member_entitlements` were rejected.
- User-managed JWT `user_metadata` cannot forge paid role.
- Original privacy, status-history, sensitive-news moderation and official-evidence checks passed.
- Synthetic Auth users, entitlements, news and civic reports were removed by rolling back the test transaction.

## Integration still required — fail-closed by design

The existing paid DBest membership data resides in the Pro organization's backend and has **not** been connected to the JanSathi Free project's entitlement table. Because the current Supabase connector can access only the Free organization, paid members WILL NOT yet be automatically recognized on the staging site.

Before real public news posting:

1. Obtain secure, authorized access to the main DBest user and membership model; never copy secret keys or full KYC documents into JanSathi.
2. Implement a trusted server-to-server membership verification handoff linking each DBest member to a specific JanSathi Auth `user_id`. Verify membership status, tier, KYC completion and expiration; do not trust front-end assertions.
3. Implement periodic refresh/update/revoke of JanSathi entitlement rows at least every 24 hours (so stale rows fail closed).
4. End-to-end test a real eligible paid account and an ineligible/expired one across both systems.
5. Complete rate limiting for news, stronger multilingual harmful-content moderation, takedown, editor audit, account suspension and abuse resolution.
6. Regression test the unchanged Cab/Marketplace and all existing service integrations before explicit Owner GO.
7. Government routing remains disabled until verified official submission capability is built and tested.

Existing production project `dbest-super-app` and domain `dbest4u.com` remain untouched. All code changes exist on branch `feat/jansathi-isolated-backend-pilot-20261025` and draft PR #71.

**No paid membership billing or JanSathi payment collection is performed by this staging feature.**
