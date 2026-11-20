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
print("PASS: three distinct role routes, Join targets, accessible actions and workspace navigation")
