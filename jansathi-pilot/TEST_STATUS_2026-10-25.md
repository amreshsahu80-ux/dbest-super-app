# JanSathi staging verification — 25 October 2026

## Deployment
- Supabase Free organization: `DBest JanSathi` / `lghogrkxrhvoelgojnzg`.
- Database project: `DBest JanSathi Pilot` / `zgjkzqfabbvctcjspvfd`, region Mumbai (`ap-south-1`), reported healthy.
- Schema migration: `20261025051539_jansathi_initial_isolated_schema`.
- Staging UI: https://dbest-jansathi-staging.vercel.app
- Verified staging Vercel alias points to deployment `dpl_D4fmXRy2gB1y4nmgfM8muRgcQ7YZ` (READY).
- Existing DBest production deployment still `dpl_G7xwtaNKs7mq8LMJRTC57x5jPXwZ` in project `dbest-super-app`.
- All changes remain isolated and only drafted in GitHub PR #71, not merged.

## PASSED — SQL/database-level tests
Performed inside SQL transactions with synthetic Supabase Auth users. Changes undone using `ROLLBACK TO SAVEPOINT`, then committed the empty transaction. Counts confirmed to be zero for all submission, public feed, history, follow and synthetic auth-user tables.

1. A safe community-news submission moves to `published` automatically.
2. An allegation with `murder` is held by the database and does not enter the public news feed.
3. A civic report starts as `dbest_received`, produces a redacted public feed row and an event-history row.
4. Authenticated user B cannot see user A's private reports, news drafts, or follows; public feeds remain readable.
5. A user-supplied `published` status is overridden to `held` for a sensitive news submission.
6. A user-supplied `officially_acknowledged` status and official reference are cleared on civic insert.
7. Untrusted JWT `user_metadata.jansathi_role` does **not** grant editorial access.
8. A normal reporter cannot modify civic status; trusted editor can.
9. Official acknowledgement without submission proof is rejected by a CHECK constraint.
10. A verified editor's manually entered issue-status transitions update public status and history correctly.
11. RLS enabled on all 8 public JanSathi tables; Supabase Security Advisor: 0 lints at last check.
12. Final counts: zero in private news, civic reports, public feeds, events, follows and synthetic Auth users.

## NOT YET VERIFIED — BLOCKERS before production
- Real test-account email verification, password login and API requests from a browser.
- Production single DBest sign-on handoff and session identity mapping.
- Abuse mitigation beyond a first-pass keyword/PII gate: robust multilingual moderation, rate limiting, editor workflow, notification reliability.
- Real report privacy/cross-user tests over HTTP using different actual accounts and JWTs.
- Geographic discoverability and automatic official department routing; **no department is contacted automatically**.
- Image upload UI and download authorization with private storage.
- Public-facing mobile functional testing and full regression of all DBest tiles/services.
- Free Supabase capacity, inactivity pauses, backups and expected public volumes.
- Official public launch requires explicit Owner GO.

The staged client uses a **Supabase publishable API key**, which is designed to be exposed publicly. No admin or service-role key is included.

## Manual smoke test for owner
1. Open https://dbest-jansathi-staging.vercel.app.
2. In the isolated pilot sign-in panel, use a **test email address**, not an existing DBest login. Create a test account with a password of at least 10 characters; confirm your email if prompted.
3. Sign in and post a fictional community event; check the public feed and **My Reports** after refresh.
4. Submit a fictional road issue; verify `DBest received` rather than `Submitted to government`.
5. Try sensitive fictitious wording such as `murder allegation`; confirm the report is not automatically visible in the public feed.
6. Sign out; private My Reports should disappear, but approved public news can still be viewed.
7. Do not submit real personal data, defamatory content, or genuine service requests in this staging pilot.

**No implication of a real official department receipt or acknowledgement.**
