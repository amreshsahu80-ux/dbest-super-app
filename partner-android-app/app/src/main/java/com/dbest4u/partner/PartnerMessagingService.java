package com.dbest4u.partner;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * Staged native FCM receiver. Delivery remains OFF until an authenticated
 * partner explicitly enables device registration and notification preferences.
 * Do not treat an installed FCM SDK as proof that notifications are working.
 */
public final class PartnerMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL = "dbest_partner_updates";

    @Override public void onNewToken(String token) {
        super.onNewToken(token);
        // Never send an FCM token without an authenticated partner session.
        getSharedPreferences("dbest_partner_native_push", MODE_PRIVATE).edit()
            .putBoolean("needs_reregister", true).apply();
    }

    @Override public void onMessageReceived(RemoteMessage message) {
        if (!getSharedPreferences("dbest_partner_native_push", MODE_PRIVATE)
                 .getBoolean("enabled", false)) return;
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                 != PackageManager.PERMISSION_GRANTED) return;

        String title = message.getData().get("title");
        String body = message.getData().get("body");
        if ((title == null || title.isEmpty()) && message.getNotification() != null)
            title = message.getNotification().getTitle();
        if ((body == null || body.isEmpty()) && message.getNotification() != null)
            body = message.getNotification().getBody();
        if (title == null || title.isEmpty()) title = "DBest Partner";
        if (body == null) body = "You have a new partner update.";

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26)
            manager.createNotificationChannel(new NotificationChannel(
                CHANNEL, "DBest Partner Updates", NotificationManager.IMPORTANCE_DEFAULT));

        Intent intent = new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder notification = Build.VERSION.SDK_INT >= 26 ?
            new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        notification.setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title).setContentText(body)
            .setStyle(new Notification.BigTextStyle().bigText(body))
            .setContentIntent(pending).setAutoCancel(true);
        manager.notify((int)(System.currentTimeMillis() & 0x7fffffff), notification.build());
    }
}
