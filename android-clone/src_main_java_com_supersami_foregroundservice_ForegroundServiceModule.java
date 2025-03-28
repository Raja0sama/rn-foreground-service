package com.supersami.foregroundservice;

import android.content.ComponentName;
import android.content.Intent;
import android.app.NotificationManager;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import static com.supersami.foregroundservice.Constants.ERROR_INVALID_CONFIG;
import static com.supersami.foregroundservice.Constants.ERROR_SERVICE_ERROR;
import static com.supersami.foregroundservice.Constants.ERROR_ANDROID_VERSION;
import static com.supersami.foregroundservice.Constants.NOTIFICATION_CONFIG;
import static com.supersami.foregroundservice.Constants.TASK_CONFIG;

public class ForegroundServiceModule extends ReactContextBaseJavaModule {

    private static final String TAG = "ForegroundServiceModule";
    private final ReactApplicationContext reactContext;

    public ForegroundServiceModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "ForegroundService";
    }

    /**
     * Emits an event to JavaScript
     * @param eventName Name of the event
     * @param params Parameters for the event
     */
    private void sendEvent(String eventName, WritableMap params) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        } catch (Exception e) {
            Log.e(TAG, "Error sending event: " + e.getMessage());
        }
    }

    /**
     * Checks if the foreground service is running
     * @return true if the service is running, false otherwise
     */
    private boolean isRunning() {
        // Get the ForegroundService running value
        ForegroundService instance = ForegroundService.getInstance();
        int res = 0;
        if (instance != null) {
            res = instance.isRunning();
        }
        return res > 0;
    }

    /**
     * Validates notification configuration
     * @param notificationConfig Configuration from JS
     * @param promise Promise to resolve or reject
     * @return true if configuration is valid, false otherwise
     */
    private boolean validateNotificationConfig(ReadableMap notificationConfig, Promise promise) {
        if (notificationConfig == null) {
            promise.reject(ERROR_INVALID_CONFIG, "ForegroundService: Notification config is invalid");
            return false;
        }

        if (!notificationConfig.hasKey("id")) {
            promise.reject(ERROR_INVALID_CONFIG, "ForegroundService: id is required");
            return false;
        }

        if (!notificationConfig.hasKey("title")) {
            promise.reject(ERROR_INVALID_CONFIG, "ForegroundService: title is required");
            return false;
        }

        if (!notificationConfig.hasKey("message")) {
            promise.reject(ERROR_INVALID_CONFIG, "ForegroundService: message is required");
            return false;
        }

        // Android 14+ requires ServiceType
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            if (!notificationConfig.hasKey("ServiceType")) {
                promise.reject(ERROR_INVALID_CONFIG, 
                    "ForegroundService: ServiceType is required for Android 14+. " +
                    "Specify one of: camera, connectedDevice, dataSync, health, location, " +
                    "mediaPlayback, mediaProjection, microphone, phoneCall, remoteMessaging, " +
                    "shortService, specialUse, systemExempted");
                return false;
            }
        }

        return true;
    }

    /**
     * Validates task configuration
     * @param taskConfig Configuration from JS
     * @param promise Promise to resolve or reject
     * @return true if configuration is valid, false otherwise
     */
    private boolean validateTaskConfig(ReadableMap taskConfig, Promise promise) {
        if (taskConfig == null) {
            promise.reject(ERROR_INVALID_CONFIG, "ForegroundService: Task config is invalid");
            return false;
        }

        if (!taskConfig.hasKey("taskName")) {
            promise.reject(ERROR_INVALID_CONFIG, "ForegroundService: taskName is required");
            return false;
        }

        if (!taskConfig.hasKey("delay")) {
            promise.reject(ERROR_INVALID_CONFIG, "ForegroundService: delay is required");
            return false;
        }

        return true;
    }

    @ReactMethod
    public void startService(ReadableMap notificationConfig, Promise promise) {
        if (!validateNotificationConfig(notificationConfig, promise)) {
            return;
        }

        try {
            Intent intent = new Intent(getReactApplicationContext(), ForegroundService.class);
            intent.setAction(Constants.ACTION_FOREGROUND_SERVICE_START);
            intent.putExtra(NOTIFICATION_CONFIG, Arguments.toBundle(notificationConfig));
            ForegroundService.setReactContext(getReactApplicationContext());
            
            ComponentName componentName = getReactApplicationContext().startService(intent);

            if (componentName != null) {
                promise.resolve(null);
            } else {
                promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Foreground service failed to start.");
            }
        } catch (IllegalStateException e) {
            Log.e(TAG, "Error starting service: " + e.getMessage());
            promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Foreground service failed to start: " + e.getMessage());
        } catch (SecurityException e) {
            // This might happen if the app doesn't have the proper permissions
            Log.e(TAG, "Security error starting service: " + e.getMessage());
            promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Missing required permissions: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Unexpected error starting service: " + e.getMessage());
            promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Unexpected error: " + e.getMessage());
        }
    }

    @ReactMethod
    public void updateNotification(ReadableMap notificationConfig, Promise promise) {
        if (!validateNotificationConfig(notificationConfig, promise)) {
            return;
        }

        try {
            Intent intent = new Intent(getReactApplicationContext(), ForegroundService.class);
            intent.setAction(Constants.ACTION_UPDATE_NOTIFICATION);
            intent.putExtra(NOTIFICATION_CONFIG, Arguments.toBundle(notificationConfig));
            ForegroundService.setReactContext(getReactApplicationContext());
            
            ComponentName componentName = getReactApplicationContext().startService(intent);

            if (componentName != null) {
                promise.resolve(null);
            } else {
                promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Update notification failed.");
            }
        } catch (IllegalStateException e) {
            Log.e(TAG, "Error updating notification: " + e.getMessage());
            promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Update notification failed: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Unexpected error updating notification: " + e.getMessage());
            promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Unexpected error: " + e.getMessage());
        }
    }

    @ReactMethod
    public void cancelNotification(ReadableMap notificationConfig, Promise promise) {
        if (notificationConfig == null) {
            promise.reject(ERROR_INVALID_CONFIG, "ForegroundService: Notification config is invalid");
            return;
        }

        if (!notificationConfig.hasKey("id")) {
            promise.reject(ERROR_INVALID_CONFIG, "ForegroundService: id is required");
            return;
        }

        try {
            int id = (int) notificationConfig.getDouble("id");

            NotificationManager mNotificationManager = (NotificationManager) this.reactContext.getSystemService(this.reactContext.NOTIFICATION_SERVICE);
            mNotificationManager.cancel(id);

            promise.resolve(null);
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling notification: " + e.getMessage());
            promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Failed to cancel notification: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopService(Promise promise) {
        try {
            // stop main service
            Intent intent = new Intent(getReactApplicationContext(), ForegroundService.class);
            intent.setAction(Constants.ACTION_FOREGROUND_SERVICE_STOP);

            // Looks odd, but we do indeed send the stop flag with a start command
            // if it fails, use the violent stop service instead
            try {
                getReactApplicationContext().startService(intent);
            } catch (IllegalStateException e) {
                try {
                    getReactApplicationContext().stopService(intent);
                } catch (Exception e2) {
                    Log.e(TAG, "Error stopping service: " + e2.getMessage());
                    promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Service stop failed: " + e2.getMessage());
                    return;
                }
            }

            promise.resolve(null);
        } catch (Exception e) {
            Log.e(TAG, "Unexpected error stopping service: " + e.getMessage());
            promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Unexpected error: " + e.getMessage());
        }
    }

    @ReactMethod
    public void stopServiceAll(Promise promise) {
        try {
            // stop main service with all action
            Intent intent = new Intent(getReactApplicationContext(), ForegroundService.class);
            intent.setAction(Constants.ACTION_FOREGROUND_SERVICE_STOP_ALL);

            try {
                getReactApplicationContext().startService(intent);
            } catch (IllegalStateException e) {
                try {
                    getReactApplicationContext().stopService(intent);
                } catch (Exception e2) {
                    Log.e(TAG, "Error stopping all services: " + e2.getMessage());
                    promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Service stop all failed: " + e2.getMessage());
                    return;
                }
            }

            promise.resolve(null);
        } catch (Exception e) {
            Log.e(TAG, "Unexpected error stopping all services: " + e.getMessage());
            promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Unexpected error: " + e.getMessage());
        }
    }

    @ReactMethod
    public void runTask(ReadableMap taskConfig, Promise promise) {
        if (!validateTaskConfig(taskConfig, promise)) {
            return;
        }

        try {
            Intent intent = new Intent(getReactApplicationContext(), ForegroundService.class);
            intent.setAction(Constants.ACTION_FOREGROUND_RUN_TASK);
            intent.putExtra(TASK_CONFIG, Arguments.toBundle(taskConfig));

            ComponentName componentName = getReactApplicationContext().startService(intent);

            if (componentName != null) {
                promise.resolve(null);
            } else {
                promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Failed to run task: Service did not start");
            }
        } catch (IllegalStateException e) {
            Log.e(TAG, "Error running task: " + e.getMessage());
            promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Failed to run task: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Unexpected error running task: " + e.getMessage());
            promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Unexpected error: " + e.getMessage());
        }
    }

    @ReactMethod
    public void isRunning(Promise promise) {
        try {
            // Get the ForegroundService running value
            int res = 0;
            ForegroundService instance = ForegroundService.getInstance();
            if (instance != null) {
                res = instance.isRunning();
            }
            promise.resolve(res);
        } catch (Exception e) {
            Log.e(TAG, "Error checking if service is running: " + e.getMessage());
            promise.reject(ERROR_SERVICE_ERROR, "ForegroundService: Error checking service status: " + e.getMessage());
        }
    }

    /**
     * Helper method to check notification permission status on Android 13+
     * @param promise Promise to resolve with boolean result
     */
    @ReactMethod
    public void hasNotificationPermission(Promise promise) {
        if (Build.VERSION.SDK_INT >= 33) { // Android 13+
            try {
                NotificationManager notificationManager = 
                    (NotificationManager) reactContext.getSystemService(reactContext.NOTIFICATION_SERVICE);
                
                boolean hasPermission = notificationManager.areNotificationsEnabled();
                promise.resolve(hasPermission);
            } catch (Exception e) {
                Log.e(TAG, "Error checking notification permission: " + e.getMessage());
                promise.reject(ERROR_SERVICE_ERROR, "Failed to check notification permission: " + e.getMessage());
            }
        } else {
            // For Android < 13, no runtime permission needed
            promise.resolve(true);
        }
    }
}