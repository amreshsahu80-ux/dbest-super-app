"""Build 10 home-only spacing and role route contract; no Android SDK required."""
from pathlib import Path
import re

source = (Path(__file__).resolve().parents[1] / "app/src/main/java/com/dbest4u/partner/MainActivity.java").read_text()
home = source.split("private View makeHome() {", 1)[1].split("private View roleCard(", 1)[0]
cards = re.findall(r'page\.addView\(roleCard\(\s*"([^"]+)"[\s\S]*?"([^"]+)",\s*"([^"]+)"\)\);', home)
assert cards == [
    ("Vendor", "/Vendor", "/partner?type=Vendor"),
    ("Vaahak", "/vaahak", "/partner?type=Vaahak"),
    ("Service Partner", "/ServicePartnerDashboard", "/partner?type=Service%20Partner"),
], f"Unexpected role routes/order: {cards}"
chunks = home.split("page.addView(roleCard(")
assert len(chunks) == 4, "Exactly three role cards expected"
for chunk in chunks[1:3]:
    assert re.search(r'\)\);\s*space\(page, 8\);\s*$', chunk), "Role-card gap must be 8dp"
assert 'page.setPadding(dp(16), dp(8), dp(16), dp(84));' in home, "Floating notification clearance removed"
assert 'showAccountSettings()' in home, "Account & Privacy control removed"
assert 'scroll.setFillViewport(true);' in home, "Home must remain scrollable"
assert 'scroll.setClipToPadding(false);' in home, "Home footer must clear floating controls"
assert 'card.addView(photoFrame, new LinearLayout.LayoutParams(-1, dp(60)));' in source, "Role artwork must remain compact at 60dp"
assert 'workspace.setOnClickListener(v -> openPortal(title, loginPath));' in source, "Workspace action route removed"
assert 'join.setOnClickListener(v -> openPortal(title + " · Join", joinPath));' in source, "Join route removed"
assert 'back.setContentDescription("Back");' in source, "Back accessibility removed"
assert 'home.setContentDescription("Partner home");' in source, "Home accessibility removed"
assert 'new LinearLayout.LayoutParams(dp(48), dp(48))' in source, "Compact touch controls removed"
assert 'partnerTestPush.setHomeVisible(true)' in source, "Home notification state removed"
assert 'partnerTestPush.setHomeVisible(false)' in source, "Workspace notification state removed"
print("PASS: Build 10 role routes, 60dp artwork, controls, and overlay clearance")

# Accessibility and narrow-screen safeguards for the three role cards.
role_card = source.split("private View roleCard(", 1)[1].split("private LinearLayout makeBrowser()", 1)[0]
assert 'roleTitle.setMaxLines(2);' in role_card, "Role titles must wrap on narrow screens"
assert 'ready.setMaxWidth(dp(100));' in role_card, "Decorative badge must not crowd the role title"
assert 'overlay.setEllipsize(android.text.TextUtils.TruncateAt.END);' in role_card, "Category overlay must truncate safely"
assert 'workspace.setContentDescription("Open " + title + " workspace");' in role_card, "Workspace accessibility label removed"
assert 'join.setContentDescription("Join as " + title);' in role_card, "Join accessibility label removed"
assert 'new LinearLayout.LayoutParams(0, dp(48), 1.5f)' in role_card, "Workspace button minimum touch height changed"
assert 'new LinearLayout.LayoutParams(0, dp(48), 0.72f)' in role_card, "Join button minimum touch height changed"
assert 'card.setOnClickListener(v -> openPortal(title, loginPath));' in role_card, "Card tap must open workspace, not onboarding"
print("PASS: role-card accessibility, narrow-screen text, and independent 48dp actions")
