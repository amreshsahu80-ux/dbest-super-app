#!/usr/bin/env python3
"""Guard the native Partner Home role-to-portal contract without an Android SDK."""
from pathlib import Path
import re
from urllib.parse import unquote

src = (Path(__file__).resolve().parents[1] /
       "app/src/main/java/com/dbest4u/partner/MainActivity.java").read_text()
home = src.split("private View makeHome() {", 1)[1].split("private View roleCard(", 1)[0]
card = src.split("private View roleCard(", 1)[1].split("private LinearLayout makeBrowser()", 1)[0]
browser = src.split("private LinearLayout makeBrowser() {", 1)[1].split("private void showHome()", 1)[0]

expected = {
    "Vendor": ("/Vendor", "/partner?type=Vendor"),
    "Vaahak": ("/vaahak", "/partner?type=Vaahak"),
    "Service Partner": ("/ServicePartnerDashboard", "/partner?type=Service%20Partner"),
}
cards = re.findall(
    r'roleCard\(\s*"([^"]+)",\s*"[^"]+",\s*"[^"]+",\s*'
    r'0x[0-9A-Fa-f]+,\s*R\.drawable\.\w+,\s*"([^"]+)",\s*"([^"]+)"\)',
    home, re.S)
assert len(cards) == len(expected), f"Expected exactly three role cards; got {cards!r}"
assert len({name for name, _, _ in cards}) == len(cards), "Duplicate role cards"
for role, workspace, join in cards:
    assert role in expected, f"Unexpected role {role}"
    assert (workspace, join) == expected[role], f"Wrong {role} route"
    assert workspace.startswith("/") and join.startswith("/"), "Routes must remain relative"
    assert unquote(join.split("type=", 1)[1]) == role, "Join role must match card role"
assert 'workspace.setOnClickListener(v -> openPortal(title, loginPath));' in card
assert 'join.setOnClickListener(v -> openPortal(title + " · Join", joinPath));' in card
assert 'card.setOnClickListener(v -> openPortal(title, loginPath));' in card
assert 'workspace.setContentDescription("Open " + title + " workspace");' in card
assert 'join.setContentDescription("Join as " + title);' in card
assert 'new LinearLayout.LayoutParams(0, dp(48)' in card, "Keep 48dp action targets"
assert 'back.setContentDescription("Back");' in browser
assert 'home.setContentDescription("Partner home");' in browser
assert 'home.setOnClickListener(v -> showHome());' in browser

# Compact native landing: footer must remain clear of the independent floating
# notification control, including when the user scrolls to the bottom.
assert 'page.setPadding(dp(16), dp(8), dp(16), dp(84));' in home, \
    "Reserve footer clearance for floating notification control"
assert 'card.addView(photoFrame, new LinearLayout.LayoutParams(-1, dp(56)));' in card, \
    "Keep role preview compact without shrinking accessible action buttons"
assert 'privacyMenu.setContentDescription("Account & Privacy");' in home
assert 'privacyMenu.setOnClickListener(v -> showAccountSettings());' in home
assert 'bar.setPadding(dp(4), dp(3), dp(4), dp(3));' in browser, \
    "Keep browser toolbar compact"
assert 'bar.addView(back, new LinearLayout.LayoutParams(dp(48), dp(48)));' in browser
assert 'bar.addView(home, new LinearLayout.LayoutParams(dp(48), dp(48)));' in browser
assert 'linkAccount.setContentDescription("Link signed-in partner account to notifications");' in browser
assert 'bar.addView(linkAccount, new LinearLayout.LayoutParams(dp(52), dp(48)));' in browser
assert 'privacy.setContentDescription("Account & Privacy");' in browser

assert 'ViewCompat.setAccessibilityHeading(workspaceHeading, true);' in home, \
    "Workspace section should be a screen-reader heading"
assert 'ViewCompat.setAccessibilityHeading(roleTitle, true);' in card, \
    "Each role title should be a screen-reader heading"

print("PASS: three distinct role routes, Join targets, headings, accessible actions and workspace navigation")
