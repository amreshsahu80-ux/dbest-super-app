package com.dbest4u.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.webkit.WebView;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public final class NativePushController {
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
        button.setText("🔔 Push setup pending");
        button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF526079));
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT, dp(48), Gravity.BOTTOM | Gravity.START);
        lp.setMargins(dp(12), 0, dp(12), dp(14));
        root.addView(button, lp);
        button.setVisibility(View.GONE);
        button.setOnClickListener(v -> {
            // Android WebView browser PushManager is unsupported. Never claim "Push ON"
            // until FCM identifiers, an authenticated native token-registration API,
            // delivery credentials, and an end-to-end test are present.
            String state = firebaseReady
                ? "FCM client is configured. Secure device registration and delivery testing are still required."
                : "Native push requires Firebase Cloud Messaging configuration before it can be enabled.";
            Toast.makeText(activity, state, Toast.LENGTH_LONG).show();
        });
    }

    public void refreshVisibility() {
        // The floating control is limited to the logged-in member home screen,
        // just like the existing web push control. Never read/store the session token.
        String js = "(function(){try{var t=localStorage.getItem('dbest_member_live_token');" +
                "var open=document.body.classList.contains('sectionOpen') ||" +
                "!!document.getElementById('m')?.querySelector('.sectionOverlay,.overlay');" +
                "return !!t&&!open&&location.pathname==='/';}catch(e){return false}})()";
        webView.evaluateJavascript(js, result -> {
            button.setVisibility("true".equals(result) ? View.VISIBLE : View.GONE);
        });
    }

    private boolean initializeFirebase() {
        try {
            if (BuildConfig.DBEST_FCM_API_KEY.isEmpty() || BuildConfig.DBEST_FCM_APP_ID.isEmpty()
                    || BuildConfig.DBEST_FCM_PROJECT_ID.isEmpty()
                    || BuildConfig.DBEST_FCM_SENDER_ID.isEmpty()) return false;
            if (FirebaseApp.getApps(activity).isEmpty()) {
                FirebaseOptions options = new FirebaseOptions.Builder()
                        .setApiKey(BuildConfig.DBEST_FCM_API_KEY)
                        .setApplicationId(BuildConfig.DBEST_FCM_APP_ID)
                        .setProjectId(BuildConfig.DBEST_FCM_PROJECT_ID)
                        .setGcmSenderId(BuildConfig.DBEST_FCM_SENDER_ID).build();
                FirebaseApp.initializeApp(activity, options);
            }
            return !FirebaseApp.getApps(activity).isEmpty();
        } catch (Exception ignored) {
            return false;
        }
    }

    private int dp(int v) {
        return Math.round(v * activity.getResources().getDisplayMetrics().density);
    }
}
