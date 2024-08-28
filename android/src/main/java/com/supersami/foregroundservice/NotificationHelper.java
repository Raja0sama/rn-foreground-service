package com.tikotas.foregroundservice;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import android.util.Log;

import com.facebook.react.R;

// partially took ideas from: https://github.com/zo0r/react-native-push-notification/blob/master/android/src/main/java/com/dieam/reactnativepushnotification/modules/RNPushNotificationHelper.java


class NotificationHelper {
    private static final String NOTIFICATION_CHANNEL_ID = "com.tikotas.foregroundservice.channel";

    private static NotificationHelper instance = null;
    private NotificationManager mNotificationManager;

    PendingIntent pendingBtnIntent;
    PendingIntent pendingBtn2Intent;
    private Context context;
    private NotificationConfig config;

    public static synchronized NotificationHelper getInstance(Context context) {
        if (instance == null) {
            instance = new NotificationHelper(context);
        }
        return instance;
    }

    private NotificationHelper(Context context) {
        mNotificationManager = (NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        this.context = context;
        this.config = new NotificationConfig(context);
    }


    Notification buildNotification(Context context, Bundle bundle) {
        if (bundle == null) {
            Log.e("NotificationHelper", "buildNotification: invalid config");
            return null;
        }
        Class mainActivityClass = getMainActivityClass(context);
        if (mainActivityClass == null) {
            return null;
        }

        Log.d("SuperLog",""+bundle.getString("mainOnPress"));

        Intent notificationIntent = new Intent(context, mainActivityClass);
        notificationIntent.putExtra("mainOnPress",bundle.getString("mainOnPress"));
        int uniqueInt1 = (int) (System.currentTimeMillis() & 0xfffffff);

        // Changing FLAG_UPDATE_CURRENT to FLAG_MUTABLE for android 12 support
        PendingIntent pendingIntent = PendingIntent.getActivity(context, uniqueInt1, notificationIntent, PendingIntent.FLAG_MUTABLE);

        if(bundle.getBoolean("button", false) == true) {
            Log.d("SuperLog C ", "inButtonOnPress" + bundle.getString("buttonOnPress"));
            Intent notificationBtnIntent = new Intent(context, mainActivityClass);
            notificationBtnIntent.putExtra("buttonOnPress", bundle.getString("buttonOnPress"));
            int uniqueInt = (int) (System.currentTimeMillis() & 0xfffffff);

             // Changing FLAG_UPDATE_CURRENT to FLAG_MUTABLE for android 12 support
            pendingBtnIntent = PendingIntent.getActivity(context, uniqueInt, notificationBtnIntent, PendingIntent.FLAG_MUTABLE);
        }

        if(bundle.getBoolean("button2", false) == true) {
            Log.i("SuperLog C ", "inButton2OnPress" + bundle.getString("button2OnPress"));
            Intent notificationBtn2Intent = new Intent(context, mainActivityClass);
            notificationBtn2Intent.putExtra("button2OnPress", bundle.getString("button2OnPress"));
            int uniqueInt2 = (int) (System.currentTimeMillis() & 0xfffffff);

            // Changing FLAG_UPDATE_CURRENT to FLAG_MUTABLE for android 12 support
            pendingBtn2Intent = PendingIntent.getActivity(context, uniqueInt2, notificationBtn2Intent, PendingIntent.FLAG_MUTABLE);
        }

        String title = bundle.getString("title");

        int priority = NotificationCompat.PRIORITY_HIGH;
        final String priorityString = bundle.getString("importance");

        if (priorityString != null) {
            switch(priorityString.toLowerCase()) {
                case "max":
                    priority = NotificationCompat.PRIORITY_MAX;
                    break;
                case "high":
                    priority = NotificationCompat.PRIORITY_HIGH;
                    break;
                case "low":
                    priority = NotificationCompat.PRIORITY_LOW;
                    break;
                case "min":
                    priority = NotificationCompat.PRIORITY_MIN;
                    break;
                case "default":
                    priority = NotificationCompat.PRIORITY_DEFAULT;
                    break;
                default:
                    priority = NotificationCompat.PRIORITY_HIGH;
            }
        }

        int visibility = NotificationCompat.VISIBILITY_PRIVATE;
        String visibilityString = bundle.getString("visibility");

        if (visibilityString != null) {
            switch(visibilityString.toLowerCase()) {
                case "private":
                    visibility = NotificationCompat.VISIBILITY_PRIVATE;
                    break;
                case "public":
                    visibility = NotificationCompat.VISIBILITY_PUBLIC;
                    break;
                case "secret":
                    visibility = NotificationCompat.VISIBILITY_SECRET;
                    break;
                default:
                    visibility = NotificationCompat.VISIBILITY_PRIVATE;
            }
        }

        checkOrCreateChannel(mNotificationManager, bundle);

        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(context, NOTIFICATION_CHANNEL_ID)
            .setContentTitle(title)
            .setVisibility(visibility)
            .setPriority(priority)
            .setContentIntent(pendingIntent)
            .setOngoing(bundle.getBoolean("ongoing", false))
            .setContentText(bundle.getString("message"));

       

        if(bundle.getBoolean("button", false) == true){
            notificationBuilder.addAction(R.drawable.redbox_top_border_background, bundle.getString("buttonText", "Button"), pendingBtnIntent);
        }

        if(bundle.getBoolean("button2", false) == true){
            notificationBuilder.addAction(R.drawable.redbox_top_border_background, bundle.getString("button2Text", "Button"), pendingBtn2Intent);
        }


        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            notificationBuilder.setColor(this.config.getNotificationColor());
        }
        String color = bundle.getString("color");
        if(color != null){
            notificationBuilder.setColor(Color.parseColor(color));
        }

        notificationBuilder.setStyle(new NotificationCompat.BigTextStyle().bigText(bundle.getString("message")));


        String iconName = bundle.getString("icon"); ;
        
        if(iconName == null){
            iconName = "ic_launcher";
        }
        notificationBuilder.setSmallIcon(getResourceIdForResourceName(context, iconName));


        String largeIconName = bundle.getString("largeIcon");
        if(largeIconName == null){
            largeIconName = "ic_launcher";
        }

        int largeIconResId = getResourceIdForResourceName(context, largeIconName);
        Bitmap largeIconBitmap = BitmapFactory.decodeResource(context.getResources(), largeIconResId);

        if (largeIconResId != 0) {
            notificationBuilder.setLargeIcon(largeIconBitmap);
        }

        String numberString = bundle.getString("number");
        if (numberString != null) {
            int numberInt = Integer.parseInt(numberString);
            if(numberInt > 0){
                notificationBuilder.setNumber(numberInt);
            }
        }

        Boolean progress = bundle.getBoolean("progressBar");
        if(progress){
            double max = bundle.getDouble("progressBarMax");
            double curr = bundle.getDouble("progressBarCurr");
            notificationBuilder.setProgress((int)max, (int)curr,false);
        }

        notificationBuilder.setOnlyAlertOnce(true);


        return notificationBuilder.build();
    }

