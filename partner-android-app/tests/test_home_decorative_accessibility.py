#!/usr/bin/env python3
"""Keep compact Partner Home cards readable and avoid redundant TalkBack stops."""
from pathlib import Path

source = (Path(__file__).resolve().parents[1] /
          "app/src/main/java/com/dbest4u/partner/MainActivity.java").read_text()
card = source.split("private View roleCard(", 1)[1].split("private LinearLayout makeBrowser()", 1)[0]

checks = {
    "decorative image container": "photoFrame.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);",
    "decorative image": "image.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);",
    "decorative status badge": "ready.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);",
    "role title wraps at large font sizes": "roleTitle.setMaxLines(2);",
    "role title announced as heading": "ViewCompat.setAccessibilityHeading(roleTitle, true);",
    "badge width bounded on narrow devices": "ready.setMaxWidth(dp(100));",
    "card has distinct workspace description": 'card.setContentDescription(title + " partner card. Open workspace");',
    "workspace button has explicit role description": 'workspace.setContentDescription("Open " + title + " workspace");',
    "join button has explicit role description": 'join.setContentDescription("Join as " + title);',
    "card preview stays compact": "card.addView(photoFrame, new LinearLayout.LayoutParams(-1, dp(56)));",
}
for label, expected in checks.items():
    assert expected in card, f"Missing Partner Home accessibility safeguard: {label}"
assert card.count("setOnClickListener") >= 3, "Card, workspace and Join must remain independently actionable"
print("PASS: compact cards, narrow-screen titles and nonredundant TalkBack focus")
