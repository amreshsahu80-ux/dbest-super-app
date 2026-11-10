package com.dbest4u.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.net.Uri;
import android.webkit.WebView;
import android.widget.Toast;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONObject;
import org.json.JSONTokener;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;

/**
 * Opt-in, DBest MEMBER account-bound FCM registration pilot.
 * Only the Android app makes the server request. No service-role key is embedded.
 * No app-session token is written to disk or Android logs.
 *
 * IMPORTANT: This pilot intentionally does not yet establish a background
 * logout/revocation guarantee. Do not enable production FCM sending until
 * that separate release gate is tested.
 */
final class NativeAccountBinding {
    private static final String PREFS = "dbest_native_fcm_account";
    private static final String ENDPOINT =
        "https://ydedmotbacnllkijzmvp.supabase.co/functions/v1/native-fcm-register";
    // Used ONLY for revocation of a previously bound device. The prior token
    // may persist after SPA logout, so this is NOT a valid sign-in check.
    private static final String SESSION_SCRIPT =
        "(function(){try{return localStorage.getItem('dbest_member_live_token')||''}catch(e){return ''}})();";
    // Atomically check that the user is actively signed in before exposing a
    // session to native registration or cross-account continuity logic.
    // Combining both reads in one WebView execution avoids an account-switch
    // race between separate JavaScript evaluations.
    private static final String ACTIVE_SESSION_SCRIPT =
        "(function(){try{var s=JSON.parse(localStorage.getItem('d2_session')||'{}');"
        + "var active=!!(s&&s.id&&['starter','guest','promoter','prime','leader']."
        + "includes(String(s.role||'').toLowerCase()));"
        + "return active?(localStorage.getItem('dbest_member_live_token')||''):'';"
        + "}catch(e){return ''}})()";
    private final Activity activity;
    private final WebView webView;
    private final ExecutorService requests = Executors.newSingleThreadExecutor();
    private volatile String sessionInMemory;

