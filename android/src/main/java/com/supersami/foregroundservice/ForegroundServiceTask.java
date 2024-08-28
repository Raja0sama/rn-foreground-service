package com.tikotas.foregroundservice;

import android.app.Notification;
import android.app.Service;
import android.content.Intent;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;

import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import javax.annotation.Nullable;

import static com.tikotas.foregroundservice.Constants.NOTIFICATION_CONFIG;


// https://github.com/facebook/react-native/blob/master/ReactAndroid/src/main/java/com/facebook/react/HeadlessJsTaskService.java

public class ForegroundServiceTask extends HeadlessJsTaskService {

    @Nullable
    protected HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        Bundle extras = intent.getExtras();
        if (extras != null) {
            return new HeadlessJsTaskConfig(
                extras.getString("taskName"),
                    Arguments.fromBundle(extras),
                    5000, // timeout for the task
                    true // optional: defines whether or not  the task is allowed in foreground. Default is false
            );
        }
        return null;
    }
}