    private Class getMainActivityClass(Context context) {
        String packageName = context.getPackageName();
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(packageName);
        if (launchIntent == null || launchIntent.getComponent() == null) {
            Log.e("NotificationHelper", "Failed to get launch intent or component");
            return null;
        }
        try {
            return Class.forName(launchIntent.getComponent().getClassName());
        } catch (ClassNotFoundException e) {
            Log.e("NotificationHelper", "Failed to get main activity class");
            return null;
        }
    }

    private int getResourceIdForResourceName(Context context, String resourceName) {
        int resourceId = context.getResources().getIdentifier(resourceName, "drawable", context.getPackageName());
        if (resourceId == 0) {
            resourceId = context.getResources().getIdentifier(resourceName, "mipmap", context.getPackageName());
        }
        return resourceId;
    }

    private static boolean channelCreated = false;
    private void checkOrCreateChannel(NotificationManager manager, Bundle bundle) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O)
            return;
        if (channelCreated)
            return;
        if (manager == null)
            return;

        int importance = NotificationManager.IMPORTANCE_HIGH;
        final String importanceString = bundle.getString("importance");

        if (importanceString != null) {
            switch(importanceString.toLowerCase()) {
                case "default":
                    importance = NotificationManager.IMPORTANCE_DEFAULT;
                    break;
                case "max":
                    importance = NotificationManager.IMPORTANCE_MAX;
                    break;
                case "high":
                    importance = NotificationManager.IMPORTANCE_HIGH;
                    break;
                case "low":
                    importance = NotificationManager.IMPORTANCE_LOW;
                    break;
                case "min":
                    importance = NotificationManager.IMPORTANCE_MIN;
                    break;
                case "none":
                    importance = NotificationManager.IMPORTANCE_NONE;
                    break;
                case "unspecified":
                    importance = NotificationManager.IMPORTANCE_UNSPECIFIED;
                    break;
                default:
                    importance = NotificationManager.IMPORTANCE_HIGH;
            }
        }
        NotificationChannel channel = new NotificationChannel(NOTIFICATION_CHANNEL_ID, this.config.getChannelName(), importance);
        channel.setDescription(this.config.getChannelDescription());
        channel.enableLights(true);
        channel.enableVibration(bundle.getBoolean("vibration"));
        channel.setShowBadge(true);

        manager.createNotificationChannel(channel);
        channelCreated = true;
    }
}
