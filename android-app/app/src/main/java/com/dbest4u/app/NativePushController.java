package com.dbest4u.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

/**
 * TEST-ONLY native Firebase device delivery smoke test.
 * Never claim production notifications are ON: authenticated server-side
 * registration, sender credentials and delivery QA remain release gates.
 */
public final class NativePushController {
    public static final int PERMISSION_REQUEST = 1088;
    private static final String PREFS = "dbest_native_push";
    private final Activity activity;
    private final WebView webView;
    private final Button button;
    private final boolean firebaseReady;

    public NativePushController(Activity activity, FrameLayout root, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        firebaseReady = initializeFirebase();
        button = new Button(activity);
        button.setAllCaps(false);
        button.setTextSize(12);
        button.setTextColor(Color.WHITE);
        button.setBackgroundTintList(ColorStateList.valueOf(0xFF526079));
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, dp(48), Gravity.BOTTOM | Gravity.START);
        lp.setMargins(dp(12), 0, dp(12), dp(14));
        root.addView(button, lp);
        // This button is purposefully visible only on DBest's member home.
        button.setVisibility(View.GONE);
        button.setOnClickListener(v -> onTap());
        updateButton();
    }

    private boolean isEnabled() {
        return activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean("enabled", false);
    }

    private boolean permissionGranted() {
        return Build.VERSION.SDK_INT < 33 ||
                ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS)
                        == PackageManager.PERMISSION_GRANTED;
    }

    private void updateButton() {
        boolean enabled=isEnabled() && permissionGranted();
        button.setText(enabled ? "🔔 Test alerts ON" : "🔕 Test alerts OFF");
        button.setBackgroundTintList(ColorStateList.valueOf(enabled ? 0xFF18784B : 0xFF465B78));
    }

    private void onTap() {
        if (!firebaseReady) {
            Toast.makeText(activity, "Firebase test setup unavailable.", Toast.LENGTH_LONG).show();
            return;
        }
        if (isEnabled()) {
            new AlertDialog.Builder(activity)
                .setTitle("DBest test notifications")
                .setMessage("Device-only testing. These are NOT connected to DBest's live notification service.")
                .setPositiveButton("Copy test device token", (d,w) -> showToken())
                .setNeutralButton("Turn test alerts OFF", (d,w) -> disable())
                .setNegativeButton("Cancel", null).show();
            return;
        }
        new AlertDialog.Builder(activity)
            .setTitle("Enable test notifications?")
            .setMessage("Enable Firebase test notifications on this phone? This does not register your device with the live DBest server.")
            .setPositiveButton("Enable test mode", (d,w) -> requestOrEnable())
            .setNegativeButton("Cancel", null).show();
    }

    private void requestOrEnable() {
        if (!permissionGranted() && Build.VERSION.SDK_INT >= 33) {
            ActivityCompat.requestPermissions(activity,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSION_REQUEST);
        } else enable();
    }

    public void onPermissionResult(boolean granted) {
        if (granted) enable();
        else {
            Toast.makeText(activity, "Notification permission denied. Test alerts remain OFF.", Toast.LENGTH_LONG).show();
            updateButton();
        }
    }

    private void enable() {
        if (!permissionGranted() || !firebaseReady) { updateButton(); return; }
        // Do not turn the local switch ON until Firebase confirms a device token.
        FirebaseMessaging.getInstance().setAutoInitEnabled(true);
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (task.isSuccessful() && task.getResult()!=null && !task.getResult().isEmpty()) {
                activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                        .edit().putBoolean("enabled", true).apply();
                updateButton();
                new AlertDialog.Builder(activity)
                    .setTitle("Device test ready")
                    .setMessage("FCM token generated. Copy it into Firebase Console's 'Send test message' dialog to verify this phone. Do NOT share the token publicly.")
                    .setPositiveButton("Copy token", (d,w) -> copyToken(task.getResult()))
                    .setNegativeButton("Close", null).show();
            } else {
                FirebaseMessaging.getInstance().setAutoInitEnabled(false);
                Toast.makeText(activity, "Could not get a Firebase test token. Try again.", Toast.LENGTH_LONG).show();
                updateButton();
            }
        });
    }

    private void showToken() {
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (task.isSuccessful() && task.getResult()!=null) copyToken(task.getResult());
            else Toast.makeText(activity, "Token unavailable. Test notifications are not ready.", Toast.LENGTH_LONG).show();
        });
    }

    private void copyToken(String token) {
        ClipboardManager cb=(ClipboardManager) activity.getSystemService(Context.CLIPBOARD_SERVICE);
        cb.setPrimaryClip(ClipData.newPlainText("DBest FCM test token",token));
        Toast.makeText(activity, "Test token copied. Paste only into Firebase Console.", Toast.LENGTH_LONG).show();
    }

    private void disable() {
        activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putBoolean("enabled", false).apply();
        updateButton();
        FirebaseMessaging.getInstance().setAutoInitEnabled(false);
        FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener(task -> {
            Toast.makeText(activity, task.isSuccessful()
                    ? "Device test alerts OFF; Firebase test token deleted."
                    : "Alerts OFF locally. Token deletion requires retry.",
                    Toast.LENGTH_LONG).show();
        });
    }

    public void refreshVisibility() {
        if (webView == null || webView.getUrl()==null || !webView.getUrl().startsWith("https://dbest4u.com/")) {
            button.setVisibility(View.GONE);
            return;
        }
        String js="(function(){try{var t=localStorage.getItem('dbest_member_live_token');"+
                "var open=document.body.classList.contains('sectionOpen')||"+
                "!!document.getElementById('m')?.querySelector('.sectionOverlay,.overlay');"+
                "return !!t&&!open&&location.pathname==='/';}catch(e){return false}})()";
        webView.evaluateJavascript(js, result -> {
            button.setVisibility("true".equals(result) ? View.VISIBLE : View.GONE);
            updateButton();
        });
    }

    private boolean initializeFirebase() {
        try {
            if (FirebaseApp.getApps(activity).isEmpty()) FirebaseApp.initializeApp(activity);
            return !FirebaseApp.getApps(activity).isEmpty();
        } catch(Exception ignored) { return false; }
    }

    private int dp(int v) {
        return Math.round(v*activity.getResources().getDisplayMetrics().density);
    }
}
