# DBest Performance Preview

This branch is isolated from production main.

Goals:
- Keep payout rules unchanged.
- Preserve spinner, UPI onboarding, refresh restore, browser back restore, responsive layout, camera/media choices and required-field markers.
- Remove global/full-page observers and polling from nonessential enhancements.
- Lazy-load Cab, Owner, Vaahak and Marketplace enhancement bundles only when their sections are used.
- Test on Android, iPhone and desktop before merging to main.

Production main must not be modified from this branch until preview verification is complete.
