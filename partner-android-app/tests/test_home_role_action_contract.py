"""Source contract for Partner Home role actions and native workspace controls.

Run: python3 -m unittest partner-android-app/tests/test_home_role_action_contract.py
Static regression only; device accessibility and signed AAB require separate validation.
"""
from pathlib import Path
import re
import unittest

SOURCE = (Path(__file__).resolve().parents[1] /
          "app/src/main/java/com/dbest4u/partner/MainActivity.java").read_text(encoding="utf-8")


class PartnerHomeActionContract(unittest.TestCase):
    def test_three_distinct_role_destinations(self):
        expected = (
            ("Vendor", "/Vendor", "/partner?type=Vendor"),
            ("Vaahak", "/vaahak", "/partner?type=Vaahak"),
            ("Service Partner", "/ServicePartnerDashboard",
             "/partner?type=Service%20Partner"),
        )
        home = SOURCE.split("private View roleCard(", 1)[0]
        for role, workspace, join in expected:
            with self.subTest(role=role):
                pattern = (r'roleCard\(\s*"' + re.escape(role) +
                           r'".*?"' + re.escape(workspace) +
                           r'",\s*"' + re.escape(join) + r'"\)')
                self.assertRegex(home, re.compile(pattern, re.S))
        self.assertEqual(home.count("page.addView(roleCard("), 3)

    def test_workspace_and_join_are_separate_actions(self):
        card = SOURCE.split("private View roleCard(", 1)[1].split(
            "private LinearLayout makeBrowser(", 1)[0]
        self.assertIn('workspace.setOnClickListener(v -> openPortal(title, loginPath))', card)
        self.assertIn('join.setOnClickListener(v -> openPortal(title + " · Join", joinPath))', card)
        self.assertIn('card.setOnClickListener(v -> openPortal(title, loginPath))', card)
        self.assertIn('workspace.setContentDescription("Open " + title + " workspace")', card)
        self.assertIn('join.setContentDescription("Join as " + title)', card)
        self.assertRegex(card, r'actions.addView\(workspace, new LinearLayout.LayoutParams\(0, dp\(48\),')
        self.assertRegex(card, r'actions.addView\(join, new LinearLayout.LayoutParams\(0, dp\(48\),')

    def test_native_workspace_controls_remain_accessible(self):
        toolbar = SOURCE.split("private LinearLayout makeBrowser(", 1)[1].split(
            "bar.addView(privacy", 1)[0]
        for label in ("Back", "Partner home", "Partner notification on/off settings"):
            self.assertIn('setContentDescription("' + label + '")', toolbar)
        self.assertIn("partnerTestPush.openSettings()", toolbar)
        self.assertIn("home.setOnClickListener(v -> showHome())", toolbar)


if __name__ == "__main__":
    unittest.main()
