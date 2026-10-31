package com.dbest4u.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public final class DbestMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL = "dbest_updates";
    @Override public void onNewToken(String token) {
        super.onNewToken(token);
        // Registration is only performed from an authenticated member session,
        // after the member explicitly opts in. Never upload an unauthenticated token.
        getSharedPreferences("dbest_native_push", MODE_PRIVATE).edit()
            .putBoolean("needs_reregister", true).apply();
    }
    @Override public void onMessageReceived(RemoteMessage message) {
        if (!getSharedPreferences("dbest_native_push", MODE_PRIVATE).getBoolean("enabled", false)) return;
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(
            this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        String title = message.getData().get("title");
        String body = message.getData().get("body");
        if ((title == null || title.isEmpty()) && message.getNotification() != null)
            title = message.getNotification().getTitle();
        if ((body == null || body.isEmpty()) && message.getNotification() != null)
            body = message.getNotification().getBody();
        if (title == null || title.isEmpty()) title = "DBest";
        if (body == null) body = "You have a new DBest update.";
        String target = message.getData().get("targetUrl");
        Uri uri;
        try {
            uri = Uri.parse(target == null || target.isEmpty() ? "https://dbest4u.com/" : target);
            if (!"https".equalsIgnoreCase(uri.getScheme()) ||
                !("dbest4u.com".equalsIgnoreCase(uri.getHost()) ||
                "www.dbest4u.com".equalsIgnoreCase(uri.getHost()))) uri = Uri.parse("https://dbest4u.com/");
        } catch (Exception ex) { uri = Uri.parse("https://dbest4u.com/"); }
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26)
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "DBest Updates", NotificationManager.IMPORTANCE_DEFAULT));
        Intent intent = new Intent(this, MainActivity.class).setAction(Intent.ACTION_VIEW).setData(uri)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ?
                new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        builder.setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title)
                .setContentText(body).setStyle(new Notification.BigTextStyle().bigText(body))
                .setAutoCancel(true).setContentIntent(pending);
        nm.notify((int)(System.currentTimeMillis() & 0x7fffffff), builder.build());
    }
}