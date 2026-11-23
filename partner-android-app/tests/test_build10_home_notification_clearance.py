"""Protect the native Partner notification control from WhatsApp overlap.

Static contract only: Android device layout and WebView WhatsApp position
still require manual QA before a signed release.
"""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
home = (root / "app/src/main/java/com/dbest4u/partner/MainActivity.java").read_text()
push = (root / "app/src/main/java/com/dbest4u/partner/PartnerPushTestController.java").read_text()

assert 'new FrameLayout.LayoutParams(\n            FrameLayout.LayoutParams.WRAP_CONTENT,dp(48),Gravity.BOTTOM|Gravity.LEFT)' in push, "Notification toggle must be bottom-left, not over bottom-right WhatsApp"
assert 'lp.setMargins(dp(12),0,dp(12),dp(12));' in push, "Notification toggle needs safe edge margins"
assert 'root.addView(control,lp);' in push, "Notification toggle must attach to the native screen host"
assert 'control.setContentDescription("Partner notification settings");' in push, "Notification toggle must be accessible"
assert 'control.setText(active?"🔔 ON"' in push, "Notification ON state must be visible"
assert '"🔕 OFF"' in push, "Notification OFF state must be visible"
assert 'control.setVisibility(show ? View.VISIBLE : View.GONE);' in push, "Notification control must hide over partner portal WhatsApp"
assert 'partnerTestPush.setHomeVisible(false)' in home, "Workspace must hide native notification control"
assert 'partnerTestPush.setHomeVisible(true)' in home, "Home must restore native notification control"
assert 'page.setPadding(dp(16), dp(8), dp(16), dp(84));' in home, "Home footer needs notification overlay clearance"
assert 'bar.addView(back, new LinearLayout.LayoutParams(dp(48), dp(48)));' in home, "Browser Back needs accessible touch target"
assert 'bar.addView(home, new LinearLayout.LayoutParams(dp(48), dp(48)));' in home, "Browser Home needs accessible touch target"
print("PASS: notification visibility, left anchoring, WhatsApp clearance and Back/Home controls")

# Scope visibility checks to the actual navigation methods. A matching call in
# an unrelated method must not mask a broken Home/Workspace transition.
portal = home.split("private void openPortal(String name, String route) {", 1)[1].split("private void showHome() {", 1)[0]
return_home = home.split("private void showHome() {", 1)[1].split("private void openTrustedPushTarget(", 1)[0]
assert 'homeScreen.setVisibility(View.GONE);' in portal, "Workspace must hide role cards"
assert 'browserShell.setVisibility(View.VISIBLE);' in portal, "Workspace browser must become visible"
assert 'partnerTestPush.setHomeVisible(false);' in portal, "Workspace must hide notification overlay"
assert 'homeScreen.setVisibility(View.VISIBLE);' in return_home, "Returning Home must restore role cards"
assert 'browserShell.setVisibility(View.GONE);' in return_home, "Returning Home must hide browser"
assert 'partnerTestPush.setHomeVisible(true);' in return_home, "Returning Home must restore notification overlay"
assert 'landingScroll.scrollTo(0, 0);' in return_home, "Returning Home must reset stale scroll position"
print("PASS: workspace/home transition state and notification overlay scoped to navigation methods")
