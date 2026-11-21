#!/usr/bin/env python3
"""Static regression checks for native Home / abandoned WebView navigation.

Run: python3 partner-android-app/tests/test_home_abandoned_navigation.py
No Android SDK, network access or production credentials required.
"""
from pathlib import Path

source = (Path(__file__).resolve().parents[1] /
          "app/src/main/java/com/dbest4u/partner/MainActivity.java").read_text()

def section(start, end):
    return source.split(start, 1)[1].split(end, 1)[0]

home = section("private void showHome() {", "private void openTrustedPushTarget(")
portal = section("private void openPortal(String name, String route) {", "private void showHome() {")
route = section("private boolean route(Uri url) {", "private boolean isHttp(Uri u) {")
finished = section("@Override public void onPageFinished(WebView v, String url) {",
                   "@Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req)")

assert "if (webView != null) webView.stopLoading();" in home, "Home must stop abandoned WebView loads"
assert home.index("showingBrowser = false;") < home.index("webView.stopLoading();"), "Mark Home before stopping a load"
assert "resetWorkspaceHistoryOnLoad = false;" in home, "Home must cancel pending history reset"
assert "browserLoading.setVisibility(View.GONE)" in home, "Home must hide progress"
assert "partnerTestPush.setHomeVisible(true)" in home, "Home must restore notification toggle"
assert "partnerTestPush.setHomeVisible(false)" in portal, "Workspace must hide native notification toggle"
assert "resetWorkspaceHistoryOnLoad = true;" in portal, "New role must reset old history"
assert "if (!showingBrowser || url == null) return true;" in route, "Hidden WebView must not launch external links"
assert "if (!showingBrowser || url == null || !url.equals(v.getUrl())) return;" in finished, "Stale page-finished callback must not change current UI"
print("PASS: Home abandonment, role transition, and stale WebView callback guards")
