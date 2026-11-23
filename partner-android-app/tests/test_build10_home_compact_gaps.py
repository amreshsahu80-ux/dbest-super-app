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

# Workspace navigation must retain accessible 48dp Back/Home actions.
browser = source.split("private LinearLayout makeBrowser() {", 1)[1].split("webView = new WebView(this);", 1)[0]
assert 'back.setContentDescription("Back");' in browser
assert 'home.setContentDescription("Partner home");' in browser
assert 'back.setOnClickListener(v -> {' in browser
assert 'home.setOnClickListener(v -> showHome());' in browser
assert 'new LinearLayout.LayoutParams(dp(48), dp(48))' in browser
assert 'privacy.setContentDescription("Account & Privacy");' in browser
# The Home screen must remain scrollable above floating native controls.
assert 'scroll.setClipToPadding(false);' in home
print("PASS: Build 10 role routes, compact gaps, accessible toolbar and overlay clearance")


# Notification consent and role changes must remain guarded across Home navigation.
assert 'partnerTestPush.setHomeVisible(true);' in source
assert 'partnerTestPush.setHomeVisible(false);' in source
assert 'partnerTestPush.onWorkspaceSelected(canonicalRole);' in source
assert 'cancelPendingFileChooser();' in source
assert 'cancelPendingLocationPrompt();' in source
push_target = source.split('private void openTrustedPushTarget(Intent intent) {', 1)[1].split('@Override protected void onNewIntent', 1)[0]
assert 'getBoolean("enabled", false)' in push_target
assert 'getBoolean("bound", false)' in push_target
assert 'role.equals(account.getString("bound_role", ""))' in push_target
assert 'openPortal("Vendor", "/Vendor")' in push_target
assert 'openPortal("Vaahak", "/vaahak")' in push_target
assert 'openPortal("Service Partner", "/ServicePartnerDashboard")' in push_target
print("PASS: notification consent, role binding and workspace lifecycle safeguards")

# Compact home must keep all three role cards and accessible account entry.
assert 'brand.addView(privacyMenu, new LinearLayout.LayoutParams(dp(48), dp(48)));' in home
assert 'privacyMenu.setOnClickListener(v -> showAccountSettings());' in home
assert 'scroll.setFillViewport(true);' in home
assert '"Vendor", "GROCERY · RESTAURANT · PHARMACY"' in home
assert '"Vaahak", "CAB · DELIVERY · TRANSPORT"' in home
assert '"Service Partner", "REPAIRS · HOME SERVICES"' in home
# Existing web portal remains responsible for WhatsApp; avoid injecting a second native floater.
assert 'WhatsApp' not in home and 'whatsapp' not in home.lower()
print("PASS: three partner cards, privacy touch target and no duplicate native WhatsApp floater")
