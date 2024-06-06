package app.meets.ForegroundService;

import android.Manifest;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import app.meets.ForegroundService.errors.*;
import com.facebook.react.bridge.*;

public class ForegroundServiceModule extends ReactContextBaseJavaModule {
    private static final String logContext = "ForegroundServiceModule";

    public ForegroundServiceModule(ReactApplicationContext context) {
        super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return logContext;
    }

    @ReactMethod
    public void start (ReadableMap notificationConfig, Promise promise) {
        if (!notificationConfig.hasKey(ForegroundService.NotificationTitleKey)) {
            NotificationTitleRequiredError error = new NotificationTitleRequiredError();

            Log.e(logContext, error.toString());
            promise.reject(error);

            return;
        }

        if (!notificationConfig.hasKey(ForegroundService.NotificationMessageKey)) {
            NotificationMessageRequiredError error = new NotificationMessageRequiredError();

            Log.e(logContext, error.toString());
            promise.reject(error);

            return;
        }

        if (!notificationConfig.hasKey(ForegroundService.NotificationChannelIdKey)) {
            NotificationChannelIdRequiredError error = new NotificationChannelIdRequiredError();

            Log.e(logContext, error.toString());
            promise.reject(error);

            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channelId = notificationConfig.getString(ForegroundService.NotificationChannelIdKey);

            NotificationManager notificationManager = getReactApplicationContext().getSystemService(NotificationManager.class);
            if (notificationManager.getNotificationChannel(channelId) == null) {
                NotificationChannelNotFoundException error = new NotificationChannelNotFoundException(channelId);

                Log.e(logContext, error.toString());
                promise.reject(error);

                return;
            }

            //        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O && !notificationManager.getNotificationChannel()) {
//            channel = new NotificationChannel(notificationConfig.getString("channelId"), "Ongoing location", NotificationManager.IMPORTANCE_MIN);
//            channel.setDescription("Description for ongoing location");
//            notificationManager.createNotificationChannel(channel);
//        }
        }

//        if (ContextCompat.checkSelfPermission(getReactApplicationContext(), Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
//            PermissionNotGrantedError error = new PermissionNotGrantedError(Manifest.permission.ACCESS_COARSE_LOCATION);
//
//            Log.e(logContext, error.toString());
//            promise.reject(error);
//
//            return;
//        }
//
//        if (ContextCompat.checkSelfPermission(getReactApplicationContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
//            PermissionNotGrantedError error = new PermissionNotGrantedError(Manifest.permission.ACCESS_COARSE_LOCATION);
//
//            Log.e(logContext, error.toString());
//            promise.reject(error);
//
//            return;
//        }
//
//        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
//            if (ContextCompat.checkSelfPermission(getReactApplicationContext(), Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED) {
//                PermissionNotGrantedError error = new PermissionNotGrantedError(Manifest.permission.ACCESS_BACKGROUND_LOCATION);
//
//                Log.e(logContext, error.toString());
//                promise.reject(error);
//
//                return;
//            }
//        }

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(getReactApplicationContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                PermissionNotGrantedError error = new PermissionNotGrantedError(Manifest.permission.POST_NOTIFICATIONS);

                Log.e(logContext, error.toString());
                promise.reject(error);

                return;
            }
        }

        try {
            Intent intent = new Intent(getReactApplicationContext(), ForegroundService.class);
            intent.setAction(ForegroundService.ActionStartForeground);
            intent.putExtra(ForegroundService.NotificationConfigKey, Arguments.toBundle(notificationConfig));

            ComponentName componentName = getReactApplicationContext().startService(intent);

            if (componentName != null) {
                promise.resolve(null);
            } else {
                UnableToStartServiceError error = new UnableToStartServiceError();

                Log.e(logContext, error.toString());
                promise.reject(error);
            }
        } catch(Exception e){
            UnableToStartServiceError error = new UnableToStartServiceError();

            Log.e(logContext, error.toString());
            promise.reject(error);
        }
    }

    @ReactMethod
    public void update(ReadableMap notificationConfig, Promise promise) {
        if (!notificationConfig.hasKey(ForegroundService.NotificationTitleKey)) {
            NotificationTitleRequiredError error = new NotificationTitleRequiredError();

            Log.e(logContext, error.toString());
            promise.reject(error);

            return;
        }

        if (!notificationConfig.hasKey(ForegroundService.NotificationMessageKey)) {
            NotificationMessageRequiredError error = new NotificationMessageRequiredError();

            Log.e(logContext, error.toString());
            promise.reject(error);

            return;
        }

        Intent intent = new Intent(getReactApplicationContext(), ForegroundService.class);
        intent.setAction(ForegroundService.ActionUpdateNotification);
        intent.putExtra(ForegroundService.NotificationConfigKey, Arguments.toBundle(notificationConfig));

        try {
            getReactApplicationContext().startService(intent);
            promise.resolve(null);
        } catch(Exception e){
            promise.reject(new UnableToUpdateServiceError());
        }
    }

    @ReactMethod
    public void stop (Promise promise) {
        Intent intent = new Intent(getReactApplicationContext(), ForegroundService.class);
        intent.setAction(ForegroundService.ActionStop);

        try{
            getReactApplicationContext().startService(intent);
            promise.resolve(null);
        }
        catch(Exception e){
            try{
                getReactApplicationContext().stopService(intent);
                promise.resolve(null);
            }
            catch(Exception e2){
                UnableToStopServiceError error = new UnableToStopServiceError();

                Log.e(logContext, error.toString());
                promise.reject(error);
            }
        }
    }
}

