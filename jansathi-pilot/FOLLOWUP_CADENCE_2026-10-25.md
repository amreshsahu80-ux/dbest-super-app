## Civic issue follow-up cycle (25 October 2026)

**Implemented only in isolated Free Supabase project / JanSathi staging. Never deployed to dbest4u.com or existing DBest App Pro database.**

Issue reporters can add factual progress updates to an open issue after the following elapsed waiting periods:
- Urgent: **48 hours** (Owner reclassification only)
- High: **168 hours / 7 days** (road, drainage, garbage, water by default)
- Moderate: **720 hours / 30 days** (streetlight by default)
- Low: **2160 hours / 90 days** (other by default)

A new issue's first eligible date starts at its initial report time. Once a citizen follow-up is accepted, the next eligible date resets from that submission time. Closed and rejected issues cannot receive more follow-ups. **These are citizen observations, not official acknowledgement or resolution.** Notes are private and marked `pending` or `held` for editorial moderation; they are never automatically published as verified public claims.

The server enforces authentication, original reporter ownership, verified email/phone, the next due timestamp and single submission per window using a row lock. User cannot submit early, force an eligible date, update another person's issue, or change severity. A verified JanSathi Owner can change the severity only through a guarded RPC with an audit reason, which recalculates the next due time. No other user or editor can change severity. Test-account membership and cross-project SSO remain unresolved.

New migration files:
- `sql/005_civic_severity_followup_schedule.sql`
- `sql/006_followup_private_state_owner_audit.sql`

Staging UI now includes severity schedule examples, `My Reports` with due dates, a follow-up form and private history, and a hidden Owner severity-management panel. The Owner panel is unavailable until a genuine verified owner identity is assigned to the separate JanSathi Auth project.

**Validated with synthetic transactional tests**, which were rolled back:
- 7-day default from road complaint
- Owner override to urgent and 48-hour rescheduling
- Premature, repeated and non-owner-submission denial
- One allowed citizen follow-up when eligible followed by the next due time
- Private history inaccessible to another user
- 30-day streetlight and 90-day other-category defaults
- Owner audit created and all test data rolled back.
- Supabase security advisor returned zero findings.
- Frontend JavaScript passed syntax validation; Vercel staging deployment built READY.

Still pending: real user browser signup/auth testing, human moderation workflow for notes, automatic email/WhatsApp/push reminders, integrated DBest single sign-on and active paid member handoff, thorough mobile UX and launch GO. These were not claimed complete.
