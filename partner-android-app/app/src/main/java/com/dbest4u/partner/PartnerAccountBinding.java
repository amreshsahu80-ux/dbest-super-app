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
 * Opt-in partner account-bound Firebase device registration canary candidate.
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
    private int consecutiveSessionMismatches = 0;
    private static final int REQUIRED_MISMATCH_READS = 2;

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

    private JSONObject requestJson(String action, String role, String session, String fcmToken) {
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
            return code >= 200 && code < 300 ? new JSONObject(reply.toString()) : null;
        } catch (Exception ignored) {
            return null; // Never log session, token or error bodies.
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private boolean request(String action, String role, String session, String fcmToken) {
        JSONObject result = requestJson(action, role, session, fcmToken);
        return result != null && result.optBoolean("ok", false);
    }

    // A current, freshly authenticated role token must own this EXACT
    // installation before it may replace an expired session for unlinking.
    private boolean currentAccountOwnsInstallation(String role, String session) {
        if (session == null || session.isEmpty()) return false;
        JSONObject response = requestJson("status", role, session, null);
        if (response == null || !response.optBoolean("ok", false)
                || !role.equals(response.optString("role"))) return false;
        org.json.JSONArray devices = response.optJSONArray("devices");
        if (devices == null) return false;
        for (int i = 0; i < devices.length(); i++) {
            JSONObject device = devices.optJSONObject(i);
            if (device != null
                    && activity.getPackageName().equals(device.optString("app_id"))
                    && installationId().equals(device.optString("installation_id"))) {
                return true;
            }
        }
        return false;
    }

    boolean hasAccountBinding() {
        return prefs().getBoolean("bound", false);
    }

    void connectWithConsent() {
        final String role = normalizedRole(roleProvider.get());
        if (role.isEmpty() || !trustedPage()) {
            message("Open your DBest Vendor, Vaahak or Service Partner workspace first.");
            return;
        }
        if (busy.get()) { message("Account registration already in progress."); return; }
        if (hasAccountBinding()) {
            message("This device is already linked or pending secure unlink. Disconnect it before connecting another account.");
            return;
        }
        new AlertDialog.Builder(activity)
            .setTitle("Connect " + role + " notifications?")
            .setMessage("Register this phone to the " + role + " account signed in here. Notifications are disabled at the server until the owner authorizes a restricted canary.")
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

    // Never clear a persisted account binding on a failed server unlink.
    // A different account cannot take over a pending QA device registration.
    void revokeAndThen(Runnable done) {
        if (!hasAccountBinding()) {
            activity.runOnUiThread(done);
            return;
        }
        String role = prefs().getString("bound_role", "");
        String remembered = boundSession;
        readSession(role, active -> worker.execute(() -> {
            boolean revoked = remembered != null && !remembered.isEmpty()
                && request("unregister", role, remembered, null);
            if (!revoked && !active.isEmpty()
                    && currentAccountOwnsInstallation(role, active)) {
                revoked = request("unregister", role, active, null);
            }
            if (revoked) {
                boundSession = null;
                boundRole = null;
                boundHeader = null;
                consecutiveSessionMismatches = 0;
                prefs().edit().putBoolean("bound", false)
                    .remove("bound_role").remove("bound_session_hash").apply();
                message("Partner server registration revoked.");
            } else {
                message("Partner server unlink pending. Do not switch accounts; retry secure unlink.");
            }
            activity.runOnUiThread(done);
        }));
    }

    // Avoid treating WebView loading gaps or same-account token refreshes
    // as a different member. Mismatches require two trusted readings.
    void onPortalPageLoaded(Runnable disableOnAccountChanged) {
        if (!hasAccountBinding() || !trustedPage()) return;
        String role = prefs().getString("bound_role", "");
        String expectedHash = prefs().getString("bound_session_hash", "");
        readSession(role, session -> {
            if (!hasAccountBinding()) return;
            if (!session.isEmpty() && hash(session).equals(expectedHash)) {
                consecutiveSessionMismatches = 0;
                return;
            }
            if (++consecutiveSessionMismatches < REQUIRED_MISMATCH_READS) {
                portal.postDelayed(() -> onPortalPageLoaded(disableOnAccountChanged), 950);
                return;
            }
            consecutiveSessionMismatches = 0;
            if (session.isEmpty()) {
                message("Partner session ended; securely unlinking partner alerts.");
                disableOnAccountChanged.run();
                return;
            }
            if (!busy.compareAndSet(false, true)) return;
            worker.execute(() -> {
                try {
                    if (currentAccountOwnsInstallation(role, session)) {
                        boundSession = session; // Same account, refreshed session.
                        prefs().edit().putString("bound_session_hash", hash(session)).apply();
                    } else {
                        activity.runOnUiThread(disableOnAccountChanged);
                    }
                } finally {
                    busy.set(false);
                }
            });
        });
    }

    void shutdown() { worker.shutdown(); }
}
