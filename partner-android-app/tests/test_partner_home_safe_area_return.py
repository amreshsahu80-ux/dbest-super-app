"""Guard Android Partner Home safe-area and return-navigation behavior (source contract)."""
from pathlib import Path

source = (Path(__file__).resolve().parents[1] / "app/src/main/java/com/dbest4u/partner/MainActivity.java").read_text()
root = source.split("@Override public void onCreate(Bundle state) {", 1)[1].split("private View makeHome()", 1)[0]
home = source.split("private View makeHome()", 1)[1].split("private View roleCard(", 1)[0]
return_home = source.split("private void showHome() {", 1)[1].split("private void openTrustedPushTarget(", 1)[0]
assert "WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()" in root, "Missing cutout/system-bar protection"
assert "view.setPadding(area.left, area.top, area.right, area.bottom);" in root, "Insets not applied to screen root"
assert "page.setPadding(dp(16), dp(8), dp(16), dp(84));" in home, "Notification overlay footer clearance regressed"
assert "scroll.setFillViewport(true);" in home and "scroll.setClipToPadding(false);" in home
assert "cancelPendingFileChooser();" in return_home and "cancelPendingLocationPrompt();" in return_home
assert "resetWorkspaceHistoryOnLoad = false;" in return_home
assert "landingScroll.post(() -> {" in return_home and "landingScroll.scrollTo(0, 0);" in return_home, "Home does not reset to top"
assert "browserShell.setVisibility(View.GONE);" in return_home
assert "partnerTestPush.setHomeVisible(true);" in return_home
print("PASS: Partner Home safe-area, notification clearance, and workspace return reset")
