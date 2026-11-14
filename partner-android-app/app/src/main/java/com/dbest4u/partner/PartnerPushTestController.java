package com.dbest4u.partner;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.webkit.WebView;
import java.util.function.Supplier;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

/** Device-only, opt-in Firebase smoke test, NOT a production sender/ON switch. */
public final class PartnerPushTestController {
    static final int PERMISSION_REQUEST=1288;
    private static final String PREFS="dbest_partner_native_push";
    private final Activity activity;
    private final Button control;
    private final boolean firebaseReady;
    private final PartnerAccountBinding accountBinding;

    public PartnerPushTestController(Activity activity, FrameLayout root, WebView portal, Supplier<String> roleProvider) {
        this.activity=activity;
        accountBinding = new PartnerAccountBinding(activity, portal, roleProvider);
        firebaseReady=init();
        control=new Button(activity);
        control.setAllCaps(false);
        control.setTextSize(12);
        control.setTextColor(Color.WHITE);
        FrameLayout.LayoutParams lp=new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,dp(44),Gravity.BOTTOM|Gravity.LEFT);
        lp.setMargins(dp(13),0,dp(13),dp(12));
        root.addView(control,lp);
        control.setOnClickListener(v->tap());
        refresh();
    }
    public void setHomeVisible(boolean show) {
        control.setVisibility(show ? View.VISIBLE : View.GONE);
    }
    private int dp(int n){return Math.round(n*activity.getResources().getDisplayMetrics().density);}
    private boolean init(){
        try{
            if(FirebaseApp.getApps(activity).isEmpty())FirebaseApp.initializeApp(activity);
            return !FirebaseApp.getApps(activity).isEmpty();
        }catch(Exception e){return false;}
    }
    private boolean on(){return activity.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getBoolean("enabled",false);}
    private boolean permission(){return Build.VERSION.SDK_INT<33 ||
        ContextCompat.checkSelfPermission(activity,Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;}
    public void refresh(){
        boolean active=on()&&permission();
        control.setText(active?"🔔 Partner alerts ON"
            : accountBinding.hasAccountBinding() ? "🔕 Unlink pending" : "🔕 Partner alerts OFF");
        control.setBackgroundTintList(ColorStateList.valueOf(active?0xFF18784B:0xFF3D5B83));
    }
    private void tap(){
        if(!firebaseReady){Toast.makeText(activity,"Firebase not ready.",Toast.LENGTH_LONG).show();return;}
        if(accountBinding.hasAccountBinding() && !on()){
            new AlertDialog.Builder(activity).setTitle("Previous Partner account unlink pending")
                .setMessage("The previous account's registration is still retained on the server. Retry secure unlink before connecting a different partner account.")
                .setPositiveButton("Retry secure unlink",(d,w)->disable())
                .setNegativeButton("Cancel",null).show();
            return;
        }
        if(on()){
            AlertDialog.Builder dialog = new AlertDialog.Builder(activity)
                .setTitle("Partner notification controls")
                .setMessage("This phone is opted in to partner notifications. Delivery remains controlled by the server and the linked account.")
                .setPositiveButton("Turn OFF and unlink",(d,w)->disable())
                .setNegativeButton("Cancel",null);
            if (BuildConfig.DEBUG) {
                dialog.setNeutralButton("Show local test alert",(d,w)->showLocalTest());
            }
            dialog.show();
        }else{
            new AlertDialog.Builder(activity).setTitle("Enable Partner notification pilot?")
                .setMessage("This enables Firebase locally on this phone. It does not link any account or activate production event sending. You must separately sign in, tap Link, and consent before a device can be registered.")
                .setPositiveButton("Enable notifications",(d,w)->requestPermission())
                .setNegativeButton("Cancel",null).show();
        }
    }
    /**
     * On-device channel self-test: no Firebase call, remote API, real job,
     * account change, or notification token. Only when the owner already
     * enabled partner alerts and granted Android notification permission.
     */
    private void showLocalTest() {
        if (!on() || !permission()) {
            Toast.makeText(activity, "Enable Partner alerts first.", Toast.LENGTH_LONG).show();
            return;
        }
        NotificationManager manager = activity.getSystemService(NotificationManager.class);
        if (manager == null) {
            Toast.makeText(activity, "Android notification service unavailable.", Toast.LENGTH_LONG).show();
            return;
        }
        final String channel = "dbest_partner_updates";
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(new NotificationChannel(
                channel, "DBest Partner Updates", NotificationManager.IMPORTANCE_DEFAULT));
        }
        Notification.Builder notice = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(activity, channel) : new Notification.Builder(activity);
        notice.setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("DBest Partner LOCAL notification test")
            .setContentText("Generated on this phone, not sent by Firebase.")
            .setAutoCancel(true);
        manager.notify(716260, notice.build());
        Toast.makeText(activity,
            "Local notification posted. Check your notification shade.",
            Toast.LENGTH_LONG).show();
    }

    private void requestPermission(){
        if(!permission()&&Build.VERSION.SDK_INT>=33)
            ActivityCompat.requestPermissions(activity,new String[]{Manifest.permission.POST_NOTIFICATIONS},PERMISSION_REQUEST);
        else enable();
    }
    public void onPermissionResult(boolean granted){
        if(granted)enable();else{
            Toast.makeText(activity,"Permission denied; Partner alerts remain OFF.",Toast.LENGTH_LONG).show();
            refresh();
        }
    }
    private void enable(){
        if(!firebaseReady||!permission()){refresh();return;}
        FirebaseMessaging.getInstance().setAutoInitEnabled(true);
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(t->{
            if(t.isSuccessful()&&t.getResult()!=null&&!t.getResult().isEmpty()){
                activity.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putBoolean("enabled",true).apply();
                refresh();
                new AlertDialog.Builder(activity)
                    .setTitle("Device notifications ready")
                    .setMessage("Open your signed-in Partner workspace and choose Link to register this specific phone with your consent. The DBest notification sender is not enabled by this action.")
                    .setPositiveButton("Close",null).show();
            }else{
                FirebaseMessaging.getInstance().setAutoInitEnabled(false);
                Toast.makeText(activity,"FCM token unavailable. Partner alerts remain OFF.",Toast.LENGTH_LONG).show();
                refresh();
            }
        });
    }
    public void connectAccount() {
        if (!on() || !permission()) {
            Toast.makeText(activity,"Enable Partner test alerts on the Partner home first.",Toast.LENGTH_LONG).show();
            return;
        }
        accountBinding.connectWithConsent();
    }
    public void onWorkspaceSelected(String role) {
        if (accountBinding.isBoundToDifferentRole(role)) {
            Toast.makeText(activity,"Switching partner workspace: revoking previous alert registration.",Toast.LENGTH_LONG).show();
            disable();
        }
    }
    public void onPortalPageLoaded() {
        accountBinding.onPortalPageLoaded(this::disable);
    }
    public void shutdown() { accountBinding.shutdown(); }
    private void disable(){
        activity.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putBoolean("enabled",false).apply();
        refresh();
        FirebaseMessaging.getInstance().setAutoInitEnabled(false);
        accountBinding.revokeAndThen(() -> FirebaseMessaging.getInstance().deleteToken()
            .addOnCompleteListener(t -> {
                refresh();
                String report = !t.isSuccessful()
                    ? "Partner alerts OFF; Firebase token deletion needs retry."
                    : accountBinding.hasAccountBinding()
                        ? "Partner alerts OFF; server unlink pending. Retry secure unlink."
                        : "Partner alerts OFF; device registration revoked.";
                Toast.makeText(activity,report,Toast.LENGTH_LONG).show();
            }));
    }
}
