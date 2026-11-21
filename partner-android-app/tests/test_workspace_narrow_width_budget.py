"""Guard compact Partner workspace toolbar against 320dp-width overflow.

Run: python3 partner-android-app/tests/test_workspace_narrow_width_budget.py
This is a source-level geometry regression, not a substitute for emulator/TalkBack QA.
"""
from pathlib import Path
import re
import unittest

MAIN = (Path(__file__).resolve().parents[1] /
        "app/src/main/java/com/dbest4u/partner/MainActivity.java").read_text(encoding="utf-8")


class NarrowWorkspaceToolbarBudget(unittest.TestCase):
    def test_320dp_screen_retains_title_space(self):
        toolbar = MAIN.split("private LinearLayout makeBrowser()", 1)[1].split(
            "webView = new WebView", 1)[0]
        # Explicitly account for every fixed-width child, spacer and horizontal padding.
        fixed = [
            int(width) for width in re.findall(
                r"bar\.addView\(\w+, new LinearLayout\.LayoutParams\(dp\((\d+)\), dp\(48\)\)\)",
                toolbar)
        ]
        spacers = [
            int(width) for width in re.findall(r"spaceWidth\(bar, dp\((\d+)\)\)", toolbar)
        ]
        padding = re.search(r"bar\.setPadding\(dp\((\d+)\), dp\(\d+\), dp\((\d+)\), dp\(\d+\)\)", toolbar)
        self.assertIsNotNone(padding)
        self.assertEqual(sorted(fixed), [48, 48, 48, 48, 52])
        self.assertIn("bar.addView(browserTitle, new LinearLayout.LayoutParams(0, dp(48), 1))", toolbar)
        remaining = 320 - sum(fixed) - sum(spacers) - sum(map(int, padding.groups()))
        self.assertGreaterEqual(remaining, 48, f"Toolbar title squeezed to {remaining}dp at 320dp width")

    def test_workspace_overlay_is_hidden_to_protect_whatsapp(self):
        self.assertIn("partnerTestPush.setHomeVisible(false)", MAIN)
        self.assertIn("partnerTestPush.setHomeVisible(true)", MAIN)
        self.assertIn('notifications.setContentDescription("Partner notification on/off settings")', MAIN)


if __name__ == "__main__":
    unittest.main()
