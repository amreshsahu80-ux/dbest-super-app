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
assert "final long completedGeneration = workspaceGeneration;" in callback
assert "v.postDelayed(() -> {" in callback
assert "showingBrowser && partnerTestPush != null" in callback
assert "java.util.Objects.equals(completedRole, currentRole)" in callback
assert "completedUrl.equals(v.getUrl())" in callback
assert callback.count("partnerTestPush.onPortalPageLoaded();") == 1

# Ensure all three guards are in the same delayed callback before the call.
delayed = callback.split("v.postDelayed(() -> {", 1)[1]
guard = delayed.split("partnerTestPush.onPortalPageLoaded();", 1)[0]
assert "if (showingBrowser && partnerTestPush != null" in guard
assert "&& completedGeneration == workspaceGeneration" in guard
assert "&& java.util.Objects.equals(completedRole, currentRole)" in guard
assert "&& completedUrl.equals(v.getUrl())) {" in guard
assert guard.count("if (") == 1, "Push must be guarded by one combined condition"
for condition in ("showingBrowser", "completedGeneration == workspaceGeneration", "completedRole, currentRole", "completedUrl.equals(v.getUrl())"):
    assert condition in guard, f"Missing delayed callback guard: {condition}"
print("PASS: stale WebView callbacks cannot bind push state across Home/role switches")

# Same-role, same-URL reopen must also invalidate an older delayed callback.
assert "private long workspaceGeneration;" in source
assert "currentRole = canonicalRole;\n        workspaceGeneration++;" in source
assert "private void showHome() {\n        workspaceGeneration++;" in source

# Activity teardown must invalidate already queued WebView push callbacks.
teardown = source.split("@Override protected void onDestroy() {", 1)[1].split("super.onDestroy();", 1)[0]
assert "workspaceGeneration++;" in teardown
assert "showingBrowser = false;" in teardown
assert teardown.index("workspaceGeneration++;") < teardown.index("partnerTestPush.shutdown()")
assert teardown.index("showingBrowser = false;") < teardown.index("partnerTestPush.shutdown()")
