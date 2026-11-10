# DBest Main Android — Clean UI + Firebase Notification QA
Status: DRAFT; no public release, no live backend changes.

## Source and isolation
- Based on staged clean-header/account-privacy QA PR #101 and earlier Firebase FCM pilot PR #82.
- Debug applicationId is `com.dbest4u.app.test` (Firebase registered). Public production remains `com.dbest4u.app`.
- Debug display label `DBest Push QA`; never uninstall or overwrite the public DBest app.
- Large native top text header and deletion button remain removed. The existing website logo stays.
- Account deletion remains under My Account > Account & Privacy and leads to the request dialog or published deletion instructions.
- The Firebase native push button is a distinct bottom-left QA toggle; WhatsApp remains separate on the website.

## Notification safety
- **Test alerts ON** means only Android permission granted and a Firebase device token generated. It does **not** prove server-side registration or actual production message delivery.
- Existing native FCM account binding is opt-in and must be tested with a nonprivileged authenticated member. Never capture or disclose session tokens.
- Do not enable `DBEST_FCM_SEND_ENABLED`, add production sender credentials, deploy new Supabase code, or send live order/ride notifications as part of QA build.
- No third-party service key is packaged into this client.
- Android 13+ notification permission DENIED must leave test mode OFF.
- Verify ON/OFF, token deletion, registration, session expiration, role-switch, reinstall, logout, and notification tap routing.
- Verify foreground, background, and terminated-state FCM message handling with a controlled test payload. UI alone is insufficient.
- Check that notification control does not cover WhatsApp and navigation or obscure service tiles.
- Check direct link and external URL routing remains restricted to DBest HTTPS origins.

## Visual and performance QA
- Verify no duplicate DBest label above the existing logo.
- Verify no large native Delete Account header button; Account & Privacy still accessible when logged in and out.
- Verify deletion instructions and email request opening, without actually deleting a QA account.
- Verify Cab, Marketplace, login, finance tiles, wallet, and payment navigation (no unauthorized real transactions).
- Run and capture cold/warm startup measurements via Account & Privacy > Performance diagnostics (QA).
- Compare physical-device performance against public Build 5 using equivalent network conditions. Diagnose actual bottlenecks before claiming speed improvement.

## Release criteria — NOT YET MET
- [ ] Gradle debug build green
- [ ] Install, launch and UI test on Android 16
- [ ] Firebase test token and controlled push delivery verified
- [ ] Permission OFF, token revoke, logout and account switch verified
- [ ] Account deletion access and instructions verified
- [ ] Cab / Marketplace / wallet / payments regression smoke passed
- [ ] Production sender security, event triggers and privacy disclosures reviewed
- [ ] Owner approves a separate signed versionCode > 5 Play release

Nothing here authorizes merging to production or uploading an AAB to Play.

## Logout QA finding and remediation — 9 Nov 2026
- Tester signed in as an authorized member, successfully linked DBest Push QA to native-fcm-register, then tapped **Logout**. A brief in-app toast `Logged out` appeared.
- The website's `logout()` changes `d2_session` in localStorage and redraws the UI without a WebView page navigation, so the original Android `onPageFinished`-only continuity check was not run. The member live session token may also remain in localStorage after logout. **Do not claim automatic revocation passed.**
- Read-only server audit showed recent registered test devices remained enabled after this logout; precise device-to-user attribution requires controlled retest.
- QA fix: when a device is account-bound, Android now checks the visible member role and original session fingerprint while foregrounded, detects in-page logout/account switches, turns its notification toggle OFF, attempts authenticated unregister using the original bound session, disables FCM auto-init, and deletes the local FCM token.
- If the unregister request fails, the client keeps a pending bound state rather than falsely claiming success. Automatic retries while the QA process is alive are throttled to at least 15 seconds. A kill/restart or expired original session may leave a stale remote registration; this remains a release blocker pending server-side hardening.
- Registration must not use a different member's current session to unregister the previous member's device.

### New manual gates
- [ ] Confirm in-place logout detects the account change and changes the toggle to OFF automatically, without tapping OFF.
- [ ] Verify the server registration is removed (read-only metadata audit; never reveal account session/device tokens).
- [ ] Verify the device no longer displays targeted notifications after logout.
- [ ] Verify changing from account A to account B cannot deliver A's notifications to B.
- [ ] Verify behavior after app process termination, device restart, network outage and expired sessions, and never claim a completed server unregister when it failed.

