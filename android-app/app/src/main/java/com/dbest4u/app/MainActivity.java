package com.dbest4u.app;

import android.Manifest;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
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
        // A persistent native privacy action remains available even when
        // the web profile is unavailable. Do not overlay the live site's content.
        LinearLayout appLayout = new LinearLayout(this);
        appLayout.setOrientation(LinearLayout.VERTICAL);
        appLayout.setBackgroundColor(Color.WHITE);
        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setPadding(dp(12), dp(4), dp(12), dp(4));
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = new TextView(this);
        title.setText("DBest");
        title.setTextColor(0xFF103763);
        title.setTextSize(18);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        toolbar.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
        Button deleteAccount = new Button(this);
        deleteAccount.setText("Request account deletion");
        deleteAccount.setAllCaps(false);
        deleteAccount.setTextSize(12);
        deleteAccount.setOnClickListener(v -> showAccountDeletion());
        toolbar.addView(deleteAccount, new LinearLayout.LayoutParams(-2, dp(43)));
        appLayout.addView(toolbar, new LinearLayout.LayoutParams(-1, dp(52)));
        webView = new WebView(this);
        appLayout.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));
        root.addView(appLayout, new FrameLayout.LayoutParams(-1, -1));
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
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        if (("http".equals(scheme) || "https".equals(scheme)) && isDbest(uri)) return false;
        openExternal(uri);
        return true;
    }

    private boolean isDbest(Uri uri) {
        String h = uri.getHost();
        return h != null && (h.equalsIgnoreCase("dbest4u.com") || h.equalsIgnoreCase("www.dbest4u.com"));
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

    private int dp(int px) {
        return (int) (px * getResources().getDisplayMetrics().density + 0.5f);
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
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
