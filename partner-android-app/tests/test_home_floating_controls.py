"""Static contract: native notification floater must not cover WhatsApp or home footer."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
HOME = (ROOT / "app/src/main/java/com/dbest4u/partner/MainActivity.java").read_text()
PUSH = (ROOT / "app/src/main/java/com/dbest4u/partner/PartnerPushTestController.java").read_text()

def test_floater_is_left_and_keeps_48dp_touch_target():
    assert "Gravity.BOTTOM|Gravity.LEFT" in PUSH
    assert "FrameLayout.LayoutParams.WRAP_CONTENT,dp(48)" in PUSH
    assert "lp.setMargins(dp(12),0,dp(12),dp(12))" in PUSH

def test_notification_only_overlays_native_home():
    assert "control.setVisibility(show ? View.VISIBLE : View.GONE)" in PUSH
    assert "partnerTestPush.setHomeVisible(false)" in HOME
    assert "partnerTestPush.setHomeVisible(true)" in HOME

def test_home_footer_has_clearance_for_notification():
    match = re.search(r"page\.setPadding\(dp\(16\), dp\(8\), dp\(16\), dp\((\d+)\)\)", HOME)
    assert match and int(match.group(1)) >= 72

def test_notifications_are_explicitly_opt_in():
    assert 'getBoolean("enabled",false)' in PUSH
    assert "connectWithConsent()" in PUSH
    assert "Turn OFF and unlink" in PUSH
