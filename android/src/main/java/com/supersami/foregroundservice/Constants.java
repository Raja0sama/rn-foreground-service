package com.supersami.foregroundservice;

class Constants {
    static final String NOTIFICATION_CONFIG = "com.supersami.foregroundservice.notif_config";
    static final String TASK_CONFIG = "com.supersami.foregroundservice.task_config";

    static final String ACTION_FOREGROUND_SERVICE_START = "com.supersami.foregroundservice.service_start";
    static final String ACTION_FOREGROUND_SERVICE_STOP = "com.supersami.foregroundservice.service_stop";
    static final String ACTION_FOREGROUND_SERVICE_STOP_ALL = "com.supersami.foregroundservice.service_all";
    static final String ACTION_FOREGROUND_RUN_TASK = "com.supersami.foregroundservice.service_run_task";
    static final String ACTION_UPDATE_NOTIFICATION = "com.supersami.foregroundservice.service_update_notification";

    static final String ERROR_INVALID_CONFIG = "ERROR_INVALID_CONFIG";
    static final String ERROR_SERVICE_ERROR = "ERROR_SERVICE_ERROR";
    static final String ERROR_ANDROID_VERSION = "ERROR_ANDROID_VERSION";

    //SERVICE TYPES
    static final String camera = "FOREGROUND_SERVICE_TYPE_CAMERA"; //declar perm in androidManifest.xml as FOREGROUND_SERVICE_CAMERA
    static final String connectedDevice = "FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE"; //declar perm in androidManifest.xml as FOREGROUND_SERVICE_CONNECTED_DEVICE
    static final String dataSync = "FOREGROUND_SERVICE_TYPE_DATA_SYNC"; //declar perm in androidManifest.xml as FOREGROUND_SERVICE_DATA_SYNC
    static final String health = "FOREGROUND_SERVICE_TYPE_HEALTH"; //declar perm in androidManifest.xml as FOREGROUND_SERVICE_HEALTH
    static final String location = "FOREGROUND_SERVICE_TYPE_LOCATION"; //declar perm in androidManifest.xml as FOREGROUND_SERVICE_LOCATION
    static final String mediaPlayback = "FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK"; //declar perm in androidManifest.xml as FOREGROUND_SERVICE_MEDIA_PLAYBACK
    static final String mediaProjection = "FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION"; //declar perm in androidManifest.xml as FOREGROUND_SERVICE_MEDIA_PROJECTION
    static final String microphone = "FOREGROUND_SERVICE_TYPE_MICROPHONE"; //declar perm in androidManifest.xml as FOREGROUND_SERVICE_MICROPHONE
    static final String phoneCall = "FOREGROUND_SERVICE_TYPE_PHONE_CALL"; //declar perm in androidManifest.xml as FOREGROUND_SERVICE_PHONE_CALL
    static final String remoteMessaging = "FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING"; //declar perm in androidManifest.xml as FOREGROUND_SERVICE_REMOTE_MESSAGING
    static final String shortService = "FOREGROUND_SERVICE_TYPE_SHORT_SERVICE"; //No need to declar in androidManifest.xml in case of shortService
    static final String specialUse = "FOREGROUND_SERVICE_TYPE_SPECIAL_USE"; //declar perm in androidManifest.xml as FOREGROUND_SERVICE_SPECIAL_USE
    static final String systemExempted = "FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED"; //declar perm in androidManifest.xml as FOREGROUND_SERVICE_SYSTEM_EXEMPTED




}
