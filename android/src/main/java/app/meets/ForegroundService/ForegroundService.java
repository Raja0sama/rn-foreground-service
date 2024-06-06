package app.meets.ForegroundService;

import android.app.*;
import android.content.Context;
import android.content.Intent;
import android.os.*;
import android.util.Log;
import androidx.annotation.Nullable;

import androidx.core.app.NotificationCompat;

public class ForegroundService extends Service {
    private boolean isRunning = false;
    private final int notificationId = Integer.MAX_VALUE;
    private NotificationManager mNotificationManager;

    private static final String logContext = "ForegroundService";
    public static final String NotificationConfigKey = "notificationConfig";
    public static final String NotificationChannelIdKey = "notificationChannelId";
    public static final String NotificationTitleKey = "notificationTitle";
    public static final String NotificationMessageKey = "notificationMessage";

    public static final String ActionStartForeground = "startForegroundService";
    public static final String ActionUpdateNotification = "ActionUpdateNotification";
    public static final String ActionStop = "stopService";

    private final IBinder mBinder = new LocalBinder();

    public class LocalBinder extends Binder {
        ForegroundService getService() {
            return ForegroundService.this;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();

        mNotificationManager = (NotificationManager)getSystemService(getApplicationContext().NOTIFICATION_SERVICE);
    }

    @Override
    public void onDestroy() {
        mNotificationManager = null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent.getAction();

        switch (action) {
            case ActionStartForeground:
                startForegroundService(intent.getExtras().getBundle(NotificationConfigKey));
                return START_STICKY;
                case ActionUpdateNotification:
                    updateNotification(intent.getExtras().getBundle(NotificationConfigKey));
                    return START_REDELIVER_INTENT;
            case ActionStop:
                stop();
                return START_NOT_STICKY;
            default:
                return START_REDELIVER_INTENT;
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return mBinder;
    }

    private void startForegroundService(Bundle notificationConfig) {
        if(!isRunning) {
            Notification notification = getNotification(notificationConfig);

            try {
                startForeground(notificationId, notification);

                isRunning = true;

                Log.i(logContext, "Foreground service started successfully.");
            } catch (Exception e) {
                Log.e(logContext, "Unable to start foreground service: " + e.getMessage());
            }
        } else {
            Log.i(logContext, "Foreground service is already running.");
        }
    }

    private void updateNotification(Bundle notificationConfig) {
        if(isRunning) {
            Notification notification = getNotification(notificationConfig);

            mNotificationManager.cancel(notificationId);
            mNotificationManager.notify(notificationId, notification);

            Log.i(logContext, "Updated foreground service notification.");
        } else {
            Log.i(logContext, "Unable to update notification because foreground service is not running.");
        }
    }

    private void stop() {
        if(isRunning) {
            try {
                stopSelf();

                isRunning = false;

                Log.i(logContext, "Foreground service stopped successfully.");
            } catch(Exception e) {
                Log.e(logContext, "Unable to stop foreground service: " + e.getMessage());
            }
        } else {
            Log.i(logContext, "Foreground service is already stopped.");
        }

    }

    private Notification getNotification(Bundle notificationConfig) {
        Class mainActivityClass = getMainActivityClass(getApplicationContext());
        if (mainActivityClass == null) {
            return null;
        }

        Intent intent = new Intent(this, mainActivityClass);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE);
        String notificationChannelId = notificationConfig.getString(NotificationChannelIdKey);
        String notificationTitle = notificationConfig.getString(NotificationTitleKey);
        String notificationMessage = notificationConfig.getString(NotificationMessageKey);
        NotificationCompat.Builder builder = new
                NotificationCompat.Builder(this, notificationChannelId)
                .setContentTitle(notificationTitle)
                .setContentText(notificationMessage)
                .setSmallIcon(getResourceIdForResourceName(getApplicationContext(), "ic_launcher"))
                .setContentIntent(pendingIntent)
                .setOngoing(true);

        return builder.build();
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
}
