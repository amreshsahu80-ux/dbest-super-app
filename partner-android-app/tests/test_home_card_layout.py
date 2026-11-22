"""Regression contract for the compact Partner home cards.

Run: python3 partner-android-app/tests/test_home_card_layout.py
No Android SDK required; Android compilation and device QA remain separate gates.
"""
from pathlib import Path
import re

source = (Path(__file__).resolve().parents[1] / "app/src/main/java/com/dbest4u/partner/MainActivity.java").read_text()
home = source.split("private View makeHome() {", 1)[1].split("private View roleCard(", 1)[0]
cards = re.findall(r'page\.addView\(roleCard\(\s*"([^"]+)"[\s\S]*?"([^"]+)",\s*"([^"]+)"\)\);', home)
assert cards == [
    ("Vendor", "/Vendor", "/partner?type=Vendor"),
    ("Vaahak", "/vaahak", "/partner?type=Vaahak"),
    ("Service Partner", "/ServicePartnerDashboard", "/partner?type=Service%20Partner"),
], f"Partner home role order or routes changed: {cards!r}"
between = home.split('page.addView(roleCard(', 1)[1]
for label in ('"Vaahak"', '"Service Partner"'):
    prefix, between = between.split('page.addView(roleCard(', 1)
    assert re.search(r'space\(page,\s*8\);\s*(?://[^\n]*\n\s*)*$', prefix), f"Missing compact 8dp gap before {label}"
assert 'page.setPadding(dp(16), dp(8), dp(16), dp(84));' in home, "Notification overlay clearance regressed"
assert 'showAccountSettings()' in home, "Account/privacy entry point removed"

# Compact visual treatment must not shrink actionable targets or hide role headings.
role_card = source.split("private View roleCard(", 1)[1].split("private ", 1)[0]
assert 'card.addView(photoFrame, new LinearLayout.LayoutParams(-1, dp(56)));' in role_card, "Compact photo preview height changed"
assert 'roleTitle.setMaxLines(2);' in role_card, "Role headings must wrap on narrow screens"
assert 'ViewCompat.setAccessibilityHeading(roleTitle, true);' in role_card, "Role heading semantics removed"
assert 'photoFrame.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);' in role_card, "Decorative photo is exposed to TalkBack"

# Workspace toolbar must keep native navigation and notification settings accessible
# without introducing another floating control over the web portal's WhatsApp widget.
browser = source.split("private LinearLayout makeBrowser() {", 1)[1].split("webView = new WebView(this);", 1)[0]
for name, description, action in (
    ("back", "Back", "showHome()"),
    ("notifications", "Partner notification on/off settings", "partnerTestPush.openSettings()"),
    ("home", "Partner home", "showHome()"),
):
    assert re.search(r'Button ' + name + r' = button\(', browser), f"Missing toolbar {name} button"
    assert f'{name}.setContentDescription("{description}");' in browser, f"Missing accessible {name} label"
    assert action in browser, f"Missing {name} action"
    assert re.search(r'bar\.addView\(' + name + r', new LinearLayout\.LayoutParams\(dp\(48\), dp\(48\)\)\);', browser), f"{name} touch target must remain 48dp"
assert 'The home-screen floating toggle is hidden over the portal' in browser, "Portal notification overlay separation changed"

print("PASS: three Partner cards retain ordered routes, 8dp gaps, overlay clearance and account access")
