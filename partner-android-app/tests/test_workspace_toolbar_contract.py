"""Static regression for compact Partner workspace toolbar and notification privacy.

Run: python3 partner-android-app/tests/test_workspace_toolbar_contract.py
No Android SDK or production credentials required.
"""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "app/src/main/java/com/dbest4u/partner"
MAIN = (SRC / "MainActivity.java").read_text(encoding="utf-8")
PUSH = (SRC / "PartnerPushTestController.java").read_text(encoding="utf-8")


class WorkspaceToolbarContract(unittest.TestCase):
    def test_workspace_actions_have_accessible_touch_targets(self):
        browser = MAIN.split("private LinearLayout makeBrowser()", 1)[1].split("webView = new WebView", 1)[0]
        for name, description in (
            ("back", "Back"),
            ("notifications", "Partner notification on/off settings"),
            ("home", "Partner home"),
            ("privacy", "Account & Privacy"),
        ):
            with self.subTest(action=name):
                self.assertRegex(browser, rf'bar.addView\\({name}, new LinearLayout.LayoutParams\\(dp\\(48\\), dp\\(48\\)\\)\\)')
                self.assertIn(f'{name}.setContentDescription("{description}")', browser)

    def test_workspace_notification_uses_existing_consent_controller(self):
        self.assertIn("partnerTestPush.openSettings()", MAIN)
        self.assertRegex(PUSH, r"public void openSettings\\(\\)\\s*\\{\\s*tap\\(\\);\\s*\\}")
        self.assertIn("control.setVisibility(show ? View.VISIBLE : View.GONE)", PUSH)

    def test_workspace_toolbar_retains_navigation_and_account_linking(self):
        self.assertIn("if (!resetWorkspaceHistoryOnLoad && webView.canGoBack()) webView.goBack()", MAIN)
        self.assertIn("home.setOnClickListener(v -> showHome())", MAIN)
        self.assertIn("partnerTestPush.connectAccount()", MAIN)
        self.assertIn("privacy.setOnClickListener(v -> showAccountSettings())", MAIN)


if __name__ == "__main__":
    unittest.main()
