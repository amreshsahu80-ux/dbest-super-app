package com.dbest4u.app;

import android.Manifest;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.graphics.Bitmap;
import android.os.SystemClock;
import android.util.Log;
import android.widget.FrameLayout;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends ComponentActivity {
    private static final String HOME = "https://dbest4u.com/";
    private static final int LOCATION_REQUEST = 1001;
    private static final int FILE_REQUEST = 1002;
    private static final String LOG_TAG = "DBestPerf";
    private long navigationStartedMs = 0L;
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Android 15+ forces edge-to-edge for target SDK 35+. Keep the web
        // experience inside the safe area without modifying the live website.
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFFFFFFFF);
        // Use a single full-height WebView: no duplicate DBest text or
        // persistent deletion button above the website's own branded header.
        // Account deletion remains available in the Android-only
        // Account & Privacy entry inside My Account / My Profile.
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets safeArea = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            view.setPadding(safeArea.left, safeArea.top, safeArea.right, safeArea.bottom);
            return windowInsets;
        });
        setContentView(root);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                if (diagnosticsEnabled()) navigationStartedMs = SystemClock.elapsedRealtime();
            }

            @Override public void onPageCommitVisible(WebView view, String url) {
                super.onPageCommitVisible(view, url);
                if (diagnosticsEnabled() && navigationStartedMs > 0L)
                    Log.d(LOG_TAG, "firstCommittedFrameMs=" + (SystemClock.elapsedRealtime() - navigationStartedMs));
            }

            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url != null && "https".equalsIgnoreCase(Uri.parse(url).getScheme()) && isDbest(Uri.parse(url))) {
                    DbestAccountSettings.install(view);
                    // index.html loads its application markup asynchronously.
                    // Retry only during bootstrap; the scoped observer then
                    // watches only the account/profile overlay (#m).
                    view.postDelayed(() -> refreshPrivacyEntry(view), 1200);
                    view.postDelayed(() -> refreshPrivacyEntry(view), 3500);
                }
                if (diagnosticsEnabled()) {
                    if (navigationStartedMs > 0L)
                        Log.d(LOG_TAG, "pageFinishedMs=" + (SystemClock.elapsedRealtime() - navigationStartedMs));
                    view.evaluateJavascript(
                        "(function(){try{var n=performance.getEntriesByType('navigation')[0]||{};"
                        + "return JSON.stringify({domMs:Math.round(n.domContentLoadedEventEnd||0),"
                        + "loadMs:Math.round(n.loadEventEnd||0),"
                        + "resourceCount:performance.getEntriesByType('resource').length,"
                        + "serviceTiles:document.querySelectorAll('.tile').length});"
                        + "}catch(e){return '{}'}})()", metrics ->
                            Log.d(LOG_TAG, "webTiming=" + metrics));
                }
            }

            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(Uri.parse(url));
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                geoOrigin = origin; geoCallback = callback;
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                } else {
                    ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, LOCATION_REQUEST);
                }
            }

            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent intent = params.createIntent();
                    startActivityForResult(intent, FILE_REQUEST);
                    return true;
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> openExternal(Uri.parse(url)));

        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else {
            Uri incoming = getIntent() != null ? getIntent().getData() : null;
            webView.loadUrl(incoming != null && isDbest(incoming) ? incoming.toString() : HOME);
        }

        getOnBackPressedDispatcherCompat();
    }

    private void getOnBackPressedDispatcherCompat() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack(); else finish();
            }
        });
    }

    private boolean handleUrl(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(java.util.Locale.ROOT);
        if ("dbest-account".equals(scheme)) {
            if ("settings".equalsIgnoreCase(uri.getHost()) && webView != null) {
                Uri current = Uri.parse(String.valueOf(webView.getUrl()));
                if ("https".equalsIgnoreCase(current.getScheme()) && isDbest(current))
                    showAccountSettings();
            }
            // Never dispatch private app actions to Android external intents.
            return true;
        }
        if (("http".equals(scheme) || "https".equals(scheme)) && isDbest(uri)) return false;
        openExternal(uri);
        return true;
    }

    private boolean isDbest(Uri uri) {
        String h = uri.getHost();
        return h != null && (h.equalsIgnoreCase("dbest4u.com") || h.equalsIgnoreCase("www.dbest4u.com"));
    }

    private boolean diagnosticsEnabled() {
        return (getApplicationInfo().flags
                & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private void refreshPrivacyEntry(WebView view) {
        if (webView == view && view.isAttachedToWindow()) {
            Uri current = Uri.parse(String.valueOf(view.getUrl()));
            if ("https".equalsIgnoreCase(current.getScheme()) && isDbest(current))
                DbestAccountSettings.install(view);
        }
    }

    private void showAccountSettings() {
        new AlertDialog.Builder(this)
            .setTitle("Account & Privacy")
            .setItems(new String[]{"Request account deletion", "Deletion instructions"}, (dialog, which) -> {
                if (which == 0) showAccountDeletion();
                else openExternal(Uri.parse("https://dbest4u.com/data-deletion"));
            })
            .setNegativeButton("Close", null)
            .show();
    }

    // Request-only: no account or records are deleted without verification.
    private void showAccountDeletion() {
        new AlertDialog.Builder(this)
            .setTitle("Delete your DBest account")
            .setMessage("You can request deletion of your DBest account and associated personal data. We may verify account ownership, and retain legally required records. Do not email passwords, PINs or OTPs.")
            .setPositiveButton("Email deletion request", (dialog, which) -> {
                Uri email = Uri.parse("mailto:director@thebestservices.org.in?subject="
                        + Uri.encode("DBest Account Deletion Request"));
                try {
                    startActivity(new Intent(Intent.ACTION_SENDTO, email));
                } catch (ActivityNotFoundException e) {
                    openExternal(Uri.parse("https://dbest4u.com/data-deletion"));
                }
            })
            .setNeutralButton("Deletion instructions", (dialog, which) ->
                openExternal(Uri.parse("https://dbest4u.com/data-deletion")))
            .setNegativeButton("Cancel", null)
            .show();
    }

    private void openExternal(Uri uri) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (ActivityNotFoundException ignored) { }
    }

    @Override public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == LOCATION_REQUEST && geoCallback != null) {
            boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
            geoCallback.invoke(geoOrigin, granted, false);
            geoCallback = null; geoOrigin = null;
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_REQUEST && fileCallback != null) {
            Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            fileCallback.onReceiveValue(result);
            fileCallback = null;
        }
    }

    @Override protected void onSaveInstanceState(@NonNull Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
