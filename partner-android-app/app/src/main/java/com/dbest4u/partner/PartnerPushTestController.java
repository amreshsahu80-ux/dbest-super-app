package com.dbest4u.partner;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
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

    public PartnerPushTestController(Activity activity, FrameLayout root) {
        this.activity=activity;
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
        control.setText(active?"🔔 Partner test ON":"🔕 Partner test OFF");
        control.setBackgroundTintList(ColorStateList.valueOf(active?0xFF18784B:0xFF3D5B83));
    }
    private void tap(){
        if(!firebaseReady){Toast.makeText(activity,"Firebase not ready.",Toast.LENGTH_LONG).show();return;}
        if(on()){
            new AlertDialog.Builder(activity).setTitle("Partner test alerts")
                .setMessage("Device-only test mode, not connected to live partner orders or jobs.")
                .setPositiveButton("Copy FCM test token",(d,w)->showToken())
                .setNeutralButton("Turn OFF",(d,w)->disable())
                .setNegativeButton("Cancel",null).show();
        }else{
            new AlertDialog.Builder(activity).setTitle("Enable partner test alerts?")
                .setMessage("This enables a Firebase device test only, without registering on the DBest live server.")
                .setPositiveButton("Enable test mode",(d,w)->requestPermission())
                .setNegativeButton("Cancel",null).show();
        }
    }
    private void requestPermission(){
        if(!permission()&&Build.VERSION.SDK_INT>=33)
            ActivityCompat.requestPermissions(activity,new String[]{Manifest.permission.POST_NOTIFICATIONS},PERMISSION_REQUEST);
        else enable();
    }
    public void onPermissionResult(boolean granted){
        if(granted)enable();else{
            Toast.makeText(activity,"Permission denied; partner test alerts remain OFF.",Toast.LENGTH_LONG).show();
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
                    .setTitle("Partner test token ready")
                    .setMessage("Paste this token only into Firebase Console → Send test message. Real partner notifications are not yet connected.")
                    .setPositiveButton("Copy token",(d,w)->copy(t.getResult()))
                    .setNegativeButton("Close",null).show();
            }else{
                FirebaseMessaging.getInstance().setAutoInitEnabled(false);
                Toast.makeText(activity,"FCM token unavailable. Test alerts remain OFF.",Toast.LENGTH_LONG).show();
                refresh();
            }
        });
    }
    private void showToken(){
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(t->{
            if(t.isSuccessful()&&t.getResult()!=null)copy(t.getResult());
            else Toast.makeText(activity,"Token unavailable.",Toast.LENGTH_LONG).show();
        });
    }
    private void copy(String token){
        ClipboardManager cb=(ClipboardManager)activity.getSystemService(Context.CLIPBOARD_SERVICE);
        cb.setPrimaryClip(ClipData.newPlainText("Partner FCM test token",token));
        Toast.makeText(activity,"Partner test token copied. Paste only into Firebase Console.",Toast.LENGTH_LONG).show();
    }
    private void disable(){
        activity.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putBoolean("enabled",false).apply();
        refresh();
        FirebaseMessaging.getInstance().setAutoInitEnabled(false);
        FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener(t->
            Toast.makeText(activity,t.isSuccessful()?"Device test alerts OFF.":"Device OFF; token cleanup needs retry.",
                    Toast.LENGTH_LONG).show());
    }
}
