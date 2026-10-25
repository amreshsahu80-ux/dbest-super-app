# DBest JanSathi — Isolated pilot (NOT production)

**Status (25 Oct 2026):** isolated Free Supabase project `DBest JanSathi Pilot` (`zgjkzqfabbvctcjspvfd`, Mumbai) has been created and its initial migration applied. Eight tables have RLS enabled; Supabase security advisor returned zero security lints. Staging client is **connected to this Free Supabase project**, with a public **publishable** key only and test-account email/password sign-up / sign-in plus a private My Reports view. Database-level transactional workflow tests passed, but real browser email confirmation, OTP and end-to-end HTTP user testing are still pending. No real government message sent, and no publication to dbest4u.com. The approved 17-tile homepage mockup remains a separate baseline.

## Safety boundary

- Work only on Git branch `feat/jansathi-isolated-backend-pilot-20261025` until explicit GO.
- **NEVER run these migrations in the existing Supabase project `ydedmotbacnllkijzmvp`**.
- Do not edit / merge `main`; do not change production Vercel project `dbest-super-app`.
- **DONE:** New `DBest JanSathi` Free organization and standalone project created at a confirmed $0/month project cost. Do not add paid services without approval.

## Module roles and flows

1. **Civic issue:** authenticated reporter → private `jansathi_civic_reports` → public redacted `jansathi_civic_feed` (if screening passes) → own history → moderator review → verified department/manual official submission → only mark official acknowledgement with supporting reference and evidence. No automatic official delivery exists in this pilot.
2. **Community news:** authenticated submission → conservative server-side content gate → `published` to public `jansathi_news_feed` immediately for ordinary reports, or `held` for review. Add user report-abuse actions and staff takedown. “Citizen Reported” labels are mandatory; automatic publication is **not independent verification**.
3. **Location:** city + public landmark; no exact home address in public feed. A future geospatial model must use consent and coarse public coordinates.
4. **Privacy:** reporter/author UUIDs are stored only in private tables, evidence goes to a private 5MB image bucket, and no credentials or service keys are embedded in the website.
5. **Owner/moderator:** only Supabase JWT `app_metadata.jansathi_role` trusted, never client-editable `user_metadata`; no new DBest financial hierarchy integration.

## Schema

`sql/001_isolated_schema.sql` creates private report/news submissions, public projection feeds, follows, abuse flags, status-history events, verified authority directory, RLS policies and private evidence storage. Moderation and public projections are enforced with internal Postgres triggers rather than trusting a browser-provided `status`.

**Important:** The keyword/PII safety filter is only a first-pass gate. It does not detect every harmful, defamatory or personal-data disclosure. Real public launch needs stronger moderation, report handling, abuse rate limits, policy review, automated tests and on-call removal capability.

## Next deployment steps

1. **DONE:** Created the separate *Free* organization `DBest JanSathi` (`lghogrkxrhvoelgojnzg`) and the `DBest JanSathi Pilot` project (`zgjkzqfabbvctcjspvfd`) with a confirmed $0/month project cost.
2. **DONE (initial checks):** Applied the schema as migration `20261025051539_jansathi_initial_isolated_schema`; confirmed all 8 public JanSathi tables have RLS enabled and that Supabase security advisor had zero security lints. This is NOT a substitute for adversarial authentication tests.
3. **DONE (policy/privilege check):** REST-accessible public feeds have anonymous SELECT permission; private report tables do not. The staging frontend uses only the project's `sb_publishable_...` key, never a secret/service-role key.
4. **PENDING for real accounts:** Use staging test-account email/password registration and email verification, and separately test editorial accounts. OTP sign-in will need the appropriate email template; do not use real DBest customer accounts here. Assign trusted roles only through protected Admin/server operation.
5. **PARTLY DONE:** Staging client now wired to the new Free project at `https://dbest-jansathi-staging.vercel.app`. SQL-level RLS and triggers were tested with temporary synthetic users and rolled back; real signup/email/HTTP/browser flows remain to test. Government submission stays disabled pending verified official channels.
6. Design the secure sign-on handoff from DBest's existing users without inserting their original auth secrets into the free project.
7. Regress Cab, Marketplace, Insurance, Travel, Mutual Funds, membership, Wallet, referrals and payouts in unchanged production and safe staging. No integration to production before Owner's explicit GO.

## Minimum acceptance tests

- Anonymous browser sees only `jansathi_civic_feed` / `jansathi_news_feed`; cannot read detailed reporter fields or submit.
- User A can insert a report, see their own report and status history; cannot modify `status`, `assigned_authority` or `official_reference`.
- User B cannot select A's private report or news draft.
- Public never sees an author ID, phone, email, precise private location, detailed case notes or unpublished/held news.
- Safe ordinary event is published automatically by **database trigger**, regardless of client `status`.
- A sensitive allegation / obvious phone number remains `held` and absent from public news feed.
- Moderation `removed` deletes the public projection while retaining an audit submission.
- Civic statuses distinguish DBest received vs government submitted vs officially acknowledged, and official acknowledgement requires a reference + submission details.
- Evidence bucket is private, allows images only up to 5MB; a different user cannot fetch the original.
- Follows are owner-scoped; repeated following same issue is deduplicated.
- Reporting abuse is available; triage and takedowns work for moderator.
- Reopen full 17-tile homepage preview and validate all original tiles still present.
- Verify a clean `main` and unchanged production Vercel deployment.

**This branch is preparatory code, not a tested live feature.**