## Android-only compact floaters — 10 Nov 2026
- QA user verified header/account-deletion-button removal and redundant company description removal on device.
- Large native notification chip and website WhatsApp ON chip overlapped the service tiles and D-U-N-S seal.
- Native notification control in QA is now a 48dp icon-sized bell with an accessibility description, retaining identical permission/token ON/OFF interactions.
- Inject Android-only CSS to make the WhatsApp control a compact 'WA' icon; retained the original button ID, click handlers, backend behavior and accessibility text. Public website remains unchanged.
- Required physical QA: notification icon opens options, displays ON/OFF state, WhatsApp icon updates settings, and neither blocks the D-U-N-S seal or primary navigation. Screen reader/contrast check required.

## Verified physical QA evidence through 10 Nov 2026
These are observations from user-supplied screenshots and controlled Firebase Console tests, not full production verification.

- [x] On an Android device, native duplicate DBest header and oversized deletion button absent; primary site logo/login and service tiles intact
- [x] My Account > Account & Privacy opens and offers deletion request and instructions
- [x] Redundant company-description block absent, separate legal/contact footer and D-U-N-S seal visible
- [x] FCM test-device ON, direct Firebase Console delivery and background delivery observed
- [x] Manual OFF followed by a test message not being received observed; token-delete/backend revoke failure modes remain separately unproven
- [x] Pilot member registration produced explicit success toast
- [x] In-place logout in patched QA automatically changed control from ON to OFF; read-only backend aggregation subsequently showed no recent QA test registration
- [ ] Compact bell and WhatsApp 48dp controls: Android build passed, real phone layout/interaction test not yet provided
- [ ] Member A → member B automatic revoke / isolation
- [ ] Firebase delivery after logout, process death, expired credentials, offline/reconnect
- [ ] Real app-opening time to service tiles (cold/warm) and measured bottleneck remediation
- [ ] Cab, Marketplace, payments, account deletion links, notification tap navigation regression checks
- [ ] Signed production build with proper release application ID, production Firebase config, and policy review
- [ ] Production transactional sender/events verified; these remain disabled

**NO-GO for Google Play update** until the remaining privacy/security/performance tests pass. Public main app and Partner app are not altered by this QA branch.

## QA-only bottom dock prototype — 10 Nov 2026
- Owner verified both compact controls open the intended notification and WhatsApp actions on physical Android.
- Prior 48dp overlays still cover the lower service tiles; the new experimental native dock reserves 64dp below the WebView instead of overlaying content.
- Native bell retains all prior opt-in, device-token and account-revocation behavior. An Android-only WhatsApp button proxies the existing `#dbestWhatsAppEnable` button click; the original WhatsApp button is visually hidden only while the dock is active. The live web WhatsApp opt-in implementation is unmodified.
- Native dock is shown only on the trusted DBest home URL; it is hidden for other in-app routes so checkout receives full screen space.
- **Required device QA:** first install, logged-in versus signed-out display, WA consent prompts, ON/OFF, screen rotation, narrow screens, keyboard, scroll to bottom of D-U-N-S seal, checkout, nested account/profile screens, and native notifications after logout.
- This draft is not approved for production simply because Gradle passes.

## Final account-switch and performance QA review — 10 Nov 2026
- Reduced Android-only WhatsApp status polling to every 5 seconds while unbound, keeping 1.5-second continuity checks only when member FCM is bound. This is a *polling reduction*, not a verified startup speed improvement.
- Registration now requires both a current member role in `d2_session` and a member live token in the **same** WebView evaluation. It no longer accepts a cached member token after logout.
- Connecting another account while an earlier device binding remains active/pending is blocked; existing member must complete revocation before switching registration.
- Existing Supabase `native-fcm-register` endpoint authenticates hashed app sessions, scopes unregister to recipient/app/installation, and removes duplicate FCM token registrations across recipients when registering. The backend does **not** currently guarantee revocation if the previous session expires, or if the QA app is uninstalled/offline before revocation completes.
- Read-only DB aggregate on 10 Nov still showed one enabled **older QA registration**, last seen 2 Nov, and no production main-app registrations. Do not interpret this as proof any particular member device is still bound; avoid automatic deletion of unmatched rows without a reviewed cleanup policy.
- [ ] Physical A→B account-switch check with *two authorized test accounts*: enable+bind as A, logout, verify automatic OFF and backend revoke; sign into B, verify prior A does not receive a targeted notification; re-enable+bind as B only after A unlinked.
- [ ] Temporarily offline logout, server revoke retry, terminated-app restart, expired session behavior
- [ ] Cold-start and warm-start performance screenshots: QA menu > Account & Privacy > Performance diagnostics (QA), compare `Service tiles ready`, load times and resource entries; reproduce on similar network. Record time from app launch to usable home, not only initial WebView frame.
- [ ] Physical footer scroll (About/Contact/Terms, D-U-N-S) and dock remain visible without overlapping checkout.
- [ ] QA release must not activate production FCM sender or reach a Play Store production release without owner approval.
