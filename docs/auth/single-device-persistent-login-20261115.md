# DBest single-device persistent login — isolated implementation contract

Status: NOT DEPLOYED. No live sessions or tables modified.

## Current findings (read-only production inspection, 2026-11-15)
- Session tables: `member_sessions_live(member_id,token_hash,expires_at)`, `marketplace_vendor_sessions_live(vendor_id,...)`, `vaahak_sessions_live(partner_id,...)`, `partner_sessions_live(account_id,...)`.
- Vaahak login currently deletes existing sessions for the partner, then inserts a 7-day session; therefore it already attempts one-session-per-account but is not atomic and logs out an otherwise active user after 7 days.
- Existing clients persist a local session token; expiry, revocation, device handoff, and push-token ownership must be tested across web and Android.

## Required server-side behavior
1. At most one active session per account within each account type, including concurrent logins. Use a database uniqueness constraint plus atomic server-side replacement (transaction/RPC), not delete-then-insert across separate requests.
2. Bind session to an opaque installation/device ID generated on first app launch and stored in secure app storage. Do not use IMEI, Android ID, or fingerprinting. Web uses an independent random per-browser installation ID.
3. On successful new-device login, revoke the prior session and associated push registration; old client displays "Signed in on another device" when its next authorized request returns 401.
4. Implement bounded sliding expiry: renew session securely on authenticated activity before expiry, with an absolute maximum and server-side revocation for reset, suspension, compromise or Owner action. Never promise infinite non-expiring credentials.
5. Explicit logout revokes server session and clears app token and device push token; app closing/restarting does neither.
6. On transient network failures, retain local token and retry rather than clearing login. On verified 401, clear token and display the correct reason.
7. Ensure Member, Vendor, Vaahak and Service Partner edge functions and clients all implement the same semantics. Owner/Super Admin sessions require a separately reviewed security policy.
8. Do not change live sessions, expire users, merge or deploy until E2E QA verifies both devices, app restart, token renewal, push alerts and login handoff.

## QA acceptance cases
- Login A on phone 1, restart app, remains logged in.
- Login same account on phone 2; phone 1 loses authorization and push notifications, phone 2 stays active.
- Simultaneous logins cannot create two valid sessions.
- Network offline/reconnect does not sign out.
- Session renews before idle expiry when legitimately active; explicit Logout revokes immediately.
- Separate Member and Partner accounts do not affect each other.
- Android and web cross-device handoff works.
- Existing ride/delivery status and push flows remain intact.
