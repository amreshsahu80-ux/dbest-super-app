package com.dbest4u.partner;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
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
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import java.util.function.Supplier;
import javax.net.ssl.HttpsURLConnection;

/**
 * Opt-in partner account-bound Firebase device registration TEST PILOT.
 *
 * Auth headers use existing expiring DBest application sessions; role and
 * account ID are determined SERVER-SIDE, never sent as trusted identity.
 * No service-role secrets or session tokens are persisted or logged here.
 * No transaction notifications sent until separate backend release gates.
 */
final class PartnerAccountBinding {
    private static final String PREFS = "dbest_partner_fcm_account";
    private static final String ENDPOINT =
        "https://ydedmotbacnllkijzmvp.supabase.co/functions/v1/native-fcm-register";

    private final Activity activity;
    private final WebView portal;
    private final Supplier<String> roleProvider;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicBoolean busy = new AtomicBoolean(false);
    private volatile String boundSession; // Never stored in preferences or logged.
    private volatile String boundRole;
    private volatile String boundHeader;

    PartnerAccountBinding(Activity activity, WebView portal, Supplier<String> roleProvider) {
        this.activity = activity;
        this.portal = portal;
        this.roleProvider = roleProvider;
    }

    private SharedPreferences prefs() {
        return activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private void message(String text) {
        activity.runOnUiThread(() -> Toast.makeText(activity, text, Toast.LENGTH_LONG).show());
    }

    private static String normalizedRole(String raw) {
        if (raw == null) return "";
        if (raw.startsWith("Vendor")) return "Vendor";
        if (raw.startsWith("Vaahak")) return "Vaahak";
        if (raw.startsWith("Service Partner")) return "Service Partner";
        return "";
    }

    private static String tokenKey(String role) {
        if ("Vendor".equals(role)) return "dbest_vendor_live_token";
        if ("Vaahak".equals(role)) return "dbest_vaahak_live_token";
        if ("Service Partner".equals(role)) return "dbest_partner_live_token";
        return "";
    }

    private static String header(String role) {
        if ("Vendor".equals(role)) return "x-vendor-token";
        if ("Vaahak".equals(role)) return "x-vaahak-token";
        if ("Service Partner".equals(role)) return "x-dbest-partner-token";
        return "";
    }

    private boolean trustedPage() {
        try {
            Uri u = Uri.parse(portal.getUrl());
            String host = u.getHost();
            return "https".equalsIgnoreCase(u.getScheme()) && u.getPort() == -1 &&
                host != null && ("dbest4u.com".equalsIgnoreCase(host) ||
                "www.dbest4u.com".equalsIgnoreCase(host));
        } catch (Exception ignored) {
            return false;
        }
    }

    // Evaluated only inside the verified DBest WebView origin; role key is
    // a native, fixed allowlist, never interpolated from website HTML.
    private void readSession(String role, Consumer<String> cb) {
        if (!trustedPage()) { cb.accept(""); return; }
        final String key = tokenKey(role);
        if (key.isEmpty()) { cb.accept(""); return; }
        final String js = "(function(){try{return localStorage.getItem('" + key +
            "')||''}catch(e){return ''}})();";
        portal.evaluateJavascript(js, raw -> {
            try {
                Object value = new JSONTokener(raw == null ? "null" : raw).nextValue();
                cb.accept(value instanceof String ? (String) value : "");
            } catch (Exception ignored) { cb.accept(""); }
        });
    }

    private String installationId() {
        String id = prefs().getString("installation_id", "");
        if (!id.isEmpty()) return id;
        id = UUID.randomUUID().toString();
        prefs().edit().putString("installation_id", id).apply();
        return id;
    }

    private static String hash(String raw) {
        try {
            byte[] b = MessageDigest.getInstance("SHA-256")
                .digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder();
            for (byte v : b) out.append(String.format(Locale.ROOT, "%02x", v & 255));
            return out.toString();
        } catch (Exception ignored) { return ""; }
    }

    private boolean request(String action, String role, String session, String fcmToken) {
        HttpsURLConnection connection = null;
        try {
            connection = (HttpsURLConnection) new URL(ENDPOINT).openConnection();
            connection.setConnectTimeout(8000);
            connection.setReadTimeout(8000);
            connection.setRequestMethod("POST");
            connection.setDoOutput(true);
            connection.setRequestProperty("content-type", "application/json");
            connection.setRequestProperty(header(role), session);
            connection.setRequestProperty("cache-control", "no-store");

            JSONObject b = new JSONObject();
            b.put("action", action);
            b.put("appId", activity.getPackageName());
            b.put("installationId", installationId());
            if ("register".equals(action)) {
                b.put("consent", true);
                b.put("permissionStatus", "granted");
                b.put("fcmToken", fcmToken);
            }
            try (OutputStream out = connection.getOutputStream()) {
                out.write(b.toString().getBytes(StandardCharsets.UTF_8));
            }
            int code = connection.getResponseCode();
            InputStream stream = code >= 200 && code < 300 ?
                connection.getInputStream() : connection.getErrorStream();
            StringBuilder reply = new StringBuilder();
            if (stream != null) {
                try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null && reply.length() < 4096)
                        reply.append(line);
                }
            }
            return code >= 200 && code < 300 &&
                new JSONObject(reply.toString()).optBoolean("ok", false);
        } catch (Exception ignored) {
            return false; // Never log session, token or error bodies.
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    void connectWithConsent() {
        final String role = normalizedRole(roleProvider.get());
        if (role.isEmpty() || !trustedPage()) {
            message("Open your DBest Vendor, Vaahak or Service Partner workspace first.");
            return;
        }
        if (busy.get()) { message("Account registration already in progress."); return; }
        if (prefs().getBoolean("bound", false) &&
            !role.equals(prefs().getString("bound_role", ""))) {
            message("Turn Partner alerts OFF and ON again before linking a different role.");
            return;
        }
        new AlertDialog.Builder(activity)
            .setTitle("Connect " + role + " notifications?")
            .setMessage("Register this phone to the " + role + " account signed in here. This is a test pilot; real orders and rides do not send notifications yet.")
            .setPositiveButton("Connect this device", (dialog, which) ->
                readSession(role, session -> {
                    if (session.isEmpty()) {
                        message("Sign in to your " + role + " workspace first.");
                        return;
                    }
                    if (!busy.compareAndSet(false, true)) return;
                    FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
                        if (!task.isSuccessful() || task.getResult() == null) {
                            busy.set(false);
                            message("Firebase token unavailable. Retry from this workspace.");
                            return;
                        }
                        final String fcm = task.getResult();
                        worker.execute(() -> {
                            try {
                                boolean ok = request("register", role, session, fcm);
                                if (ok) {
                                    boundRole = role;
                                    boundHeader = header(role);
                                    boundSession = session;
                                    prefs().edit().putBoolean("bound", true)
                                        .putString("bound_role", role)
                                        .putString("bound_session_hash", hash(session)).apply();
                                }
                                message(ok ? role + " device account linked (pilot)." :
                                    "Server registration failed. Check your partner login and retry.");
                            } finally { busy.set(false); }
                        });
                    });
                }))
            .setNegativeButton("Cancel", null)
            .show();
    }

    boolean isBoundToDifferentRole(String selected) {
        String active = prefs().getString("bound_role", "");
        return prefs().getBoolean("bound", false) &&
            !active.equals(normalizedRole(selected));
    }

    void revokeAndThen(Runnable done) {
        if (!prefs().getBoolean("bound", false)) { activity.runOnUiThread(done); return; }
        String role = prefs().getString("bound_role", "");
        String remembered = boundSession;
        Consumer<String> revoke = session -> worker.execute(() -> {
            boolean ok = !session.isEmpty() && request("unregister", role, session, null);
            boundSession = null;
            boundRole = null;
            boundHeader = null;
            prefs().edit().putBoolean("bound", false)
                .remove("bound_role").remove("bound_session_hash").apply();
            activity.runOnUiThread(done);
            if (!ok) message("Session may have expired. Firebase token deletion still protects this phone.");
        });
        if (remembered != null && !remembered.isEmpty()) revoke.accept(remembered);
        else readSession(role, revoke);
    }

    // Detect logout/account replacement when a trusted portal page finishes
    // loading. Background token invalidation after app termination requires
    // further QA before production sender is enabled.
    void onPortalPageLoaded(Runnable disableOnAccountChanged) {
        if (!prefs().getBoolean("bound", false) || !trustedPage()) return;
        String role = prefs().getString("bound_role", "");
        String expectedHash = prefs().getString("bound_session_hash", "");
        readSession(role, session -> {
            if (!prefs().getBoolean("bound", false)) return;
            if (session.isEmpty() || !hash(session).equals(expectedHash)) {
                message("Partner account changed; disabling this device's test notifications.");
                disableOnAccountChanged.run();
            }
        });
    }

    void shutdown() { worker.shutdown(); }
}
