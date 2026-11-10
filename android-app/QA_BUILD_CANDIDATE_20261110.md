# DBest Main Android — Combined QA Build Candidate, 10 November 2026

## Verified prerequisites
- Production website `https://dbest4u.com` has an existing Maps JavaScript API browser key. Its nearby endpoint returned public places around Chakradharpur on 10 November.
- The separate Vercel Cab QA preview still lacks its own authorized Google browser key and returns 503 for nearby provider calls. Do not claim real photo integration passed there.
- A native Android app build does not ship the pending Cab website improvements; those must be separately approved and deployed to production.
- Preserve public `com.dbest4u.app` Google Play release; debug QA app uses `com.dbest4u.app.test`.

## QA source scope
This build candidate contains the existing combined clean-header, Account & Privacy and Firebase opt-in test notification changes from PR #103. Build unsigned release AAB and installable debug APK through the existing GitHub Actions workflow.

## Mandatory mobile testing, before any public release
1. Cold/warm startup; no duplicate header and no blank screen.
2. Register/login, Account & Privacy, deletion email request and deletion URL.
3. Firebase permission ON/OFF, foreground/background/terminated; no production notification sends.
4. Logout, account switch, token refresh and cross-account notification isolation.
5. Existing live website routes (Cab, Marketplace, flights/hotels) not broken. Do not submit real bookings or payments.
6. Performance metrics on phone, WebView Back/Home, floating controls/WhatsApp overlap.
7. Separate controlled Cab-web release only after real Google imagery, 500 km autosuggestions, pickup and booking regression pass.

No Play Store upload, no signed production AAB, no live DB or payment changes.
