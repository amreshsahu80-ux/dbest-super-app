#!/usr/bin/env python3
"""Prevent notification intents from bypassing consent or opening arbitrary Partner URLs."""
from pathlib import Path

source = (Path(__file__).resolve().parents[1] /
          "app/src/main/java/com/dbest4u/partner/MainActivity.java").read_text()
target = source.split("private void openTrustedPushTarget(Intent intent) {", 1)[1].split(
    "@Override protected void onNewIntent(", 1)[0]
new_intent = source.split("@Override protected void onNewIntent(Intent intent) {", 1)[1].split(
    "@Override public void onRequestPermissionsResult(", 1)[0]

assert 'intent.getStringExtra("dbest.notification.role")' in target
assert 'getSharedPreferences("dbest_partner_native_push", MODE_PRIVATE)' in target
assert 'getBoolean("enabled", false)' in target
assert 'getSharedPreferences("dbest_partner_fcm_account", MODE_PRIVATE)' in target
assert 'account.getBoolean("bound", false)' in target
assert 'role.equals(account.getString("bound_role", ""))' in target
assert 'if (!enabled || !account.getBoolean("bound", false)' in target
assert 'if ("Vendor".equals(role)) openPortal("Vendor", "/Vendor");' in target
assert 'else if ("Vaahak".equals(role)) openPortal("Vaahak", "/vaahak");' in target
assert 'else if ("Service Partner".equals(role))' in target
assert 'openPortal("Service Partner", "/ServicePartnerDashboard");' in target
assert 'intent.getStringExtra("url")' not in target
assert 'openPortal(role,' not in target
assert 'openTrustedPushTarget(intent);' in new_intent
print("PASS: notification intents require opt-in, bound account, matching role and fixed routes")
