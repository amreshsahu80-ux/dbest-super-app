# DBest Partner — standalone Android pilot

This is a **separate Android application** from DBest Super Platform:

- Main user app: `com.dbest4u.app` (untouched)
- Partner app: `com.dbest4u.partner` (Firebase staging version `0.2.1-beta`, code 3)

## What works in this pilot
- Photo-first, mobile-native role chooser with **Vendor**, **Vaahak**, **Service Partner**.
- Bundled real photographic collages from DBest's existing `/assets/partner-vendor.jpg`, `/assets/partner-vaahak.jpg` and `/assets/partner-service.jpg`. Works offline on the chooser screen and does not rely on stock/emoji image substitution.
- Uses the original DBest logo from the main website.
- Separate **Login / Dashboard** and **Join** actions for each role. Uses the **existing** partner portal routes; it does not copy authentication or payment code.
- Secure HTTPS WebView, DOM storage, file chooser for catalog/KYC uploads, optional location permission for allowed DBest origin, Android back navigation, external browser handoff.
- Edge-to-edge safe-area padding for Android 15/16 system bars. Native page shell returns to the role chooser.
- A separate `DBest Partner Android Build` workflow produces a debug-installable APK and an **unsigned** release AAB.

## Grounded live routes

| Role | Login / dashboard | New partner |
| --- | --- | --- |
| Vendor | `https://dbest4u.com/Vendor` | `https://dbest4u.com/partner?type=Vendor` |
| Vaahak | `https://dbest4u.com/vaahak` | `https://dbest4u.com/partner?type=Vaahak` |
| Service Partner | `https://dbest4u.com/ServicePartnerDashboard` | `https://dbest4u.com/partner?type=Service%20Partner` |

**Do not infer partner authentication from the landing UI.** Portal authorization, earnings, jobs, vendor orders and KYC remain server-controlled and require testing with real, nonprivileged test accounts.

## Explicitly not included yet
- Firebase SDK and a consent-gated FCM receiver are included on a separate Android test build, using the `dbest-mobile-notifications` project and matching `com.dbest4u.partner` client. FCM auto-registration is OFF.
- No push-notification "ON" switch is shown yet, because an authenticated FCM token registration/revocation backend, user preference controls, Android 13+ runtime permission request, and real-device delivery tests are still required before advertising active notifications.
- No cross-role authentication bypass, payment simulation, or admin control.
- No Play Console application/listing, upload key, signed release, or public deployment.
- No live DBest website/Supabase changes, no changes to frozen Cab/Marketplace flows.

## QA acceptance
1. App installs alongside DBest main app without package conflicts.
2. Status bar and bottom navigation remain visible on Android 16.
3. Vendor/ Vaahak/ Service Partner login routes load correctly; back/home is reliable.
4. KYC document chooser, approved location permission and external links behave correctly.
5. No hidden changes to production site, owner controls, member payouts, partner permissions.
6. Security review for navigation, role changes and external link handling.
7. Confirm notifications strategy, Google Play Data safety / account deletion requirements before a signed partner AAB or Play listing.

## Build locally

```sh
cd partner-android-app
gradle :app:assembleDebug :app:bundleRelease
```
Artifacts: `app/build/outputs/apk/debug/app-debug.apk` and `app/build/outputs/bundle/release/app-release.aab` (release is **unsigned**).
