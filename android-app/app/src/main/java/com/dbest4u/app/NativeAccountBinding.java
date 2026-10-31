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
    private static final String SESSION_SCRIPT =
        "(function(){try{return localStorage.getItem('dbest_member_live_token')||''}catch(e){return ''}})();";
    private final Activity activity;
    private final WebView webView;
    private final ExecutorService requests = Executors.newSingleThreadExecutor();
    private String sessionInMemory;

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
        if (!trustedPage()) { cb.accept(""); return; }
        webView.evaluateJavascript(SESSION_SCRIPT, raw -> {
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
            .setPositiveButton("Connect this device", (dialog, which) -> readSession(session -> {
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

    void revokeAndThen(Runnable done) {
        final boolean bound = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getBoolean("bound", false);
        if (!bound) { done.run(); return; }
        final String remembered = sessionInMemory;
        java.util.function.Consumer<String> revoke = current -> {
            final String session = remembered != null && !remembered.isEmpty() ? remembered : current;
            requests.execute(() -> {
                final boolean revoked = !session.isEmpty() && request("unregister", session, null);
                // Token deletion by the caller invalidates the FCM token even
                // if DBest's session has already expired before revocation.
                sessionInMemory = null;
                activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .edit().putBoolean("bound", false).remove("session_hash").apply();
                activity.runOnUiThread(done);
                if (!revoked) ui("DBest session no longer available; Firebase token deletion protects this phone.");
            });
        };
        if (remembered != null) revoke.accept(remembered);
        else readSession(revoke);
    }

    // Detect account switch/logout while this process is open. A full
    // background logout contract is still a release gate.
    void onTrustedPageLoaded() {
        if (sessionInMemory == null || !trustedPage()) return;
        final String boundSession = sessionInMemory;
        readSession(current -> {
            if (sessionInMemory == null || !boundSession.equals(sessionInMemory)) return;
            if (!boundSession.equals(current)) {
                revokeAndThen(() -> FirebaseMessaging.getInstance().deleteToken());
                ui("DBest account changed: notification token revoked on this phone.");
            }
        });
    }

    void shutdown() { requests.shutdown(); }
}
