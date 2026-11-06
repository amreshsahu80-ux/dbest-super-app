# DBest Main Android — clean header / account privacy / performance staging QA

**Scope:** isolated Android app shell experiment, NOT a public release. Based on the Play-approved 1.0.3 / versionCode 5 deletion branch, without changing the DBest website, Supabase, Cab, Marketplace, booking, payment, partner app, or live Play Store listing.

## Proposed UX
- Remove the native 52dp toolbar (duplicated **DBest** label and large **Request account deletion** button).
- Keep the website's branded DBest logo, language selector and member account chip intact.
- Inside the Android WebView only, add **Account & Privacy** under the existing **My Account**, **My Profile**, and signed-out **Register / Login** panels.
- The account/privacy item opens a native menu with **Request account deletion** and **Deletion instructions**. The existing email-request dialog and public URL `https://dbest4u.com/data-deletion` remain unchanged.
- No JavaScript interface is exposed. The app intercepts `dbest-account://settings` only when the current top-level WebView page has an HTTPS DBest domain.

## QA build isolation
- Debug application ID: `com.dbest4u.app.qa`, separate from the installed Play-signed `com.dbest4u.app`.
- Keep `versionCode 5` / `versionName 1.0.3` on this staging branch. Do **not** upload this build to Play.
- The official current production release remains unchanged.

## Performance investigation — no unverified speed claims
- The WebView opens `https://dbest4u.com/`, where the web bootstrap currently fetches a substantial `index-26.html` document before rendering the app and initializing many frontend scripts. Actual bottlenecks require measurement; the presence of these assets alone does not prove root cause.
- In **debug builds only**, log `DBestPerf` metrics: initial page start to first committed frame, page finish, DOMContentLoaded, load event, resource count, and rendered tile count.
- Avoid logging URLs, account tokens, locations, customer names, or other sensitive content.
- Benchmark **cold start** (after force stop) and **warm start** 3 times each on the target OPPO Android device; note network (Wi-Fi/mobile), screen-ready time, scroll response, service navigation delay and memory pressure.
- Use Android Studio Profiler / WebView DevTools, network waterfall and scripting flame chart to identify the real slow paths before changing the site's JavaScript/CSS or asset caching.
- Compare signed production 1.0.3 with staging QA side-by-side using equivalent network conditions.

## Mandatory manual gates before any release
1. **Cold start / warm start:** logo visible without duplicate header; no white/blank screen; service cards load, scrolling smooth.
2. **Signed out:** open Register / Login; account/privacy entry visible and opens native account-deletion options.
3. **Member logged in:** tap profile chip; My Account and My Profile show account/privacy option; check Back/Home routes.
4. **Deletion compliance:** email intent opens expected email app, fallback opens published instructions, cancellation does not delete anything.
5. **Security:** untrusted external URLs and fake `dbest-account://` links do not trigger account actions while outside DBest; no JavaScript interface exposed.
6. **Core regression:** customer login, language selector, Flights/Hotels, Cab search/nearby places, Marketplace, wallet and payments open as before; no transactional test charges without permission.
7. **Device:** compare on Android 16 and an Android 13+ device; check font scaling, display cutout, keyboard and accessibility labels.
8. **Perf:** collect `DBestPerf` and DevTools timing; record measured before/after, fix confirmed bottlenecks, then rerun all gates.
9. **FCM:** notification ON/OFF remains a separate gated pilot (PR #82); do not claim production push works or enable `DBEST_FCM_SEND_ENABLED` through this change.
10. **Release:** only after physical QA, data safety checks and owner sign-off, build/sign a **new** production AAB with increased version code and submit through Play Console.

## Status
UI source is staged on a non-production branch. Build and physical QA pending. No live deployment authorized or performed.
