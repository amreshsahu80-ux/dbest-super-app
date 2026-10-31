package com.dbest4u.partner;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public final class MainActivity extends ComponentActivity {
    private static final String ORIGIN = "https://dbest4u.com";
    private static final int FILE_REQUEST = 1201;
    private static final int LOCATION_REQUEST = 1202;
    private static final int NAVY = 0xFF10264B;
    private static final int BLUE = 0xFF1760FF;
    private static final int BG = 0xFFF5F7FC;

    private FrameLayout screenHost;
    private View homeScreen;
    private LinearLayout browserShell;
    private WebView webView;
    private TextView browserTitle;
    private ValueCallback<Uri[]> fileCallback;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;
    private boolean showingBrowser;
    private String currentRole = "";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BG);

        // Android 15/16 edge-to-edge: protect both status/navigation bars and cutouts.
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets area = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            view.setPadding(area.left, area.top, area.right, area.bottom);
            return windowInsets;
        });
        screenHost = new FrameLayout(this);
        root.addView(screenHost, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        homeScreen = makeHome();
        browserShell = makeBrowser();
        screenHost.addView(homeScreen, new FrameLayout.LayoutParams(-1, -1));
        screenHost.addView(browserShell, new FrameLayout.LayoutParams(-1, -1));
        showHome();

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (!showingBrowser) {
                    finish();
                } else if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    showHome();
                }
            }
        });
    }

    private View makeHome() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setClipToPadding(false);
        LinearLayout page = column();
        page.setPadding(dp(16), dp(11), dp(16), dp(25));
        scroll.addView(page);

        // Genuine DBest logo, bundled locally so the first screen never waits for network images.
        LinearLayout brand = row();
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.dbest_brand);
        logo.setAdjustViewBounds(true);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        brand.addView(logo, new LinearLayout.LayoutParams(dp(150), dp(62)));
        View empty = new View(this);
        brand.addView(empty, new LinearLayout.LayoutParams(0, 1, 1));
        TextView partner = txt("PARTNER\nNETWORK", 11, BLUE, true);
        partner.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        brand.addView(partner);
        page.addView(brand);
        space(page, 12);

        LinearLayout hero = column();
        hero.setPadding(dp(19), dp(17), dp(19), dp(18));
        GradientDrawable heroShape = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[]{0xFF102F68, 0xFF1760FF, 0xFF6D52EF});
        heroShape.setCornerRadius(dp(22));
        hero.setBackground(heroShape);
        hero.addView(txt("ONE PARTNER NETWORK", 10, 0xFFE6EDFF, true));
        space(hero, 8);
        hero.addView(txt("Your work. Your growth.", 25, Color.WHITE, true));
        space(hero, 6);
        TextView caption = txt("Orders, trips and service jobs—one dedicated DBest app.", 12, 0xFFF0F3FF, false);
        caption.setLineSpacing(dp(2), 1);
        hero.addView(caption);
        page.addView(hero);
        space(page, 20);

        page.addView(txt("Choose your workspace", 22, NAVY, true));
        space(page, 4);
        page.addView(txt("Real opportunities. Secure access to your existing partner account.", 12, 0xFF627189, false));
        space(page, 13);

        page.addView(roleCard(
                "Vendor", "GROCERY · RESTAURANT · PHARMACY",
                "Manage store, orders, catalog and earnings",
                0xFF0B987F, R.drawable.partner_vendor,
                "/Vendor", "/partner?type=Vendor"));
        space(page, 13);
        page.addView(roleCard(
                "Vaahak", "CAB · DELIVERY · TRANSPORT",
                "Manage rides, deliveries and trip earnings",
                0xFF3465F5, R.drawable.partner_vaahak,
                "/vaahak", "/partner?type=Vaahak"));
        space(page, 13);
        page.addView(roleCard(
                "Service Partner", "REPAIRS · HOME SERVICES",
                "Receive service requests and manage jobs",
                0xFFB84888, R.drawable.partner_service,
                "/ServicePartnerDashboard", "/partner?type=Service%20Partner"));
        space(page, 19);

        LinearLayout footer = column();
        footer.setPadding(dp(14), dp(12), dp(14), dp(12));
        footer.setBackground(rounded(0xFFEAF0FA, 15));
        footer.addView(txt("Existing DBest partner?", 13, NAVY, true));
        space(footer, 4);
        footer.addView(txt("Tap Open workspace for your category. Your login and approvals stay with the existing DBest portal.", 12, 0xFF536780, false));
        page.addView(footer);
        space(page, 18);
        TextView legal = txt("DBest Partner • Pilot 0.2.0", 11, 0xFF8B98AB, false);
        legal.setGravity(Gravity.CENTER);
        page.addView(legal);
        return scroll;
    }

    // Full-width real photos sourced from the existing DBest Partner Network artwork.
    private View roleCard(String title, String category, String summary, int color,
                          int photoResource, String loginPath, String joinPath) {
        LinearLayout card = column();
        card.setPadding(dp(10), dp(10), dp(10), dp(13));
        card.setBackground(bordered(Color.WHITE, 0xFFE3E8F0, 20));
        card.setElevation(dp(2));

        FrameLayout photoFrame = new FrameLayout(this);
        photoFrame.setBackground(rounded(0xFFEAF0F8, 15));
        photoFrame.setClipToOutline(true);
        ImageView image = new ImageView(this);
        image.setScaleType(ImageView.ScaleType.CENTER_CROP);
        image.setImageResource(photoResource);
        image.setContentDescription(title + " partner services photograph");
        photoFrame.addView(image, new FrameLayout.LayoutParams(-1, -1));
        TextView overlay = txt("  " + category + "  ", 10, Color.WHITE, true);
        overlay.setPadding(dp(7), dp(4), dp(7), dp(4));
        overlay.setBackground(rounded(0xD3101F3A, 9));
        FrameLayout.LayoutParams overlayParams = new FrameLayout.LayoutParams(-2, -2, Gravity.TOP | Gravity.LEFT);
        overlayParams.leftMargin = dp(9);
        overlayParams.topMargin = dp(9);
        photoFrame.addView(overlay, overlayParams);
        card.addView(photoFrame, new LinearLayout.LayoutParams(-1, dp(151)));

        space(card, 11);
        LinearLayout titleRow = row();
        titleRow.setPadding(dp(4), 0, dp(4), 0);
        titleRow.addView(txt(title, 20, NAVY, true));
        View gap = new View(this);
        titleRow.addView(gap, new LinearLayout.LayoutParams(0, 1, 1));
        TextView ready = txt("• DBest Partner", 10, color, true);
        ready.setGravity(Gravity.RIGHT);
        titleRow.addView(ready);
        card.addView(titleRow);
        space(card, 4);
        TextView desc = txt(summary, 12, 0xFF657187, false);
        desc.setPadding(dp(4), 0, dp(4), 0);
        card.addView(desc);
        space(card, 12);

        LinearLayout actions = row();
        Button workspace = button("Open workspace", Color.WHITE, color);
        workspace.setOnClickListener(v -> openPortal(title, loginPath));
        actions.addView(workspace, new LinearLayout.LayoutParams(0, dp(46), 1.5f));
        spaceWidth(actions, 8);
        Button join = button("Join", color, tint(color));
        join.setOnClickListener(v -> openPortal(title + " · Join", joinPath));
        actions.addView(join, new LinearLayout.LayoutParams(0, dp(46), 0.72f));
        card.addView(actions);
        return card;
    }

    private LinearLayout makeBrowser() {
        LinearLayout shell = column();
        shell.setBackgroundColor(Color.WHITE);
        LinearLayout bar = row();
        bar.setPadding(dp(10), dp(7), dp(10), dp(7));
        bar.setBackgroundColor(Color.WHITE);
        Button back = button("‹", NAVY, 0xFFF0F4FB);
        back.setTextSize(28);
        back.setOnClickListener(v -> {
            if (webView.canGoBack()) webView.goBack();
            else showHome();
        });
        bar.addView(back, new LinearLayout.LayoutParams(dp(48), dp(48)));
        browserTitle = txt("DBest Partner", 16, NAVY, true);
        browserTitle.setGravity(Gravity.CENTER_VERTICAL);
        browserTitle.setPadding(dp(10), 0, 0, 0);
        bar.addView(browserTitle, new LinearLayout.LayoutParams(0, dp(48), 1));
        Button home = button("Home", BLUE, 0xFFEAF0FF);
        home.setOnClickListener(v -> showHome());
        bar.addView(home, new LinearLayout.LayoutParams(dp(78), dp(46)));
        shell.addView(bar);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(false);
        if (android.os.Build.VERSION.SDK_INT >= 26) s.setSafeBrowsingEnabled(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                return route(req.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) {
                return route(Uri.parse(url));
            }
            @Override public void onReceivedError(WebView v, WebResourceRequest req,
                                                   android.webkit.WebResourceError error) {
                if (req.isForMainFrame())
                    Toast.makeText(MainActivity.this,
                            "Unable to load partner portal. Check your connection.", Toast.LENGTH_SHORT).show();
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onGeolocationPermissionsShowPrompt(
                    String origin, GeolocationPermissions.Callback callback) {
                if (!isDbest(Uri.parse(origin))) {
                    callback.invoke(origin, false, false);
                    return;
                }
                if (ContextCompat.checkSelfPermission(MainActivity.this,
                        Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin, true, false);
                } else {
                    locationOrigin = origin;
                    locationCallback = callback;
                    ActivityCompat.requestPermissions(MainActivity.this,
                            new String[]{Manifest.permission.ACCESS_FINE_LOCATION,
                                    Manifest.permission.ACCESS_COARSE_LOCATION}, LOCATION_REQUEST);
                }
            }
            @Override public boolean onShowFileChooser(WebView v,
                    ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_REQUEST);
                    return true;
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    callback.onReceiveValue(null);
                    return true;
                }
            }
        });
        webView.setDownloadListener((url, agent, disposition, mime, length) -> {
            Uri u = Uri.parse(url);
            if (isHttp(u)) openExternal(u);
            else Toast.makeText(this, "Download link is not supported.", Toast.LENGTH_SHORT).show();
        });
        shell.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));
        return shell;
    }

    private boolean route(Uri url) {
        if (url == null) return true;
        String scheme = url.getScheme();
        if ("about".equalsIgnoreCase(scheme)) return false;
        if (isDbest(url)) return false;
        if (isHttp(url) || "tel".equalsIgnoreCase(scheme)
                || "mailto".equalsIgnoreCase(scheme) || "geo".equalsIgnoreCase(scheme)
                || "market".equalsIgnoreCase(scheme)) openExternal(url);
        return true; // Block file://, javascript:, data:, intent: and other untrusted schemes.
    }

    private boolean isHttp(Uri u) {
        return u != null && ("https".equalsIgnoreCase(u.getScheme())
                || "http".equalsIgnoreCase(u.getScheme()));
    }

    private boolean isDbest(Uri u) {
        if (u == null || !"https".equalsIgnoreCase(u.getScheme())) return false;
        String host = u.getHost();
        return host != null && (host.equalsIgnoreCase("dbest4u.com")
                || host.equalsIgnoreCase("www.dbest4u.com"));
    }

    private void openExternal(Uri uri) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, uri);
            i.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "No compatible app found.", Toast.LENGTH_SHORT).show();
        }
    }

    private void openPortal(String name, String route) {
        if (!route.startsWith("/") || route.startsWith("//")) return;
        currentRole = name;
        browserTitle.setText(name);
        showingBrowser = true;
        homeScreen.setVisibility(View.GONE);
        browserShell.setVisibility(View.VISIBLE);
        webView.loadUrl(ORIGIN + route);
    }

    private void showHome() {
        showingBrowser = false;
        homeScreen.setVisibility(View.VISIBLE);
        browserShell.setVisibility(View.GONE);
    }

    @Override public void onRequestPermissionsResult(
            int code, @NonNull String[] perms, @NonNull int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        if (code == LOCATION_REQUEST && locationCallback != null) {
            boolean ok = false;
            for (int r : results) if (r == PackageManager.PERMISSION_GRANTED) ok = true;
            locationCallback.invoke(locationOrigin, ok, false);
            locationCallback = null;
            locationOrigin = null;
        }
    }

    @Override protected void onActivityResult(int code, int resultCode, Intent data) {
        super.onActivityResult(code, resultCode, data);
        if (code == FILE_REQUEST && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
        }
    }

    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    private int dp(int value) { return (int) (value * getResources().getDisplayMetrics().density + .5f); }
    private LinearLayout row() {
        LinearLayout l = new LinearLayout(this);
        l.setGravity(Gravity.CENTER_VERTICAL);
        l.setOrientation(LinearLayout.HORIZONTAL);
        return l;
    }
    private LinearLayout column() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        return l;
    }
    private TextView txt(String s, int size, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(size);
        t.setTextColor(color);
        t.setTypeface(Typeface.DEFAULT, bold ? Typeface.BOLD : Typeface.NORMAL);
        return t;
    }
    private Button button(String title, int textColor, int bg) {
        Button b = new Button(this);
        b.setText(title);
        b.setAllCaps(false);
        b.setTextSize(13);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setTextColor(textColor);
        b.setBackground(rounded(bg, 14));
        b.setMinimumHeight(0);
        b.setMinHeight(0);
        b.setPadding(dp(6), 0, dp(6), 0);
        return b;
    }
    private GradientDrawable rounded(int color, int radius) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radius));
        return d;
    }
    private GradientDrawable bordered(int bg, int stroke, int radius) {
        GradientDrawable d = rounded(bg, radius);
        d.setStroke(dp(1), stroke);
        return d;
    }
    private int tint(int color) {
        int r = Color.red(color), g = Color.green(color), b = Color.blue(color);
        return Color.rgb((r + 255 * 6) / 7, (g + 255 * 6) / 7, (b + 255 * 6) / 7);
    }
    private void space(LinearLayout l, int height) {
        l.addView(new View(this), new LinearLayout.LayoutParams(1, dp(height)));
    }
    private void spaceWidth(LinearLayout l, int width) {
        l.addView(new View(this), new LinearLayout.LayoutParams(dp(width), 1));
    }
}
