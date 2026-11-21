#!/usr/bin/env python3
"""Guard delayed WebView push callbacks against Home and role switches."""
from pathlib import Path

source = (Path(__file__).resolve().parents[1] /
          "app/src/main/java/com/dbest4u/partner/MainActivity.java").read_text()
start = source.index("@Override public void onPageFinished(WebView v, String url)")
end = source.index("@Override public boolean shouldOverrideUrlLoading", start)
callback = source[start:end]

# A late completion from an abandoned role must not mutate current workspace.
assert "if (!showingBrowser || url == null || !url.equals(v.getUrl())) return;" in callback
assert "final String completedUrl = url;" in callback
assert "final String completedRole = currentRole;" in callback
assert "v.postDelayed(() -> {" in callback
assert "showingBrowser && partnerTestPush != null" in callback
assert "java.util.Objects.equals(completedRole, currentRole)" in callback
assert "completedUrl.equals(v.getUrl())" in callback
assert callback.count("partnerTestPush.onPortalPageLoaded();") == 1

# Ensure all three guards are in the same delayed callback before the call.
delayed = callback.split("v.postDelayed(() -> {", 1)[1]
guard = delayed.split("partnerTestPush.onPortalPageLoaded();", 1)[0]
assert "if (showingBrowser && partnerTestPush != null" in guard
assert "&& java.util.Objects.equals(completedRole, currentRole)" in guard
assert "&& completedUrl.equals(v.getUrl())) {" in guard
assert guard.count("if (") == 1, "Push must be guarded by one combined condition"
for condition in ("showingBrowser", "completedRole, currentRole", "completedUrl.equals(v.getUrl())"):
    assert condition in guard, f"Missing delayed callback guard: {condition}"
print("PASS: stale WebView callbacks cannot bind push state across Home/role switches")
