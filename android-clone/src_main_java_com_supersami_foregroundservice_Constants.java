package com.supersami.foregroundservice;

class Constants {
    // Configuration keys
    static final String NOTIFICATION_CONFIG = "com.supersami.foregroundservice.notif_config";
    static final String TASK_CONFIG = "com.supersami.foregroundservice.task_config";

    // Service actions
    static final String ACTION_FOREGROUND_SERVICE_START = "com.supersami.foregroundservice.service_start";
    static final String ACTION_FOREGROUND_SERVICE_STOP = "com.supersami.foregroundservice.service_stop";
    static final String ACTION_FOREGROUND_SERVICE_STOP_ALL = "com.supersami.foregroundservice.service_all";
    static final String ACTION_FOREGROUND_RUN_TASK = "com.supersami.foregroundservice.service_run_task";
    static final String ACTION_UPDATE_NOTIFICATION = "com.supersami.foregroundservice.service_update_notification";

    // Error codes
    static final String ERROR_INVALID_CONFIG = "ERROR_INVALID_CONFIG";
    static final String ERROR_SERVICE_ERROR = "ERROR_SERVICE_ERROR";
    static final String ERROR_ANDROID_VERSION = "ERROR_ANDROID_VERSION";
    static final String ERROR_PERMISSION_DENIED = "ERROR_PERMISSION_DENIED";
    static final String ERROR_TASK_EXECUTION = "ERROR_TASK_EXECUTION";
    
    // Events
    static final String EVENT_SERVICE_ERROR = "onServiceError";
    static final String EVENT_TASK_ERROR = "onTaskError";
    static final String EVENT_NOTIFICATION_CLICKED = "notificationClickHandle";

    // Service types for Android 14+
    static final String SERVICE_TYPE_CAMERA = "camera";
    static final String SERVICE_TYPE_CONNECTED_DEVICE = "connectedDevice";
    static final String SERVICE_TYPE_DATA_SYNC = "dataSync";
    static final String SERVICE_TYPE_HEALTH = "health";
    static final String SERVICE_TYPE_LOCATION = "location";
    static final String SERVICE_TYPE_MEDIA_PLAYBACK = "mediaPlayback";
    static final String SERVICE_TYPE_MEDIA_PROJECTION = "mediaProjection";
    static final String SERVICE_TYPE_MICROPHONE = "microphone";
    static final String SERVICE_TYPE_PHONE_CALL = "phoneCall";
    static final String SERVICE_TYPE_REMOTE_MESSAGING = "remoteMessaging";
    static final String SERVICE_TYPE_SHORT_SERVICE = "shortService";
    static final String SERVICE_TYPE_SPECIAL_USE = "specialUse";
    static final String SERVICE_TYPE_SYSTEM_EXEMPTED = "systemExempted";
}