    NativeAccountBinding(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    private void ui(String message) {
        activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_LONG).show());
    }

    private boolean trustedPage() {
        try {
            Uri u = Uri.parse(webView.getUrl());
            return "https".equalsIgnoreCase(u.getScheme()) &&
                ("dbest4u.com".equalsIgnoreCase(u.getHost()) ||
                 "www.dbest4u.com".equalsIgnoreCase(u.getHost())) &&
                u.getPort() == -1;
        } catch (Exception e) { return false; }
    }

    private void readSession(java.util.function.Consumer<String> cb) {
        readSessionScript(SESSION_SCRIPT, cb);
    }

    private void readActiveSession(java.util.function.Consumer<String> cb) {
        readSessionScript(ACTIVE_SESSION_SCRIPT, cb);
    }

    private void readSessionScript(String script, java.util.function.Consumer<String> cb) {
        if (!trustedPage()) { cb.accept(""); return; }
        webView.evaluateJavascript(script, raw -> {
            try {
                Object value = new JSONTokener(raw == null ? "null" : raw).nextValue();
                cb.accept(value instanceof String ? (String) value : "");
            } catch (Exception e) { cb.accept(""); }
        });
    }

    private String installationId() {
        android.content.SharedPreferences p = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String existing = p.getString("installation_id", "");
        if (!existing.isEmpty()) return existing;
        String newId = UUID.randomUUID().toString();
        p.edit().putString("installation_id", newId).apply();
        return newId;
    }

    private String fingerprint(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) sb.append(String.format(java.util.Locale.ROOT, "%02x", b & 255));
            return sb.toString();
        } catch (Exception e) { return ""; }
    }

    private boolean request(String action, String session, String fcmToken) {
        HttpsURLConnection connection = null;
        try {
            URL url = new URL(ENDPOINT);
            connection = (HttpsURLConnection) url.openConnection();
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(8000);
            connection.setRequestMethod("POST");
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("x-dbest-member-token", session);
            connection.setRequestProperty("Cache-Control", "no-store");
            JSONObject b = new JSONObject();
            b.put("action", action);
            b.put("appId", activity.getPackageName());
            b.put("installationId", installationId());
            if ("register".equals(action)) {
                b.put("consent", true);
                b.put("permissionStatus", "granted");
                b.put("fcmToken", fcmToken);
            }
            try (OutputStream o = connection.getOutputStream()) {
                o.write(b.toString().getBytes(StandardCharsets.UTF_8));
            }
            int code = connection.getResponseCode();
            InputStream input = code >= 200 && code < 300 ?
                connection.getInputStream() : connection.getErrorStream();
            StringBuilder response = new StringBuilder();
            if (input != null) {
                try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(input, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null && response.length() < 4096) response.append(line);
                }
            }
            return code >= 200 && code < 300 && new JSONObject(response.toString()).optBoolean("ok");
        } catch (Exception ignored) {
            // Deliberately avoid printing session or device tokens.
            return false;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    void connectWithConsent() {
        if (!trustedPage()) { ui("Open the DBest website inside this app first."); return; }
        new AlertDialog.Builder(activity)
            .setTitle("Connect DBest account notifications?")
            .setMessage("Register this device only to the member account currently signed in. This pilot does not send real orders yet. You can turn alerts OFF to revoke it.")
            .setPositiveButton("Connect this device", (dialog, which) -> readActiveSession(session -> {
                if (session.isEmpty()) {
                    ui("Please sign in to your DBest member account first.");
                    return;
                }
                FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                    if (!task.isSuccessful() || task.getResult() == null) {
                        ui("Firebase token unavailable. Try again.");
                        return;
                    }
                    final String fcm = task.getResult();
                    final String hash = fingerprint(session);
                    requests.execute(() -> {
                        boolean ok = request("register", session, fcm);
                        if (ok) {
                            sessionInMemory = session;
                            activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                                .edit().putBoolean("bound", true).putString("session_hash", hash).apply();
                        }
                        ui(ok ? "This device is linked to your DBest member account (pilot)." :
                            "Account registration failed. Check login and retry.");
                    });
                });
            }))
            .setNegativeButton("Cancel", null)
            .show();
    }

    boolean hasAccountBinding() {
        return activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getBoolean("bound", false);
    }

    // Called by the Android foreground monitor, not the DBest website.
    // It also detects in-page logout and account switching without reloading.
    void checkAccountContinuity(Runnable onMismatch) {
        if (!hasAccountBinding() || !trustedPage()) return;
        readActiveSession(current -> {
            if (!hasAccountBinding()) return;
            String boundHash = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString("session_hash", "");
            if (current.isEmpty() || boundHash.isEmpty()
                    || !boundHash.equals(fingerprint(current))) onMismatch.run();
        });
    }

    void revokeAndThen(Runnable done) {
        final boolean bound = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean("bound", false);
        if (!bound) { done.run(); return; }
        final String remembered = sessionInMemory;
        final String boundHash = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString("session_hash", "");
        java.util.function.Consumer<String> revoke = current -> {
            // Never authorize a prior member's revocation using a different
            // account's current session after logout, restart or account switch.
            final String session = remembered != null && !remembered.isEmpty()
                    && boundHash.equals(fingerprint(remembered)) ? remembered
                    : current != null && !current.isEmpty()
                    && boundHash.equals(fingerprint(current)) ? current : "";
            requests.execute(() -> {
                final boolean revoked = !session.isEmpty() && request("unregister", session, null);
                // Always delete the FCM token locally (caller). Do not claim
                // backend revocation if the unregister request failed.
                // Retain in-memory authorization and pending binding state so
                // the QA foreground monitor can retry without false success.
                if (revoked) {
                    sessionInMemory = null;
                    activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                        .edit().putBoolean("bound", false).remove("session_hash").apply();
                } else {
                    ui("Test alerts OFF locally; server revocation pending. Keep QA app open.");
                }
                activity.runOnUiThread(done);
            });
        };
        if (remembered != null) revoke.accept(remembered);
        else readSession(revoke);
    }

    void shutdown() { requests.shutdown(); }
}
