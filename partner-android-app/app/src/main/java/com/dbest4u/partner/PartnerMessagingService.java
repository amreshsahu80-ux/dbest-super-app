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

        // Reject event notifications for a different partner role even if an
        // upstream sender ever misroutes a token. Generic Firebase smoke tests
        // have no recognized role event and do not open role-specific pages.
        String eventType = message.getData().get("eventType");
        String eventRole = roleForEvent(eventType);
        if (eventRole != null) {
            android.content.SharedPreferences bind =
                getSharedPreferences("dbest_partner_fcm_account", MODE_PRIVATE);
            if (!bind.getBoolean("bound", false)
                || !eventRole.equals(bind.getString("bound_role", ""))) return;
        }

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26)
            manager.createNotificationChannel(new NotificationChannel(
                CHANNEL, "DBest Partner Updates", NotificationManager.IMPORTANCE_DEFAULT));

        Intent intent = new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (eventRole != null) {
            intent.setAction("com.dbest4u.partner.action.OPEN_FCM_EVENT_QA");
            intent.putExtra("dbest_fcm_event_type", eventType);
        }
        // Distinct PendingIntents prevent a later offer/order from overwriting
        // an earlier notification's navigation intent.
        String key = message.getData().get("eventKey");
        int requestCode = key == null ? (int)(System.currentTimeMillis() & 0x7fffffff)
            : (key.hashCode() & 0x7fffffff);
        PendingIntent pending = PendingIntent.getActivity(this, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder notification = Build.VERSION.SDK_INT >= 26 ?
            new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        notification.setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title).setContentText(body)
            .setStyle(new Notification.BigTextStyle().bigText(body))
            .setContentIntent(pending).setAutoCancel(true);
        manager.notify(requestCode, notification.build());
    }

    private static String roleForEvent(String type) {
        if ("marketplace_vendor_new_order".equals(type)) return "Vendor";
        if ("vaahak_ride_offer".equals(type)) return "Vaahak";
        if ("service_partner_job_assigned".equals(type)) return "Service Partner";
        return null;
    }
}
