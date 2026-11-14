# Partner Build 10 evidence checkpoint — 2026-11-14

Scope: isolated PR #136, no production changes. Verified via connected GitHub and read-only Supabase queries.

- PR #136 head `7726e59833c6efaa343aa9a7406e0528e20a7b4a`, draft; PR #131 head `5a342dae06b09d6df02b27c347fa93d4bb198b11`, draft. Neither merged.
- On PR #136 head, FCM QA runs 43586789220 and 43586788418: completed/success; production-ID canary runs 43586789187 and 43586788409: completed/success. This supersedes the earlier failed FCM QA result on an older commit.
- PR #131 onboarding isolated regression run 43477757947: completed/success.
- Build 10 workflow file checks `versionCode 10` and `versionName '1.0.6'`; FCM QA workflow also checks versionCode 10 and compiles unsigned candidate. The isolated static tests are source assertions, not a live onboarding E2E pass.
- Read-only Supabase project `ydedmotbacnllkijzmvp`: public partner-related tables include `partner_accounts_live`, `partner_kyc_documents`, `partner_email_otp_live`, `partner_sessions_live`, `service_partner_profiles_live`, `vaahak_partners_live`. Existence is not persistence verification.
- Catalog privileges: `dbest_vaahak_kyc_complete`, `dbest_vendor_kyc_complete`, `owner_console`, `issue_owner_email_otp`, `verify_owner_email_otp` are SECURITY DEFINER and neither anon nor authenticated has direct EXECUTE. `dbest_guard_single_partner_onboarding_source` and `dbest_leader_partner_onboarding_trigger` have anon EXECUTE; both are non-SECURITY DEFINER. Review trigger invocation context before deciding on grants; do not alter permissions blindly.

**Still unverified:** registration+OTP, required document upload persistence and retry, Owner queue approval/rejection and resubmission, first login for Vendor/Vaahak/Service Partner, complete CI matrix and signed release keystore. No signing or deployment permitted on this evidence alone.
