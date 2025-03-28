package com.supersami.foregroundservice;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.HashMap;
import java.util.Map;

public class BatteryManagerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "BatteryManagerModule";
    private final ReactApplicationContext reactContext;
    private BroadcastReceiver batteryReceiver;
    private boolean isMonitoring = false;

    public BatteryManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "BatteryManager";
    }

    /**
     * Start monitoring battery status changes
     * @param promise Promise to resolve when monitoring starts
     */
    @ReactMethod
    public void startMonitoring(Promise promise) {
        if (isMonitoring) {
            promise.resolve(true);
            return;
        }

        try {
            batteryReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    try {
                        int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                        int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                        int status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1);

                        float batteryPct = level * 100 / (float)scale;
                        boolean isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                                status == BatteryManager.BATTERY_STATUS_FULL;

                        WritableMap params = Arguments.createMap();
                        params.putDouble("level", batteryPct / 100);
                        params.putBoolean("isCharging", isCharging);

                        sendEvent("BatteryStatus", params);
                    } catch (Exception e) {
                        Log.e(TAG, "Error processing battery update", e);
                    }
                }
            };

            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_BATTERY_CHANGED);
            reactContext.registerReceiver(batteryReceiver, filter);

            isMonitoring = true;
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start battery monitoring", e);
            promise.reject("ERROR", "Failed to start battery monitoring: " + e.getMessage());
        }
    }

    /**
     * Stop monitoring battery status
     * @param promise Promise to resolve when monitoring stops
     */
    @ReactMethod
    public void stopMonitoring(Promise promise) {
        if (!isMonitoring) {
            promise.resolve(true);
            return;
        }

        try {
            if (batteryReceiver != null) {
                reactContext.unregisterReceiver(batteryReceiver);
                batteryReceiver = null;
            }

            isMonitoring = false;
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop battery monitoring", e);
            promise.reject("ERROR", "Failed to stop battery monitoring: " + e.getMessage());
        }
    }

    /**
     * Get current battery status
     * @param promise Promise to resolve with battery status
     */
    @ReactMethod
    public void getBatteryStatus(Promise promise) {
        try {
            Context context = reactContext.getApplicationContext();
            IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = context.registerReceiver(null, filter);

            if (batteryStatus == null) {
                promise.reject("ERROR", "Failed to get battery status");
                return;
            }

            int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);

            float batteryPct = level * 100 / (float)scale;
            boolean isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                    status == BatteryManager.BATTERY_STATUS_FULL;

            WritableMap result = Arguments.createMap();
            result.putDouble("level", batteryPct / 100);
            result.putBoolean("isCharging", isCharging);

            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to get battery status", e);
            promise.reject("ERROR", "Failed to get battery status: " + e.getMessage());
        }
    }

    /**
     * Check if app is ignoring battery optimizations
     * @param promise Promise to resolve with optimization status
     */
    @ReactMethod
    public void isIgnoringBatteryOptimizations(Promise promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            // Battery optimizations were introduced in Android M
            promise.resolve(true);
            return;
        }

        try {
            PowerManager powerManager = (PowerManager) reactContext.getSystemService(Context.POWER_SERVICE);
            String packageName = reactContext.getPackageName();
            boolean isIgnoring = powerManager.isIgnoringBatteryOptimizations(packageName);
            promise.resolve(isIgnoring);
        } catch (Exception e) {
            Log.e(TAG, "Failed to check battery optimization status", e);
            promise.reject("ERROR", "Failed to check battery optimization status: " + e.getMessage());
        }
    }

    /**
     * Request to disable battery optimization
     * @param promise Promise to resolve when request is made
     */
    @ReactMethod
    public void requestDisableBatteryOptimization(Promise promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            // Battery optimizations were introduced in Android M
            promise.resolve(true);
            return;
        }

        try {
            String packageName = reactContext.getPackageName();
            Intent intent = new Intent();
            intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + packageName));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            reactContext.startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to request battery optimization exemption", e);
            promise.reject("ERROR", "Failed to request battery optimization exemption: " + e.getMessage());
        }
    }

    /**
     * Check for vendor-specific optimizations
     * @param promise Promise to resolve with vendor optimization info
     */
    @ReactMethod
    public void checkVendorOptimizations(Promise promise) {
        try {
            WritableMap result = Arguments.createMap();
            String manufacturer = Build.MANUFACTURER.toLowerCase();

            // Check for Xiaomi devices
            if (manufacturer.contains("xiaomi")) {
                result.putBoolean("xiaomi", true);
                result.putString("xiaomiType", getXiaomiDeviceType());
            }

            // Check for Huawei devices
            if (manufacturer.contains("huawei") || manufacturer.contains("honor")) {
                result.putBoolean("huawei", true);
            }

            // Check for Samsung devices
            if (manufacturer.contains("samsung")) {
                result.putBoolean("samsung", true);
            }

            // Check for OPPO devices
            if (manufacturer.contains("oppo") || manufacturer.contains("realme") || manufacturer.contains("oneplus")) {
                result.putBoolean("oppo", true);
            }

            // Check for Vivo devices
            if (manufacturer.contains("vivo")) {
                result.putBoolean("vivo", true);
            }

            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to check vendor optimizations", e);
            promise.reject("ERROR", "Failed to check vendor optimizations: " + e.getMessage());
        }
    }

    /**
     * Open vendor-specific optimization settings
     * @param vendor Vendor name
     * @param promise Promise to resolve when settings are opened
     */
    @ReactMethod
    public void openVendorOptimizationSettings(String vendor, Promise promise) {
        try {
            Intent intent = new Intent();
            boolean intentFound = false;

            switch (vendor.toLowerCase()) {
                case "xiaomi":
                    String miuiType = getXiaomiDeviceType();
                    if ("miui".equals(miuiType)) {
                        intent.setComponent(new android.content.ComponentName(
                                "com.miui.powerkeeper",
                                "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"
                        ));
                        intentFound = true;
                    }
                    break;
                case "huawei":
                    intent.setComponent(new android.content.ComponentName(
                            "com.huawei.systemmanager",
                            "com.huawei.systemmanager.optimize.process.ProtectActivity"
                    ));
                    intentFound = true;
                    break;
                case "samsung":
                    intent.setComponent(new android.content.ComponentName(
                            "com.samsung.android.lool",
                            "com.samsung.android.sm.ui.battery.BatteryActivity"
                    ));
                    intentFound = true;
                    break;
                case "oppo":
                    intent.setComponent(new android.content.ComponentName(
                            "com.coloros.safecenter",
                            "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                    ));
                    intentFound = true;
                    break;
                case "vivo":
                    intent.setComponent(new android.content.ComponentName(
                            "com.vivo.permissionmanager",
                            "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
                    ));
                    intentFound = true;
                    break;
                default:
                    intentFound = false;
            }

            if (intentFound) {
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(intent);
                promise.resolve(true);
            } else {
                // Fallback to standard battery optimization settings
                Intent fallbackIntent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallbackIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(fallbackIntent);
                promise.resolve(false);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to open vendor settings", e);
            // Fallback to standard battery settings
            try {
                Intent fallbackIntent = new Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS);
                fallbackIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                reactContext.startActivity(fallbackIntent);
                promise.resolve(false);
            } catch (Exception fallbackError) {
                promise.reject("ERROR", "Failed to open battery settings: " + e.getMessage());
            }
        }
    }

    /**
     * Determine Xiaomi device type
     * @return Type of Xiaomi device (e.g., miui)
     */
    private String getXiaomiDeviceType() {
        try {
            Class<?> systemProperties = Class.forName("android.os.SystemProperties");
            String miuiVersion = (String) systemProperties.getMethod("get", String.class, String.class)
                    .invoke(systemProperties, "ro.miui.ui.version.name", "");

            if (miuiVersion != null && !miuiVersion.isEmpty()) {
                return "miui";
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to get Xiaomi device type", e);
        }
        return "unknown";
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