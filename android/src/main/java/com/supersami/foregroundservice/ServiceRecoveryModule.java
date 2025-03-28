package com.supersami.foregroundservice;

import android.app.ActivityManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.List;

import static com.supersami.foregroundservice.Constants.NOTIFICATION_CONFIG;

public class ServiceRecoveryModule extends ReactContextBaseJavaModule {
    private static final String TAG = "ServiceRecoveryModule";
    private final ReactApplicationContext reactContext;
    private Handler recoveryHandler;
    private Runnable healthCheckRunnable;
    private boolean isMonitoring = false;
    private static final long DEFAULT_HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
    private long healthCheckInterval = DEFAULT_HEALTH_CHECK_INTERVAL;

    public ServiceRecoveryModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.recoveryHandler = new Handler(Looper.getMainLooper());
    }

    @Override
    public String getName() {
        return "ServiceRecoveryModule";
    }

    /**
     * Start service health monitoring
     * @param interval Interval between health checks in milliseconds
     * @param promise Promise to resolve when monitoring starts
     */
    @ReactMethod
    public void startMonitoring(double interval, Promise promise) {
        if (isMonitoring) {
            promise.resolve(true);
            return;
        }

        try {
            this.healthCheckInterval = (long) interval;
            if (this.healthCheckInterval < 5000) {
                this.healthCheckInterval = 5000; // Minimum 5 seconds
            }

            startHealthCheck();
            isMonitoring = true;
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start monitoring", e);
            promise.reject("ERROR", "Failed to start monitoring: " + e.getMessage());
        }
    }

    /**
     * Stop service health monitoring
     * @param promise Promise to resolve when monitoring stops
     */
    @ReactMethod
    public void stopMonitoring(Promise promise) {
        if (!isMonitoring) {
            promise.resolve(true);
            return;
        }

        try {
            if (healthCheckRunnable != null) {
                recoveryHandler.removeCallbacks(healthCheckRunnable);
                healthCheckRunnable = null;
            }

            isMonitoring = false;
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop monitoring", e);
            promise.reject("ERROR", "Failed to stop monitoring: " + e.getMessage());
        }
    }

    /**
     * Start periodic health check
     */
    private void startHealthCheck() {
        // Remove existing runnable if any
        if (healthCheckRunnable != null) {
            recoveryHandler.removeCallbacks(healthCheckRunnable);
        }

        healthCheckRunnable = new Runnable() {
            @Override
            public void run() {
                checkServiceHealth();
                // Schedule next check
                recoveryHandler.postDelayed(this, healthCheckInterval);
            }
        };

        // Start health check
        recoveryHandler.postDelayed(healthCheckRunnable, healthCheckInterval);
    }

    /**
     * Check service health
     */
    private void checkServiceHealth() {
        try {
            boolean isServiceRunning = isServiceRunningInternal();
            boolean isInstanceCreated = ForegroundService.isServiceCreated();

            // Detect inconsistencies
            if (!isServiceRunning && isInstanceCreated) {
                Log.d(TAG, "Service health check: Service instance exists but service not running");
                
                WritableMap params = Arguments.createMap();
                params.putString("type", "service_state_inconsistency");
                params.putBoolean("isServiceRunning", isServiceRunning);
                params.putBoolean("isInstanceCreated", isInstanceCreated);
                sendEvent("ServiceRecoveryEvent", params);
            }
            else if (isServiceRunning && !isInstanceCreated) {
                Log.d(TAG, "Service health check: Service running but instance doesn't exist");
                
                WritableMap params = Arguments.createMap();
                params.putString("type", "service_state_inconsistency");
                params.putBoolean("isServiceRunning", isServiceRunning);
                params.putBoolean("isInstanceCreated", isInstanceCreated);
                sendEvent("ServiceRecoveryEvent", params);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking service health", e);
        }
    }

    /**
     * Check if the foreground service is running
     * @param promise Promise to resolve with boolean result
     */
    @ReactMethod
    public void isServiceRunning(Promise promise) {
        try {
            boolean running = isServiceRunningInternal();
            promise.resolve(running);
        } catch (Exception e) {
            Log.e(TAG, "Error checking if service is running", e);
            promise.reject("ERROR", "Failed to check service status: " + e.getMessage());
        }
    }

    /**
     * Internal method to check if the service is running
     * @return true if service is running, false otherwise
     */
    private boolean isServiceRunningInternal() {
        ActivityManager manager = (ActivityManager) reactContext.getSystemService(Context.ACTIVITY_SERVICE);
        if (manager == null) {
            return false;
        }

        List<ActivityManager.RunningServiceInfo> services = manager.getRunningServices(Integer.MAX_VALUE);
        if (services == null || services.isEmpty()) {
            return false;
        }

        String serviceName = ForegroundService.class.getName();
        for (ActivityManager.RunningServiceInfo service : services) {
            if (serviceName.equals(service.service.getClassName())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Restart the foreground service with the provided configuration
     * @param config Service configuration
     * @param promise Promise to resolve when restart completes
     */
    @ReactMethod
    public void restartService(ReadableMap config, Promise promise) {
        try {
            // First try to stop any existing service
            try {
                Intent stopIntent = new Intent(reactContext, ForegroundService.class);
                stopIntent.setAction(Constants.ACTION_FOREGROUND_SERVICE_STOP_ALL);
                reactContext.startService(stopIntent);
            } catch (Exception e) {
                Log.d(TAG, "Error stopping service before restart (may not exist): " + e.getMessage());
            }

            // Wait a moment to ensure service is stopped
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    // Start the service with the provided configuration
                    Intent intent = new Intent(reactContext, ForegroundService.class);
                    intent.setAction(Constants.ACTION_FOREGROUND_SERVICE_START);
                    intent.putExtra(NOTIFICATION_CONFIG, Arguments.toBundle(config));
                    ForegroundService.setReactContext(reactContext);
                    
                    ComponentName componentName = reactContext.startService(intent);
                    
                    if (componentName != null) {
                        // Service started successfully
                        WritableMap params = Arguments.createMap();
                        params.putString("type", "service_restarted");
                        sendEvent("ServiceRecoveryEvent", params);
                        
                        promise.resolve(true);
                    } else {
                        // Service failed to start
                        WritableMap params = Arguments.createMap();
                        params.putString("type", "recovery_failed");
                        params.putString("reason", "Service failed to start");
                        sendEvent("ServiceRecoveryEvent", params);
                        
                        promise.reject("ERROR", "Failed to restart service: service did not start");
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error restarting service", e);
                    
                    WritableMap params = Arguments.createMap();
                    params.putString("type", "recovery_failed");
                    params.putString("reason", e.getMessage());
                    sendEvent("ServiceRecoveryEvent", params);
                    
                    promise.reject("ERROR", "Failed to restart service: " + e.getMessage());
                }
            }, 500); // 500ms delay to ensure service is fully stopped
        } catch (Exception e) {
            Log.e(TAG, "Error in restart service flow", e);
            promise.reject("ERROR", "Failed to restart service: " + e.getMessage());
        }
    }

    /**
     * Send event to JavaScript
     * @param eventName Name of the event
     * @param params Parameters for the event
     */
    private void sendEvent(String eventName, WritableMap params) {
        try {
            reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(eventName, params);
        } catch (Exception e) {
            Log.e(TAG, "Failed to send event to JavaScript", e);
        }
    }
}