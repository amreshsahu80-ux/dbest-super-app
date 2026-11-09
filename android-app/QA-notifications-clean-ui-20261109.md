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
