# DBest Android v1.0.1 — internal device verification

This file is part of an isolated Android-only fix branch. It triggers the existing `DBest Android Build` GitHub Actions workflow through the configured `android-app/**` push path filter. It does not modify the live DBest website or any production deployment.

## Scope
- Confirm the app displays the status bar (time, network, battery) without overlap.
- Confirm bottom system gesture/navigation bar is visible and functional.
- Confirm display cutout/safe-area behavior in portrait orientation.
- Confirm WebView scroll, member login/keyboard, back navigation, file chooser, and location prompts.
- Confirm Cab, Marketplace and partner handoffs still navigate correctly; no test payments or real bookings.

## Release safety
- Internal testing track only; no Production rollout.
- Android package: `com.dbest4u.app`; version: `1.0.1` (`versionCode 2`).
- Build workflow produces an **unsigned** AAB, which must be signed with the same existing Google Play upload keystore before uploading to the testing track.
- Never commit or upload the existing private keystore or passwords to GitHub.
- Keep this PR unmerged until build verification and installation tests pass.
