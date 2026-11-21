#!/usr/bin/env python3
"""Guard role-switch isolation in the native Partner Home/WebView lifecycle."""
from pathlib import Path

src = (Path(__file__).resolve().parents[1] /
       "app/src/main/java/com/dbest4u/partner/MainActivity.java").read_text()
portal = src.split("private void openPortal(String name, String route) {", 1)[1].split("private void showHome() {", 1)[0]
home = src.split("private void showHome() {", 1)[1].split("private void openTrustedPushTarget(", 1)[0]
browser = src.split("private LinearLayout makeBrowser() {", 1)[1].split("private boolean route(", 1)[0]

# A previous role's file chooser/location request must not receive a new role's data.
for action in ("cancelPendingFileChooser();", "cancelPendingLocationPrompt();"):
    assert action in portal, f"Role switching must {action}"
    assert action in home, f"Returning Home must {action}"
assert "partnerTestPush.onWorkspaceSelected(canonicalRole)" in portal
assert "currentRole = canonicalRole;" in portal
assert "resetWorkspaceHistoryOnLoad = true;" in portal
assert "webView.loadUrl(ORIGIN + route);" in portal
assert "if (webView != null) webView.stopLoading();" in home
assert "partnerTestPush.setHomeVisible(true)" in home
assert "partnerTestPush.setHomeVisible(false)" in portal
assert "if (!showingBrowser || url == null || !url.equals(v.getUrl())) return;" in browser
assert "if (!showingBrowser || activeUrl == null || !isDbest(Uri.parse(activeUrl)))" in browser
assert "activeFileRequestCode = requestCode;" in browser
assert "if (showingBrowser && partnerTestPush != null" in browser
print("PASS: role-switch cleanup, stale WebView guards, chooser isolation and push visibility")
