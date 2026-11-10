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
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.Space;
import android.graphics.drawable.GradientDrawable;
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
    private final Button whatsappProxy;
    private final LinearLayout dock;
    private final boolean firebaseReady;
    private final NativeAccountBinding accountBinding;
    private final Handler sessionHandler = new Handler(Looper.getMainLooper());
    private boolean sessionMonitorRunning = false;
    private boolean autoRevocationRunning = false;
    private long lastRevocationAttemptMs = -1L;
    private static final long MIN_REVOCATION_RETRY_MS = 15000L;
    private final Runnable sessionMonitor = new Runnable() {
        @Override public void run() {
            if (!sessionMonitorRunning) return;
            if (accountBinding != null && accountBinding.hasAccountBinding())
                accountBinding.checkAccountContinuity(() -> revokeForSessionChange());
            if (isTrustedHome()) refreshWhatsAppProxy();
            sessionHandler.postDelayed(this, 1500L);
        }
    };

    public NativePushController(Activity activity, FrameLayout root, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        firebaseReady = initializeFirebase();
        accountBinding = new NativeAccountBinding(activity, webView);
        // A dedicated QA control dock reserves space BELOW the WebView.
        // This avoids covering service tiles, footer links or the D-U-N-S seal.
        dock = new LinearLayout(activity);
        dock.setOrientation(LinearLayout.HORIZONTAL);
        dock.setGravity(Gravity.CENTER_VERTICAL);
        dock.setPadding(dp(12), 0, dp(12), 0);
        GradientDrawable dockBg = new GradientDrawable();
        dockBg.setColor(0xFFF6F8FC);
        dockBg.setStroke(dp(1), 0xFFE0E7F1);
        dock.setBackground(dockBg);
        FrameLayout.LayoutParams dockLp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, dp(64), Gravity.BOTTOM);
        root.addView(dock, dockLp);
        dock.setVisibility(View.GONE);

        button = new Button(activity);
        button.setAllCaps(false);
        button.setTextSize(21);
        button.setMinWidth(dp(48));
        button.setMinimumWidth(dp(48));
        button.setPadding(0, 0, 0, 0);
        button.setTextColor(Color.WHITE);
        button.setBackgroundTintList(ColorStateList.valueOf(0xFF526079));
        dock.addView(button, new LinearLayout.LayoutParams(dp(48), dp(48)));
        button.setOnClickListener(v -> onTap());

        // Native Android-only proxy activates the EXISTING website's
        // WhatsApp opt-in/opt-out button. No new backend operation or token.
        Space gap = new Space(activity);
        dock.addView(gap, new LinearLayout.LayoutParams(0, dp(1), 1.0f));
        whatsappProxy = new Button(activity);
        whatsappProxy.setText("WA");
        whatsappProxy.setAllCaps(false);
        whatsappProxy.setTextSize(13);
        whatsappProxy.setTextColor(Color.WHITE);
        whatsappProxy.setPadding(0, 0, 0, 0);
        whatsappProxy.setBackgroundTintList(ColorStateList.valueOf(0xFF128C7E));
        whatsappProxy.setContentDescription("DBest WhatsApp notification preferences");
        dock.addView(whatsappProxy, new LinearLayout.LayoutParams(dp(48), dp(48)));
        whatsappProxy.setVisibility(View.INVISIBLE);
        whatsappProxy.setOnClickListener(v -> {
            if (!isTrustedHome()) return;
            webView.evaluateJavascript(
                "(function(){var w=document.getElementById('dbestWhatsAppEnable');"
                + "if(w)w.click();})()", null);
        });
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
        button.setText(enabled ? "🔔" : "🔕");
        button.setContentDescription(enabled
                ? "DBest test notifications ON. Double tap for notification options."
                : "DBest test notifications OFF. Double tap to enable testing.");
        button.setTooltipText(enabled ? "Notifications ON (QA)" : "Notifications OFF (QA)");
        button.setBackgroundTintList(ColorStateList.valueOf(enabled ? 0xFF18784B : 0xFF465B78));
    }

    private void onTap() {
        if (!firebaseReady) {
            Toast.makeText(activity, "Firebase test setup unavailable.", Toast.LENGTH_LONG).show();
            return;
        }
        if (isEnabled()) {
            new AlertDialog.Builder(activity)
                .setTitle("DBest Firebase pilot — test ON")
                // AlertDialog cannot display both a message and a list; a message hides all action rows.
                .setItems(new String[]{
                    "Connect to my signed-in DBest member account (pilot)",
                    "Copy Firebase test token",
                    "Turn notifications OFF"
                }, (dialog, which) -> {
                    if (which == 0) accountBinding.connectWithConsent();
                    else if (which == 1) showToken();
                    else if (which == 2) disable();
                }).setNegativeButton("Close", null).show();
            return;
        }
        new AlertDialog.Builder(activity)
            .setTitle("Enable test notifications?")
            .setMessage("Enable Firebase test notifications on this phone? This does not register your device with the live DBest server.")
            .setPositiveButton("Enable test mode", (d,w) -> requestOrEnable())
            .setNegativeButton("Cancel", null).show();
    }

    private void requestOrEnable() {
        if (accountBinding.hasAccountBinding() && !isEnabled()) {
            Toast.makeText(activity, "Prior account notification revocation is pending. Keep this QA app open.", Toast.LENGTH_LONG).show();
            return;
        }
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
        accountBinding.revokeAndThen(() -> FirebaseMessaging.getInstance()
            .deleteToken().addOnCompleteListener(task -> {
                String message = !task.isSuccessful()
                    ? "Alerts OFF locally. Token deletion requires retry."
                    : accountBinding.hasAccountBinding()
                        ? "Test alerts OFF locally; server revocation pending."
                        : "Test alerts OFF; Firebase token deleted.";
                Toast.makeText(activity, message, Toast.LENGTH_LONG).show();
            }));
    }

    private boolean isTrustedHome() {
        try {
            android.net.Uri uri = android.net.Uri.parse(String.valueOf(webView.getUrl()));
            return "https".equalsIgnoreCase(uri.getScheme())
                    && ("dbest4u.com".equalsIgnoreCase(uri.getHost())
                        || "www.dbest4u.com".equalsIgnoreCase(uri.getHost()))
                    && (uri.getPath() == null || "/".equals(uri.getPath()));
        } catch (Exception ignored) { return false; }
    }

    private void refreshWhatsAppProxy() {
        if (!isTrustedHome()) return;
        webView.evaluateJavascript(
            "(function(){var b=document.getElementById('dbestWhatsAppEnable');"
            + "return b ? (String(b.textContent||'').includes('ON')?'on':'off') : 'none';})()",
            raw -> {
                if (!isTrustedHome()) return;
                boolean exists = "\"on\"".equals(raw) || "\"off\"".equals(raw);
                whatsappProxy.setVisibility(exists ? View.VISIBLE : View.INVISIBLE);
                if (exists) {
                    boolean waOn = "\"on\"".equals(raw);
                    whatsappProxy.setContentDescription(waOn
                        ? "DBest WhatsApp alerts ON. Open preferences."
                        : "DBest WhatsApp alerts OFF. Open preferences.");
                    whatsappProxy.setBackgroundTintList(ColorStateList.valueOf(
                        waOn ? 0xFF128C7E : 0xFF25D366));
                }
            });
    }

    public void refreshVisibility() {
        boolean home = isTrustedHome();
        dock.setVisibility(home ? View.VISIBLE : View.GONE);
        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) webView.getLayoutParams();
        int margin = home ? dp(64) : 0;
        if (lp.bottomMargin != margin) {
            lp.bottomMargin = margin;
            webView.setLayoutParams(lp);
        }
        if (home) {
            webView.evaluateJavascript("document.body.classList.add('dbestNativeDock')", null);
            refreshWhatsAppProxy();
            accountBinding.checkAccountContinuity(() -> revokeForSessionChange());
        } else {
            whatsappProxy.setVisibility(View.INVISIBLE);
        }
        updateButton();
    }

    // The website's logout() changes localStorage without a WebView
    // page-load event. Monitor the signed-in member state only while the
    // QA app is in the foreground and an account-bound device exists.
    public void startSessionMonitor() {
        if (sessionMonitorRunning) return;
        sessionMonitorRunning = true;
        sessionHandler.postDelayed(sessionMonitor, 250L);
    }

    public void stopSessionMonitor() {
        sessionMonitorRunning = false;
        sessionHandler.removeCallbacks(sessionMonitor);
    }

    private void revokeForSessionChange() {
        if (!accountBinding.hasAccountBinding() || autoRevocationRunning) return;
        long now = SystemClock.elapsedRealtime();
        if (lastRevocationAttemptMs >= 0L
                && now - lastRevocationAttemptMs < MIN_REVOCATION_RETRY_MS) return;
        lastRevocationAttemptMs = now;
        autoRevocationRunning = true;
        activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putBoolean("enabled", false).apply();
        updateButton();
        FirebaseMessaging.getInstance().setAutoInitEnabled(false);
        accountBinding.revokeAndThen(() -> {
            autoRevocationRunning = false;
            FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener(task -> {
                String message = !task.isSuccessful()
                        ? "Account changed: alerts OFF. Firebase token deletion needs retry."
                        : accountBinding.hasAccountBinding()
                            ? "Account changed: alerts OFF; server revocation pending."
                            : "Account changed: alerts OFF and device registration revoked.";
                Toast.makeText(activity, message, Toast.LENGTH_LONG).show();
            });
        });
    }

    public void shutdown() {
        stopSessionMonitor();
        accountBinding.shutdown();
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
